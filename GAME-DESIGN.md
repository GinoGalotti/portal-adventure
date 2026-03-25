# PORTAL Field Operations — Game Design Document

> A roguelike mystery game set in the PORTAL universe where you manage field teams, investigate supernatural threats, and uncover the weakness of each week's monster before the countdown runs out.

## Vision

You run PORTAL's Field Operations division. Mysteries arrive. You send hunters. They investigate locations, gather clues, and confront monsters — but information is their real weapon. Going in blind gets people killed. Going in prepared turns a nightmare into a case file.

The game has two planned phases:

- **Phase 1 (MVP):** A standalone mystery runner. One player, one lab, one roster of hunters. Each mystery is a 15–20 minute roguelike run. Can be embedded in the PORTAL campaign site as a minigame ("resolve what happened on Case 7B").
- **Phase 2 (Full game):** HQ management layer on top. Upgrade your lab, grow your roster, unlock new capabilities. Arc-based mystery progression with narrative continuity. The archive of completed field reports becomes a narrative record of your organization's history.

---

## Core Loop

```
Mystery Arrives (as part of an Arc)
    → Mission Briefing (CAMPBELL terminal)
    → Choose hunters to deploy (1–4 from your roster)
    → Investigation Phase (explore locations, gather clues, manage actions)
    → Analyze clues (what do you know about the monster?)
    → Confrontation (fight the monster, knowledge determines advantage)
    → Outcome (hunters return: healthy, injured, traumatized, or dead)
    → Field Report generated (narrative account in CAMPBELL voice)
    → Hunters rest/heal, lab processes findings
    → Next mystery in the arc arrives
```

---

## Arc Structure

Mysteries are organized into **Arcs**, structured like a TV season:

```
ARC (e.g., "The Hollowing")
  ├── Case 1: Standard mystery (~15 min)
  ├── Case 2: Standard mystery (~15 min)
  ├── Case 3: Standard mystery (~15 min)
  ├── Side Mission: Optional, lighter/sillier (~8–10 min)
  ├── Setup Mission: Connects threads, reveals arc villain (~20 min)
  └── Arc Finale: Larger, harder, unlocks something significant (~25–30 min)
```

- Standard cases are self-contained mysteries with procedurally assembled monsters.
- Side missions are shorter, often humorous or weird — palette cleansers.
- Setup missions recontextualize earlier clues and introduce the arc-level threat.
- Arc finales are multi-stage, higher-stakes confrontations where earlier choices matter.
- **Arcs feed into each other.** NPCs, evidence, and consequences carry forward.
- **Achievements** track milestones within and across arcs.
- Players can track how many arcs they've completed toward "finishing" the game, but the structure supports infinite play via new arcs.

---

## The Mystery Generation System

Every mystery is procedurally assembled from composable parts, inspired by (but not mechanically identical to) Monster of the Week's structure.

### Monster Template

Each monster is built from:

| Component    | Role                                           | Example                          |
|--------------|-------------------------------------------------|----------------------------------|
| **Type**     | Base behavior, abilities, threat profile         | Beast, Devourer, Trickster, Torturer, Destroyer, Parasite, Sorcerer |
| **Motivation** | What the monster wants — shapes its actions    | Revenge, hunger, loneliness, chaos, territorial control |
| **Weakness** | The investigation goal — how to beat it          | A specific ritual, its true name, a particular weapon, sunlight, a broken bond |
| **Location theme** | Where the mystery takes place              | Hospital, school, forest, subway system, abandoned factory |
| **Countdown** | What happens if hunters take too long            | 6-step escalation from subtle disturbance to catastrophe |

Monster difficulty is a function of:
- How many clues are needed to identify the weakness
- How dangerous the monster's type makes the confrontation without weakness knowledge
- How aggressive the countdown is

### Mystery Assembly

```
1. Pick monster type → defines encounter behaviors and confrontation stats
2. Pick motivation → determines NPC relationships and monster actions
3. Pick weakness → determines what clues exist and where
4. Pick location theme → generates the location map
5. Generate countdown → sets the time pressure
6. Distribute clues across locations → some easy, some guarded, some hidden
7. Place bystanders/minions → populate the map with NPCs and threats
```

The combinatorics create variety: a Devourer motivated by hunger in a hospital plays nothing like a Devourer motivated by revenge in a school.

---

## Investigation Phase

This is the meat of the gameplay — a 15–20 minute decision-rich exploration.

### The Location Map

Each mystery presents 5–7 locations as nodes on a map. Locations have:

- **Type:** crime scene, witness home, library/archive, monster's lair, public space, hidden area
- **Encounters available:** investigate, interview, search, confront minion, help bystander
- **Clues present:** 0–3 clues hidden behind encounters
- **Threat level:** how dangerous the location is (affects injury risk)

### Action Economy

Actions use a **dual-pool system:**

