/**
 * Reusable UI components implementing the PORTAL design system.
 * See portal-ui-style-guide.md for the full spec.
 */
import { useEffect, useRef, type ReactNode } from 'react'

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
        className="font-mono-system text-[0.85rem] tracking-[0.2em] text-[#1a7a43]"
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
      className={`font-mono-system inline-block text-[0.75rem] border px-[7px] py-[2px] ${colours[variant]}`}
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
      className="font-mono-system border-l-2 border-[#1a7a43] bg-[rgba(46,204,113,0.03)] px-4 py-[10px]"
    >
      {label && (
        <div className="text-[0.85rem] tracking-[0.2em] text-[#1a7a43] mb-2">
          // {label}
        </div>
      )}
      <div className="text-[0.95rem] leading-[1.9] text-[#5a7a62] normal-case tracking-normal">
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
      aria-hidden="true"
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
      aria-hidden="true"
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
      className="font-mono-system text-[0.95rem] tracking-[0.3em] text-[#1a7a43] mb-2"
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
      className={`font-mono-system text-[0.8rem] ${className}`}
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
      className={`font-heading ${className}`}
    >
      {children}
    </El>
  )
}

// ─── Harm Pips ─────────────────────────────────────────────────────────────────
// Colour-coded 0-7 pips for harm display.

export function HarmPips({ harm, max = 7, highlightFrom }: { harm: number; max?: number; highlightFrom?: number }) {
  return (
    <div className="flex gap-[3px] items-center">
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < harm
        const colour = i < 3
          ? filled ? 'bg-[#1a7a43] border-[#1a7a43]' : 'border-[#1e3428]'
          : i < 6
            ? filled ? 'bg-[#f0a500] border-[#f0a500]' : 'border-[#7a5200]'
            : filled ? 'bg-[#e05050] border-[#e05050]' : 'border-[#5c2020]'
        const pulse = highlightFrom !== undefined && i >= highlightFrom && i < harm
        return (
          <span key={i} className={`inline-block w-[10px] h-[10px] border ${colour}${pulse ? ' anim-pip-pulse' : ''}`} />
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

// ─── Button ───────────────────────────────────────────────────────────────────
// Shared button with variant, size, icon support. All variants enforce min-h-[44px]
// for mobile touch targets.

const variantStyles: Record<string, string> = {
  primary: 'border border-[#1a7a43] text-[#2ecc71] bg-[rgba(46,204,113,0.06)] hover:bg-[rgba(46,204,113,0.12)]',
  secondary: 'border border-[#1e3428] hover:border-[#1a7a43] text-[#5a7a62] hover:text-[#2ecc71]',
  danger: 'border border-[#5c2020] hover:border-[#e05050] text-[#e05050] hover:bg-[rgba(224,80,80,0.06)]',
  warning: 'border border-[#7a5200] text-[#f0a500] hover:border-[#f0a500] hover:bg-[rgba(240,165,0,0.06)]',
  ghost: 'border border-transparent text-[#5a7a62] hover:text-[#2ecc71]',
}

const activeVariantStyles: Record<string, string> = {
  primary: 'border border-[#1a7a43] text-[#2ecc71] bg-[rgba(46,204,113,0.12)]',
  secondary: 'border border-[#1a7a43] text-[#2ecc71]',
  danger: 'border border-[#e05050] text-[#e05050] bg-[rgba(224,80,80,0.06)]',
  warning: 'border border-[#f0a500] text-[#f0a500] bg-[rgba(240,165,0,0.06)]',
  ghost: 'border border-transparent text-[#2ecc71]',
}

const sizeStyles: Record<string, string> = {
  sm: 'text-[0.7rem] px-3 py-1',
  md: 'text-[0.8rem] px-4 py-2',
  lg: 'text-[0.95rem] px-5 py-3 tracking-[0.2em]',
}

const iconSizeDefaults: Record<string, number> = { sm: 10, md: 12, lg: 14 }

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconSize,
  fullWidth = false,
  active = false,
  className = '',
  children,
  ...props
}: {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'warning'
  size?: 'sm' | 'md' | 'lg'
  icon?: string
  iconSize?: number
  fullWidth?: boolean
  active?: boolean
  className?: string
  children: ReactNode
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'>) {
  return (
    <button
      className={[
        'font-mono-system min-h-[44px] transition-colors',
        'disabled:bg-[#0d1410] disabled:border-[#1e3428] disabled:text-[#5a7a62] disabled:cursor-not-allowed',
        sizeStyles[size],
        active ? activeVariantStyles[variant] : variantStyles[variant],
        fullWidth ? 'w-full' : '',
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {icon && (
        <Icon name={icon} size={iconSize ?? iconSizeDefaults[size]} className="mr-1 relative top-[1px]" />
      )}
      {children}
    </button>
  )
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
// In-world replacement for window.confirm(). Themed overlay with focus trap.

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'CONFIRM',
  cancelLabel = 'CANCEL',
  variant = 'danger',
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning'
  onConfirm: () => void
  onCancel: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Focus the cancel button on mount (safer default)
    const panel = panelRef.current
    if (panel) {
      const cancelBtn = panel.querySelector<HTMLButtonElement>('[data-confirm-cancel]')
      cancelBtn?.focus()
    }

    // Escape to close + focus trap
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
        return
      }
      if (e.key === 'Tab' && panel) {
        const focusable = panel.querySelectorAll<HTMLElement>('button')
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  const borderColour = variant === 'danger' ? 'border-[#5c2020]' : 'border-[#7a5200]'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(8,12,10,0.92)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        ref={panelRef}
        className={`bg-[#0d1410] border ${borderColour} max-w-sm w-full p-5`}
      >
        <Heading as="h2" className="text-[1.1rem] text-[#c8ddd0] mb-3">{title}</Heading>
        <p className="font-body text-[0.9rem] text-[#8aab94] mb-5 leading-[1.6]">{message}</p>
        <div className="flex gap-2 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            data-confirm-cancel=""
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            size="sm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
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
      className={`font-mono-system text-[0.82rem] border px-[18px] py-2 ${styles[variant]}`}
    >
      {children}
    </div>
  )
}
