import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/auth'
import { useGameStore } from '../store/game'
import { getAvailableExploitOptions } from '../engine/confrontation'
import { interpretAction } from '../engine/free-text/pipeline'
import {
  interpretActionWithAI,
  createConfrontationContext,
  addTurnToContext,
} from '../ai/interpret'
import type { ConfrontationContext } from '../ai/interpret'
import { AIGMClient } from '../ai/client'
import { buildFreeTextEventData } from '../ai/telemetry'
import { telemetry } from '../telemetry/emitter'
import type { Hunter, ActionInterpretation } from '../engine/types'
import {
  Card, SectionHeader, Tag, Eyebrow, Heading, StatusDot,
  MonoLabel, Icon, HarmPips, LuckPips,
} from '../components/ui'

function HunterStatus({ hunter }: { hunter: Hunter }) {
  const isDead = !hunter.alive
  return (
    <div className={`px-4 py-2 border ${
      isDead ? 'border-[#5c2020]' : 'border-[#1e3428]'
    } bg-[#0d1410]`}>
      <div className="flex items-center gap-3">
        <Icon
          name={`playbooks/${hunter.playbookId}`}
          size={16}
          className={isDead ? 'text-[#e05050]' : 'text-[#5a7a62]'}
        />
        <Heading as="div" className={`text-[0.75rem] flex-1 ${isDead ? 'text-[#e05050]' : 'text-[#c8ddd0]'}`}>
          {hunter.name}
        </Heading>
        <HarmPips harm={hunter.harm} />
        <LuckPips luck={hunter.luck} />
        {isDead && <Tag label="KIA" variant="danger" />}
      </div>
      <div className="flex gap-3 mt-1 ml-7">
        {(['charm', 'cool', 'sharp', 'tough', 'weird'] as const).map((stat) => {
          const val = hunter.stats[stat]
          return (
            <MonoLabel key={stat} className={val >= 1 ? 'text-[#c8ddd0]' : 'text-[#5a7a62]'}>
              {stat.slice(0, 3).toUpperCase()} {val >= 0 ? '+' : ''}{val}
            </MonoLabel>
          )
        })}
      </div>
    </div>
  )
}

