# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## AI Guidance

* Ignore GEMINI.md and GEMINI-*.md files
* To save main context space, for code searches, inspections, troubleshooting or analysis, use code-searcher subagent where appropriate - giving the subagent full context background for the task(s) you assign it.
* ALWAYS read and understand relevant files before proposing code edits. Do not speculate about code you have not inspected. If the user references a specific file/path, you MUST open and inspect it before explaining or proposing fixes. Be rigorous and persistent in searching code for key facts. Thoroughly review the style, conventions, and abstractions of the codebase before implementing new features or abstractions.
* After receiving tool results, carefully reflect on their quality and determine optimal next steps before proceeding. Use your thinking to plan and iterate based on this new information, and then take the best next action.
* After completing a task that involves tool use, provide a quick summary of what you've done.
* For maximum efficiency, whenever you need to perform multiple independent operations, invoke all relevant tools simultaneously rather than sequentially.
* Before you finish, please verify your solution
* Do what has been asked; nothing more, nothing less.
* NEVER create files unless they're absolutely necessary for achieving your goal.
* ALWAYS prefer editing an existing file to creating a new one.
* NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
* If you create any temporary new files, scripts, or helper files for iteration, clean up these files by removing them at the end of the task.
* When you update or modify core context files, also update markdown documentation and memory bank
* When asked to commit changes, exclude CLAUDE.md and CLAUDE-*.md referenced memory bank system files from any commits. Never delete these files.

<investigate_before_answering>
Never speculate about code you have not opened. If the user references a specific file, you MUST read the file before answering. Make sure to investigate and read relevant files BEFORE answering questions about the codebase. Never make any claims about code before investigating unless you are certain of the correct answer - give grounded and hallucination-free answers.
</investigate_before_answering>

<do_not_act_before_instructions>
Do not jump into implementatation or changes files unless clearly instructed to make changes. When the user's intent is ambiguous, default to providing information, doing research, and providing recommendations rather than taking action. Only proceed with edits, modifications, or implementations when the user explicitly requests them.
</do_not_act_before_instructions>

<use_parallel_tool_calls>
If you intend to call multiple tools and there are no dependencies between the tool calls, make all of the independent tool calls in parallel. Prioritize calling tools simultaneously whenever the actions can be done in parallel rather than sequentially. For example, when reading 3 files, run 3 tool calls in parallel to read all 3 files into context at the same time. Maximize use of parallel tool calls where possible to increase speed and efficiency. However, if some tool calls depend on previous calls to inform dependent values like the parameters, do NOT call these tools in parallel and instead call them sequentially. Never use placeholders or guess missing parameters in tool calls.
</use_parallel_tool_calls>

## Memory Bank System

This project uses a structured memory bank system with specialized context files. Always check these files for relevant information before starting work:

### Core Context Files

* **CLAUDE-activeContext.md** - Current session state, goals, and progress (if exists)
* **CLAUDE-patterns.md** - Established code patterns and conventions (if exists)
* **CLAUDE-decisions.md** - Architecture decisions and rationale (if exists)
* **CLAUDE-troubleshooting.md** - Common issues and proven solutions (if exists)
* **CLAUDE-config-variables.md** - Configuration variables reference (if exists)
* **CLAUDE-temp.md** - Temporary scratch pad (only read when referenced)

**Important:** Always reference the active context file first to understand what's currently being worked on and maintain session continuity.

### Memory Bank System Backups

When asked to backup Memory Bank System files, you will copy the core context files above and @.claude settings directory to directory @/path/to/backup-directory. If files already exist in the backup directory, you will overwrite them.

## Claude Code Official Documentation

When working on Claude Code features (hooks, skills, subagents, MCP servers, etc.), use the `claude-docs-consultant` skill to selectively fetch official documentation from docs.claude.com.

## Project Overview

This is a roguelike mystery game set in the PORTAL universe. Read `GAME-DESIGN.md` for the full design document before making any architectural decisions.

**One-line summary:** Players manage field teams of supernatural hunters, investigate mysteries by gathering clues at locations, and confront monsters — where knowledge (not power) determines survival.

## Build & Test Commands

```bash
npm run test          # Vitest: all engine unit tests
npm run test:watch    # Vitest: watch mode during development
npm run simulate      # Headless simulation batch (Phase D+)
npx vitest run tests/engine/actions.test.ts   # Run a single test file
```

## Reference Repository

The PORTAL campaign app lives in a separate repo: `GinoGalotti/portal-fieldops`. That repo contains the source data this game draws from (playbook definitions, monster types, NPCs, story arcs). **This game repo is independent — copy and adapt data you need, don't import directly.** Game versions of playbooks will diverge from campaign reference data.

