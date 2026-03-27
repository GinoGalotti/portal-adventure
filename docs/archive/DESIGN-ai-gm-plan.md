# DESIGN: AI Game Master — Implementation Plan

_Drop in repo root alongside DESIGN-free-text-exploit.md. Tell Claude Code: "Read both AI design docs, then implement the phases in order."_

_Delete or archive after implementation._

---

## Overview

The game needs an AI layer that interprets free-text player input during confrontations (and eventually investigation locations). Built in layers, each independently useful, each testable and simulatable.

**Guiding principle: Layer 0 must be rock solid before any AI is introduced.** The keyword engine is the foundation. AI is a multiplier on a working system, not a replacement for a broken one. If keyword matching can't handle 80%+ of reasonable player inputs, the problem is content design, not AI.

---

## Architecture: Three Layers

```
┌──────────────────────────────────────────────────────────────────────┐
│  Layer 0: Keyword Engine (always on, instant, free, offline)         │
│  → Tokenize, synonym expand, clue matching, verb→stat classification │
│  → Basic exploit resolution with modifier calculation                │
│  → MUST handle 80%+ of reasonable inputs before Layer 1/2 exist      │
├──────────────────────────────────────────────────────────────────────┤
│  Layer 1: Embedding Similarity (optional, ~50ms, self-hosted)        │
│  → Catches paraphrasing that keywords miss                           │
│  → Semantic clue matching for creative player language                │
├──────────────────────────────────────────────────────────────────────┤
│  Layer 2: AI Game Master (optional, ~200ms–3s)                       │
│  → Full intent parsing, hidden weakness evaluation                   │
│  → Narrative generation, state tracking, entity response planning    │
│  → Structured JSON output with guardrails                            │
└──────────────────────────────────────────────────────────────────────┘
```

Each layer is optional and additive. The game is fully playable with Layer 0 alone. If the AI server is down, degradation is invisible — keyword engine handles it.

**Future scope:** Layer 2 expands beyond confrontations to investigation locations (NPC interviews, location descriptions that respond to player actions, dynamic scene elements). Same pipeline, different context prompts.

---

## Provider Strategy

### The Model: Llama 3.1 8B

Same model everywhere. No mismatch between testing and production.

| Phase | Provider | Model String | Cost | Latency |
|-------|----------|-------------|------|---------|
| Prompt engineering | Ollama (local) | `llama3.1:8b` | Free | 1-3s CPU |
| Dev testing | Ollama (local) | `llama3.1:8b` | Free | 1-3s CPU |
| Playtesting (deployed) | Groq free tier | `llama-3.1-8b-instant` | Free | ~200-500ms |
| Production (early) | Groq free tier | `llama-3.1-8b-instant` | Free | ~200-500ms |
| Production (scale) | Groq paid / Together / Workers AI | Same or upgrade to 70B | Cents/session | ~200ms-1s |

**Groq free tier:** No credit card, no time limit. ~30 req/min, ~14,400 req/day. A confrontation of 8 turns = 8 requests. That's 1,800 full confrontations per day on the free tier.

**Fallback chain:** Groq → Together.ai ($25 free credits) → Cloudflare Workers AI (10k neurons/day free) → Layer 0 keyword engine (always works).

### Configuration

```bash
# .dev.vars (local development — gitignored)
AI_GM_ENABLED=true
AI_GM_URL=http://localhost:11434/v1
AI_GM_MODEL=llama3.1:8b
AI_GM_KEY=

# wrangler.toml [vars] (production — Groq)
AI_GM_ENABLED=true
AI_GM_URL=https://api.groq.com/openai/v1
AI_GM_MODEL=llama-3.1-8b-instant

# Secret (not in toml): npx wrangler secret put AI_GM_KEY

# Disable AI entirely — keyword engine handles everything:
AI_GM_ENABLED=false
```

All providers use OpenAI-compatible API format. Switching providers = config change, not code change.

---

## Implementation Phases

### Sprint 1: Layer 0 — Keyword Engine

