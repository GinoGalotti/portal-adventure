# Test Coverage

## Overview

This file tracks all tests in the project. Tests are added by Claude Code sessions and must be reviewed by a human before being considered trusted. This prevents test quality from silently degrading.

**Three test layers:**
- **Engine (Vitest):** Pure function tests for game logic. Fast, no DOM.
- **E2E (Playwright):** Browser-based user flow tests. Slow, full stack.
- **Simulation:** Headless game runs for balance verification. Variable speed.

---

## Reviewed Tests

Tests that have been manually reviewed for correctness, intent, and quality.

| Test File | Test Name | Intent | Expected Outcome | Reviewed | Reviewer | Date |
|-----------|-----------|--------|-------------------|----------|----------|------|
| _(none yet)_ | | | | | | |

---

## New Tests (Pending Review)

Tests added by Claude Code sessions that haven't been reviewed yet. After review, move to the "Reviewed" table above with reviewer name and date.

| Test File | Test Name | Intent | Expected Outcome | Added | Session |
|-----------|-----------|--------|-------------------|-------|---------|
| _(none yet)_ | | | | | |

---

## Expected Test Inventory (Phase A–G)

Tests that should exist by the end of MVP. Check off as they are implemented.

### Engine Unit Tests (Vitest)

- [ ] `rng.test.ts` — Same seed always produces same sequence
- [ ] `rng.test.ts` — Different seeds produce different sequences
- [ ] `rng.test.ts` — roll2d6 returns values in 2–12 range with correct distribution
- [ ] `state.test.ts` — Replay of action log produces state identical to live play
- [ ] `state.test.ts` — Partial replay to step N matches live state at step N
- [ ] `state.test.ts` — Empty action log produces valid initial state
- [ ] `actions.test.ts` — Each action type resolves without error
- [ ] `actions.test.ts` — Invalid actions are rejected gracefully
- [ ] `actions.test.ts` — Debug-tagged actions are filterable
- [ ] `hunters.test.ts` — Hunter creation from each playbook produces valid stats
- [ ] `hunters.test.ts` — Harm thresholds trigger correct conditions (4+ injured, 6+ serious, 7 dead)
- [ ] `hunters.test.ts` — Luck spending upgrades roll tier correctly
- [ ] `hunters.test.ts` — Luck at 0 cannot be spent
- [ ] `hunters.test.ts` — Experience gained from failed rolls
- [ ] `investigation.test.ts` — All clues in mystery are reachable by some action path
- [ ] `investigation.test.ts` — Scene actions reset on location change
- [ ] `investigation.test.ts` — Stamina depletion doesn't block scene actions
- [ ] `investigation.test.ts` — Countdown advances correctly (after AP/stamina thresholds)
- [ ] `clues.test.ts` — Intel level thresholds match design doc (0–1=blind, 2–3=partial, 4–5=informed, 6+=prepared)
- [ ] `clues.test.ts` — Duplicate clues don't double-count
- [ ] `confrontation.test.ts` — Roll outcomes map to correct tiers (6-=miss, 7-9=mixed, 10+=success)
- [ ] `confrontation.test.ts` — Weakness exploitation modifiers apply per intel level
- [ ] `confrontation.test.ts` — Monster behavior varies by type
- [ ] `confrontation.test.ts` — Harm application is correct
- [ ] `debug.test.ts` — Each debug command produces expected state change
- [ ] `debug.test.ts` — Debug actions are tagged debug:true in action log
- [ ] `debug.test.ts` — forceRoll overrides next roll only

### Simulation Tests (Vitest)

- [ ] `strategies.test.ts` — Each strategy produces valid action sequences (no illegal moves)
- [ ] `strategies.test.ts` — Random strategy completes mysteries without crashing
- [ ] `strategies.test.ts` — Greedy-clues strategy achieves higher intel than random (on average)

### E2E Tests (Playwright)

- [ ] `login.spec.ts` — Create account, login, see save slot screen
- [ ] `login.spec.ts` — Wrong password rejected
- [ ] `save-load.spec.ts` — Create save slot, play some actions, reload, state preserved
- [ ] `save-load.spec.ts` — Switch between save slots, each independent
- [ ] `mystery-flow.spec.ts` — Full mystery: briefing → investigation → confrontation → report
- [ ] `undo.spec.ts` — Undo reverses movement action
- [ ] `undo.spec.ts` — Undo blocked after dice roll
- [ ] `debug.spec.ts` — Debug panel opens with ?debug=1
- [ ] `debug.spec.ts` — Debug command executes and state updates

---

## Simulation Balance Reports

Track simulation runs and their findings.

| Date | Mystery | Strategies | Runs | Findings | Action Taken |
|------|---------|------------|------|----------|--------------|
| _(none yet)_ | | | | | |
