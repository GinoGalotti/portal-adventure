# Backlog

## Sprint 1 — Free-Text Exploit System ✅ COMPLETE (2026-03-26)

- [x] `src/engine/free-text/` pipeline — synonyms, tokenizer, clue-matcher, stat-classifier, exploit-resolver, pipeline
- [x] New types in `types.ts` — FreeTextExploit, EntityCapability, ClueMatch, WeaknessAlignment, ClassificationConfidence, ActionInterpretation
- [x] `keywords` on all clue defs — ALL 9 mysteries (001–009), 6–8 keywords per clue
- [x] `freeTextExploits` added to ALL 9 mysteries — 3 tiers per mystery
- [x] `capabilities` (EntityCapability) on ALL 9 monsters — 2 per monster with disableConditions
- [x] `tests/engine/freetext.test.ts` — 72 tests passing, known limitations documented
- [x] Engine free-text action path — 3rd branch in handleExploitWeakness
- [x] ConfrontationScreen free-text UI — amber button + textarea + live preview
- [x] `free-text` simulation strategy — FreeTextKeywordStrategy + valid-actions enumeration
- [x] InvestigationScreen wired to mystery registry (dynamic MiniMap, narrative via getMysteryForState)
- [x] 496 tests passing total

## Sprint 2 — AI Client Infrastructure ✅ COMPLETE (2026-03-26)

- [x] `src/ai/types.ts` — `AIGMContext`, `AIGMResult`, `AIGMParseResult`, `FreeTextTelemetryEvent`
- [x] `src/ai/prompts/confrontation-gm.ts` — prompt template builder (`buildEntitySummary`, `buildHunterSummary`, `buildClueSummary`, `buildTurnHistory`, `buildPrompt`, `SYSTEM_PROMPT`)
- [x] `src/ai/parser.ts` — `parseAIGMResponse()` with guardrails (clamp modifier, cap harm, filter capabilities, strip markdown)
- [x] `src/ai/client.ts` — `AIGMClient` (builds prompt, calls worker, parses response, returns `null` on failure)
- [x] `workers/ai.ts` — pure proxy endpoint (receives `{system, user}`, adds API key, forwards to Ollama/Groq)
- [x] `workers/index.ts` — AI route added, `Env` extended with `AI_GM_*` vars
- [x] `wrangler.toml` — AI vars added (`AI_GM_ENABLED=false` default)
- [x] `.dev.vars.example` — local dev config template (Ollama + Groq options)
- [x] `tests/ai/parser.test.ts` + `tests/ai/prompts.test.ts` — 30 tests, 526 total passing
- [x] `vitest.config.ts` — `tests/ai/` added to include pattern

**AI is off by default.** Set `AI_GM_ENABLED=true` in `.dev.vars` + run Ollama locally to enable during dev. Nothing in the game calls `AIGMClient` yet — that's Sprint 3.

## UX Polish — Testing Feedback (2026-03-27)

Feedback from mystery-001 playtesting. Applies to all mysteries.