**Prerequisites:** DESIGN-free-text-exploit.md already read.

**Goal:** Handle 80%+ of reasonable player inputs with zero AI dependency.

**Build:**
1. `src/engine/free-text/tokenizer.ts` — Lowercase, strip punctuation, basic stemming, stop words
2. `src/engine/free-text/synonyms.ts` — Global synonym map (~50 groups)
3. `src/engine/free-text/clue-matcher.ts` — Match tokens against clue keyword arrays
4. `src/engine/free-text/stat-classifier.ts` — Verb→stat with confidence
5. `src/engine/free-text/exploit-resolver.ts` — Clue matches + stat + weakness → modifier + outcome
6. `src/engine/free-text/pipeline.ts` — `interpretAction(input, gameState) → ActionInterpretation`

**Content updates for mystery-001:**
- Add `keywords: string[]` to every `ClueDef`
- Add `FreeTextExploit` entries to weakness definition
- Add `EntityCapability` with `disableConditions` to monster

**Testing (mandatory before proceeding):**
- Unit tests per pipeline stage
- 50+ example inputs for mystery-001 with manually verified expected outputs
- `free-text-keyword` simulation strategy: generate varied inputs, measure coverage
- **Threshold: > 80% valid stat classification before Sprint 2 begins**

```bash
npm run simulate -- --strategy free-text-keyword --mystery mystery-001 --runs 200
# Must output: Valid classification > 80%
```

**Wire into UI:** Replace structured confrontation picker with text input + approach preview panel.

### Sprint 2: AI Client Infrastructure

**Goal:** Build AI plumbing, don't wire into gameplay yet.

**Build:**
1. `src/ai/client.ts` — OpenAI-compatible client, reads config from env
2. `src/ai/prompts/confrontation-gm.ts` — Prompt template builder (mystery context + entity capabilities + clue state + action history + hunter stats → system prompt + user message)
3. `src/ai/parser.ts` — Parse AI JSON response with **guardrails:**
   - Clamp modifiers to [-3, +3]
   - Validate harm against entity definition
   - Reject nonsensical state changes
   - If parse fails or guardrails trigger → fall back to Layer 0
4. `src/ai/types.ts` — Request/response types
5. `workers/ai.ts` — Worker endpoint proxying AI requests (API key stays server-side)

### Prompt Construction Strategy

**Do NOT send raw JSON to the AI.** The prompt template transforms game state into concise readable prose. The AI reasons about narrative, not data structures.

**Context budget (~800 tokens total per turn):**

| Section | ~Tokens | Source | Changes per turn? |
|---------|---------|--------|-------------------|
| System instructions + output format | ~300 | Static template | No — cacheable |
| Entity summary (name, type, capabilities, weakness) | ~150 | Mystery definition | No — cacheable |
| Hunter summary (name, class, stats, available moves) | ~100 | Game state | **Yes — player chooses hunters per mystery** |
| Clue state (found: descriptions, unfound: hidden) | ~50 | Game state | Rarely |
| Turn history (previous actions + outcomes) | ~25/turn | Grows each turn | Yes — ~200 max at turn 8 |
| Player input | ~50 | Current turn | Yes |
| **Total at turn 8** | **~850** | | |

Llama 3.1 8B supports 8,192 tokens. 850 is ~10% of capacity. No risk of overflow.

**Example of what the AI actually receives** (this is built automatically by the prompt template from game state — the player never sees it):

```
ENTITY: Eszter Varga — a grief-stricken ghost manifesting as fire.
She can: project flames (harm 2), control nearby electronics,
emotional wail (all hunters roll or take harm).
Her weakness: being reminded of Bálint's love and forgiveness.
Currently disabled: electronics control (jammed in turn 2).

HUNTERS:
- Rosa Quintero (tactical operative): Charm 0, Cool +2, Sharp +1, Tough +1
  Moves: tactical entry (+1 first action), protect ally (roll cool)
- Mack Hensley (avenger): Charm -1, Cool 0, Sharp +1, Tough +2

CLUES FOUND: Ash-covered locket initialed "B.K.", Bálint confessed
he blames himself, University records show Eszter studied chemistry.
UNFOUND CLUES EXIST: Do not reveal directly. If the player intuits
something close, give a subtle narrative hint and a small bonus.

PREVIOUS TURNS:
1. Mack tried to restrain Eszter physically (tough, miss, took 2 harm).
2. Rosa jammed the electronics panel (sharp, success, disabled robot control).

PLAYER SAYS: "Rosa shields Bálint and tells him to call out to Eszter"
```

