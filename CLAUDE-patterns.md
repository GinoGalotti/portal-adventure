# Code Patterns & Conventions — PORTAL Field Operations Game

_Last updated: 2026-03-26_

---

## Engine Patterns

### Action dispatch (pure reducer)
```typescript
// applyAction does ONE structuredClone at entry; all handlers mutate the clone
const next = structuredClone(state)
// ... handler mutates next ...
return next
```

### RNG threading
```typescript
const rng = new GameRNG()
rng.setState(state.rngState)
// ... use rng ...
next.rngState = rng.getState()
```

### Creating actions
```typescript
// Action log entry shape
{ type: ActionType, payload: {...}, timestamp: number, debug?: true }
```

### Engine test pattern
```typescript
it('description', () => {
  const state = deriveState('test-seed', [/* actions */])
  expect(state.someField).toBe(expected)
})
```

### Free-text exploit pipeline (`src/engine/free-text/`)

Four pure stages composed in `interpretAction()`:

```typescript
import { interpretAction } from './free-text/pipeline'
import type { ActionInterpretation } from './types'

const result: ActionInterpretation = interpretAction({
  input: 'show Eszter the locket and speak of her grief',
  allClues,        // ClueDef[] — all clues from all locations in the mystery
  foundClueIds,    // string[] — mystery.cluesFound
  weakness,        // Weakness — contains freeTextExploits[]
  monsterHarm,     // number — mystery.monster.harm (for maxHarm resolution)
})

// result shape:
// { exploitId, stat, modifier, successHarm, narrativeResult, confidence, matchedClueIds }
```

Stage details:
- **`tokenize(input)`** — lowercase → stop-word filter → stem (`-ing/-ed/-er/-s` stripped) → synonym expand + deduplicate
- **`matchClues(tokens, allClues, foundClueIds)`** — keyword overlap score per found clue; returns `ClueMatch[]` sorted by score
- **`classifyStat(tokens)`** — verb→stat vote map; charm wins ties (priority: charm > cool > sharp > weird > tough)
- **`resolveExploit(tokens, matchedClues, weakness, monsterHarm)`** — walks `freeTextExploits` best→worst modifier; trigger phrase must overlap; prereq clues must all be found

**Known engine limitations** (documented in TEST-COVERAGE.md):
- Names ending in `-er` (e.g., "Eszter") are damaged by the stemmer → avoid in inputs/triggers
- `spirit` synonymizes to `ritual` → contributes weird stat vote (unexpected for "attack the spirit")
- `destroy` synonymizes to `disable` (later group wins) → no tough vote for "destroy"
- `convince/persuade/comfort/appeal` all collapse to `convince` canonical → only 1 charm vote each group
- possessive apostrophe splits tokens (`Bálint's` → `bálint` + `s`; `s` is a stop word → OK)

**Dispatching free-text from UI:**
```typescript
// ConfrontationScreen dispatches:
doAction('exploitWeakness', { hunterId, freeTextInput: inputText })

// Engine records in action log history entry:
{ ...entry, freeTextInput: action.payload.freeTextInput }
```

**Replay safety:** engine re-calls `interpretAction()` on replay; same pure inputs → same result. No non-determinism.

**Debug console testing (browser devtools):**
`interpretAction()` is a pure export — test from devtools or `?debug=1` screen:
```javascript
// Paste the mystery's allClues + weakness from window.gameState, then call directly.
// Combine with debug_forceRoll dispatch to test specific roll outcomes against a free-text exploit.
// The "FREE TEXT" amber button is visible in ConfrontationScreen whenever freeTextExploits exist.
```

### Clue-based exploit options (confrontation)
```typescript
// Engine: getAvailableExploitOptions filters by found clues
import { getAvailableExploitOptions, getExploitOptionById } from './confrontation'
const available = getAvailableExploitOptions(mystery) // returns ExploitOptionDef[]

// Dispatching an exploit action (requires exploitOptionId when exploitOptions exist)
{ type: 'exploitWeakness', payload: { hunterId, exploitOptionId: option.id }, timestamp }

// Resolving harm (supports 'maxHarm' | number)
const resolveHarm = (value: 'maxHarm' | number): number =>
  value === 'maxHarm' ? mystery.monster.maxHarm : value

// Legacy fallback: when weakness.exploitOptions is absent/empty, no exploitOptionId needed
{ type: 'exploitWeakness', payload: { hunterId }, timestamp }
```

