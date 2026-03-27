/**
 * Confrontation phase helpers.
 *
 * Contains:
 *  - initConfrontation — creates the initial ConfrontationState
 *  - Monster behavior profiles by type (for simulation + field reports)
 *  - Available action tables by intel level (for UI + simulation)
 *  - isConfrontationOver — win/loss/retreat check
 *
 * All functions are pure (no mutation). Actions.ts handles the mutable
 * per-round mechanics; these helpers provide the structural logic.
 */

import type {
  ActionType,
  ConfrontationState,
  ExploitOptionDef,
  IntelLevel,
  MonsterType,
  Mystery,
  Weakness,
} from './types'

// ─── Initialisation ───────────────────────────────────────────────────────────

/** Create the initial ConfrontationState from the active mystery. */
export function initConfrontation(
  mystery: Mystery,
  forcedByCountdown = false,
): ConfrontationState {
  return {
    intelLevel: mystery.intelLevel,
    history: [],
    currentRound: 1,
    monsterHarmTaken: 0,
    monsterMaxHarm: mystery.monster.maxHarm,
    monsterDefeated: false,
    huntersRetreated: false,
    forcedByCountdown,
    cluesFoundAtStart: [...mystery.cluesFound],
  }
}

// ─── Clue-based exploit options ──────────────────────────────────────────────

/**
 * Returns the exploit options whose clue prerequisites are all met.
 * If the weakness has no exploitOptions defined, returns empty array
 * (caller should fall back to the legacy intelLevel system).
 */
export function getAvailableExploitOptions(mystery: Mystery): ExploitOptionDef[] {
  const options = mystery.monster.weakness.exploitOptions
  if (!options || options.length === 0) return []

  const found = new Set(mystery.cluesFound)
  return options.filter((opt) => opt.requiredClueIds.every((id) => found.has(id)))
}

/** Look up a specific exploit option by ID. */
export function getExploitOptionById(
  weakness: Weakness,
  optionId: string,
): ExploitOptionDef | undefined {
  return weakness.exploitOptions?.find((o) => o.id === optionId)
}

// ─── Monster behavior profiles ────────────────────────────────────────────────

/**
 * Describes how a monster type behaves in confrontation.
 * Used by the simulation runner (Phase D) to model monster decision-making,
 * and by the field report generator for narrative flavour.
 */
export interface MonsterBehaviorProfile {
  /** Short keyword for simulation branching */
  style: 'aggressive' | 'consuming' | 'deceptive' | 'methodical' | 'area' | 'draining' | 'supernatural'
  /**
   * Does the monster counterattack on every action (not just on hunter misses)?
   * Aggressive types always press the attack.
   */
  alwaysCounterattacks: boolean
  /**
   * Harm multiplier when monster targets an already-injured hunter.
   * 1.0 = normal; torturer-types prefer injured targets.
   */
  injuredTargetMultiplier: number
  /**
   * Fraction of harm dealt to itself that the monster heals.
   * Devourers can feed off the conflict.
   */
  selfHealOnHitFraction: number
  /**
   * Penalty applied to hunter rolls when this monster type uses its
   * special ability (distract / trickster illusions / sorcerer weirdness).
   * Applied on monster's "active turn" during simulation.
   */
  specialRollPenalty: number
  /** Flavour tags used for field report generation */
  behaviourTags: string[]
}

