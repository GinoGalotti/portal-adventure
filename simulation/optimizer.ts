/**
 * Optimizer for simulation strategy parameters.
 *
 * Provides:
 * - ParameterizedStrategy: all decisions driven by a StrategyParams weight vector
 * - scoreRun: fitness function for a single RunResult
 * - optimizeGeneral: coordinate descent across many seeds (find best general strategy)
 * - optimizeSeed: random sampling on a fixed seed (find best path for one run)
 */

import {
  isConfrontationAvailable,
  isDisasterReached,
} from '../src/engine/investigation'
import type { GameState, ActionEntry, StatName } from '../src/engine/types'
import type {
  Strategy,
  StrategyParams,
  ScoringWeights,
  RunResult,
} from './types'
import { runSimulation } from './runner'
import type { MysteryDefinition } from '../src/engine/types'
import type { HunterDef } from './types'

// ─── Parameter Ranges ────────────────────────────────────────────────────────

/** [min, max] for each StrategyParam dimension */
const PARAM_RANGES: Record<keyof StrategyParams, [number, number]> = {
  unvisitedWeight:       [0, 10],
  clueRichnessWeight:    [0, 10],
  safetyWeight:          [-5, 5],
  investigatePreference: [0, 10],
  interviewPreference:   [0, 10],
  deepSearchWillingness: [0, 10],
  restThreshold:         [0, 7],
  minIntelForConfront:   [0, 3],
  clockPressureThreshold:[0, 1],
  attackWeight:          [0, 10],
  defendWeight:          [0, 10],
  exploitWeight:         [0, 10],
  luckOnMiss:            [0, 1],
  luckOnMixed:           [0, 1],
}

const PARAM_KEYS = Object.keys(PARAM_RANGES) as (keyof StrategyParams)[]

export const DEFAULT_PARAMS: StrategyParams = {
  unvisitedWeight: 5,
  clueRichnessWeight: 7,
  safetyWeight: 0,
  investigatePreference: 6,
  interviewPreference: 5,
  deepSearchWillingness: 3,
  restThreshold: 5,
  minIntelForConfront: 1,
  clockPressureThreshold: 0.6,
  attackWeight: 6,
  defendWeight: 3,
  exploitWeight: 8,
  luckOnMiss: 0.8,
  luckOnMixed: 0.2,
}

// ─── Scoring Function ─────────────────────────────────────────────────────────

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  win: 100,
  retreat: 20,
  loss: 0,
  perClue: 5,
  intelBonus: { blind: 0, partial: 10, informed: 25, prepared: 40 },
  perHarmPenalty: -3,
  perLuckRemaining: 2,
  perDeadHunter: -50,
  efficiencyBonus: 1,
}

export function scoreRun(
  result: RunResult,
  weights: Partial<ScoringWeights> = {},
): number {
  const w = { ...DEFAULT_SCORING_WEIGHTS, ...weights }
  const { pre, post } = result

  let score = 0

  // Outcome
  if (post.outcome === 'win') score += w.win
  else if (post.outcome === 'retreat') score += w.retreat
  else score += w.loss

  // Intel at confrontation
  score += w.intelBonus[pre.intelLevel]

  // Clues found
  score += pre.cluesFound.length * w.perClue

  // Hunter states at end
  for (const h of post.hunterStates) {
    if (!h.alive) score += w.perDeadHunter
    score += h.harm * w.perHarmPenalty
    score += h.luck * w.perLuckRemaining
  }

  // Efficiency bonus: under 30 total confrontation actions
  if (post.roundsFought < 30) {
    score += (30 - post.roundsFought) * w.efficiencyBonus
  }

  return score
}

// ─── Deterministic "Random" for Strategy ─────────────────────────────────────

/** Deterministic pseudo-random in [0, 1] — varies by action count and salt */
function detRand(actionCount: number, salt: number): number {
  const n = ((actionCount * 1664525 + salt * 1013904223) >>> 0)
  return n / 4294967295
}

// ─── Parameterized Strategy ───────────────────────────────────────────────────

/**
 * A strategy driven by a continuous weight vector.
 * All decisions are deterministic given the same params and game state.
 * Used by the optimizer to hill-climb toward better parameters.
 */
export class ParameterizedStrategy implements Strategy {
  name: string
  private p: StrategyParams

  constructor(params: StrategyParams, name = 'parameterized') {
    this.p = params
    this.name = name
  }

  pickAction(state: GameState, validActions: ActionEntry[]): ActionEntry {
    if (state.phase === 'confrontation') {
      return this._confrontation(state, validActions)
    }
    return this._investigation(state, validActions)
  }

