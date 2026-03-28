import { useState } from 'react'
import { useGameStore } from '../store/game'
import * as debug from '../engine/debug'
import type { IntelLevel } from '../engine/types'

export default function DebugPanel({ onClose }: { onClose: () => void }) {
  const { state, setDebugState } = useGameStore()

  const [forceRollValue, setForceRollValue] = useState(7)
  const [intelLevel, setIntelLevel] = useState<IntelLevel>('informed')
  const [selectedHunterId, setSelectedHunterId] = useState('')
  const [harmValue, setHarmValue] = useState(0)
  const [luckValue, setLuckValue] = useState(3)
  const [countdownStep, setCountdownStep] = useState(0)
  const [staminaDelta, setStaminaDelta] = useState(3)
  const [seedInput, setSeedInput] = useState('')
  const [loadJson, setLoadJson] = useState('')

  if (!state) return null

  const hunters = state.team?.hunters ?? []
  const hunterId = selectedHunterId || hunters[0]?.id || ''

  function apply(fn: () => NonNullable<typeof state>) {
    setDebugState(fn())
  }

  function SectionHead({ label }: { label: string }) {
    return (
      <div
        className="font-mono-system text-[0.55rem] tracking-[0.18em] text-[#1a7a43] border-b border-[#1e3428] pb-1 mb-2"
      >
        {label}
      </div>
    )
  }

  function Btn({
    label,
    onClick,
    variant = 'default',
  }: {
    label: string
    onClick: () => void
    variant?: 'default' | 'danger' | 'success' | 'warn'
  }) {
    const colours = {
      default: 'border-[#1e3428] hover:border-[#2ecc71] text-[#5a7a62] hover:text-[#2ecc71]',
      danger: 'border-[#5c2020] hover:border-[#e05050] text-[#e05050]',
      success: 'border-[#1a5c30] hover:border-[#2ecc71] text-[#2ecc71]',
      warn: 'border-[#7a5200] hover:border-[#f0a500] text-[#f0a500]',
    }
    return (
      <button
        onClick={onClick}
        className={`font-mono-system border px-2 py-[3px] text-[0.55rem] tracking-[0.12em] transition-colors ${colours[variant]}`}
      >
        {label}
      </button>
    )
  }

  function NumInput({
    value,
    onChange,
    min,
    max,
  }: {
    value: number
    onChange: (v: number) => void
    min: number
    max: number
  }) {
    return (
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="font-mono-system w-12 bg-[#0d1410] border border-[#1e3428] text-[#c8ddd0] px-1 py-[3px] text-center text-[0.55rem]"
      />
    )
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-end"
      style={{ backgroundColor: 'rgba(8,12,10,0.6)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-[#080c0a] border-l border-[#2ecc71] w-[300px] max-h-screen overflow-y-auto flex flex-col"
        style={{ boxShadow: '-8px 0 40px rgba(46,204,113,0.12)' }}
      >
        {/* Header */}
        <div
          className="sticky top-0 bg-[#080c0a] border-b border-[#2ecc71] px-3 py-2 flex justify-between items-center z-10"
        >
          <span className="font-mono-system text-[0.6rem] tracking-[0.2em] text-[#2ecc71]">
            // DEBUG CONSOLE
          </span>
          <button
            onClick={onClose}
            className="font-mono-system text-[0.55rem] tracking-[0.14em] text-[#5a7a62] hover:text-[#e05050] transition-colors"
          >
            [×] CLOSE
          </button>
        </div>

        <div className="font-mono-system px-3 py-3 space-y-4 text-[0.6rem]">

          {/* Status line */}
          <div className="text-[#5a7a62]">
            PHASE: <span className="text-[#c8ddd0]">{state.phase}</span>
            {state.mystery && (
              <>
                {'  '}INTEL: <span className="text-[#c8ddd0]">{state.mystery.intelLevel}</span>
                {'  '}CLOCK: <span className="text-[#c8ddd0]">{state.mystery.countdown.currentStep}</span>
              </>
            )}
          </div>

          {/* Hunter selector */}
          {hunters.length > 0 && (
            <div>
              <SectionHead label="Active Operative" />
              <select
                value={hunterId}
                onChange={(e) => setSelectedHunterId(e.target.value)}
                className="w-full bg-[#0d1410] border border-[#1e3428] text-[#c8ddd0] px-2 py-1 text-[0.55rem]"
              >
                {hunters.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} — H:{h.harm} L:{h.luck} {h.alive ? '' : '[KIA]'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Revelation */}
          <div>
            <SectionHead label="Revelation" />
            <div className="flex flex-wrap gap-1">
              <Btn label="Reveal Clues" onClick={() => apply(() => debug.revealAllClues(state))} />
              <Btn label="Reveal Monster" onClick={() => apply(() => debug.revealMonster(state))} />
              <Btn label="Reveal Map" onClick={() => apply(() => debug.revealMap(state))} />
            </div>
          </div>

          {/* Intel level */}
          <div>
            <SectionHead label="Intel Level" />
            <div className="flex gap-1 items-center">
              <select
                value={intelLevel}
                onChange={(e) => setIntelLevel(e.target.value as IntelLevel)}
                className="flex-1 bg-[#0d1410] border border-[#1e3428] text-[#c8ddd0] px-2 py-1 text-[0.55rem]"
              >
                {(['blind', 'partial', 'informed', 'prepared'] as IntelLevel[]).map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <Btn label="Set" onClick={() => apply(() => debug.setIntelLevel(state, intelLevel))} />
            </div>
          </div>

          {/* Hunter state */}
          <div>
            <SectionHead label="Hunter State" />
            <div className="space-y-1">
              <div className="flex gap-1 items-center">
                <span className="text-[#5a7a62] w-10">HARM</span>
                <NumInput value={harmValue} onChange={setHarmValue} min={0} max={7} />
                <Btn label="Set" onClick={() => hunterId && apply(() => debug.setHunterHarm(state, hunterId, harmValue))} />
                <Btn label="Kill" variant="danger" onClick={() => hunterId && apply(() => debug.killHunter(state, hunterId))} />
              </div>
              <div className="flex gap-1 items-center">
                <span className="text-[#5a7a62] w-10">LUCK</span>
                <NumInput value={luckValue} onChange={setLuckValue} min={0} max={7} />
                <Btn label="Set" onClick={() => hunterId && apply(() => debug.setHunterLuck(state, hunterId, luckValue))} />
              </div>
            </div>
          </div>

          {/* Resources */}
          <div>
            <SectionHead label="Resources" />
            <div className="space-y-1">
              <div className="flex gap-1 items-center">
                <span className="text-[#5a7a62] w-14">STAMINA Δ</span>
                <NumInput value={staminaDelta} onChange={setStaminaDelta} min={-20} max={20} />
                <Btn label="Add" onClick={() => apply(() => debug.addStamina(state, staminaDelta))} />
              </div>
              <div className="flex gap-1 items-center">
                <span className="text-[#5a7a62] w-14">CLOCK</span>
                <NumInput value={countdownStep} onChange={setCountdownStep} min={0} max={6} />
                <Btn label="Set" onClick={() => apply(() => debug.setCountdown(state, countdownStep))} />
              </div>
            </div>
          </div>

          {/* Phase jumps */}
          <div>
            <SectionHead label="Phase Jump" />
            <div className="space-y-2">
              <div className="flex gap-1 items-center">
                <span className="text-[#5a7a62] w-14">FORCE ROLL</span>
                <NumInput value={forceRollValue} onChange={setForceRollValue} min={2} max={12} />
                <Btn label="Set" onClick={() => apply(() => debug.forceRoll(state, forceRollValue))} />
              </div>
              <Btn
                label="Skip → Confrontation"
                variant="warn"
                onClick={() => apply(() => debug.skipToConfrontation(state))}
              />
              <div className="flex flex-wrap gap-1">
                <Btn label="Complete: Win" variant="success" onClick={() => apply(() => debug.completeCase(state, 'win'))} />
                <Btn label="Complete: Loss" variant="danger" onClick={() => apply(() => debug.completeCase(state, 'loss'))} />
                <Btn label="Complete: Retreat" variant="warn" onClick={() => apply(() => debug.completeCase(state, 'retreat'))} />
              </div>
            </div>
          </div>

          {/* Meta */}
          <div>
            <SectionHead label="Meta" />
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                <Btn label="Unlock All Playbooks" onClick={() => apply(() => debug.unlockAllPlaybooks(state))} />
                <Btn label="Grant Resources" onClick={() => apply(() => debug.grantResources(state))} />
              </div>
              <div className="flex gap-1 items-center">
                <input
                  placeholder="new seed…"
                  value={seedInput}
                  onChange={(e) => setSeedInput(e.target.value)}
                  className="flex-1 bg-[#0d1410] border border-[#1e3428] text-[#c8ddd0] px-2 py-[3px] text-[0.55rem] placeholder-[#1e3428]"
                />
                <Btn label="Set Seed" onClick={() => seedInput && apply(() => debug.setSeed(state, seedInput))} />
              </div>
              <div className="space-y-1">
                <textarea
                  placeholder="paste GameState JSON…"
                  value={loadJson}
                  onChange={(e) => setLoadJson(e.target.value)}
                  rows={3}
                  className="w-full bg-[#0d1410] border border-[#1e3428] text-[#c8ddd0] px-2 py-1 text-[0.55rem] placeholder-[#1e3428] resize-none"
                />
                <Btn
                  label="Load State JSON"
                  variant="warn"
                  onClick={() => loadJson && apply(() => debug.loadState(state, loadJson))}
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
