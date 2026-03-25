# Initial Session Prompt

Copy-paste this into Claude Code when starting the first session. Delete this file after use.

---

Read CLAUDE.md and GAME-DESIGN.md fully before doing anything.

This is a new project — nothing exists yet except these design documents, BACKLOG.md, and TEST-COVERAGE.md. The companion repo `GinoGalotti/portal-fieldops` contains reference data (playbook definitions, moves, monster types, world lore) in its `src/data/` directory — read its structure and key JSON files to understand the source material, but do not create any dependency on it.

Your job for this session is **Phase A: Engine Foundation** from the build order in CLAUDE.md. Specifically:

1. **Initialize the project.** Set up the repo with Vite + React + TypeScript, install dependencies (zustand, i18next, react-i18next, vitest, tailwindcss, wrangler, @playwright/test), configure vitest and tsconfig. Create the folder structure from CLAUDE.md.

2. **Build `src/engine/rng.ts`** — A seeded deterministic PRNG class (`GameRNG`). Methods needed: `next()` (0-1 float), `nextInt(min, max)`, `roll2d6()`, `pick(array)`, `shuffle(array)`. No `Math.random()` anywhere. Write tests in `tests/engine/rng.test.ts` proving determinism (same seed → same sequence) and correct ranges.

3. **Build `src/engine/types.ts`** — All core type definitions based on GAME-DESIGN.md: Hunter, Playbook, PlaybookStats, Mystery, Monster, MonsterType, Motivation, Weakness, Location, Clue, IntelLevel, Action, ActionEntry, GameState, SaveSlot, TelemetryEvent, SimulationReport, CountdownState, HunterCondition, etc. Be thorough — these types are the contract the entire codebase builds on.

4. **Build `src/engine/actions.ts`** — Action type definitions (all action types from the design doc), and the core reducer: `applyAction(state: GameState, action: ActionEntry): GameState`. Write tests proving each action type resolves without error and invalid actions are rejected.

5. **Build `src/engine/state.ts`** — The `deriveState(seed: string, actions: ActionEntry[]): GameState` function that replays an action log from an initial state. Write tests proving: replay produces state identical to sequential application, partial replay to step N matches, empty log produces valid initial state.

6. **Build `src/engine/hunters.ts`** — Hunter creation from playbook data, stat calculations, harm/luck/condition tracking functions. Write tests for harm thresholds (4+ injured, 6+ serious, 7 dead), luck spending, experience from failed rolls.

7. **Build `src/engine/debug.ts`** — All debug commands from GAME-DESIGN.md as pure functions that take a GameState and return a modified GameState. Debug actions should be tagged `{ debug: true }` in the action log. Write tests for each command.

After implementation:

- Run all tests and make sure they pass.
- Update BACKLOG.md: check off Phase A tasks, move Phase B to "Current Sprint."
- Update TEST-COVERAGE.md: add all new tests to the "New Tests (Pending Review)" section with test file, test name, intent, and expected outcome.
- Note any design questions that came up during implementation in BACKLOG.md under "Pending Design Questions."

Do not start Phase B (content) or build any UI. This session is engine foundation only.