const BEHAVIOR_PROFILES: Record<MonsterType, MonsterBehaviorProfile> = {
  beast: {
    style: 'aggressive',
    alwaysCounterattacks: true,
    injuredTargetMultiplier: 1.0,
    selfHealOnHitFraction: 0,
    specialRollPenalty: 0,
    behaviourTags: ['charges', 'relentless', 'primal'],
  },
  devourer: {
    style: 'consuming',
    alwaysCounterattacks: false,
    injuredTargetMultiplier: 1.5,
    selfHealOnHitFraction: 0.5,
    specialRollPenalty: 0,
    behaviourTags: ['drains', 'absorbs', 'feeds'],
  },
  trickster: {
    style: 'deceptive',
    alwaysCounterattacks: false,
    injuredTargetMultiplier: 1.0,
    selfHealOnHitFraction: 0,
    specialRollPenalty: 1,
    behaviourTags: ['illusions', 'misdirection', 'vanishes'],
  },
  torturer: {
    style: 'methodical',
    alwaysCounterattacks: false,
    injuredTargetMultiplier: 2.0,
    selfHealOnHitFraction: 0,
    specialRollPenalty: 0,
    behaviourTags: ['surgical', 'targeted', 'sadistic'],
  },
  destroyer: {
    style: 'area',
    alwaysCounterattacks: true,
    injuredTargetMultiplier: 1.0,
    selfHealOnHitFraction: 0,
    specialRollPenalty: 0,
    behaviourTags: ['area_harm', 'unstoppable', 'collateral'],
  },
  parasite: {
    style: 'draining',
    alwaysCounterattacks: false,
    injuredTargetMultiplier: 1.0,
    selfHealOnHitFraction: 0,
    specialRollPenalty: 1,
    behaviourTags: ['saps_luck', 'drains_stamina', 'latches_on'],
  },
  sorcerer: {
    style: 'supernatural',
    alwaysCounterattacks: false,
    injuredTargetMultiplier: 1.0,
    selfHealOnHitFraction: 0,
    specialRollPenalty: 2,
    behaviourTags: ['incorporeal', 'weird_harm', 'immune_physical'],
  },
}

/** Get the behavior profile for a given monster type. */
export function getMonsterBehaviorProfile(type: MonsterType): MonsterBehaviorProfile {
  return BEHAVIOR_PROFILES[type]
}

// ─── Available actions by intel level ─────────────────────────────────────────

/**
 * The set of confrontation action types available to hunters at each intel level.
 *
 * - blind: core actions only (no exploitWeakness — you don't know how to hurt it)
 * - partial+: exploitWeakness becomes available (at -1 modifier per exploitModifier())
 * - prepared: all actions + exploitWeakness at +1 modifier
 *
 * The engine never blocks based on this — it's used by the UI to show/hide
 * buttons and by the simulation to build legal move sets.
 */
const CONFRONTATION_ACTIONS_BY_INTEL: Record<IntelLevel, ActionType[]> = {
  blind: ['attack', 'defend', 'resist', 'distract', 'assess'],
  partial: ['attack', 'defend', 'resist', 'distract', 'assess', 'exploitWeakness'],
  informed: ['attack', 'defend', 'resist', 'distract', 'assess', 'exploitWeakness'],
  prepared: ['attack', 'defend', 'resist', 'distract', 'assess', 'exploitWeakness'],
}

/**
 * Returns the list of confrontation action types available at the given
 * intel level. Includes `spendLuck` which is always available post-roll.
 */
export function getAvailableConfrontationActions(intel: IntelLevel): ActionType[] {
  return [...CONFRONTATION_ACTIONS_BY_INTEL[intel], 'spendLuck']
}

// ─── Win / loss detection ─────────────────────────────────────────────────────

export type ConfrontationResult = 'ongoing' | 'win' | 'loss' | 'retreat'

/**
 * Determine the current confrontation result.
 *
 * - win: monster is defeated
 * - loss: all hunters are dead or incapacitated
 * - retreat: hunters explicitly retreated (flagged externally)
 * - ongoing: neither condition met
 */
export function getConfrontationResult(
  confrontation: ConfrontationState,
  hunters: Array<{ alive: boolean }>,
): ConfrontationResult {
  if (confrontation.monsterDefeated) return 'win'
  if (confrontation.huntersRetreated) return 'retreat'
  const allDown = hunters.every((h) => !h.alive)
  if (allDown) return 'loss'
  return 'ongoing'
}

// ─── Harm calculation helpers ─────────────────────────────────────────────────

/**
 * Calculate the effective harm a monster deals to a hunter, accounting for
 * the monster's armor value and any immunity (armor ≥ monster.harm → 0).
 * Raw monster harm comes from the MonsterDef; armor reduces it.
 */
export function effectiveMonsterHarm(monsterHarm: number, monsterArmor: number): number {
  return Math.max(0, monsterHarm - monsterArmor)
}