export default function ConfrontationScreen() {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)
  const { state, dispatch, error, clearError } = useGameStore()
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [freeTextInput, setFreeTextInput] = useState('')
  const [freeTextPreview, setFreeTextPreview] = useState<ActionInterpretation | null>(null)
  const [freeTextLoading, setFreeTextLoading] = useState(false)

  // Confrontation context persists across renders — tracks turn history for AI
  const confrontationCtx = useRef<ConfrontationContext>(createConfrontationContext())

  // Transcript accumulates per-turn records for export
  const transcriptRef = useRef<Array<{
    turn: number
    hunter: string
    playerInput: string
    keywordResult: ActionInterpretation
    aiResult: import('../ai/types').AIGMResult | null
    aiLatencyMs: number | null
    source: import('../ai/types').AIGMSource
  }>>([])

  if (!state?.mystery || !state.confrontation) return null
  const { mystery, team, confrontation, lastRoll } = state

  const aliveHunters = team.hunters.filter((h) => h.alive)
  const allDead = aliveHunters.length === 0

  async function doAction(type: string, payload: Record<string, unknown> = {}) {
    if (!token) return
    setSelectedAction(null)
    setFreeTextInput('')
    setFreeTextPreview(null)
    await dispatch(token, {
      type: type as Parameters<typeof dispatch>[1]['type'],
      payload,
    })
  }

  function allClues() {
    return mystery.locations.flatMap((loc) => loc.clues)
  }

  function previewFreeText(hunterId: string, input: string) {
    const hunter = team.hunters.find((h) => h.id === hunterId)
    const preview = interpretAction({
      input,
      allClues: allClues(),
      foundClueIds: mystery.cluesFound,
      weakness: mystery.monster.weakness,
      monsterHarm: mystery.monster.harm,
      hunterBestStat: hunter ? (Object.entries(hunter.stats).sort(([,a],[,b]) => b - a)[0]?.[0] as typeof mystery.monster.weakness.statRequired) : undefined,
    })
    setFreeTextPreview(preview)
  }

  async function doFreeTextAction(hunterId: string, input: string) {
    if (!token || !input.trim()) return
    const hunter = team.hunters.find((h) => h.id === hunterId)
    if (!hunter) return

    setFreeTextLoading(true)
    try {
      const hunterBestStat = (Object.entries(hunter.stats).sort(([,a],[,b]) => b - a)[0]?.[0] as typeof mystery.monster.weakness.statRequired) ?? undefined
      const clues = allClues()
      const foundClues = clues.filter((c) => mystery.cluesFound.includes(c.id))
      const unfoundClueCount = clues.length - foundClues.length

      // Run keyword engine (instant) — used for preview and telemetry baseline
      const keywordResult = interpretAction({
        input,
        allClues: clues,
        foundClueIds: mystery.cluesFound,
        weakness: mystery.monster.weakness,
        monsterHarm: mystery.monster.harm,
        hunterBestStat,
      })

      // AI enhancement — opt-in via ?ai=1 URL parameter.
      // Default: keyword-only. Add ?ai=1 to URL to enable AI GM calls.
      const aiEnabled = new URLSearchParams(window.location.search).get('ai') === '1'
      const aiClient = aiEnabled
        ? new AIGMClient({
            workerBaseUrl: '',  // relative — proxied by Vite dev server or same-origin in prod
            token: token,
            maxEntityHarm: mystery.monster.maxHarm,
            validCapabilityIds: (mystery.monster.capabilities ?? []).map((c) => c.id),
          })
        : null
      const result = await interpretActionWithAI({
        input,
        allClues: clues,
        foundClueIds: mystery.cluesFound,
        weakness: mystery.monster.weakness,
        monsterHarm: mystery.monster.harm,
        hunterBestStat,
        aiClient,
        confrontationContext: confrontationCtx.current,
        monster: mystery.monster,
        hunters: team.hunters,
        foundClues,
        unfoundClueCount,
      })

      // Emit telemetry (fire-and-forget)
      const eventData = buildFreeTextEventData(keywordResult, {
        aiResult: result.aiResult,
        aiLatencyMs: result.aiLatencyMs,
        source: result.source,
      })
      telemetry.emit({
        id: `fta-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId: token,
        mysterySeed: mystery.seed ?? '',
        eventType: 'action_taken',
        eventData: eventData as unknown as Record<string, unknown>,
        availableOptions: null,
        chosenOption: input,
        context: {
          phase: state!.phase,
          cluesFound: mystery.cluesFound.length,
          countdownStep: mystery.countdown.currentStep,
          intelLevel: mystery.intelLevel,
          hunterConditions: team.hunters.map((h) => ({
            id: h.id,
            condition: h.harm >= 7 ? 'dead' as const : h.harm >= 6 ? 'seriouslyInjured' as const : h.harm >= 4 ? 'injured' as const : 'healthy' as const,
            harm: h.harm,
            luck: h.luck,
          })),
          staminaRemaining: team.hunters.reduce((sum, h) => sum + h.sceneActionsRemaining, 0),
        },
        gameTimestamp: Date.now(),
        wallClock: new Date().toISOString(),
      })

      // Record turn in confrontation context for subsequent AI calls
      const turnRecord = {
        hunterName: hunter.name,
        input,
        outcome: 'pending',  // Updated after roll resolves
      }
      confrontationCtx.current = addTurnToContext(
        confrontationCtx.current,
        turnRecord,
        result.aiResult,
      )

      // Record in transcript
      transcriptRef.current.push({
        turn: transcriptRef.current.length + 1,
        hunter: hunter.name,
        playerInput: input,
        keywordResult,
        aiResult: result.aiResult,
        aiLatencyMs: result.aiLatencyMs,
        source: result.source,
      })

      // Dispatch the exploit weakness action with free-text input
      await doAction('exploitWeakness', { hunterId: hunter.id, freeTextInput: input })
    } catch (e) {
      console.error('[ConfrontationScreen] doFreeTextAction failed:', e)
      useGameStore.setState({ error: (e as Error).message })
    } finally {
      setFreeTextLoading(false)
    }
  }

  const hasExploitOptions = (mystery.monster.weakness.exploitOptions?.length ?? 0) > 0
  const availableExploits = hasExploitOptions ? getAvailableExploitOptions(mystery) : []
  const canExploitLegacy = !hasExploitOptions && mystery.intelLevel !== 'blind'
  const canExploitNew = hasExploitOptions && availableExploits.length > 0
  const hasFreeTextExploits = (mystery.monster.weakness.freeTextExploits?.length ?? 0) > 0

  function intelVariant(): 'danger' | 'warning' | 'default' | 'active' {
    if (mystery.intelLevel === 'blind') return 'danger'
    if (mystery.intelLevel === 'partial') return 'warning'
    if (mystery.intelLevel === 'informed') return 'default'
    return 'active'
  }

  const outcomeColour = (outcome: string) =>
    outcome === 'success' ? 'text-[#2ecc71]'
    : outcome === 'mixed' ? 'text-[#f0a500]'
    : 'text-[#e05050]'

  return (
    <div className="min-h-screen bg-[#080c0a] p-4 flex flex-col">
      <div className="max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2 anim-fade-up">
          <StatusDot colour="red" />
          <Eyebrow>// CONFRONTATION</Eyebrow>
          {new URLSearchParams(window.location.search).get('ai') === '1' && (
            <Tag label="AI GM" variant="active" />
          )}
        </div>
        <SectionHeader label="ENTITY CONTACT" />

        {/* Monster card */}
        <Card accent="red" className="mb-4 anim-fade-up-1">
          <div className="flex items-start gap-3 mb-3">
            <Icon name={`monsters/${mystery.monster.type}`} size={28} className="text-[#e05050] mt-1" />
            <div>
              <Heading className="text-[1.7rem] text-[#e05050]">{mystery.monster.name}</Heading>
              <div className="flex gap-2 mt-1">
                <Tag label={mystery.monster.type} variant="danger" />
                <Tag label={mystery.monster.motivation} variant="warning" />
              </div>
            </div>
          </div>
          {/* Harm bar */}
          <div className="flex items-center gap-3 mt-3">
            <MonoLabel className="text-[#e05050]">HARM DEALT:</MonoLabel>
            <div className="flex gap-[3px]">
              {Array.from({ length: confrontation.monsterMaxHarm }).map((_, i) => (
                <span
                  key={i}
                  className={`inline-block w-[12px] h-[12px] border ${
                    i < confrontation.monsterHarmTaken
                      ? 'bg-[#e05050] border-[#e05050]'
                      : 'border-[#5c2020]'
                  }`}
                />
              ))}
            </div>
            <MonoLabel className="text-[#e05050]">
              {confrontation.monsterHarmTaken}/{confrontation.monsterMaxHarm}
            </MonoLabel>
          </div>
          {confrontation.monsterDefeated && (
            <div className="mt-3">
              <Tag label="ENTITY NEUTRALISED" variant="active" />
            </div>
          )}
        </Card>

        {/* Intel level + clue panel */}
        <div className="mb-4 anim-fade-up-2">
          <div className="flex items-center gap-3 mb-2">
            <Icon name={`clues/${mystery.intelLevel}`} size={16}
              className={mystery.intelLevel === 'blind' ? 'text-[#e05050]' : mystery.intelLevel === 'partial' ? 'text-[#f0a500]' : 'text-[#1a7a43]'} />
            <Tag label={`INTEL: ${mystery.intelLevel}`} variant={intelVariant()} />
            <MonoLabel className="text-[#5a7a62]">
              {mystery.cluesFound.length} clue{mystery.cluesFound.length !== 1 ? 's' : ''} found
            </MonoLabel>
          </div>
          {mystery.cluesFound.length > 0 && (() => {
            const foundClues = mystery.locations
              .flatMap((loc) => loc.clues)
              .filter((c) => mystery.cluesFound.includes(c.id))
            return (
              <div className="border border-[#1e3428] bg-[#0a110d] px-3 py-2 space-y-1">
                {foundClues.map((clue) => {
                  const summary = clue.description.split(/(?<=[.!?])\s/)[0] ?? clue.description
                  return (
                    <div key={clue.id} className="flex gap-2">
                      <span className="text-[#1a7a43] shrink-0 mt-[2px]" style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.55rem' }}>▸</span>
                      <p className="text-[0.65rem] text-[#8aab94] leading-[1.4]" style={{ fontFamily: "'Barlow', sans-serif" }}>
                        {summary}
                      </p>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>

        {/* Roll result */}
        {lastRoll && (
          <Card className="mb-4">
            <MonoLabel className="text-[#1a7a43] block mb-2">
              <Icon name="ui/dice" size={12} className="text-[#1a7a43] mr-1 relative top-[1px]" />
              {t('roll.title')}
            </MonoLabel>
            <div className="flex items-baseline gap-3 mb-1">
              <Heading as="div" className={`text-[1.7rem] ${outcomeColour(lastRoll.outcome)}`}>
                {lastRoll.dice[0]} + {lastRoll.dice[1]}
              </Heading>
              <MonoLabel className="text-[#5a7a62]">
                {lastRoll.modifier >= 0 ? '+' : ''}{lastRoll.modifier} ({lastRoll.stat})
              </MonoLabel>
            </div>
            <div className={`text-[0.85rem] tracking-[0.16em] uppercase font-bold mb-2 ${outcomeColour(lastRoll.outcome)}`}
                 style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              {t(`roll.outcome.${lastRoll.outcome}` as Parameters<typeof t>[0])}
              {lastRoll.upgraded && (
                <span className="ml-2 text-[#1a7a43]">{t('roll.upgraded')}</span>
              )}
            </div>

            {!lastRoll.upgraded && lastRoll.outcome !== 'success' && (() => {
              const luckyHunter = aliveHunters.find((h) => h.luck > 0 && h.id === lastRoll.hunterId)
              if (!luckyHunter) return null
              return (
                <button
                  onClick={() => doAction('spendLuck', { hunterId: luckyHunter.id })}
                  className="mt-2 text-[0.6rem] tracking-[0.16em] uppercase border border-[#7a5200] text-[#f0a500] hover:bg-[rgba(240,165,0,0.06)] px-3 py-1 transition-colors"
                  style={{ fontFamily: "'Share Tech Mono', monospace" }}
                >
                  <Icon name="actions/push-luck" size={12} className="text-[#f0a500] mr-1 relative top-[1px]" />
                  {t('roll.spendLuck', { remaining: luckyHunter.luck })}
                </button>
              )
            })()}
          </Card>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-4 border border-[#5c2020] bg-[rgba(224,80,80,0.06)] px-3 py-2 flex items-center gap-2">
            <MonoLabel className="text-[#e05050] flex-1">{error}</MonoLabel>
            <button
              onClick={clearError}
              className="text-[#e05050] hover:text-[#ff8080] text-[0.6rem] tracking-[0.12em] uppercase border border-[#5c2020] px-2 py-1"
              style={{ fontFamily: "'Share Tech Mono', monospace" }}
            >
              DISMISS
            </button>
          </div>
        )}

        {/* Combat actions — action-first layout */}
        {!confrontation.monsterDefeated && !allDead && (
          <div className="mb-4 anim-fade-up-3">
            <SectionHeader label="COMBAT ACTIONS" />
            {/* Step 1: Pick an action */}
            <div className="flex flex-wrap gap-1 mb-3">
              {[
                { type: 'attack',  icon: 'actions/attack',  label: t('confrontation.action.attack'),  cls: 'border-[#5c2020] text-[#e05050] hover:border-[#e05050] hover:bg-[rgba(224,80,80,0.04)]', activeCls: 'border-[#e05050] bg-[rgba(224,80,80,0.08)] text-[#e05050]' },
                { type: 'defend',  icon: 'actions/defend',  label: t('confrontation.action.defend'),  cls: 'border-[#1e3428] text-[#5a7a62] hover:border-[#1a7a43] hover:text-[#2ecc71]', activeCls: 'border-[#1a7a43] bg-[rgba(46,204,113,0.06)] text-[#2ecc71]' },
                { type: 'resist',  icon: 'actions/resist',  label: t('confrontation.action.resist'),  cls: 'border-[#1e3428] text-[#5a7a62] hover:border-[#1a7a43] hover:text-[#2ecc71]', activeCls: 'border-[#1a7a43] bg-[rgba(46,204,113,0.06)] text-[#2ecc71]' },
                { type: 'distract', icon: 'actions/distract', label: t('confrontation.action.distract'), cls: 'border-[#1e3428] text-[#5a7a62] hover:border-[#1a7a43] hover:text-[#2ecc71]', activeCls: 'border-[#1a7a43] bg-[rgba(46,204,113,0.06)] text-[#2ecc71]' },
                { type: 'assess',  icon: 'actions/assess',  label: t('confrontation.action.assess'),  cls: 'border-[#1e3428] text-[#5a7a62] hover:border-[#1a7a43] hover:text-[#2ecc71]', activeCls: 'border-[#1a7a43] bg-[rgba(46,204,113,0.06)] text-[#2ecc71]' },
              ].map(({ type, icon, label, cls, activeCls }) => (
                <button
                  key={type}
                  onClick={() => {
                  if (aliveHunters.length === 1) {
                    doAction(type, { hunterId: aliveHunters[0].id })
                  } else {
                    setSelectedAction(selectedAction === type ? null : type)
                  }
                }}
                  className={`text-[0.7rem] tracking-[0.12em] uppercase border px-2 py-[5px] transition-colors min-h-[44px] flex items-center gap-1 ${
                    selectedAction === type ? activeCls : cls
                  }`}
                  style={{ fontFamily: "'Share Tech Mono', monospace" }}
                >
                  <Icon name={icon} size={12} className="relative top-[0px]" />
                  {label}
                </button>
              ))}
              {(canExploitLegacy || canExploitNew) && (
                <button
                  onClick={() => setSelectedAction(selectedAction === 'exploitWeakness' ? null : 'exploitWeakness')}
                  className={`text-[0.7rem] tracking-[0.12em] uppercase border px-2 py-[5px] transition-colors min-h-[44px] flex items-center gap-1 ${
                    selectedAction === 'exploitWeakness'
                      ? 'border-[#f0a500] bg-[rgba(240,165,0,0.06)] text-[#f0a500]'
                      : 'border-[#7a5200] text-[#f0a500] hover:border-[#f0a500] hover:bg-[rgba(240,165,0,0.04)]'
                  }`}
                  style={{ fontFamily: "'Share Tech Mono', monospace" }}
                >
                  <Icon name="actions/exploit" size={12} />
                  {t('confrontation.action.exploitWeakness')}
                </button>
              )}
              {hasFreeTextExploits && (
                <button
                  onClick={() => {
                    setSelectedAction(selectedAction === 'freeText' ? null : 'freeText')
                    setFreeTextInput('')
                    setFreeTextPreview(null)
                  }}
                  className={`text-[0.7rem] tracking-[0.12em] uppercase border px-2 py-[5px] transition-colors min-h-[44px] flex items-center gap-1 ${
                    selectedAction === 'freeText'
                      ? 'border-[#f0a500] bg-[rgba(240,165,0,0.06)] text-[#f0a500]'
                      : 'border-[#7a5200] text-[#f0a500] hover:border-[#f0a500] hover:bg-[rgba(240,165,0,0.04)]'
                  }`}
                  style={{ fontFamily: "'Share Tech Mono', monospace" }}
                >
                  <Icon name="actions/exploit" size={12} />
                  FREE TEXT
                </button>
              )}
            </div>

            {/* Step 2: Pick a hunter (for standard actions) */}
            {selectedAction && selectedAction !== 'exploitWeakness' && selectedAction !== 'freeText' && (
              <div className="border border-[#1e3428] bg-[#0d1410] p-3 mb-3">
                <MonoLabel className="text-[#5a7a62] block mb-2">// SELECT OPERATIVE</MonoLabel>
                <div className="space-y-1">
                  {aliveHunters.map((hunter) => (
                    <button
                      key={hunter.id}
                      onClick={() => doAction(selectedAction, { hunterId: hunter.id })}
                      className="w-full flex items-center gap-3 border border-[#1e3428] hover:border-[#1a7a43] bg-[#0d1410] hover:bg-[rgba(46,204,113,0.03)] px-3 py-2 transition-colors"
                    >
                      <Icon name={`playbooks/${hunter.playbookId}`} size={14} className="text-[#5a7a62]" />
                      <MonoLabel className="text-[#c8ddd0] flex-1 text-left">{hunter.name}</MonoLabel>
                      <MonoLabel className="text-[#5a7a62]">
                        +{hunter.stats[mystery.monster.weakness.statRequired ?? 'tough'] ?? 0} {mystery.monster.weakness.statRequired}
                      </MonoLabel>
                      <MonoLabel className="text-[#5a7a62]">L:{hunter.luck} H:{hunter.harm}</MonoLabel>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2b: Exploit weakness — show exploit options then hunter */}
            {selectedAction === 'exploitWeakness' && (
              <div className="border border-[#7a5200] bg-[#0d1410] p-3 mb-3">
                {canExploitNew ? (
                  <>
                    <MonoLabel className="text-[#f0a500] block mb-2">
                      {t('confrontation.exploit.selectApproach')}
                    </MonoLabel>
                    {availableExploits.map((option) => {
                      const mod = option.modifier
                      const stat = option.statRequired ?? mystery.monster.weakness.statRequired
                      return (
                        <div key={option.id} className="mb-2">
                          <div className="flex items-center gap-3 border border-[#1e3428] px-3 py-2 mb-1">
                            <span className="text-[0.8rem] tracking-[0.1em] font-bold shrink-0 text-[#f0a500]"
                              style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                              {mod >= 0 ? '+' : ''}{mod}
                            </span>
                            <span className="text-[0.75rem] text-[#c8ddd0] flex-1" style={{ fontFamily: "'Barlow', sans-serif" }}>
                              {t(option.description as Parameters<typeof t>[0])}
                            </span>
                            {stat && (
                              <span className="text-[0.65rem] tracking-[0.12em] uppercase text-[#5a7a62] shrink-0"
                                style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                                {stat}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1 ml-4">
                            {aliveHunters.map((hunter) => {
                              const hunterStat = hunter.stats[stat ?? 'tough'] ?? 0
                              const totalMod = mod + hunterStat
                              const totalColor = totalMod > 0 ? 'text-[#2ecc71]' : totalMod < 0 ? 'text-[#e05050]' : 'text-[#f0a500]'
                              return (
                                <button
                                  key={hunter.id}
                                  onClick={() => doAction('exploitWeakness', { hunterId: hunter.id, exploitOptionId: option.id })}
                                  className="flex items-center gap-1 border border-[#1e3428] hover:border-[#7a5200] px-2 py-1 text-[0.5rem] tracking-[0.1em] uppercase text-[#5a7a62] hover:text-[#f0a500] transition-colors"
                                  style={{ fontFamily: "'Share Tech Mono', monospace" }}
                                >
                                  <Icon name={`playbooks/${hunter.playbookId}`} size={10} />
                                  {hunter.name.split(' ')[0]}
                                  <span className={totalColor}>
                                    {totalMod >= 0 ? '+' : ''}{totalMod}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </>
                ) : (
                  <>
                    <MonoLabel className="text-[#f0a500] block mb-2">// SELECT OPERATIVE</MonoLabel>
                    <div className="space-y-1">
                      {aliveHunters.map((hunter) => (
                        <button
                          key={hunter.id}
                          onClick={() => doAction('exploitWeakness', { hunterId: hunter.id })}
                          className="w-full flex items-center gap-3 border border-[#1e3428] hover:border-[#7a5200] bg-[#0d1410] hover:bg-[rgba(240,165,0,0.03)] px-3 py-2 transition-colors"
                        >
                          <Icon name={`playbooks/${hunter.playbookId}`} size={14} className="text-[#f0a500]" />
                          <MonoLabel className="text-[#c8ddd0] flex-1 text-left">{hunter.name}</MonoLabel>
                          <MonoLabel className="text-[#5a7a62]">L:{hunter.luck} H:{hunter.harm}</MonoLabel>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 2c: Free text — hunter picker + textarea */}
            {selectedAction === 'freeText' && (
              <div className="border border-[#7a5200] bg-[#0d1410] p-3 mb-3">
                <MonoLabel className="text-[#f0a500] block mb-2">// DESCRIBE YOUR APPROACH</MonoLabel>
                <textarea
                  className="w-full bg-[#080c0a] border border-[#1e3428] text-[#c8ddd0] p-2 text-[0.65rem] resize-none focus:outline-none focus:border-[#f0a500]"
                  style={{ fontFamily: "'Barlow', sans-serif", minHeight: '60px' }}
                  placeholder="How do you confront the entity? (e.g. 'convince Balint to release her')"
                  value={freeTextInput}
                  onChange={(e) => {
                    setFreeTextInput(e.target.value)
                    if (e.target.value.trim().length > 3 && aliveHunters[0]) {
                      previewFreeText(aliveHunters[0].id, e.target.value)
                    } else {
                      setFreeTextPreview(null)
                    }
                  }}
                />
                {freeTextPreview && (
                  <div className="mt-2 border border-[#1e3428] bg-[#080c0a] px-3 py-2 space-y-1">
                    <div className="flex items-center gap-3">
                      <MonoLabel className={freeTextPreview.modifier >= 0 ? 'text-[#2ecc71]' : 'text-[#e05050]'}>
                        {freeTextPreview.modifier >= 0 ? '+' : ''}{freeTextPreview.modifier}
                      </MonoLabel>
                      <MonoLabel className="text-[#5a7a62]">
                        {freeTextPreview.stat} · {freeTextPreview.statConfidence}
                      </MonoLabel>
                      {freeTextPreview.exploitId && (
                        <MonoLabel className="text-[#f0a500]">EXPLOIT MATCH</MonoLabel>
                      )}
                    </div>
                    {freeTextPreview.narrativeResult && (
                      <p className="text-[0.6rem] text-[#c8ddd0] italic" style={{ fontFamily: "'Barlow', sans-serif" }}>
                        {freeTextPreview.narrativeResult}
                      </p>
                    )}
                  </div>
                )}
                <MonoLabel className="text-[#5a7a62] block mt-3 mb-1">// EXECUTE WITH OPERATIVE</MonoLabel>
                <div className="flex gap-1 flex-wrap">
                  {aliveHunters.map((hunter) => (
                    <button
                      key={hunter.id}
                      disabled={!freeTextInput.trim() || freeTextLoading}
                      onClick={() => doFreeTextAction(hunter.id, freeTextInput)}
                      className="flex items-center gap-1 border border-[#7a5200] hover:border-[#f0a500] hover:bg-[rgba(240,165,0,0.04)] disabled:opacity-30 disabled:cursor-not-allowed px-3 py-2 transition-colors"
                      style={{ fontFamily: "'Share Tech Mono', monospace" }}
                    >
                      <Icon name={`playbooks/${hunter.playbookId}`} size={12} className="text-[#f0a500]" />
                      <MonoLabel className="text-[#f0a500]">{hunter.name}</MonoLabel>
                      <MonoLabel className="text-[#5a7a62]">+{hunter.stats[mystery.monster.weakness.statRequired ?? 'tough'] ?? 0}</MonoLabel>
                    </button>
                  ))}
                </div>
                {freeTextLoading && (
                  <MonoLabel className="text-[#f0a500] block mt-2">INTERPRETING...</MonoLabel>
                )}
              </div>
            )}
          </div>
        )}

        {/* End mystery */}
        <div className="space-y-2 mb-4">
          {(confrontation.monsterDefeated || allDead) && (
            <button
              onClick={() => doAction('endMystery', { outcome: confrontation.monsterDefeated ? 'win' : 'loss' })}
              className={`w-full border py-3 text-[0.7rem] tracking-[0.2em] uppercase transition-colors ${
                confrontation.monsterDefeated
                  ? 'border-[#1a7a43] text-[#2ecc71] hover:bg-[rgba(46,204,113,0.06)]'
                  : 'border-[#5c2020] text-[#e05050] hover:bg-[rgba(224,80,80,0.04)]'
              }`}
              style={{ fontFamily: "'Share Tech Mono', monospace" }}
            >
              <Icon name={confrontation.monsterDefeated ? 'ui/victory' : 'ui/defeat'} size={14} className="mr-2 relative top-[1px]" />
              {confrontation.monsterDefeated
                ? t('confrontation.endMystery.win')
                : '[ CASE FAILED — LOG CASUALTIES ]'}
            </button>
          )}
          <button
            onClick={() => doAction('endMystery', { outcome: 'retreat' })}
            className="w-full border border-[#1e3428] hover:border-[#5a7a62] text-[#5a7a62] hover:text-[#c8ddd0] py-1 text-[0.6rem] tracking-[0.16em] uppercase transition-colors"
            style={{ fontFamily: "'Share Tech Mono', monospace" }}
          >
            {t('confrontation.endMystery.retreat')}
          </button>
        </div>

        {/* Team status */}
        <div className="border-t border-[#1e3428] pt-4 space-y-1">
          <MonoLabel className="text-[#1a7a43] block mb-2">FIELD TEAM</MonoLabel>
          {team.hunters.map((h) => <HunterStatus key={h.id} hunter={h} />)}
        </div>
      </div>
    </div>
  )
}
