# Backlog

## Current Sprint: Phase A — Engine Foundation

- [ ] **engine/rng.ts** — Seeded PRNG (mulberry32 or similar). Must pass determinism tests. (priority: critical)
- [ ] **engine/types.ts** — All game type definitions. (priority: critical)
- [ ] **engine/actions.ts** — Action type definitions and core reducer. (priority: critical)
- [ ] **engine/state.ts** — `deriveState(seed, actions[])` with replay. Must pass replay identity tests. (priority: critical)
- [ ] **engine/hunters.ts** — Hunter creation, stats, harm/luck/conditions. (priority: critical)
- [ ] **engine/debug.ts** — All debug commands as pure functions. (priority: critical)

## Up Next: Phase B — Content

- [ ] **data/playbooks.json** — 4 playbooks with original names (reference PORTAL repo, rename/adapt)
- [ ] **data/moves.json** — Shared + playbook-specific moves with game mechanics
- [ ] **data/mysteries/mystery-001.json** — First hand-authored mystery

## Future Phases

See CLAUDE.md "Build Order" for full phase breakdown (C through G).

---

## Decisions Made

| Date | Decision | Context |
|------|----------|---------|
| 2026-03-25 | Luck spent after seeing roll | More dramatic, better mobile UX |
| 2026-03-25 | Bond-based assist system | Rewards keeping teams together, creates composition strategy |
| 2026-03-25 | Arc structure (cases + setup + finale + side) | TV season model, prevents infinite treadmill |
| 2026-03-25 | Deterministic seeded PRNG | Enables save/undo/replay/simulation with minimal state |
| 2026-03-25 | Undo disabled past dice rolls | Misclick protection without undermining randomness |
| 2026-03-25 | Papers Please aesthetic (north star, not MVP) | Styled text + icons for Phase 1, evolve visual direction later |
| 2026-03-25 | Mobile-first layout | PORTAL players will mainly use between sessions on phone |
| 2026-03-25 | i18n from day one | All strings through translation keys, avoids painful retrofit |
| 2026-03-25 | Original names/mechanics (inspired by MotW) | Avoids IP issues, allows creative freedom |
| 2026-03-25 | Cloudflare D1 server-side state | Syncs across devices, supports future multiplayer |
| 2026-03-25 | 2–3 save slots per player | Parallel playthroughs without losing progress |
| 2026-03-25 | Separate repo from PORTAL | Different build/deploy, game data diverges from campaign data |
| 2026-03-25 | Telemetry: chosen + not-chosen at every decision | Game tuning AND campaign canon export |
| 2026-03-25 | Headless simulation from day one | Balance verification, feasibility, path completeness |
| 2026-03-25 | Debug commands as engine-layer pure functions | Dev, testing, and simulation all use them |
| 2026-03-25 | Vitest + Playwright + simulation (3 test layers) | Correctness, user flows, game design validation |
| 2026-03-25 | Design-doc-driven Claude Code workflow | Design docs → implementation → archive, BACKLOG.md as source of truth |

---

## Pending Design Questions

- Exact stat ranges and values for the 4 MVP playbooks (need to reference PORTAL data and adapt)
- Hand-authored mystery-001 content: which monster type, location theme, and weakness for the first mystery?
- Bond system specifics: how fast do bonds grow, what's the formula for assist charges?
- Countdown advancement rules: exactly how many actions before it ticks? Linear or accelerating?
- CAMPBELL voice specifics for field reports: tone guide, vocabulary, sentence patterns
- Original playbook names (replacing MotW names while keeping the archetypes clear)

---

## Archived (Done)

_(Nothing yet — project starting)_
