/**
 * Strategy implementations for the simulation layer.
 *
 * Each strategy implements the Strategy interface: pickAction, shouldSpendLuck,
 * and shouldConfront. Strategies are stateless — they derive all decisions from
 * the current GameState and valid action list.
 *
 * Available strategies:
 *   random   — uniform random choices; feasibility baseline
 *   greedy   — maximise clue gathering; best-case intel at confrontation
 *   rush     — confront as soon as possible; worst-case blind confrontation
 *   balanced — stat-matched actions, partial intel threshold; typical player proxy
 */

import {
  isConfrontationAvailable,
  isDisasterReached,
  getUnvisitedLocationIds,
} from '../src/engine/investigation'
import type { GameState, ActionEntry, StatName, IntelLevel, ActionInterpretation } from '../src/engine/types'
import type { Strategy } from './types'
import { interpretAction } from '../src/engine/free-text/pipeline'

// ─── Shared Helpers ───────────────────────────────────────────────────────────

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function intelRank(level: string): number {
  switch (level) {
    case 'partial':  return 1
    case 'informed': return 2
    case 'prepared': return 3
    default:         return 0  // blind
  }
}

function undiscoveredClueCount(state: GameState, locationId: string): number {
  const loc = state.mystery?.locations.find((l) => l.id === locationId)
  return loc?.clues.filter((c) => !c.found).length ?? 0
}

function statValue(state: GameState, hunterId: string, stat: StatName): number {
  const h = state.team.hunters.find((x) => x.id === hunterId)
  return h?.stats[stat] ?? 0
}

// ─── Random Strategy ──────────────────────────────────────────────────────────

/**
 * Picks uniformly at random from all valid actions.
 * Never spends luck. Only confronts when disaster is reached.
 * Purpose: feasibility baseline — "can this mystery be completed at all?"
 */
export class RandomStrategy implements Strategy {
  name = 'random'

  pickAction(_state: GameState, validActions: ActionEntry[]): ActionEntry {
    return randomPick(validActions)
  }

  shouldSpendLuck(): boolean {
    return false
  }

  shouldConfront(state: GameState): boolean {
    return isDisasterReached(state)
  }
}

// ─── Greedy Clues Strategy ────────────────────────────────────────────────────

/**
 * Maximises clue discovery: always travels to the richest unvisited location,
 * prefers investigate > interview > deepSearch.
 * Confronts when intel reaches 'informed' or clock is at 70% of disaster.
 * Spends luck only on miss (to upgrade to mixed and potentially find a clue).
 * Purpose: best-case intel — "how good can investigation get?"
 */
export class GreedyCluesStrategy implements Strategy {
  name = 'greedy'

  pickAction(state: GameState, validActions: ActionEntry[]): ActionEntry {
    return state.phase === 'confrontation'
      ? this._confrontation(state, validActions)
      : this._investigation(state, validActions)
  }

  private _investigation(state: GameState, validActions: ActionEntry[]): ActionEntry {
    const mystery = state.mystery

    // Pool all scene actions and pick the best stat-matched option
    // (investigate/interview find clues; helpBystander costs 1 clock vs travel's 2)
    const sceneActions = validActions.filter(
      (a) => ['investigate', 'interview', 'helpBystander'].includes(a.type),
    )
    if (sceneActions.length > 0) {
      // Prioritize clue-finding actions (investigate/interview) over helpBystander
      const clueFinding = sceneActions.filter((a) => a.type !== 'helpBystander')
      const candidates = clueFinding.length > 0 ? clueFinding : sceneActions
      const scored = candidates.map((a) => {
        const hunterId = a.payload.hunterId as string
        const actionStat: StatName = a.type === 'investigate' ? 'sharp'
          : a.type === 'interview' ? 'charm' : 'cool'
        return { action: a, score: statValue(state, hunterId, actionStat) }
      })
      scored.sort((x, y) => y.score - x.score)
      return scored[0].action
    }

    // Deep search only when current location has undiscovered clues
    const deepSearches = validActions.filter((a) => a.type === 'deepSearch')
    if (deepSearches.length > 0 && mystery?.currentLocationId) {
      if (undiscoveredClueCount(state, mystery.currentLocationId) > 0) {
        return deepSearches.reduce((best, a) =>
          statValue(state, a.payload.hunterId as string, 'sharp')
            > statValue(state, best.payload.hunterId as string, 'sharp') ? a : best
        )
      }
    }

    // Travel to location with most undiscovered clues
    const travels = validActions.filter((a) => a.type === 'travel')
    if (travels.length > 0) {
      return travels.reduce((best, a) => {
        const count = undiscoveredClueCount(state, a.payload.locationId as string)
        const bestCount = undiscoveredClueCount(state, best.payload.locationId as string)
        return count > bestCount ? a : best
      })
    }

    return randomPick(validActions)
  }

