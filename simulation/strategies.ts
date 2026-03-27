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
import { getAvailableExploitOptions } from '../src/engine/confrontation'
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

/**
 * Returns true if at least one alive hunter has a net score >= 0 against at least
 * one currently-unlocked exploit option. A score < 0 means the expected harm to
 * the hunter per exploit turn exceeds the benefit — confrontation would be suicidal.
 */
function hasViableExploit(state: GameState, mystery: { monster: { weakness: { statRequired?: StatName; exploitOptions?: Array<{ modifier?: number; statRequired?: StatName }> } }; cluesFound: string[] }, available: Array<{ modifier?: number; statRequired?: StatName }>): boolean {
  const weaknessStat: StatName = mystery.monster.weakness.statRequired ?? 'tough'
  for (const opt of available) {
    const stat: StatName = opt.statRequired ?? weaknessStat
    for (const hunter of state.team.hunters) {
      if (!hunter.alive) continue
      const score = (opt.modifier ?? 0) + (hunter.stats[stat] ?? 0)
      if (score >= 0) return true
    }
  }
  return false
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
    // Never let the fallback accidentally trigger early confrontation
    const nonConfront = validActions.filter((a) => a.type !== 'startConfrontation')

    // Only take investigate/interview when there's an undiscovered clue of that action type
    // at the current location. Avoids wasting 2-3 clock ticks on actions that can't find clues
    // (e.g. Rosa investigating student-dorms which only has interview clues).
    if (mystery?.currentLocationId) {
      const currentLoc = mystery.locations.find((l) => l.id === mystery.currentLocationId)
      const effectiveTypes = new Set(
        currentLoc?.clues.filter((c) => !c.found).map((c) => c.requiresAction) ?? []
      )
      const effective = nonConfront.filter(
        (a) => ['investigate', 'interview'].includes(a.type) && effectiveTypes.has(a.type)
      )
      if (effective.length > 0) {
        const scored = effective.map((a) => {
          const hunterId = a.payload.hunterId as string
          const stat: StatName = a.type === 'investigate' ? 'sharp' : 'charm'
          return { action: a, score: statValue(state, hunterId, stat) }
        })
        scored.sort((x, y) => y.score - x.score)
        return scored[0].action
      }

      // Deep search only when current location has undiscovered deepSearch clues
      const deepSearches = nonConfront.filter((a) => a.type === 'deepSearch')
      if (deepSearches.length > 0 && effectiveTypes.has('deepSearch')) {
        return deepSearches.reduce((best, a) =>
          statValue(state, a.payload.hunterId as string, 'sharp')
            > statValue(state, best.payload.hunterId as string, 'sharp') ? a : best
        )
      }
    }

    // Travel to location with most undiscovered clues
    const travels = nonConfront.filter((a) => a.type === 'travel')
    if (travels.length > 0) {
      return travels.reduce((best, a) => {
        const count = undiscoveredClueCount(state, a.payload.locationId as string)
        const bestCount = undiscoveredClueCount(state, best.payload.locationId as string)
        return count > bestCount ? a : best
      })
    }

    return randomPick(nonConfront.length > 0 ? nonConfront : validActions)
  }

  private _confrontation(state: GameState, validActions: ActionEntry[]): ActionEntry {
    const mystery = state.mystery

    // exploitWeakness only when the best available score is viable (≥ 0 = at least 2d6+0)
    // Negative-score exploits (e.g. charm=-1 + mod=-2 = -3) are near-certain misses that
    // deal 3 harm to the hunter per attempt — worse than defending.
    const exploits = validActions.filter((a) => a.type === 'exploitWeakness')
    if (exploits.length > 0 && mystery) {
      const options = mystery.monster.weakness.exploitOptions
      if (options && options.length > 0) {
        const weaknessStat: StatName = mystery.monster.weakness.statRequired ?? 'tough'
        const scored = exploits.map((a) => {
          const opt = options.find((o) => o.id === a.payload.exploitOptionId)
          const stat: StatName = opt?.statRequired ?? weaknessStat
          return {
            action: a,
            score: (opt?.modifier ?? 0) + statValue(state, a.payload.hunterId as string, stat),
          }
        })
        scored.sort((x, y) => y.score - x.score)
        if (scored[0].score >= 0) return scored[0].action
        // Best exploit score < 0 — too risky, fall through to defend
      } else {
        // Legacy: pick hunter with best weakness stat, only if total roll is viable
        const weaknessStat: StatName = mystery.monster.weakness.statRequired ?? 'tough'
        const legacyMod: Record<string, number> = { blind: -99, partial: -1, informed: 0, prepared: 1 }
        const best = exploits.reduce((best, a) =>
          statValue(state, a.payload.hunterId as string, weaknessStat)
            > statValue(state, best.payload.hunterId as string, weaknessStat) ? a : best
        )
        const totalScore = (legacyMod[mystery.intelLevel] ?? 0)
          + statValue(state, best.payload.hunterId as string, weaknessStat)
        if (totalScore >= 0) return best
      }
    }

    // No viable exploit: use 0-harm actions to survive and clear exploit cooldown.
    // distract (charm) and assess (sharp) deal 0 harm on all outcomes.
    // resist (cool) deals 1 harm only on miss — far better than defend's 2.
    // Boost score for hunters on exploit cooldown so they clear it 1 turn faster,
    // enabling more exploit turns overall. Pattern: exploit → distract → exploit → ...
    const conf = state.confrontation!
    const lowHarmTypes = ['distract', 'assess', 'resist'] as const
    const lowHarm = validActions.filter((a) => lowHarmTypes.includes(a.type as (typeof lowHarmTypes)[number]))
    if (lowHarm.length > 0) {
      const scored = lowHarm.map((a) => {
        const hunterId = a.payload.hunterId as string
        const hunterHistory = conf.history.filter((ca) => ca.hunterId === hunterId)
        const onCooldown = hunterHistory[hunterHistory.length - 1]?.actionType === 'exploitWeakness'
        const stat: StatName = a.type === 'distract' ? 'charm' : a.type === 'assess' ? 'sharp' : 'cool'
        return { action: a, score: (onCooldown ? 10 : 0) + statValue(state, hunterId, stat) }
      })
      scored.sort((x, y) => y.score - x.score)
      return scored[0].action
    }

    // defend/attack as absolute last resort (should not be reached in normal play)
    const defends = validActions.filter((a) => a.type === 'defend')
    if (defends.length > 0) {
      return defends.reduce((best, a) => {
        const h = state.team.hunters.find((h) => h.id === (a.payload.hunterId as string))!
        const bh = state.team.hunters.find((h) => h.id === (best.payload.hunterId as string))!
        return h.harm < bh.harm ? a : best
      })
    }

    return randomPick(validActions)
  }

  shouldSpendLuck(state: GameState, roll: { outcome: string }): boolean {
    if (roll.outcome !== 'miss') return false
    // In investigation: spending luck on a miss reverses the clock penalty and
    // re-attempts clue discovery. Always beneficial — saves 2 clock and finds clues.
    if (state.phase === 'investigation') return true
    // In confrontation: the engine does not reverse harm for exploitWeakness, distract,
    // or assess when luck is spent. Only 'attack' has partial re-resolution.
    // Spending luck elsewhere wastes a permanent resource for no gameplay benefit.
    return false
  }

  shouldConfront(state: GameState): boolean {
    const mystery = state.mystery
    if (!mystery) return false
    const clockFraction = mystery.countdown.clockValue / mystery.countdown.clockConfig.disasterAt
    const hasExploitOptions = (mystery.monster.weakness.exploitOptions?.length ?? 0) > 0
    if (hasExploitOptions) {
      const available = getAvailableExploitOptions(mystery)
      // Confront immediately when a mod >= 0 exploit is unlocked — worthwhile odds.
      // mod < 0 exploits (e.g. 2d6+1) have 28% miss rate and 3 harm per miss,
      // making them too risky without better intel. Keep investigating instead.
      if (available.some((opt) => (opt.modifier ?? 0) >= 0)) return true
      // No good exploit yet: wait until near disaster to maximise investigation time.
      return clockFraction >= 0.93
    }
    return intelRank(mystery.intelLevel) >= 1 || clockFraction >= 0.6
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
    // Never let the fallback accidentally trigger early confrontation
    const nonConfront = validActions.filter((a) => a.type !== 'startConfrontation')

    // Heal a seriously-injured hunter first
    const restActions = nonConfront.filter((a) => a.type === 'rest')
    const criticalRest = restActions.find((a) => {
      const h = state.team.hunters.find((h) => h.id === (a.payload.hunterId as string))
      return h && h.harm >= 5
    })
    if (criticalRest) return criticalRest

    // Only take investigate/interview when there's an undiscovered clue of that action type
    if (mystery?.currentLocationId) {
      const currentLoc = mystery.locations.find((l) => l.id === mystery.currentLocationId)
      const effectiveTypes = new Set(
        currentLoc?.clues.filter((c) => !c.found).map((c) => c.requiresAction) ?? []
      )
      const effective = nonConfront.filter(
        (a) => ['investigate', 'interview'].includes(a.type) && effectiveTypes.has(a.type)
      )
      if (effective.length > 0) {
        const scored = effective.map((a) => {
          const hunterId = a.payload.hunterId as string
          const stat: StatName = a.type === 'investigate' ? 'sharp' : 'charm'
          return { action: a, score: statValue(state, hunterId, stat) }
        })
        scored.sort((x, y) => y.score - x.score)
        return scored[0].action
      }

      // Deep search if current location has undiscovered deepSearch clues
      const deepSearches = nonConfront.filter((a) => a.type === 'deepSearch')
      if (deepSearches.length > 0 && effectiveTypes.has('deepSearch')) {
        return deepSearches[0]
      }
    }

    // Travel: prefer unvisited, then by clue richness
    const travels = nonConfront.filter((a) => a.type === 'travel')
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

    return randomPick(nonConfront.length > 0 ? nonConfront : validActions)
  }

  private _confrontation(state: GameState, validActions: ActionEntry[]): ActionEntry {
    const mystery = state.mystery

    // Exploit weakness only when best available score is viable (≥ 0)
    const exploits = validActions.filter((a) => a.type === 'exploitWeakness')
    if (exploits.length > 0 && mystery) {
      const options = mystery.monster.weakness.exploitOptions
      if (options && options.length > 0) {
        const weaknessStat: StatName = mystery.monster.weakness.statRequired ?? 'tough'
        const scored = exploits.map((a) => {
          const opt = options.find((o) => o.id === a.payload.exploitOptionId)
          const stat: StatName = opt?.statRequired ?? weaknessStat
          return {
            action: a,
            score: (opt?.modifier ?? 0) + statValue(state, a.payload.hunterId as string, stat),
          }
        })
        scored.sort((x, y) => y.score - x.score)
        if (scored[0].score >= 0) return scored[0].action
        // Best score < 0 — fall through to defend
      } else if (intelRank(mystery.intelLevel) >= 1) {
        // Legacy: pick hunter with best weakness stat if total is viable
        const weaknessStat: StatName = mystery.monster.weakness.statRequired ?? 'tough'
        const legacyMod: Record<string, number> = { blind: -99, partial: -1, informed: 0, prepared: 1 }
        const best = exploits.reduce((best, a) =>
          statValue(state, a.payload.hunterId as string, weaknessStat)
            > statValue(state, best.payload.hunterId as string, weaknessStat) ? a : best
        )
        const totalScore = (legacyMod[mystery.intelLevel] ?? 0)
          + statValue(state, best.payload.hunterId as string, weaknessStat)
        if (totalScore >= 0) return best
      }
    }

    // No viable exploit: use 0-harm actions to survive and clear exploit cooldown.
    // distract (charm) and assess (sharp) deal 0 harm on all outcomes.
    // resist (cool) deals 1 harm only on miss — far better than defend's 2.
    // Boost score for hunters on exploit cooldown so they clear it 1 turn faster,
    // enabling more exploit turns overall. Pattern: exploit → distract → exploit → ...
    const conf = state.confrontation!
    const lowHarmTypes = ['distract', 'assess', 'resist'] as const
    const lowHarm = validActions.filter((a) => lowHarmTypes.includes(a.type as (typeof lowHarmTypes)[number]))
    if (lowHarm.length > 0) {
      const scored = lowHarm.map((a) => {
        const hunterId = a.payload.hunterId as string
        const hunterHistory = conf.history.filter((ca) => ca.hunterId === hunterId)
        const onCooldown = hunterHistory[hunterHistory.length - 1]?.actionType === 'exploitWeakness'
        const stat: StatName = a.type === 'distract' ? 'charm' : a.type === 'assess' ? 'sharp' : 'cool'
        return { action: a, score: (onCooldown ? 10 : 0) + statValue(state, hunterId, stat) }
      })
      scored.sort((x, y) => y.score - x.score)
      return scored[0].action
    }

    // defend as absolute last resort
    const defends = validActions.filter((a) => a.type === 'defend')
    if (defends.length > 0) {
      return defends.reduce((best, a) => {
        const h = state.team.hunters.find((h) => h.id === (a.payload.hunterId as string))!
        const bh = state.team.hunters.find((h) => h.id === (best.payload.hunterId as string))!
        return h.harm < bh.harm ? a : best
      })
    }

    return randomPick(validActions)
  }

  shouldSpendLuck(state: GameState, roll: { outcome: string }): boolean {
    if (roll.outcome !== 'miss') return false
    // In investigation: spending luck on a miss reverses the clock penalty and
    // re-attempts clue discovery. Always beneficial — saves 2 clock and finds clues.
    if (state.phase === 'investigation') return true
    // In confrontation: only 'attack' has partial re-resolution in the engine.
    // Spending luck on exploitWeakness/distract/assess misses wastes a permanent resource.
    return false
  }

  shouldConfront(state: GameState): boolean {
    const mystery = state.mystery
    if (!mystery) return false
    const clockFraction = mystery.countdown.clockValue / mystery.countdown.clockConfig.disasterAt
    const hasExploitOptions = (mystery.monster.weakness.exploitOptions?.length ?? 0) > 0
    if (hasExploitOptions) {
      const available = getAvailableExploitOptions(mystery)
      // Confront when intel is at least partial AND there's a viable exploit
      // (net hunter score >= 0). A typical player won't wait for the perfect
      // exploit — they'll engage when they know enough.
      if (available.length > 0 && hasViableExploit(state, mystery, available)) {
        return intelRank(mystery.intelLevel) >= 1
      }
      // No viable exploit yet: investigate longer, fall back at 70% clock.
      return clockFraction >= 0.7
    }
    return intelRank(mystery.intelLevel) >= 1 || clockFraction >= 0.6
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
    const nonConfront = validActions.filter((a) => a.type !== 'startConfrontation')

    // Heal critically hurt hunters first
    const criticalRest = nonConfront
      .filter((a) => a.type === 'rest')
      .find((a) => {
        const h = state.team.hunters.find((h) => h.id === (a.payload.hunterId as string))
        return h && h.harm >= 5
      })
    if (criticalRest) return criticalRest

    // Scene actions: best stat match (only effective clues at current location)
    if (mystery?.currentLocationId) {
      const currentLoc = mystery.locations.find((l) => l.id === mystery.currentLocationId)
      const effectiveTypes = new Set(
        currentLoc?.clues.filter((c) => !c.found).map((c) => c.requiresAction) ?? []
      )
      const effective = nonConfront.filter(
        (a) => ['investigate', 'interview'].includes(a.type) && effectiveTypes.has(a.type)
      )
      if (effective.length > 0) {
        const scored = effective.map((a) => {
          const hunterId = a.payload.hunterId as string
          const actionStat: StatName = a.type === 'investigate' ? 'sharp' : 'charm'
          return { action: a, score: statValue(state, hunterId, actionStat) }
        })
        scored.sort((x, y) => y.score - x.score)
        return scored[0].action
      }
    }

    // Travel: prefer unvisited, then by clue richness
    const travels = nonConfront.filter((a) => a.type === 'travel')
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

    return randomPick(nonConfront.length > 0 ? nonConfront : validActions)
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

    // All hunters on cooldown: use 0-harm actions to survive until next exploit turn.
    // distract (charm) and assess (sharp) deal 0 harm on all outcomes.
    // resist (cool) deals 1 harm only on miss. Boost score for hunters on cooldown.
    if (conf) {
      const lowHarmTypes = ['distract', 'assess', 'resist'] as const
      const lowHarm = validActions.filter((a) => lowHarmTypes.includes(a.type as (typeof lowHarmTypes)[number]))
      if (lowHarm.length > 0) {
        const scored = lowHarm.map((a) => {
          const hunterId = a.payload.hunterId as string
          const hunterHistory = conf.history.filter((ca) => ca.hunterId === hunterId)
          const onCooldown = hunterHistory[hunterHistory.length - 1]?.actionType === 'exploitWeakness'
          const stat: StatName = a.type === 'distract' ? 'charm' : a.type === 'assess' ? 'sharp' : 'cool'
          return { action: a, score: (onCooldown ? 10 : 0) + statValue(state, hunterId, stat) }
        })
        scored.sort((x, y) => y.score - x.score)
        return scored[0].action
      }
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