  private _investigation(state: GameState, validActions: ActionEntry[]): ActionEntry {
    const p = this.p
    const mystery = state.mystery!

    const scored: Array<{ action: ActionEntry; score: number }> = []

    for (const a of validActions) {
      if (a.type === 'startConfrontation') continue  // handled by shouldConfront

      let score = 0

      if (a.type === 'travel') {
        const locId = a.payload.locationId as string
        const loc = mystery.locations.find((l) => l.id === locId)
        if (!loc) continue

        const isUnvisited = !loc.visited
        const undiscovered = loc.clues.filter((c) => !c.found).length
        const maxClues = Math.max(...mystery.locations.map((l) => l.clues.length), 1)

        score += p.unvisitedWeight * (isUnvisited ? 1 : 0)
        score += p.clueRichnessWeight * (undiscovered / maxClues)
        score -= p.safetyWeight * (loc.threatLevel / 3)

        // Slight penalty to discourage pointless re-travel
        if (mystery.currentLocationId === locId) score -= 100
      } else if (a.type === 'investigate') {
        score = p.investigatePreference
        const h = state.team.hunters.find((x) => x.id === (a.payload.hunterId as string))
        if (h) score += h.stats.sharp  // bonus for good stat
      } else if (a.type === 'interview') {
        score = p.interviewPreference
        const h = state.team.hunters.find((x) => x.id === (a.payload.hunterId as string))
        if (h) score += h.stats.charm
      } else if (a.type === 'deepSearch') {
        score = p.deepSearchWillingness
      } else if (a.type === 'helpBystander') {
        score = (p.investigatePreference + p.interviewPreference) / 2
      } else if (a.type === 'rest') {
        const h = state.team.hunters.find((x) => x.id === (a.payload.hunterId as string))
        if (h) {
          // Rest is valuable when harm is at or above threshold
          score = h.harm >= p.restThreshold ? 8 : -2
        }
      } else if (a.type === 'fightMinion') {
        score = p.attackWeight  // use attack preference as proxy
      }

      scored.push({ action: a, score })
    }

    if (scored.length === 0) {
      // Only startConfrontation remains — pick it
      return validActions.find((a) => a.type === 'startConfrontation') ?? validActions[0]
    }

    // Pick highest-scoring action
    scored.sort((x, y) => y.score - x.score)
    return scored[0].action
  }

  private _confrontation(state: GameState, validActions: ActionEntry[]): ActionEntry {
    const p = this.p
    const mystery = state.mystery

    const scored: Array<{ action: ActionEntry; score: number }> = []

    for (const a of validActions) {
      let score = 0
      const hunterId = a.payload.hunterId as string
      const h = state.team.hunters.find((x) => x.id === hunterId)
      if (!h) continue

      if (a.type === 'attack') {
        score = p.attackWeight + h.stats.tough
      } else if (a.type === 'defend') {
        const harmFactor = h.harm >= 4 ? 2 : 1
        score = p.defendWeight * harmFactor
      } else if (a.type === 'exploitWeakness') {
        const weakStat: StatName = mystery?.monster.weakness.statRequired ?? 'tough'
        score = p.exploitWeight + h.stats[weakStat]
      } else if (a.type === 'resist') {
        score = h.harm >= 4 ? p.defendWeight + 1 : p.defendWeight - 2
      } else if (a.type === 'distract') {
        score = (p.attackWeight + p.defendWeight) / 3
      } else if (a.type === 'assess') {
        score = 1  // low priority — mainly useful early
      }

      scored.push({ action: a, score })
    }

    if (scored.length === 0) return validActions[0]
    scored.sort((x, y) => y.score - x.score)
    return scored[0].action
  }

  shouldSpendLuck(state: GameState, roll: { outcome: string }): boolean {
    const p = this.p
    const threshold = roll.outcome === 'miss' ? p.luckOnMiss : p.luckOnMixed
    // Use deterministic pseudo-random based on action count
    return detRand(state.actionCount, roll.outcome === 'miss' ? 1 : 2) < threshold
  }

  shouldConfront(state: GameState): boolean {
    const mystery = state.mystery
    if (!mystery) return false

    const intelRanks: Record<string, number> = { blind: 0, partial: 1, informed: 2, prepared: 3 }
    const currentIntelRank = intelRanks[mystery.intelLevel] ?? 0
    const intelOk = currentIntelRank >= this.p.minIntelForConfront
    const clockFraction = mystery.countdown.clockValue / mystery.countdown.clockConfig.disasterAt
    const clockPressure = clockFraction >= this.p.clockPressureThreshold

    return intelOk || clockPressure
  }
}

// ─── General Optimizer (Coordinate Descent) ────────────────────────────────────

