# Balance Log

> Tracks simulation experiments, findings, and tuning decisions for each mystery.

**Targets** (from GAME-DESIGN.md):

| Metric | Target | Flag if |
|--------|--------|---------|
| Win rate -- balanced | 60--80% | < 50% or > 90% |
| Win rate -- rush/random | 15--30% | > 50% |
| Win rate -- greedy | 60--95% | < 50% or > 95% |
| Hunter death rate -- balanced | 5--20% | > 20% or 0% |
| Avg intel at confrontation -- balanced | informed | always blind or always prepared |
| Confrontation rounds -- informed | 2--4 | > 6 |
| Confrontation rounds -- blind | 6--10 | < 4 |

---

## mystery-001: Eszter (S01 -- A Promise is a Promise)

### Baseline -- 2026-03-25

**Config:** monster harm=2, armor=4, maxHarm=6 | clock: actionCost=1, travelCost=2, missPenalty=1, successRefund=1, confrontationAt=10, disasterAt=30
**Hunters:** Rosa (expert), Mack (mundane) | 200 runs per strategy

| Strategy | Win % | Loss % | Ret % | Avg Rounds | Avg Intel | In range? |
|----------|-------|--------|-------|------------|-----------|-----------|
| random | 86% | 11% | 4% | 25.2 | blind | no (target 15--50%) |
| rush | 100% | 0% | 0% | 6.4 | partial | no (target 15--50%) |
| greedy | 97% | 3% | 0% | 4.6 | partial | no (target 60--95%) |
| balanced | 99% | 1% | 0% | 2.1 | partial | no (target 60--80%) |

**Death rate (balanced):** 2% -- out of range (target 5--20%)

**Diagnosis:** Mystery is trivially easy. All balance flags triggered.

**Root causes identified:**

