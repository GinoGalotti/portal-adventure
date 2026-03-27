import { describe, it, expect } from 'vitest'
import { parseAIGMResponse } from '../../src/ai/parser'

const OPTS = { maxEntityHarm: 4, validCapabilityIds: ['cap-flames', 'cap-wail'] }

const VALID_RESPONSE = {
  action_type: 'manipulate',
  stat: 'charm',
  stat_reasoning: 'Player is appealing emotionally to the entity.',
  clue_references: [],
  weakness_match: { rating: 2, reasoning: 'Directly addresses the grief anchor.' },
  modifier: 1,
  state_changes: { capabilities_disabled: [], conditions_applied: [], conditions_expired: [] },
  narrative: {
    success: 'The entity stills, grief giving way to release.',
    mixed: 'She hesitates — something almost reaches her.',
    miss: 'The entity recoils, flames surging.',
  },
  entity_response: { action: 'Eszter lashes out with flame.', harm: 2, target: 'all' },
}

describe('parseAIGMResponse', () => {
  it('parses a valid response', () => {
    const result = parseAIGMResponse(JSON.stringify(VALID_RESPONSE), OPTS)
    expect(result.valid).toBe(true)
    if (!result.valid) return
    expect(result.stat).toBe('charm')
    expect(result.modifier).toBe(1)
    expect(result.narrative.success).toContain('release')
    expect(result.entityResponseHarm).toBe(2)
    expect(result.guardrailsTriggered).toHaveLength(0)
  })

  it('returns valid: false on invalid JSON', () => {
    const result = parseAIGMResponse('not json at all', OPTS)
    expect(result.valid).toBe(false)
    if (result.valid) return
    expect(result.errors[0]).toContain('JSON parse failed')
  })

  it('returns valid: false on missing stat', () => {
    const bad = { ...VALID_RESPONSE, stat: undefined }
    const result = parseAIGMResponse(JSON.stringify(bad), OPTS)
    expect(result.valid).toBe(false)
  })

  it('returns valid: false on invalid stat value', () => {
    const bad = { ...VALID_RESPONSE, stat: 'strength' }
    const result = parseAIGMResponse(JSON.stringify(bad), OPTS)
    expect(result.valid).toBe(false)
    if (result.valid) return
    expect(result.errors[0]).toContain('strength')
  })

  it('clamps modifier above +3', () => {
    const raw = { ...VALID_RESPONSE, modifier: 5 }
    const result = parseAIGMResponse(JSON.stringify(raw), OPTS)
    expect(result.valid).toBe(true)
    if (!result.valid) return
    expect(result.modifier).toBe(3)
    expect(result.guardrailsTriggered).toContain('modifier 5 clamped to 3')
  })

  it('clamps modifier below -3', () => {
    const raw = { ...VALID_RESPONSE, modifier: -7 }
    const result = parseAIGMResponse(JSON.stringify(raw), OPTS)
    expect(result.valid).toBe(true)
    if (!result.valid) return
    expect(result.modifier).toBe(-3)
    expect(result.guardrailsTriggered[0]).toContain('-7')
  })

  it('clamps entity harm above maxEntityHarm', () => {
    const raw = {
      ...VALID_RESPONSE,
      entity_response: { ...VALID_RESPONSE.entity_response, harm: 99 },
    }
    const result = parseAIGMResponse(JSON.stringify(raw), OPTS)
    expect(result.valid).toBe(true)
    if (!result.valid) return
    expect(result.entityResponseHarm).toBe(4)
    expect(result.guardrailsTriggered[0]).toContain('clamped to 4')
  })

  it('filters unknown capability IDs', () => {
    const raw = {
      ...VALID_RESPONSE,
      state_changes: {
        ...VALID_RESPONSE.state_changes,
        capabilities_disabled: ['cap-flames', 'cap-fake'],
      },
    }
    const result = parseAIGMResponse(JSON.stringify(raw), OPTS)
    expect(result.valid).toBe(true)
    if (!result.valid) return
    expect(result.capabilitiesDisabled).toEqual(['cap-flames'])
    expect(result.guardrailsTriggered.some((g) => g.includes('cap-fake'))).toBe(true)
  })

  it('strips markdown code fences before parsing', () => {
    const wrapped = `\`\`\`json\n${JSON.stringify(VALID_RESPONSE)}\n\`\`\``
    const result = parseAIGMResponse(wrapped, OPTS)
    expect(result.valid).toBe(true)
  })

  it('returns valid: false when narrative fields are missing', () => {
    const bad = { ...VALID_RESPONSE, narrative: { success: 'ok', mixed: '', miss: '' } }
    const result = parseAIGMResponse(JSON.stringify(bad), OPTS)
    expect(result.valid).toBe(false)
  })

  it('defaults modifier to 0 when missing', () => {
    const raw = { ...VALID_RESPONSE }
    delete (raw as Record<string, unknown>).modifier
    const result = parseAIGMResponse(JSON.stringify(raw), OPTS)
    expect(result.valid).toBe(true)
    if (!result.valid) return
    expect(result.modifier).toBe(0)
  })

  it('defaults entity target to "all" when missing', () => {
    const raw = {
      ...VALID_RESPONSE,
      entity_response: { action: 'Flames surge.', harm: 1 },
    }
    const result = parseAIGMResponse(JSON.stringify(raw), OPTS)
    expect(result.valid).toBe(true)
    if (!result.valid) return
    expect(result.entityResponseTarget).toBe('all')
  })

  it('accepts all valid stat values', () => {
    for (const stat of ['charm', 'cool', 'sharp', 'tough', 'weird'] as const) {
      const raw = { ...VALID_RESPONSE, stat }
      const result = parseAIGMResponse(JSON.stringify(raw), OPTS)
      expect(result.valid).toBe(true)
      if (!result.valid) continue
      expect(result.stat).toBe(stat)
    }
  })
})