**The prompt template builder** (`src/ai/prompts/confrontation-gm.ts`) does this transformation:
- `buildEntitySummary(monster: MonsterDef, disabledCapabilities: string[]) → string`
- `buildHunterSummary(hunters: Hunter[]) → string`
- `buildClueSummary(found: ClueDef[], unfoundCount: number) → string`
- `buildTurnHistory(turns: TurnRecord[]) → string`
- `buildSystemPrompt() → string` (rules, output format, guardrails)

Each function produces concise prose from game structs. Static parts (system prompt, entity summary) are identical across turns and benefit from Groq's prompt caching (50% off repeated tokens).

**Hunter context is dynamic.** Players choose 1–4 hunters per mystery from their roster — different playbooks, different stats, different available moves. The prompt template rebuilds the hunter summary from current game state each confrontation. Moves are specific to the hunter's playbook (not a global list), so the AI knows exactly what each operative can do.

### Structured Checklist Output Format

The prompt doesn't ask the AI to free-associate. It asks for a **classification checklist** — structured questions with a strict JSON schema. This makes outputs predictable, parseable, and guardrail-friendly:

```
Given the player's input and all context above, answer these questions as JSON:

{
  "action_type": "Which move best fits? One of: [attack, protect_someone, act_under_pressure, manipulate, read_situation, use_magic, {hunter-specific moves}]",
  "stat": "Which stat applies? One of: charm, cool, sharp, tough, weird",
  "stat_reasoning": "One sentence explaining why this stat fits",
  "clue_references": ["List clue IDs the player is referencing, if any"],
  "weakness_match": {
    "rating": "0=none, 1=tangential, 2=partial, 3=direct hit",
    "reasoning": "One sentence: how does this action relate to the weakness?"
  },
  "modifier": "Integer from -3 to +3. Base 0, +1 per relevant found clue referenced, +1 for strong weakness match, -1 if approach is counterproductive",
  "state_changes": {
    "capabilities_disabled": ["entity capability IDs disabled by this action"],
    "conditions_applied": ["new conditions, e.g. 'entity_shaken', 'hunter_exposed'"],
    "conditions_expired": ["conditions that end this turn"]
  },
  "narrative": {
    "success": "One sentence: what happens on 10+",
    "mixed": "One sentence: what happens on 7-9",
    "miss": "One sentence: what happens on 6-"
  },
  "entity_response": {
    "action": "What the entity does after the player's action resolves",
    "harm": "Integer: harm the entity deals this turn (0 if none)",
    "target": "Which hunter is targeted, or 'all'"
  }
}
```

This format gives you everything a full GM would give, but in parseable fields that guardrails can validate individually. If `modifier` is outside [-3, +3], clamp it. If `harm` exceeds the entity's max, cap it. If `stat` isn't in the valid list, fall back to keywords. Each field fails independently.

### A/B Testing Infrastructure

The transcript system captures keyword AND AI results per turn, making A/B testing trivial. During Sprint 4, you can run multiple AI approaches in parallel:

