---
name: simulate
description: Run mystery balance simulation and report results. Use when checking win/death rates for a specific mystery or all mysteries. Accepts optional mystery ID, strategy, and run count.
user_invocable: true
---

# Simulate Mystery Balance

Run the headless simulation for one or all mysteries and report the aggregate results.

## Usage

`/simulate [mystery-id] [strategy] [runs]`

- `mystery-id`: e.g. `mystery-001`, `mystery-006`, or `all` (default: `all`)
- `strategy`: `balanced`, `greedy`, `cautious`, or `freetext` (default: `balanced`)
- `runs`: number of simulation runs (default: `200`)

## Instructions

1. Parse the user's arguments. If no arguments, use defaults: all mysteries, balanced strategy, 200 runs.

2. Run the simulation using Bash:
   ```bash
   cd d:/Workspace/portal-adventure && npx tsx simulation/cli.ts --mystery <mystery-id> --strategy <strategy> --runs <runs>
   ```
   For "all" mysteries, omit the `--mystery` flag entirely.

3. Parse the output and present a summary table to the user:

   | Mystery | Win % | Death % | Win OK (50-90%) | Death OK (5-10%) |
   |---------|-------|---------|:---:|:---:|
   | 001     | 76%   | 14%     | ✅  | ⚠  |

4. Flag any mysteries outside target ranges:
   - Win rate target: 50-90%
   - Death rate target: 5-10% per hunter

5. If results are unexpected, suggest checking:
   - `simulation/strategies.ts` — `shouldConfront()` logic
   - Mystery JSON data — exploit options, harm values, clue requirements
   - `CLAUDE-troubleshooting.md` — "Simulation: Balance changes have no effect"

## Notes

- `confrontationAt` is UI-only and has NO effect on simulation results
- The balanced strategy confronts when: exploit viability (mod+stat >= 0) AND intel >= partial (2+ clues), OR clock >= 70% disaster
- Mysteries 006 (Shojo) and 008 (The Wake) are structurally hard — win/death rates are inversely coupled due to stat alignment