---

## React / Zustand Patterns

### Dispatching actions from UI
```typescript
const { state, dispatch } = useGameStore()
const token = useAuthStore((s) => s.token)

async function doAction(type: string, payload: Record<string, unknown> = {}) {
  if (!token) return
  await dispatch(token, {
    type: type as Parameters<typeof dispatch>[1]['type'],
    payload,
  })
}
```

### Screen guard pattern (early return if state not ready)
```typescript
if (!state?.mystery) return null
const { mystery, team } = state
```

### Optimistic dispatch with rollback
Handled inside `useGameStore.dispatch` — UI dispatches optimistically, Worker persists, rolls back on failure.

---

## PORTAL Design System (Tailwind + CSS Variables)

### CSS foundations (`src/styles/portal-theme.css`)
- CSS variables define the colour palette (see `CLAUDE-activeContext.md`)
- Google Fonts loaded in `index.html` (Share Tech Mono, Barlow Condensed, Barlow)
- Scanline + grid overlays on body::before/::after
- Animation classes: `anim-fade-up`, `anim-fade-up-1/2/3`, `anim-pulse`

### Base layout (all screens)
```
bg-[#080c0a] p-4 flex flex-col min-h-screen
max-w-2xl mx-auto w-full   ← content constraint
```

### Reusable components (`src/components/ui.tsx`)
```
Card         — bordered panel with 2px gradient accent (green/amber/red)
SectionHeader — [ LABEL ] in Share Tech Mono with divider below
Tag          — tiny monospace badge (default/active/warning/danger)
CampbellBlock — left-bordered AI voice block (green tint)
Icon         — CSS mask-image SVG renderer (currentColor)
StatusDot    — pulsing 8px circle (green/amber/red)
Eyebrow      — // CATEGORY label in Share Tech Mono
MonoLabel    — inline Share Tech Mono text at 0.6rem
Heading      — Barlow Condensed uppercase headline
HarmPips     — 0-7 coloured squares (green→amber→red)
LuckPips     — amber pip display
WarnBand     — full-width alert strip
```

### Primary button (deploy, confirm, end mystery)
```
border border-[#1a7a43] text-[#2ecc71] hover:bg-[rgba(46,204,113,0.06)]
py-3 text-[0.7rem] tracking-[0.2em] uppercase
font-family: 'Share Tech Mono', monospace
```

### Combat action button
```
border px-2 py-[5px] min-h-[44px] flex items-center gap-1
text-[0.55rem] tracking-[0.12em] uppercase transition-colors
font-family: 'Share Tech Mono', monospace
```

### Danger / red (attack, KIA, defeat)
```
border-[#5c2020] text-[#e05050] hover:border-[#e05050] hover:bg-[rgba(224,80,80,0.04)]
```

### Warning / amber (luck spend, caution)
```
border-[#7a5200] text-[#f0a500] hover:border-[#f0a500] hover:bg-[rgba(240,165,0,0.04)]
```

### Error display
```
text-[#e05050] text-[0.62rem] tracking-[0.12em] uppercase
border border-[#5c2020] bg-[rgba(224,80,80,0.04)] px-3 py-2
```

### Selected state (toggle)
```
border-[#1a7a43] bg-[rgba(46,204,113,0.06)]     ← selected
border-[#1e3428] bg-[#0d1410]                     ← unselected
hover: border-[#2ecc7155] bg-[rgba(46,204,113,0.02)]
```

### Icon usage
```tsx
<Icon name="actions/investigate" size={16} className="text-[#5a7a62]" />
// Icons from assets/icons/ — 9 subdirectories
// CSS mask-image approach; colour via currentColor
```

---

## i18n Pattern

All player-facing strings go through i18next. Zero hardcoded strings.

```typescript
const { t } = useTranslation()

// Usage
t('investigation.title')
t('common.error', { message: error })
t(`roll.outcome.${roll.outcome}` as Parameters<typeof t>[0])
```

Namespaces: `ui` (default), `game`, `narrative`

All strings defined in `src/i18n/index.ts`.

---

## Narrative Data Layer Pattern

For mystery narrative text (scene descriptions, NPC dialogue), use the narrative data layer in `src/data/narrative/`:

