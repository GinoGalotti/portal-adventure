/**
 * Hunter creation, stat calculations, and state mutation helpers.
 * All functions are pure — they return new objects and never mutate inputs.
 */

import {
  Hunter,
  Playbook,
  HunterCondition,
  PlaybookStats,
  StatName,
  conditionFromHarm,
} from './types'

// ─── Hunter Creation ──────────────────────────────────────────────────────────

/**
 * Create a fresh Hunter instance from a Playbook definition.
 * Called when deploying a hunter at the start of a mystery.
 */
export function createHunter(
  playbook: Playbook,
  id: string,
  name: string,
  selectedGearIndices?: number[],
): Hunter {
  const gear: string[] = []

  // Pick one gear item from each gear-option group
  playbook.gearOptions.forEach((group, groupIdx) => {
    const idx = selectedGearIndices?.[groupIdx] ?? 0
    const item = group[Math.max(0, Math.min(idx, group.length - 1))]
    if (item) gear.push(item.id)
  })

  return {
    id,
    name,
    playbookId: playbook.id,
    stats: { ...playbook.baseStats },
    harm: 0,
    luck: 7,
    maxLuck: 7,
    experience: 0,
    experienceThreshold: 5,
    conditions: ['healthy'],
    bonds: [],
    assistChargesRemaining: playbook.bondCapacity,
    sceneActionsRemaining: 2,
    maxSceneActions: 2,
    gear,
    alive: true,
  }
}

/**
 * Create a Hunter directly from raw stat values (useful for testing and
 * headless simulation without full Playbook objects).
 */
export function createHunterFromStats(opts: {
  id: string
  name: string
  playbookId: string
  stats: PlaybookStats
  luck?: number
  bondCapacity?: number
  gear?: string[]
}): Hunter {
  return {
    id: opts.id,
    name: opts.name,
    playbookId: opts.playbookId,
    stats: { ...opts.stats },
    harm: 0,
    luck: opts.luck ?? 7,
    maxLuck: 7,
    experience: 0,
    experienceThreshold: 5,
    conditions: ['healthy'],
    bonds: [],
    assistChargesRemaining: opts.bondCapacity ?? 3,
    sceneActionsRemaining: 2,
    maxSceneActions: 2,
    gear: opts.gear ?? [],
    alive: true,
  }
}

// ─── Harm & Condition ─────────────────────────────────────────────────────────

/**
 * Apply harm to a hunter and return the updated hunter.
 * Automatically sets the correct condition(s) and marks the hunter dead if
 * harm reaches 7.
 */
export function applyHarm(hunter: Hunter, amount: number): Hunter {
  if (!hunter.alive) return hunter // dead hunters don't take more harm

  const newHarm = Math.min(7, hunter.harm + amount)
  return updateHunterConditions({
    ...hunter,
    harm: newHarm,
    alive: newHarm < 7,
  })
}

/**
 * Set a hunter's harm to an exact value.
 * Used by debug commands and test helpers.
 */
export function setHarm(hunter: Hunter, harm: number): Hunter {
  const clamped = Math.max(0, Math.min(7, harm))
  return updateHunterConditions({
    ...hunter,
    harm: clamped,
    alive: clamped < 7,
  })
}

/**
 * Heal a hunter by reducing harm. Harm cannot go below 0.
 * Healed conditions are automatically updated.
 */
export function healHarm(hunter: Hunter, amount: number): Hunter {
  const newHarm = Math.max(0, hunter.harm - amount)
  return updateHunterConditions({ ...hunter, harm: newHarm })
}

/**
 * Recalculate the hunter's condition list from current harm.
 * Preserves non-harm conditions (traumatized, critical).
 */
