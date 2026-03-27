# DESIGN: UI Restyle — Apply PORTAL Design System

_Drop this file in the repo root. Tell Claude Code: "Read this design doc, portal-ui-style-guide.md, and ICON-MATRIX.md. Restyle every screen. Update BACKLOG.md when done."_

_Delete or archive this file after implementation._

---

## Context

The UI is currently raw Tailwind with `bg-gray-950 text-green-400 font-mono`. Functional but flat. Apply the PORTAL design system so every screen feels like the same classified terminal as the campaign site.

**Not a redesign.** Same layouts and components — reskinned with the PORTAL visual language.

---

## Step 0: Foundations

### Fonts (add to index.html head)

```html
<link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Barlow+Condensed:wght@300;400;600;700&family=Barlow:ital,wght@0,300;0,400;1,300&display=swap" rel="stylesheet">
```

### CSS Variables (global CSS or `src/styles/portal-theme.css`)

```css
:root {
  --bg: #080c0a;
  --bg2: #0d1410;
  --bg3: #111a14;
  --green: #2ecc71;
  --green-dim: #1a7a43;
  --green-glow: #2ecc7133;
  --amber: #f0a500;
  --amber-dim: #7a5200;
  --red: #e05050;
  --text: #c8ddd0;
  --text-dim: #5a7a62;
  --border: #1e3428;
  --border-bright: #2ecc7155;
}
```

### Body Overlays (scanline + grid)

```css
body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Barlow', sans-serif;
  font-weight: 300;
}
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 1000;
  pointer-events: none;
  background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 4px);
}
body::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.4;
  background: linear-gradient(90deg, var(--border) 1px, transparent 1px), linear-gradient(180deg, var(--border) 1px, transparent 1px);
  background-size: 40px 40px;
}
```

### Typography Rules (strict, no exceptions)

| Font | Role | Style |
|------|------|-------|
| Share Tech Mono | System labels, tags, status, CAMPBELL | Uppercase, tracking 0.12–0.3em, size 0.55–0.72rem |
| Barlow Condensed | Headlines, names, section titles | Weight 600-700, uppercase, tracking 0.04–0.15em |
| Barlow | Body prose, scene text, reports | Weight 300 (light), normal case, 0.85–1rem, line-height 1.65–1.8 |

---

## Step 1: Global Colour Replacement

Find-and-replace across all screen files:

| Old Tailwind | New |
|-------------|-----|
| `bg-gray-950` | `bg-[#080c0a]` |
| `bg-gray-900` | `bg-[#0d1410]` |
| `bg-gray-800` | `bg-[#111a14]` |
| `text-green-400` | `text-[#c8ddd0]` (body text) |
| `text-green-600` | `text-[#5a7a62]` (dim labels) |
| `text-green-300` | `text-[#2ecc71]` (accents) |
| `text-red-400` | `text-[#e05050]` |
| `text-yellow-400` / `text-yellow-700` | `text-[#f0a500]` |
| `border-green-800` / `border-green-900` | `border-[#1e3428]` |
| `border-green-500` / `border-green-600` | `border-[#2ecc7155]` |
| `hover:bg-green-800` | `hover:bg-[rgba(46,204,113,0.06)]` |
| `hover:bg-gray-800` | `hover:bg-[rgba(46,204,113,0.04)]` |

**Never pure black or white.** All darks are green-tinted. "White" text is `#c8ddd0`.

---

## Step 2: Reusable Components

### Card Panel

Every bordered section:

```tsx
function Card({ children, accent = 'green-dim' }: { children: React.ReactNode; accent?: string }) {
  return (
    <div className="relative border border-[#1e3428] bg-[#0d1410] p-5 overflow-hidden transition-colors duration-200 hover:border-[#2ecc7155]">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#1a7a43] to-transparent" />
      {children}
    </div>
  )
}
```

### Section Header

```tsx
function SectionHeader({ label }: { label: string }) {
  return (
    <>
      <span className="text-[0.65rem] tracking-[0.2em] uppercase text-[#1a7a43]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
        [ {label} ]
      </span>
      <div className="border-t border-[#1e3428] mb-4 mt-1" />
    </>
  )
}
```

### Tag / Badge

```tsx
function Tag({ label, variant = 'default' }: { label: string; variant?: 'default' | 'active' | 'warning' | 'danger' }) {
  const colours = {
    default: 'text-[#5a7a62] border-[#1e3428]',
    active: 'text-[#2ecc71] border-[#1a7a43]',
    warning: 'text-[#f0a500] border-[#7a5200]',
    danger: 'text-[#e05050] border-[#5c2020]',
  }
  return (
    <span className={`inline-block text-[0.55rem] tracking-[0.16em] uppercase border px-[7px] py-[2px] ${colours[variant]}`}
          style={{ fontFamily: "'Share Tech Mono', monospace" }}>
      {label}
    </span>
  )
}
```

### CAMPBELL Block

For all CAMPBELL/terminal narrative:

```tsx
function CampbellBlock({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-[#1a7a43] bg-[rgba(46,204,113,0.03)] px-4 py-[10px]"
         style={{ fontFamily: "'Share Tech Mono', monospace" }}>
      {label && (
        <div className="text-[0.65rem] tracking-[0.2em] text-[#1a7a43] mb-2">// {label}</div>
      )}
      <div className="text-[0.72rem] leading-[1.9] text-[#5a7a62]">
        {children}
      </div>
    </div>
  )
}
```

---

## Step 3: Per-Screen Polish

### LoginScreen