  private _confrontation(state: GameState, validActions: ActionEntry[]): ActionEntry {
    const mystery = state.mystery

    // exploitWeakness when available — pick option with best modifier + hunter stat
    const exploits = validActions.filter((a) => a.type === 'exploitWeakness')
    if (exploits.length > 0 && mystery) {
      const options = mystery.monster.weakness.exploitOptions
      if (options && options.length > 0) {
        const weaknessStat: StatName = mystery.monster.weakness.statRequired ?? 'tough'
        return exploits.reduce((best, a) => {
          const bestOpt = options.find((o) => o.id === best.payload.exploitOptionId)
          const aOpt = options.find((o) => o.id === a.payload.exploitOptionId)
          const bestStat = statValue(state, best.payload.hunterId as string, bestOpt?.statRequired ?? weaknessStat)
          const aStat = statValue(state, a.payload.hunterId as string, aOpt?.statRequired ?? weaknessStat)
          const bestScore = (bestOpt?.modifier ?? 0) + bestStat
          const aScore = (aOpt?.modifier ?? 0) + aStat
          return aScore > bestScore ? a : best
        })
      }
      // Legacy: pick hunter with best weakness stat
      const weaknessStat: StatName = mystery.monster.weakness.statRequired ?? 'tough'
      return exploits.reduce((best, a) => {
        return statValue(state, a.payload.hunterId as string, weaknessStat)
          > statValue(state, best.payload.hunterId as string, weaknessStat) ? a : best
      })
    }

    // Defend with a seriously hurt hunter to keep them alive
    const defends = validActions.filter((a) => a.type === 'defend')
    const hurtDefend = defends.find((a) => {
      const h = state.team.hunters.find((h) => h.id === (a.payload.hunterId as string))
      return h && h.harm >= 4
    })
    if (hurtDefend) return hurtDefend

    // Attack with the hunter with the highest tough stat
    const attacks = validActions.filter((a) => a.type === 'attack')
    if (attacks.length > 0) {
      return attacks.reduce((best, a) =>
        statValue(state, a.payload.hunterId as string, 'tough')
          > statValue(state, best.payload.hunterId as string, 'tough') ? a : best
      )
    }

    return randomPick(validActions)
  }

  shouldSpendLuck(state: GameState, roll: { outcome: string }): boolean {
    // Only spend luck in confrontation — save it for when it matters
    return state.phase === 'confrontation' && roll.outcome === 'miss'
  }

  shouldConfront(state: GameState): boolean {
    const mystery = state.mystery
    if (!mystery) return false
    // With clue-based exploits, partial intel is enough — don't burn clock chasing informed
    const intelOk = intelRank(mystery.intelLevel) >= 1  // partial or better
    const clockFraction = mystery.countdown.clockValue / mystery.countdown.clockConfig.disasterAt
    return intelOk || clockFraction >= 0.6
  }
}

// ─── Rush Strategy ────────────────────────────────────────────────────────────

/**
 * Confronts as early as possible. Takes at most one action per location before
 * moving on. Attacks every confrontation round. Never spends luck.
 * Purpose: worst-case confrontation — "how deadly is going in blind?"
 */
export class RushStrategy implements Strategy {
  name = 'rush'

  // Track whether we've taken an action at the current location
  private _actedAtCurrent = false
  private _lastLocationId: string | null = null

