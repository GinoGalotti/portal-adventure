# UX Improvements Implementation Plan

_Created: 2026-03-28_

---

## Batch Order & Dependencies

```
Batch 1 (parallel, no deps):  Item 6 (fontFamily) + Item 5 (roll inversion)
Batch 2 (sequential):         Item 1 (Button component + migration)
Batch 3 (parallel, need #1):  Item 4 (ConfirmModal) + Item 2 (responsive Investigation)
Batch 4 (sequential):         Item 3 (micro-interactions) → Item 7 (a11y)
```

---

## Item 6: Migrate inline `fontFamily` to CSS utility classes

- [ ] **Status: pending**
- **Size:** Small (mechanical, but needs per-instance verification)
- **Files:** `src/components/ui.tsx`, all 6 screen files, `src/components/DebugPanel.tsx`

### What to do
Replace ~50+ instances of inline `style={{ fontFamily: ... }}` with existing CSS classes:
- `style={{ fontFamily: "'Share Tech Mono', monospace" }}` → add class `font-mono-system`
- `style={{ fontFamily: "'Barlow', sans-serif" }}` → add class `font-body`
- `style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600 }}` → add class `font-heading`

### Risks
- `font-mono-system` bundles `text-transform: uppercase` and `letter-spacing: 0.16em` — elements with custom `tracking-[0.2em]` or non-uppercase text need the Tailwind override kept
- `font-body` bundles `font-weight: 300` and `line-height: 1.75` — verify these don't break italic prose
- Each instance must be verified individually, NOT blind find-replace

### Testing
- Visual comparison before/after on each screen
- Check letter-spacing and text-transform in browser dev tools

---

## Item 5: Invert narrative/mechanical priority in roll results

- [ ] **Status: pending**
- **Size:** Small-Medium
- **Files:** `src/screens/InvestigationScreen.tsx` (RollResult component), `src/screens/ConfrontationScreen.tsx`

### What to do
1. In RollResult (InvestigationScreen): move narrative text to TOP of card, displayed prominently. Move dice display (`dice[0] + dice[1]`, modifier, outcome label) below into a collapsible `<details>`. Keep outcome word (SUCCESS/MIXED/MISS) as a colored Tag next to narrative.
2. In ConfrontationScreen roll result: same pattern. Confrontation has no narrative responses, so outcome label stays primary with dice collapsed.
3. Spend-luck button must remain visible regardless of collapsed state.

### Risks
- If narrative text is `null` (no dialogue/narrative response), card would be empty above fold. Fallback to current layout when no narrative exists.
- Check that `lastQuestion` and `lastNarrativeResponse` state is set for all action types.

### Testing
- Play through investigation with: interviews (dialogue), scene elements (narrative), investigate/fightMinion (no narrative)
- Verify spend-luck button accessible in all cases

---

## Item 1: Create shared `Button` component

- [ ] **Status: pending**
- **Size:** Large (component + migration of ~25 buttons across 7 files)
- **Files:** `src/components/ui.tsx` (add Button), all 6 screens + DebugPanel (migrate)
- **Depends on:** Item 6 (fontFamily migration should be done first)

### What to do

1. Add `Button` to `ui.tsx`:
   - Props: `variant` (primary/secondary/danger/ghost/warning), `size` (sm/md/lg), `icon`, `iconSize`, `fullWidth`, `active`
   - All variants enforce `min-h-[44px]` for touch targets
   - Use `font-mono-system` class
   - Include `transition-colors` and disabled styling

2. Variant styles (derived from existing patterns):
   - **primary:** green border/text (deploy, login, return buttons)
   - **secondary:** dim green border, brightens on hover (logout, transcript)
   - **danger:** red border/text (confrontation attack, fight)
   - **warning:** amber border/text (exploit, free text)
   - **ghost:** transparent border (close, dismiss)