**Per-scene actions:** Each hunter in a scene gets 1–2 actions they can take at that location. These reset when the team moves to a new location.

**Stamina pool:** A shared team resource (4–6 points, varies by team composition). Any available hunter can spend stamina for extra actions beyond their per-scene allotment. Stamina does not regenerate during a mystery.

**Assist actions:** Hunters can use their per-scene actions to assist another hunter's roll instead of acting independently. The number of assists a hunter can perform per mystery is based on their **Bonds** with other team members:
- A hunter with strong bonds might have 4–5 assists available (+ bonus assists toward specific bonded hunters)
- A hunter who's a loner might only have 1–2 assists total
- Bonds can develop over multiple mysteries as hunters work together

### Action Types

| Action          | Cost        | Description |
|-----------------|-------------|-------------|
| Travel to location | 1 scene action | Move between adjacent nodes |
| Investigate     | 1 scene action | Search for physical clues (uses Sharp) |
| Interview       | 1 scene action | Talk to bystanders/witnesses (uses Charm) |
| Deep Search     | 1 stamina   | Thorough search, might find hidden clues or danger (uses Sharp) |
| Fight minion    | 1 stamina   | Clear a threat blocking access (uses Tough) |
| Help bystander  | 1 scene action | Protect someone, might gain info or allies |
| Use special move | Varies      | Hunter-specific abilities from their playbook |
| Assist          | 1 assist charge | Boost another hunter's roll (+1) |
| Rest/regroup    | 1 scene action | Heal 1 harm, but uses the hunter's scene action |

Running out of stamina doesn't end the mystery — it means the team can only use per-scene actions. The **countdown advances** when the team moves to a new location without resolving it, or when they take too long (every N actions total, the countdown ticks).

### Clue System

Clues are the core resource. Each mystery has a **weakness profile** — the full picture of how to defeat the monster. Clues reveal pieces of it:

- **Partial clue:** "It avoids the east wing of the hospital" (behavioral hint)
- **Key clue:** "A nurse saw it recoil from the chapel" (points toward weakness category)
- **Critical clue:** "Father Martinez's rosary burned it on contact" (specific weakness identified)

The number and type of clues you find determines your **Intel Level** going into confrontation:

| Intel Level | Clues Found | Confrontation Effect |
|-------------|-------------|---------------------|
| Blind       | 0–1         | Monster at full power, weakness unknown. Very dangerous. |
| Partial     | 2–3         | Some behavioral clues. Can avoid worst attacks but can't exploit weakness. |
| Informed    | 4–5         | Weakness category known. Can attempt to exploit it (risky). |
| Prepared    | 6+          | Exact weakness known. Confrontation becomes tactical, not desperate. |

**This is the core design insight: upgrades don't make hunters hit harder — they make clues reveal more.** A lab upgrade might mean "Investigate actions now also reveal monster behavior patterns" or "Interviewing witnesses gives an extra partial clue."

---

## Confrontation Phase

When hunters decide to confront the monster (or the countdown forces it), gameplay shifts to turn-based combat.

### The Roll System

Every action rolls 2d6 + relevant stat modifier. Three outcome tiers:

- **10+:** Full success. The hunter does what they wanted cleanly.
- **7–9:** Mixed success. It works, but there's a cost — take harm, lose position, collateral damage.
- **6-:** Miss. Things go wrong. The game makes a hard move against the hunter.

Rolls are **visible to the player** with dice animation. The tension of watching the roll is part of the experience.

### Luck

Hunters have a **Luck** pool (starts at 7, never regenerates). After seeing a roll result, the player can press a **"Push Your Luck"** button to spend 1 luck and upgrade the result by one tier (miss → mixed, mixed → full success). When luck hits 0, the hunter is living on borrowed time — future bad outcomes hit harder.

> **IP Note:** The game's roll system is inspired by Powered by the Apocalypse games but is its own implementation. We are not reproducing MotW rules verbatim. Stats, moves, and terminology should be original while maintaining the spirit of the system.

### Confrontation Flow

Each round:
1. Monster acts according to its type behavior (a Beast charges, a Trickster misleads, a Sorcerer casts)
2. Player chooses which hunter reacts / acts. Each hunter has their per-scene actions (1–2 per round) plus assist charges. Any remaining team stamina can also fuel extra actions.
3. Available actions:
   - **Attack** (Tough) — direct combat, both sides deal harm
   - **Defend** (Tough) — shield another hunter or bystander
   - **Resist** (Cool) — do something risky or resist monster effects
   - **Distract** (Charm) — create openings for others
   - **Assess** (Sharp) — gain tactical info mid-fight
   - **Exploit Weakness** (varies) — if you know it, attempt to exploit it
   - **Playbook-specific moves** — unique per hunter class
   - **Assist** — boost another hunter's roll