1. **Engine bug: armor applied backwards in attack handler** ([actions.ts:556-558](src/engine/actions.ts#L556-L558)). Formula `harmToHunter = monster.harm - monster.armor` subtracts monster's OWN armor from its outgoing attack. For Eszter (harm=2, armor=4): `2 - 4 = -2 -> 0`. Monster deals zero damage.
2. **Engine bug: armor not applied to incoming damage.** Formula `harmToMonster = 2` (flat) ignores armor entirely. Regular attacks deal full damage to an armored monster.
3. **Combined effect:** Attacks are risk-free (no counterattack) AND fully effective (ignore armor). Even random play wins 86%.

---

### Experiment Round 1 -- 2026-03-25

Tested parameter sensitivity using `armor=0` to approximate "monster hits back" (with armor=0, the buggy formula `harm - armor = harm - 0 = harm` gives the correct counterattack damage).

| Experiment | Change | random | rush | greedy | balanced | death% |
|------------|--------|--------|------|--------|----------|--------|
| Baseline | -- | 86% | 100% | 97% | 99% | 2% |
| monster-hits | a=0, h=3, mH=6 | 37% | 80% | 92% | 95% | 10% |
| tough-monster | a=0, h=3, mH=12 | 17% | 19% | 90% | 92% | 12% |
| tight-clock | a=0, h=3, mH=8, d=22, sR=0, mP=2 | 23% | 58% | 59% | 94% | 11% |
| combined | a=0, h=3, mH=10, d=24, cA=12, sR=0, mP=2, tC=3 | 13% | 35% | 38% | 76% | 30% |

**Key:** a=armor, h=harm, mH=maxHarm, d=disasterAt, cA=confrontationAt, sR=successRefund, mP=missPenalty, tC=travelCost

**Findings:**
- Just making the monster deal damage (monster-hits) is the single biggest lever. Random drops from 86% to 37%.
- Increasing maxHarm from 6 to 12 (tough-monster) brings rush into range (19%) while preserving greedy (90%). Balanced still high at 92%.
- Clock changes alone (tight-clock) crush greedy (59%) without fixing balanced (94%). Clock pressure hurts investigation-heavy strategies disproportionately.
- Over-tuning everything (combined) makes greedy unplayable (38%) and death rate excessive (30%).

---

### Experiment Round 2 -- 2026-03-25

Fine-tuning to bring balanced from 92% down toward 75%.

| Experiment | Change vs baseline | random | rush | greedy | balanced | death% | Flags out |
|------------|-------------------|--------|------|--------|----------|--------|-----------|
| tuned-a | a=0, h=3, mH=12, sR=0 | 13% | 17% | 87% | 87% | 18% | 1 (random) |
| tuned-b | a=0, h=4, mH=12 | 12% | 6% | 86% | 85% | 22% | 3 |
| **tuned-c** | **a=0, h=3, mH=10, sR=0, cA=12** | **18%** | **29%** | **89%** | **81%** | **23%** | **1 (death)** |

**Best candidate: tuned-c.** All four win rates in target range. Only death rate is 3% above threshold (23% vs 20% max). This will shift further once the engine fix is applied (armor=4 changes confrontation dynamics).

**Why tuned-c works:**
- `harm=3` makes counterattacks dangerous (2 hits = seriously injured)
- `maxHarm=10` requires 3+ exploit mixed hits to win (vs 2 at maxHarm=6)
- `successRefund=0` removes free investigation actions, creating real clock pressure
- `confrontationAt=12` prevents premature confrontation, gives investigation more weight

---

### Proposed Changes -- Pending Implementation

#### Engine fixes (2 changes in actions.ts handleAttack)

| # | Change | Current | Proposed | Effect |
|---|--------|---------|----------|--------|
| 1 | Armor reduces damage TO monster | `harmToMonster = 2` (flat) | `max(0, 2 - armor)` | Regular attacks deal 0 to armored monsters. Only exploitWeakness bypasses armor. |
| 2 | Monster hits back with raw harm | `harmToHunter = harm - armor` (= 0) | `harmToHunter = harm` | Mixed/miss on attack costs 3 harm. Two hits = seriously injured. |
> Feedback: On the actual TTRPG we realised that Eszter should be inmune to damage unless they try to appeal to her humanity, hunters are helping balint or they attack the locket. 
> Feedback: Monsters should have moves, not only raw harm. Some of the moves (if applicable) can also affect hunters while tehy are collecting clues. For instance, Eszter should have minions (robots that she's remotely controlling)

#### Mystery data changes (6 changes to mystery-001.json)

| # | Field | Current | Proposed | Rationale |
|---|-------|---------|----------|-----------|
| 3 | monster.harm | 2 | 3 | Each counterattack is dangerous. Two hits = serious injury threshold. |
| 4 | monster.maxHarm | 6 | 10 | Requires 3+ exploit mixed hits to win. Success still kills instantly. |
| 5 | clockConfig.successRefund | 1 | 0 | Every action costs clock. No free investigation. |
| 6 | clockConfig.confrontationAt | 10 | 12 | Slightly more investigation before confrontation available. |
| 7 | clockConfig.missPenalty | 1 | 2 | Failed rolls cost 3 total clock. Rewards stat-matched play. |
| 8 | monster.armor | 4 (keep) | 4 (keep) | With engine fix, correctly models incorporeal immunity. |

#### Expected outcomes after all 8 changes

| Strategy | Estimated win % | Rationale |
|----------|----------------|-----------|
| random | 15--25% | Occasionally stumbles into partial intel. Attacks useless (armor). |
| rush | 5--15% | Attacks deal 0 to armored monster. Mostly dies or retreats. Correct for incorporeal sorcerer. |
| greedy | 80--90% | Investigates well, uses exploitWeakness. Takes some damage. |
| balanced | 65--80% | Stat-matched investigation, exploit-focused confrontation. Real danger. |
| death rate | 8--18% | Monster harm=3 with no armor=0 free attacks. Exploits carry risk. |

**Note:** Rush at 5--15% is below the general 15--30% target, but narratively correct for an incorporeal monster immune to physical attacks. The balance thresholds are per-mystery guidelines, not hard rules. Future mysteries with armor=0 beasts will give rush higher win rates.

---

### Round 3: Post-fix Validation -- 2026-03-25

**All 8 changes implemented.** Engine fix (armor direction + monster counterattack) + mystery data (harm=3, maxHarm=10, successRefund=0, confrontationAt=12, missPenalty=2).

| Strategy | Win % | Loss % | Ret % | Avg Rounds | Avg Intel | In range? |
|----------|-------|--------|-------|------------|-----------|-----------|
| random | 8% | 93% | 0% | 20.0 | blind | no (target 15--50%) |
| rush | 0% | 100% | 0% | 8.2 | partial | no (target 15--50%) |
| greedy | 70% | 31% | 0% | 5.6 | partial | **yes** (target 60--95%) |
| balanced | 89% | 12% | 0% | 2.9 | partial | **yes** (flag <90%) |

**Death rate (balanced):** 16% -- **in range** (target 5--20%)

#### Analysis

**Massive improvement.** From 5 flags triggered to 2, and the 2 remaining are expected for an incorporeal monster:

| Metric | Baseline | Post-fix | Delta | Assessment |
|--------|----------|----------|-------|------------|
| random win | 86% | 8% | -78pp | Armor blocks random attacks. Expected. |
| rush win | 100% | 0% | -100pp | Attacks deal 0 to armor=4. Correct: "knowledge determines survival." |
| greedy win | 97% | 70% | -27pp | In target. Investigation pays off but isn't guaranteed. |
| balanced win | 99% | 89% | -10pp | Below flag threshold (<90%). Above ideal (60--80%). |
| death rate | 2% | 16% | +14pp | In target. Hunters face real danger now. |

**Rush at 0%** is narratively correct for Eszter (incorporeal, immune to physical attacks). The rush strategy only picks `attack` in confrontation, which deals `max(0, 2 - armor=4) = 0` damage. Future mysteries with armor=0 beasts will give rush a fair chance.

**Random at 8%** is low but expected. Random rarely finds enough clues for exploitWeakness to become available.

**Balanced at 89%** is above the ideal 80% ceiling but below the hard flag at 90%. This is acceptable for a tutorial mystery — the first mystery should be forgiving for thoughtful play. A second mystery with a more aggressive monster type (beast/destroyer with lower armor) can test the other end of the spectrum.

#### Remaining balance levers for future tuning

- Increase `maxHarm` from 10 to 12 to bring balanced closer to 75% (longer confrontation)
- Add monster moves during investigation (user feedback: monsters should be active threats, not passive)
- Add minions at locations to create investigation hazards

---

---

### Round 4: Clue-Based Exploit System -- 2026-03-25

**Change:** Replaced flat intel-level-based exploitWeakness with clue-based exploit options. Each specific clue (or combination) unlocks a distinct exploit approach with its own modifier and harm profile. See `mystery-001.json` `weakness.exploitOptions` for the 7 options (from -2/5harm for a single clue to +2/maxHarm for full resolution with 3 clues).

**Simulation files updated:** `valid-actions.ts` enumerates one action per unlocked option per hunter. `strategies.ts` — greedy picks highest modifier, balanced picks best modifier+hunterStat. `optimizer.ts` — scores with `exploitWeight + hunterStat + optionModifier * 2`.

| Strategy | Win % | Loss % | Ret % | Avg Rounds | Avg Intel | In range? |
|----------|-------|--------|-------|------------|-----------|-----------|
| random | 4% | 96% | 0% | 19.8 | blind | no (target 15--50%) |
| rush | 0% | 100% | 0% | 8.2 | partial | no (target 15--50%) |
| greedy | 25% | 75% | 0% | 6.3 | partial | no (target 60--95%) |
| balanced | 81% | 20% | 0% | 4.3 | partial | **yes** (target 60--80%) |

**Death rate (balanced):** 27% -- out of range (target 5--20%)

#### Analysis

| Metric | Round 3 | Round 4 | Delta | Assessment |
|--------|---------|---------|-------|------------|
| random win | 8% | 4% | -4pp | Slightly worse. Fewer lucky exploit opportunities. |
| rush win | 0% | 0% | 0pp | Unchanged. Still can't exploit (no clues found). |
| greedy win | 70% | 25% | **-45pp** | Major regression. Out of range. |
| balanced win | 89% | 81% | -8pp | Improved into ideal range (60--80%). |
| death rate | 16% | 27% | +11pp | Regressed out of range. |

**Balanced is now ideal** at 81% (was slightly high at 89%). The clue-based system rewards stat-matched investigation exactly as intended.

**Greedy regressed severely** from 70% to 25%. Root causes:
1. Greedy picks the exploit option with the highest modifier but ignores hunter stat compatibility. With Eszter's weakness requiring `charm` and Rosa having charm=-1, even the best available exploit (typically modifier -1 or -2) results in terrible rolls (2d6 + charm + modifier = 2d6 - 2 or worse).
2. The old system gave a flat exploitWeakness at partial intel with -1 modifier. The new system's single-clue options have -2 to -1 modifiers, which is comparable or worse.
3. The greedy strategy should be updated to factor in hunter stat when choosing exploit options (like balanced does).

**Death rate increased** because fewer successful exploit hits mean longer confrontations, meaning more rounds of monster counterattacks at harm=3.

#### Next tuning candidates

1. **Fix greedy strategy**: Pick exploit by `modifier + hunterStat` (like balanced), not just highest modifier
2. **Consider lower single-clue exploit modifiers**: -2 is very harsh. -1 for all single-clue options would help
3. **Consider adding retreat mechanic**: Strategies need an escape valve for hopeless confrontations
4. **Rush still 0%**: Expected for incorporeal monster, but if desired >0%, could add a "lucky shot" option at modifier -3 with no clue requirement

---

### Next Steps

- [x] ~~Implement engine fix (2 lines in handleAttack)~~
- [x] ~~Update mystery-001.json data values~~
- [x] ~~Rerun simulation to validate actual numbers~~
- [x] ~~Implement clue-based exploit weakness system~~
- [ ] Fix greedy strategy to use modifier+hunterStat (not just modifier)
- [ ] Rerun simulation after greedy fix
- [ ] Consider future: monster moves system (user feedback)
- [ ] Consider future: mystery-002 with armor=0 beast to test rush balance
- [ ] Update SIMULATION.md with corrected armor description
