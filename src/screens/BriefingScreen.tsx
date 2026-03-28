import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/auth'
import { useGameStore } from '../store/game'
import type { MysteryDefinition } from '../engine/types'
import { OPERATIVE_NAMES } from '../data/names'
import playbooksRaw from '../../data/playbooks.json'
const PLAYBOOKS = (playbooksRaw as { playbooks: Array<{ id: string; name: string; vulnerability: string; signatureMoves: Array<{ id: string; name: string; description: string }> }> }).playbooks
import { ALL_MYSTERIES, type MysteryEntry } from '../data/mysteries'
import {
  Card, SectionHeader, Tag, CampbellBlock, Eyebrow, Heading,
  StatusDot, MonoLabel, Icon, Button,
} from '../components/ui'

interface RosterEntry {
  id: string
  name: string
  playbookId: string
  playbookName: string
  stats: { charm: number; cool: number; sharp: number; tough: number; weird: number }
  bondCapacity: number
}

const ROSTER: RosterEntry[] = [
  { id: 'op-0', name: OPERATIVE_NAMES[0],  playbookId: 'expert',   playbookName: 'The Expert',   stats: { charm: -1, cool:  0, sharp:  2, tough: -1, weird:  2 }, bondCapacity: 2 },
  { id: 'op-1', name: OPERATIVE_NAMES[1],  playbookId: 'snoop',    playbookName: 'The Snoop',    stats: { charm:  1, cool:  0, sharp:  2, tough: -1, weird:  1 }, bondCapacity: 3 },
  { id: 'op-2', name: OPERATIVE_NAMES[2],  playbookId: 'crooked',  playbookName: 'The Crooked',  stats: { charm:  2, cool:  1, sharp:  1, tough:  0, weird: -1 }, bondCapacity: 2 },
  { id: 'op-3', name: OPERATIVE_NAMES[3],  playbookId: 'mundane',  playbookName: 'The Mundane',  stats: { charm:  2, cool:  1, sharp:  0, tough:  1, weird: -1 }, bondCapacity: 4 },
  { id: 'op-4', name: OPERATIVE_NAMES[4],  playbookId: 'initiate', playbookName: 'The Initiate', stats: { charm:  0, cool:  1, sharp:  1, tough:  0, weird:  2 }, bondCapacity: 3 },
]

function statLabel(n: number) {
  return n >= 0 ? `+${n}` : `${n}`
}