3. Size variants:
   - **sm:** `text-[0.7rem] px-2 py-[5px]`
   - **md:** `text-[0.8rem] px-4 py-2`
   - **lg:** `text-[0.95rem] px-5 py-3 tracking-[0.2em]`

4. Migrate ~25 standard buttons. Do NOT migrate:
   - Hunter selector toggle buttons (custom data-driven state)
   - Exploit option hunter pickers (custom modifier display)
   - Scene element spans (prose-styled)
   - Interview question buttons (prose-styled)

### Risks
- Combat action buttons have `activeCls` toggle — need `active` boolean prop
- Some buttons have very custom layouts (icon + text + modifier) — don't force-fit these

### Testing
- Open every screen, verify buttons render identically
- Check hover, disabled, active states
- Test on 375px mobile viewport for touch target compliance
- Run `npm run test`

---

## Item 4: Replace `window.confirm()` with in-world ConfirmModal

- [ ] **Status: pending**
- **Size:** Medium
- **Files:** `src/components/ui.tsx` (add ConfirmModal), `src/screens/SaveSlotsScreen.tsx`
- **Depends on:** Item 1 (uses Button component)

### What to do

1. Create `ConfirmModal` in `ui.tsx`:
   - Props: `title`, `message`, `confirmLabel`, `cancelLabel`, `variant` (danger/warning), `onConfirm`, `onCancel`
   - Same overlay as InterviewModal (`rgba(8,12,10,0.92)` + `blur(4px)`)
   - Border color matches variant
   - Uses Button component for confirm/cancel
   - Include focus trap (Tab/Shift+Tab between buttons, Escape to close)

2. In SaveSlotsScreen:
   - Add state: `confirmAction` tracking delete/forceClear intent
   - Replace 2 `window.confirm()` calls with `setConfirmAction(...)` → render ConfirmModal
   - On confirm callback, execute original async logic

### Risks
- Force-clear flow is inside a catch block with async retry — needs minor refactor to work with modal callback
- Focus trap must not break with dynamic content

### Testing
- Long-press slot → delete → confirm in modal
- Create save in conflicting slot → force-clear modal
- Cancel dismisses without action
- Escape key closes modal
- Tab cycles between buttons

---

## Item 2: Make Investigation screen responsive

- [ ] **Status: pending**
- **Size:** Large
- **Files:** `src/screens/InvestigationScreen.tsx`, possibly `src/styles/portal-theme.css`
- **Depends on:** Item 1 (Button component for consistent touch targets)

### What to do

1. **Map + Hunter selector layout:** Change to responsive grid:
   - Mobile (<640px): Stack vertically (map on top, hunters below)
   - Desktop (>=640px): Current side-by-side
   - `className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 mb-2"`

2. **Collapsible HunterDetailPanel:** On mobile, default collapsed with summary line. On desktop, always expanded. Use `<details>` with `list-none` (established pattern from session log).

3. **Sticky status bar:** `sticky top-0 z-10 bg-[#080c0a]` on status bar wrapper. Subtle bottom border when stuck.

4. **Map overflow:** Add `overflow-x-auto` on the `<pre>` element to handle narrow viewports.

### Risks
- ASCII map at `text-[1rem]` may overflow on <375px — check all 9 mystery map widths
- Sticky bar might conflict with scanline overlay z-index (1000)
- Stacking layout changes how travel/action buttons relate spatially to map

### Testing
- Test at 320px, 375px, 414px, 768px, 1024px+ viewports
- Verify map readable, hunter selector usable, detail panel collapses/expands
- Check travel buttons and scene elements remain tappable
- Test sticky status bar during scroll

---

## Item 3: Add micro-interaction feedback

- [ ] **Status: pending**
- **Size:** Medium
- **Files:** `src/styles/portal-theme.css` (keyframes), `src/screens/InvestigationScreen.tsx`, `src/screens/ConfrontationScreen.tsx`, `src/components/ui.tsx`
- **Should be done before:** Item 7 (a11y wraps animations)

### What to do