  pickAction(state: GameState, validActions: ActionEntry[]): ActionEntry {
    if (state.phase === 'confrontation') {
      const attacks = validActions.filter((a) => a.type === 'attack')
      return attacks.length > 0 ? attacks[0] : randomPick(validActions)
    }

    const currentLocId = state.mystery?.currentLocationId ?? null

    // Reset acted flag when location changes
    if (currentLocId !== this._lastLocationId) {
      this._actedAtCurrent = false
      this._lastLocationId = currentLocId
    }

    // Travel first: prefer unvisited locations
    const unvisitedIds = new Set(getUnvisitedLocationIds(state))
    const travelToUnvisited = validActions.filter(
      (a) => a.type === 'travel' && unvisitedIds.has(a.payload.locationId as string),
    )

    // Take one quick action per location, then move on
    if (!this._actedAtCurrent && currentLocId) {
      const quickActions = validActions.filter(
        (a) => !['rest', 'startConfrontation', 'travel'].includes(a.type),
      )
      if (quickActions.length > 0) {
        this._actedAtCurrent = true
        return quickActions[0]
      }
    }

    if (travelToUnvisited.length > 0) return travelToUnvisited[0]

    const anyTravel = validActions.filter((a) => a.type === 'travel')
    if (anyTravel.length > 0) return anyTravel[0]

    return randomPick(validActions)
  }

  shouldSpendLuck(): boolean {
    return false
  }

  shouldConfront(state: GameState): boolean {
    return isConfrontationAvailable(state)
  }
}

// ─── Balanced Strategy ────────────────────────────────────────────────────────

/**
 * Stat-matched investigation, partial intel threshold, luck spending in
 * confrontation only. Represents a thoughtful but non-optimal player.
 * Purpose: typical player proxy — "is the average experience good?"
 */
export class BalancedStrategy implements Strategy {
  name = 'balanced'

  pickAction(state: GameState, validActions: ActionEntry[]): ActionEntry {
    return state.phase === 'confrontation'
      ? this._confrontation(state, validActions)
      : this._investigation(state, validActions)
  }

  private _investigation(state: GameState, validActions: ActionEntry[]): ActionEntry {
    const mystery = state.mystery

    // Heal a seriously-injured hunter first
    const restActions = validActions.filter((a) => a.type === 'rest')
    const criticalRest = restActions.find((a) => {
      const h = state.team.hunters.find((h) => h.id === (a.payload.hunterId as string))
      return h && h.harm >= 5
    })
    if (criticalRest) return criticalRest

    // Scene actions: prefer action that matches the hunter's best stat
    const sceneActions = validActions.filter(
      (a) => ['investigate', 'interview', 'helpBystander'].includes(a.type),
    )
    if (sceneActions.length > 0) {
      const scored = sceneActions.map((a) => {
        const hunterId = a.payload.hunterId as string
        const actionStat: StatName = a.type === 'investigate' ? 'sharp'
          : a.type === 'interview' ? 'charm'
          : 'cool'
        return { action: a, score: statValue(state, hunterId, actionStat) }
      })
      scored.sort((x, y) => y.score - x.score)
      return scored[0].action
    }

    // Deep search if current location has undiscovered clues
    const deepSearches = validActions.filter((a) => a.type === 'deepSearch')
    if (deepSearches.length > 0 && mystery?.currentLocationId) {
      if (undiscoveredClueCount(state, mystery.currentLocationId) > 0) {
        return deepSearches[0]
      }
    }

    // Travel: prefer unvisited, then by clue richness
    const travels = validActions.filter((a) => a.type === 'travel')
    if (travels.length > 0) {
      const unvisitedTravels = travels.filter((a) => {
        const loc = mystery?.locations.find((l) => l.id === (a.payload.locationId as string))
        return loc && !loc.visited
      })
      const candidates = unvisitedTravels.length > 0 ? unvisitedTravels : travels
      return candidates.reduce((best, a) => {
        const count = undiscoveredClueCount(state, a.payload.locationId as string)
        const bestCount = undiscoveredClueCount(state, best.payload.locationId as string)
        return count > bestCount ? a : best
      })
    }

    return randomPick(validActions)
  }

