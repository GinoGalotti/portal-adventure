import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/auth'
import { useGameStore } from '../store/game'
import type { Hunter, Location, Playbook } from '../engine/types'
import { isConfrontationAvailable, isDisasterReached, isLocationAccessible } from '../engine/investigation'
import {
  getMysteryForState,
  type SceneElement,
  type SceneElementResponse,
  type LocationNarrative,
  type DialogueOption,
  type NpcDialogue,
} from '../data/mysteries'
import {
  Card, MonoLabel, Heading, Eyebrow, StatusDot, Tag,
  Icon, HarmPips, LuckPips, WarnBand, Button,
} from '../components/ui'
import playbooksRaw from '../../data/playbooks.json'
const PLAYBOOKS: Playbook[] = (playbooksRaw as { playbooks: Playbook[] }).playbooks

// ─── Mini-map ──────────────────────────────────────────────────────────────────

function MiniMap({
  currentLocationId,
  adjacentIds,
  onTravel,
  mapRows,
  mapTokens,
}: {
  currentLocationId: string | null
  adjacentIds: string[]
  onTravel: (id: string) => void
  mapRows: string[]
  mapTokens: Record<string, string>
}) {
  const { t } = useTranslation()
  // Build token regex dynamically from the mystery's map tokens
  const tokenPattern = new RegExp(
    '(' + Object.keys(mapTokens).map((k) => k.replace(/[[\]]/g, '\\$&')).join('|') + ')',
    'g',
  )

  function renderRow(row: string) {
    const parts = row.split(tokenPattern)
    return parts.map((part, i) => {
      const locationId = mapTokens[part]
      if (!locationId) {
        return <span key={i} className="text-[#1e3428]">{part}</span>
      }
      const isCurrent = locationId === currentLocationId
      const isAdjacent = adjacentIds.includes(locationId)
      if (isCurrent) {
        return <span key={i} className="text-[#2ecc71] font-bold">{part}</span>
      }
      if (isAdjacent) {
        return (
          <span
            key={i}
            role="button"
            onClick={() => onTravel(locationId)}
            className="text-[#5a7a62] hover:text-[#1a7a43] cursor-pointer transition-colors"
          >
            {part}
          </span>
        )
      }
      return <span key={i} className="text-[#1e3428]">{part}</span>
    })
  }

  return (
    <Card className="h-full">
      <MonoLabel className="text-[#1a7a43] block mb-1">
        {t('investigation.map')}
      </MonoLabel>
      <pre
        className="text-[1rem] leading-tight select-none font-mono-system normal-case overflow-x-auto"
      >
        {mapRows.map((row, i) => (
          <div key={i}>{renderRow(row)}</div>
        ))}
      </pre>
    </Card>
  )
}

// ─── Scene renderer ────────────────────────────────────────────────────────────

function ScenePanel({
  narrative,
  activeHunter,
  staminaPool,
  onElementClick,
}: {
  narrative: LocationNarrative
  activeHunter: Hunter | null
  staminaPool: number
  onElementClick: (element: SceneElement) => void
}) {
  const { t } = useTranslation()
  const [flashId, setFlashId] = useState<string | null>(null)

  function isDisabled(element: SceneElement): boolean {
    if (!activeHunter) return true
    if (element.requiresStamina) return staminaPool === 0
    return activeHunter.sceneActionsRemaining === 0
  }

  function elementClass(element: SceneElement): string {
    if (isDisabled(element)) {
      return element.hidden
        ? 'text-[#c8ddd0] cursor-default'
        : 'text-[#5a7a62] border-b border-[#1e3428] cursor-not-allowed'
    }
    if (element.hidden) {
      // Hidden: blends with surrounding prose text. Only cursor change + subtle dotted underline on hover.
      return 'text-[#c8ddd0] cursor-pointer hover:border-b hover:border-dotted hover:border-[#5a7a62] transition-colors'
    }
    return 'text-[#2ecc71] border-b border-[#1a7a43] hover:text-[#c8ddd0] hover:border-[#2ecc71] cursor-pointer transition-colors'
  }

  return (
    <div className="mb-2">
      <Card>
        <div
          className="text-[0.75rem] tracking-[0.12em] text-[#1a7a43] mb-2 italic font-mono-system"
        >
          {narrative.ambiance}
        </div>
        <p className="text-[1.1rem] text-[#c8ddd0] leading-[1.65] font-body">
          {narrative.scene.map((seg, i) => {
            if (seg.type === 'text') {
              return <span key={i}>{seg.content}</span>
            }
            const element = narrative.elements.find((e) => e.id === seg.elementId)
            if (!element) return null
            const disabled = isDisabled(element)
            return (
              <span
                key={i}
                role="button"
                tabIndex={disabled ? -1 : 0}
                title={!element.hidden ? element.hint : undefined}
                aria-disabled={disabled}
                onClick={() => { if (!disabled) { setFlashId(element.id); onElementClick(element) } }}
                onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setFlashId(element.id); onElementClick(element) } }}
                onAnimationEnd={() => setFlashId(null)}
                className={`inline ${elementClass(element)}${flashId === element.id ? ' anim-click-flash' : ''}`}
              >
                {element.label}
              </span>
            )
          })}
        </p>
        {!activeHunter && (
          <MonoLabel className="text-[#5a7a62] italic block mt-2">{t('investigation.noOperative')}</MonoLabel>
        )}
      </Card>
    </div>
  )
}