- [x] **Flavour text after every action** — `response` field added to all mystery-001 narrative scene elements (investigate, deepSearch, helpBystander). InvestigationScreen now shows narrative text below roll results on non-miss outcomes. Fallback narrative generator for mysteries 002-009 auto-populates `response` from clue descriptions. Interview actions already had dialogue response text.
- [x] **Text size 30-40% bigger** — font sizes scaled ~30-40% across all screens (except ConfrontationScreen) and `src/components/ui.tsx`. Applied to LoginScreen, SaveSlotsScreen, BriefingScreen, InvestigationScreen, FieldReportScreen.
- [x] **Confrontation UI: action-first layout** — show available actions first (attack, defend, exploit, free text), THEN pick which hunter does it. ConfrontationScreen refactored to action-first with hunter picker panel.
- [x] **Investigation gating for Bálint's rooms** — `requiredClueIds` added to `LocationDef`/`Location` types, engine `handleTravel` enforces gating, `getReachableLocationIds` filters gated locations, UI hides inaccessible locations. mystery-001: Student Dorms require clue-ash-trail, Science Lab requires clue-witness-sightings.
- [x] **Exploit spam prevention** — 1-action cooldown per hunter: hunter's last confrontation action can't be exploitWeakness. Engine throws `ActionError`, simulation filters valid actions, strategy respects cooldown.
- [x] **Maintenance worker highlight bug** — hidden scene elements now use prose-matching text color (`text-[#c8ddd0]`) and `cursor-default` when disabled/no operative selected, so they blend with surrounding text instead of standing out.
- [x] **FREE TEXT button not appearing** — fixed: button was gated behind `canExploitNew || canExploitLegacy`, now also shows when `hasFreeTextExploits` is true.
- [x] **Free-text exploits clue-gated** — fixed: removed `requiredClueIds` check from `resolveExploit()`, players can always guess via free text.
- [ ] **Text size STILL too small on desktop** — 30-40% increase may not be enough, or may not have been applied to all screens (ConfrontationScreen was excluded). User reports no visible change — verify build, then increase further.
- [ ] **Roll-outcome narrative on investigate/deepSearch** — clicking scene elements (e.g. "grey ash powder") should show contextual narrative per roll outcome, like interviews do. Miss: feel a presence (alert Eszter). Mixed: partial info. Success: learn something. Extend `SceneElement.response` to per-outcome `{ miss, mixed, success }` like `DialogueOption.responses`.
- [ ] **Mystery selection on briefing screen** — currently hardcoded to mystery-001. Need a mystery picker before operative selection.

---

## Sprint 3 — AI Integration + Telemetry + Transcripts ✅ COMPLETE (2026-03-27)

Design question resolved: `freeTextExploits` are pure keyword-match (players can always guess without finding clues).

- [x] `interpretActionWithAI()` — `src/ai/interpret.ts`: wraps keyword result, calls `AIGMClient`, merges/falls back silently
- [x] `ConfrontationContext` tracking — turn history, disabled capabilities, active conditions; immutable updates via `addTurnToContext()`
- [x] Wire AI into `ConfrontationScreen` free-text path — `doFreeTextAction()` calls `interpretActionWithAI()`, shows loading state
- [x] Emit `FreeTextTelemetryEvent` on every free-text action — `src/ai/telemetry.ts`: `buildFreeTextEventData()` + full `telemetry.emit()` in ConfrontationScreen
- [x] Session transcript — `ConfrontationTranscript` + `TranscriptTurn` types in `src/ai/types.ts`, D1 table + Worker endpoints (`POST /api/transcripts`, `GET /api/transcripts`, `PUT /api/transcripts/:id/rating`)
- [x] Quality rating UI on Field Report screen — 4-option rating + optional text feedback + submit/skip
- [x] "Copy/Download transcript" on Field Report — copy to clipboard + download as JSON
- [x] `free-text-compare` simulation strategy — `FreeTextCompareStrategy` extends `FreeTextKeywordStrategy`, records `FreeTextComparisonRecord` on every free-text exploit decision. Batch AI comparison via records after simulation.

**AI is still off by default.** Use `?ai=1` URL param to enable AI calls. Set `AI_GM_ENABLED=true` + run Ollama to enable Worker-side. 543 tests passing.

## Simulation Balance Fix -- 2026-03-27 ✅ COMPLETE

Regression: greedy dropped to 20%, balanced to 15% after the clue-based exploit system was introduced. Root cause: `mystery-001.json` campus-grounds adjacency was missing `library` and `student-dorms`, making `enrollment-record` permanently unreachable. Without it, no mod≥0 exploit could ever unlock.

- [x] `data/mysteries/mystery-001.json` — Added `"loc-university-library"` and `"loc-student-dorms"` to `loc-campus-grounds.adjacentLocationIds`
- [x] `simulation/strategies.ts` — Balanced `shouldConfront`: confront at partial intel when any viable exploit (net score ≥ 0) exists — earlier than greedy (which waits for mod≥0 option) but not blind
- [x] Simulation results: greedy **95%** (✓ 60--95%), balanced **70%** (✓ 60--80%), death rate **18%** (✓ 5--20%)
- [x] 543 tests all passing

---

## Phase G — Second Mystery + Simulation Validation