  private _confrontation(state: GameState, validActions: ActionEntry[]): ActionEntry {
    const mystery = state.mystery

    // Exploit weakness when available
    const exploits = validActions.filter((a) => a.type === 'exploitWeakness')
    if (exploits.length > 0 && mystery) {
      const options = mystery.monster.weakness.exploitOptions
      if (options && options.length > 0) {
        // Clue-based: pick exploit with best modifier + hunter stat
        const weaknessStat: StatName = mystery.monster.weakness.statRequired ?? 'tough'
        return exploits.reduce((best, a) => {
          const bestOpt = options.find((o) => o.id === best.payload.exploitOptionId)
          const aOpt = options.find((o) => o.id === a.payload.exploitOptionId)
          const bestStat = statValue(state, best.payload.hunterId as string, bestOpt?.statRequired ?? weaknessStat)
          const aStat = statValue(state, a.payload.hunterId as string, aOpt?.statRequired ?? weaknessStat)
          const bestScore = (bestOpt?.modifier ?? 0) + bestStat
          const aScore = (aOpt?.modifier ?? 0) + aStat
          return aScore > bestScore ? a : best
        })
      } else if (intelRank(mystery.intelLevel) >= 1) {
        // Legacy: pick hunter with best weakness stat
        const weaknessStat: StatName = mystery.monster.weakness.statRequired ?? 'tough'
        return exploits.reduce((best, a) => {
          const hunterId = a.payload.hunterId as string
          return statValue(state, hunterId, weaknessStat) > statValue(state, best.payload.hunterId as string, weaknessStat)
            ? a : best
        })
      }
    }

    // Occasionally defend with a hunter who is hurt (40% chance)
    const defends = validActions.filter((a) => a.type === 'defend')
    const hurtDefend = defends.find((a) => {
      const h = state.team.hunters.find((h) => h.id === (a.payload.hunterId as string))
      return h && h.harm >= 4
    })
    if (hurtDefend && Math.random() < 0.4) return hurtDefend

    // Attack with the hunter with the highest tough stat
    const attacks = validActions.filter((a) => a.type === 'attack')
    if (attacks.length > 0) {
      return attacks.reduce((best, a) => {
        const hunterId = a.payload.hunterId as string
        return statValue(state, hunterId, 'tough') > statValue(state, best.payload.hunterId as string, 'tough')
          ? a : best
      })
    }

    return randomPick(validActions)
  }

  shouldSpendLuck(state: GameState, roll: { outcome: string }): boolean {
    // Spend luck on miss during confrontation only
    return state.phase === 'confrontation' && roll.outcome === 'miss'
  }

  shouldConfront(state: GameState): boolean {
    const mystery = state.mystery
    if (!mystery) return false
    const intelOk = intelRank(mystery.intelLevel) >= 1  // partial or better
    const clockFraction = mystery.countdown.clockValue / mystery.countdown.clockConfig.disasterAt
    return intelOk || clockFraction >= 0.6
  }
}

// ─── Free-Text Keyword Strategy ───────────────────────────────────────────────

/**
 * Uses the free-text exploit pipeline during confrontation — picks the best
 * available freeTextExploit by modifier, then selects the hunter with the
 * highest weakness stat. Falls back to Balanced behaviour when no free-text
 * exploits are available or prereqs aren't met.
 * Purpose: validate the free-text action path end-to-end in simulation.
 */
export class FreeTextKeywordStrategy implements Strategy {
  name = 'free-text'

  pickAction(state: GameState, validActions: ActionEntry[]): ActionEntry {
    return state.phase === 'confrontation'
      ? this._confrontation(state, validActions)
      : this._investigation(state, validActions)
  }

