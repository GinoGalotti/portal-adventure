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
| `rng.test.ts` | same seed produces same sequence | Verify determinism | 1000 calls with same seed return identical values | 2026-03-25 | Phase A |
| `rng.test.ts` | different seeds produce different sequences | Verify seed independence | At least some values differ across 20 calls | 2026-03-25 | Phase A |
| `rng.test.ts` | replaying from saved state produces identical continuation | Verify state serialisation | 100-call continuation matches after setState restore | 2026-03-25 | Phase A |
| `rng.test.ts` | clone is identical and independent | Verify clone independence | 20-call sequence matches between original and clone | 2026-03-25 | Phase A |
| `rng.test.ts` | returns values in [0, 1) | Verify next() range | 10,000 calls all in [0,1) | 2026-03-25 | Phase A |
| `rng.test.ts` | nextInt returns values in [min, max] | Verify integer range | 5,000 calls all in [min, max] inclusive | 2026-03-25 | Phase A |
| `rng.test.ts` | nextInt covers full range | Verify full coverage | All values 1–6 seen after 10,000 calls | 2026-03-25 | Phase A |
| `rng.test.ts` | nextInt throws when min > max | Validate range error | throws RangeError | 2026-03-25 | Phase A |
| `rng.test.ts` | roll2d6 returns values in [2, 12] | Verify 2d6 range | 5,000 calls all in [2,12] | 2026-03-25 | Phase A |
| `rng.test.ts` | 7 is the most common result (bell curve) | Verify distribution shape | count[7] is max after 100,000 rolls | 2026-03-25 | Phase A |
| `rng.test.ts` | pick returns a value from the array | Verify pick membership | 100 calls all return values in array | 2026-03-25 | Phase A |
| `rng.test.ts` | shuffle returns a permutation | Verify shuffle correctness | sorted shuffle equals original | 2026-03-25 | Phase A |
| `hunters.test.ts` | creates hunter with playbook base stats | Verify createHunter | stats match playbook.baseStats | 2026-03-25 | Phase A |
| `hunters.test.ts` | starts at harm 0, luck 7, experience 0 | Verify initial values | harm=0, luck=7, exp=0 | 2026-03-25 | Phase A |
| `hunters.test.ts` | harm 0–3 → healthy | Verify harm threshold | conditions contain 'healthy' | 2026-03-25 | Phase A |
| `hunters.test.ts` | harm 4 → injured | Verify harm threshold | conditions contain 'injured' | 2026-03-25 | Phase A |
| `hunters.test.ts` | harm 7 → dead | Verify death threshold | conditions contain 'dead', alive=false | 2026-03-25 | Phase A |
| `hunters.test.ts` | applyHarm accumulates correctly | Verify accumulation | harm builds from 0→3→4→6→7 | 2026-03-25 | Phase A |
| `hunters.test.ts` | spendLuck decrements luck | Verify luck spending | luck decrements, success=true | 2026-03-25 | Phase A |
| `hunters.test.ts` | luck at 0 cannot be spent | Validate luck guard | success=false, luck stays 0 | 2026-03-25 | Phase A |
| `hunters.test.ts` | canAdvance is true at threshold | Verify advancement check | true when experience>=5 | 2026-03-25 | Phase A |
| `hunters.test.ts` | canDeploy — healthy/injured/dead cases | Verify deployability | healthy+injured=true, dead/serious/traumatized=false | 2026-03-25 | Phase A |
| `actions.test.ts` | applyAction does not mutate input state | Verify immutability | original state unchanged after action | 2026-03-25 | Phase A |
| `actions.test.ts` | startMystery transitions setup → investigation | Verify phase transition | phase='investigation' | 2026-03-25 | Phase A |
| `actions.test.ts` | startMystery throws on missing definition | Validate required payload | throws ActionError | 2026-03-25 | Phase A |
| `actions.test.ts` | travel sets currentLocationId | Verify travel effect | mystery.currentLocationId set | 2026-03-25 | Phase A |
| `actions.test.ts` | travel resets all hunter scene actions | Verify action reset | all hunters at maxSceneActions | 2026-03-25 | Phase A |
| `actions.test.ts` | investigate discovers clue on success | Verify clue discovery | clue in mystery.cluesFound | 2026-03-25 | Phase A |
| `actions.test.ts` | investigate gains experience on miss | Verify miss experience | hunter.experience = 1 | 2026-03-25 | Phase A |
| `actions.test.ts` | investigate throws when no scene actions remain | Validate action guard | throws ActionError | 2026-03-25 | Phase A |
| `actions.test.ts` | all debug action types throw without debug:true | Verify debug tag required | throws ActionError for each of 16 types | 2026-03-25 | Phase A |
| `actions.test.ts` | attack deals 2 harm to monster on success | Verify combat outcome | confrontation.monsterHarmTaken=2 | 2026-03-25 | Phase A |
| `actions.test.ts` | spendLuck upgrades outcome miss→mixed | Verify luck spending | lastRoll.outcome='mixed', luck-=1 | 2026-03-25 | Phase A |
| `actions.test.ts` | endMystery generates field report | Verify report generation | fieldReport not null, phase='fieldReport' | 2026-03-25 | Phase A |
| `actions.test.ts` | exploitWeakness throws at blind intel | Validate intel guard | throws ActionError | 2026-03-25 | Phase A |
| `actions.test.ts` | deepSearch costs stamina not scene action | Verify resource cost | staminaPool-=1, sceneActions unchanged | 2026-03-25 | Phase A |
| `actions.test.ts` | debug_revealAllClues marks all clues found | Verify debug command | all clues found, intelLevel='prepared' | 2026-03-25 | Phase A |
| `actions.test.ts` | debug_forceRoll clears after first use | Verify force-roll lifecycle | debugForceRollValue=null after next action | 2026-03-25 | Phase A |
| `state.test.ts` | empty action log returns valid initial state | Verify empty replay | phase='setup', actionCount=0 | 2026-03-25 | Phase A |
| `state.test.ts` | replay identity — same seed+actions = identical state | Verify deterministic replay | two deriveState calls produce equal states | 2026-03-25 | Phase A |
| `state.test.ts` | incremental apply equals full replay | Verify replay equivalence | step-by-step equals deriveState | 2026-03-25 | Phase A |
| `state.test.ts` | partial replay produces correct intermediate state | Verify partial replay | actionCount matches actions applied | 2026-03-25 | Phase A |
| `debug.test.ts` | revealAllClues marks all clues found | Verify debug function | all clues found, intelLevel='prepared' | 2026-03-25 | Phase A |
| `debug.test.ts` | setHunterHarm sets harm to exact value | Verify harm setter | hunter.harm=4, conditions contain 'injured' | 2026-03-25 | Phase A |
| `debug.test.ts` | setHunterHarm clamps to [0, 7] | Verify harm clamping | harm=7 for input 10, harm=0 for input -5 | 2026-03-25 | Phase A |
| `debug.test.ts` | skipToConfrontation transitions to confrontation | Verify phase skip | phase='confrontation', confrontation not null | 2026-03-25 | Phase A |
| `debug.test.ts` | forceRoll forces dice sum on next roll | Verify forced roll | roll outcome matches forced total + stat | 2026-03-25 | Phase A |
| `debug.test.ts` | killHunter marks hunter dead | Verify kill command | harm=7, alive=false, conditions contain 'dead' | 2026-03-25 | Phase A |
| `debug.test.ts` | completeCase generates field report | Verify completion command | fieldReport not null, phase='fieldReport' | 2026-03-25 | Phase A |
| `debug.test.ts` | all debug functions do not mutate input state | Verify immutability | original state unchanged after each debug fn | 2026-03-25 | Phase A |
| `investigation.test.ts` | DEFAULT_CLOCK_CONFIG has expected default values | Verify defaults | confrontationAt=10, disasterAt=30, 5 thresholds | 2026-03-25 | Phase C |
| `investigation.test.ts` | resolveClockConfig merges partial config with defaults | Verify partial override | merged values correct, unset keys use defaults | 2026-03-25 | Phase C |
| `investigation.test.ts` | clockCostForOutcome returns correct cost per outcome | Verify clock costs | miss=2, mixed=1, success=0 with defaults | 2026-03-25 | Phase C |
| `investigation.test.ts` | tickClock advances clockValue and triggers steps at thresholds | Verify threshold logic | steps triggered at correct clock values | 2026-03-25 | Phase C |
| `investigation.test.ts` | advanceClockForTravel adds travelCost | Verify travel cost | clockValue += travelCost | 2026-03-25 | Phase C |
| `investigation.test.ts` | advanceClockForAction accumulates correctly for travel+miss+mixed | Verify action costs | travel=2, mixed=3, miss=5 sequence | 2026-03-25 | Phase C |
| `investigation.test.ts` | isConfrontationAvailable true at confrontationAt | Verify confrontation gate | true when clock >= confrontationAt | 2026-03-25 | Phase C |
| `investigation.test.ts` | isDisasterReached true at disasterAt | Verify disaster gate | true when clock >= disasterAt | 2026-03-25 | Phase C |
| `investigation.test.ts` | isLocationResolved true when all clues found | Verify resolution check | true after revealAllClues | 2026-03-25 | Phase C |
| `investigation.test.ts` | getUnvisitedLocationIds excludes visited | Verify visit tracking | visited location absent from result | 2026-03-25 | Phase C |
| `investigation.test.ts` | getReachableLocationIds returns adjacent after travel | Verify adjacency | current + adjacent locations returned | 2026-03-25 | Phase C |
| `clues.test.ts` | isClueRevealedByOutcome: mixed does NOT reveal success-gated clue | Verify roll gate | false for minRollOutcome='success' on mixed | 2026-03-25 | Phase C |
| `clues.test.ts` | discoverClue finds ungated clue on mixed | Verify basic discovery | clue-easy found on mixed | 2026-03-25 | Phase C |
| `clues.test.ts` | discoverClue returns null for gated clue on mixed | Verify gate enforcement | null when only success-gated clue remains | 2026-03-25 | Phase C |
| `clues.test.ts` | discoverClue updates mystery.cluesFound and intelLevel | Verify side effects | cluesFound updated, intelLevel recalculated | 2026-03-25 | Phase C |
| `clues.test.ts` | discoverDeepSearchClue prefers deepSearch-specific clue | Verify priority | clue-deep found first | 2026-03-25 | Phase C |
| `clues.test.ts` | recalculateIntel thresholds match design doc | Verify intel bands | blind/partial/informed/prepared at 0-1/2-3/4-5/6+ | 2026-03-25 | Phase C |
| `clues.test.ts` | getUnreachableClueIds flags clues whose action not in availableActions | Verify data integrity helper | orphan clue flagged | 2026-03-25 | Phase C |
| `clues.test.ts` | gated clue found on success, not on mixed (integration) | Verify full flow via applyAction | clue-hard appears in cluesFound only after success roll | 2026-03-25 | Phase C |
| `confrontation.test.ts` | initConfrontation correct initial values | Verify initial state | harmTaken=0, defeated=false, round=1 | 2026-03-25 | Phase C |
| `confrontation.test.ts` | getMonsterBehaviorProfile returns profile for all 7 types | Verify coverage | all types have style and behaviourTags | 2026-03-25 | Phase C |
| `confrontation.test.ts` | beast is aggressive, alwaysCounterattacks=true | Verify beast profile | style=aggressive, alwaysCounterattacks=true | 2026-03-25 | Phase C |
| `confrontation.test.ts` | getAvailableConfrontationActions blind excludes exploitWeakness | Verify blind gate | exploitWeakness absent at blind | 2026-03-25 | Phase C |
| `confrontation.test.ts` | getAvailableConfrontationActions partial+ includes exploitWeakness | Verify unlock | exploitWeakness present at partial/informed/prepared | 2026-03-25 | Phase C |
| `confrontation.test.ts` | getConfrontationResult win when monster defeated | Verify win condition | 'win' when monsterDefeated=true | 2026-03-25 | Phase C |
| `confrontation.test.ts` | effectiveMonsterHarm clamps to 0 when armor >= harm | Verify armor clamping | 0 when armor=4, harm=2 | 2026-03-25 | Phase C |
| `confrontation.test.ts` | roll outcome tiers: 6-=miss, 7-9=mixed, 10+=success (integration) | Verify tier mapping via forced rolls | outcomes match at boundaries | 2026-03-25 | Phase C |
| `confrontation.test.ts` | monster harm accumulates across rounds | Verify accumulation | 2 attacks × 2 harm = 4 total | 2026-03-25 | Phase C |
| `confrontation.test.ts` | monster defeated when harmTaken >= maxHarm | Verify defeat condition | monsterDefeated=true after 3 success attacks | 2026-03-25 | Phase C |
| `valid-actions.test.ts` | returns travel to all locations before first move | Verify pre-travel enumeration | both loc-a and loc-b in travel actions | 2026-03-25 | Phase D |
| `valid-actions.test.ts` | includes investigate when location supports it and hunter has scene actions | Verify scene action enumeration | investigate action with hunterId='h1' present | 2026-03-25 | Phase D |
| `valid-actions.test.ts` | excludes deepSearch when staminaPool is 0 | Verify stamina gate | no deepSearch when stamina=0 | 2026-03-25 | Phase D |
| `valid-actions.test.ts` | excludes scene actions when hunter has no scene actions remaining | Verify scene action gate | no investigate/interview when sceneActionsRemaining=0 | 2026-03-25 | Phase D |
| `valid-actions.test.ts` | includes rest when hunter has harm | Verify rest availability | rest action present when harm > 0 | 2026-03-25 | Phase D |
| `valid-actions.test.ts` | excludes dead hunters from action list | Verify dead hunter filtering | no action with dead hunter's id | 2026-03-25 | Phase D |
| `valid-actions.test.ts` | excludes exploitWeakness at blind intel in confrontation | Verify blind gate | no exploitWeakness at blind | 2026-03-25 | Phase D |
| `valid-actions.test.ts` | includes exploitWeakness when intel is not blind | Verify unlock at partial+ | exploitWeakness present at partial | 2026-03-25 | Phase D |
| `valid-actions.test.ts` | returns empty array for non-gameplay phases | Verify phase guard | empty array in setup/fieldReport phases | 2026-03-25 | Phase D |
| `runner.test.ts` | completes without throwing (random strategy) | Smoke test | no throw | 2026-03-25 | Phase D |
| `runner.test.ts` | returns RunResult with all required fields | Verify output shape | seed, mysteryId, strategyName, pre, post, actionLog, durationMs | 2026-03-25 | Phase D |
| `runner.test.ts` | post.outcome is always win/loss/retreat | Verify outcome validity | outcome in allowed values across 5 runs | 2026-03-25 | Phase D |
| `runner.test.ts` | pre snapshot has correct hunter count | Verify snapshot shape | hunterStates.length=2 | 2026-03-25 | Phase D |
| `runner.test.ts` | pre snapshot cluesAvailable matches total mystery clues | Verify clue counting | cluesAvailable=3 for testDef | 2026-03-25 | Phase D |
| `runner.test.ts` | action log starts with startMystery | Verify log ordering | first action is startMystery | 2026-03-25 | Phase D |
| `runner.test.ts` | action log ends with endMystery | Verify log completeness | last action is endMystery | 2026-03-25 | Phase D |
| `runner.test.ts` | action log contains startConfrontation exactly once | Verify single confrontation | count of startConfrontation = 1 | 2026-03-25 | Phase D |
| `runner.test.ts` | action log is deterministic for same seed + strategy | Verify determinism | same outcome and log length on two identical runs | 2026-03-25 | Phase D |
| `runner.test.ts` | createStrategy() creates all named strategies | Verify registry | random/greedy/rush/balanced all instantiate | 2026-03-25 | Phase D |
| `runner.test.ts` | createStrategy() throws for unknown strategy name | Verify error handling | throws for 'unknown' | 2026-03-25 | Phase D |
| `runner.test.ts` | all strategies complete mystery-runner-test | Strategy smoke tests | no throws for all 4 strategies | 2026-03-25 | Phase D |

