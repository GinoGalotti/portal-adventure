# CLAUDE.md — PORTAL Field Operations Game

## Project Overview

This is a roguelike mystery game set in the PORTAL universe. Read `GAME-DESIGN.md` for the full design document before making any architectural decisions.

**One-line summary:** Players manage field teams of supernatural hunters, investigate mysteries by gathering clues at locations, and confront monsters — where knowledge (not power) determines survival.

## Reference Repository

The PORTAL campaign app lives in a separate repo: `GinoGalotti/portal-fieldops`. That repo contains the source data this game draws from:

- `src/data/` — JSON files with playbook definitions, moves, monster types, NPCs, story arcs, and entities extracted from Monster of the Week source material
- `src/campbell/` — CAMPBELL terminal voice and narrative style reference
- `portal-architecture.md` and `worldbuilding.md` — lore and world reference

**Important:** This game repo is independent. Copy and adapt data you need — don't import directly. Game versions of playbooks will diverge (adding stats, costs, balance values) from the campaign reference data. The PORTAL repo is read-only reference, not a dependency.

---

## Architectural Invariants

These are non-negotiable and must be established before any game logic is written:

### 1. Deterministic Seeded RNG
- All randomness derives from a seed via deterministic PRNG (e.g., mulberry32)
- The RNG state advances in a fixed order per action sequence
- No `Math.random()` anywhere in game logic — ever
- Create a `GameRNG` class that takes a seed and provides `.next()`, `.roll2d6()`, `.pick(array)`, etc.

### 2. Action Log Architecture
- Every player action is appended to an ordered action log
- Game state at any point = `reduce(actionLog, applyAction, initialState(seed))`
- Action entries are minimal serializable objects: `{ type, payload, timestamp }`
- The game engine is a pure function: `(seed, actions[]) → GameState`

### 3. Save = Seed + Action Log
- Auto-save writes each new action to D1
- Resume replays the action log against the seed
- Periodic state snapshots for performance (every ~20 actions)
- Undo = pop last action + replay from nearest snapshot (disabled past dice rolls)
- 2–3 save slots per player, each an independent playthrough

### 4. i18n from Day One
- Use `i18next` + `react-i18next`
- Zero hardcoded player-facing strings — everything through translation keys
- Content JSON files use `{ "en": "...", "es": "..." }` patterns for localizable fields
- Default and only language for now: English

### 5. Mobile-First Layout
- Design for phone screens first, responsive up to desktop
- Touch-friendly tap targets, no hover-dependent interactions
- Investigation map must work well on small screens

### 6. Telemetry from Day One
- Every decision point emits a telemetry event recording what was chosen AND what was available but not chosen
- Events are append-only, lightweight, fire-and-forget (never block gameplay)
- Batched client-side, flushed to D1 `telemetry_events` table via Worker endpoint
- Two consumers: (a) aggregate analytics for game tuning, (b) per-mystery narrative export for PORTAL campaign canon
- The telemetry system is an event emitter that game actions dispatch to — similar pattern to the sound manager
- See GAME-DESIGN.md "Telemetry & Analytics" section for full schema and event types

### 7. Headless Simulation from Day One
- The engine must run without React, DOM, or any browser API
- A simulation runner loops the engine with pluggable strategy functions (random, greedy-clues, balanced, etc.)
- Simulation reports flag balance violations against defined thresholds
- See GAME-DESIGN.md "Simulation & Balance Testing" section for strategies and metrics
- CLI command: `npm run simulate` for batch runs

### 8. Debug Commands
- Full set of cheat/debug commands implemented in the engine layer as pure functions
- Debug actions are tagged `debug: true` in the action log for filtering
- Debug screen accessible via `?debug=1` URL param or dev-mode flag
- See GAME-DESIGN.md "Debug System" section for full command list

---

## Tech Stack

- **Frontend:** React + Vite + TypeScript
- **Styling:** Tailwind CSS
- **State:** Zustand (fully serializable stores)
- **Backend:** Cloudflare Workers
- **Database:** Cloudflare D1
- **Auth:** Simple name + password → session token (MVP)
- **Deployment:** Cloudflare Pages
- **i18n:** i18next + react-i18next
- **Unit tests:** Vitest
- **E2E tests:** Playwright
- **Simulation:** Custom headless runner using the game engine directly

---

## Project Structure

