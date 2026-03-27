import type { StatName } from '../engine/types'

// ─── Context sent to the AI GM per turn ──────────────────────────────────────

export interface AIGMContext {
  entitySummary: string    // prose: entity name, type, capabilities, disabled capabilities
  hunterSummary: string    // prose: hunter names, playbooks, stats
  clueSummary: string      // prose: found clue descriptions + unfound count
  turnHistory: string      // prose: previous turns in this confrontation
  playerInput: string      // raw player text for this turn
}

// ─── Raw structured output from the AI (JSON schema enforced by the prompt) ──

export interface AIGMActionResponse {
  action_type: string
  stat: StatName
  stat_reasoning: string
  clue_references: string[]
  weakness_match: {
    rating: 0 | 1 | 2 | 3
    reasoning: string
  }
  modifier: number
  state_changes: {
    capabilities_disabled: string[]
    conditions_applied: string[]
    conditions_expired: string[]
  }
  narrative: {
    success: string
    mixed: string
    miss: string
  }
  entity_response: {
    action: string
    harm: number
    target: string
  }
}

// ─── Validated result after guardrails ───────────────────────────────────────

export interface AIGMResult {
  valid: true
  stat: StatName
  modifier: number                  // guaranteed in [-3, +3]
  narrative: { success: string; mixed: string; miss: string }
  capabilitiesDisabled: string[]
  conditionsApplied: string[]
  entityResponseHarm: number        // clamped to [0, maxEntityHarm]
  entityResponseTarget: string
  guardrailsTriggered: string[]
}

export interface AIGMParseError {
  valid: false
  errors: string[]
}

export type AIGMParseResult = AIGMResult | AIGMParseError

// ─── Source tracking ─────────────────────────────────────────────────────────

export type AIGMSource = 'keyword' | 'ai' | 'merged'

// ─── Per-turn telemetry event ─────────────────────────────────────────────────

export interface FreeTextTelemetryEvent {
  event_type: 'free_text_action'
  event_data: {
    player_input: string
    tokens: string[]
    // Layer 0 — always present
    keyword_stat: StatName
    keyword_modifier: number
    keyword_clue_matches: string[]
    keyword_confidence: number
    // Layer 2 — present when AI was called
    ai_enabled: boolean
    ai_stat?: StatName
    ai_modifier?: number
    ai_narrative?: string
    ai_latency_ms?: number
    ai_model?: string
    ai_fell_back_to_keywords?: boolean
    ai_guardrail_triggered?: boolean
    // Final resolved values
    final_stat: StatName
    final_modifier: number
    result_source: AIGMSource
  }
}

// ─── Session transcript (per-confrontation decision log) ─────────────────────

export interface TranscriptTurn {
  turn: number
  hunter: string
  playerInput: string
  keyword: {
    stat: StatName
    modifier: number
    clueMatches: string[]
    confidence: string
    exploitId: string | null
  }
  ai?: {
    stat: StatName
    modifier: number
    narrative: string
    latencyMs: number
    guardrailsTriggered: string[]
  }
  final: {
    stat: StatName
    modifier: number
    source: AIGMSource
  }
  roll?: {
    dice: [number, number]
    modifier: number
    total: number
    outcome: string
  }
}

export interface ConfrontationTranscript {
  mysterySeed: string
  mysteryId: string
  entity: string
  hunters: string[]
  intelLevel: string
  aiEnabled: boolean
  aiModel?: string
  turns: TranscriptTurn[]
  outcome: 'victory' | 'defeat' | 'retreat'
  playerRating?: number
  playerFeedback?: string
  createdAt: string
}
