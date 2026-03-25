/**
 * Clue system helpers — discovery, intel level derivation, and access gates.
 *
 * All functions are pure or mutate an already-cloned state (same contract as
 * other engine modules). No structuredClone calls here.
 */

import type {
  Clue,
  ClueDef,
  IntelLevel,
  Location,
  Mystery,
  MysteryDefinition,
  RollOutcome,
} from './types'
import { intelFromClueCount } from './types'

// ─── Access gates ─────────────────────────────────────────────────────────────

/**
 * True if the given clue can be discovered by the given roll outcome.
 *
 * Rules:
 * - If `minRollOutcome` is 'success', only a 10+ (success) reveals it.
 * - Otherwise, any non-miss (7+, i.e. 'mixed' or 'success') reveals it.
 */
export function isClueRevealedByOutcome(clue: ClueDef | Clue, outcome: RollOutcome): boolean {
  if (outcome === 'miss') return false
  if (clue.minRollOutcome === 'success') return outcome === 'success'
  return true  // 'mixed' or better suffices
}

// ─── Discovery ────────────────────────────────────────────────────────────────

/**
 * Attempt to discover one matching clue at a location.
 *
 * Finds the first unfound clue at the location that:
 *  1. matches the `requiresAction` type
 *  2. is not guarded by a minion (or guardedByMinion is explicitly false)
 *  3. is revealed by the roll outcome (respects minRollOutcome gate)
 *
 * Mutates mystery in place. Returns the discovered Clue, or null if none found.
 */
export function discoverClue(
  mystery: Mystery,
  location: Location,
  requiresAction: string,
  outcome: RollOutcome,
  hunterId: string,
  actionCount: number,
): Clue | null {
  const clue = location.clues.find(
    (c) =>
      !c.found &&
      c.requiresAction === requiresAction &&
      !c.guardedByMinion &&
      isClueRevealedByOutcome(c, outcome),
  )

  if (!clue) return null

  clue.found = true
  clue.foundBy = hunterId
  clue.foundAt = actionCount
  mystery.cluesFound.push(clue.id)
  mystery.intelLevel = intelFromClueCount(mystery.cluesFound.length)

  return clue
}

/**
 * Attempt to discover a deepSearch clue at a location.
 *
 * deepSearch uses a slightly different priority: it prefers clues with
 * `requiresAction === 'deepSearch'` first, then falls back to any unfound
 * clue that isn't guarded (catching things normal investigate would miss).
 */
export function discoverDeepSearchClue(
  mystery: Mystery,
  location: Location,
  outcome: RollOutcome,
  hunterId: string,
  actionCount: number,
): Clue | null {
  // First try deepSearch-specific clues
  let clue = location.clues.find(
    (c) =>
      !c.found &&
      c.requiresAction === 'deepSearch' &&
      !c.guardedByMinion &&
      isClueRevealedByOutcome(c, outcome),
  )

  // Fall back: any unfound non-guarded clue (deepSearch is thorough)
  if (!clue) {
    clue = location.clues.find(
      (c) =>
        !c.found &&
        c.guardedByMinion !== true &&
        isClueRevealedByOutcome(c, outcome),
    )
  }

  if (!clue) return null

  clue.found = true
  clue.foundBy = hunterId
  clue.foundAt = actionCount
  mystery.cluesFound.push(clue.id)
  mystery.intelLevel = intelFromClueCount(mystery.cluesFound.length)

  return clue
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** True if a clue with the given ID has already been found in this mystery. */
export function isClueFound(mystery: Mystery, clueId: string): boolean {
  return mystery.cluesFound.includes(clueId)
}

/** All undiscovered clues at a location. */
export function getUndiscoveredClues(location: Location): Clue[] {
  return location.clues.filter((c) => !c.found)
}

/** All clues at a location that are accessible via a specific action type. */
export function getCluesByAction(location: Location, actionType: string): Clue[] {
  return location.clues.filter((c) => c.requiresAction === actionType)
}

/**
 * Recalculate and apply the current intel level from the mystery's cluesFound
 * array. Safe to call multiple times — idempotent.
 */
export function recalculateIntel(mystery: Mystery): IntelLevel {
  mystery.intelLevel = intelFromClueCount(mystery.cluesFound.length)
  return mystery.intelLevel
}

// ─── Validation (used by simulation / testing) ────────────────────────────────

/**
 * Returns a list of clue IDs in the mystery definition that are NOT reachable
 * by any action path (e.g. an action type that no location lists as available).
 *
 * Used in simulation tests to verify mystery integrity.
 */
export function getUnreachableClueIds(def: MysteryDefinition): string[] {
  const unreachable: string[] = []

  for (const locDef of def.locationDefs) {
    for (const clueDef of locDef.clueDefs) {
      const actionAvailable = locDef.availableActions.includes(clueDef.requiresAction)
      if (!actionAvailable) {
        unreachable.push(clueDef.id)
      }
    }
  }

  return unreachable
}