4. Resolve rolls, apply harm, advance the situation

### Weakness Exploitation

- **If Intel = Blind:** "Exploit Weakness" is unavailable. Hunters must brute force it. Monster regenerates, hits harder. High injury/death risk.
- **If Intel = Partial:** "Exploit Weakness" is available but at -1 penalty. Category known, specifics guessed.
- **If Intel = Informed:** "Exploit Weakness" rolls normally. Reasonable chance of success.
- **If Intel = Prepared:** "Exploit Weakness" rolls at +1. The hunters know exactly what to do.

A prepared team can end a confrontation in 2–3 rounds. A blind team might fight for 8+ rounds and lose hunters.

---

## Hunters

### Playbooks as Classes

Each hunter has a playbook (character class). Each playbook defines:

- **Base stats:** Charm, Cool, Sharp, Tough, Weird (ranging from -1 to +3)
- **Signature moves:** 2–3 unique abilities per playbook that affect investigation and combat
- **Gear loadout:** Starting equipment options
- **Vulnerability:** A flaw that can trigger during missions
- **Bond capacity:** How many assist charges they get, and bonus bonds with specific team compositions

### The 12 Playbooks (MVP can start with 4–6)

| Playbook      | Role in missions | Signature strength |
|---------------|------------------|--------------------|
| The Chosen    | Frontline combat | Destiny-powered weapon, fate protection |
| The Crooked   | Social / resourceful | Contacts, background tricks, flexible |
| The Divine    | Tank / moral compass | Holy powers, but duty conflicts |
| The Expert    | Investigation powerhouse | Lab access, deep knowledge, prepared |
| The Flake     | Clue-finder | Sees connections others miss, conspiracy sense |
| The Initiate  | Versatile / magic | Sect resources, rituals, but sect demands |
| The Monstrous | High risk / high reward | Supernatural powers, but monstrous nature |
| The Mundane   | Support / lucky | Survives everything, helps others shine |
| The Professional | Tactical / equipped | Agency resources, tactical approach |
| The Spell-Slinger | Ranged magic | Powerful spells, but with costs |
| The Spooky    | Dark power | Strong weird abilities, dark side risk |
| The Wronged   | Damage dealer | Vengeance-fueled, relentless, but reckless |

> **IP Note:** Playbook names and specific move text must be original. The archetypes (chosen one, professional soldier, wronged avenger) are genre tropes and not copyrightable, but MotW-specific names and descriptions are. The game data layer should use our own naming from the start.

### Hunter State

Each hunter tracks:

- **Harm:** 0–7 scale. 4+ means serious injury. 7 = death.
- **Luck:** 0–7 uses. Spend to upgrade a roll after seeing the result. When luck runs out, fate catches up. (Permanent resource — does not regenerate.)
- **Experience:** Gain from failed rolls (learning from mistakes). Levels up after threshold.
- **Bonds:** Relationships with other hunters. Grow over shared missions. Affect assist charges.
- **Conditions:** Injured (stat penalties next mystery), Traumatized (locked out for X mysteries), Critical (might die if sent out injured), Dead (permanent).

### Injury and Death

- Hunters who take 4+ harm return Injured (reduced stats for next 1–2 mysteries)
- Hunters who take 6+ harm return with a Serious Injury (out for 3+ mysteries, permanent stat reduction possible)
- Hunters who take 7 harm are dead — permanently removed from roster
- **Death should be uncommon but real.** Maybe 1 in 10–15 mysteries if playing reasonably. More frequent if you consistently go in blind.

---

## The Lab (Phase 2 — HQ Management)

Between mysteries, players manage their PORTAL field office.

### Facilities

| Facility       | Effect | Upgrade path |
|----------------|--------|--------------|
| **Research Lab** | Analyze recovered evidence after mysteries. Starts: basic analysis. | Upgrades: forensic suite → anomaly scanner → predictive modeling |
| **Medical Bay** | Heal injured hunters faster. Starts: basic first aid. | Upgrades: surgery → trauma therapy → experimental treatment |
| **Armory**     | Equip hunters before deployment. Starts: basic weapons. | Upgrades: custom weapons → exotic arsenal → weakness-specific tools |
| **Archives**   | Start mysteries with bonus intel. Starts: newspaper clippings. | Upgrades: occult library → digital analysis → pattern recognition |
| **Training Room** | Level up hunters faster. Starts: basic drills. | Upgrades: specialized courses → simulations → field mentorship |
| **Recruitment** | Expand roster size and attract better hunters. Starts: 4 slots. | Upgrades: larger roster → headhunting → legendary hunters |

### Resources

- **Funding:** Earned per completed mystery (more for cleaner outcomes). Spent on facility upgrades and recruitment.
- **Intel Points:** Earned from excess clues found. Spent on Archive pre-investigation for future mysteries.
- **Specimens/Evidence:** Recovered from mysteries. Fuel Research Lab upgrades and special projects.

