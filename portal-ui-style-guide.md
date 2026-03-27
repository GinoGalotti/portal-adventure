# P.O.R.T.A.L — UI & CSS Style Guide

A verbose reference for replicating the PORTAL visual language in other projects. Covers both the **player-facing** (green) and **keeper-facing** (purple) design systems.

---

## 1. Overall Aesthetic Philosophy

The site presents itself as a **classified operational terminal** — a secure internal system used by a paranormal research organisation. Every design decision reinforces the fiction that you are looking at software built by engineers inside the world, not a website designed for an audience. The aesthetic sits halfway between a military command console and a 1990s research lab workstation, rendered with modern CSS.

The feeling is: **competent, restrained, slightly ominous**. Nothing is decorative. Every visual element implies function — even when it's purely atmospheric. Borders exist because this is a system that compartmentalises information. Monospace labels exist because this is a system that catalogues. The green glow exists because someone, in-world, chose that colour for the status indicators, and it stuck.

---

## 2. Foundations

### 2.1 Background & Depth

Three background layers create depth without imagery:

- **`--bg: #080c0a`** — Near-black with a green undertone. The base. Almost no pure black anywhere.
- **`--bg2: #0d1410`** — Slightly lighter. Used for card surfaces, panels, elevated containers.
- **`--bg3: #111a14`** — Lightest dark. Used for input fields, nested containers, inset areas.

The backgrounds are **tinted green**, not neutral grey. This is critical — it makes the whole interface feel like it's being rendered on a phosphor display even though it's a modern screen.

### 2.2 Two Atmospheric Overlays (body::before and body::after)

Every page has two fixed, full-viewport pseudo-element overlays that never scroll:

1. **Scanline overlay** (`body::before`, `z-index: 1000`): A `repeating-linear-gradient` of 2px transparent / 2px `rgba(0,0,0,0.07)` horizontal stripes. Extremely subtle — you barely see it consciously, but removing it makes the page feel flat. It simulates CRT scanlines. `pointer-events: none` so it doesn't interfere with interaction.

2. **Grid texture** (`body::after`, `z-index: 0`): Two perpendicular linear-gradients creating a 40×40px grid of 1px lines in `--border` colour at `opacity: 0.4`. Simulates engineering graph paper / calibration grid behind all content. Also `pointer-events: none`.

Together these create the "looking through a terminal" feeling without any images, SVGs, or canvas.

### 2.3 Typography Stack

Three Google Fonts, each with a strict role:

| Font | Role | Usage |
|------|------|-------|
| **Share Tech Mono** | System / machine voice | Labels, eyebrows, tags, status indicators, CAMPBELL text, monospace UI elements. Always uppercase, wide letter-spacing (0.12em–0.3em). Sizes typically 0.55rem–0.72rem — deliberately small. |
| **Barlow Condensed** | Headlines / structural | Page titles, section headers, card names, navigation. Weights 600–700. Uppercase, letter-spacing 0.04em–0.15em. Sizes clamp from 1.2rem to 5rem. |
| **Barlow** | Body / prose | Descriptions, notes, paragraph text. Weight 300 (light). Normal case. 0.85rem–1rem. Line-height 1.65–1.8. |

The hierarchy is enforced rigidly: if text is a label or system indicator, it's Share Tech Mono. If it's a name or heading, it's Barlow Condensed. If it's prose, it's Barlow light. No exceptions, no mixing.

### 2.4 Colour System

The palette is built on **CSS custom properties** defined in `:root`. Every colour exists in at least two intensities: full and dim.

#### Core Palette (shared by player + keeper)

| Variable | Hex | Role |
|----------|-----|------|
| `--green` | `#2ecc71` | Primary player accent. Status dots, active states, links, borders. |
| `--green-dim` | `#1a7a43` | Subdued green. Labels, eyebrows, dim borders, inactive states. |
| `--green-glow` | `#2ecc7133` | Green at ~20% alpha. `text-shadow` and `box-shadow` glow effects. |
| `--amber` | `#f0a500` | Warning / keeper-in-player-context. Blur notices, PORTAL-original arcs, custom moves. |
| `--amber-dim` | `#7a5200` | Subdued amber. Keeper labels within player pages. |
| `--red` | `#e05050` | Danger / harm. Harm pips, deceased status, critical alerts. |
| `--text` | `#c8ddd0` | Primary text. Green-tinted off-white. Never pure white. |
| `--text-dim` | `#5a7a62` | Secondary text. Green-tinted mid-grey. Used heavily. |
| `--border` | `#1e3428` | Default border. Dark green-tinted. |
| `--border-bright` | `#2ecc7155` | Highlighted border. Green at ~33% alpha. |

