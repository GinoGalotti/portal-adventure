import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGameStore } from '../store/game'
import { useAuthStore } from '../store/auth'
import {
  Card, SectionHeader, Tag, CampbellBlock, Eyebrow,
  StatusDot, MonoLabel, Icon, HarmPips, Button,
} from '../components/ui'

const RATING_OPTIONS = [
  { value: 1, label: 'Mechanical — felt like a system' },
  { value: 2, label: 'Decent — understood most of what I tried' },
  { value: 3, label: 'Great — felt like a real TTRPG moment' },
  { value: 4, label: 'Surprising — it got something creative' },
] as const

export default function FieldReportScreen() {
  const { t } = useTranslation()
  const { state, clearSlot } = useGameStore()
  const logout = useAuthStore((s) => s.logout)
  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [ratingSubmitted, setRatingSubmitted] = useState(false)
  const [transcriptCopied, setTranscriptCopied] = useState(false)

  const report = state?.fieldReport
  if (!report) return null

  const outcome = report.outcome

  function outcomeVariant(): 'active' | 'danger' | 'warning' {
    if (outcome === 'win') return 'active'
    if (outcome === 'loss') return 'danger'
    return 'warning'
  }

  function outcomeColour(): string {
    if (outcome === 'win') return 'text-[#2ecc71]'
    if (outcome === 'loss') return 'text-[#e05050]'
    return 'text-[#f0a500]'
  }

  const campbellKey = `narrative:campbell.${outcome}` as Parameters<typeof t>[0]

  function handleReturn() {
    clearSlot()
  }

  function handleLogout() {
    clearSlot()
    logout()
  }

  function conditionIcon(condition: string): string {
    if (condition === 'injured') return 'conditions/injured'
    if (condition === 'seriouslyInjured') return 'conditions/critical'
    return 'conditions/healthy'
  }

  function conditionColour(condition: string): string {
    if (condition === 'injured') return 'text-[#f0a500]'
    if (condition === 'seriouslyInjured') return 'text-[#e05050]'
    return 'text-[#5a7a62]'
  }

  return (
    <div className="min-h-screen bg-[#080c0a] p-4 flex flex-col">
      <div className="max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="anim-fade-up">
          <div className="flex items-center gap-2 mb-2">
            <StatusDot colour={outcome === 'win' ? 'green' : outcome === 'loss' ? 'red' : 'amber'} />
            <Eyebrow>// PORTAL FIELD OPERATIONS</Eyebrow>
          </div>
          <div className="flex items-center gap-3 mb-1">
            <Icon name="ui/report" size={16} className="text-[#1a7a43]" />
            <MonoLabel className="text-[#5a7a62]">
              {t('report.caseFile', { mysteryId: report.mysteryId.toUpperCase() })}
            </MonoLabel>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Tag label={t('report.classification')} variant="warning" />
          </div>
          <SectionHeader label="FIELD REPORT" />
        </div>

        {/* Outcome banner */}
        <Card accent={outcome === 'win' ? 'green' : outcome === 'loss' ? 'red' : 'amber'} className="mb-4 anim-fade-up-1">
          <div className="flex items-center gap-3">
            <Icon
              name={outcome === 'win' ? 'ui/victory' : outcome === 'loss' ? 'ui/defeat' : 'ui/retreat'}
              size={24}
              className={outcomeColour()}
            />
            <MonoLabel className={`text-[1.1rem] ${outcomeColour()}`}>
              {t(`report.outcome.${outcome}` as Parameters<typeof t>[0])}
            </MonoLabel>
            <Tag label={outcome.toUpperCase()} variant={outcomeVariant()} />
          </div>
        </Card>

        {/* Mission stats */}
        <div className="anim-fade-up-2">
          <SectionHeader label="MISSION DATA" />
          <Card className="mb-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Icon name={`clues/${report.intelLevel}`} size={14} className="text-[#5a7a62]" />
                <MonoLabel className="text-[#5a7a62]">
                  {t('report.intel', { level: report.intelLevel.toUpperCase() })}
                </MonoLabel>
              </div>
              <div className="flex items-center gap-3">
                <Icon name="actions/investigate" size={14} className="text-[#5a7a62]" />
                <MonoLabel className="text-[#5a7a62]">
                  {t('report.clues', { found: report.cluesFound, available: report.cluesAvailable })}
                </MonoLabel>
              </div>
              <div className="flex items-center gap-3">
                <Icon name="ui/countdown" size={14} className="text-[#5a7a62]" />
                <MonoLabel className="text-[#5a7a62]">
                  {t('report.countdown', { step: report.countdownReached })}
                </MonoLabel>
              </div>
              <div className="flex items-center gap-3">
                <Icon name="ui/dice" size={14} className="text-[#5a7a62]" />
                <MonoLabel className="text-[#5a7a62]">
                  {t('report.actions', { count: report.totalActions })}
                </MonoLabel>
              </div>
            </div>
          </Card>
        </div>

        {/* Hunter reports */}
        <div className="anim-fade-up-3">
          <SectionHeader label="FIELD TEAM STATUS" />
          <div className="space-y-2 mb-4">
            {report.hunterReports.map((hr) => {
              const isDead = hr.finalHarm >= 7
              return (
                <div
                  key={hr.hunterId}
                  className={`border px-4 py-3 ${
                    isDead
                      ? 'border-[#5c2020] bg-[rgba(224,80,80,0.04)]'
                      : 'border-[#1e3428] bg-[#0d1410]'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Icon
                      name={`playbooks/${hr.playbookId}`}
                      size={16}
                      className={isDead ? 'text-[#e05050]' : 'text-[#5a7a62]'}
                    />
                    <MonoLabel className={isDead ? 'text-[#e05050]' : 'text-[#c8ddd0]'}>
                      {hr.name}
                    </MonoLabel>
                    {isDead && <Tag label="KIA" variant="danger" />}
                    {!isDead && hr.finalCondition !== 'healthy' && (
                      <span className="flex items-center gap-1">
                        <Icon name={conditionIcon(hr.finalCondition)} size={12} className={conditionColour(hr.finalCondition)} />
                        <Tag label={hr.finalCondition.toUpperCase()} variant={hr.finalCondition === 'injured' ? 'warning' : 'danger'} />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <MonoLabel className="text-[#5a7a62]">HARM:</MonoLabel>
                    <HarmPips harm={hr.finalHarm} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <MonoLabel className="text-[#5a7a62]">LUCK SPENT: {hr.luckSpent}</MonoLabel>
                    <MonoLabel className="text-[#5a7a62]">EXP: +{hr.expGained}</MonoLabel>
                    <MonoLabel className="text-[#5a7a62]">
                      ROLLS: <span className="text-[#2ecc71]">{hr.rollsSucceeded}✓</span>{' '}
                      <span className="text-[#f0a500]">{hr.rollsMixed}~</span>{' '}
                      <span className="text-[#e05050]">{hr.rollsMissed}✗</span>
                    </MonoLabel>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* CAMPBELL note */}
        <div className="mb-6">
          <SectionHeader label="CAMPBELL NOTE" />
          <CampbellBlock label="CAMPBELL — POST-ACTION ASSESSMENT">
            <div className="italic">{t(campbellKey)}</div>
          </CampbellBlock>
        </div>

        {/* Session quality rating */}
        {!ratingSubmitted && (
          <div className="mb-6">
            <SectionHeader label="SESSION FEEDBACK" />
            <Card className="space-y-3">
              <MonoLabel className="text-[#5a7a62] block">How did the confrontation feel?</MonoLabel>
              <div className="space-y-1">
                {RATING_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setSelectedRating(value)}
                    className={`font-body w-full text-left border px-3 py-2 text-[0.8rem] transition-colors ${
                      selectedRating === value
                        ? 'border-[#f0a500] bg-[rgba(240,165,0,0.06)] text-[#f0a500]'
                        : 'border-[#1e3428] text-[#5a7a62] hover:border-[#5a7a62] hover:text-[#c8ddd0]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <textarea
                className="font-body w-full bg-[#080c0a] border border-[#1e3428] text-[#c8ddd0] p-2 text-[0.8rem] resize-none focus:outline-none focus:border-[#f0a500]"
                style={{ minHeight: '40px' }}
                placeholder="(optional) What worked or didn't?"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={selectedRating === null}
                  onClick={() => {
                    setRatingSubmitted(true)
                    // TODO: POST to /api/transcripts/:id/rating when transcript saving is wired
                  }}
                >
                  SUBMIT
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setRatingSubmitted(true)}
                >
                  SKIP
                </Button>
              </div>
            </Card>
          </div>
        )}
        {ratingSubmitted && selectedRating && (
          <div className="mb-6">
            <Card>
              <MonoLabel className="text-[#1a7a43]">
                Feedback recorded — thank you, operative.
              </MonoLabel>
            </Card>
          </div>
        )}

        {/* Transcript export */}
        <div className="mb-6">
          <SectionHeader label="SESSION TRANSCRIPT" />
          <Card className="space-y-2">
            <MonoLabel className="text-[#5a7a62] block">
              Confrontation decision log available for export.
            </MonoLabel>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon="ui/copy"
                onClick={() => {
                  const text = `CONFRONTATION TRANSCRIPT — ${report.mysteryId}\nOutcome: ${outcome}\nClues: ${report.cluesFound}/${report.cluesAvailable}\nIntel: ${report.intelLevel}\nActions: ${report.totalActions}\n\n${report.hunterReports.map(hr =>
                    `${hr.name} (${hr.playbookId}): Harm ${hr.finalHarm}, Luck spent ${hr.luckSpent}, Rolls ${hr.rollsSucceeded}✓ ${hr.rollsMixed}~ ${hr.rollsMissed}✗`
                  ).join('\n')}`
                  navigator.clipboard.writeText(text).then(() => {
                    setTranscriptCopied(true)
                    setTimeout(() => setTranscriptCopied(false), 2000)
                  })
                }}
              >
                {transcriptCopied ? 'COPIED ✓' : 'COPY TRANSCRIPT'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon="ui/download"
                onClick={() => {
                  const data = {
                    mysteryId: report.mysteryId,
                    outcome,
                    intelLevel: report.intelLevel,
                    cluesFound: report.cluesFound,
                    cluesAvailable: report.cluesAvailable,
                    totalActions: report.totalActions,
                    countdownReached: report.countdownReached,
                    hunterReports: report.hunterReports,
                    rating: selectedRating,
                    feedback: feedbackText || undefined,
                    exportedAt: new Date().toISOString(),
                  }
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `transcript-${report.mysteryId}-${Date.now()}.json`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
              >
                DOWNLOAD JSON
              </Button>
            </div>
          </Card>
        </div>

        {/* Actions */}
        <div className="space-y-2 mb-4">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon="ui/save"
            onClick={handleReturn}
          >
            {t('report.return')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            fullWidth
            onClick={handleLogout}
          >
            {t('slots.logout')}
          </Button>
        </div>

        <div className="border-t border-[#1e3428] mt-8" />
      </div>
    </div>
  )
}