```typescript
// src/ai/ab-test.ts
interface ABTestResult {
  keyword: ActionInterpretation      // Layer 0 (always)
  ai_full_context?: ActionInterpretation  // Full GM with checklist
  ai_decomposed?: ActionInterpretation    // Targeted queries (if testing)
  ai_minimal?: ActionInterpretation       // Minimal context (if testing)
}

async function interpretWithABTest(
  input: string,
  gameState: GameState,
  approaches: string[] = ['keyword', 'ai_full_context']
): Promise<ABTestResult> {
  const result: ABTestResult = {
    keyword: interpretAction(input, gameState)
  }

  if (approaches.includes('ai_full_context')) {
    result.ai_full_context = await callAIGM(input, gameState, 'full')
  }
  if (approaches.includes('ai_decomposed')) {
    result.ai_decomposed = await callAIGM(input, gameState, 'decomposed')
  }
  if (approaches.includes('ai_minimal')) {
    result.ai_minimal = await callAIGM(input, gameState, 'minimal')
  }

  return result
}
```

**Three approaches to compare:**

| Approach | What's sent | Tokens | Calls | Best for |
|----------|------------|--------|-------|----------|
| `full_context` | Everything: entity, hunters, clues, history, moves | ~800-3000 | 1 | Creative compound actions, narrative quality |
| `decomposed` | Separate small queries per classification step | ~200 each | 3-5 | Simple actions, lower latency budget |
| `minimal` | Entity + weakness + input only (no history/moves) | ~300 | 1 | Testing if history/moves matter |

During playtesting, enable all three via a debug flag (`?ab=all`). All results stored in the transcript. After 20-30 confrontations, compare: which approach agreed most with player intent? Which produced the best ratings? Which disagreed with keywords in useful ways?

**A/B mode is expensive (3x API calls) — only enable during dedicated testing sessions.** Normal play uses whichever approach won.

**Why full context beats decomposed queries:**

Decomposed queries ("does this mention Bálint? does this mention electronics?") are cheaper per call but lose cross-cutting reasoning. "Rosa shields Bálint and tells him to call out" requires understanding that Rosa is protecting (cool) while Bálint is persuading (charm), and the combined action targets grief. A single query with full context captures this. Decomposed queries would need 3 calls and still miss the compound intent.

**A/B testing in practice:** The infrastructure above lets Sprint 4 compare approaches systematically. Store all results in transcripts, compare offline after 20-30 sessions.

**The AI wraps Layer 0:**

```typescript
async function interpretActionWithAI(input, gameState): Promise<ActionInterpretation> {
  // Layer 0 always runs first
  const keywordResult = interpretAction(input, gameState)

  if (!AI_GM_ENABLED) return keywordResult

  try {
    const aiResult = await callAIGM(input, gameState)
    const validated = validateAIResponse(aiResult, gameState)
    if (!validated.valid) return keywordResult
    return mergeResults(keywordResult, validated.result)
  } catch {
    return keywordResult  // AI down? Silent fallback
  }
}
```

**Tests:** Mock AI responses, verify parsing/guardrails, test fallback on garbage/timeout.

### Sprint 3: AI Integration + Telemetry + Transcripts

**Goal:** Wire AI into confrontation, capture everything for debugging and quality measurement.

**Build:**
1. Wire `interpretActionWithAI` into confrontation screen
2. Add `ConfrontationContext` tracking (turn history, conditions, disabled capabilities)
3. Feed growing context to AI per turn
4. Emit `FreeTextTelemetryEvent` on every turn (see schema below)
5. Build session transcript data structure and D1 storage
6. Add quality rating UI to Field Report screen
7. Add "Copy transcript" / "Download transcript" to Field Report + Debug panel
8. Run `free-text-compare` simulation (keyword-only vs AI-enhanced)

### Sprint 4: Tuning, A/B Testing & Polish

1. Collect transcripts from playtesting
2. Enable A/B mode (`?ab=all`) for dedicated testing sessions — compare full_context vs decomposed vs minimal
3. Run prompt regression tests against saved transcripts
4. Tune prompt template based on misclassifications
5. Tune synonym map based on telemetry (what inputs matched nothing?)
6. Expand test bank with real player language
7. Evaluate: does AI measurably improve ratings? Which approach wins?
8. Disable losing approaches, ship the winner as default

### Sprint 5 (Future): Investigation Expansion