#### Player Accent = Green

Player pages use `--green` / `--green-dim` for all interactive accents: active nav links, selected states, filled pips, focus borders, glow effects.

#### Keeper Accent = Purple

Keeper pages introduce three additional variables:

| Variable | Hex | Role |
|----------|-----|------|
| `--keeper` | `#a855f7` | Primary keeper accent. Logo, active links, section borders, tags. |
| `--keeper-dim` | `#4a1d7a` | Subdued purple. Labels, banner borders, hover states. |
| `--keeper-glow` | `#a855f722` | Purple glow. Logo text-shadow, emphasis. |

On keeper pages, everywhere that player pages use `--green`, keeper pages use `--keeper`. The header border becomes `--keeper-dim` instead of `--border-bright`. Nav hover becomes `--keeper` instead of `--green`. The logo glows purple instead of green.

#### Per-Character Accent System (Hunter Pages)

Hunter pages override a set of 7 `--accent-*` variables in a `<style>:root{}` block per HTML file. This allows each character to have a unique tint while sharing all layout CSS:

```css
--accent:      /* Main accent (borders, fills, active states) */
--accent-dim:  /* Subdued accent (eyebrows, labels) */
--accent-glow: /* Hex-alpha glow (text-shadow, box-shadow) */
--accent-a03:  /* rgba at 0.03 alpha (faint tinted backgrounds) */
--accent-a04:  /* rgba at 0.04 alpha (hover backgrounds) */
--accent-a06:  /* rgba at 0.06 alpha (selected backgrounds) */
--accent-a08:  /* rgba at 0.08 alpha (button hover backgrounds) */
```

The alpha variants are critical — they create the layered "barely there" tinting on interactive elements. A selected choice option gets `--accent-a06` background with a `--accent` border. A hovered one gets `--accent-a04`. This creates depth without opacity.

---

## 3. Player-Facing Design System (`player.css`)

### 3.1 Header

- `position: sticky; top: 0; z-index: 100`
- Height: 64px, flexbox row, space-between
- Background: `rgba(8,12,10,0.95)` with `backdrop-filter: blur(8px)` — the page content subtly blurs behind the header as you scroll
- Bottom border: `1px solid var(--border-bright)` — a faint green line separating header from content
- Logo: Share Tech Mono, `--green`, letter-spacing 0.2em, `text-shadow: 0 0 20px var(--green-glow)` — the dots between P.O.R.T.A.L are `--text-dim`
- Nav links: Barlow Condensed 0.8rem, uppercase, `--text-dim` default, `--green` on hover/active
- Status dot: 8×8px circle, `--green` background with matching `box-shadow` glow, pulsing opacity animation (2s ease-in-out infinite, 1.0→0.3→1.0)

### 3.2 Hero Section

Every sub-page opens with a hero block (80px top padding, max-width 1100px, centred). Elements appear with staggered `fadeUp` animations (0s, 0.1s, 0.2s, 0.3s delays):

- **Eyebrow**: Share Tech Mono 0.72rem, `--green-dim`, letter-spacing 0.3em. Format: `// CATEGORY · SUBCATEGORY · CONTEXT`. The `//` prefix is a recurring motif — it suggests a code comment, reinforcing the "this is a system, not a website" fiction.
- **Title**: Barlow Condensed 700, fluid size `clamp(2.5rem, 8vw, 5rem)`, uppercase, tight line-height (0.95). One word or phrase is wrapped in `<span class="accent">` to glow green.
- **Description**: Barlow 300, 1rem, `--text-dim`, max-width 560px, generous line-height (1.8). Readable, restrained prose.
- **CAMPBELL note**: A left-bordered block (2px `--green-dim` border, `rgba(46,204,113,0.03)` background) in Share Tech Mono 0.72rem. Preceded by a `// CAMPBELL —` label. This is the in-world AI system's voice.

### 3.3 Card Pattern

Cards are the primary content container. The pattern repeats across contacts, missions, incidents, evidence, artefacts:

```css
border: 1px solid var(--border);
background: var(--bg2);
padding: ~22px 24px;
position: relative;
overflow: hidden;
```

The distinctive feature: a **2px gradient accent line** along the top via `::before`:

```css
.card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--green-dim), transparent);
}
```

This fades from accent colour on the left to transparent on the right. It's the site's signature visual motif — every card, every section, every panel has this asymmetric top gradient. Status variants change the gradient colour (amber for missing, red for deceased, etc.).

Cards have `transition: border-color 0.2s` and on `:hover` the border shifts to `--border-bright` — a subtle "the system acknowledges your focus" effect.

### 3.4 Tag / Badge Pattern