  private _investigation(state: GameState, validActions: ActionEntry[]): ActionEntry {
    const mystery = state.mystery

    // Heal critically hurt hunters first
    const criticalRest = validActions
      .filter((a) => a.type === 'rest')
      .find((a) => {
        const h = state.team.hunters.find((h) => h.id === (a.payload.hunterId as string))
        return h && h.harm >= 5
      })
    if (criticalRest) return criticalRest

    // Scene actions: best stat match
    const sceneActions = validActions.filter((a) =>
      ['investigate', 'interview', 'helpBystander'].includes(a.type),
    )
    if (sceneActions.length > 0) {
      const scored = sceneActions.map((a) => {
        const hunterId = a.payload.hunterId as string
        const actionStat: StatName =
          a.type === 'investigate' ? 'sharp' : a.type === 'interview' ? 'charm' : 'cool'
        return { action: a, score: statValue(state, hunterId, actionStat) }
      })
      scored.sort((x, y) => y.score - x.score)
      return scored[0].action
    }

    // Travel: prefer unvisited, then by clue richness
    const travels = validActions.filter((a) => a.type === 'travel')
    if (travels.length > 0) {
      const unvisited = travels.filter((a) => {
        const loc = mystery?.locations.find((l) => l.id === (a.payload.locationId as string))
        return loc && !loc.visited
      })
      const candidates = unvisited.length > 0 ? unvisited : travels
      return candidates.reduce((best, a) => {
        const count = undiscoveredClueCount(state, a.payload.locationId as string)
        const bestCount = undiscoveredClueCount(state, best.payload.locationId as string)
        return count > bestCount ? a : best
      })
    }

    return randomPick(validActions)
  }

  private _confrontation(state: GameState, validActions: ActionEntry[]): ActionEntry {
    const mystery = state.mystery
    const conf = state.confrontation

    // Free-text exploit: pick best available by modifier, then best hunter stat
    // Free-text exploits match on trigger words alone — players can always guess
    if (mystery?.monster.weakness.freeTextExploits) {
      const available = mystery.monster.weakness.freeTextExploits
      if (available.length > 0) {
        available.sort((a, b) => b.modifier - a.modifier)
        const bestExploit = available[0]
        const weaknessStat: StatName = mystery.monster.weakness.statRequired ?? 'tough'
        const triggerInput = bestExploit.triggerWords[0]?.join(' ') ?? bestExploit.id

        // Filter out hunters on exploit cooldown (last action was exploitWeakness)
        const hunters = state.team.hunters.filter((h) => {
          if (!h.alive) return false
          if (!conf) return true
          const history = conf.history.filter((a) => a.hunterId === h.id)
          const last = history[history.length - 1]
          return last?.actionType !== 'exploitWeakness'
        })
        if (hunters.length > 0) {
          const bestHunter = hunters.reduce((best, h) =>
            (h.stats[weaknessStat] ?? 0) > (best.stats[weaknessStat] ?? 0) ? h : best,
          )
          return {
            type: 'exploitWeakness',
            payload: { hunterId: bestHunter.id, freeTextInput: triggerInput },
            timestamp: 0,
          }
        }
      }
    }

    // Defend a seriously hurt hunter
    const hurtDefend = validActions
      .filter((a) => a.type === 'defend')
      .find((a) => {
        const h = state.team.hunters.find((h) => h.id === (a.payload.hunterId as string))
        return h && h.harm >= 4
      })
    if (hurtDefend) return hurtDefend

    // Attack with best tough stat
    const attacks = validActions.filter((a) => a.type === 'attack')
    if (attacks.length > 0) {
      return attacks.reduce((best, a) =>
        statValue(state, a.payload.hunterId as string, 'tough') >
        statValue(state, best.payload.hunterId as string, 'tough')
          ? a
          : best,
      )
    }

    return randomPick(validActions)
  }

  shouldSpendLuck(state: GameState, roll: { outcome: string }): boolean {
    return state.phase === 'confrontation' && roll.outcome === 'miss'
  }

  shouldConfront(state: GameState): boolean {
    const mystery = state.mystery
    if (!mystery) return false
    // Even one found clue may unlock a free-text exploit — confront at partial+
    const intelOk = intelRank(mystery.intelLevel) >= 1
    const clockFraction = mystery.countdown.clockValue / mystery.countdown.clockConfig.disasterAt
    return intelOk || clockFraction >= 0.6
  }
}

