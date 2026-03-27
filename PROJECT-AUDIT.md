# Project Audit — 2026-03-27

Audit of context files, test coverage, and documentation against actual codebase state. Completed across two sessions after context file staleness was identified during a simulation regression investigation.

---

## Changes Made (No User Input Required)

### 1. Simulation regression fix — `data/mysteries/mystery-001.json`

**Problem:** Greedy win rate dropped from ~95% to 20%, balanced to 15%.

**Root cause:** `loc-campus-grounds.adjacentLocationIds` listed only `["loc-memorial-garden", "loc-science-lab"]`. The library (`loc-university-library`) and dorms (`loc-student-dorms`) were absent — making the library permanently unreachable once campus-grounds was visited. Since `enrollment-record` (found only in the library) is a required clue for every mod≥0 exploit option, no strategy could ever unlock a viable confrontation path.

**Fix:** Added `"loc-university-library"` and `"loc-student-dorms"` to `loc-campus-grounds.adjacentLocationIds`.

**Result:** Greedy 95% ✓ (target 60-95%), balanced 70% ✓ (target 60-80%), death rate 18% ✓ (target 5-20%).

---

### 2. BalancedStrategy shouldConfront tuned — `simulation/strategies.ts`

**Problem:** After the map fix, balanced matched greedy's shouldConfront (both waiting for mod≥0). Balanced reached 97% — above its 60-80% target.

**Fix:** Reverted balanced to confront when `hasViableExploit` (any hunter net score ≥ 0) AND intel ≥ partial, OR clock ≥ 70% as fallback. This is the "typical player" model: engages when they know enough, not only when they have the best option.

---

### 3. SIMULATION.md — multiple stale entries corrected

| Section | Was | Now |
|---------|-----|-----|
| Greedy `shouldConfront` | "intel ≥ informed OR clock ≥ 70%" | "mod≥0 exploit unlocked OR clock ≥ 93%" |
| Greedy luck spending | "on miss" | "on miss **during investigation**" |
| Balanced `shouldConfront` | "intel ≥ partial OR clock ≥ 60%" | "hasViableExploit + intel≥partial OR clock ≥ 70%" |
| Balanced luck spending | "on miss **during confrontation**" ❌ | "on miss **during investigation**" |
| Hunter death rate target | "5–10% per hunter" | "5–20% per hunter" (matches reporter.ts code) |
| `maxHarm` default (mystery-001) | 6 | 10 |
| `harm` default (mystery-001) | 2 | 3 |
| `successRefund` default | 1 | 0 |
| `missPenalty` default | 1 | 2 |
| `confrontationAt` default | 10 | 12 |
| Available strategy names | `random, rush, greedy, balanced` | + `free-text, free-text-compare` |
| Strategies table | 4 rows | + `free-text` and `free-text-compare` rows |

---

### 4. TEST-COVERAGE.md — phantom tests removed, AI tests added, counts fixed

**Count fix:** "496 engine/simulation tests (11 files)" → "543 engine/simulation tests (15 files)"

**Phantom test entries removed/corrected:**

| Was (inaccurate) | Replaced with (accurate) |
|------------------|--------------------------|
| `resolveExploit — skips exploit with missing required clues` | `resolveExploit — matches ft-full-resolution even when required clues not found (players can always guess)` |
| `interpretAction — exploit blocked if required clue missing` | `interpretAction — matches ft-full-resolution even without finding required clues` |

Both phantom entries described behavior that the engine explicitly does NOT implement. The actual tests prove the opposite: free-text exploits work regardless of whether requiredClueIds are found. (See CLAUDE-decisions.md: "Free-text exploits NOT clue-gated".)

**AI tests added (47 tests, 4 files):**
- `tests/ai/interpret.test.ts` — 12 tests (ConfrontationContext, interpretActionWithAI)
- `tests/ai/parser.test.ts` — 13 tests (parseAIGMResponse validation and clamping)
- `tests/ai/prompts.test.ts` — 17 tests (buildEntitySummary, buildHunterSummary, buildClueSummary, buildTurnHistory, buildPrompt)
- `tests/ai/telemetry.test.ts` — 5 tests (buildFreeTextEventData)

**Simulation balance table:** Added Round 5 entry (2026-03-27, regression fix results).

**Sprint gate:** Marked "coverage >80% natural inputs" as complete (20+ integration cases passing).

