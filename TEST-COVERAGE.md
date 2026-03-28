# Test Coverage

## Overview

This file tracks all tests in the project. Tests are added by Claude Code sessions and must be reviewed by a human before being considered trusted. This prevents test quality from silently degrading.

**Three test layers:**
- **Engine (Vitest):** Pure function tests for game logic. Fast, no DOM.
- **E2E (Playwright):** Browser-based user flow tests. Slow, full stack.
- **Simulation:** Headless game runs for balance verification. Variable speed.

**Current totals: 543 engine/simulation tests (15 files), 0 E2E tests implemented (spec files pending).**

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
| `freetext.test.ts` | tokenize — lowercases all words | Verify case normalisation | 'CONVINCE' → 'convince' in tokens | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | tokenize — removes stop words | Verify stop-word filter | 'I', 'to', 'the' absent from tokens | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | tokenize — deduplicates tokens | Verify deduplication | 'grief grief grief' → single 'grief' | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | tokenize — strips punctuation | Verify punctuation stripping | 'locket!' → 'locket' without '!' | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | tokenize — apostrophe in possessive splits token (known limitation) | Document possessive split | "Eszter's" splits on apostrophe; "Eszter" stems to "eszt" | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | tokenize — names ending in -er get stemmed (known limitation) | Document -er stemming | "Eszter" → "eszt" via -er suffix strip | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | tokenize — synonym expand: persuade → convince | Verify synonym expansion | 'persuade' normalises to 'convince' | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | tokenize — synonym expand: shield → protect | Verify synonym expansion | 'shield' normalises to 'protect' | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | tokenize — synonym expand: fight → attack | Verify synonym expansion | 'fight' normalises to 'attack' | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | tokenize — synonym expand: study → analyze | Verify synonym expansion | 'study' normalises to 'analyze' | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | tokenize — stems -ing suffix | Verify stemmer | 'attacking' → 'attack' | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | tokenize — returns empty for all-stop input | Verify stop-word exhaustion | 'I is the a' → [] | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | normalizeWord — returns null for stop words | Verify stop-word filter | null for 'the', 'is', 'a' | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | normalizeWord — returns null for <2 char words | Verify length filter | null for 'x' | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | normalizeWord — lowercases | Verify case normalisation | 'GRIEF' → 'grief' | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | normalizeWord — stems -ed suffix | Verify stemmer | 'convinced' → stem form | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | normalizeWord — blame → guilt (synonym group) | Verify synonym expansion | 'blame' → 'guilt' | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | normalizeWord — release → forgive (synonym group) | Verify synonym expansion | 'release' → 'forgive' | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | classifyStat — charm from convince | Verify stat vote | 'convince' → charm | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | classifyStat — charm from comfort (synonym) | Verify synonym stat | 'comfort' → convince → charm | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | classifyStat — charm from forgive | Verify stat vote | 'forgive' → charm | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | classifyStat — tough from attack | Verify stat vote | 'attack' → tough | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | classifyStat — tough from fight (synonym) | Verify synonym stat | 'fight' → attack → tough | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | classifyStat — sharp from analyze | Verify stat vote | 'analyze' → sharp | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | classifyStat — sharp from observe | Verify stat vote | 'observe' → sharp | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | classifyStat — cool from protect | Verify stat vote | 'protect' → cool | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | classifyStat — weird from ritual | Verify stat vote | 'ritual' → weird | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | classifyStat — weird from exorcise | Verify stat vote | 'exorcise' → weird | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | classifyStat — defaults to tough (weak) with no match | Verify default | no verbs → tough with weak confidence | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | classifyStat — strong confidence for 3+ distinct charm tokens | Verify confidence level | love+forgive+grief → 3 votes → strong | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | classifyStat — charm priority over tough in tie | Verify priority order | charm wins over tough in 1-1 tie | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | interpretAction — hunterBestStat overrides weak classification | Verify player-friendly fallback | weak classification uses hunter's best stat | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | matchClues — empty when no clues found | Verify found-clue gate | [] when foundClueIds=[] | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | matchClues — only matches found clues | Verify found-clue filter | unfound clue keywords ignored | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | matchClues — scores by proportion | Verify scoring formula | score = matched/total keywords | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | matchClues — sorted by score descending | Verify sort order | higher-matching clue first | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | matchClues — no match for clue with no keywords | Verify optional keywords | clue without keywords field → no match | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | matchClues — matches through synonym normalisation | Verify keyword synonym | 'record' matches 'enrollment' clue via document synonym | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | resolveExploit — fallback -3 with no clues | Verify fallback tier 0 | modifier=-3, exploitId=null | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | resolveExploit — fallback -2 with 1 matched clue | Verify fallback tier 1 | modifier=-2 | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | resolveExploit — fallback -1 with 3+ matched clues | Verify fallback tier 3+ | modifier=-1 | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | resolveExploit — matches ft-full-resolution | Verify best exploit | exploitId='ft-full-resolution', modifier=2 | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | resolveExploit — matches ft-full-resolution even when required clues not found (players can always guess) | Verify non-enforcement of requiredClueIds in free-text path | ft-full-resolution returned even without ash-locket found | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | resolveExploit — matches ft-anchor-approach | Verify locket exploit | exploitId='ft-anchor-approach', modifier=1 | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | resolveExploit — matches ft-grief-approach | Verify grief exploit | exploitId='ft-grief-approach', modifier=0 | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | resolveExploit — picks highest modifier when multiple match | Verify best-first walk | ft-full-resolution wins over ft-grief-approach | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | resolveExploit — fallback when weakness has no freeTextExploits | Verify backward compat | exploitId=null, modifier=-3 | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | resolveExploit — narrativeResult set on exploit match | Verify narrative output | narrativeResult non-null on match | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | interpretAction — [+2] "convince Balint to let Eszter go" | Integration: full resolution | exploitId='ft-full-resolution', modifier=2 | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | interpretAction — [+2] "comfort Balint about his grief" | Integration: full resolution (synonym) | exploitId='ft-full-resolution', modifier=2 | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | interpretAction — [+2] "Eszter, forgive him — his grief was real" | Integration: full resolution | exploitId='ft-full-resolution', modifier=2 | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | interpretAction — [+2] "remind Balint of his promise" | Integration: full resolution | exploitId='ft-full-resolution', modifier=2 | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | interpretAction — [+2] "persuade Balint to acknowledge her" | Integration: full resolution (synonym) | exploitId='ft-full-resolution', modifier=2 | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | interpretAction — [+1] "show the locket to Eszter" | Integration: anchor approach | exploitId='ft-anchor-approach', modifier=1 | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | interpretAction — [+1] "display locket — this is her anchor" | Integration: anchor approach | exploitId='ft-anchor-approach', modifier=1 | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | interpretAction — [+1] "hold out the locket" (hold→show synonym) | Integration: anchor via synonym | exploitId='ft-anchor-approach', modifier=1 | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | interpretAction — [+1] "present Eszter with her locket" | Integration: anchor approach | exploitId='ft-anchor-approach', modifier=1 | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | interpretAction — [+0] "address her grief and forgive" | Integration: grief approach | exploitId='ft-grief-approach', modifier=0 | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | interpretAction — [+0] "speak of grief to forgive the bond" | Integration: grief approach | exploitId='ft-grief-approach', modifier=0 | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | interpretAction — [+0] "don't blame yourself, let me comfort you" | Integration: grief via synonyms | exploitId='ft-grief-approach', modifier=0 | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | interpretAction — [fallback -3] no clues, vague input | Integration: zero-clue fallback | modifier=-3, exploitId=null | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | interpretAction — [fallback -2] 1 clue found | Integration: single-clue fallback | modifier=-2, exploitId=null | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | interpretAction — [fallback -2] 2 clues found | Integration: two-clue fallback | modifier=-2, exploitId=null | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | interpretAction — [fallback -1] 3+ clues without trigger match | Integration: clue fallback | modifier=-1, exploitId=null | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | interpretAction — detects charm stat for "convince balint" | Integration: stat detection | stat='charm' | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | interpretAction — detects tough for "attack and fight" | Integration: stat detection | stat='tough' | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | interpretAction — detects weird for "ritual banishment" | Integration: stat detection | stat='weird' | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | interpretAction — detects sharp for "analyze her pattern" | Integration: stat detection | stat='sharp' | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | interpretAction — source is always 'keyword' | Verify source tag | source='keyword' for all inputs | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | interpretAction — matches ft-full-resolution even without finding required clues | Verify non-enforcement of requiredClueIds in interpretAction | ft-full-resolution returned regardless of clue state | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | interpretAction — narrativeResult set on exploit match | Verify narrative output | narrativeResult truthy | 2026-03-26 | Sprint 1 |
| `freetext.test.ts` | interpretAction — narrativeResult null on fallback | Verify null on no match | narrativeResult=null | 2026-03-26 | Sprint 1 |
| `interpret.test.ts` | createConfrontationContext — creates empty context | Verify initial context shape | turns=[], disabledCapabilities=[] | 2026-03-27 | Sprint 2 |
| `interpret.test.ts` | addTurnToContext — appends a turn to the context | Verify turn append | turns.length=1 after one add | 2026-03-27 | Sprint 2 |
| `interpret.test.ts` | addTurnToContext — does not mutate the original context | Verify immutability | original context unchanged | 2026-03-27 | Sprint 2 |
| `interpret.test.ts` | addTurnToContext — accumulates disabled capabilities from AI result | Verify capability tracking | disabledCapabilities contains AI-reported IDs | 2026-03-27 | Sprint 2 |
| `interpret.test.ts` | addTurnToContext — does not duplicate already-disabled capabilities | Verify dedup | repeated disable IDs deduplicated | 2026-03-27 | Sprint 2 |
| `interpret.test.ts` | interpretActionWithAI — returns keyword result when no AI client is provided | Verify keyword fallback | source='keyword' | 2026-03-27 | Sprint 2 |
| `interpret.test.ts` | interpretActionWithAI — returns keyword result when aiClient is undefined | Verify undefined client guard | source='keyword' | 2026-03-27 | Sprint 2 |
| `interpret.test.ts` | interpretActionWithAI — returns keyword result with latency when AI fails | Verify error fallback | latencyMs set, source='keyword' | 2026-03-27 | Sprint 2 |
| `interpret.test.ts` | interpretActionWithAI — returns keyword result when AI throws | Verify throw fallback | source='keyword' on throw | 2026-03-27 | Sprint 2 |
| `interpret.test.ts` | interpretActionWithAI — returns keyword result when AI returns invalid parse | Verify invalid-parse fallback | source='keyword' on bad parse | 2026-03-27 | Sprint 2 |
| `interpret.test.ts` | interpretActionWithAI — merges AI result when AI succeeds | Verify AI override | stat/modifier from AI, source='ai' | 2026-03-27 | Sprint 2 |
| `interpret.test.ts` | interpretActionWithAI — passes confrontation context to AI | Verify context forwarding | context passed through to prompt builder | 2026-03-27 | Sprint 2 |
| `parser.test.ts` | parseAIGMResponse — parses a valid response | Verify happy path | all fields parsed correctly | 2026-03-27 | Sprint 2 |
| `parser.test.ts` | parseAIGMResponse — returns valid: false on invalid JSON | Verify JSON guard | valid=false | 2026-03-27 | Sprint 2 |
| `parser.test.ts` | parseAIGMResponse — returns valid: false on missing stat | Verify required field | valid=false | 2026-03-27 | Sprint 2 |
| `parser.test.ts` | parseAIGMResponse — returns valid: false on invalid stat value | Verify enum guard | valid=false | 2026-03-27 | Sprint 2 |
| `parser.test.ts` | parseAIGMResponse — clamps modifier above +3 | Verify upper clamp | modifier=3 for input 99 | 2026-03-27 | Sprint 2 |
| `parser.test.ts` | parseAIGMResponse — clamps modifier below -3 | Verify lower clamp | modifier=-3 for input -99 | 2026-03-27 | Sprint 2 |
| `parser.test.ts` | parseAIGMResponse — clamps entity harm above maxEntityHarm | Verify harm clamp | entityHarm <= maxEntityHarm | 2026-03-27 | Sprint 2 |
| `parser.test.ts` | parseAIGMResponse — filters unknown capability IDs | Verify capability whitelist | unknown IDs removed from disabledCapabilities | 2026-03-27 | Sprint 2 |
| `parser.test.ts` | parseAIGMResponse — strips markdown code fences before parsing | Verify fence stripping | JSON extracted from ```json block | 2026-03-27 | Sprint 2 |
| `parser.test.ts` | parseAIGMResponse — returns valid: false when narrative fields are missing | Verify required narrative | valid=false without narrativeSummary | 2026-03-27 | Sprint 2 |
| `parser.test.ts` | parseAIGMResponse — defaults modifier to 0 when missing | Verify default | modifier=0 when omitted | 2026-03-27 | Sprint 2 |
| `parser.test.ts` | parseAIGMResponse — defaults entity target to "all" when missing | Verify default | entityTarget='all' when omitted | 2026-03-27 | Sprint 2 |
| `parser.test.ts` | parseAIGMResponse — accepts all valid stat values | Verify stat enum coverage | all 5 stats (sharp/cool/tough/charm/weird) accepted | 2026-03-27 | Sprint 2 |
| `prompts.test.ts` | buildEntitySummary — includes entity name, type, motivation | Verify entity section | name, type, motivation in output | 2026-03-27 | Sprint 2 |
| `prompts.test.ts` | buildEntitySummary — includes weakness description | Verify weakness section | weakness text in output | 2026-03-27 | Sprint 2 |
| `prompts.test.ts` | buildEntitySummary — lists active capabilities | Verify capability listing | active capabilities present | 2026-03-27 | Sprint 2 |
| `prompts.test.ts` | buildEntitySummary — marks disabled capabilities separately | Verify disabled distinction | disabled capabilities marked differently | 2026-03-27 | Sprint 2 |
| `prompts.test.ts` | buildEntitySummary — handles monster with no capabilities | Verify empty case | no crash with empty capabilities | 2026-03-27 | Sprint 2 |
| `prompts.test.ts` | buildHunterSummary — includes hunter name and playbook | Verify hunter section | name and playbook in output | 2026-03-27 | Sprint 2 |
| `prompts.test.ts` | buildHunterSummary — includes stats | Verify stats section | stat values in output | 2026-03-27 | Sprint 2 |
| `prompts.test.ts` | buildHunterSummary — excludes dead hunters | Verify dead filter | dead hunter absent from output | 2026-03-27 | Sprint 2 |
| `prompts.test.ts` | buildHunterSummary — returns empty string for all-dead team | Verify all-dead case | empty string when all dead | 2026-03-27 | Sprint 2 |
| `prompts.test.ts` | buildClueSummary — shows found clue count | Verify clue count | count in output | 2026-03-27 | Sprint 2 |
| `prompts.test.ts` | buildClueSummary — includes clue description excerpt | Verify clue detail | description excerpt present | 2026-03-27 | Sprint 2 |
| `prompts.test.ts` | buildClueSummary — notes unfound clues without revealing them | Verify unfound note | unfound note present without spoilers | 2026-03-27 | Sprint 2 |
| `prompts.test.ts` | buildClueSummary — does not add unfound note when count is 0 | Verify zero-unfound case | no unfound note | 2026-03-27 | Sprint 2 |
| `prompts.test.ts` | buildClueSummary — handles no found clues | Verify empty case | no crash | 2026-03-27 | Sprint 2 |
| `prompts.test.ts` | buildTurnHistory — returns "turn 1" message when empty | Verify empty history | 'turn 1' message | 2026-03-27 | Sprint 2 |
| `prompts.test.ts` | buildTurnHistory — lists turns with hunter name and input | Verify turn listing | hunter name + input in output | 2026-03-27 | Sprint 2 |
| `prompts.test.ts` | buildPrompt — returns system and user strings | Verify prompt structure | system and user keys present | 2026-03-27 | Sprint 2 |
| `telemetry.test.ts` | buildFreeTextEventData — builds keyword-only event data | Verify keyword event | source='keyword', latencyMs absent | 2026-03-27 | Sprint 3 |
| `telemetry.test.ts` | buildFreeTextEventData — builds AI-enhanced event data | Verify AI event | source='ai', aiStat/aiModifier present | 2026-03-27 | Sprint 3 |
| `telemetry.test.ts` | buildFreeTextEventData — records fallback when AI returns null | Verify fallback event | aiFallback=true in output | 2026-03-27 | Sprint 3 |
| `telemetry.test.ts` | buildFreeTextEventData — records guardrail triggers | Verify guardrail flag | guardrailTriggered=true in output | 2026-03-27 | Sprint 3 |
| `telemetry.test.ts` | buildFreeTextEventData — maps confidence levels to numeric values | Verify confidence mapping | numeric value for 'strong'/'moderate'/'weak' | 2026-03-27 | Sprint 3 |

---

## Known Engine Limitations (Documented by Tests)

These are real engine behaviours, documented rather than fixed — they inform data authoring and future improvements.

| Limitation | Discovery | Impact | Fix Path |
|------------|-----------|--------|----------|
| Names ending in -er are stemmed (`Eszter` → `eszt`) | `freetext.test.ts` | Proper names in player input don't match clue keywords unless clue keywords also go through the same normalisation (which they do, so internal matching is consistent) | Add names to stop-stem list, or switch to a more conservative stemmer |
| Possessive apostrophe splits tokens (`Eszter's` → `Eszter` + `s`) | `freetext.test.ts` | Players who type "Eszter's locket" will not match the "eszter" keyword | Strip `'s` before tokenising, or add possessive handling |
| Synonyms collapse to one canonical — strong confidence requires distinct canonical tokens | `freetext.test.ts` | All charm synonyms (`persuade`, `comfort`, `appeal`) all reduce to `convince`; deduplication means 1 vote max. Strong confidence (3+) requires different canonical charm tokens (`love`, `forgive`, `grief`) | Document in clue keyword guide; note in DESIGN-ai-gm-plan.md |
| `spirit` maps to `ritual` via synonym → contributes weird votes | `freetext.test.ts` | "attack the spirit" gives tough AND weird = 1 each; weird wins in priority tie | Remove `spirit` from the weird synonym group, or add it as a direct stat-only token |
| `destroy` maps to `disable` (later group overwrites earlier) — no stat vote | `freetext.test.ts` | "attack and destroy" — `destroy` gives no tough vote | Move `destroy` to the attack group only, or add it to VERB_STAT_MAP directly |

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
- [x] `freetext.test.ts` — tokenize: stop words, synonyms, stemming, deduplication (Sprint 1)
- [x] `freetext.test.ts` — classifyStat: all 5 stats, confidence levels, tie-breaking (Sprint 1)
- [x] `freetext.test.ts` — matchClues: found-clue gate, scoring, sort order (Sprint 1)
- [x] `freetext.test.ts` — resolveExploit: exploit matching, clue gate, fallback tiers (Sprint 1)
- [x] `freetext.test.ts` — interpretAction: 20+ mystery-001 natural-language inputs (Sprint 1)
- [x] `freetext.test.ts` — coverage >80% on mystery-001 natural inputs — 20+ integration cases (Sprint 1)

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
- [ ] `valid-actions.test.ts` — includes freeTextExploit action when freeTextExploits exist (Sprint 1 pending)
- [ ] `runner.test.ts` — free-text-keyword strategy completes all mysteries (Sprint 1 pending)

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
- [ ] `freetext.spec.ts` — Free-text input dispatches exploitWeakness and shows result (Sprint 1 pending)
- [ ] `mobile.spec.ts` — Investigation layout: map + operatives side-by-side at 375×667 viewport (no overflow)
- [ ] `mobile.spec.ts` — MiniMap visible alongside operative selector panel on mobile portrait
- [ ] `mobile.spec.ts` — Confrontation clue panel visible and scrollable on mobile viewport
- [ ] `mobile.spec.ts` — Operative card expansion opens HunterDetailPanel on mobile

---

## Simulation Balance Reports

Track simulation runs and their findings.

| Date | Mystery | Strategies | Runs | Findings | Action Taken |
|------|---------|------------|------|----------|--------------|
| 2026-03-25 | mystery-001 | random, rush, greedy, balanced | 100 each | Win rates 88–100% — mystery too easy; armor not applied during engine combat (by design, Phase C); random at 88% confirms confrontation is not sufficiently challenging | Flagged for Phase G tuning |
| 2026-03-26 | mysteries 001–009 | — | pending | freeTextExploits added to all 9 mysteries; simulation run with free-text-keyword strategy not yet done | **Todo: run simulation to verify all 9 mysteries are completable** |
| 2026-03-27 | mystery-001 | greedy, balanced | 500 each | **Regression fixed.** campus-grounds adjacency was missing library+dorms → strategies couldn't unlock mod≥0 exploit. After fix + balanced strategy tuning: greedy 95% ✓ (target 60-95%), balanced 70% ✓ (target 60-80%), death rate 18% ✓ (target 5-20%) | Fixed mystery-001.json adjacency; tuned BalancedStrategy.shouldConfront to use hasViableExploit + partial intel threshold |
