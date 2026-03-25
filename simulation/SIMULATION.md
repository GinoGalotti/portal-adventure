# Simulation System

> Reference for designing experiments and devising strategies for the portal-adventure game balance validator.

---

## How It Works

The simulation runs complete mystery playthroughs headlessly using a **Strategy** object to make every decision. No UI, no network — pure engine calls.

```
createInitialState(seed)
  → startMystery({ definition, hunters })
  → INVESTIGATION LOOP (strategy.shouldConfront / strategy.pickAction / strategy.shouldSpendLuck)
  → startConfrontation
  → CONFRONTATION LOOP (strategy.pickAction / strategy.shouldSpendLuck)
  → endMystery({ outcome })
  → RunResult { pre, post, actionLog, durationMs }
```

**Determinism:** same seed + same strategy params = identical run. Different strategy params cascade into different action choices, which consume the seeded RNG differently, producing different dice rolls and outcomes. This is how the optimizer explores the space.

**Safety valves:** investigation auto-confronts at 200 actions or `isDisasterReached`; confrontation force-retreats at 50 actions.

---

## CLI Quick Reference

```bash
# Default: all strategies vs mystery-001, 100 runs each, Expert + Mundane
npm run simulate

# Quick (100 runs — same as default)
npm run simulate:quick

# Specific strategy and run count
npm run simulate -- --mystery mystery-001 --strategy balanced --runs 500

# Multiple strategies
npm run simulate -- --strategy random,rush,greedy,balanced --runs 200

# Single verbose run (shows pre/post snapshots)
npm run simulate -- --seed abc123 --strategy balanced --verbose

# Run an experiment file
npm run simulate -- --experiment simulation/experiments/baseline.json

# Compare two experiments
npm run simulate -- --compare simulation/experiments/baseline.json simulation/experiments/high-armor.json

# Save results as JSON
npm run simulate -- --output reports/sim-001.json

# Optimizer: find best general strategy params
npm run simulate -- --optimize --mystery mystery-001 --generations 30

# Optimizer: find best path for one specific seed
npm run simulate -- --optimize-seed abc123 --mystery mystery-001 --trials 500
```

---

## Strategies

| Name | `shouldConfront` trigger | Investigation style | Confrontation style | Luck spending |
|------|--------------------------|---------------------|---------------------|---------------|
| `random` | only when disaster | uniform random pick | uniform random | never |
| `greedy` | intel ≥ informed OR clock ≥ 70% | investigate > interview > deepSearch; richest location first | exploitWeakness → attack | on miss |
| `rush` | as soon as `confrontationAt` reached | one action per location; travels to unvisited first | always attack | never |
| `balanced` | intel ≥ partial OR clock ≥ 60% | stat-matched (sharp→investigate, charm→interview); heals seriously-injured hunters | exploitWeakness → defend-if-hurt → attack-by-tough | on miss during confrontation |

**Interpretation:**
- `random` is the floor. High win rate here = mystery is too easy at a structural level.
- `rush` is the blindness test. High win rate here = confrontation doesn't require knowledge.
- `greedy` is the ceiling. If `greedy` still loses often, the mystery may be unsolvable.
- `balanced` is the player proxy. Target win rate 60–80%.

---

## Balance Thresholds

From `GAME-DESIGN.md`:

| Metric | Target | Flag if |
|--------|--------|---------|
| Win rate — balanced | 60–80% | < 50% or > 90% |
| Win rate — rush/random | 15–30% | > 50% |
| Hunter death rate — balanced | 5–10% per hunter | > 20% or 0% |
| Avg intel at confrontation — balanced | informed | always blind or always prepared |
| Confrontation actions — informed | 2–4 rounds | > 6 |
| Confrontation actions — blind | 6–10 rounds | < 4 |

---

## Experiment Config Format

Stored in `simulation/experiments/*.json`. All fields:

```jsonc
{
  "name": "my-experiment",                         // display name
  "description": "What this tests",               // optional

  // Mystery to play
  "mysteryPath": "data/mysteries/mystery-001.json",

  // Optional: override parts of the mystery without editing the JSON
  "mysteryOverrides": {
    "monster": {
      "armor": 6,                                  // change any MonsterDef field
      "maxHarm": 8,
      "harm": 3
    },
    "clockConfig": {
      "disasterAt": 20,                            // change any ClockConfig field
      "confrontationAt": 8,
      "travelCost": 3,
      "actionCost": 2,
      "missPenalty": 2,
      "successRefund": 0
    }
  },

  // Hunter team (looked up from data/playbooks.json)
  "hunters": [
    {
      "playbookId": "expert",                      // must match a playbook id
      "name": "Rosa",                              // optional display name
      "statOverrides": { "sharp": 3, "tough": 0 } // optional: override any stat
    },
    { "playbookId": "mundane", "name": "Mack" }
  ],

  // Which strategies to test
  "strategies": ["random", "rush", "greedy", "balanced"],

  // How many runs per strategy (more = more reliable stats, slower)
  "runsPerStrategy": 200,

  // Seed prefix for deterministic seed generation: "${prefix}-${stratName}-${i}"
  // Change this between experiments to test different RNG sequences
  "seedPrefix": "exp-v1",

  // Optional: wire to optimizer after running
  "optimize": {
    "generations": 30,
    "samplesPerCandidate": 20,
    "mutationRate": 0.2
  }
}
```

### Available playbook IDs
`expert`, `mundane`, `crooked`, `initiate`, `snoop`, `celebrity`

### Available strategy names
`random`, `rush`, `greedy`, `balanced`

---

## Mystery Overrides Levers

Everything under `mysteryOverrides` lets you test hypotheses without modifying the source JSON.