```typescript
// src/data/narrative/mystery-001.ts
export interface SceneSegment {
  type: 'text' | 'element'
  content?: string    // for 'text' type
  elementId?: string  // for 'element' type — links to SceneElement
}

export interface SceneElement {
  id: string
  label: string           // shown inline in scene prose
  hidden?: boolean        // discoverable but not highlighted
  actionType: ActionType  // maps to engine action
  requiresStamina?: boolean
  npcId?: string          // if set, opens interview modal
  response?: string       // narrative feedback for no-roll actions (helpBystander)
}

export interface DialogueOption {
  question: string
  responses: { miss: string; mixed: string; success: string }
}
```

Render pattern: split `SceneSegment[]` into text spans and interactive button/spans.

- Visible elements: `text-green-200 border-b border-green-500 cursor-pointer`
- Hidden elements: `text-green-400 border-b border-dotted border-transparent hover:border-green-700 cursor-pointer`
- Disabled elements: `text-green-800 cursor-not-allowed`

### No-roll action feedback (helpBystander, rest)
```typescript
// Multi-part feedback: header (MonoLabel) + body (italic Barlow) split on \n\n
const feedback = element.response
  ? `// ${hunter.name} approaches the ${element.label}.\n\n${element.response}`
  : `// ${hunter.name} helps — action spent.`

// Rendered via split:
actionFeedback.split('\n\n').map((part, i) =>
  i === 0 ? <MonoLabel>{part}</MonoLabel> : <p className="italic font-body">{part}</p>
)
```

### Exploit option selector (ConfrontationScreen)
```typescript
// Triple-path exploit system:
const hasExploitOptions = (mystery.monster.weakness.exploitOptions?.length ?? 0) > 0
const hasFreeTextExploits = (mystery.monster.weakness.freeTextExploits?.length ?? 0) > 0
const availableExploits = hasExploitOptions ? getAvailableExploitOptions(mystery) : []
const canExploitLegacy = !hasExploitOptions && mystery.intelLevel !== 'blind'
const canExploitNew = hasExploitOptions && availableExploits.length > 0

// Path 1 (structured): toggle panel with exploit options → dispatch { hunterId, exploitOptionId }
// Path 2 (free-text): amber "FREE TEXT" button → textarea with live preview → dispatch { hunterId, freeTextInput }
// Path 3 (legacy): single button, dispatch without exploitOptionId (no exploitOptions defined)

// Free-text preview (client-side, non-blocking):
import { interpretAction } from '../engine/free-text/pipeline'
const preview = interpretAction({ input, allClues, foundClueIds, weakness, monsterHarm })
// Shows: modifier, stat, narrativeResult in a preview card before execute
```

### Session log (InvestigationScreen)
```typescript
// Access action log from Zustand store:
const { state, dispatch, actions: actionLog } = useGameStore()

// Collapsed <details> with reverse-chronological entries:
// Shows: numbered entry, hunter name (from payload.hunterId), action type
```

---

## File Layout

```
src/
  engine/         ← pure TypeScript, zero React/DOM imports
  data/
    names.ts      ← operative name pool (100 names)
    narrative/
      mystery-001.ts  ← narrative overlay (scene text, NPC dialogue)
  store/
    auth.ts       ← Zustand + persist
    game.ts       ← Zustand + optimistic dispatch
  screens/        ← React screen components
  api/
    client.ts     ← typed fetch wrappers
    schema.sql    ← D1 schema
  i18n/
    index.ts      ← all English strings
  telemetry/
    emitter.ts    ← fire-and-forget telemetry
  sound/
    manager.ts    ← audio architecture (files TBD)

workers/
  index.ts        ← API router
  auth.ts         ← JWT sign/verify

data/
  mysteries/      ← mystery JSON definitions
  playbooks.json
  moves.json

simulation/       ← headless runner + strategies + CLI
tests/            ← Vitest unit tests
```

---

## Simulation Pattern

New mysteries and engine levers MUST be simulatable. See `simulation/SIMULATION.md` for lever documentation.

```bash
npm run simulate -- --mystery mystery-001 --strategy balanced --runs 50
npm run simulate -- --experiment simulation/experiments/baseline.json
```

Any new field added to mysteries or engine that affects outcomes must be:
1. Documented in `simulation/SIMULATION.md` under the appropriate "Levers" section
2. Expressible via `mysteryOverrides` in experiment JSON configs
