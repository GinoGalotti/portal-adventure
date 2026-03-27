/**
 * AI-enhanced free-text interpretation — Layer 2.
 *
 * Wraps the keyword engine (Layer 0) with an optional AI GM call.
 * Keyword result always runs first. If AI is enabled and succeeds,
 * results are merged. On any AI failure, keyword result is returned silently.
 */

import type { ActionInterpretation, StatName, MonsterDef, Hunter, ClueDef } from '../engine/types'
import type { InterpretActionInput } from '../engine/free-text/pipeline'
import type { AIGMContext, AIGMResult, AIGMSource } from './types'
import { interpretAction } from '../engine/free-text/pipeline'
import { AIGMClient } from './client'
import {
  buildEntitySummary,
  buildHunterSummary,
  buildClueSummary,
  buildTurnHistory,
} from './prompts/confrontation-gm'

// ─── Confrontation Context (accumulated per-turn state for AI prompts) ───────

export interface ConfrontationTurnRecord {
  hunterName: string
  input: string
  outcome: string
}

export interface ConfrontationContext {
  turns: ConfrontationTurnRecord[]
  disabledCapabilityIds: string[]
  activeConditions: string[]
}

export function createConfrontationContext(): ConfrontationContext {
  return {
    turns: [],
    disabledCapabilityIds: [],
    activeConditions: [],
  }
}

export function addTurnToContext(
  ctx: ConfrontationContext,
  turn: ConfrontationTurnRecord,
  aiResult?: AIGMResult | null,
): ConfrontationContext {
  const next: ConfrontationContext = {
    turns: [...ctx.turns, turn],
    disabledCapabilityIds: [...ctx.disabledCapabilityIds],
    activeConditions: [...ctx.activeConditions],
  }

  if (aiResult && aiResult.valid) {
    // Accumulate disabled capabilities from AI state_changes
    for (const capId of aiResult.capabilitiesDisabled) {
      if (!next.disabledCapabilityIds.includes(capId)) {
        next.disabledCapabilityIds.push(capId)
      }
    }
    // Apply new conditions, remove expired ones
    for (const cond of aiResult.conditionsApplied) {
      if (!next.activeConditions.includes(cond)) {
        next.activeConditions.push(cond)
      }
    }
  }

  return next
}

// ─── AI-enhanced interpretation ──────────────────────────────────────────────

export interface InterpretWithAIInput extends InterpretActionInput {
  /** AI client instance — null/undefined means AI disabled */
  aiClient?: AIGMClient | null
  /** Accumulated confrontation context for turn history */
  confrontationContext?: ConfrontationContext
  /** Monster definition — needed for AI entity summary */
  monster: MonsterDef
  /** Active hunters — needed for AI hunter summary */
  hunters: Hunter[]
  /** Clues the player has found (full defs, not just IDs) */
  foundClues: ClueDef[]
  /** Number of clues not yet found — for AI hint about hidden info */
  unfoundClueCount: number
}

export interface InterpretWithAIResult {
  interpretation: ActionInterpretation
  aiResult: AIGMResult | null
  aiLatencyMs: number | null
  source: AIGMSource
}

/**
 * Interpret player free-text input with keyword engine + optional AI enhancement.
 *
 * 1. Keyword engine (Layer 0) always runs first — instant, free, offline.
 * 2. If aiClient is provided, calls AI GM in parallel-ish fashion.
 * 3. If AI succeeds, merges results (AI stat/modifier/narrative override keywords).
 * 4. If AI fails (network, timeout, parse error), silently returns keyword result.
 */
export async function interpretActionWithAI(
  opts: InterpretWithAIInput,
): Promise<InterpretWithAIResult> {
  // Layer 0: keyword engine — always runs
  const keywordResult = interpretAction(opts)

  if (!opts.aiClient) {
    return {
      interpretation: keywordResult,
      aiResult: null,
      aiLatencyMs: null,
      source: 'keyword',
    }
  }

  // Build AI context from game state
  const ctx = opts.confrontationContext ?? createConfrontationContext()
  const aiContext: AIGMContext = {
    entitySummary: buildEntitySummary(opts.monster, ctx.disabledCapabilityIds),
    hunterSummary: buildHunterSummary(opts.hunters),
    clueSummary: buildClueSummary(opts.foundClues, opts.unfoundClueCount),
    turnHistory: buildTurnHistory(ctx.turns),
    playerInput: opts.input,
  }

  // Layer 2: AI GM call
  const aiStart = performance.now()
  let aiResult: AIGMResult | null = null

  try {
    const parseResult = await opts.aiClient.interpret(aiContext)
    if (parseResult && parseResult.valid) {
      aiResult = parseResult
    }
  } catch {
    // AI failure — silent fallback to keywords
  }

  const aiLatencyMs = Math.round(performance.now() - aiStart)

  if (!aiResult) {
    return {
      interpretation: keywordResult,
      aiResult: null,
      aiLatencyMs,
      source: 'keyword',
    }
  }

  // Merge: AI overrides stat, modifier, and narrative; keywords provide tokens/clues/exploit
  const merged = mergeResults(keywordResult, aiResult)

  return {
    interpretation: merged,
    aiResult,
    aiLatencyMs,
    source: 'ai',
  }
}

/**
 * Merge keyword and AI results.
 * AI provides: stat, modifier, narrative (richer understanding of intent).
 * Keywords provide: tokens, matchedClues, exploitId, weaknessAlignment, successHarm
 * (structured game mechanics that AI shouldn't override).
 */
function mergeResults(
  keyword: ActionInterpretation,
  ai: AIGMResult,
): ActionInterpretation {
  return {
    ...keyword,
    stat: ai.stat,
    modifier: ai.modifier,
    narrativeResult: ai.narrative.success,
    source: 'ai',
  }
}
