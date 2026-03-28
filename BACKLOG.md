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
- [x] **Roll-outcome narrative on investigate/deepSearch** — `SceneElement.response` extended to `string | { miss?, mixed?, success? }`. All mystery-001 elements updated with per-outcome text. RollResult now shows narrative on miss too (previously suppressed). InvestigationScreen updated throughout.
- [x] **Mystery selection on briefing screen** — BriefingScreen now lazy-initializes to mystery-001. `ALL_MYSTERIES` from `src/data/mysteries.ts` used for future full picker.
- [x] **Mobile layout** — InvestigationScreen is always side-by-side (`grid-cols-[1fr_auto]`, no `grid-cols-1` fallback). MiniMap font `text-[1rem]`, container `p-2`.
- [x] **Operative card expansion** — `HunterDetailPanel` component shows playbook name, all 5 stats, signature moves with descriptions, and vulnerability. Playbook data loaded from `data/playbooks.json` at module scope.
- [x] **Story text: Stage 0 countdown description** — Rewritten to reflect team already on-site ("Ash formations throughout campus. Nightly. Six weeks running..."). Stage 0 text no longer reads as deployment orders.
- [x] **Story synopsis accuracy** — Briefing text updated: Eszter died 200km from Keller; Bálint is the emergency contact. Quantum processor hypothesis line removed (meta-information players won't have early-game).
- [x] **Confrontation layout** — Verified and confirmed: action-first layout deployed. Clue panel added.

### Playtest Round 2 Feedback (2026-03-27) — do not implement yet, another agent may be touching files

- [ ] **Briefing screen: hide internal identifiers** — "sorcerer charm" (playbook id) and "mystery-001" (mystery id) are keeper/game concepts, not player-facing. Hide or replace with display names on the case file selector.
- [ ] **Snoop playbook has no icon** — missing icon in operative/playbook views. Check `assets/icons/` for a suitable icon and wire it up.
- [ ] **Hunter stats: move to bottom summary, not above session log** — stats panel should appear in the hunter summary row at the bottom of the investigation screen, not before the session log. Skill 1-phrase summary deferred.
- [ ] **mystery-001: "Tell us about the promise you made" success → major clue** — success roll on this interview question should unlock a key clue (Bálint's promise). Gate: if players bring Bálint to the confrontation, or use something about Bálint in free-text, Eszter becomes less aggressive (reduced harm) and easier to soothe (humane resolution path easier). Requires engine support for confrontation modifiers from investigation choices.
- [ ] **Humane solutions for all confrontations** — every mystery needs 3-4 possible endings: (1) destroy entity, (2) retrieve artefacts/remains, (3) humane/empathetic resolution, (4) capture/exploit at lab. Some should be easier than others. Humane solutions sometimes create downstream consequences (handled in lab session). mystery-001 Eszter: humane path = bring Bálint or invoke the promise → she passes on peacefully.
- [ ] **Confrontation intel panel: 50-60% less text** — good feature but too verbose. Keep keyword-focused summary only, cut flavour/explanation text significantly.
- [ ] **Exploit weakness: show hunter + stat bonus per action** — when exploit options are listed, each should show the hunter's name and their specific stat bonus (e.g. "MIRA  +2" if Mira has +2 to the required stat). Players need to see which hunter is best for each option.
- [ ] **Don't highlight/recommend the most powerful action** — remove any visual "recommended" or power-ranking hints from exploit options.
- [ ] **Synonym gap: "tell" and "ask" should match "convince"** — "convince balint to release her" and "tell balint to release her" should resolve the same. Add `tell`, `ask`, `instruct`, `order`, `beg`, `plead` to the convince synonym group in `src/engine/free-text/synonyms.ts`.
- [ ] **BUG: free-text "convince balint" → click hunter → no roll/action** — typing in free-text field and clicking a hunter produces no roll. Likely `doFreeTextAction()` is not being triggered or the input state isn't being passed correctly to the hunter-picker handler.
- [x] **Confrontation: clue panel** — Shows full description text for every found clue (card-per-clue layout), replacing minimal intel count display.
- [x] **Confrontation: unique actions auto-select hunter** — When `aliveHunters.length === 1`, standard action buttons immediately dispatch without showing picker.
- [ ] **Text size STILL too small on desktop** — 30-40% increase may not be enough, or may not have been applied to all screens (ConfrontationScreen was excluded). User reports no visible change — verify build, then increase further.
- [ ] **E2E mobile layout tests** — `tests/e2e/mobile.spec.ts`: verify side-by-side layout renders on mobile viewport (375×667), MiniMap visible alongside operative panel, no overflow.

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

### Simulation results — first pass (2026-03-27, 100 runs each, random+rush+balanced)

All mysteries have `freeTextExploits: 3` and `exploitOptions: 5`. Phase G can proceed, but balance tuning is required before wiring mysteries 002-009 to the UI.

| Mystery | Balanced | Random | Rush | Death Rate | Status |
|---------|----------|--------|------|------------|--------|
| 001 | 70% ✓ | — | — | 18% ✓ | Validated |
| 002 | 97% ⚠ | 1% ⚠ | 0% ⚠ | 5% ⚠ | Too easy + not lethal enough |
| 003 | 100% ⚠ | 13% ⚠ | 0% ⚠ | 0% ⚠ | Too easy + not lethal |
| 004 | 19% ⚠ | 6% ⚠ | 0% ⚠ | 42% ⚠ | Too hard + way too lethal |
| 005 | OK ✓ | 2% ⚠ | 0% ⚠ | 24% ⚠ | Win rate OK, death rate high |
| 006 | 100% ⚠ | 12% ⚠ | 0% ⚠ | 1% ⚠ | Too easy + not lethal |
| 007 | 37% ⚠ | 2% ⚠ | 0% ⚠ | 37% ⚠ | Too hard + way too lethal |
| 008 | 100% ⚠ | 6% ⚠ | 0% ⚠ | 0% ⚠ | Too easy + not lethal |
| 009 | 93% ⚠ | OK | 0% ⚠ | 5% ✓ | Slightly over + rush too easy |

Rush=0% across all mysteries is expected (high armor + exploit-gated mechanics).

### Phase G tasks

- [x] Simulation first pass for all 9 mysteries — results above
- [ ] Balance tuning for mysteries 002, 003, 006, 008 (too easy — tighten clock or increase lethality)
- [ ] Balance tuning for mysteries 004, 007 (too hard — reduce armor, increase exploit options, or loosen clock)
- [ ] Death rate tuning for mysteries 004, 005, 007 (too lethal — reduce monster.harm)
- [ ] Narrative overlay for mystery-002 (`src/data/narrative/mystery-002.ts`)
- [ ] Briefing screen mystery selection (beyond mystery-001)
- [ ] E2E tests: Playwright happy-path flows (can begin now, not required for Phase G gate)
- [x] Roll-outcome narrative on investigate/deepSearch — `SceneElementResponse = string | { miss?, mixed?, success? }`. All mystery-001 elements updated. RollResult resolves per-outcome via IIFE. Miss now shows narrative.

---

## Sprint 4 — Monster Moves + Consequences System

### Monster moves (reactive, investigation-phase)

When a player **misses** an investigation roll, the monster gets a reactive "keeper move." These are narrative + mechanical events sourced from the mystery's `monsterMoves` array. Currently the engine only applies raw harm in confrontation; investigation phase has no monster pressure beyond the clock.

**Design (to spec and implement):**
- Add `moves: MonsterMove[]` to `MonsterDef` in `types.ts`
- `MonsterMove`: `{ id, name, description, effect: MoveEffect }` where `MoveEffect` can be:
  - `{ type: 'clockAdvance', amount: number }` — speeds up countdown
  - `{ type: 'hunterHarm', amount: number }` — harms the investigating hunter (weird damage)
  - `{ type: 'staminaDrain', amount: number }` — drains team stamina
  - `{ type: 'clueObscure', locationId: string }` — resets or hides a clue
  - `{ type: 'narrative' }` — flavor only (no mechanical effect)
- Engine: on miss in investigation, pick a random `MonsterMove` (seeded RNG), apply effect, add to action log
- Simulation: expose moves in RunResult for analysis
- Inspired by: `keeper_moves` in `data/portal-entities.json`

**Eszter's moves (from portal-entities.json):**
- "Appear without warning at a location tied to the promise" → `clockAdvance +2` or `narrative`
- "Harm someone who stands between Bálint and the promise" → `hunterHarm 1`
- "Manifest the weight of obligation on the hunters" → `staminaDrain 1`

**Reference for other mysteries:** `keeper_moves` in `data/portal-entities.json` for every entity.

### Luck consequences (push luck = world gets worse)

Current: luck is permanent 0-7 pool, spent any time to upgrade a roll tier. User decision: limit to 1-2 spends per mystery, and push luck = bad thing happens.

**Design (to spec and implement):**
- Add `luckySpends` counter per mystery (resets per mystery, not per hunter)
- When `luckySpends >= 2` (or per-hunter limit), spending luck triggers a consequence event
- `LuckConsequence`: drawn from a random table (or mystery-specific list), similar to `MonsterMove`
- Examples:
  - Police show up at the location (clock advance + NPC complication)
  - Bystanders start recording / interfering (lose 1 stamina)
  - Hunters are questioned (lose remaining scene actions at current location)
  - Evidence is compromised (a found clue is "contested" — must re-discover)
- Separate from monster moves (happens due to player over-reliance on luck, not monster action)

**This is a NEW engine feature** — requires spec before implementation.

## Pending Design Questions

- Original playbook names (replacing MotW placeholder names to avoid IP concerns) — proposed names in session 2026-03-27 response; user will do naming pass later
- Bond system specifics: how fast do bonds grow, what's the formula for assist charges?
- Countdown advancement rules: exactly how many actions before it ticks? Linear or accelerating? NOTE: already discussed on a previous session.
- CAMPBELL voice specifics for field reports: tone guide, vocabulary, sentence patterns. NOTE: will ask the other repo
- Hunter roster: when to build the 15–20 pre-built hunter pool with randomised names/descriptions
- Story generator: Claude API endpoint for generating MysteryDefinition JSON from incident parameters (Phase X, after MVP)
- Luck consequences: per-hunter or per-mission limit? what's the consequence table? built-in or per-mystery?

---

## Free-Text Simulation Tests (Sprint 4 candidate)

Currently pending from Sprint 1:
- [ ] `valid-actions.test.ts` — includes `freeTextExploit` action when `freeTextExploits` exist on mystery
- [ ] `runner.test.ts` — `free-text` strategy completes all 9 mysteries without throwing
- [ ] AI simulation tests (Ollama-based) — check if Ollama is running before calling; skip gracefully if not. Test `interpretActionWithAI` against live model. Only enabled when `OLLAMA_URL` is set in env.

---

## Decisions Made

| Date | Decision | Context |
|------|----------|---------|
| 2026-03-27 | freeTextExploits NOT engine-gated; requiredClueIds kept for UI reference only | Players can always guess via free text. requiredClueIds shown in UI to help players understand what they know — not enforced by exploit-resolver |
| 2026-03-27 | Luck consequences system approved (design pending) | Push luck → bad events. 1-2 spends per mystery (limit TBD). Separate from monster moves. |
| 2026-03-27 | Monster moves reactive system approved (design pending) | On investigation miss → engine picks a keeper move (clockAdvance/hunterHarm/staminaDrain/narrative). Replaces raw "no feedback on miss" |
| 2026-03-27 | Death rate target confirmed: 5–10% per hunter | reporter.ts flag updated to match |
| 2026-03-27 | MotW playbook names OK for now (solo dev); will rename before wider release | Names proposed: Investigator/Operative/Broker/Sensitive/Handler/Face |
| 2026-03-27 | E2E tests can begin now, not a Phase G gate | Playwright happy-path — start anytime, not blocking |
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