```
portal-field-ops-game/
├── CLAUDE.md                    # This file
├── GAME-DESIGN.md               # Full design document
├── BACKLOG.md                   # Work items, decisions, pending changes
├── TEST-COVERAGE.md             # Test inventory with review status
├── package.json
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── wrangler.toml                # Cloudflare config
├── src/
│   ├── engine/                  # Pure game logic (no React, no I/O, no DOM)
│   │   ├── rng.ts              # Seeded deterministic RNG
│   │   ├── types.ts            # All game type definitions
│   │   ├── state.ts            # State derivation: (seed, actions[]) → GameState
│   │   ├── actions.ts          # Action definitions and reducer
│   │   ├── mystery.ts          # Mystery generation from seed + templates
│   │   ├── investigation.ts    # Investigation phase logic
│   │   ├── confrontation.ts    # Combat resolution logic
│   │   ├── hunters.ts          # Hunter stats, conditions, progression
│   │   ├── clues.ts            # Clue system and intel level calculation
│   │   └── debug.ts            # Debug/cheat commands (pure functions)
│   ├── data/                    # Game content JSON (adapted from PORTAL)
│   │   ├── playbooks.json
│   │   ├── moves.json
│   │   ├── monster-types.json
│   │   ├── weaknesses.json
│   │   ├── locations.json
│   │   ├── countdown-templates.json
│   │   ├── narrative-fragments.json
│   │   └── mysteries/          # Hand-authored mystery definitions (MVP)
│   │       ├── mystery-001.json
│   │       └── mystery-002.json
│   ├── ui/                      # React components
│   │   ├── screens/            # One component per screen
│   │   ├── components/         # Shared UI components
│   │   ├── terminal/           # CAMPBELL CRT-style components
│   │   ├── debug/              # Debug panel components
│   │   └── hooks/              # Game state hooks
│   ├── api/                     # Cloudflare Worker endpoints
│   │   ├── auth.ts             # Login / create game
│   │   ├── save.ts             # Save / load game state (with slot support)
│   │   ├── telemetry.ts        # Telemetry event ingestion
│   │   └── schema.sql          # D1 schema (users, save_slots, action_logs, telemetry_events)
│   ├── i18n/                    # Translations
│   │   ├── en/
│   │   │   ├── ui.json         # UI strings
│   │   │   ├── game.json       # Game content strings
│   │   │   └── narrative.json  # CAMPBELL and field report strings
│   │   └── index.ts            # i18n setup
│   ├── sound/                   # Sound manager (hooks only for MVP)
│   │   └── manager.ts          # Event-based sound system, silent initially
│   ├── telemetry/               # Analytics and canon export
│   │   ├── emitter.ts          # Event emitter: decision points dispatch here
│   │   ├── types.ts            # TelemetryEvent schema
│   │   ├── batcher.ts          # Client-side batching, flush to Worker endpoint
│   │   └── export.ts           # Campaign canon export: mystery seed → narrative summary
│   └── App.tsx
├── simulation/                  # Headless simulation tools (Node, no browser)
│   ├── runner.ts               # Main simulation loop
│   ├── strategies/             # Pluggable AI player strategies
│   │   ├── random.ts
│   │   ├── greedy-clues.ts
│   │   ├── balanced.ts
│   │   ├── blind-rush.ts
│   │   └── exhaustive.ts
│   ├── reporter.ts             # Aggregate stats and flag balance violations
│   ├── cli.ts                  # CLI entry point (npm run simulate)
│   └── thresholds.ts           # Balance threshold definitions
├── workers/                     # Cloudflare Worker source
│   └── index.ts
├── tests/
│   ├── engine/                  # Vitest: pure engine tests
│   │   ├── rng.test.ts         # Verify determinism
│   │   ├── state.test.ts       # Verify replay produces identical state
│   │   ├── actions.test.ts     # Verify action resolution
│   │   ├── investigation.test.ts
│   │   ├── confrontation.test.ts
│   │   ├── clues.test.ts
│   │   ├── hunters.test.ts
│   │   └── debug.test.ts       # Verify all debug commands
│   ├── simulation/              # Vitest: simulation correctness
│   │   └── strategies.test.ts  # Verify strategies produce valid action sequences
│   └── e2e/                     # Playwright: user flow tests
│       ├── login.spec.ts
│       ├── mystery-flow.spec.ts # Full mystery: briefing → investigation → confrontation → report
│       ├── save-load.spec.ts    # Save slot creation, switching, resume
│       ├── undo.spec.ts         # Undo works for non-random, blocked past rolls
│       └── debug.spec.ts        # Debug panel accessible and functional
└── reports/                     # Simulation output (gitignored)
    └── .gitkeep
```