---

### 5. CLAUDE-activeContext.md — stale What's Next item removed

Removed: "Fix greedy strategy (picks best modifier+hunterStat, not just modifier)" — this was already implemented in `GreedyCluesStrategy._confrontation()`.

Updated Recent Session to describe the simulation regression fix + context audit (replacing stale Sprint 3 UI description as the "most recent" work).

---

### 6. CLAUDE-patterns.md — File Layout updated

Added missing directories:
- `src/engine/free-text/` — keyword pipeline modules
- `src/ai/` — AI GM client, prompt builder, parser, interpret pipeline
- `src/data/mysteries.ts` — mystery registry
- `src/components/` — reusable PORTAL UI components
- `src/styles/` — portal-theme.css
- `workers/ai.ts` — AI Worker proxy
- `simulation/experiments/` — experiment JSON configs (baseline, high-armor, tight-clock, three-hunters)
- `tests/engine/`, `tests/simulation/`, `tests/ai/`, `tests/e2e/` — explicit test directory structure

---

### 7. Design docs archived

Moved to `docs/archive/` (per CLAUDE.md: "Design docs go in repo root until implemented, then delete or archive"):
- `DESIGN-ai-gm-plan.md` → `docs/archive/` (Sprint 2 AI GM plan — fully implemented)
- `DESIGN-free-text-exploit.md` → `docs/archive/` (Sprint 1 free-text design — fully implemented)

---

## Proposals Needing Your Input

### P1 — Simulation run for mysteries 002–009 ✅ DONE (2026-03-27)

Simulation first pass complete. All mysteries have `freeTextExploits: 3` and `exploitOptions: 5`. None are blocked, but all need balance tuning before shipping. Results added to BACKLOG.md Phase G section.

Short version: 002/003/006/008 are too easy (balanced 97-100%); 004/007 are too hard (balanced 19%/37%, death 42%/37%); 005 is OK on win rate but death rate is high; 009 is slightly over (93%).

---

### P2 — Original playbook names

Current playbook IDs use MotW (Monster of the Week) placeholder names: `expert`, `mundane`, `crooked`, `initiate`, `snoop`, `celebrity`. These are functional but are tabletop IP-adjacent names that could cause problems if the game ever goes public.

**What's needed:** A naming pass on `data/playbooks.json` to replace these with original names that fit the PORTAL universe (agency operative archetypes rather than MotW archetypes).

**Question for you:** Do you have candidate names in mind, or should I suggest a naming framework based on the PORTAL tone?

---

### P3 — Free-text tests for simulation (still pending)

These two test inventory items are marked pending and haven't been implemented:
- `valid-actions.test.ts` — includes freeTextExploit action when freeTextExploits exist
- `runner.test.ts` — free-text-keyword strategy completes all mysteries

**Question for you:** Should these be added now (pre-Phase G), or is the free-text strategy covered sufficiently by the existing runner smoke tests?

---

### P4 — E2E tests (Playwright)

The E2E test directory (`tests/e2e/`) exists but all items in the expected inventory are still unchecked. Currently 0 E2E tests.

**Question for you:** Is E2E coverage a Phase G priority, or deferred until the mystery selection flow is built (which would give a more stable test target)?

---

### P5 — Monster moves system

From CLAUDE-decisions.md Pending Design Questions: "monsters should have active moves, not just raw harm; some moves should affect hunters during investigation."

Currently `monster.harm` is a flat number applied after each confrontation miss/mixed. There's no investigation-phase monster pressure beyond the countdown clock.

**Question for you:** Is this a Phase G item, or a later sprint? If Phase G, where should it be spec'd?

---

## Open Questions

### Q1 — `resolveExploit` requiredClueIds ✅ DECIDED (2026-03-27)

**Decision:** Keep `requiredClueIds` in JSON, but use it for UI display only — not engine enforcement. The field shows players which clues relate to each exploit approach (making their guesses easier/more informed), without blocking free-text attempts. Engine behavior unchanged. Add type comment to document intent.

---

### Q2 — Luck spending scope (design vs. current simulation)

SIMULATION.md now correctly says both greedy and balanced spend luck "on miss during investigation." But the original BALANCE-LOG.md design intent was that luck could also be a confrontation resource.

The code comment explains: "only 'attack' has partial re-resolution in the engine" — so spending luck on exploitWeakness/distract/assess misses has no gameplay benefit. This is an engine limitation, not a design decision.