// ─── Interview modal ───────────────────────────────────────────────────────────

function InterviewModal({
  npc,
  activeHunter,
  onSelectQuestion,
  onClose,
}: {
  npc: NpcDialogue
  activeHunter: Hunter
  onSelectQuestion: (option: DialogueOption) => void
  onClose: () => void
}) {
  const { t } = useTranslation()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(8,12,10,0.92)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-[#080c0a] border border-[#2ecc71] max-w-lg w-full relative overflow-hidden anim-fade-up"
        style={{ boxShadow: '0 0 40px rgba(46,204,113,0.15), 0 0 80px rgba(46,204,113,0.05)' }}
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#2ecc71] to-transparent" />

        {/* Header */}
        <div className="border-b border-[#1e3428] px-5 py-3 flex justify-between items-start">
          <div>
            <MonoLabel className="text-[#2ecc71] block mb-1">
              <Icon name="actions/interview" size={12} className="text-[#2ecc71] mr-1 relative top-[1px]" />
              {t('investigation.interview.title')}
            </MonoLabel>
            <Heading as="div" className="text-[1.1rem] text-[#c8ddd0]">{npc.name}</Heading>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="px-2"
          >
            {t('investigation.interview.close')}
          </Button>
        </div>

        {/* NPC description */}
        <div className="px-5 py-3 border-b border-[#1e3428]">
          <p className="text-[1.1rem] text-[#5a7a62] italic leading-[1.75] font-body">{npc.description}</p>
        </div>

        {/* Questions */}
        <div className="px-5 py-4 space-y-2">
          <MonoLabel className="text-[#5a7a62] block mb-3">
            Acting as: <span className="text-[#2ecc71]">{activeHunter.name}</span>
          </MonoLabel>
          {npc.options.map((option) => (
            <button
              key={option.id}
              onClick={() => onSelectQuestion(option)}
              className="w-full text-left text-[1.1rem] border border-[#1e3428] hover:border-[#2ecc71] bg-[#0d1410] hover:bg-[rgba(46,204,113,0.06)] px-4 py-3 text-[#c8ddd0] hover:text-[#2ecc71] transition-colors leading-[1.65] font-body min-h-[44px]"
            >
              {option.question}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Roll result ───────────────────────────────────────────────────────────────

function RollResult({
  state,
  lastQuestion,
  narrativeResponse,
  onSpendLuck,
}: {
  state: ReturnType<typeof useGameStore.getState>['state']
  lastQuestion: { npc: NpcDialogue; option: DialogueOption } | null
  narrativeResponse: SceneElementResponse | null
  onSpendLuck: (hunterId: string) => void
}) {
  const { t } = useTranslation()
  const roll = state?.lastRoll
  if (!roll) return null

  const hunters = state?.team.hunters ?? []
  const luckyHunter = hunters.find((h) => h.luck > 0 && h.alive && h.id === roll.hunterId)
  const canSpendLuck = luckyHunter && roll.outcome !== 'success' && !roll.upgraded

  const outcomeColour =
    roll.outcome === 'success' ? 'text-[#2ecc71]'
    : roll.outcome === 'mixed' ? 'text-[#f0a500]'
    : 'text-[#e05050]'

  const dialogueResponse =
    lastQuestion && roll.outcome
      ? lastQuestion.option.responses[roll.outcome]
      : null

  const resolvedNarrativeText: string | null = (() => {
    if (!narrativeResponse || !roll.outcome) return null
    if (typeof narrativeResponse === 'string') return narrativeResponse
    return narrativeResponse[roll.outcome] ?? null
  })()

  const hasNarrative = !!(dialogueResponse || resolvedNarrativeText)

  return (
    <Card key={state?.actionCount} className="mb-2 anim-roll-reveal">
      {hasNarrative ? (
        <>
          {/* Narrative-first layout: outcome tag + narrative text prominent */}
          <div className="flex items-start gap-2 mb-2">
            <Tag
              label={t(`roll.outcome.${roll.outcome}` as Parameters<typeof t>[0])}
              variant={roll.outcome === 'success' ? 'active' : roll.outcome === 'mixed' ? 'warning' : 'danger'}
            />
            {roll.upgraded && (
              <Tag label={t('roll.upgraded')} variant="active" />
            )}
          </div>

          {dialogueResponse && (
            <>
              {lastQuestion && (
                <MonoLabel className="text-[#5a7a62] block mb-2">
                  {lastQuestion.option.question}
                </MonoLabel>
              )}
              <p className="text-[1.1rem] text-[#c8ddd0] italic leading-[1.75] font-body">{dialogueResponse}</p>
            </>
          )}

          {!dialogueResponse && resolvedNarrativeText && (
            <p className="text-[1.1rem] text-[#c8ddd0] italic leading-[1.75] font-body">{resolvedNarrativeText}</p>
          )}

          {/* Collapsible dice details */}
          <details className="mt-3 border-t border-[#1e3428] pt-2">
            <summary className="font-mono-system text-[0.7rem] text-[#5a7a62] cursor-pointer list-none hover:text-[#8aab94] transition-colors">
              ▸ {roll.dice[0]} + {roll.dice[1]} {roll.modifier >= 0 ? '+' : ''}{roll.modifier} ({roll.stat}) = {roll.total}
            </summary>
            <div className="flex items-baseline gap-3 mt-2">
              <Heading as="div" className={`text-[1.4rem] ${outcomeColour}`}>
                {roll.dice[0]} + {roll.dice[1]}
              </Heading>
              <MonoLabel className="text-[#5a7a62]">
                {roll.modifier >= 0 ? '+' : ''}{roll.modifier} ({roll.stat})
              </MonoLabel>
            </div>
          </details>
        </>
      ) : (
        <>
          {/* Mechanical-first layout: no narrative, show dice prominently */}
          <MonoLabel className="text-[#1a7a43] block mb-1">
            {t('roll.title')}
          </MonoLabel>
          <div className="flex items-baseline gap-3 mb-1">
            <Heading as="div" className={`text-[1.4rem] ${outcomeColour}`}>
              {roll.dice[0]} + {roll.dice[1]}
            </Heading>
            <MonoLabel className="text-[#5a7a62]">
              {roll.modifier >= 0 ? '+' : ''}{roll.modifier} ({roll.stat})
            </MonoLabel>
          </div>
          <div className={`text-[0.95rem] font-bold mb-2 font-mono-system ${outcomeColour}`}>
            {t(`roll.outcome.${roll.outcome}` as Parameters<typeof t>[0])}
            {roll.upgraded && (
              <span className="ml-2 text-[#1a7a43]">{t('roll.upgraded')}</span>
            )}
          </div>
        </>
      )}

      {canSpendLuck && (
        <Button
          variant="warning"
          size="sm"
          icon="actions/push-luck"
          onClick={() => onSpendLuck(luckyHunter.id)}
          className="mt-3"
        >
          {t('roll.spendLuck', { remaining: luckyHunter.luck })}
        </Button>
      )}
    </Card>
  )
}

// ─── Hunter selector ───────────────────────────────────────────────────────────

function HunterSelector({
  hunters,
  activeId,
  onSelect,
}: {
  hunters: Hunter[]
  activeId: string | null
  onSelect: (id: string) => void
}) {
  const { t } = useTranslation()
  const alive = hunters.filter((h) => h.alive)

  return (
    <div className="h-full flex flex-col">
      <MonoLabel className="text-[#1a7a43] block mb-1">
        {t('investigation.selectOperative')}
      </MonoLabel>
      <div className="grid grid-cols-2 gap-1 flex-1">
        {alive.map((h) => {
          const isActive = h.id === activeId
          const noActions = h.sceneActionsRemaining === 0
          const isInjured = h.harm >= 4
          return (
            <button
              key={h.id}
              onClick={() => onSelect(h.id)}
              className={`text-[0.75rem] tracking-[0.1em] px-2 py-[4px] border transition-colors font-mono-system ${
                isActive
                  ? 'border-[#1a7a43] bg-[rgba(46,204,113,0.06)] text-[#2ecc71]'
                  : isInjured
                    ? 'border-[#7a5200] bg-[#0d1410] text-[#f0a500] hover:border-[#f0a500]'
                    : 'border-[#1e3428] bg-[#111a14] text-[#5a7a62] hover:border-[#2ecc7155] hover:text-[#c8ddd0]'
              } ${noActions ? 'opacity-50' : ''}`}
            >
              <span className="block">{h.name.split(' ')[0]}</span>
              <span className="block text-[#5a7a62]">
                H:{h.harm} L:{h.luck} A:{h.sceneActionsRemaining}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Hunter detail panel ────────────────────────────────────────────────────────

// ─── Hunter status row ─────────────────────────────────────────────────────────

function HunterStatusRow({ hunter }: { hunter: Hunter }) {
  const condition = hunter.conditions[0] ?? 'healthy'
  const isDead = !hunter.alive
  const prevHarm = useRef(hunter.harm)
  const highlightFrom = hunter.harm > prevHarm.current ? prevHarm.current : undefined
  if (hunter.harm !== prevHarm.current) prevHarm.current = hunter.harm
  const pb = PLAYBOOKS.find((p) => p.id === hunter.playbookId)
  return (
    <div className={`border ${isDead ? 'border-[#5c2020]' : 'border-[#1e3428]'} bg-[#0d1410]`}>
      {/* Summary row */}
      <div className="flex items-center gap-3 px-4 py-2">
        <Icon
          name={`playbooks/${hunter.playbookId}`}
          size={16}
          className={isDead ? 'text-[#e05050]' : 'text-[#5a7a62]'}
        />
        <div className="flex-1 min-w-0">
          <Heading as="div" className={`text-[1rem] ${isDead ? 'text-[#e05050]' : 'text-[#c8ddd0]'}`}>
            {hunter.name}
          </Heading>
        </div>
        <HarmPips harm={hunter.harm} highlightFrom={highlightFrom} />
        <LuckPips luck={hunter.luck} />
        <MonoLabel className="text-[#5a7a62] shrink-0">
          A:{hunter.sceneActionsRemaining}
        </MonoLabel>
        {isDead && <Tag label="KIA" variant="danger" />}
        {!isDead && condition !== 'healthy' && (
          <Tag label={condition} variant="warning" />
        )}
      </div>
      {/* Stats row */}
      <div className="flex gap-3 px-4 pb-1 ml-7">
        {(['charm', 'cool', 'sharp', 'tough', 'weird'] as const).map((stat) => {
          const val = hunter.stats[stat]
          return (
            <MonoLabel key={stat} className={`text-[0.6rem] ${val >= 1 ? 'text-[#c8ddd0]' : 'text-[#5a7a62]'}`}>
              {stat.slice(0, 3).toUpperCase()} {val >= 0 ? '+' : ''}{val}
            </MonoLabel>
          )
        })}
      </div>
      {/* Expandable details */}
      {pb && (
        <details className="border-t border-[#1e3428]">
          <summary className="font-mono-system text-[0.65rem] text-[#5a7a62] cursor-pointer list-none hover:text-[#8aab94] transition-colors px-4 py-1">
            ▸ MOVES &amp; ABILITIES
          </summary>
          <div className="px-4 pb-3 pt-1 space-y-2">
            {pb.signatureMoves.map((move) => (
              <div key={move.id} className="border-l-2 border-[#1e3428] pl-2">
                <MonoLabel className="text-[#1a7a43] block text-[0.65rem]">{move.name}</MonoLabel>
                <p className="text-[0.7rem] text-[#8aab94] leading-[1.4] font-body">{move.description}</p>
              </div>
            ))}
            {pb.vulnerability && (
              <div className="border-l-2 border-[#5c2020] pl-2">
                <MonoLabel className="text-[#e05050] block text-[0.65rem]">VULNERABILITY</MonoLabel>
                <p className="text-[0.7rem] text-[#8aab94] leading-[1.4] font-body">{pb.vulnerability}</p>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  )
}

// ─── Intel colour helper ───────────────────────────────────────────────────────

function intelVariant(level: string): 'danger' | 'warning' | 'default' | 'active' {
  if (level === 'blind') return 'danger'
  if (level === 'partial') return 'warning'
  if (level === 'informed') return 'default'
  return 'active'
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function InvestigationScreen() {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)
  const { state, dispatch, actions: actionLog } = useGameStore()

  const [activeHunterId, setActiveHunterId] = useState<string | null>(null)
  const [interviewTarget, setInterviewTarget] = useState<{
    npc: NpcDialogue
    locationId: string
  } | null>(null)
  const [lastQuestion, setLastQuestion] = useState<{
    npc: NpcDialogue
    option: DialogueOption
  } | null>(null)
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)
  const [lastNarrativeResponse, setLastNarrativeResponse] = useState<SceneElementResponse | null>(null)

  if (!state?.mystery) return null
  const { mystery, team } = state
  const mysteryEntry = getMysteryForState(mystery.id)

  const currentLoc: Location | null = mystery.currentLocationId
    ? (mystery.locations.find((l) => l.id === mystery.currentLocationId) ?? null)
    : null

  const adjacentLocs: Location[] = currentLoc
    ? currentLoc.adjacentLocationIds
        .map((id) => mystery.locations.find((l) => l.id === id))
        .filter((l): l is Location => l !== undefined && isLocationAccessible(state, l))
    : mystery.locations.filter((l) => isLocationAccessible(state, l))

  const adjacentIds = adjacentLocs.map((l) => l.id)
  const confrontationAvailable = isConfrontationAvailable(state)
  const disasterReached = isDisasterReached(state)
  const activeHunter = team.hunters.find((h) => h.id === activeHunterId && h.alive) ?? null
  const narrative = currentLoc ? (mysteryEntry?.getNarrativeForLocation(currentLoc.id) ?? null) : null

  const NO_ROLL_ACTIONS = new Set(['helpBystander', 'rest', 'travel'])

  async function doAction(type: string, payload: Record<string, unknown> = {}, feedbackMsg?: string, preserveQuestion = false, narrativeResponse?: SceneElementResponse) {
    if (!token) return
    if (!preserveQuestion) setLastQuestion(null)
    setActionFeedback(null)
    setLastNarrativeResponse(narrativeResponse ?? null)
    await dispatch(token, {
      type: type as Parameters<typeof dispatch>[1]['type'],
      payload,
    })
    if (NO_ROLL_ACTIONS.has(type) && feedbackMsg) {
      setActionFeedback(feedbackMsg)
    }
  }

  async function doSpendLuck(hunterId: string) {
    if (!token) return
    await dispatch(token, { type: 'spendLuck', payload: { hunterId } })
  }

  async function doTravel(locationId: string) {
    setLastQuestion(null)
    await doAction('travel', { locationId })
  }

  function handleElementClick(element: SceneElement) {
    if (!activeHunter || !currentLoc) return
    if (element.npcId) {
      const npc = narrative && mysteryEntry ? mysteryEntry.getNpcById(narrative, element.npcId) : null
      if (npc) {
        setInterviewTarget({ npc, locationId: currentLoc.id })
        return
      }
    }
    const helpResponse = element.actionType === 'helpBystander' && typeof element.response === 'string'
      ? element.response
      : undefined
    const feedback = element.actionType === 'helpBystander'
      ? helpResponse
        ? `// ${activeHunter.name} approaches the ${element.label}.\n\n${helpResponse}`
        : `// ${activeHunter.name} helps — action spent.`
      : undefined
    const narrativeResponse = element.actionType !== 'helpBystander' ? element.response : undefined
    doAction(element.actionType, { hunterId: activeHunter.id, locationId: currentLoc.id }, feedback, false, narrativeResponse)
  }

  async function handleSelectQuestion(option: DialogueOption) {
    if (!activeHunter || !interviewTarget) return
    const { npc, locationId } = interviewTarget
    setLastQuestion({ npc, option })
    setInterviewTarget(null)
    await doAction('interview', { hunterId: activeHunter.id, locationId }, undefined, true)
  }

  return (
    <div className="min-h-screen bg-[#080c0a] p-2 flex flex-col">
      <div className="max-w-2xl mx-auto w-full">

        {/* Status bar — compact, sticky on scroll */}
        <div className="sticky top-0 z-10 bg-[#080c0a] border-b border-[#1e3428] pb-2 -mx-2 px-2">
        <div className="flex items-center gap-2 mb-1">
          <StatusDot />
          <Eyebrow>// INVESTIGATION PHASE</Eyebrow>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tag label={`INTEL: ${mystery.intelLevel}`} variant={intelVariant(mystery.intelLevel)} />
          <Tag label={`CLOCK: ${mystery.countdown.currentStep}/${mystery.countdown.steps.length}`}
            variant={mystery.countdown.currentStep >= 4 ? 'danger' : mystery.countdown.currentStep >= 2 ? 'warning' : 'default'} />
          <Tag label={`STAMINA: ${team.staminaPool}/${team.maxStamina}`} variant="default" />
          <Tag label={`CLUES: ${mystery.cluesFound.length}`} variant="default" />
        </div>
        </div>

        {/* Countdown alert */}
        {mystery.countdown.currentStep > 0 && (
          <div className="mb-2">
            <WarnBand variant={mystery.countdown.currentStep >= 4 ? 'red' : 'amber'}>
              STAGE {mystery.countdown.currentStep}:{' '}
              {mystery.countdown.steps[mystery.countdown.currentStep - 1]?.description ?? ''}
            </WarnBand>
          </div>
        )}

        {/* Disaster — forces confrontation */}
        {disasterReached && (
          <div className="mb-3">
            <WarnBand variant="red">
              DISASTER THRESHOLD REACHED — CONFRONTATION MANDATORY
            </WarnBand>
            <Button
              variant="danger"
              size="lg"
              fullWidth
              icon="ui/confrontation"
              onClick={() => doAction('startConfrontation', {})}
              className="mt-2"
            >
              BEGIN CONFRONTATION
            </Button>
          </div>
        )}

        {/* Map + Operatives — side by side on desktop */}
        {!disasterReached && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 mb-2">
              {/* Mini-map */}
              <MiniMap
                currentLocationId={mystery.currentLocationId}
                adjacentIds={adjacentIds}
                onTravel={doTravel}
                mapRows={mysteryEntry?.mapRows ?? []}
                mapTokens={mysteryEntry?.mapTokens ?? {}}
              />
              {/* Operative selector — stacked on right */}
              <HunterSelector
                hunters={team.hunters}
                activeId={activeHunterId}
                onSelect={setActiveHunterId}
              />
            </div>
            {/* Roll result / no-roll feedback */}
            {actionFeedback ? (
              <Card className="mb-2">
                {actionFeedback.split('\n\n').map((part, i) =>
                  i === 0
                    ? <MonoLabel key={i} className="text-[#5a7a62] block">{part}</MonoLabel>
                    : <p key={i} className="text-[1.1rem] text-[#c8ddd0] italic leading-[1.75] mt-2 font-body">{part}</p>
                )}
              </Card>
            ) : (
              <RollResult state={state} lastQuestion={lastQuestion} narrativeResponse={lastNarrativeResponse} onSpendLuck={doSpendLuck} />
            )}

            {/* Session log — collapsed */}
            {actionLog.length > 0 && (
              <details className="mb-2">
                <summary
                  className="text-[0.65rem] tracking-[0.12em] text-[#5a7a62] cursor-pointer hover:text-[#c8ddd0] transition-colors list-none font-mono-system"
                >
                  ▶ SESSION LOG ({actionLog.length})
                </summary>
                <div className="border border-[#1e3428] bg-[#0d1410] mt-1 p-2 max-h-[200px] overflow-y-auto space-y-[2px]">
                  {actionLog.slice().reverse().map((entry, i) => {
                    const hunter = entry.payload.hunterId
                      ? team.hunters.find((h) => h.id === entry.payload.hunterId)
                      : null
                    return (
                      <div
                        key={i}
                        className="text-[0.65rem] text-[#5a7a62] font-mono-system"
                      >
                        <span className="text-[#1a7a43]">{actionLog.length - i}.</span>{' '}
                        {hunter && <span className="text-[#c8ddd0]">{hunter.name}</span>}
                        {hunter && ' — '}
                        <span className="uppercase">{entry.type.replace(/([A-Z])/g, ' $1').trim()}</span>
                      </div>
                    )
                  })}
                </div>
              </details>
            )}

            {/* Scene narrative */}
            {currentLoc && narrative ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <Heading as="div" className="text-[1.2rem] text-[#c8ddd0]">{currentLoc.name}</Heading>
                  <MonoLabel className="text-[#5a7a62]">
                    {'▮'.repeat(currentLoc.threatLevel)}{'▯'.repeat(3 - currentLoc.threatLevel)}
                  </MonoLabel>
                  {currentLoc.cleared && <Tag label="CLEARED" variant="active" />}
                  {currentLoc.minionsPresent > 0 && <Tag label={`${currentLoc.minionsPresent} MINION${currentLoc.minionsPresent > 1 ? 'S' : ''}`} variant="danger" />}
                </div>

                <ScenePanel
                  narrative={narrative}
                  activeHunter={activeHunter}
                  staminaPool={team.staminaPool}
                  onElementClick={handleElementClick}
                />

                {/* Inline actions: rest + fight minion */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {activeHunter && activeHunter.harm > 0 && activeHunter.sceneActionsRemaining > 0 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => doAction('rest', { hunterId: activeHunter.id }, `// ${activeHunter.name} rests — 1 harm healed.`)}
                    >
                      {t('investigation.action.rest')}
                    </Button>
                  )}
                  {activeHunter && currentLoc.minionsPresent > 0 && team.staminaPool > 0 && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => doAction('fightMinion', { hunterId: activeHunter.id, locationId: currentLoc.id })}
                    >
                      {t('investigation.action.fightMinion')}
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <Card className="mb-2">
                <MonoLabel className="text-[#5a7a62] italic">{t('investigation.noLocation')}</MonoLabel>
              </Card>
            )}

            {/* Travel */}
            {adjacentLocs.length > 0 && (
              <div className="mb-2">
                <MonoLabel className="text-[#1a7a43] block mb-1">
                  {currentLoc ? t('investigation.adjacentLocations') : t('investigation.currentLocation')}
                </MonoLabel>
                <div className="flex flex-wrap gap-1">
                  {adjacentLocs.map((loc) => (
                    <button
                      key={loc.id}
                      onClick={() => doTravel(loc.id)}
                      className="text-[0.75rem] tracking-[0.12em] border border-[#1e3428] hover:border-[#1a7a43] bg-[#0d1410] hover:bg-[rgba(46,204,113,0.04)] px-3 py-[6px] transition-colors flex items-center gap-1 font-mono-system"
                    >
                      <span className="text-[#1a7a43]">→</span>
                      <span className="text-[#c8ddd0]">{loc.name}</span>
                      {loc.visited && <Tag label="V" variant="default" />}
                      {loc.cleared && <Tag label="C" variant="active" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Confrontation */}
            {confrontationAvailable && !disasterReached && (
              <Button
                variant="danger"
                size="lg"
                fullWidth
                icon="ui/confrontation"
                onClick={() => doAction('startConfrontation', {})}
                className="mb-2"
              >
                {t('investigation.startConfrontation')}
              </Button>
            )}
          </>
        )}

        {/* Team status — compact */}
        <div className="border-t border-[#1e3428] pt-2 space-y-1">
          {team.hunters.map((h) => (
            <HunterStatusRow key={h.id} hunter={h} />
          ))}
        </div>
      </div>

      {/* Interview modal */}
      {interviewTarget && activeHunter && (
        <InterviewModal
          npc={interviewTarget.npc}
          activeHunter={activeHunter}
          onSelectQuestion={handleSelectQuestion}
          onClose={() => setInterviewTarget(null)}
        />
      )}
    </div>
  )
}