---

## Field Reports (Narrative Layer)

After each mystery resolves, a **field report** is generated in the CAMPBELL terminal voice. This is the adventure game / narrative payoff.

### Report Structure

```
[PORTAL FIELD OPERATIONS — CASE FILE #2026-037]
[CLASSIFICATION: AMBER]
[FIELD TEAM: Bravo]
[OPERATIVES: Rosa Quintero (The Professional), Mack Hensley (The Wronged)]

> DISPATCH: 03.15.2026 — Anomalous activity reported at Södermalm Metro Station.
> Multiple civilian reports of "a man who walks through walls."

[INVESTIGATION SUMMARY]
> Quintero established perimeter. Hensley interviewed station staff.
> Key finding: entity observed avoiding Platform 3 — the oldest section,
> still bearing original 1930s tilework.

[CONFRONTATION]
> Intel Level: INFORMED
> The entity — classified as TRICKSTER, motivation: LONELINESS —
> was cornered in the maintenance tunnels.
> Hensley's roll: 2d6+2 (Tough) = 9. Mixed success.

[OUTCOME]
> Monster neutralized. Hensley sustained moderate harm (3).
> Quintero uninjured. Case closed.

[CAMPBELL NOTE]
> The old tiles weren't a weakness. They were a memory.
> Sometimes the monster is just someone who forgot how to leave.
```

Reports are stored and browsable — building an archive of your organization's history. In Phase 1 (PORTAL minigame), these reports become canon lore for the campaign.

---

## Telemetry & Analytics

The game tracks two categories of data from the start, serving two different purposes.

### Purpose 1: Game Tuning

Aggregate analytics to understand how players interact with the game and balance it over time.

### Purpose 2: Campaign Canon

Per-player narrative data that can be exported to generate summaries, stories, or feed back into the PORTAL campaign as "what happened when Field Team X handled Case 7B."

### What Gets Tracked

**Decision telemetry — what players chose AND what they didn't:**

| Event | Data Captured |
|-------|--------------|
| Hunter selection | Which hunters were picked, which were available but not picked, team composition |
| Location visited | Which location, in what order, which locations were skipped entirely |
| Action taken | Action type, which hunter, at which location, what alternatives were available |
| Action NOT taken | At each decision point: the full set of available actions that weren't chosen |
| Clue found / missed | Which clues were discovered, which existed but weren't found |
| Confrontation timing | How many clues / what intel level when player chose to confront (or was forced by countdown) |
| Roll outcomes | Every roll: stat used, modifier, raw dice, final result, luck spent or not |
| Luck decisions | When luck was available but NOT spent (and what the outcome was) |
| Harm events | Who took harm, how much, from what, what the game state was at the time |
| Countdown triggers | What caused each countdown advancement, what step it reached |
| Mystery outcome | Win/loss, intel level, hunters' final conditions, time taken |
| Session timing | Time spent per screen, time per decision (helps identify confusion points) |
| Undo usage | What actions were undone, how often (signals confusing UI or misclicks) |

**The "not taken" data is as important as the "taken" data.** If 90% of players never visit the library location, that's a design signal. If nobody ever uses the Assess action in confrontation, the move might need rebalancing or better explanation.

### Telemetry Event Schema

Each telemetry event is a lightweight append-only record:

```typescript
TelemetryEvent {
  id: string               // unique event ID
  user_id: string          // player session
  mystery_seed: string     // ties to the specific mystery run
  arc_id: string           // which arc this is part of
  case_id: string          // which case within the arc
  event_type: string       // "action_taken", "action_available_not_taken", "roll", "clue_found", etc.
  event_data: JSON         // type-specific payload
  available_options: JSON  // what choices existed at this moment (null if not a decision point)
  chosen_option: string    // what was selected (null if this IS a not-taken event)
  game_state_snapshot: JSON // lightweight context: hunter health, clues found, countdown step
  timestamp: number        // ms since mystery start
  wall_clock: string       // real-world ISO timestamp
}
```

### Telemetry Storage

- **D1 table:** `telemetry_events` — append-only, indexed by user_id, mystery_seed, event_type
- Events are batched client-side (every ~5 actions or on screen transition) and flushed to D1 via Worker endpoint
- No blocking — telemetry writes are fire-and-forget, never delay gameplay

### Campaign Canon Export

For PORTAL campaign integration, a separate export function can:
- Query all telemetry for a given mystery_seed
- Reconstruct the full decision tree: what the player saw, chose, and experienced
- Generate a structured summary (JSON or markdown) suitable for:
  - Feeding into CAMPBELL for narrative field report generation
  - Importing into the PORTAL campaign site as canon events
  - Keeper review ("here's what your players did on Case 7B")
- This is the bridge between "game" and "campaign tool" — the minigame produces narrative artifacts that feed back into the TTRPG