1. **Scene element click flash:** Track `lastClickedElementId` in state. Apply `anim-click-flash` class. Clear on `onAnimationEnd`.
   - CSS: `@keyframes click-flash { 0% { background: rgba(46,204,113,0.2) } 100% { background: transparent } }`

2. **Dice roll reveal:** Animate dice values appearing when `lastRoll` changes.
   - CSS: `@keyframes roll-reveal { 0% { opacity:0; transform:scale(1.3) } 100% { opacity:1; transform:scale(1) } }`
   - Key element on roll timestamp to re-trigger animation

3. **Harm pip pulse:** Add `highlightFrom` prop to `HarmPips`. Pips from `highlightFrom` to `harm-1` get `anim-pulse` for 2s. Track previous harm via `useRef`.

4. **Countdown advance pulse:** Track previous step in `useRef`. Apply `anim-pulse` to countdown Tag when step increases.

### Risks
- CSS animation re-triggering requires `key` prop management
- Must not break React reconciliation
- Harm tracking via useRef needs careful lifecycle handling

### Testing
- Click scene elements → verify flash plays once
- Cause dice rolls → verify reveal animation
- Take harm → verify new pips pulse
- Advance countdown → verify tag pulses

---

## Item 7: Add `prefers-reduced-motion` + basic ARIA

- [ ] **Status: pending**
- **Size:** Medium
- **Files:** `src/styles/portal-theme.css`, `src/screens/InvestigationScreen.tsx`, `src/screens/ConfrontationScreen.tsx`, `src/screens/SaveSlotsScreen.tsx`, `src/components/ui.tsx`
- **Depends on:** Item 3 (needs to wrap those animations too)

### What to do

1. **`prefers-reduced-motion`:** Single CSS block at end of portal-theme.css:
   ```css
   @media (prefers-reduced-motion: reduce) {
     .anim-fade-up, .anim-fade-up-1, .anim-fade-up-2, .anim-fade-up-3,
     .anim-fade-up-4, .anim-pulse, .anim-click-flash, .anim-roll-reveal {
       animation: none !important;
     }
   }
   ```
   Also disable scanline overlay for reduced-motion users.

2. **ARIA labels:** Add to icon-only buttons:
   - ConfrontationScreen: dismiss error button → `aria-label="Dismiss error"`
   - SaveSlotsScreen: delete button → `aria-label`
   - InvestigationScreen: close interview → `aria-label`
   - StatusDot → `aria-hidden="true"` (decorative)
   - Icon component → `aria-hidden="true"` by default

3. **Focus trap in InterviewModal:**
   - Create reusable `useFocusTrap(ref)` hook
   - On mount: store previous focus, query focusable elements, focus first, add Tab/Escape listeners
   - On unmount: restore previous focus
   - Reuse for ConfirmModal (Item 4)

4. **Role attributes:** `role="alert"` on error banners, `role="status"` on action feedback.

### Risks
- Focus trap must handle dynamic content (interview questions vary)
- Scanline disable for reduced-motion might change the aesthetic significantly — verify it still looks good

### Testing
- Set OS to "reduce motion" → verify no animations play
- Tab through every screen with keyboard → verify logical focus order
- Verify focus trapped in modals
- Test with screen reader on key flows

---

## Pre-Implementation Checks

Before starting any work, verify:

- [ ] `font-mono-system` class doesn't cause unwanted side effects with custom `tracking-[...]` overrides
- [ ] `font-body` doesn't collide with Tailwind's custom font utility
- [ ] Map row widths across all 9 mysteries (check for mobile overflow)
- [ ] Count exact buttons to migrate for Item 1

---

## Estimated Effort

- **Batch 1** (Items 6+5): ~1 session (quick cleanup)
- **Batch 2** (Item 1): ~1 session (biggest single effort)
- **Batch 3** (Items 4+2): ~1 session
- **Batch 4** (Items 3+7): ~1 session

**Total: ~3-4 focused sessions**