// ─── Free-Text Compare Strategy ──────────────────────────────────────────────

/**
 * Record of a free-text exploit decision made during simulation.
 * Captures enough context to replay through AI for keyword-vs-AI comparison.
 */
export interface FreeTextComparisonRecord {
  seed: string
  confrontationTurn: number
  hunterId: string
  input: string
  keyword: {
    stat: StatName
    modifier: number
    exploitId: string | null
    confidence: string
    successHarm: 'maxHarm' | number
  }
  context: {
    foundClueIds: string[]
    intelLevel: IntelLevel
  }
}

/**
 * Extends FreeTextKeywordStrategy to collect comparison records.
 *
 * During simulation, picks actions identically to the base free-text strategy.
 * Additionally runs the keyword pipeline on each free-text exploit input and
 * records the result. After simulation completes, the accumulated records can
 * be batch-processed through AI for keyword-vs-AI comparison analysis.
 *
 * Usage:
 *   const strategy = new FreeTextCompareStrategy()
 *   runSimulation({ ..., strategy })
 *   // strategy.records now contains all free-text decision data
 */
export class FreeTextCompareStrategy extends FreeTextKeywordStrategy {
  override name = 'free-text-compare'

  /** Accumulated comparison records across all simulation runs */
  readonly records: FreeTextComparisonRecord[] = []

  private _confrontationTurn = 0

  override pickAction(state: GameState, validActions: ActionEntry[]): ActionEntry {
    // Track confrontation turns (reset when a new confrontation starts)
    if (state.phase === 'confrontation') {
      const conf = state.confrontation
      this._confrontationTurn = conf ? conf.history.length : 0
    }

    const action = super.pickAction(state, validActions)

    // Record comparison data when a free-text exploit is chosen
    if (
      action.type === 'exploitWeakness' &&
      typeof action.payload.freeTextInput === 'string' &&
      state.mystery
    ) {
      const mystery = state.mystery
      const input = action.payload.freeTextInput as string
      const hunterId = action.payload.hunterId as string
      const hunter = state.team.hunters.find((h) => h.id === hunterId)

      // All clue defs from all locations
      const allClues = mystery.locations.flatMap((l) => l.clues)

      // Run keyword pipeline to capture interpretation
      const keywordResult = interpretAction({
        input,
        allClues,
        foundClueIds: mystery.cluesFound,
        weakness: mystery.monster.weakness,
        monsterHarm: mystery.monster.harm,
        hunterBestStat: hunter
          ? (Object.entries(hunter.stats).sort(([, a], [, b]) => b - a)[0][0] as StatName)
          : undefined,
      })

      this.records.push({
        seed: state.seed,
        confrontationTurn: this._confrontationTurn,
        hunterId,
        input,
        keyword: {
          stat: keywordResult.stat,
          modifier: keywordResult.modifier,
          exploitId: keywordResult.exploitId,
          confidence: keywordResult.statConfidence,
          successHarm: keywordResult.successHarm,
        },
        context: {
          foundClueIds: [...mystery.cluesFound],
          intelLevel: mystery.intelLevel,
        },
      })
    }

    return action
  }
}

// ─── Strategy Registry ────────────────────────────────────────────────────────

const STRATEGY_FACTORIES: Record<string, () => Strategy> = {
  random:     () => new RandomStrategy(),
  greedy:     () => new GreedyCluesStrategy(),
  rush:       () => new RushStrategy(),
  balanced:   () => new BalancedStrategy(),
  'free-text': () => new FreeTextKeywordStrategy(),
  'free-text-compare': () => new FreeTextCompareStrategy(),
}

export const STRATEGY_NAMES = Object.keys(STRATEGY_FACTORIES)

/**
 * Creates a fresh strategy instance by name.
 * Each call returns a new instance (strategies may have internal tracking state).
 */
export function createStrategy(name: string): Strategy {
  const factory = STRATEGY_FACTORIES[name]
  if (!factory) {
    throw new Error(
      `Unknown strategy: '${name}'. Available: ${STRATEGY_NAMES.join(', ')}`,
    )
  }
  return factory()
}