### Analytics Dashboard (Phase 2+)

Future tooling, not MVP, but the data supports it:
- Most/least chosen playbooks across all players
- Average intel level at confrontation (are mysteries too hard/easy?)
- Death rate by mystery, by playbook, by intel level
- Clue discovery rates per location (is a clue too hidden?)
- Action popularity heatmaps
- Funnel: how many players start a mystery vs. finish it
- Per-arc completion rates

---

## Simulation & Balance Testing

The game engine must be usable as a **headless simulation tool** from day one. This isn't test infrastructure bolted on later — it's a core design requirement that shapes the engine architecture.

### Why Simulation Matters

This is a chain-decision game with procedurally assembled content. We need to verify:
- **Feasibility:** Can every generated mystery actually be won? Are all clue paths reachable?
- **Balance:** Are some monster type + motivation + weakness combos unfair? Do certain playbook combos trivialize everything?
- **Difficulty curve:** What's the actual death rate? Does intel level track the way we designed?
- **Completeness:** Are there dead-end states where the player has no meaningful choices left?
- **Fun proxy:** How often do mixed results happen vs. clean wins or total failures? (Too many clean wins = boring. Too many failures = frustrating.)

### Headless Engine

The engine (`src/engine/`) is already designed as pure functions with no UI dependency. This means it can run headless with zero modification:

```typescript
// This must work without React, DOM, or any browser API
const state = deriveState(seed, actionLog);
const availableActions = getAvailableActions(state);
const nextState = applyAction(state, action);
```

The headless runner is just a loop that calls these functions with different strategies.

### Simulation Strategies (AI Players)

The simulator runs mysteries using pluggable **strategy functions** that choose actions:

| Strategy | Behavior | Tests |
|----------|----------|-------|
| `random` | Picks randomly from available actions at each step | Feasibility — does every mystery have a winnable path? |
| `greedy-clues` | Always prioritizes investigation actions, confronts ASAP when Prepared | Best-case scenario — how easy is a mystery when played optimally for info? |
| `blind-rush` | Minimal investigation, confronts early | Worst-case scenario — how deadly is going in blind? |
| `balanced` | Investigates ~70% of locations, confronts at Informed | Typical player proxy — is the average experience good? |
| `exhaustive` | Visits every location, takes every action | Path completeness — can all content be reached? |
| `playbook-biased` | Leans heavily on playbook-specific moves | Per-class balance — does any playbook feel broken or useless? |
| `stamina-conservative` | Never spends stamina, relies on scene actions only | Economy check — is the game playable without stamina spending? |

### Simulation Output

Each simulation run produces a **SimulationReport:**

```typescript
SimulationReport {
  seed: string
  mystery_id: string
  strategy: string
  outcome: "win" | "loss" | "retreat"
  intel_level_at_confrontation: "blind" | "partial" | "informed" | "prepared"
  total_actions: number
  clues_found: number
  clues_available: number
  locations_visited: number
  locations_available: number
  hunters_deployed: number
  hunters_injured: number
  hunters_dead: number
  countdown_reached: number          // 0-6, how far the countdown advanced
  luck_spent: number
  stamina_spent: number
  rounds_in_confrontation: number
  unreachable_clues: string[]        // clues that existed but NO strategy path could find
  unreachable_locations: string[]    // locations that were inaccessible
  dead_end_states: number            // moments where 0 meaningful actions were available
  action_log: ActionEntry[]          // full log for replay/debugging
}
```

### Batch Simulation

A CLI command runs N simulations across M strategies and produces aggregate stats:

```bash
# Run 1000 mysteries with each strategy
npm run simulate -- --count 1000 --strategies all --output reports/sim-batch-001.json

# Test a specific mystery template
npm run simulate -- --mystery mystery-001 --count 500 --strategies all

# Test all monster type + motivation combos
npm run simulate -- --exhaustive-combos --count 100-per-combo --output reports/combo-balance.json
```

### Balance Thresholds

The simulation runner flags mysteries that violate design intent:

| Metric | Target Range | Flag If |
|--------|-------------|---------|
| Win rate (balanced strategy) | 60–80% | < 50% or > 90% |
| Win rate (blind-rush) | 15–30% | > 50% (too easy) or 0% (impossible) |
| Death rate (balanced) | 5–10% per hunter per mystery | > 20% (too deadly) or 0% (no stakes) |
| Clue reachability | 100% of clues reachable by exhaustive | Any unreachable clue |
| Dead-end states | 0 | Any dead-end |
| Average intel at confrontation (balanced) | Informed (4–5 clues) | Consistently Blind or Prepared |
| Confrontation length (prepared) | 2–4 rounds | > 6 (monster too tanky) |
| Confrontation length (blind) | 6–10 rounds | < 4 (no penalty for skipping investigation) |

