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
import { getAvailableExploitOptions } from '../src/engine/confrontation'

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
  const mystery = state.mystery

  const actions: ActionEntry[] = []
  const now = 0

  for (const hunter of state.team.hunters) {
    if (!hunter.alive) continue

    actions.push({ type: 'attack',   payload: { hunterId: hunter.id }, timestamp: now })
    actions.push({ type: 'defend',   payload: { hunterId: hunter.id }, timestamp: now })
    actions.push({ type: 'resist',   payload: { hunterId: hunter.id }, timestamp: now })
    actions.push({ type: 'distract', payload: { hunterId: hunter.id }, timestamp: now })
    actions.push({ type: 'assess',   payload: { hunterId: hunter.id }, timestamp: now })
  }

  // Helper: check if a hunter is on exploit cooldown (last action was exploitWeakness)
  function hunterOnExploitCooldown(hunterId: string): boolean {
    const hunterHistory = conf.history.filter((a) => a.hunterId === hunterId)
    const last = hunterHistory[hunterHistory.length - 1]
    return last?.actionType === 'exploitWeakness'
  }

  // Exploit weakness: clue-based options, free-text exploits, or legacy intel check
  if (mystery) {
    const exploitOptions = mystery.monster.weakness.exploitOptions
    const freeTextExploits = mystery.monster.weakness.freeTextExploits
    if (exploitOptions && exploitOptions.length > 0) {
      // Structured path: one action per available option per alive hunter (cooldown-aware)
      // Only emit actions when prerequisites are met — the engine requires exploitOptionId
      // when exploitOptions is defined and will throw otherwise.
      const available = getAvailableExploitOptions(mystery)
      if (available.length > 0) {
        for (const option of available) {
          for (const hunter of state.team.hunters) {
            if (!hunter.alive || hunterOnExploitCooldown(hunter.id)) continue
            actions.push({
              type: 'exploitWeakness',
              payload: { hunterId: hunter.id, exploitOptionId: option.id },
              timestamp: now,
            })
          }
        }
      }
      // No fallback when no options are unlocked: strategies should stay in investigation
      // until shouldConfront decides it's time (at clock >= 70% or a mod>=0 option is available).
    } else if (freeTextExploits && freeTextExploits.length > 0) {
      // Free-text path: one action per available exploit per alive hunter (cooldown-aware)
      const available = freeTextExploits
      for (const ft of available) {
        const triggerInput = ft.triggerWords[0]?.join(' ') ?? ft.id
        for (const hunter of state.team.hunters) {
          if (!hunter.alive || hunterOnExploitCooldown(hunter.id)) continue
          actions.push({
            type: 'exploitWeakness',
            payload: { hunterId: hunter.id, freeTextInput: triggerInput },
            timestamp: now,
          })
        }
      }
    } else if (conf.intelLevel !== 'blind') {
      // Legacy path: one exploitWeakness per alive hunter (cooldown-aware)
      for (const hunter of state.team.hunters) {
        if (!hunter.alive || hunterOnExploitCooldown(hunter.id)) continue
        actions.push({
          type: 'exploitWeakness',
          payload: { hunterId: hunter.id },
          timestamp: now,
        })
      }
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