export default function BriefingScreen() {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)
  const { dispatch } = useGameStore()

  const [mysteryEntry, setMysteryEntry] = useState<MysteryEntry | null>(() => ALL_MYSTERIES.find((e) => e.meta.id === 'mystery-001') ?? null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deploying, setDeploying] = useState(false)
  const [error, setError] = useState('')

  function toggleHunter(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < 4) next.add(id)
      return next
    })
  }

  async function handleDeploy() {
    if (!token || selected.size === 0 || !mysteryEntry) return
    setDeploying(true)
    setError('')
    try {
      const hunters = ROSTER
        .filter((h) => selected.has(h.id))
        .map((h) => ({
          id: h.id, name: h.name, playbookId: h.playbookId,
          stats: h.stats, luck: 7, bondCapacity: h.bondCapacity,
        }))
      await dispatch(token, {
        type: 'startMystery',
        payload: { definition: mysteryEntry.definition as unknown as MysteryDefinition, hunters },
      })
    } catch (e) {
      setError((e as Error).message)
      setDeploying(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#080c0a] p-4 flex flex-col">
      <div className="max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="anim-fade-up">
          <div className="flex items-center gap-2 mb-2">
            <StatusDot />
            <Eyebrow>// PORTAL FIELD OPERATIONS</Eyebrow>
          </div>
          <Heading className="text-[1.4rem] text-[#c8ddd0] mb-1">{t('briefing.title')}</Heading>
          <SectionHeader label="FIELD BRIEFING" />
        </div>

        {/* Mystery selector */}
        <div className="mb-6 anim-fade-up-1">
          <SectionHeader label={`SELECT CASE FILE — ${ALL_MYSTERIES.length} AVAILABLE`} />
          <div className="space-y-2 mb-4 max-h-[280px] overflow-y-auto pr-1">
            {ALL_MYSTERIES.map((entry) => {
              const isActive = mysteryEntry?.meta.id === entry.meta.id
              return (
                <button
                  key={entry.meta.id}
                  onClick={() => { setMysteryEntry(entry); setSelected(new Set()) }}
                  className={`w-full text-left relative border overflow-hidden px-5 py-3 transition-colors duration-200 ${
                    isActive
                      ? 'border-[#7a5200] bg-[rgba(240,165,0,0.04)]'
                      : 'border-[#1e3428] bg-[#0d1410] hover:border-[#2ecc7155] hover:bg-[rgba(46,204,113,0.02)]'
                  }`}
                >
                  <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${
                    isActive ? 'from-[#f0a500]' : 'from-[#1a7a43]'
                  } to-transparent`} />
                  <div className="flex justify-between items-start">
                    <div>
                      <Heading as="div" className={`text-[0.95rem] ${isActive ? 'text-[#f0a500]' : 'text-[#c8ddd0]'}`}>
                        {entry.meta.title}
                      </Heading>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <MonoLabel className="text-[#5a7a62]">{entry.meta.monsterType}</MonoLabel>
                        {entry.meta.tone && <MonoLabel className="text-[#5a7a62]">{entry.meta.tone}</MonoLabel>}
                      </div>
                    </div>
                    {isActive && <Tag label="SELECTED" variant="warning" />}
                  </div>
                </button>
              )
            })}
          </div>

          {/* CAMPBELL briefing for selected mystery */}
          {mysteryEntry && (
            <Card>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Tag label={mysteryEntry.meta.title.toUpperCase()} variant="active" />
                <Tag label="CLASSIFICATION: AMBER" variant="warning" />
              </div>
              <CampbellBlock label="CAMPBELL — FIELD BRIEFING">
                <div className="whitespace-pre-wrap">{mysteryEntry.meta.briefingText}</div>
              </CampbellBlock>
            </Card>
          )}
        </div>

        {/* Hunter selection */}
        <div className="mb-6 anim-fade-up-2">
          <SectionHeader label="DEPLOY FIELD TEAM" />
          <MonoLabel className="text-[#5a7a62] block mb-4">{t('briefing.selectInstruction')}</MonoLabel>

          <div className="space-y-2">
            {ROSTER.map((h) => {
              const isSelected = selected.has(h.id)
              return (
                <button
                  key={h.id}
                  onClick={() => toggleHunter(h.id)}
                  className={`w-full text-left relative border overflow-hidden px-5 py-3 transition-colors duration-200 ${
                    isSelected
                      ? 'border-[#1a7a43] bg-[rgba(46,204,113,0.06)]'
                      : 'border-[#1e3428] bg-[#0d1410] hover:border-[#2ecc7155] hover:bg-[rgba(46,204,113,0.02)]'
                  }`}
                >
                  {/* Gradient accent line */}
                  <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${
                    isSelected ? 'from-[#2ecc71]' : 'from-[#1a7a43]'
                  } to-transparent`} />

                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <Icon
                        name={`playbooks/${h.playbookId}`}
                        size={20}
                        className={isSelected ? 'text-[#2ecc71]' : 'text-[#5a7a62]'}
                      />
                      <div>
                        <Heading as="div" className={`text-[0.95rem] ${isSelected ? 'text-[#2ecc71]' : 'text-[#c8ddd0]'}`}>
                          {h.name}
                        </Heading>
                        <MonoLabel className="text-[#5a7a62] block mt-[2px]">{h.playbookName}</MonoLabel>
                      </div>
                    </div>
                    {isSelected && (
                      <Tag label="SELECTED" variant="active" />
                    )}
                  </div>
                  <div className="mt-2 ml-8 flex flex-wrap gap-x-3 gap-y-0">
                    {(['charm', 'cool', 'sharp', 'tough', 'weird'] as const).map((stat) => (
                      <span key={stat} className="inline-flex items-center gap-1">
                        <Icon name={`stats/${stat}`} size={12} className="text-[#5a7a62]" />
                        <MonoLabel className={`${h.stats[stat] >= 1 ? 'text-[#c8ddd0]' : h.stats[stat] <= -1 ? 'text-[#5a7a62]' : 'text-[#5a7a62]'}`}>
                          {statLabel(h.stats[stat])}
                        </MonoLabel>
                      </span>
                    ))}
                    <MonoLabel className="text-[#5a7a62]">Assists: {h.bondCapacity}</MonoLabel>
                  </div>
                  {isSelected && (() => {
                    const pb = PLAYBOOKS.find((p) => p.id === h.playbookId)
                    if (!pb) return null
                    return (
                      <div className="mt-3 ml-8 space-y-2 border-t border-[#1e3428] pt-2">
                        {pb.signatureMoves.map((move) => (
                          <div key={move.id} className="border-l-2 border-[#1e3428] pl-2">
                            <MonoLabel className="text-[#1a7a43] block">{move.name}</MonoLabel>
                            <p className="font-body text-[0.75rem] text-[#8aab94] leading-[1.5] text-left">
                              {move.description}
                            </p>
                          </div>
                        ))}
                        {pb.vulnerability && (
                          <div className="border-l-2 border-[#5c2020] pl-2">
                            <MonoLabel className="text-[#e05050] block">VULNERABILITY</MonoLabel>
                            <p className="font-body text-[0.75rem] text-[#8aab94] leading-[1.5] text-left">
                              {pb.vulnerability}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </button>
              )
            })}
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="font-mono-system text-[#e05050] text-[0.82rem] tracking-[0.12em] border border-[#5c2020] bg-[rgba(224,80,80,0.04)] px-3 py-2 mb-4"
          >
            {t('common.error', { message: error })}
          </div>
        )}

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleDeploy}
          disabled={selected.size === 0 || !mysteryEntry || deploying}
          className="anim-fade-up-3"
        >
          {deploying
            ? t('common.loading')
            : `${t('briefing.deploy')} (${selected.size}/4 operative${selected.size !== 1 ? 's' : ''})`}
        </Button>

        <div className="border-t border-[#1e3428] mt-8" />
      </div>
    </div>
  )
}
