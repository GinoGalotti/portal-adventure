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
import type { GameState, ActionEntry, StatName } from '../src/engine/types'
import type { Strategy } from './types'

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
    // Scene actions: investigate > interview > helpBystander
    const investigates = validActions.filter((a) => a.type === 'investigate')
    if (investigates.length > 0) return investigates[0]

    const interviews = validActions.filter((a) => a.type === 'interview')
    if (interviews.length > 0) return interviews[0]

    const deepSearches = validActions.filter((a) => a.type === 'deepSearch')
    if (deepSearches.length > 0) return deepSearches[0]

    const helpBystanders = validActions.filter((a) => a.type === 'helpBystander')
    if (helpBystanders.length > 0) return helpBystanders[0]

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

  private _confrontation(_state: GameState, validActions: ActionEntry[]): ActionEntry {
    // exploitWeakness when available, then attack
    const exploits = validActions.filter((a) => a.type === 'exploitWeakness')
    if (exploits.length > 0) return exploits[0]

    const attacks = validActions.filter((a) => a.type === 'attack')
    if (attacks.length > 0) return attacks[0]

    return randomPick(validActions)
  }

  shouldSpendLuck(_state: GameState, roll: { outcome: string }): boolean {
    return roll.outcome === 'miss'
  }

  shouldConfront(state: GameState): boolean {
    const mystery = state.mystery
    if (!mystery) return false
    const intelOk = intelRank(mystery.intelLevel) >= 2  // informed or better
    const clockFraction = mystery.countdown.clockValue / mystery.countdown.clockConfig.disasterAt
    return intelOk || clockFraction >= 0.7
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

    // Use exploitWeakness when intel is partial or better
    if (mystery && intelRank(mystery.intelLevel) >= 1) {
      const exploits = validActions.filter((a) => a.type === 'exploitWeakness')
      if (exploits.length > 0) {
        // Pick the hunter with the best weakness stat
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

// ─── Strategy Registry ────────────────────────────────────────────────────────

const STRATEGY_FACTORIES: Record<string, () => Strategy> = {
  random:   () => new RandomStrategy(),
  greedy:   () => new GreedyCluesStrategy(),
  rush:     () => new RushStrategy(),
  balanced: () => new BalancedStrategy(),
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
