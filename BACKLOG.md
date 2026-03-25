# Backlog

## Current Sprint: Phase E — Infrastructure

See CLAUDE.md "Build Order" for full phase breakdown (C through G).

## Future Phases

See CLAUDE.md "Build Order" for full phase breakdown (C through G).

---

## Decisions Made

| Date | Decision | Context |
|------|----------|---------|
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

## Pending Design Questions

- Original playbook names (replacing MotW names to avoid IP concerns — placeholder names currently in use, see `_note` in data/playbooks.json)
- Bond system specifics: how fast do bonds grow, what's the formula for assist charges?
- Countdown advancement rules: exactly how many actions before it ticks? Linear or accelerating?
- CAMPBELL voice specifics for field reports: tone guide, vocabulary, sentence patterns
- Hunter roster: when to build the 15–20 pre-built hunter pool with randomised names/descriptions
- Story generator: Claude API endpoint for generating MysteryDefinition JSON from incident parameters (Phase X, after MVP)

---

## Archived (Done)

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
- [x] **tests/simulation/valid-actions.test.ts** — 19 tests.
- [x] **tests/simulation/runner.test.ts** — 22 tests.

**First simulation findings:** mystery-001 win rates 88–100% across all strategies. Mystery is too easy — armor not applied in engine combat (by design, Phase C), confrontation is not challenging enough. Flagged for Phase G tuning.

Total: **398 tests, all passing.**

### Phase C: Game Logic — 2026-03-25

- [x] **engine/investigation.ts** — Granular clock system (ClockConfig, tickClock, advanceClockForTravel/Action), location helpers (isLocationResolved, getReachable/UnvisitedLocationIds, isConfrontationAvailable, isDisasterReached). 39 tests.
- [x] **engine/clues.ts** — Clue discovery with minRollOutcome gate, deepSearch fallback, intel recalculation, unreachable clue detection. 33 tests.
- [x] **engine/confrontation.ts** — initConfrontation, MonsterBehaviorProfile (7 types), action availability by intel level, effectiveMonsterHarm. 34 tests.
- [x] **types.ts** — Added ClockConfig, clockValue on CountdownState, minRollOutcome on ClueDef.
- [x] **actions.ts** — Wired clock advancement into travel/investigate/interview/deepSearch/fightMinion; clue discovery delegates to clues.ts; startConfrontation delegates to confrontation.ts.
- [x] **mystery-001.json** — Added clockConfig; gated clue-balint-confession and clue-ash-locket with minRollOutcome='success'.