1. Investigation-specific prompt template
2. Free-text input for NPC interviews and location interactions
3. Same pipeline, different context. Test independently.

---

## Quality Feedback System

### Per-Turn Telemetry

Every free-text action emits:

```typescript
interface FreeTextTelemetryEvent extends TelemetryEvent {
  event_type: "free_text_action"
  event_data: {
    player_input: string
    tokens: string[]
    // Layer 0
    keyword_stat: StatName
    keyword_modifier: number
    keyword_clue_matches: string[]
    keyword_confidence: number
    // Layer 2 (if called)
    ai_enabled: boolean
    ai_stat?: StatName
    ai_modifier?: number
    ai_narrative?: string
    ai_latency_ms?: number
    ai_model?: string
    ai_fell_back_to_keywords?: boolean
    ai_guardrail_triggered?: boolean
    // Final
    final_stat: StatName
    final_modifier: number
    result_source: "keyword" | "ai" | "merged"
  }
}
```

### Session Quality Rating

End of each mystery, Field Report screen shows optional rating:

```
┌─ SESSION FEEDBACK ──────────────────────────────┐
│  How did the confrontation feel?                 │
│                                                  │
│  [ Mechanical — felt like a system ]             │
│  [ Decent — understood most of what I tried ]    │
│  [ Great — felt like a real TTRPG moment ]       │
│  [ Surprising — it got something creative ]      │
│                                                  │
│  (optional) What worked or didn't?               │
│  ┌────────────────────────────────────────┐      │
│  │                                        │      │
│  └────────────────────────────────────────┘      │
│                                                  │
│  [ SUBMIT ]  [ SKIP ]                            │
└──────────────────────────────────────────────────┘
```

Stored in telemetry, keyed to mystery seed. Builds a dataset over time: which mysteries feel good, which feel mechanical, does AI make a measurable difference.

### Exportable Session Transcript

Every confrontation produces a full transcript showing the decision chain. Available from Field Report or Debug panel. Copyable as text, downloadable as `.json` or `.md`.

```
═══════════════════════════════════════════════════
CONFRONTATION TRANSCRIPT — Case #2026-037
Entity: Eszter Varga (The Burning Student)
Hunters: Rosa Quintero (Professional), Mack Hensley (Wronged)
Intel Level: INFORMED (5/7 clues)
AI GM: Enabled (llama-3.1-8b-instant via Groq, avg 340ms)
═══════════════════════════════════════════════════

── TURN 1 ──────────────────────────────────────────
Player input: "Rosa shields Bálint and tells him to call out to Eszter"

Keyword analysis:
  Tokens: [rosa, shield, balint, tell, call, eszter]
  Stat: cool (shield→cool) | Confidence: 0.7
  Clue matches: balint-confession (2/3), locket (1/3)
  Modifier: +1

AI analysis:
  Stat: charm (persuade via proxy) | Confidence: 0.9
  Move: protect-someone + manipulate (compound action)
  Weakness eval: STRONG — addresses grief/guilt weakness
  Modifier: +2
  Narrative: "Rosa positions herself between Bálint and the
    heat. 'Tell her,' she says quietly..."

Guardrails: ✓ modifier in [-3,+3], harm valid
Final: stat=charm, modifier=+2, source=ai
Roll: 2d6+2 (Charm) = [4,5]+2 = 11 → SUCCESS

── TURN 2 ──────────────────────────────────────────
...

═══════════════════════════════════════════════════
SUMMARY
Turns: 4 | Outcome: VICTORY
Keyword-only would have: stat=cool, mod=+1 on turn 1
AI changed outcome on: turns 1, 3
AI agreed with keywords on: turns 2, 4
Player rating: "Great — felt like a real TTRPG moment"
═══════════════════════════════════════════════════
```

**Transcript purposes:**
- **Debugging:** See exactly why AI chose what it chose
- **Prompt tuning:** Find misclassifications, adjust template
- **Reinforcement data:** Library of good/bad classifications for regression testing
- **Campaign canon:** Keeper reads what happened, pulls into TTRPG
- **Player delight:** Share cool confrontation stories

