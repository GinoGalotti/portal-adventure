# Active Context — PORTAL Field Operations Game

_Last updated: 2026-03-27_

---

## Where We Are

All engine phases (A–F) are complete. **Sprints 1–3 complete. UX polish done. free-text-compare strategy done.** 543 tests passing.

### Completed phases
| Phase | Status | Notes |
|-------|--------|-------|
| A — Engine Foundation | ✅ Done | 424 tests passing |
| B — Content (playbooks, moves, mystery-001) | ✅ Done | |
| C — Game Logic (investigation, clues, confrontation) | ✅ Done | |
| D — Simulation | ✅ Done | Balance tuning complete (see BALANCE-LOG.md) |
| E — Infrastructure (Workers + D1) | ✅ Done | Deployed: portal-adventure.gino-galotti.workers.dev |
| F — UI Screens | ✅ Done | All 6 screens wired |
| UI Restyle | ✅ Done | PORTAL design system applied to all screens |
| Balance Tuning | ✅ Done | Engine armor fix + mystery-001 data changes + clue-based exploits |
| Exploit Option UI | ✅ Done | Confrontation exploit selector + i18n keys |
| Investigation Polish | ✅ Done | Session log, interview question context, helpBystander narrative |
| InvestigationScreen mystery registry | ✅ Done | Dynamic MiniMap + narrative wired via getMysteryForState() |
| Sprint 1 — Free-text exploit engine | ✅ Done | `src/engine/free-text/` pipeline, data on all 9 mysteries |
| Sprint 2 — AI Client Infrastructure | ✅ Done | AIGMClient, prompt builder, parser, Worker proxy |
| Sprint 3 — AI Integration + Telemetry | ✅ Done | interpretActionWithAI, ConfrontationContext, transcripts, rating UI |
| UX Polish | ✅ Done | Text size, flavour text, action-first layout, exploit cooldown, investigation gating |
| G — Second Mystery + Validation | 🔜 Next | mysteries 002–009 already exist as JSON; need simulation + UI wiring |

---

## Recent Session (2026-03-27)

### Completed this session
1. **Confrontation UI: action-first layout** — ConfrontationScreen refactored to show actions first, then hunter picker panel. Three sub-panels: standard (hunter list), exploitWeakness (options + hunter per option), freeText (textarea + hunter buttons).

2. **Exploit spam prevention** — 1-action cooldown per hunter. Engine throws `ActionError` if hunter's last confrontation action was `exploitWeakness`. Simulation `valid-actions.ts` filters cooldown hunters. `FreeTextKeywordStrategy` respects cooldown when constructing exploit actions directly.

3. **free-text-compare simulation strategy** — `FreeTextCompareStrategy` extends `FreeTextKeywordStrategy`. Records `FreeTextComparisonRecord` on every free-text exploit decision (keyword stat/modifier/exploitId/confidence + game context). Records accessible via `strategy.records` after simulation for batch AI comparison.

4. **Bug fixes**:
   - `actions.ts:783` — `mystery.locationDefs.flatMap(loc => loc.clueDefs)` → `mystery.locations.flatMap(loc => loc.clues)` (runtime `Mystery` doesn't have `locationDefs`)
   - `strategies.ts:462` — Removed stale `requiredClueIds` filter from `FreeTextKeywordStrategy._confrontation()` (free-text exploits should always be guessable)

5. **AI opt-in via URL param** — `?ai=1` enables AI calls in ConfrontationScreen. Default is keyword-only.

6. **Sprint 3 AI pipeline** — `interpretActionWithAI()` in `src/ai/interpret.ts`, `ConfrontationContext` tracking, `FreeTextTelemetryEvent` emission, transcript types + D1 storage + Worker endpoints, quality rating UI + transcript export on FieldReportScreen.

---

## AI Architecture (Three Layers)

| Layer | Source | Speed | Cost | When |
|-------|--------|-------|------|------|
| 0 — Keywords | `src/engine/free-text/pipeline.ts` | Instant | Free | Always |
| 1 — Embeddings | `all-MiniLM-L6-v2` | Fast | Cheap | Future |
| 2 — AI GM | Ollama/Groq via Worker proxy | 1-3s | API cost | `?ai=1` URL param |

**AI is off by default.** To enable:
- Frontend: add `?ai=1` to URL
- Worker: set `AI_GM_ENABLED=true` in `.dev.vars`
- Local dev: run Ollama with `llama3.1:8b` at `http://localhost:11434/v1`

---

## What's Next

### Phase G (second mystery + simulation)
- Simulation run for all 9 mysteries (all now have exploitOptions + freeTextExploits)
- Narrative overlay for mystery-002 (`src/data/narrative/mystery-002.ts`)
- Briefing screen mystery selection (beyond mystery-001)
- E2E tests: Playwright happy-path flows
- Fix greedy strategy (picks best modifier+hunterStat, not just modifier)
- Original playbook names (replace MotW placeholder names)

### AI comparison (deferred)
- Batch AI comparison using `FreeTextCompareStrategy.records` — run keyword-only simulation, then process records through Ollama
- Compare stat/modifier agreement, outcome changes, AI latency

---

## Open Questions

- Confrontation screen — additional narrative treatment like investigation?
- When to build the full 15–20 pre-built hunter pool
- Monster moves system (active moves during investigation, not just raw harm)
- Bond growth formula and assist charge calculation
- CAMPBELL voice guide for field reports (sourcing from portal-fieldops repo)
