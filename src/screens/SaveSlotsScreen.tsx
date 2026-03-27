import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api, type SlotSummary } from '../api/client'
import { useAuthStore } from '../store/auth'
import { useGameStore } from '../store/game'
import { Card, SectionHeader, Eyebrow, Heading, StatusDot, MonoLabel, Icon } from '../components/ui'

export default function SaveSlotsScreen() {
  const { t } = useTranslation()
  const { token, logout } = useAuthStore()
  const { loadSlot, initSlot, clearSlot } = useGameStore()

  const [slots, setSlots] = useState<SlotSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [longPressSlotId, setLongPressSlotId] = useState<string | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suppressClick = useRef(false)

  useEffect(() => {
    if (!token) return
    api.listSaves(token)
      .then(setSlots)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  async function handleSelect(slot: SlotSummary) {
    if (!token) return
    await loadSlot(token, slot.id)
  }

  async function handleCreate(slotNumber: number) {
    if (!token) return
    setError('')
    try {
      const seed = crypto.randomUUID()
      const created = await api.createSave(token, 'New Operation', seed, slotNumber)
      initSlot(created.id, seed)
    } catch (e) {
      const msg = (e as Error).message
      if (msg.includes('already in use')) {
        // Slot exists in DB but wasn't returned by listSaves — offer to force-clear it
        if (window.confirm(t('slots.confirm.forceClear'))) {
          try {
            await api.deleteSlotByNumber(token, slotNumber)
            // Retry creation after clearing
            const seed = crypto.randomUUID()
            const created = await api.createSave(token, 'New Operation', seed, slotNumber)
            initSlot(created.id, seed)
            return
          } catch (clearErr) {
            setError((clearErr as Error).message)
            return
          }
        }
      }
      setError(msg)
    }
  }

  async function handleDelete(slot: SlotSummary, e: React.MouseEvent) {
    e.stopPropagation()
    if (!token) return
    if (!window.confirm(t('slots.confirm.delete'))) return
    try {
      await api.deleteSave(token, slot.id)
      setSlots((prev) => prev.filter((s) => s.id !== slot.id))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  function handleLogout() {
    clearSlot()
    logout()
  }

  // Long-press to reveal DELETE on mobile
  function startLongPress(slotId: string) {
    longPressTimer.current = setTimeout(() => {
      setLongPressSlotId(slotId)
      suppressClick.current = true
      navigator.vibrate?.(50)
    }, 500)
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  function handleSlotClick(slot: SlotSummary) {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    if (longPressSlotId) {
      setLongPressSlotId(null)
      return
    }
    handleSelect(slot)
  }

  const takenNumbers = new Set(slots.map((s) => s.slotNumber))
  const allSlots: (SlotSummary | null)[] = [1, 2, 3].map(
    (n) => slots.find((s) => s.slotNumber === n) ?? null,
  )

  return (
    <div className="min-h-screen bg-[#080c0a] p-4 flex flex-col">
      <div className="max-w-lg mx-auto w-full">
        {/* Header */}
        <div className="anim-fade-up">
          <div className="flex items-center gap-2 mb-2">
            <StatusDot />
            <Eyebrow>// PORTAL FIELD OPERATIONS</Eyebrow>
          </div>
          <Heading className="text-[1.4rem] text-[#c8ddd0] mb-3">{t('slots.title')}</Heading>
          <SectionHeader label="OPERATION FILES" />
        </div>

        {loading && (
          <MonoLabel className="text-[#5a7a62]">{t('common.loading')}</MonoLabel>
        )}

        {error && (
          <div
            className="text-[#e05050] text-[0.82rem] tracking-[0.12em] uppercase border border-[#5c2020] bg-[rgba(224,80,80,0.04)] px-3 py-2 mb-4"
            style={{ fontFamily: "'Share Tech Mono', monospace" }}
          >
            {t('common.error', { message: error })}
          </div>
        )}

        {/* Slot list */}
        <div className="space-y-3 anim-fade-up-1">
          {allSlots.map((slot, idx) => {
            const slotNumber = idx + 1
            if (slot) {
              return (
                <button
                  key={slot.id}
                  onClick={() => handleSlotClick(slot)}
                  onTouchStart={() => startLongPress(slot.id)}
                  onTouchEnd={cancelLongPress}
                  onTouchMove={cancelLongPress}
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-full text-left group"
                >
                  <Card>
                    <div className="flex justify-between items-start">
                      <div>
                        <MonoLabel className="text-[#1a7a43]">
                          <Icon name="ui/save" size={12} className="text-[#1a7a43] mr-1 relative top-[1px]" />
                          SLOT {slotNumber}
                        </MonoLabel>
                        <Heading as="div" className="text-[1rem] text-[#c8ddd0] mt-1">
                          {slot.name}
                        </Heading>
                        <MonoLabel className="text-[#5a7a62] mt-1 block">
                          {t('slots.lastActive', {
                            date: new Date(slot.updatedAt).toLocaleDateString(),
                          })}
                        </MonoLabel>
                      </div>
                      <button
                        onClick={(e) => handleDelete(slot, e)}
                        className={`text-[0.75rem] tracking-[0.12em] uppercase text-[#5c2020] hover:text-[#e05050] transition-opacity px-2 py-1 ${
                          longPressSlotId === slot.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                        style={{ fontFamily: "'Share Tech Mono', monospace" }}
                      >
                        {t('slots.delete')}
                      </button>
                    </div>
                  </Card>
                </button>
              )
            }

            // Empty slot
            if (takenNumbers.size < 3) {
              return (
                <button
                  key={`empty-${slotNumber}`}
                  onClick={() => handleCreate(slotNumber)}
                  className="w-full text-left border border-dashed border-[#1e3428] hover:border-[#1a7a43] bg-[#080c0a] hover:bg-[rgba(46,204,113,0.02)] px-5 py-4 transition-colors"
                >
                  <MonoLabel className="text-[#5a7a62]">SLOT {slotNumber}</MonoLabel>
                  <div
                    className="text-[0.85rem] tracking-[0.16em] uppercase text-[#5a7a62] mt-2"
                    style={{ fontFamily: "'Share Tech Mono', monospace" }}
                  >
                    // EMPTY SLOT
                  </div>
                  <MonoLabel className="text-[#1a7a43] mt-1 block">
                    <Icon name="ui/new-game" size={12} className="text-[#1a7a43] mr-1 relative top-[1px]" />
                    {t('slots.newGame')}
                  </MonoLabel>
                </button>
              )
            }
            return null
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-[#1e3428] mt-8 pt-4 anim-fade-up-2 flex items-center justify-between">
          <button
            onClick={handleLogout}
            className="text-[0.8rem] tracking-[0.16em] uppercase text-[#5a7a62] hover:text-[#2ecc71] transition-colors"
            style={{ fontFamily: "'Share Tech Mono', monospace" }}
          >
            {t('slots.logout')}
          </button>
          <span
            className="text-[0.65rem] tracking-[0.2em] uppercase text-[#1e3428]"
            style={{ fontFamily: "'Share Tech Mono', monospace" }}
          >
            v{__APP_VERSION__}
          </span>
        </div>
      </div>
    </div>
  )
}