function updateHunterConditions(hunter: Hunter): Hunter {
  const harmCondition = conditionFromHarm(hunter.harm)

  // Filter out the harm-derived conditions and replace with the new one
  const nonHarmConditions = hunter.conditions.filter(
    (c): c is HunterCondition =>
      c !== 'healthy' &&
      c !== 'injured' &&
      c !== 'seriouslyInjured' &&
      c !== 'dead',
  )

  const conditions: HunterCondition[] = harmCondition === 'healthy'
    ? nonHarmConditions.length > 0 ? nonHarmConditions : ['healthy']
    : [harmCondition, ...nonHarmConditions]

  return { ...hunter, conditions }
}

// ─── Luck ─────────────────────────────────────────────────────────────────────

/**
 * Attempt to spend one luck point.
 * Returns { hunter, success } — success is false when luck is already 0.
 * Luck is a permanent resource and never regenerates.
 */
export function spendLuck(hunter: Hunter): { hunter: Hunter; success: boolean } {
  if (hunter.luck <= 0) {
    return { hunter, success: false }
  }
  return {
    hunter: { ...hunter, luck: hunter.luck - 1 },
    success: true,
  }
}

/**
 * Set a hunter's luck to an exact value (debug command).
 */
export function setLuck(hunter: Hunter, luck: number): Hunter {
  return { ...hunter, luck: Math.max(0, Math.min(hunter.maxLuck, luck)) }
}

// ─── Experience ───────────────────────────────────────────────────────────────

/**
 * Award experience to a hunter (called on failed rolls per MotW-style rules).
 * Returns the updated hunter — does not advance automatically.
 */
export function gainExperience(hunter: Hunter, amount = 1): Hunter {
  return { ...hunter, experience: hunter.experience + amount }
}

/**
 * Check whether the hunter is ready to advance (experience ≥ threshold).
 */
export function canAdvance(hunter: Hunter): boolean {
  return hunter.experience >= hunter.experienceThreshold
}

// ─── Action Economy ───────────────────────────────────────────────────────────

/**
 * Consume one scene action from a hunter.
 * Throws if no actions remain.
 */
export function consumeSceneAction(hunter: Hunter): Hunter {
  if (hunter.sceneActionsRemaining <= 0) {
    throw new Error(`Hunter ${hunter.id} has no scene actions remaining`)
  }
  return { ...hunter, sceneActionsRemaining: hunter.sceneActionsRemaining - 1 }
}

/**
 * Reset scene actions to the hunter's max (called on location change).
 */
export function resetSceneActions(hunter: Hunter): Hunter {
  return { ...hunter, sceneActionsRemaining: hunter.maxSceneActions }
}

/**
 * Consume one assist charge.
 * Returns { hunter, success } — success is false when charges are exhausted.
 */
export function consumeAssistCharge(hunter: Hunter): { hunter: Hunter; success: boolean } {
  if (hunter.assistChargesRemaining <= 0) {
    return { hunter, success: false }
  }
  return {
    hunter: { ...hunter, assistChargesRemaining: hunter.assistChargesRemaining - 1 },
    success: true,
  }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Return true if the hunter is in a deployable state */
export function canDeploy(hunter: Hunter): boolean {
  if (!hunter.alive) return false
  if (hunter.conditions.includes('dead')) return false
  if (hunter.conditions.includes('traumatized')) return false
  if (hunter.conditions.includes('seriouslyInjured')) return false
  return true
}

/** Get the primary condition (first in the conditions array) */
export function primaryCondition(hunter: Hunter): HunterCondition {
  return hunter.conditions[0] ?? 'healthy'
}

/** Get a stat value by name */
export function getStat(hunter: Hunter, stat: StatName): number {
  return hunter.stats[stat]
}

/** Return true if the hunter has at least one scene action remaining */
export function hasSceneAction(hunter: Hunter): boolean {
  return hunter.sceneActionsRemaining > 0 && hunter.alive
}

/** Return true if the hunter has at least one assist charge remaining */
export function hasAssistCharge(hunter: Hunter): boolean {
  return hunter.assistChargesRemaining > 0 && hunter.alive
}