Tags use Share Tech Mono at tiny sizes (0.55rem–0.65rem) with wide letter-spacing, explicit `border: 1px solid`, and minimal padding (2px 7px). Colour-coded by semantic state:

```css
.tag.active    { color: var(--green);    border-color: var(--green-dim); }
.tag.missing   { color: var(--amber);    border-color: var(--amber-dim); }
.tag.deceased  { color: var(--red);      border-color: #5c2020; }
.tag.unresolved { color: var(--text-dim); border-color: var(--border); }
```

No background colour by default — just tinted text and border. Some active states add `background: rgba(colour, 0.04–0.06)` for a barely-visible fill.

### 3.5 Filter Bar

A flex row of small monospace buttons (Share Tech Mono, 0.65rem, uppercase, letter-spacing 0.16em). Default: transparent background, `--border` border, `--text-dim` text. Active state: `--green` text, `--green` border, `rgba(46,204,113,0.06)` background.

### 3.6 Interactive Tracks (Harm / Luck / XP)

Track rows: flexbox, label on left (Share Tech Mono 0.6rem, 44px width), pips in a flex row.

Pips: 26×26px squares with `--border-bright` border, `cursor: pointer`. Filled state adds a solid colour background:
- Harm: `--red` background, `--red` border
- Luck: `--amber` background, `--amber` border
- XP: `--green-dim` background, `--green` border

The harm track has an inline status label that changes dynamically:
- 0–2 harm: `// OKAY` in `--green-dim`
- 3–6 harm: `// UNSTABLE` in `--amber`
- 7 harm: `// DYING` in `--red`

### 3.7 Blur / Redaction System

Keeper content embedded in player pages is hidden with `filter: blur(4px–5px)`, `pointer-events: none`, `user-select: none`. A `.blur-notice` overlay sits on top: Share Tech Mono 0.65rem, `--amber-dim` border and text, uppercase, reading "// KEEPER ACCESS ONLY — DO NOT READ".

Redacted text uses a `.redact` class: `background: var(--text-dim); color: var(--text-dim)` — the text is there but visually hidden behind a matching-colour bar.

### 3.8 Checklist Pattern (Moves / Gear / Improvements)

List items with a custom checkbox: 13×13px box with `--border` border, 2px border-radius. Checked state: `--accent` border, `--accent-dim` background, a `✓` character via `::after`. Selected items get `--accent-a06` background on the row.

Mandatory items: reduced opacity (0.95), `cursor: default`, permanently checked appearance.

A `// HIDE UNCHOSEN` toggle (floated right, tiny monospace button) adds `.hide-unchecked` to the list, which uses CSS to `display: none` any `.check-item:not(.checked):not(.mandatory)`.

### 3.9 Animation

Two keyframe animations used everywhere:

- **`fadeUp`**: `opacity: 0, translateY(16–20px)` → `opacity: 1, translateY(0)`. Applied with staggered delays (0s, 0.1s, 0.2s, etc.) on hero elements, section headers, cards. `ease` timing, `both` fill-mode.
- **`pulse`**: `opacity: 1` → `0.3` → `1` over 2s. Used on status dots and unlock indicators.

No other animations. No transforms beyond translateY. No scale, rotate, or complex transitions. The site is deliberately calm.

---

## 4. Keeper-Facing Design System (`keeper.css`)

### 4.1 How It Differs From Player

Keeper pages share the same foundations (backgrounds, overlays, typography stack, card patterns) but swap the accent colour from green to purple and add a few keeper-specific elements.

