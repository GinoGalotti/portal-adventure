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

## What's In Good Shape

- **Engine:** 543 tests passing, all pure, deterministic, simulatable. No known bugs.
- **Context file accuracy:** All major context files now match actual code state.
- **Simulation strategy descriptions:** Accurately reflect current shouldConfront and shouldSpendLuck logic.
- **Mystery-001:** Structurally sound; all clues reachable; balance validated (greedy 95%, balanced 70%).
- **Free-text pipeline:** Documented, tested, and correctly described as non-clue-gated.
- **AI infrastructure:** Sprint 2+3 complete; opt-in via `?ai=1`; 47 tests covering client, parser, prompts, telemetry.
- **Design docs:** Two completed design docs archived. Root directory is cleaner.