---

## Architectural Invariants

### 1. Deterministic Seeded RNG
- All randomness derives from a seed via deterministic PRNG (mulberry32)
- No `Math.random()` anywhere in game logic — ever
- `GameRNG` class: `.next()`, `.roll2d6()`, `.roll2d6Detailed()`, `.pick(array)`, `.shuffle(array)`, `.getState()`, `.setState()`, `.clone()`

### 2. Action Log Architecture
- Every player action is appended to an ordered action log
- Game state at any point = `reduce(actionLog, applyAction, initialState(seed))`
- Action entries: `{ type, payload, timestamp, debug? }`
- The engine is a pure function: `deriveState(seed, actions[]) → GameState`

### 3. Save = Seed + Action Log
- Auto-save writes each new action to D1
- Resume replays the action log against the seed
- Periodic state snapshots for performance (every ~20 actions)
- Undo = pop last action + replay from nearest snapshot (disabled past dice rolls)

### 4. Pure Engine
- `src/engine/` has zero imports from React, Zustand, Cloudflare, or any I/O library
- Pure TypeScript functions that take data and return data
- Testable, replayable, simulatable, and portable

### 5. i18n from Day One
- Zero hardcoded player-facing strings — everything through `i18next` translation keys

### 6. Telemetry from Day One
- Every decision point emits a telemetry event recording what was chosen AND what was available
- Fire-and-forget, never blocks gameplay
- Two consumers: aggregate analytics for game tuning + per-mystery narrative export for PORTAL canon

### 7. Debug Commands
- Full cheat/debug commands in `src/engine/debug.ts` as pure functions `(GameState) → GameState`
- Debug actions tagged `debug: true` in the action log
- Debug screen accessible via `?debug=1` URL param

---

## Tech Stack

- **Frontend:** React + Vite + TypeScript
- **Styling:** Tailwind CSS
- **State:** Zustand (fully serializable stores)
- **Backend:** Cloudflare Workers + D1 (SQLite at edge)
- **i18n:** i18next + react-i18next
- **Unit tests:** Vitest (`npm run test`)
- **E2E tests:** Playwright
- **Simulation:** Custom headless runner using the engine directly (`npm run simulate`)

---

## Engine API (Phase A — complete)

| File | Key exports |
|------|-------------|
| `src/engine/rng.ts` | `GameRNG` — seeded mulberry32 PRNG with state serialisation |
| `src/engine/types.ts` | All game types + pure utility functions (`getRollOutcome`, `conditionFromHarm`, `intelFromClueCount`, `exploitModifier`) |
| `src/engine/hunters.ts` | `createHunter`, `applyHarm`, `healHarm`, `spendLuck`, `gainExperience`, `canDeploy`, etc. |
| `src/engine/actions.ts` | `applyAction(state, action): GameState` — single-clone pure reducer; `ActionError` |
| `src/engine/state.ts` | `createInitialState(seed)`, `deriveState(seed, actions[])` |
| `src/engine/debug.ts` | All 16 debug commands as pure functions (e.g., `revealAllClues`, `skipToConfrontation`, `forceRoll`) |

### Key patterns

- **Single clone:** `applyAction` does one `structuredClone(state)` at entry; all handlers mutate the clone
- **RNG threading:** `GameRNG` is created from `state.rngState`, passed to handlers, final state captured at end
- **Force-roll debug:** `debugForceRollValue` distributes forced dice sum across two d6s; cleared after any non-forceRoll action consumes it
- **spendLuck:** `lastRoll` is preserved (not cleared) when processing `spendLuck` so it can read the previous roll
- **Confrontation intelLevel:** Set from `mystery.intelLevel` at `startConfrontation`; `debug_setIntelLevel` updates both

### Roll system (2d6 + stat)
- `6-` → miss; `7-9` → mixed; `10+` → success
- Luck pool (0–7, permanent, never regenerates) — spent AFTER seeing roll, upgrades one tier
- `exploitWeakness` requires non-blind intel; modifier: partial=-1, informed=0, prepared=+1

### Hunter harm thresholds
- 0–3 → healthy; 4–5 → injured; 6 → seriouslyInjured; 7 → dead (alive=false)

### Intel levels
- blind (0–1 clues), partial (2–3), informed (4–5), prepared (6+)

---

## Build Order (MVP)

### Phase A: Engine Foundation ✅ Complete
All 6 engine files written and tested (251 tests passing).

### Phase B: Content
- `data/playbooks.json` — 4 playbooks with original names (reference PORTAL repo, rename/adapt)
- `data/moves.json` — Shared + playbook-specific moves with game mechanics
- `data/mysteries/mystery-001.json` — First hand-authored mystery