interface OptimizerConfig {
  mysteryDef: MysteryDefinition
  hunters: HunterDef[]
  /** Number of random restarts */
  restarts?: number
  /** Generations per restart */
  generations?: number
  /** Seeds to average score across per candidate */
  samplesPerCandidate?: number
  /** Initial delta fraction of parameter range */
  initialDeltaFraction?: number
  /** Delta decay per generation */
  deltaDecay?: number
  seedPrefix?: string
  scoringWeights?: Partial<ScoringWeights>
}

interface OptimizationResult {
  bestParams: StrategyParams
  bestScore: number
  history: Array<{ generation: number; score: number }>
}

function randomParams(): StrategyParams {
  const result = {} as StrategyParams
  for (const key of PARAM_KEYS) {
    const [min, max] = PARAM_RANGES[key]
    result[key] = min + Math.random() * (max - min)
  }
  return result
}

function clampParam(key: keyof StrategyParams, value: number): number {
  const [min, max] = PARAM_RANGES[key]
  return Math.min(max, Math.max(min, value))
}

function evaluateParams(
  params: StrategyParams,
  config: OptimizerConfig,
  n: number,
  seedPrefix: string,
): number {
  const strategy = new ParameterizedStrategy(params)
  let totalScore = 0
  for (let i = 0; i < n; i++) {
    const seed = `${seedPrefix}-opt-${i}`
    const result = runSimulation({
      mysteryDef: config.mysteryDef,
      hunters: config.hunters,
      strategy,
      seed,
    })
    totalScore += scoreRun(result, config.scoringWeights)
  }
  return totalScore / n
}

export function optimizeGeneral(config: OptimizerConfig): OptimizationResult {
  const R = config.restarts ?? 3
  const G = config.generations ?? 30
  const S = config.samplesPerCandidate ?? 20
  const initDelta = config.initialDeltaFraction ?? 0.2
  const decay = config.deltaDecay ?? 0.95
  const seedPrefix = config.seedPrefix ?? 'opt'

  let globalBestParams = randomParams()
  let globalBestScore = -Infinity
  const history: OptimizationResult['history'] = []

  for (let r = 0; r < R; r++) {
    let params = randomParams()
    let currentScore = evaluateParams(params, config, S, seedPrefix)
    let delta = initDelta

    for (let g = 0; g < G; g++) {
      let improved = false

      for (const key of PARAM_KEYS) {
        const [min, max] = PARAM_RANGES[key]
        const step = (max - min) * delta
        const current = params[key]

        const candidates = [
          current,
          clampParam(key, current + step),
          clampParam(key, current - step),
        ]

        let bestCandidateScore = -Infinity
        let bestCandidate = current

        for (const candidate of candidates) {
          const testParams = { ...params, [key]: candidate }
          const score = evaluateParams(testParams, config, S, seedPrefix)
          if (score > bestCandidateScore) {
            bestCandidateScore = score
            bestCandidate = candidate
          }
        }

        if (bestCandidate !== current) {
          params = { ...params, [key]: bestCandidate }
          currentScore = bestCandidateScore
          improved = true
        }
      }

      delta *= decay
      history.push({ generation: r * G + g, score: currentScore })

      if (currentScore > globalBestScore) {
        globalBestScore = currentScore
        globalBestParams = { ...params }
      }

      if (!improved && delta < 0.001) break
    }
  }

  return { bestParams: globalBestParams, bestScore: globalBestScore, history }
}

// ─── Seed-Specific Path Finder ────────────────────────────────────────────────

interface PathFinderConfig {
  mysteryDef: MysteryDefinition
  hunters: HunterDef[]
  seed: string
  trials?: number
  topK?: number
  scoringWeights?: Partial<ScoringWeights>
}

interface PathFinderResult {
  topRuns: Array<{
    rank: number
    score: number
    params: StrategyParams
    result: RunResult
  }>
}

/**
 * Given a fixed seed, finds the best action sequence by sampling random params.
 * Different params → different decisions → different RNG consumption → different outcomes.
 */
export function optimizeSeed(config: PathFinderConfig): PathFinderResult {
  const trials = config.trials ?? 500
  const topK = config.topK ?? 10
  const scored: Array<{ score: number; params: StrategyParams; result: RunResult }> = []

  for (let i = 0; i < trials; i++) {
    const params = randomParams()
    const strategy = new ParameterizedStrategy(params)
    const result = runSimulation({
      mysteryDef: config.mysteryDef,
      hunters: config.hunters,
      strategy,
      seed: config.seed,
    })
    scored.push({ score: scoreRun(result, config.scoringWeights), params, result })
  }

  scored.sort((a, b) => b.score - a.score)

  return {
    topRuns: scored.slice(0, topK).map((entry, i) => ({
      rank: i + 1,
      score: entry.score,
      params: entry.params,
      result: entry.result,
    })),
  }
}
