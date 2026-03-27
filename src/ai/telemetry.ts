/**
 * Builds FreeTextTelemetryEvent from keyword + AI results.
 * Called after every free-text action in confrontation.
 */

import type { ActionInterpretation, GameStateContext } from '../engine/types'
import type { AIGMResult, AIGMSource, FreeTextTelemetryEvent } from './types'

export interface FreeTextTelemetryOpts {
  aiResult?: AIGMResult | null
  aiLatencyMs?: number | null
  aiModel?: string
  source: AIGMSource
}

/**
 * Build a telemetry-ready event data object for a free-text action.
 * Callers emit this via `telemetry.emit(...)` with the full TelemetryEvent wrapper.
 */
export function buildFreeTextEventData(
  keyword: ActionInterpretation,
  opts: FreeTextTelemetryOpts,
): FreeTextTelemetryEvent['event_data'] {
  return {
    player_input: keyword.rawInput,
    tokens: keyword.tokens,
    // Layer 0 — always present
    keyword_stat: keyword.stat,
    keyword_modifier: keyword.modifier,
    keyword_clue_matches: keyword.matchedClues.map((c) => c.clueId),
    keyword_confidence: keyword.statConfidence === 'strong' ? 1 : keyword.statConfidence === 'moderate' ? 0.6 : 0.3,
    // Layer 2 — present when AI was called
    ai_enabled: !!opts.aiResult,
    ai_stat: opts.aiResult?.stat,
    ai_modifier: opts.aiResult?.modifier,
    ai_narrative: opts.aiResult?.narrative.success,
    ai_latency_ms: opts.aiLatencyMs ?? undefined,
    ai_model: opts.aiModel,
    ai_fell_back_to_keywords: opts.aiResult === null && opts.aiLatencyMs !== null,
    ai_guardrail_triggered: (opts.aiResult?.guardrailsTriggered.length ?? 0) > 0,
    // Final resolved values
    final_stat: opts.source === 'keyword' ? keyword.stat : (opts.aiResult?.stat ?? keyword.stat),
    final_modifier: opts.source === 'keyword' ? keyword.modifier : (opts.aiResult?.modifier ?? keyword.modifier),
    result_source: opts.source,
  }
}
