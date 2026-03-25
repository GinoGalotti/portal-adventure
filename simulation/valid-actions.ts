/**
 * Valid action enumeration for the simulation layer.
 *
 * The engine validates actions reactively (inside handlers), but the simulation
 * needs to enumerate legal moves proactively so strategies can choose from them.
 *
 * getValidActions(state) returns all structurally-valid ActionEntry objects for
 * the current game phase. It does NOT include:
 * - spendLuck: handled separately by the runner after each roll via shouldSpendLuck
 * - endMystery: handled by the runner when confrontation resolves
 */

import type { GameState, ActionEntry } from '../src/engine/types'
import { getReachableLocationIds } from '../src/engine/investigation'

// ─── Investigation Phase ──────────────────────────────────────────────────────

function getInvestigationActions(state: GameState): ActionEntry[] {
  const mystery = state.mystery
  if (!mystery) return []

  const actions: ActionEntry[] = []
  const now = 0  // simulation uses 0 for timestamps

  // Travel: reachable locations excluding current
  const reachable = getReachableLocationIds(state)
  for (const locationId of reachable) {
    if (locationId !== mystery.currentLocationId) {
      actions.push({ type: 'travel', payload: { locationId }, timestamp: now })
    }
  }

  // Per-location actions require a current location
  if (mystery.currentLocationId) {
    const location = mystery.locations.find((l) => l.id === mystery.currentLocationId)
    if (location) {
      for (const hunter of state.team.hunters) {
        if (!hunter.alive) continue

        if (hunter.sceneActionsRemaining > 0) {
          // Scene actions (consume sceneActionsRemaining)
          if (location.availableActions.includes('investigate')) {
            actions.push({ type: 'investigate', payload: { hunterId: hunter.id }, timestamp: now })
          }
          if (location.availableActions.includes('interview')) {
            actions.push({ type: 'interview', payload: { hunterId: hunter.id }, timestamp: now })
          }
          if (location.availableActions.includes('helpBystander')) {
            actions.push({ type: 'helpBystander', payload: { hunterId: hunter.id }, timestamp: now })
          }
          if (hunter.harm > 0) {
            actions.push({ type: 'rest', payload: { hunterId: hunter.id }, timestamp: now })
          }
        }

        // Stamina actions (consume staminaPool, not sceneActionsRemaining)
        if (state.team.staminaPool > 0) {
          if (location.availableActions.includes('deepSearch')) {
            actions.push({ type: 'deepSearch', payload: { hunterId: hunter.id }, timestamp: now })
          }
          if (location.minionsPresent > 0) {
            actions.push({ type: 'fightMinion', payload: { hunterId: hunter.id }, timestamp: now })
          }
        }
      }
    }
  }

  // startConfrontation is always structurally valid during investigation.
  // The runner calls strategy.shouldConfront() first; if false, strategies
  // can still pick this from validActions.
  actions.push({ type: 'startConfrontation', payload: {}, timestamp: now })

  return actions
}

// ─── Confrontation Phase ──────────────────────────────────────────────────────

function getConfrontationActions(state: GameState): ActionEntry[] {
  const conf = state.confrontation
  if (!conf) return []

  const actions: ActionEntry[] = []
  const now = 0

  for (const hunter of state.team.hunters) {
    if (!hunter.alive) continue

    actions.push({ type: 'attack',   payload: { hunterId: hunter.id }, timestamp: now })
    actions.push({ type: 'defend',   payload: { hunterId: hunter.id }, timestamp: now })
    actions.push({ type: 'resist',   payload: { hunterId: hunter.id }, timestamp: now })
    actions.push({ type: 'distract', payload: { hunterId: hunter.id }, timestamp: now })
    actions.push({ type: 'assess',   payload: { hunterId: hunter.id }, timestamp: now })

    if (conf.intelLevel !== 'blind') {
      actions.push({ type: 'exploitWeakness', payload: { hunterId: hunter.id }, timestamp: now })
    }
  }

  return actions
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns all structurally-valid actions for the current game state and phase.
 *
 * Returns an empty array for phases where no player actions are possible
 * (setup, briefing, fieldReport, complete) or when required state is absent.
 */
export function getValidActions(state: GameState): ActionEntry[] {
  switch (state.phase) {
    case 'investigation':
      return getInvestigationActions(state)
    case 'confrontation':
      return getConfrontationActions(state)
    default:
      return []
  }
}