- Eyebrow: Share Tech Mono — `// PORTAL FIELD OPERATIONS · SECURE ACCESS`
- Title: Barlow Condensed large uppercase. One word in `--green` span.
- Inputs: `bg-[var(--bg3)]`, `border-[var(--border)]`, focus: `border-[var(--green-dim)]` + subtle glow.
- Button: full-width, Share Tech Mono uppercase, `bg-[rgba(46,204,113,0.06)]`, `border-[var(--green-dim)]`.
- Pulsing status dot (8px circle, --green, `box-shadow: 0 0 8px var(--green-glow)`, pulse animation).

### SaveSlotsScreen

- Each slot: Card component with gradient accent line.
- Slot name: Barlow Condensed. Metadata: Share Tech Mono tiny `--text-dim`.
- Empty: dashed border, `// EMPTY SLOT` in `--text-dim`.
- Selected: `border-bright`, faint green bg.

### BriefingScreen

- Full terminal. All Share Tech Mono. Background `--bg`.
- CAMPBELL label: `// CAMPBELL — FIELD BRIEFING` in `--green-dim` 0.65rem.
- Content: CampbellBlock component.
- Classification stamp: Tag component, variant `warning`.
- Deploy button: prominent full-width.

### InvestigationScreen

**Status bar (top):** Share Tech Mono 0.6rem, `--text-dim`. Intel level colour-coded (Blind=red, Partial=amber, Informed=green-dim, Prepared=green). Stamina as tiny pips. Countdown as tiny pips progressing amber→red.

**ASCII map:** Share Tech Mono. Current location `--green`. Adjacent clickable `--text-dim` → hover `--green-dim`. Unreachable `--border`. Wrap in Card.

**Operative selector:** Horizontal chips. Share Tech Mono 0.6rem. Unselected: `border-[var(--border)]` `bg-[var(--bg3)]`. Selected: `border-[var(--green-dim)]` `bg-[rgba(46,204,113,0.06)]`. Injured hunters: `--amber` border.

**Scene prose:** Barlow light, `--text`, line-height 1.7+. The only Barlow text on this screen.

**Inline elements:**
- Visible: `text-[var(--green)]`, `border-b border-[var(--green-dim)]`, cursor pointer, hover glow.
- Hidden: `text-[var(--text)]` (same as body), `border-b border-dotted border-transparent`, hover: `border-[var(--green-dim)]`. Invisible until hovered.
- Disabled: `text-[var(--text-dim)]`, cursor not-allowed.

**Adjacent locations:** Small tag buttons with `→` prefix. Share Tech Mono, dim → bright on hover.

**Team status:** Per-hunter row. Name: Barlow Condensed small. Stats: Share Tech Mono tiny. Harm pips colour-coded (0-2 green-dim, 3-6 amber, 7 red).

### ConfrontationScreen

- Monster card: amber/red accent line (not green). Barlow Condensed name, Share Tech Mono type labels.
- Action buttons: Card-styled. Show stat being rolled. Hover: border-bright.
- Dice: large, centered. Both d6 values shown. Barlow Condensed for total, Share Tech Mono for breakdown.
- Outcome label: Success=`--green`, Mixed=`--amber`, Miss=`--red`.
- Push Your Luck button: `--amber` border and text, Share Tech Mono uppercase. Only appears after roll.

### FieldReportScreen

- Pure terminal. Share Tech Mono throughout. `--bg` background.
- Report sections in CampbellBlock components.
- Classification stamps as Tags.
- CAMPBELL NOTE at end: slightly warmer styling, italicised if possible within mono.
- This screen should feel like reading a declassified document on a secure terminal.

---

## Step 4: Icons

See `ICON-MATRIX.md` for the full mapping. Icons from `assets/icons/` are SVGs from game-icons.net.

**How to use them:**
- Import as React components (via SVGR or vite-plugin-svgr) or as `<img>` with CSS colour filter.
- Default: render at 16–24px in `--text-dim` colour.
- Active/highlighted: `--green` or `--green-dim`.
- Place icons next to labels: playbook icon next to hunter name, action icon next to action button text, location icon next to location name.
- Icons are supplementary — text labels always present. Icons add visual recognition speed.

---

## Step 5: Animations

Only two animations, used sparingly:

**fadeUp:** `opacity 0 + translateY(16px)` → `opacity 1 + translateY(0)`. Stagger at 0.1s. Apply on screen load to: title, cards, main panels.

**pulse:** `opacity 1 → 0.3 → 1` over 2s. Apply to: status dots, active countdown pips.

No other animations. No scale, rotate, or complex transitions. Keep it calm.

---

## Step 6: Mobile Responsiveness

- Max content width: 640px on mobile (already mobile-first).
- Operative selector: horizontal scroll if chips overflow.
- Scene prose: generous padding, readable size (16px minimum effective size).
- Action buttons: full-width stacked on mobile.
- Map: may need to scroll horizontally in a contained box on very small screens.
- Touch targets: minimum 44px tap area on all interactive elements.

---

## Acceptance Criteria

After restyle, every screen should:
- [ ] Use green-tinted dark backgrounds (never pure black)
- [ ] Use green-tinted "white" text (never pure #fff)
- [ ] Have scanline and grid overlays visible
- [ ] Use the three-font hierarchy (Share Tech Mono / Barlow Condensed / Barlow)
- [ ] Have gradient accent lines on all card panels
- [ ] Have section headers in bracketed Share Tech Mono format
- [ ] Have the pulsing status dot somewhere on screen
- [ ] Feel like the same system as the PORTAL campaign site
- [ ] Be readable and usable on a phone screen