### Integration with Telemetry

Once real players are generating telemetry data, simulation results can be compared against actual play:
- Are real players performing better or worse than the `balanced` strategy?
- Which decisions do real players make that no simulation strategy covers?
- Where do real players get stuck that simulations breeze through? (UI/UX problem, not balance)

---

## Debug System

### Debug Commands

The game engine exposes a set of **cheat/debug commands** that bypass normal game flow. These are essential for development, testing, and simulation — and optionally accessible via a debug console in the UI.

| Command | Effect |
|---------|--------|
| `debug.revealAllClues()` | Instantly sets intel level to Prepared |
| `debug.revealMonster()` | Shows monster type, motivation, weakness, countdown state |
| `debug.revealMap()` | Shows all locations, their contents, clue placements, threat levels |
| `debug.setIntelLevel(level)` | Override intel level to any tier |
| `debug.setHunterHarm(hunterId, harm)` | Set a hunter's harm to a specific value |
| `debug.setHunterLuck(hunterId, luck)` | Set a hunter's luck to a specific value |
| `debug.setCountdown(step)` | Set countdown to a specific step |
| `debug.addStamina(n)` | Add stamina to the team pool |
| `debug.skipToConfrontation()` | Jump directly to confrontation phase with current intel |
| `debug.forceRoll(value)` | Next roll returns this exact value (for testing specific outcomes) |
| `debug.killHunter(hunterId)` | Instantly set a hunter to dead (test death handling) |
| `debug.completeCase(outcome)` | Skip to case resolution with specified outcome |
| `debug.listActions()` | Print all available actions at current state |
| `debug.dumpState()` | Export full game state as JSON |
| `debug.loadState(json)` | Import a game state snapshot |
| `debug.replayTo(actionIndex)` | Replay action log to a specific point |
| `debug.setSeed(seed)` | Override the mystery seed (start of mystery only) |
| `debug.unlockAllPlaybooks()` | Make all playbooks available |
| `debug.grantResources(type, amount)` | Add funding/intel/specimens |

All debug commands are implemented in the engine layer as pure functions. They produce action log entries tagged as `debug: true` so they can be filtered out of telemetry and simulations.

### Debug Screen (UI)

A hidden debug panel accessible via a konami code, URL parameter (`?debug=1`), or dev-mode flag:

- **State Inspector:** Live view of full game state as a collapsible JSON tree
- **Action Log:** Scrollable list of every action taken, with state diffs
- **Decision Log:** At each decision point, shows what was available and what was chosen (mirrors telemetry)
- **RNG Inspector:** Shows the current RNG position, next N values that will be generated
- **Command Console:** Text input for running any debug command
- **Simulation Runner:** Run a quick simulation from current state with a chosen strategy
- **Telemetry Viewer:** Live stream of telemetry events being emitted

### Debug Mode in Tests

Tests can import debug commands directly:

```typescript
import { createGame, debug } from '../engine';

const game = createGame(seed, mystery);
debug.revealAllClues(game);
const confrontation = debug.skipToConfrontation(game);
expect(confrontation.intelLevel).toBe('prepared');
```

---

## Technical Architecture

### Stack

- **Frontend:** React (Vite), TypeScript
- **Styling:** Tailwind CSS + custom terminal theme for CAMPBELL UI
- **State management:** Zustand or similar (lightweight, fully serializable)
- **Backend:** Cloudflare Workers
- **Database:** Cloudflare D1 (SQLite at edge)
- **Auth:** Simple session + password (hardcoded for MVP, proper auth later)
- **Deployment:** Cloudflare Pages
- **i18n:** i18next + react-i18next
- **Testing:** Vitest (engine unit tests) + Playwright (E2E / UI tests)
- **Layout:** Mobile-first, responsive up to desktop

### Deterministic Game Engine (Critical Architecture)

**All randomness must be seeded and deterministic.** This is a foundational requirement, not an optimization.

#### Seeded RNG
- Every mystery gets a **seed** (generated on mystery creation, stored in DB).
- All dice rolls, monster generation, clue placement, and event outcomes derive from this seed via a deterministic PRNG (e.g., `mulberry32` or similar).
- The RNG is advanced by consuming values in a fixed order — the Nth random value in a playthrough is always the same for a given seed + action sequence.

#### Action Log
- Every player action is recorded as an entry in an ordered **action log** (array of action objects).
- The full game state at any point can be reconstructed by replaying the seed + action log from the beginning.
- Action log entries are minimal: `{ type: "investigate", location: "hospital_east_wing", hunter: "hunter_02", timestamp: ... }`

#### Save System
- **Save state = seed + action log + current step index.** This is tiny and stores to D1 trivially.
- Auto-save after every action (write latest action to log).
- **Resume = replay action log against seed up to saved step.** Fast because it's pure computation, no I/O.
- State snapshots can be cached periodically (every N actions) for faster resume on long mysteries.
- **2–3 save slots per player.** Each slot stores a separate campaign/playthrough. Players can maintain parallel games (e.g., one serious run, one experimental run). Slot selection happens at login/main menu.