---

## Workflow: How Claude Code Sessions Work

### Design-Driven Development

Development happens through a cycle of design documents and Claude Code sessions:

1. **Design doc created** (in conversation with Claude chat or by Gino directly)
2. **Design doc placed in repo root** with a clear filename (e.g., `DESIGN-investigation-phase.md`)
3. **Claude Code session starts** with a prompt like: "Read DESIGN-investigation-phase.md and implement it. Update BACKLOG.md when done. Run tests."
4. **Claude Code implements, tests, and updates BACKLOG.md** to reflect what was done and what remains
5. **Design doc archived** — moved to `docs/archive/` with a date prefix, or deleted if fully implemented
6. **TEST-COVERAGE.md updated** with new tests added during the session

### BACKLOG.md

Lives in repo root. Single source of truth for what's done, what's next, and decisions made. Structure:

```markdown
# Backlog

## Current Sprint
- [ ] Task description (priority: high/medium/low)
- [x] Completed task — PR/commit ref

## Decisions Made
| Date | Decision | Context |
|------|----------|---------|
| 2026-03-25 | Seeded RNG uses mulberry32 | Fast, deterministic, good distribution |

## Pending Design Questions
- Question that needs resolution before implementation

## Archived (Done)
- [x] Task — date completed
```

Claude Code sessions should read BACKLOG.md at the start and update it before finishing.

### TEST-COVERAGE.md

Tracks all tests with review status. Two sections:

```markdown
# Test Coverage

## Reviewed Tests
Tests that have been manually reviewed for correctness and intent.

| Test File | Test Name | Intent | Expected Outcome | Reviewed | Reviewer | Date |
|-----------|-----------|--------|-------------------|----------|----------|------|
| rng.test.ts | same seed produces same sequence | Verify determinism | 1000 calls with same seed return identical values | ✅ | Gino | 2026-03-28 |

## New Tests (Pending Review)
Tests added by Claude Code sessions that haven't been reviewed yet.

| Test File | Test Name | Intent | Expected Outcome | Added | Session |
|-----------|-----------|--------|-------------------|-------|---------|
| state.test.ts | replay produces identical state | Verify action log replay | State after replay matches state after live play | 2026-03-28 | Phase A |
```

After review, move tests from "New" to "Reviewed" with a timestamp. This ensures test quality doesn't silently degrade — every test has been seen by a human at least once.

---

## Testing Strategy

Three layers of testing, each serving a different purpose:

### Layer 1: Engine Unit Tests (Vitest)

**What:** Pure function tests for everything in `src/engine/`. No DOM, no React, no network.

**Why:** The engine is the heart of the game. If `deriveState(seed, actions)` is correct, everything else is display. These tests run in milliseconds and catch logic bugs immediately.

