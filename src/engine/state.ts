/**
 * Initial state construction and action-log replay.
 *
 * save = (seed, actions[])
 * load = deriveState(seed, actions[])
 *
 * Both functions are pure and deterministic — the same seed plus the same
 * ordered action list always produces byte-identical GameState.
 */

import { GameState, ActionEntry } from './types'
import { GameRNG } from './rng'
import { applyAction } from './actions'

/**
 * Create the initial GameState for a given seed.
 * The RNG is seeded immediately so that any debug_forceRoll or startMystery
 * action that happens first will advance from the correct position.
 */
export function createInitialState(seed: string): GameState {
  const rng = new GameRNG(seed)
  return {
    seed,
    phase: 'setup',
    team: { hunters: [], staminaPool: 0, maxStamina: 0 },
    mystery: null,
    fieldReport: null,
    confrontation: null,
    lastRoll: null,
    rngState: rng.getState(),
    actionCount: 0,
    mysteryStartTime: null,
    debugMode: false,
    debugForceRollValue: null,
  }
}

/**
 * Replay an ordered action log from a seed and return the resulting GameState.
 * This is the canonical "load save" path — identical to playing the game live.
 */
export function deriveState(seed: string, actions: ActionEntry[]): GameState {
  return actions.reduce<GameState>(
    (state, action) => applyAction(state, action),
    createInitialState(seed),
  )
}