- [ ] Simulation run for all 9 mysteries (002–009 now have exploitOptions + freeTextExploits)
- [ ] Narrative overlay for mystery-002 (`src/data/narrative/mystery-002.ts`)
- [ ] Briefing screen mystery selection (beyond mystery-001)
- [ ] E2E tests: Playwright happy-path flows

---

## Pending Design Questions

- Original playbook names (replacing MotW placeholder names to avoid IP concerns)
- Bond system specifics: how fast do bonds grow, what's the formula for assist charges?
- Countdown advancement rules: exactly how many actions before it ticks? Linear or accelerating? NOTE: already discussed on a previous session.
- CAMPBELL voice specifics for field reports: tone guide, vocabulary, sentence patterns. NOTE: will ask the other repo
- Hunter roster: when to build the 15–20 pre-built hunter pool with randomised names/descriptions
- Story generator: Claude API endpoint for generating MysteryDefinition JSON from incident parameters (Phase X, after MVP)
- Monster moves system: active moves that fire during investigation, not just raw harm in confrontation

---

## Decisions Made

| Date | Decision | Context |
|------|----------|---------|
| 2026-03-26 | freeTextExploits added to all 9 mysteries before Sprint 1 tests/UI | All mysteries playable via free-text engine once wired |
| 2026-03-26 | Mystery registry in `src/data/mysteries.ts` for narrative overlay | InvestigationScreen decoupled from hardcoded mystery-001 imports |
| 2026-03-26 | Free-text sprint gated at >80% keyword coverage before Sprint 2 (AI) | Proves keyword engine is good enough; AI is enhancement not crutch |
| 2026-03-25 | Luck spent after seeing roll | More dramatic, better mobile UX |
| 2026-03-25 | Bond-based assist system | Rewards keeping teams together, creates composition strategy |
| 2026-03-25 | Arc structure (cases + setup + finale + side) | TV season model, prevents infinite treadmill |
| 2026-03-25 | Deterministic seeded PRNG | Enables save/undo/replay/simulation with minimal state |
| 2026-03-25 | Undo disabled past dice rolls | Misclick protection without undermining randomness |
| 2026-03-25 | Papers Please aesthetic (north star, not MVP) | Styled text + icons for Phase 1, evolve visual direction later |
| 2026-03-25 | Mobile-first layout | PORTAL players will mainly use between sessions on phone |
| 2026-03-25 | i18n from day one | All strings through translation keys, avoids painful retrofit |
| 2026-03-25 | Original names/mechanics (inspired by MotW) | Avoids IP issues, allows creative freedom |
| 2026-03-25 | Cloudflare D1 server-side state | Syncs across devices, supports future multiplayer |
| 2026-03-25 | 2–3 save slots per player | Parallel playthroughs without losing progress |
| 2026-03-25 | Separate repo from PORTAL | Different build/deploy, game data diverges from campaign data |
| 2026-03-25 | Telemetry: chosen + not-chosen at every decision | Game tuning AND campaign canon export |
| 2026-03-25 | Headless simulation from day one | Balance verification, feasibility, path completeness |
| 2026-03-25 | Debug commands as engine-layer pure functions | Dev, testing, and simulation all use them |
| 2026-03-25 | Vitest + Playwright + simulation (3 test layers) | Correctness, user flows, game design validation |
| 2026-03-25 | Design-doc-driven Claude Code workflow | Design docs → implementation → archive, BACKLOG.md as source of truth |
| 2026-03-25 | Hunters have selected moves (not full playbook list) | At character creation offer 2–3 choices; future roster of 15–20 pre-built hunters with some randomised aspects |
| 2026-03-25 | Story generator as Phase X (post-MVP) | Claude API endpoint taking incident params → MysteryDefinition JSON; too costly for early dev, generate manually for now |
| 2026-03-25 | mystery-001 designed for humane resolution | Eszter is a victim of grief; combat win is mechanically valid but thematically a loss — teaches weakness mechanic early |

---

## Archived (Done)

### Free-Text Exploit Engine — 2026-03-26

