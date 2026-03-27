import { describe, it, expect } from 'vitest'
import { buildFreeTextEventData } from '../../src/ai/telemetry'
import type { ActionInterpretation } from '../../src/engine/types'
import type { AIGMResult } from '../../src/ai/types'

const KEYWORD_RESULT: ActionInterpretation = {
  rawInput: 'show the locket to eszter',
  tokens: ['show', 'locket', 'eszter'],
  matchedClues: [{ clueId: 'clue-locket', matchedKeywords: ['locket'], score: 1 }],
  stat: 'charm',
  statConfidence: 'strong',
  modifier: 1,
  exploitId: 'ft-anchor',
  weaknessAlignment: 'direct',
  successHarm: 'maxHarm',
  narrativeResult: 'The locket glows.',
  source: 'keyword',
}

describe('buildFreeTextEventData', () => {
  it('builds keyword-only event data', () => {
    const data = buildFreeTextEventData(KEYWORD_RESULT, {
      source: 'keyword',
    })

    expect(data.player_input).toBe('show the locket to eszter')
    expect(data.tokens).toEqual(['show', 'locket', 'eszter'])
    expect(data.keyword_stat).toBe('charm')
    expect(data.keyword_modifier).toBe(1)
    expect(data.keyword_clue_matches).toEqual(['clue-locket'])
    expect(data.keyword_confidence).toBe(1)
    expect(data.ai_enabled).toBe(false)
    expect(data.final_stat).toBe('charm')
    expect(data.final_modifier).toBe(1)
    expect(data.result_source).toBe('keyword')
  })

  it('builds AI-enhanced event data', () => {
    const aiResult: AIGMResult = {
      valid: true,
      stat: 'charm',
      modifier: 2,
      narrative: { success: 'Fire dims.', mixed: 'Flickers.', miss: 'Burns brighter.' },
      capabilitiesDisabled: [],
      conditionsApplied: [],
      entityResponseHarm: 1,
      entityResponseTarget: 'Rosa',
      guardrailsTriggered: [],
    }

    const data = buildFreeTextEventData(KEYWORD_RESULT, {
      aiResult,
      aiLatencyMs: 340,
      aiModel: 'llama-3.1-8b-instant',
      source: 'ai',
    })

    expect(data.ai_enabled).toBe(true)
    expect(data.ai_stat).toBe('charm')
    expect(data.ai_modifier).toBe(2)
    expect(data.ai_narrative).toBe('Fire dims.')
    expect(data.ai_latency_ms).toBe(340)
    expect(data.ai_model).toBe('llama-3.1-8b-instant')
    expect(data.ai_fell_back_to_keywords).toBe(false)
    expect(data.ai_guardrail_triggered).toBe(false)
    expect(data.final_stat).toBe('charm')
    expect(data.final_modifier).toBe(2)
    expect(data.result_source).toBe('ai')
  })

  it('records fallback when AI returns null', () => {
    const data = buildFreeTextEventData(KEYWORD_RESULT, {
      aiResult: null,
      aiLatencyMs: 10500,
      source: 'keyword',
    })

    expect(data.ai_enabled).toBe(false)
    expect(data.ai_fell_back_to_keywords).toBe(true)
    expect(data.final_stat).toBe('charm')
    expect(data.final_modifier).toBe(1)
    expect(data.result_source).toBe('keyword')
  })

  it('records guardrail triggers', () => {
    const aiResult: AIGMResult = {
      valid: true,
      stat: 'tough',
      modifier: 3,
      narrative: { success: 's', mixed: 'm', miss: 'x' },
      capabilitiesDisabled: [],
      conditionsApplied: [],
      entityResponseHarm: 0,
      entityResponseTarget: 'all',
      guardrailsTriggered: ['modifier_clamped'],
    }

    const data = buildFreeTextEventData(KEYWORD_RESULT, {
      aiResult,
      source: 'ai',
    })

    expect(data.ai_guardrail_triggered).toBe(true)
  })

  it('maps confidence levels to numeric values', () => {
    const strong = buildFreeTextEventData(
      { ...KEYWORD_RESULT, statConfidence: 'strong' },
      { source: 'keyword' },
    )
    const moderate = buildFreeTextEventData(
      { ...KEYWORD_RESULT, statConfidence: 'moderate' },
      { source: 'keyword' },
    )
    const weak = buildFreeTextEventData(
      { ...KEYWORD_RESULT, statConfidence: 'weak' },
      { source: 'keyword' },
    )

    expect(strong.keyword_confidence).toBe(1)
    expect(moderate.keyword_confidence).toBe(0.6)
    expect(weak.keyword_confidence).toBe(0.3)
  })
})
