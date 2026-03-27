# Architecture Decisions — PORTAL Field Operations Game

_Last updated: 2026-03-27_

All decisions made 2026-03-25 unless noted.

---

## Engine Architecture

| Decision | Rationale |
|----------|-----------|
| Deterministic seeded PRNG (mulberry32) | Enables save/undo/replay/simulation with minimal state |
| Action log architecture — save = seed + log | `deriveState(seed, actions[])` is the single source of truth; replay is trivial |
| Undo disabled past dice rolls | Misclick protection without undermining randomness |
| Pure engine — zero I/O imports in `src/engine/` | Testable, replayable, simulatable, portable; simulation runs the same code as prod |
| Debug commands as pure functions `(GameState) → GameState` | Dev, testing, and simulation all use identical code paths |
| Luck spent after seeing roll | More dramatic, better mobile UX |
| Bond-based assist system | Rewards keeping teams together, creates composition strategy |

## Content & Data

| Decision | Rationale |
|----------|-----------|
| Content is data (JSON) | mysteries, playbooks, moves all in `data/` — editable without touching engine |
| Original names/mechanics (inspired by MotW) | Avoids IP issues, allows creative freedom |
| Hunters have selected moves (not full playbook list) | Offer 2–3 choices at character creation; future pool of 15–20 pre-built hunters |
| mystery-001 designed for humane resolution | Eszter is a victim of grief; combat win is mechanically valid but thematically a loss — teaches weakness mechanic early |
| Arc structure (cases + setup + finale + side) | TV season model, prevents infinite treadmill |
| Story generator as Phase X (post-MVP) | Claude API endpoint too costly for early dev — generate mysteries manually for now |
| Operative name pool (100 fictional names) | Avoids using real PORTAL player names; eventually tie names to playbook traits |

## Infrastructure

| Decision | Rationale |
|----------|-----------|
| Cloudflare Workers + D1 | Syncs across devices, supports future multiplayer; edge latency |
| Workers project (not Pages) | `workers/index.ts` serves both API and static assets via `assets` binding |
| JWT auth (HS256, Web Crypto) | No external library needed; 30-day tokens; passwords in `AUTH_PASSWORDS` env var |
| 2–3 save slots per player | Parallel playthroughs without losing progress |
| Separate repo from PORTAL | Different build/deploy cadence; game data diverges from campaign data |
| i18n from day one | All UI strings through i18next — avoids painful retrofit |
| Telemetry from day one | Every decision emits event: chosen + alternatives. Two consumers: game tuning + canon export |

## UI & Visual Design

| Decision | Rationale |
|----------|-----------|
| Mobile-first layout | PORTAL players mainly use between sessions on phone |
| "Papers Please" aesthetic (north star) | Styled text + icons for Phase 1; terminal/mono feel matches PORTAL agency tone |
| Adapt CSS from portal-fieldops repo | Don't redesign visual language — reuse what already exists in the PORTAL ecosystem |
| Three-font hierarchy (Share Tech Mono / Barlow Condensed / Barlow) | System labels vs headlines vs body prose — clear visual hierarchy |
| CSS mask-image for icons (not vite-plugin-svgr) | SVGs as masks + currentColor; no build plugin; icons from game-icons.net in `assets/icons/` |
| Reusable component library (`src/components/ui.tsx`) | Card, Tag, CampbellBlock, Icon, etc. — consistent PORTAL look across all screens |
| Scanline + grid atmospheric overlays | body::before/::after CSS — subtle CRT terminal texture |
| Narrative investigation screen (point-and-click) | Scene prose with clickable inline elements > button lists; hides mechanics behind fiction |
| Hidden elements in scene (discoverable) | Rewards reading, not scanning; creates discovery moment |
| Separate narrative data layer (`src/data/narrative/`) | Engine JSON stays clean; scene text and dialogue are presentation concerns |
| Operative selector before actions | Explicit "who is acting" avoids accidental misclicks on mobile |
| NPC dialogue responses keyed by roll outcome | Engine roll determines narrative result; fiction and mechanics stay in sync |
| Interview modal, not inline dialogue | Keeps scene readable; conversation feels like a focused moment |
| Question shown in roll result (not just response) | Player picks a question in the modal; after the roll, both the question and NPC response display in the RollResult card — gives context |
| Collapsed session log in investigation | `<details>` toggle shows reverse-chronological action list from Zustand store; avoids cluttering the screen while giving players a reference |
| Narrative responses on helpBystander elements | `SceneElement.response` field provides dialogue/flavor text instead of generic "helps — action spent"; even unproductive actions feel meaningful |
| Exploit option selector (toggle panel, not modal) | Clicking "Exploit Weakness ▾" expands inline panel below action buttons; lighter than a modal, keeps combat flow visible |
| Action-first confrontation layout (2026-03-27) | Show actions first (attack, defend, exploit, free text), THEN pick which hunter does it. Hunter-first layout buried actions and confused playtesters. |

## Balance & Confrontation