### Transcript Storage

```typescript
interface ConfrontationTranscript {
  mystery_seed: string
  entity: string
  hunters: string[]
  intel_level: string
  ai_enabled: boolean
  ai_model?: string
  turns: TranscriptTurn[]
  outcome: "victory" | "defeat" | "retreat"
  keyword_only_estimate?: string
  player_rating?: number
  player_feedback?: string
}

interface TranscriptTurn {
  turn: number
  hunter: string
  player_input: string
  tokens: string[]
  keyword_result: { stat: string; modifier: number; clue_matches: string[]; confidence: number }
  ai_result?: { stat: string; modifier: number; move: string; weakness_eval: string; narrative: string; latency_ms: number }
  guardrails_triggered?: string[]
  final: { stat: string; modifier: number; source: string }
  roll: { dice: number[]; modifier: number; total: number; outcome: string }
}
```

Stored in D1. Exportable as JSON or formatted markdown. Copy button on Field Report screen. Download from Debug panel.

---

## Simulation & Testing

### Keyword Coverage Simulation (Sprint 1 — mandatory)

```bash
npm run simulate -- --strategy free-text-keyword --mystery mystery-001 --runs 200

# Output:
# Valid stat classification: 184/200 (92%)
# Clue match rate: 156/200 (78%)
# Modifier > 0: 134/200 (67%)
# Modifier = -3 (no match): 12/200 (6%)
# PASS — proceed to AI integration
```

### AI Comparison Simulation (Sprint 3)

```bash
npm run simulate -- --strategy free-text-compare --mystery mystery-001 --runs 100

# Output:
# Keyword-only win rate: 72%
# AI-enhanced win rate: 78%
# Stat agreement: 85%
# AI changed outcome: 14/100
# Avg AI latency: 280ms
# Guardrail triggers: 3/100
```

### Prompt Regression Testing (Sprint 4+)

```bash
npm run test:prompt-regression --transcripts data/transcripts/*.json

# Output:
# Transcripts tested: 47
# Stat changed: 3/47
# Modifier changed >1: 1/47
# REGRESSION: transcript-023 turn 2 now "tough" (was "charm")
```

---

## Local Development Setup

### Install Ollama

**Windows (PowerShell):**
1. Download installer from https://ollama.ai/download
2. Run the installer
3. In PowerShell:
```powershell
ollama pull llama3.1:8b
# Verify:
ollama list
```

**macOS / Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama3.1:8b
```

### Create .dev.vars

```bash
AI_GM_ENABLED=true
AI_GM_URL=http://localhost:11434/v1
AI_GM_MODEL=llama3.1:8b
AI_GM_KEY=
```

### Switch to Groq (deployed testing)

```bash
# 1. Sign up at console.groq.com (no credit card)
# 2. Create API key
# 3. Set production config:
npx wrangler secret put AI_GM_KEY
# Paste Groq key

# 4. In wrangler.toml:
# [vars]
# AI_GM_ENABLED = "true"
# AI_GM_URL = "https://api.groq.com/openai/v1"
# AI_GM_MODEL = "llama-3.1-8b-instant"
```

---

## Key Principles

- **Layer 0 is the product. AI is a feature.** Keyword engine must work well enough that players enjoy the game without AI. AI makes it magical; keywords make it functional.
- **Same model everywhere.** Llama 3.1 8B on Ollama = Llama 3.1 8B on Groq. No mismatch, no surprises.
- **Guardrails are non-negotiable.** AI output always validated. Modifiers clamped, harm checked, nonsense rejected. Keyword result is the safety net.
- **Transcripts are first-class data.** Every confrontation produces a reviewable, exportable record for debugging, tuning, canon, and storytelling.
- **Telemetry measures AI value.** Keyword vs AI comparison, player ratings, and regression tests tell you whether AI is actually helping.
- **Config, not code, controls the provider.** Switching providers is an environment variable change.
- **80% keyword coverage before any AI work.** This is a gate, not a guideline.
