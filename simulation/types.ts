/**
 * Type definitions for the simulation system.
 *
 * The simulation layer runs headless game loops using strategy objects to
 * drive decisions. All types here are simulation-specific — the engine types
 * live in src/engine/types.ts.
 */

import type {
  GameState,
  ActionEntry,
  RollResult,
  IntelLevel,
  HunterCondition,
  MonsterDef,
  ClockConfig,
  PlaybookStats,
} from '../src/engine/types'

// ─── Strategy Interface ───────────────────────────────────────────────────────

/**
 * A simulation strategy drives all decisions during a headless game run.
 * Strategies implement three decision points:
 * - pickAction: choose the next action from the valid action list
 * - shouldSpendLuck: after a roll, decide whether to spend luck to upgrade
 * - shouldConfront: during investigation, decide whether to start confrontation
 */
export interface Strategy {
  name: string
  /** Pick the next action given the current game state and valid action list */
  pickAction(state: GameState, validActions: ActionEntry[]): ActionEntry
  /** After a roll, decide whether to spend luck to upgrade the outcome */
  shouldSpendLuck(state: GameState, roll: RollResult): boolean
  /** During investigation, decide whether to start confrontation now */
  shouldConfront(state: GameState): boolean
}

// ─── Hunter Definition (for experiment config) ────────────────────────────────

/**
 * Minimal definition needed to create a hunter for simulation.
 * Matches the shape accepted by startMystery's hunters payload.
 */
export interface HunterDef {
  id: string
  name: string
  playbookId: string
  stats: PlaybookStats
  luck?: number         // default 7
  bondCapacity?: number // default from playbook
}

// ─── Pre-Confrontation Snapshot ───────────────────────────────────────────────

/**
 * State snapshot captured the moment startConfrontation is applied.
 * Tracks how well the investigation phase went.
 */
export interface PreConfrontationSnapshot {
  clockValue: number
  currentStep: number
  intelLevel: IntelLevel
  cluesFound: string[]       // IDs in discovery order
  cluesAvailable: number     // total clue defs across all locations
  locationsVisited: string[]
  locationsAvailable: number
  hunterStates: Array<{
    id: string
    name: string
    playbookId: string
    harm: number
    luck: number
    conditions: HunterCondition[]
    alive: boolean
  }>
  staminaRemaining: number
  staminaMax: number
  totalActions: number
  forcedByCountdown: boolean
}

// ─── Post-Confrontation Snapshot ─────────────────────────────────────────────

/**
 * State snapshot captured after endMystery.
 * Tracks how the confrontation phase played out.
 */
export interface PostConfrontationSnapshot {
  outcome: 'win' | 'loss' | 'retreat'
  roundsFought: number
  monsterHarmDealt: number
  monsterMaxHarm: number
  hunterStates: Array<{
    id: string
    harm: number
    luck: number
    luckSpent: number
    conditions: HunterCondition[]
    alive: boolean
    rollsSucceeded: number
    rollsMixed: number
    rollsMissed: number
  }>
  actionsUsed: Record<string, number>  // count per action type
  exploitWeaknessAttempted: boolean
  exploitWeaknessSucceeded: boolean
}

// ─── Run Result ───────────────────────────────────────────────────────────────

/**
 * Complete result of one mystery playthrough.
 */
export interface RunResult {
  seed: string
  mysteryId: string
  strategyName: string
  pre: PreConfrontationSnapshot
  post: PostConfrontationSnapshot
  actionLog: ActionEntry[]
  durationMs: number
}

// ─── Experiment Config ────────────────────────────────────────────────────────

/**
 * JSON config for a named experiment — specifies mystery, hunters, and
 * strategies to test. Load from simulation/experiments/*.json.
 */
export interface ExperimentConfig {
  name: string
  description?: string

  /** Path to mystery JSON (e.g. 'data/mysteries/mystery-001.json') */
  mysteryPath: string
  /** Optional overrides merged into the mystery definition */
  mysteryOverrides?: {
    monster?: Partial<MonsterDef>
    clockConfig?: Partial<ClockConfig>
  }

  /** Hunter roster for the experiment */
  hunters: Array<{
    playbookId: string
    name?: string
    statOverrides?: Partial<PlaybookStats>
  }>

  /** Strategy names to run (from STRATEGIES registry) */
  strategies: string[]
  /** Simulations per strategy (default 100) */
  runsPerStrategy: number
  /** Seed prefix for deterministic seed generation: `${prefix}-${i}` */
  seedPrefix?: string

  /** Optional optimizer settings */
  optimize?: {
    generations: number         // default 50
    samplesPerCandidate: number // default 20
    mutationRate: number        // default 0.2
  }
}

// ─── Strategy Params (for optimizer) ─────────────────────────────────────────

/**
 * Numeric weight vector driving the ParameterizedStrategy.
 * All values are continuous — the optimizer tunes them via coordinate descent.
 */
export interface StrategyParams {
  // --- Location selection ---
  /** 0–10: prefer unvisited locations */
  unvisitedWeight: number
  /** 0–10: prefer locations with more undiscovered clues */
  clueRichnessWeight: number
  /** -5–5: prefer low-threat locations (negative = prefer dangerous) */
  safetyWeight: number

  // --- Action selection ---
  /** 0–10: preference for investigate action */
  investigatePreference: number
  /** 0–10: preference for interview action */
  interviewPreference: number
  /** 0–10: willingness to spend stamina on deepSearch */
  deepSearchWillingness: number
  /** 0–7: rest when hunter harm >= this value */
  restThreshold: number

  // --- Confrontation timing ---
  /** 0–3: minimum intel level before confronting (0=blind, 1=partial, 2=informed, 3=prepared) */
  minIntelForConfront: number
  /** 0–1: confront when clockValue/disasterAt >= this fraction */
  clockPressureThreshold: number

  // --- Confrontation tactics ---
  /** 0–10: weight for attack action */
  attackWeight: number
  /** 0–10: weight for defend action */
  defendWeight: number
  /** 0–10: preference for exploitWeakness when available */
  exploitWeight: number

  // --- Luck spending ---
  /** 0–1: probability of spending luck on a miss */
  luckOnMiss: number
  /** 0–1: probability of spending luck on a mixed result */
  luckOnMixed: number
}

// ─── Scoring Weights ──────────────────────────────────────────────────────────

/**
 * Weights used to score a RunResult for optimizer fitness.
 */
export interface ScoringWeights {
  win: number                              // default 100
  retreat: number                          // default 20
  loss: number                             // default 0
  perClue: number                          // default 5
  intelBonus: Record<IntelLevel, number>   // blind=0, partial=10, informed=25, prepared=40
  perHarmPenalty: number                   // default -3
  perLuckRemaining: number                 // default 2
  perDeadHunter: number                    // default -50
  /** Bonus points per action under 30 total actions */
  efficiencyBonus: number                  // default 1
}