**If you want luck to be meaningful in confrontation:** the engine needs to re-resolve exploit attempts on luck spend (not just upgrade the outcome tier). This is non-trivial.

---

### Q3 — Hunter death rate target ✅ DECIDED (2026-03-27)

**Decision:** 5–10% per hunter is the target. reporter.ts updated (`<= 0.1`), SIMULATION.md reverted. mystery-001's 18% death rate is now OUT OF RANGE — needs balance tuning to reduce `monster.harm` or add more investigation-phase healing options.

---

### Q4 — ICON-MATRIX.md and portal-ui-style-guide.md ✅ DECIDED (2026-03-27)

**Decision:** Commit both files as reference documents. Icons not currently wired to UI (assets/icons/ exist, mask-image approach works, but ICON-MATRIX.md tracks which icons to use). portal-ui-style-guide.md is the design system reference.

### Q5 — `CLAUDE-to-ingest.md` and `INITIAL-PROMPT.md` ✅ DECIDED (2026-03-27)

**Decision:** Delete permanently. They were temporary prompt files used during initial project setup.

---

## Session 2 Decisions & Answers (2026-03-27)

Responses to follow-up questions raised after the first audit pass.

---

### Student Dorms adjacency — design intent preserved

The dorms gating IS working correctly. Two mechanisms work together:

1. **Adjacency** (`adjacentLocationIds`) — defines which locations appear as travel options from the current location. Campus-grounds now lists the dorms, so the travel button appears.
2. **Clue gate** (`requiredClueIds` on `LocationDef`) — blocks travel to a location until specific clues are found. `loc-student-dorms` requires `clue-ash-trail`; `loc-science-lab` requires `clue-witness-sightings`. Enforced in `handleTravel()`.

The regression fix only restored the adjacency that was missing. The clue gate was always there and still works. You can't enter the dorms without `clue-ash-trail`.

---

### freeTextExploits on mysteries 002–009

**All defined.** Every mystery has `freeTextExploits: 3` and `exploitOptions: 5`. Phase G can proceed without any content work on that front. The earlier concern was unfounded.

---

### Simulation first pass — mysteries 002–009

| Mystery | Balanced | Death Rate | Status |
|---------|----------|------------|--------|
| 002 | 97% ⚠ | 5% ⚠ | Too easy, not lethal enough |
| 003 | 100% ⚠ | 0% ⚠ | Too easy, not lethal |
| 004 | 19% ⚠ | 42% ⚠ | Too hard, way too lethal |
| 005 | ✓ | 24% ⚠ | Win rate OK, death rate high |
| 006 | 100% ⚠ | 1% ⚠ | Too easy, not lethal |
| 007 | 37% ⚠ | 37% ⚠ | Too hard, way too lethal |
| 008 | 100% ⚠ | 0% ⚠ | Too easy, not lethal |
| 009 | 93% ⚠ | 5% ✓ | Slightly over |

Rush=0% on all mysteries is expected (high armor + exploit-gated mechanics). Balance tuning tasks added to BACKLOG.md Phase G.

---

### Player action feedback — how the system works

Two layers of feedback exist:

1. **Roll-outcome feedback** (investigate, deepSearch, interview): The `RollResult` component shows dice + outcome tier. On mixed/success, if the scene element has a `response` string, it appears below the roll. **Miss shows nothing beyond the dice.** Response is a single string (not per-outcome yet).

2. **No-roll feedback** (helpBystander, rest): `actionFeedback` is set immediately from `element.response`, shown in a Card above the scene.

**Mystery-001** has hand-authored scene elements in [`src/data/narrative/mystery-001.ts`](src/data/narrative/mystery-001.ts) with `response` fields on each element.

**Mysteries 002–009** use a fallback auto-generated from location names/ambiance — no individual element responses. The fallback provides scene prose but no per-element feedback text.

**Pending BACKLOG item:** Extend `SceneElement.response` from a single string to per-outcome `{ miss, mixed, success }`, like `DialogueOption.responses`. This would enable "you feel a presence" on miss, "partial clue" on mixed, and "you learn something" on success.