---

## Expected Test Inventory (Phase A–G)

Tests that should exist by the end of MVP. Check off as they are implemented.

### Engine Unit Tests (Vitest)

- [x] `rng.test.ts` — Same seed always produces same sequence
- [x] `rng.test.ts` — Different seeds produce different sequences
- [x] `rng.test.ts` — roll2d6 returns values in 2–12 range with correct distribution
- [x] `state.test.ts` — Replay of action log produces state identical to live play
- [x] `state.test.ts` — Partial replay to step N matches live state at step N
- [x] `state.test.ts` — Empty action log produces valid initial state
- [x] `actions.test.ts` — Each action type resolves without error
- [x] `actions.test.ts` — Invalid actions are rejected gracefully
- [x] `actions.test.ts` — Debug-tagged actions are filterable
- [x] `hunters.test.ts` — Hunter creation from each playbook produces valid stats
- [x] `hunters.test.ts` — Harm thresholds trigger correct conditions (4+ injured, 6+ serious, 7 dead)
- [x] `hunters.test.ts` — Luck spending upgrades roll tier correctly
- [x] `hunters.test.ts` — Luck at 0 cannot be spent
- [x] `hunters.test.ts` — Experience gained from failed rolls
- [x] `investigation.test.ts` — Clock advances correctly (travelCost, actionCost, missPenalty, successRefund) (Phase C)
- [x] `investigation.test.ts` — Countdown step triggers at correct thresholds (Phase C)
- [x] `investigation.test.ts` — isLocationResolved / getUnvisited / getReachableLocationIds (Phase C)
- [x] `investigation.test.ts` — isConfrontationAvailable / isDisasterReached (Phase C)
- [x] `clues.test.ts` — Intel level thresholds match design doc (0–1=blind, 2–3=partial, 4–5=informed, 6+=prepared) (Phase C)
- [x] `clues.test.ts` — Duplicate clues don't double-count (Phase C)
- [x] `clues.test.ts` — minRollOutcome gate: mixed does not reveal success-gated clues (Phase C)
- [x] `confrontation.test.ts` — Roll outcomes map to correct tiers (6-=miss, 7-9=mixed, 10+=success) (Phase C)
- [x] `confrontation.test.ts` — exploitWeakness unavailable at blind intel (Phase C)
- [x] `confrontation.test.ts` — Monster behavior varies by type (Phase C)
- [x] `confrontation.test.ts` — Harm accumulation and monster defeat detection (Phase C)
- [x] `debug.test.ts` — Each debug command produces expected state change
- [x] `debug.test.ts` — Debug actions are tagged debug:true in action log
- [x] `debug.test.ts` — forceRoll overrides next roll only