#### Undo System
- **Undo = pop last action from log, replay from beginning (or nearest snapshot).**
- Undo is available for any action that did NOT involve randomness (movement, menu choices).
- Once a die is rolled, that roll is locked — undo cannot go past it. (The button disables or shows "Cannot undo past a roll.")
- This gives players freedom to correct misclicks and explore the investigation map without penalty, while keeping dice outcomes permanent and meaningful.

#### Replay / Debug
- Any completed mystery can be replayed from its seed + action log.
- For debugging: log the full action sequence as a string, paste it in, reproduce exact state.
- Enables future features: shareable mystery replays, leaderboard verification, bug reproduction.

### Localization (i18n)

**All player-facing text must go through i18n from day one.** This is an architectural requirement, not a "nice to have later."

- Use `i18next` + `react-i18next`.
- All UI strings, game text, move descriptions, clue text, narrative fragments, and CAMPBELL dialogue must use translation keys, never hardcoded strings.
- Content JSON files (monster types, playbooks, clues, narrative fragments) must support localized string fields.
- Default language: English. Structure supports adding languages without code changes.
- Field reports and narrative generation must be locale-aware.

### Data Model (High Level)

```
User
  └── Save Slots (2–3 independent playthroughs)
        └── Slot
              └── Lab (facilities, resources, upgrades)
              └── Roster (list of Hunter instances)
                    └── Hunter (playbook, stats, harm, luck, experience, bonds, conditions)
              └── Active Mystery (if in progress)
                    └── Mystery (seed, monster, locations, clues, countdown state)
                    └── Action Log (ordered list of player actions)
                    └── Current State (derived from seed + action log, cached)
              └── Arc Progress (current arc, completed cases, achievements)
              └── Archive (completed field reports, keyed by arc and case)
              └── Achievements (tracked milestones)
Telemetry (append-only, cross-slot, keyed by user + mystery seed)
```

### Auth (MVP)

Simple session system:
- Player creates a game with a chosen name + password
- Login returns a session token stored in cookie/localStorage
- D1 stores game state keyed to session
- No email, no OAuth — just name + password
- On login: player sees their save slots and can pick one or start a new one
- Can upgrade to proper auth (Cloudflare Access, etc.) later

### Content Data

Game content stored as JSON, seeded from the PORTAL campaign's extracted data but adapted with game-specific fields:

- `monster-types.json` — types, behaviors, stat profiles
- `motivations.json` — motivation categories and effects
- `weaknesses.json` — weakness types and clue chains
- `locations.json` — location templates and encounter tables
- `playbooks.json` — hunter classes, stats, moves, gear (with original names)
- `moves.json` — shared and class-specific moves with game mechanics
- `countdown-templates.json` — escalation sequences per monster type
- `narrative-fragments.json` — text snippets for field report generation
- `arcs.json` — arc definitions, case sequences, side missions, finales

All content files must include localization-ready string fields.

---

## UI Structure

### Screens

1. **Login / Create Game** — session + password entry, or create new game
2. **Save Slot Selection** — pick a slot or start new playthrough
3. **HQ Dashboard** — overview of lab, roster, arc progress (Phase 2: full management)
4. **Roster** — view hunters, their stats, bonds, conditions, history
5. **Arc Overview** — current arc progress, upcoming cases, completed reports
6. **Mission Briefing** — CAMPBELL terminal: mystery arrives, read the dispatch, choose hunters
7. **Investigation Map** — node map, move between locations, take actions
8. **Location Encounter** — resolve an investigation/interview/fight at a location
9. **Clue Analysis** — review gathered intel, decide when to confront
10. **Confrontation** — turn-based combat with dice rolls
11. **Field Report** — CAMPBELL-narrated outcome, archive entry
12. **Archive** — browse past field reports by arc
13. **Achievements** — milestones and completion tracking
14. **Debug Panel** — hidden, accessible via flag (see Debug System section)

### Visual Style

**Aspiration: Papers Please meets a supernatural investigation bureau.** Utilitarian, institutional, slightly worn. Documents, stamps, case files. The interface should feel like you're working at a desk in a government agency that handles monsters.

| Element | Style |
|---------|-------|
| Mission briefings, field reports, CAMPBELL narration | Terminal / CRT aesthetic — green-on-dark, monospace, scanline effect |
| Investigation map, location encounters | Clean visual UI — cards, nodes, muted institutional palette |
| Confrontation / combat | Visual UI with dice roll animations, health bars, move selection |
| HQ management (Phase 2) | Document/desk aesthetic — file folders, stamps, upgrade requisition forms |