| Decision | Rationale |
|----------|-----------|
| Clue-based exploit options (not flat intel counter) | Specific clues unlock specific exploit approaches with varying power. Investigation choices matter — a rush player who found one key clue by luck gets a weak option; a thorough player with locket + confession gets the full resolution. |
| ExploitOptionDef on Weakness (optional, backward-compatible) | `exploitOptions?: ExploitOptionDef[]` — when absent, engine falls back to legacy intel-level modifier. Existing tests and mysteries work without changes. |
| Armor reduces incoming attack damage (not outgoing) | `harmToMonster = max(0, 2 - armor)` and `harmToHunter = monster.harm`. Armor is the monster's defense, not a self-debuff. Eszter (armor=4) is immune to regular attacks. |
| Exploit options bypass armor | exploitWeakness harm is applied directly to monsterHarmTaken, bypassing armor. This makes investigation the path to victory — knowledge defeats monsters, not brute force. |
| cluesFoundAtStart snapshot on ConfrontationState | Exploit option eligibility is locked at confrontation start. Prevents mid-confrontation clue manipulation. |
| Balance tracking in BALANCE-LOG.md | All simulation experiments, findings, and tuning decisions tracked with before/after metrics. |
| Exploit cooldown — 1-action per hunter (2026-03-27) | Hunter's last confrontation action can't be exploitWeakness. Prevents exploit spam. Engine throws ActionError, simulation/strategies respect it. |
| Free-text exploits NOT clue-gated (2026-03-27) | Players can always guess via free text regardless of clues found. `requiredClueIds` kept for data reference but not enforced in exploit-resolver or strategy. |
| AI opt-in via URL param `?ai=1` (2026-03-27) | Default is keyword-only. AI not tested enough for always-on. Frontend creates AIGMClient only when `?ai=1` present. Worker returns 503 if AI_GM_ENABLED=false. |

## Testing & Simulation

| Decision | Rationale |
|----------|-----------|
| Vitest + Playwright + simulation (3 test layers) | Correctness / user flows / game design validation |
| Headless simulation from day one | Balance verification, feasibility, path completeness |
| Simulate before shipping | New mysteries get a simulation run before reaching players |
| Design-doc-driven workflow | Design docs → implementation → archive; BACKLOG.md as source of truth |
| Simulation coverage mandatory | Any new engine lever must be expressible in experiment configs — no simulation-blind mechanics |
| Two-phase AI comparison strategy (2026-03-27) | `FreeTextCompareStrategy` collects comparison records during sync simulation; AI batch comparison runs async afterward. Keeps simulation fast while enabling real AI comparison data. |

---

## Pending Design Questions

- Original playbook names (replacing MotW placeholder names)
- Bond growth formula and assist charge calculation
- Countdown advancement rules (previously discussed — check prior session notes)
- CAMPBELL voice guide for field reports (being sourced from portal-fieldops repo)
- When to build the full 15–20 pre-built hunter pool
- Confrontation screen: should it get a narrative treatment like investigation?
- Monster moves system (user feedback: monsters should have active moves, not just raw harm; some moves should affect hunters during investigation)

### Armor & Damage Model (Future)

Current engine: regular attacks deal `max(0, 2 - armor)` and exploitWeakness bypasses armor entirely. This makes armor >1 effectively immunity to regular attacks. Several future mechanics would change this:

- **Hunter gear/moves with >2 base harm** — some playbooks should have moves or weapons that deal more than the flat 2, making armor penetrable
- **Weakness knowledge giving armor reduction** — knowing the weakness could grant -1 armor (e.g. drunk hunters can see the Shōjō better and fight it; shredding/misfiling Azrameth's documents bypasses his defenses)
- **Per-mystery armor bypass conditions** — fire vs Azrameth, specific items vs specific monsters

For now, armor values on mysteries 006 (Shōjō, armor 2) and 009 (Azrameth, armor 2) stay as-is. Future gear/move mechanics will make these fightable without exploits.

### Free-Text Exploit System (Sprint 1 — COMPLETE 2026-03-26)

Players type how they want to approach/attack the entity in free text. The keyword engine parses their approach and maps it to mechanical outcomes.

**Architecture** — `src/engine/free-text/` (5 modules):
1. `tokenizer.ts` — normalize → stop-word filter → stem (`-ing/-ed/-er/-s`) → synonym expand + deduplicate
2. `clue-matcher.ts` — score overlap against found-clue keyword arrays → `ClueMatch[]`
3. `stat-classifier.ts` — verb→stat vote system; charm wins ties (priority: charm > cool > sharp > weird > tough)
4. `exploit-resolver.ts` — walk `freeTextExploits` best→worst modifier; trigger phrase overlap (clue prereqs NOT enforced)
5. `pipeline.ts` — `interpretAction(opts): ActionInterpretation` composing all 4 stages

**Engine path** — 3rd branch in `handleExploitWeakness`: `exploitOptionId` → `freeTextInput` → legacy intel fallback. Replay-safe: `interpretAction()` is pure and deterministic.

**Data** — `freeTextExploits` on all 9 mysteries (3 tiers each). `keywords` (6–8 per clue) on ALL mysteries (001–009). `capabilities` (EntityCapability[], 2 per monster) on all 9 monsters.

**UI** — ConfrontationScreen: action-first layout with "FREE TEXT" button opening textarea + live preview panel. Preview calls `interpretAction()` client-side before commit. Dispatches `{ hunterId, freeTextInput }`.

**Simulation** — `FreeTextKeywordStrategy` picks best available freeTextExploit by modifier, selects hunter with highest weakness stat (respects exploit cooldown). `FreeTextCompareStrategy` extends it with comparison record collection. `valid-actions.ts` enumerates free-text actions when no exploitOptions exist.

**Known limitations** (documented in `TEST-COVERAGE.md`):
- Names ending in `-er` (Eszter, etc.) are damaged by stemmer — avoid in trigger phrases
- `spirit` → `ritual` synonym causes unexpected weird stat votes
- `destroy` → `disable` (later synonym group wins) — no tough vote
- All charm synonyms collapse to one canonical → only 1 vote per synonym group

### Mystery Registry (`src/data/mysteries.ts`) — 2026-03-26

`getMysteryForState(mysteryId)` returns a `MysteryEntry` with `mapRows`, `mapTokens`, `getNarrativeForLocation`, `getNpcById`. InvestigationScreen uses this instead of hardcoded mystery-001 imports — enables any mystery to provide a narrative overlay without changing screen code. Currently only mystery-001 has a narrative overlay; others degrade gracefully.