- [x] **`src/engine/free-text/synonyms.ts`** — ~25 synonym groups, flat `SYNONYM_MAP` canonical expansion
- [x] **`src/engine/free-text/tokenizer.ts`** — `tokenize()` + `normalizeWord()` (lowercase → stop-word filter → stem → synonym expand)
- [x] **`src/engine/free-text/clue-matcher.ts`** — `matchClues()` scores found-clue keyword overlap, sorted descending
- [x] **`src/engine/free-text/stat-classifier.ts`** — `classifyStat()` verb→stat vote system, player-friendly tie-breaking
- [x] **`src/engine/free-text/exploit-resolver.ts`** — `resolveExploit()` walks freeTextExploits best→worst, fallback tiers (3+clues→-1, 1-2→-2, 0→-3)
- [x] **`src/engine/free-text/pipeline.ts`** — `interpretAction()` composing all 4 stages
- [x] **New types in `types.ts`** — FreeTextExploit, EntityCapability, ClueMatch, WeaknessAlignment, ClassificationConfidence, ActionInterpretation
- [x] **`keywords` on mystery-001 clue defs** — all 7 clues have keyword arrays
- [x] **`freeTextExploits` on all 9 mysteries** — 3 entries per mystery (strong/mid/weak), all JSON validates
- [x] **InvestigationScreen mystery registry wiring** — getMysteryForState(), dynamic MiniMap, narrative

### Phase B: Content — 2026-03-25

- [x] **data/playbooks.json** — 6 playbooks (Crooked, Expert, Mundane, Initiate, Snoop, Celebrity). Each has one selected stat spread, 3 signature moves, 2 gear choices, vulnerability, bondCapacity. Names are MotW placeholder — see `_note` in file.
- [x] **data/moves.json** — 9 basic moves + all 6 playbooks' full move lists (selected + extras). Each move has `cost`, `effect`, `mapsToActionType`.
- [x] **data/mysteries/mystery-001.json** — Eszter case (S01: A Promise is a Promise). 5 locations, 6 clues, 6-step countdown. Monster: incorporeal sorcerer, weakness = brokenBond (charm), armour 4. Humane resolution design (combat valid but narratively a loss).

### Phase A: Engine Foundation — 2026-03-25

- [x] **engine/rng.ts** — Seeded PRNG (mulberry32). 21 tests passing.
- [x] **engine/types.ts** — All game type definitions + pure utility functions.
- [x] **engine/actions.ts** — All 36 action types + core reducer `applyAction`. 134 tests passing. Fixed 2 bugs: `spendLuck` `lastRoll` preservation; `rest` double-subtract harm.
- [x] **engine/state.ts** — `createInitialState(seed)` + `deriveState(seed, actions[])`. 13 tests passing.
- [x] **engine/hunters.ts** — Hunter creation, harm/luck/conditions, action economy. 42 tests passing.
- [x] **engine/debug.ts** — All 16 debug commands as pure functions `(GameState) → GameState`. 41 tests passing.

Total: **357 tests, all passing.**

### Phase D: Simulation — 2026-03-25