Key differences:
- Logo colour: `--keeper` (#a855f7) instead of `--green`
- Logo glow: `--keeper-glow` instead of `--green-glow`
- Header border: `--keeper-dim` instead of `--border-bright`
- Nav hover/active: `--keeper` instead of `--green`
- Section header borders: `--keeper-dim` instead of `--border-bright`
- Section tags: `--keeper-dim` instead of `--green-dim`
- Status dot: `--keeper` colour, named `.keeper-dot`

### 4.2 Keeper Banner

Keeper pages open with a **warning banner** before the header:

```css
.keeper-banner {
  background: rgba(168,85,247,0.08);
  border-bottom: 1px solid var(--keeper-dim);
  padding: 8px 24px;
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.68rem;
  color: var(--keeper);
  letter-spacing: 0.2em;
}
.keeper-banner::before { content: '⚠'; font-size: 0.9rem; }
```

This is the only place an emoji/symbol appears in the CSS. It signals immediately: "you are in a privileged view."

### 4.3 Keeper Tag System

`.ktag` elements use the same tiny-monospace-bordered pattern as player tags but with an expanded colour palette:

- `.ktag.green` — active/good
- `.ktag.amber` — warning/pending
- `.ktag.red` — danger/blocked
- `.ktag.purple` — keeper-specific
- `.ktag.grey` — neutral/dormant
- `.ktag.teal` — special status (cooperative NPCs, etc.)

### 4.4 Warn Bands

Full-width alert strips:

```css
.warn-band {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.62rem;
  letter-spacing: 0.16em;
  padding: 8px 18px;
}
.warn-band.red    { color: var(--red);    border: 1px solid #7a2020;           background: rgba(224,80,80,0.04); }
.warn-band.amber  { color: var(--amber);  border: 1px solid var(--amber-dim);  background: rgba(240,165,0,0.04); }
.warn-band.purple { color: var(--keeper); border: 1px solid var(--keeper-dim); background: rgba(168,85,247,0.04); }
```

The background alphas are 0.04 — barely visible, just enough to tint the dark background.

### 4.5 Per-Hunter Accent Variables on Keeper Pages

Keeper pages that show per-hunter content (arc tracker, review grids) use wrapper classes like `.hs-rex`, `.hs-reed` that set `--h`, `--h-dim`, `--h-bg` variables. This lets a single card template render in any hunter's colour:

```css
.hs-rex  { --h: #f0a500; --h-dim: #7a5200; --h-bg: rgba(240,165,0,0.04); }
.hs-reed { --h: #3ab5b0; --h-dim: #1a5a58; --h-bg: rgba(58,181,176,0.04); }
.hs-alan { --h: #2ec4b6; --h-dim: #1a6e68; --h-bg: rgba(46,196,182,0.04); }
.hs-sven { --h: #a78bfa; --h-dim: #4c1d95; --h-bg: rgba(167,139,250,0.04); }
```

---

## 5. CAMPBELL / Lab Voice — How the AI System Looks

CAMPBELL (the in-world AI) has a consistent visual treatment across both player and keeper contexts:

- **Font**: Always Share Tech Mono
- **Colour**: `--green-dim` on player pages, sometimes `--keeper-dim` on keeper pages
- **Container**: Left-bordered block (`border-left: 2px solid`), faint tinted background (`rgba(colour, 0.03)`)
- **Label**: `// CAMPBELL —` prefix in even smaller monospace (0.65rem), wider letter-spacing
- **Tone**: Formal, precise, slightly warmer than pure system text. The CSS supports this by giving CAMPBELL blocks their own padding (10px 16px) and generous line-height (1.9) — more breathing room than standard UI elements.

Lab-themed content (incidents, research notes, scanner readouts) uses the same visual vocabulary but leans more heavily on:
- Amber accents for warnings and anomalies
- Monospace throughout (not just labels)
- Classification stamps: tiny uppercase tags like `FIELD EVIDENCE — S03 — ROUTE C`
- Bordered inset blocks for quoted/extracted content

---

## 6. Key Design Rules (Do / Don't)

### Do:
- Use `//` prefix on system labels (e.g., `// STATUS`, `// PENDING IMPROVEMENTS`)
- Keep interactive feedback minimal: border-color transitions (0.12–0.2s), no bounces or overshoots
- Use rgba at very low alphas (0.03–0.08) for background tints — never opaque fills
- Maintain the 40×40px grid overlay on every page
- Use `clamp()` for fluid heading sizes
- Stagger `fadeUp` animations on page load (0.1s increments)
- Keep all text green-tinted, even "white" text (`#c8ddd0`, not `#ffffff`)

### Don't:
- Use pure black (`#000`) or pure white (`#fff`) anywhere
- Use shadows for depth — the site uses borders and background layers instead
- Use rounded corners on cards or containers (exception: 2–4px on tiny checkboxes/buttons)
- Use gradients as fills — only as 2px accent lines and the background grid
- Add decorative elements that don't imply system function
- Use more than one accent colour per page context (green OR purple OR per-character, never mixed)
- Animate anything beyond opacity + translateY

---

## 7. Font Loading

```html
<link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Barlow+Condensed:wght@300;400;600;700&family=Barlow:ital,wght@0,300;0,400;1,300&display=swap" rel="stylesheet">
```

Always include all three families. The `display=swap` ensures content is visible during font load.

---

## 8. Responsive Approach

- Max content width: 1100px, centred with `margin: 0 auto`
- Cards: CSS Grid with `repeat(auto-fill, minmax(Npx, 1fr))` or explicit column counts that collapse at breakpoints
- Mobile nav: hamburger toggle at ≤900px (player) or ≤700px (keeper), full-width dropdown with `backdrop-filter: blur(8px)`
- No horizontal scroll — `overflow-x: hidden` on body
- Stat grids: 5-col → 3-col at 560px
- Card grids: 3-col → 2-col → 1-col at standard breakpoints
