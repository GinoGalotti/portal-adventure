/**
 * Reusable UI components implementing the PORTAL design system.
 * See portal-ui-style-guide.md for the full spec.
 */
import type { ReactNode } from 'react'

// ─── Card Panel ────────────────────────────────────────────────────────────────
// Every bordered section. Green gradient accent line at top.

export function Card({
  children,
  accent = 'green',
  className = '',
}: {
  children: ReactNode
  accent?: 'green' | 'amber' | 'red'
  className?: string
}) {
  const gradients = {
    green: 'from-[#1a7a43]',
    amber: 'from-[#7a5200]',
    red: 'from-[#7a2020]',
  }
  return (
    <div
      className={`relative border border-[#1e3428] bg-[#0d1410] p-5 overflow-hidden transition-colors duration-200 hover:border-[#2ecc7155] ${className}`}
    >
      <div
        className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${gradients[accent]} to-transparent`}
      />
      {children}
    </div>
  )
}

// ─── Section Header ────────────────────────────────────────────────────────────
// Bracketed monospace label with divider below.

export function SectionHeader({ label }: { label: string }) {
  return (
    <>
      <span
        className="text-[0.85rem] tracking-[0.2em] uppercase text-[#1a7a43]"
        style={{ fontFamily: "'Share Tech Mono', monospace" }}
      >
        [ {label} ]
      </span>
      <div className="border-t border-[#1e3428] mb-4 mt-1" />
    </>
  )
}

// ─── Tag / Badge ───────────────────────────────────────────────────────────────

export function Tag({
  label,
  variant = 'default',
}: {
  label: string
  variant?: 'default' | 'active' | 'warning' | 'danger'
}) {
  const colours: Record<string, string> = {
    default: 'text-[#5a7a62] border-[#1e3428]',
    active: 'text-[#2ecc71] border-[#1a7a43]',
    warning: 'text-[#f0a500] border-[#7a5200]',
    danger: 'text-[#e05050] border-[#5c2020]',
  }
  return (
    <span
      className={`inline-block text-[0.75rem] tracking-[0.16em] uppercase border px-[7px] py-[2px] ${colours[variant]}`}
      style={{ fontFamily: "'Share Tech Mono', monospace" }}
    >
      {label}
    </span>
  )
}

// ─── CAMPBELL Block ────────────────────────────────────────────────────────────
// In-world AI voice. Left-bordered, tinted background.

export function CampbellBlock({
  label,
  children,
}: {
  label?: string
  children: ReactNode
}) {
  return (
    <div
      className="border-l-2 border-[#1a7a43] bg-[rgba(46,204,113,0.03)] px-4 py-[10px]"
      style={{ fontFamily: "'Share Tech Mono', monospace" }}
    >
      {label && (
        <div className="text-[0.85rem] tracking-[0.2em] text-[#1a7a43] mb-2">
          // {label}
        </div>
      )}
      <div className="text-[0.95rem] leading-[1.9] text-[#5a7a62]">
        {children}
      </div>
    </div>
  )
}

// ─── Icon ──────────────────────────────────────────────────────────────────────
// CSS mask-image approach: SVG shape, colour from currentColor.
// Usage: <Icon name="actions/investigate" size={16} />

export function Icon({
  name,
  size = 16,
  className = '',
}: {
  name: string
  size?: number
  className?: string
}) {
  return (
    <span
      className={`inline-block shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: 'currentColor',
        maskImage: `url(/icons/${name}.svg)`,
        WebkitMaskImage: `url(/icons/${name}.svg)`,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
      }}
    />
  )
}

// ─── Status Dot ────────────────────────────────────────────────────────────────
// Pulsing 8px circle. Green by default.

export function StatusDot({ colour = 'green' }: { colour?: 'green' | 'amber' | 'red' }) {
  const bg: Record<string, string> = {
    green: 'bg-[#2ecc71]',
    amber: 'bg-[#f0a500]',
    red: 'bg-[#e05050]',
  }
  const shadow: Record<string, string> = {
    green: '0 0 8px #2ecc7133',
    amber: '0 0 8px #f0a50033',
    red: '0 0 8px #e0505033',
  }
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full anim-pulse ${bg[colour]}`}
      style={{ boxShadow: shadow[colour] }}
    />
  )
}

// ─── Eyebrow ───────────────────────────────────────────────────────────────────
// Share Tech Mono tiny label — the "// CATEGORY · CONTEXT" pattern.

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div
      className="text-[0.95rem] tracking-[0.3em] text-[#1a7a43] mb-2"
      style={{ fontFamily: "'Share Tech Mono', monospace" }}
    >
      {children}
    </div>
  )
}

// ─── Mono Label ────────────────────────────────────────────────────────────────
// Inline Share Tech Mono text at small size.

export function MonoLabel({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`text-[0.8rem] tracking-[0.16em] uppercase ${className}`}
      style={{ fontFamily: "'Share Tech Mono', monospace" }}
    >
      {children}
    </span>
  )
}

// ─── Heading ───────────────────────────────────────────────────────────────────
// Barlow Condensed structural headline.

export function Heading({
  children,
  className = '',
  as: El = 'h1',
}: {
  children: ReactNode
  className?: string
  as?: 'h1' | 'h2' | 'h3' | 'div'
}) {
  return (
    <El
      className={`uppercase tracking-[0.06em] ${className}`}
      style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600 }}
    >
      {children}
    </El>
  )
}

// ─── Harm Pips ─────────────────────────────────────────────────────────────────
// Colour-coded 0-7 pips for harm display.

export function HarmPips({ harm, max = 7 }: { harm: number; max?: number }) {
  return (
    <div className="flex gap-[3px] items-center">
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < harm
        const colour = i < 3
          ? filled ? 'bg-[#1a7a43] border-[#1a7a43]' : 'border-[#1e3428]'
          : i < 6
            ? filled ? 'bg-[#f0a500] border-[#f0a500]' : 'border-[#7a5200]'
            : filled ? 'bg-[#e05050] border-[#e05050]' : 'border-[#5c2020]'
        return (
          <span key={i} className={`inline-block w-[10px] h-[10px] border ${colour}`} />
        )
      })}
    </div>
  )
}

// ─── Luck Pips ─────────────────────────────────────────────────────────────────

export function LuckPips({ luck, max = 7 }: { luck: number; max?: number }) {
  return (
    <div className="flex gap-[3px] items-center">
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={`inline-block w-[10px] h-[10px] border ${
            i < luck
              ? 'bg-[#f0a500] border-[#f0a500]'
              : 'border-[#1e3428]'
          }`}
        />
      ))}
    </div>
  )
}

// ─── Warn Band ─────────────────────────────────────────────────────────────────

export function WarnBand({
  variant = 'amber',
  children,
}: {
  variant?: 'amber' | 'red'
  children: ReactNode
}) {
  const styles: Record<string, string> = {
    amber: 'text-[#f0a500] border-[#7a5200] bg-[rgba(240,165,0,0.04)]',
    red: 'text-[#e05050] border-[#7a2020] bg-[rgba(224,80,80,0.04)]',
  }
  return (
    <div
      className={`text-[0.82rem] tracking-[0.16em] uppercase border px-[18px] py-2 ${styles[variant]}`}
      style={{ fontFamily: "'Share Tech Mono', monospace" }}
    >
      {children}
    </div>
  )
}