**How to add flavor text for a mystery:**
1. Look at [`src/data/narrative/mystery-001.ts`](src/data/narrative/mystery-001.ts) — each `SceneElement` has `id`, `label`, `actionType`, and `response`. That `response` is what appears after the roll.
2. To add text for mystery-002: create `src/data/narrative/mystery-002.ts` following the same shape, register it in [`src/data/mysteries.ts`](src/data/mysteries.ts) alongside the existing `mystery-001` entry.
3. Once the per-outcome extension is built, replace the single `response` string with `{ miss: '...', mixed: '...', success: '...' }`.

---

### Proposed playbook names

For when you do the rename pass on `data/playbooks.json`. MotW names are fine for solo dev — this is informational only.

| Current (MotW) | Proposed | Archetype |
|----------------|----------|-----------|
| `expert` | **The Researcher** | Academic/occult knowledge, methodical |
| `mundane` | **The Operative** | No special gifts, reliable field presence |
| `crooked` | **The Broker** | Criminal networks, morally flexible contacts |
| `initiate` | **The Sensitive** | Emerging supernatural awareness |
| `snoop` | **The Handler** | Intel, surveillance, information networks |
| `celebrity` | **The Face** | Social capital, resources, public access |

All six fit PORTAL's cold-agency tone without implying MotW archetypes.

---

### Monster moves — reactive system (Sprint 4)

**Decision:** Build a reactive move system for investigation-phase misses. Design spec added to BACKLOG.md Sprint 4. Inspired by `keeper_moves` in `data/portal-entities.json`.

Eszter's moves already mapped:
- "Appear without warning at a location tied to the promise" → `{ type: 'clockAdvance', amount: 2 }` or narrative
- "Harm someone who stands between Bálint and the promise" → `{ type: 'hunterHarm', amount: 1 }`
- "Manifest the weight of obligation on the hunters" → `{ type: 'staminaDrain', amount: 1 }`

**Pending design:** what `MoveEffect` types are needed across all 9 mysteries. `portal-entities.json` has `keeper_moves` for all entities — that's the source of truth for each mystery's move list.

---

### Luck consequences system (Sprint 4)

**Decision:** Approved. 1–2 luck spends per mystery (exact limit TBD). Exceeding the limit triggers a bad event drawn from a consequence table.

Examples discussed: police arrive at location, bystanders start questioning/recording, hunters lose remaining scene actions, a found clue is contested and must be re-discovered.

**Open design questions:**
- Per-hunter limit or per-mission limit shared across the team?
- What does the consequence table look like — built-in generic list, or per-mystery custom list?
- Does pushing luck always trigger a consequence, or only when the limit is exceeded?

---

### Free-text tests for simulation (Sprint 4)

**Decision:** Build a solid test suite. Three items:
1. `valid-actions.test.ts` — `freeTextExploit` appears in valid actions when `freeTextExploits` exist on mystery
2. `runner.test.ts` — `free-text` strategy completes all 9 mysteries without throwing
3. AI tests (Ollama-based) — skip gracefully if Ollama isn't running; test `interpretActionWithAI` against live model when `OLLAMA_URL` is set

---

### E2E tests

**Decision:** Can begin now, not a Phase G gate. Start with the happy path: login → briefing → investigation → confrontation → field report.

---

### requiredClueIds on freeTextExploits — UI display

**Decision:** Keep the field in JSON. Future use: show in ConfrontationScreen free-text preview panel ("Clues that strengthen this approach: …") so players feel rewarded for thorough investigation, without being blocked if they want to guess. Not enforced by engine.

---

### Death rate — reporter.ts corrected

**Decision:** 5–10% target confirmed. `reporter.ts` updated (`<= 0.1`). SIMULATION.md reverted. mystery-001 at 18% is now flagged OUT OF RANGE — needs `monster.harm` reduction or more investigation-phase healing options in Phase G tuning.

---

## What's In Good Shape

- **Engine:** 543 tests passing, all pure, deterministic, simulatable. No known bugs.
- **Context file accuracy:** All major context files now match actual code state.
- **Simulation strategy descriptions:** Accurately reflect current shouldConfront and shouldSpendLuck logic.
- **Mystery-001:** Structurally sound; all clues reachable; balance validated (greedy 95%, balanced 70%).
- **Free-text pipeline:** Documented, tested, and correctly described as non-clue-gated.
- **AI infrastructure:** Sprint 2+3 complete; opt-in via `?ai=1`; 47 tests covering client, parser, prompts, telemetry.
- **Design docs:** Two completed design docs archived. Root directory is cleaner.
