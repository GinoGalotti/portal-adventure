/**
 * Debug command API — pure functions (GameState) → GameState.
 *
 * Each function constructs the appropriate debug ActionEntry and applies it
 * through the canonical applyAction reducer, so all mutations are reflected
 * in the action log and are fully replayable.
 *
 * These functions are only available in debug mode and must never be shipped
 * in production builds.
 */

import { GameState, ActionEntry, IntelLevel } from './types'
import { applyAction } from './actions'

function debugAct(
  type: ActionEntry['type'],
  payload: Record<string, unknown> = {},
): ActionEntry {
  return { type, payload, timestamp: 0, debug: true }
}

// ─── Revelation commands ───────────────────────────────────────────────────────

/** Mark every clue in every location as found and set intel to 'prepared'. */
export function revealAllClues(state: GameState): GameState {
  return applyAction(state, debugAct('debug_revealAllClues'))
}

/** Set the monsterRevealed flag on the active mystery. */
export function revealMonster(state: GameState): GameState {
  return applyAction(state, debugAct('debug_revealMonster'))
}

/** Set mapRevealed and mark all locations as visited. */
export function revealMap(state: GameState): GameState {
  return applyAction(state, debugAct('debug_revealMap'))
}

// ─── State-override commands ───────────────────────────────────────────────────

/** Set the active mystery's intel level (and confrontation's, if active). */
export function setIntelLevel(state: GameState, level: IntelLevel): GameState {
  return applyAction(state, debugAct('debug_setIntelLevel', { level }))
}

/** Set a hunter's harm to an exact value (0–7). */
export function setHunterHarm(state: GameState, hunterId: string, harm: number): GameState {
  return applyAction(state, debugAct('debug_setHunterHarm', { hunterId, harm }))
}

/** Set a hunter's luck to an exact value (clamped to [0, maxLuck]). */
export function setHunterLuck(state: GameState, hunterId: string, luck: number): GameState {
  return applyAction(state, debugAct('debug_setHunterLuck', { hunterId, luck }))
}

/** Set the countdown clock to a specific step (0–6). */
export function setCountdown(state: GameState, step: number): GameState {
  return applyAction(state, debugAct('debug_setCountdown', { step }))
}

/** Add (or subtract) stamina from the team's pool. */
export function addStamina(state: GameState, amount: number): GameState {
  return applyAction(state, debugAct('debug_addStamina', { amount }))
}

// ─── Phase-jump commands ───────────────────────────────────────────────────────

/** Skip the investigation phase and jump directly to confrontation. */
export function skipToConfrontation(state: GameState): GameState {
  return applyAction(state, debugAct('debug_skipToConfrontation'))
}

/** Force the dice sum for the next performRoll call (2–12, not including stat modifier). */
export function forceRoll(state: GameState, value: number): GameState {
  return applyAction(state, debugAct('debug_forceRoll', { value }))
}

// ─── Hunter commands ───────────────────────────────────────────────────────────

/** Kill a hunter immediately (sets harm to 7). */
export function killHunter(state: GameState, hunterId: string): GameState {
  return applyAction(state, debugAct('debug_killHunter', { hunterId }))
}

// ─── Case-resolution commands ──────────────────────────────────────────────────

/**
 * Immediately complete the active mystery with the specified outcome.
 * Generates a field report without requiring a confrontation.
 */
export function completeCase(
  state: GameState,
  outcome: 'win' | 'loss' | 'retreat',
): GameState {
  return applyAction(state, debugAct('debug_completeCase', { outcome }))
}

// ─── Meta commands ─────────────────────────────────────────────────────────────

/** Change the game seed (only safe before mystery starts). */
export function setSeed(state: GameState, seed: string): GameState {
  return applyAction(state, debugAct('debug_setSeed', { seed }))
}

/** Unlock all playbooks for the current session (no-op in Phase A). */
export function unlockAllPlaybooks(state: GameState): GameState {
  return applyAction(state, debugAct('debug_unlockAllPlaybooks'))
}

/** Grant resources for the current session (no-op in Phase A). */
export function grantResources(state: GameState): GameState {
  return applyAction(state, debugAct('debug_grantResources'))
}

/**
 * Replace the entire game state from a serialised JSON string.
 * Used for save-state injection during testing or live debugging.
 */
export function loadState(state: GameState, json: string): GameState {
  return applyAction(state, debugAct('debug_loadState', { json }))
}