### Simulation Tests (Vitest)

- [x] `valid-actions.test.ts` — Returns travel actions before first move (Phase D)
- [x] `valid-actions.test.ts` — Returns scene actions for alive hunters with actions remaining (Phase D)
- [x] `valid-actions.test.ts` — Excludes deepSearch when stamina=0 (Phase D)
- [x] `valid-actions.test.ts` — Excludes dead hunters from action list (Phase D)
- [x] `valid-actions.test.ts` — excludes exploitWeakness at blind intel in confrontation (Phase D)
- [x] `valid-actions.test.ts` — Returns empty array for non-gameplay phases (Phase D)
- [x] `runner.test.ts` — All strategies complete mystery without throwing (Phase D)
- [x] `runner.test.ts` — RunResult has correct seed, mysteryId, strategyName (Phase D)
- [x] `runner.test.ts` — Post outcome is always win/loss/retreat (Phase D)
- [x] `runner.test.ts` — Pre snapshot has correct hunter count and cluesAvailable (Phase D)
- [x] `runner.test.ts` — Action log starts with startMystery, ends with endMystery (Phase D)
- [x] `runner.test.ts` — Action log is deterministic for same seed + strategy (Phase D)
- [x] `runner.test.ts` — createStrategy() throws for unknown strategy name (Phase D)

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
| 2026-03-25 | mystery-001 | random, rush, greedy, balanced | 100 each | Win rates 88–100% — mystery too easy; armor not applied during engine combat (by design, Phase C); random at 88% confirms confrontation is not sufficiently challenging | Flagged for Phase G tuning |