### Phase C: Game Logic
- `engine/investigation.ts`, `engine/clues.ts`, `engine/confrontation.ts`

### Phase D: Simulation
- `simulation/runner.ts` + strategies + reporter + CLI

### Phase E: Infrastructure
- D1 schema + Worker endpoints, telemetry wiring, i18n extraction, sound manager

### Phase F: UI
- All React screens: login, save slots, briefing, investigation map, confrontation, field report

### Phase G: Second Mystery + Validation
- `mystery-002.json`, E2E tests, simulation validation

---

## Workflow

Claude Code sessions start with: "Read BACKLOG.md and pick up [Phase X]." Update BACKLOG.md and TEST-COVERAGE.md before finishing. Design docs go in repo root until implemented, then delete or archive.

## Key Principles

- **Engine is pure.** No React/DOM/Cloudflare imports in `src/engine/`.
- **UI is a view layer.** React reads Zustand stores that wrap the engine.
- **Content is data.** Mysteries, playbooks, moves — all JSON.
- **Simulate before shipping.** New mysteries get a simulation run before reaching players.
- **Debug commands are features.** They power development, testing, and simulation.
- **Simulation coverage is mandatory.** Any new lever added to mysteries (monster fields, clock config fields, clue fields, location fields) MUST be documented in `simulation/SIMULATION.md` under the appropriate "Levers" section AND must be expressible via `mysteryOverrides` in experiment configs. New engine mechanics that affect investigation or confrontation outcomes must be exercisable headlessly — no lever may be UI-only or simulation-blind.

## ALWAYS START WITH THESE COMMANDS FOR COMMON TASKS

**Task: "List/summarize all files and directories"**

```bash
fd . -t f           # Lists ALL files recursively (FASTEST)
# OR
rg --files          # Lists files (respects .gitignore)
```

**Task: "Search for content in files"**

```bash
rg "search_term"    # Search everywhere (FASTEST)
```

**Task: "Find files by name"**

```bash
fd "filename"       # Find by name pattern (FASTEST)
```

### Directory/File Exploration

```bash
# FIRST CHOICE - List all files/dirs recursively:
fd . -t f           # All files (fastest)
fd . -t d           # All directories
rg --files          # All files (respects .gitignore)

# For current directory only:
ls -la              # OK for single directory view
```

### BANNED - Never Use These Slow Tools

* ❌ `tree` - NOT INSTALLED, use `fd` instead
* ❌ `find` - use `fd` or `rg --files`
* ❌ `grep` or `grep -r` - use `rg` instead
* ❌ `ls -R` - use `rg --files` or `fd`
* ❌ `cat file | grep` - use `rg pattern file`

### Use These Faster Tools Instead

```bash
# ripgrep (rg) - content search 
rg "search_term"                # Search in all files
rg -i "case_insensitive"        # Case-insensitive
rg "pattern" -t py              # Only Python files
rg "pattern" -g "*.md"          # Only Markdown
rg -1 "pattern"                 # Filenames with matches
rg -c "pattern"                 # Count matches per file
rg -n "pattern"                 # Show line numbers 
rg -A 3 -B 3 "error"            # Context lines
rg " (TODO| FIXME | HACK)"      # Multiple patterns

# ripgrep (rg) - file listing 
rg --files                      # List files (respects •gitignore)
rg --files | rg "pattern"       # Find files by name 
rg --files -t md                # Only Markdown files 

# fd - file finding 
fd -e js                        # All •js files (fast find) 
fd -x command {}                # Exec per-file 
fd -e md -x ls -la {}           # Example with ls 

# jq - JSON processing 
jq. data.json                   # Pretty-print 
jq -r .name file.json           # Extract field 
jq '.id = 0' x.json             # Modify field
```

### Search Strategy

1. Start broad, then narrow: `rg "partial" | rg "specific"`
2. Filter by type early: `rg -t python "def function_name"`
3. Batch patterns: `rg "(pattern1|pattern2|pattern3)"`
4. Limit scope: `rg "pattern" src/`

### INSTANT DECISION TREE

```
User asks to "list/show/summarize/explore files"?
  → USE: fd . -t f  (fastest, shows all files)
  → OR: rg --files  (respects .gitignore)

User asks to "search/grep/find text content"?
  → USE: rg "pattern"  (NOT grep!)

User asks to "find file/directory by name"?
  → USE: fd "name"  (NOT find!)

User asks for "directory structure/tree"?
  → USE: fd . -t d  (directories) + fd . -t f  (files)
  → NEVER: tree (not installed!)

Need just current directory?
  → USE: ls -la  (OK for single dir)
```