### Monster levers
| Field | Default (mystery-001) | Effect of increasing |
|-------|-----------------------|----------------------|
| `armor` | 4 | Harder to damage; regular attack deals `max(0, 2 - armor)` = 0 currently; only `exploitWeakness` bypasses armor (deals `maxHarm` on success) |
| `maxHarm` | 6 | More total damage required to win; longer confrontations |
| `harm` | 2 | More damage per monster hit; hunters die faster |

### Clock levers
| Field | Default | Effect of increasing |
|-------|---------|----------------------|
| `disasterAt` | 30 | More time before forced confrontation; allows deeper investigation |
| `confrontationAt` | 10 | More clock required before confrontation is allowed |
| `travelCost` | 2 | Travel eats clock faster; fewer locations visited |
| `actionCost` | 1 | Each action costs more clock |
| `missPenalty` | 1 | Miss rolls penalised more; failed investigation punished harder |
| `successRefund` | 1 | Success refunds less clock; high skill still uses time |

---

## Optimizer: StrategyParams

The `ParameterizedStrategy` is controlled by 14 continuous weights. The optimizer tunes these.

| Param | Range | Effect |
|-------|-------|--------|
| `unvisitedWeight` | 0–10 | How strongly to prefer unvisited locations when choosing travel |
| `clueRichnessWeight` | 0–10 | How strongly to prefer locations with undiscovered clues |
| `safetyWeight` | -5–+5 | Positive = avoid dangerous locations; negative = seek them |
| `investigatePreference` | 0–10 | Base score for picking `investigate` action |
| `interviewPreference` | 0–10 | Base score for picking `interview` action |
| `deepSearchWillingness` | 0–10 | Willingness to spend stamina on `deepSearch` |
| `restThreshold` | 0–7 | Heal when hunter harm ≥ this value |
| `minIntelForConfront` | 0–3 | Minimum intel rank before confronting (0=blind, 1=partial, 2=informed, 3=prepared) |
| `clockPressureThreshold` | 0–1 | Confront when `clockValue / disasterAt ≥ this` |
| `attackWeight` | 0–10 | Weight for `attack` during confrontation |
| `defendWeight` | 0–10 | Weight for `defend`; scaled up when hunter is hurt |
| `exploitWeight` | 0–10 | Weight for `exploitWeakness` when available |
| `luckOnMiss` | 0–1 | Probability of spending luck on a miss (deterministic via action count) |
| `luckOnMixed` | 0–1 | Probability of spending luck on a mixed result |

---

## Scoring Weights

Used by `scoreRun()` to evaluate optimizer fitness. Defaults:

```typescript
{
  win: 100,                              // outcome score
  retreat: 20,
  loss: 0,
  perClue: 5,                            // per clue found at confrontation start
  intelBonus: {
    blind: 0, partial: 10, informed: 25, prepared: 40,
  },
  perHarmPenalty: -3,                    // per harm point on each hunter at end
  perLuckRemaining: 2,                   // per remaining luck point at end
  perDeadHunter: -50,                    // per dead hunter at end
  efficiencyBonus: 1,                    // per confrontation action under 30
}
```

Pass custom weights to `scoreRun(result, { win: 200, perDeadHunter: -100 })` to bias the optimizer toward different objectives (e.g. "survive at all costs" vs "win efficiently").

---

## Existing Experiments

| File | What it tests | Key difference from baseline |
|------|---------------|------------------------------|
| `baseline.json` | Expert + Mundane, mystery-001 default | Reference point for all comparisons |
| `three-hunters.json` | Expert + Mundane + Initiate | Does a 3-hunter team break balance? |
| `high-armor.json` | Eszter with armor 6 (was 4) | Is she too tanky with more armor? |
| `tight-clock.json` | disasterAt=20 (was 30) | Does less investigation time force better confrontation balance? |

---

## Designing New Experiments (for Opus)

### Good experiment questions

- **Composition:** Does swapping Expert for Crooked (charm+2 instead of sharp+2) meaningfully change outcomes? Try `{ playbookId: "crooked" }` replacing Expert.
- **Armor scaling:** Where is the armor crossover point where `rush` win rate drops below 30%? Binary search: try armor 2, 4, 6, 8.
- **Clock tightness:** What `disasterAt` value puts `balanced` win rate in the 60–80% target band?
- **Monster lethality:** What `harm` value produces ~5–10% hunter death rate with `balanced`?
- **Intel gating:** What happens if the key clues all require `success` rolls? Add `minRollOutcome: "success"` to all `key` clues.

### Experiment design tips

1. **Change one thing at a time.** A clean delta between experiments requires a single variable change.
2. **Run 200+ per strategy** for stable win rates. 100 runs has ±10% variance; 200 runs has ±7%.
3. **Always include `balanced` and `rush`** — they bracket the expected player experience.
4. **Use `seedPrefix`** to change the RNG sequence between experiments so you're not testing one lucky batch of seeds.
5. **Compare, don't just run.** Use `--compare` to get a diff table rather than reading numbers side by side.
6. **Flag the finding.** The balance flag system catches out-of-range rates automatically — read the `⚠` lines first.

### Red flags in results

- **rush win rate > 50%:** Confrontation doesn't punish going in blind — add armor, increase maxHarm, or increase monster harm.
- **balanced win rate > 90%:** Mystery is too easy overall — tighten the clock or increase monster lethality.
- **random win rate > 60%:** The mystery has no meaningful strategy — investigation may be trivially winnable by luck.
- **avg confrontation actions < 2 for any strategy:** Monster dies in one round — increase maxHarm or armor.
- **hunter death rate = 0% for balanced:** Players never feel threatened — increase monster harm.
- **all strategies at ~same win rate:** Strategy doesn't matter — investigation and confrontation may be decoupled from each other.