**Coverage targets:**
- RNG determinism (same seed → same sequence, always)
- State replay (live play state === replayed state, always)
- Every action type resolves correctly
- Every debug command works
- Clue discovery and intel level calculation
- Harm, injury, death thresholds
- Luck spending mechanics
- Countdown advancement rules
- Confrontation round resolution
- Save slot isolation (actions in slot 1 don't affect slot 2)

### Layer 2: E2E Tests (Playwright)

**What:** Browser-based tests that click through the actual UI. These test that the UI correctly renders engine state and that user interactions dispatch the right actions.

**Why:** Catches UI bugs, broken flows, and integration issues between React and the engine. Also validates mobile layout and touch interactions.

**Critical flows to test:**
- Login → create game → select save slot → see HQ
- Start mystery → briefing screen → investigation map renders
- Full mystery flow: briefing → investigate locations → gather clues → confront → field report
- Save + close + reopen → resume at exact same state
- Undo button works for movement, disabled after rolls
- Save slot switching preserves state
- Debug panel opens with flag, commands work

**Playwright also serves as the headless testing tool** for verifying that the full stack (UI + engine + D1) works end-to-end. Playwright tests run against a local dev server with a test D1 database.

### Layer 3: Simulation Tests (Custom Runner)

**What:** The headless simulation runner that plays thousands of mysteries with different strategies and flags balance issues.

**Why:** Catches game design problems that unit tests can't — mysteries that are impossible, playbooks that are useless, difficulty curves that are broken.

**Runs via:** `npm run simulate` (CLI, no browser needed). Uses the engine directly.

**When to run:**
- After any change to mystery templates, playbook stats, or game mechanics
- Before any content release (new mystery, new playbook, new arc)
- As part of CI (a fast subset, e.g., 100 runs per strategy)

### Test Commands

```bash
npm run test              # Vitest: all engine unit tests
npm run test:watch        # Vitest: watch mode during development
npm run test:e2e          # Playwright: all E2E tests
npm run test:e2e:headed   # Playwright: visible browser for debugging
npm run simulate          # Full simulation batch (slow, ~1000 runs)
npm run simulate:quick    # Quick simulation (100 runs, sanity check)
npm run test:all          # All three layers in sequence
```

---

## Deployment & Infrastructure Plan

### Cloudflare Architecture

```
[Browser / Mobile]
        │
        ▼
[Cloudflare Pages]  ← Static React app (Vite build)
        │
        ▼
[Cloudflare Workers] ← API endpoints (auth, save, telemetry)
        │
        ▼
[Cloudflare D1]     ← SQLite database (users, save slots, action logs, telemetry)
```

### D1 Schema (Core Tables)

```sql
-- Players
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_login TEXT
);

-- Save slots (2-3 per user)
CREATE TABLE save_slots (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  slot_number INTEGER NOT NULL,       -- 1, 2, or 3
  name TEXT,                          -- player-chosen label
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  game_state JSON NOT NULL,           -- current derived state (cached)
  UNIQUE(user_id, slot_number)
);

-- Action logs (the source of truth for game state)
CREATE TABLE action_logs (
  id TEXT PRIMARY KEY,
  slot_id TEXT NOT NULL REFERENCES save_slots(id),
  mystery_seed TEXT NOT NULL,
  action_index INTEGER NOT NULL,       -- order within this mystery
  action_data JSON NOT NULL,           -- the action entry
  state_snapshot JSON,                 -- periodic snapshot (every ~20 actions)
  created_at TEXT NOT NULL
);

-- Telemetry events (append-only analytics)
CREATE TABLE telemetry_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  slot_id TEXT,
  mystery_seed TEXT,
  event_type TEXT NOT NULL,
  event_data JSON NOT NULL,
  available_options JSON,
  chosen_option TEXT,
  game_state_context JSON,
  game_timestamp INTEGER,              -- ms since mystery start
  created_at TEXT NOT NULL
);

CREATE INDEX idx_telemetry_user ON telemetry_events(user_id);
CREATE INDEX idx_telemetry_seed ON telemetry_events(mystery_seed);
CREATE INDEX idx_telemetry_type ON telemetry_events(event_type);
CREATE INDEX idx_actions_slot ON action_logs(slot_id, mystery_seed, action_index);
```

### Worker Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/register` | POST | Create new user (username + password) |
| `/api/auth/login` | POST | Login, return session token |
| `/api/slots` | GET | List save slots for current user |
| `/api/slots` | POST | Create new save slot |
| `/api/slots/:id` | GET | Load save slot (game state + action log) |
| `/api/slots/:id/actions` | POST | Append action(s) to log, update cached state |
| `/api/slots/:id/actions/undo` | POST | Pop last action, return previous state |
| `/api/telemetry` | POST | Batch ingest telemetry events |
| `/api/telemetry/export/:seed` | GET | Export telemetry for a mystery as structured summary |

### Environments

| Environment | Purpose | D1 Database | URL |
|-------------|---------|-------------|-----|
| Local dev | Development | Local D1 (wrangler dev) | `localhost:5173` |
| Preview | PR review, testing | Preview D1 | `preview.portal-fieldops-game.pages.dev` |
| Production | Live game | Production D1 | `fieldops.portal-game.com` (or similar) |

### Setup Steps (For First-Time Repo Setup)

```bash
# 1. Create repo and install
git init portal-field-ops-game
cd portal-field-ops-game
npm create vite@latest . -- --template react-ts
npm install

# 2. Install dependencies
npm install zustand i18next react-i18next
npm install -D vitest @playwright/test wrangler tailwindcss

# 3. Set up Cloudflare
npx wrangler login
npx wrangler d1 create portal-fieldops-game-db
# Add D1 binding to wrangler.toml

# 4. Initialize D1 schema
npx wrangler d1 execute portal-fieldops-game-db --file=src/api/schema.sql

# 5. Verify
npm run dev          # Local dev server
npm run test         # Engine tests
npx wrangler dev     # Worker dev server
```

---

## Build Order (MVP)

Work in this order. Each step should be testable before moving to the next.

### Phase A: Engine Foundation
1. `engine/rng.ts` — Seeded PRNG. **Test:** same seed always produces same sequence.
2. `engine/types.ts` — All type definitions (Hunter, Mystery, Monster, Clue, Action, GameState, SaveSlot, TelemetryEvent, etc.)
3. `engine/actions.ts` — Action type definitions and the core reducer
4. `engine/state.ts` — `deriveState(seed, actions[])` function. **Test:** replay produces identical states.
5. `engine/hunters.ts` — Hunter creation from playbook, stat calculations, harm/luck/condition tracking
6. `engine/debug.ts` — All debug commands as pure functions. **Test:** each command produces expected state change.

### Phase B: Content
7. `data/playbooks.json` — 4 playbooks with original names, stats, moves (reference PORTAL repo for archetypes, but rename and adapt)
8. `data/moves.json` — Shared moves + playbook-specific moves with game mechanics
9. `data/mysteries/mystery-001.json` — First hand-authored mystery (monster, locations, clues, countdown, encounters)

### Phase C: Game Logic
10. `engine/investigation.ts` — Location map, action resolution, clue discovery. **Test:** all clues reachable, actions resolve correctly.
11. `engine/clues.ts` — Clue collection, intel level calculation. **Test:** intel level thresholds correct.
12. `engine/confrontation.ts` — Combat rounds, roll resolution, weakness exploitation, harm. **Test:** all confrontation outcomes reachable.

### Phase D: Simulation
13. `simulation/runner.ts` + `simulation/strategies/random.ts` — Headless runner with random strategy. **Test:** can complete 100 mystery runs without crashing.
14. `simulation/strategies/greedy-clues.ts` + `simulation/strategies/balanced.ts` — Additional strategies.
15. `simulation/reporter.ts` + `simulation/thresholds.ts` — Balance violation detection. **Run:** batch simulation against mystery-001, verify thresholds.
16. `simulation/cli.ts` — Wire up `npm run simulate` command.

### Phase E: Infrastructure
17. D1 schema + Worker endpoints for auth, save/load (with slot support), telemetry ingestion
18. `telemetry/emitter.ts` + `telemetry/batcher.ts` + `telemetry/types.ts` — Wire into action reducer
19. i18n setup with all existing strings extracted to translation files
20. Sound manager stub (event emitter, no audio)

### Phase F: UI
21. Login / Create Game screen
22. Save Slot Selection screen
23. Mission Briefing (CAMPBELL terminal)
24. Investigation Map screen
25. Location Encounter screen
26. Confrontation screen (with dice roll UI and luck button)
27. Field Report screen
28. Undo button + auto-save integration
29. Debug panel (hidden, flag-activated)

### Phase G: Second Mystery + Validation
30. `data/mysteries/mystery-002.json` — Different monster type, location theme, weakness
31. Run simulation against mystery-002, verify balance thresholds
32. Playwright E2E tests for full mystery flow
33. Update TEST-COVERAGE.md with all new tests

---

## Key Principles

- **Engine is pure.** `src/engine/` has zero imports from React, Zustand, Cloudflare, or any I/O library. It's pure TypeScript functions that take data and return data. This makes it testable, replayable, simulatable, and portable.
- **UI is a view layer.** React components read from Zustand stores that wrap the engine. User interactions dispatch actions through the engine, which produces new state.
- **Content is data.** Mysteries, playbooks, moves — all JSON. The engine doesn't know about specific monsters or hunters, only about types and templates.
- **Test the engine, not the UI.** The engine is where correctness matters. If `deriveState(seed, actions)` is correct, the UI just needs to display it.
- **Simulate before shipping.** Any new mystery or balance change gets a simulation run before it reaches players.
- **Telemetry is architecture, not an afterthought.** The decision tracking enables both game tuning and campaign canon — it's core to the product.
- **Debug commands are features.** They accelerate development, enable testing, and power simulation. They're not hacks to remove later.