**Phase 1 reality:** Styled text + icons + good typography. The Papers Please aesthetic is the north star, not the MVP requirement. But layout decisions and component structure should support evolving toward it.

### Sound Design

Architecture should include **sound hooks** from the start — event emitters or a sound manager that game actions can trigger, even if no audio files are connected yet.

Planned sound categories (to be implemented post-MVP):
- Ambient: low hum for HQ, location-specific atmosphere during investigation
- UI: terminal typing sounds, dice rolls, button clicks
- Events: countdown advancement, clue discovery, injury, confrontation start
- Music: per-arc themes (stretch goal)

---

## MVP Scope (Phase 1)

### Included
- [ ] Login / create game (name + password, D1-backed)
- [ ] Save slot selection (2–3 slots per player)
- [ ] Deterministic seeded RNG engine with action log
- [ ] Auto-save after every action
- [ ] Undo for non-random actions
- [ ] i18n framework wired up (English only, but all strings through translation keys)
- [ ] Telemetry emitter with decision tracking (chosen + not-chosen)
- [ ] Debug commands for all game state manipulation
- [ ] Debug screen (hidden, flag-activated)
- [ ] Headless simulation runner with at least 3 strategies (random, greedy-clues, balanced)
- [ ] 1 hand-authored mystery fully playable
- [ ] 4 playbooks available (original names, inspired by: Professional, Expert, Wronged, Spooky)
- [ ] Investigation map with 5 locations
- [ ] Action economy: per-scene actions + stamina pool + assist system
- [ ] Clue system (find clues → determine intel level)
- [ ] Confrontation with 2d6 rolls, luck spending (after seeing roll), weakness exploitation
- [ ] Harm, injury, and death mechanics
- [ ] Field report generation (template-based, CAMPBELL voice)
- [ ] Second hand-authored mystery (proves the system works with different content)
- [ ] Mobile-first responsive layout
- [ ] Sound hook architecture (silent, but wired)
- [ ] Vitest unit tests for engine (determinism, replay, all game logic)
- [ ] Playwright E2E tests for critical user flows
- [ ] Simulation balance report for both hand-authored mysteries

### Deferred to Phase 2
- [ ] Procedural mystery generation (monster type + motivation + weakness combinator)
- [ ] Full playbook roster (12 classes)
- [ ] Arc structure (multi-case arcs, setup missions, finales, side missions)
- [ ] Lab facilities and upgrade system
- [ ] Resource management (funding, intel points, specimens)
- [ ] Bond development between hunters over multiple mysteries
- [ ] Recruitment system
- [ ] Difficulty scaling
- [ ] Archive browser with full narrative reports by arc
- [ ] Achievement system
- [ ] Campaign canon export function
- [ ] Analytics dashboard
- [ ] Papers Please visual upgrade
- [ ] Sound and music implementation
- [ ] Embeddable in PORTAL campaign site
- [ ] Leaderboards / cross-player features
- [ ] Additional languages

---

## Design Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Luck timing | Spend after seeing roll | More forgiving, dramatic "do I burn luck?" moment, good for mobile UX |
| Action order | Player chooses which hunter reacts per event + per-scene actions + shared stamina | Gives tactical depth without being overwhelming |
| Assist system | Bond-based charges per mystery | Creates team composition strategy, rewards keeping teams together |
| Mystery structure | Arc-based (cases + setup + finale + side missions) | Gives narrative shape, prevents infinite treadmill feel |
| Randomness | Fully seeded, deterministic PRNG | Enables save/resume/undo/replay/debug/simulation with minimal state |
| Undo | Available until a die roll occurs | Prevents misclick frustration while keeping dice outcomes sacred |
| Art direction | Start with styled text/icons, aspire to Papers Please | Keeps MVP buildable, establishes clear aesthetic north star |
| Sound | Hook architecture now, audio later | Doesn't block MVP but makes adding sound trivial later |
| Layout | Mobile-first | Primary users are PORTAL campaign players between sessions |
| Localization | i18n from day one | Avoids painful retrofit, all strings through translation keys |
| IP approach | Inspired by MotW, original names and mechanics | Avoids legal issues, allows creative freedom |
| State storage | Cloudflare D1 (server-side) | Syncs across devices, supports future multiplayer |
| Save slots | 2–3 per player | Allows parallel playthroughs without losing progress |
| Separate repo | Own repo, reads PORTAL data as reference | Different build/deploy concerns, game data diverges from campaign data |
| Telemetry | Track chosen AND not-chosen at every decision point | Enables both game tuning and campaign canon export |
| Simulation | Headless engine runner from day one | Balance verification, feasibility testing, path completeness |
| Debug system | Full cheat commands + debug screen | Essential for development, testing, and simulation strategies |
| Testing | Vitest (engine) + Playwright (E2E) + simulation (balance) | Three layers: correctness, user flows, game design validation |