- [x] **simulation/types.ts** — Strategy interface, RunResult, pre/post snapshots, ExperimentConfig, StrategyParams, ScoringWeights.
- [x] **simulation/valid-actions.ts** — `getValidActions(state)` enumerates legal moves for both phases.
- [x] **simulation/runner.ts** — `runSimulation()` headless game loop with pre/post snapshots, safety valves (200 investigation / 50 confrontation actions).
- [x] **simulation/strategies.ts** — 4 named strategies (random, greedy, rush, balanced) + `createStrategy()` registry.
- [x] **simulation/reporter.ts** — Aggregate stats, balance flag checks, per-run verbose format, experiment comparison table.
- [x] **simulation/cli.ts** — CLI entry point (`npm run simulate`) with `--mystery`, `--strategy`, `--runs`, `--seed`, `--verbose`, `--experiment`, `--compare`, `--output`.
- [x] **simulation/optimizer.ts** — `ParameterizedStrategy` (weight vector), `scoreRun()`, `optimizeGeneral()` (coordinate descent), `optimizeSeed()` (random sampling).
- [x] **simulation/experiments/** — 4 JSON configs: baseline, three-hunters, high-armor, tight-clock.
- [x] **tests/simulation/valid-actions.test.ts** — 24 tests.
- [x] **tests/simulation/runner.test.ts** — 22 tests.

Total: **424 tests, all passing.**

### Phase F: UI — 2026-03-25

- [x] **vite.config.ts** — Dev server proxy `/api → localhost:8787` for `npm run dev` + wrangler dev workflow.
- [x] **src/api/client.ts** — Typed fetch wrappers: login, listSaves, createSave, getSave, deleteSave, appendAction.
- [x] **src/store/auth.ts** — Zustand auth store with `persist` middleware (token survives refresh).
- [x] **src/store/game.ts** — Zustand game store: `loadSlot` (GET + deriveState), `initSlot`, `dispatch` (optimistic local + Worker persist + rollback on failure), `clearSlot`.
- [x] **src/main.tsx** — Wire i18n import.
- [x] **src/i18n/index.ts** — All English strings populated (namespaces: ui, game, narrative).
- [x] **src/App.tsx** — Screen router: no token → Login; no slot → SaveSlots; by engine phase → Briefing / Investigation / Confrontation / FieldReport.
- [x] **src/screens/LoginScreen.tsx** — Username + password form, PORTAL terminal aesthetic.
- [x] **src/screens/SaveSlotsScreen.tsx** — List/create/delete up to 3 save slots.
- [x] **src/screens/BriefingScreen.tsx** — CAMPBELL dispatch text, 5-operative roster (Rex/Reed/Alan/Sven/John), hunter selection (1–4), deploy → `startMystery`.
- [x] **src/screens/InvestigationScreen.tsx** — Location map, available actions per hunter, travel, countdown display, clue count, luck-spend after roll, start confrontation.
- [x] **src/screens/ConfrontationScreen.tsx** — Monster harm bar, intel level, combat actions per hunter (attack/defend/resist/distract/assess/exploitWeakness), luck spend, end mystery.
- [x] **src/screens/FieldReportScreen.tsx** — CAMPBELL-styled case file: outcome, stats, per-hunter results, narrative note, return to HQ.
- [x] **data/mysteries/mystery-001.json** — Added `title` and `briefingText` fields for UI.

### UI Polish: Exploit Options + Investigation Feedback — 2026-03-25

- [x] **ConfrontationScreen exploit option selector** — "Exploit Weakness ▾" toggles amber-bordered panel showing unlocked exploit approaches (modifier badge, description, stat). Dispatches with `exploitOptionId`. Legacy fallback for mysteries without `exploitOptions`.
- [x] **i18n exploit keys** — 7 exploit description keys + `confrontation.exploit.selectApproach`.
- [x] **Interview question in roll result** — Player's chosen question displays as MonoLabel above NPC dialogue.
- [x] **Session log** — Collapsed `▶ SESSION LOG (N)` after roll result; expands to reverse-chronological action list.
- [x] **helpBystander narrative responses** — `SceneElement.response` field. Multi-part feedback rendering.

### UI Restyle: PORTAL Design System — 2026-03-25

- [x] All 6 screens restyled with Share Tech Mono / Barlow Condensed / Barlow font hierarchy
- [x] CSS variables palette in `src/styles/portal-theme.css`
- [x] Reusable components in `src/components/ui.tsx`
- [x] Icon system via CSS mask-image (assets/icons/, 9 subdirectories)
- [x] Scanline + grid atmospheric overlays

### Phase E: Infrastructure — 2026-03-25

- [x] **wrangler.toml** — Workers project, D1 database wired, deployed.
- [x] **workers/auth.ts** — JWT sign/verify (HS256), 30-day tokens.
- [x] **workers/index.ts** — Full API router with auth.
- [x] **src/telemetry/emitter.ts** — Fire-and-forget telemetry POSTs.

### Phase C: Game Logic — 2026-03-25

- [x] **engine/investigation.ts** — Granular clock system, location helpers. 39 tests.
- [x] **engine/clues.ts** — Clue discovery with minRollOutcome gate. 33 tests.
- [x] **engine/confrontation.ts** — initConfrontation, MonsterBehaviorProfile, clue-based exploit options. 55 tests.
