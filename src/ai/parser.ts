import type { StatName } from '../engine/types'
import type { AIGMActionResponse, AIGMParseResult } from './types'

const VALID_STATS: StatName[] = ['charm', 'cool', 'sharp', 'tough', 'weird']
const MODIFIER_MIN = -3
const MODIFIER_MAX = 3

export interface ParseOpts {
  maxEntityHarm: number
  validCapabilityIds: string[]
}

/**
 * Parses and validates a raw AI JSON response string.
 *
 * Guardrail philosophy:
 * - Hard failures (invalid JSON, missing required fields, invalid stat) → valid: false → caller falls back to keywords
 * - Soft failures (out-of-range modifier, unknown capability ID, excessive harm) → clamp/filter, record in guardrailsTriggered, still return valid: true
 */
export function parseAIGMResponse(raw: string, opts: ParseOpts): AIGMParseResult {
  const guardrailsTriggered: string[] = []

  // Strip markdown code fences if the model wrapped output anyway
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()

  let parsed: Partial<AIGMActionResponse>
  try {
    parsed = JSON.parse(cleaned) as Partial<AIGMActionResponse>
  } catch {
    return { valid: false, errors: ['JSON parse failed'] }
  }

  // stat — hard failure if missing or invalid
  const stat = parsed.stat
  if (!stat || !VALID_STATS.includes(stat)) {
    return { valid: false, errors: [`Invalid stat: "${stat}"` ] }
  }

  // modifier — soft: clamp to [-3, +3]
  let modifier = typeof parsed.modifier === 'number' ? Math.round(parsed.modifier) : 0
  if (modifier < MODIFIER_MIN) {
    guardrailsTriggered.push(`modifier ${modifier} clamped to ${MODIFIER_MIN}`)
    modifier = MODIFIER_MIN
  } else if (modifier > MODIFIER_MAX) {
    guardrailsTriggered.push(`modifier ${modifier} clamped to ${MODIFIER_MAX}`)
    modifier = MODIFIER_MAX
  }

  // narrative — hard failure if any field missing
  const narrative = parsed.narrative
  if (!narrative?.success || !narrative?.mixed || !narrative?.miss) {
    return { valid: false, errors: ['Missing narrative.success/mixed/miss'] }
  }

  // entity harm — soft: clamp to [0, maxEntityHarm]
  const rawHarm = parsed.entity_response?.harm ?? 0
  const entityHarm = Math.min(Math.max(0, rawHarm), opts.maxEntityHarm)
  if (entityHarm !== rawHarm) {
    guardrailsTriggered.push(`entity harm ${rawHarm} clamped to ${entityHarm}`)
  }

  // capabilities_disabled — soft: filter to known IDs
  const rawDisabled = parsed.state_changes?.capabilities_disabled ?? []
  const capabilitiesDisabled = rawDisabled.filter((id) => {
    if (opts.validCapabilityIds.includes(id)) return true
    guardrailsTriggered.push(`unknown capability "${id}" ignored`)
    return false
  })

  return {
    valid: true,
    stat,
    modifier,
    narrative: {
      success: narrative.success,
      mixed: narrative.mixed,
      miss: narrative.miss,
    },
    capabilitiesDisabled,
    conditionsApplied: parsed.state_changes?.conditions_applied ?? [],
    entityResponseHarm: entityHarm,
    entityResponseTarget: parsed.entity_response?.target ?? 'all',
    guardrailsTriggered,
  }
}
