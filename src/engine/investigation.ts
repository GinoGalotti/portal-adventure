/**
 * Investigation phase helpers — clock advancement and location utilities.
 *
 * The "clock" is a continuous counter that drives the 6-step narrative
 * countdown. Each action and travel event advances it by a configurable
 * amount. Roll quality affects the cost: misses cost extra, successes
 * refund some clock. When the clock crosses a step threshold the narrative
 * step advances automatically.
 *
 * These are pure helper functions that mutate an already-cloned state (the
 * same contract as all handlers in actions.ts). They do NOT call
 * structuredClone themselves.
 */

import type { ClockConfig, CountdownDef, CountdownState, GameState, RollOutcome } from './types'

// ─── Default clock config ─────────────────────────────────────────────────────

export const DEFAULT_CLOCK_CONFIG: ClockConfig = {
  actionCost: 1,
  travelCost: 2,
  missPenalty: 1,
  successRefund: 1,
  confrontationAt: 10,
  disasterAt: 30,
  stepThresholds: [5, 10, 15, 20, 25],
}

/**
 * Resolve a (possibly partial) clock config from a CountdownDef, filling
 * missing fields from DEFAULT_CLOCK_CONFIG.
 */
export function resolveClockConfig(def: CountdownDef): ClockConfig {
  if (!def.clockConfig) return DEFAULT_CLOCK_CONFIG
  return { ...DEFAULT_CLOCK_CONFIG, ...def.clockConfig }
}

// ─── Clock helpers ────────────────────────────────────────────────────────────

/**
 * How much clock a given roll outcome costs for a single action.
 * miss  → actionCost + missPenalty
 * mixed → actionCost
 * success → max(0, actionCost − successRefund)
 */
export function clockCostForOutcome(outcome: RollOutcome, config: ClockConfig): number {
  switch (outcome) {
    case 'miss':    return config.actionCost + config.missPenalty
    case 'mixed':   return config.actionCost
    case 'success': return Math.max(0, config.actionCost - config.successRefund)
  }
}

/**
 * Advance the clock by `amount`, then check for newly-crossed step
 * thresholds and update currentStep accordingly.
 * Mutates countdown in place — caller must have already cloned state.
 */
export function tickClock(countdown: CountdownState, amount: number, actionCount: number): void {
  if (amount === 0) return
  countdown.clockValue = Math.max(0, countdown.clockValue + amount)

  const thresholds = countdown.clockConfig.stepThresholds
  for (let step = countdown.currentStep + 1; step <= 5; step++) {
    const threshold = thresholds[step - 1]
    if (threshold !== undefined && countdown.clockValue >= threshold) {
      countdown.currentStep = step
      countdown.triggeredAt.push(actionCount)
    }
  }
}

/**
 * Called after a travel action. Adds travelCost to the clock.
 */
export function advanceClockForTravel(state: GameState): void {
  if (!state.mystery) return
  const { countdown } = state.mystery
  tickClock(countdown, countdown.clockConfig.travelCost, state.actionCount)
}

/**
 * Called after any investigation roll (investigate, interview, deepSearch,
 * fightMinion, helpBystander, rest). Cost depends on roll outcome.
 */
export function advanceClockForAction(state: GameState, outcome: RollOutcome): void {
  if (!state.mystery) return
  const { countdown } = state.mystery
  const cost = clockCostForOutcome(outcome, countdown.clockConfig)
  tickClock(countdown, cost, state.actionCount)
}

// ─── Confrontation availability ───────────────────────────────────────────────

/**
 * True when the clock has reached the confrontationAt threshold, meaning
 * the UI should make the "Start Confrontation" button available.
 * The engine does not block startConfrontation — this is a UI-layer check.
 */
export function isConfrontationAvailable(state: GameState): boolean {
  if (!state.mystery) return false
  const { countdown } = state.mystery
  return countdown.clockValue >= countdown.clockConfig.confrontationAt
}

/**
 * True when the clock has reached or exceeded the disasterAt threshold.
 * The UI should auto-trigger a confrontation when this is true.
 */
export function isDisasterReached(state: GameState): boolean {
  if (!state.mystery) return false
  const { countdown } = state.mystery
  return countdown.clockValue >= countdown.clockConfig.disasterAt
}

// ─── Location utilities ───────────────────────────────────────────────────────

/**
 * True if all discoverable clues at a location have been found.
 * (A location is "resolved" when no more clues remain.)
 */
export function isLocationResolved(
  state: GameState,
  locationId: string,
): boolean {
  const mystery = state.mystery
  if (!mystery) return false
  const loc = mystery.locations.find((l) => l.id === locationId)
  if (!loc) return false
  return loc.clues.every((c) => c.found || c.guardedByMinion)
}

/**
 * Returns a list of location IDs the team has not yet visited.
 */
export function getUnvisitedLocationIds(state: GameState): string[] {
  if (!state.mystery) return []
  return state.mystery.locations
    .filter((l) => !l.visited)
    .map((l) => l.id)
}

/**
 * Returns true if a location's clue prerequisites are met.
 * Locations without requiredClueIds are always accessible.
 */
export function isLocationAccessible(state: GameState, location: { requiredClueIds: string[] }): boolean {
  if (!state.mystery || location.requiredClueIds.length === 0) return true
  const foundClues = new Set(state.mystery.cluesFound)
  return location.requiredClueIds.every((id) => foundClues.has(id))
}

/**
 * Returns a list of location IDs reachable from the current location
 * (adjacent) plus the current location itself. Respects clue-based
 * location gating — gated locations whose prerequisites are unmet are
 * excluded.
 */
export function getReachableLocationIds(state: GameState): string[] {
  const mystery = state.mystery
  if (!mystery || !mystery.currentLocationId) {
    return mystery?.locations
      .filter((l) => isLocationAccessible(state, l))
      .map((l) => l.id) ?? []
  }
  const current = mystery.locations.find(
    (l) => l.id === mystery.currentLocationId,
  )
  if (!current) return []
  const adjacent = current.adjacentLocationIds
    .map((id) => mystery.locations.find((l) => l.id === id))
    .filter((l): l is NonNullable<typeof l> => l !== undefined && isLocationAccessible(state, l))
    .map((l) => l.id)
  return [current.id, ...adjacent]
}
