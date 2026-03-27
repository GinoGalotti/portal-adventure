import type { MonsterDef, Hunter, ClueDef } from '../../engine/types'
import type { AIGMContext } from '../types'

// ─── Context builders (game structs → concise prose) ─────────────────────────

export function buildEntitySummary(
  monster: MonsterDef,
  disabledCapabilityIds: string[] = [],
): string {
  const caps = monster.capabilities ?? []
  const active = caps.filter((c) => !disabledCapabilityIds.includes(c.id))
  const disabled = caps.filter((c) => disabledCapabilityIds.includes(c.id))

  const lines: string[] = [
    `ENTITY: ${monster.name} — ${monster.type}, motivation: ${monster.motivation}.`,
    `Weakness: ${monster.weakness.description}`,
  ]

  if (active.length > 0) {
    lines.push('Active capabilities:')
    for (const cap of active) {
      lines.push(`  ${cap.name} (harm ${cap.harm}): ${cap.description}`)
    }
  }

  if (disabled.length > 0) {
    lines.push(`Disabled: ${disabled.map((c) => c.name).join(', ')}`)
  }

  return lines.join('\n')
}

export function buildHunterSummary(hunters: Hunter[]): string {
  return hunters
    .filter((h) => h.alive)
    .map((h) => {
      const stats = (Object.entries(h.stats) as [string, number][])
        .map(([k, v]) => `${k} ${v >= 0 ? '+' : ''}${v}`)
        .join(', ')
      const harm = `Harm ${h.harm}/7`
      const luck = `Luck ${h.luck}`
      return `${h.name} (${h.playbookId}): ${stats}, ${harm}, ${luck}`
    })
    .join('\n')
}

export function buildClueSummary(foundClues: ClueDef[], unfoundCount: number): string {
  const foundLines = foundClues
    .map((c) => `  - ${c.description.slice(0, 120).replace(/\n/g, ' ')}`)
    .join('\n')

  const unfoundNote =
    unfoundCount > 0
      ? `\n${unfoundCount} clue(s) not yet found. Do not reveal them directly. If the player intuits something close, give a subtle narrative hint and a small bonus.`
      : ''

  return `CLUES FOUND (${foundClues.length}):\n${foundLines || '  (none)'}${unfoundNote}`
}

export function buildTurnHistory(
  turns: Array<{ hunterName: string; input: string; outcome: string }>,
): string {
  if (turns.length === 0) return 'PREVIOUS TURNS: (none — this is turn 1)'
  return (
    'PREVIOUS TURNS:\n' +
    turns
      .map((t, i) => `${i + 1}. ${t.hunterName}: "${t.input}" → ${t.outcome}`)
      .join('\n')
  )
}

// ─── System prompt (static — cacheable by Groq) ──────────────────────────────

export const SYSTEM_PROMPT = `You are the Game Master for a supernatural investigation tabletop game. A team of hunters is confronting a supernatural entity.

Your job: interpret the player's free-text action, classify it, and return a structured JSON response.

Rules:
- stat must be exactly one of: charm, cool, sharp, tough, weird
- modifier is an integer from -3 to +3. Base: 0. Add +1 per relevant found clue clearly referenced. Add +1 for a strong weakness match. Add -1 if the approach is counterproductive.
- narrative strings are one sentence each, third-person perspective, present tense
- entity_response.harm must not exceed the entity definition's maximum harm value
- capabilities_disabled must only include IDs listed in the entity's capability list

Return ONLY valid JSON matching this exact schema — no commentary, no markdown:
{
  "action_type": "attack|protect_someone|act_under_pressure|manipulate|read_situation|use_magic|other",
  "stat": "charm|cool|sharp|tough|weird",
  "stat_reasoning": "one sentence",
  "clue_references": [],
  "weakness_match": { "rating": 0, "reasoning": "one sentence" },
  "modifier": 0,
  "state_changes": { "capabilities_disabled": [], "conditions_applied": [], "conditions_expired": [] },
  "narrative": { "success": "one sentence", "mixed": "one sentence", "miss": "one sentence" },
  "entity_response": { "action": "one sentence", "harm": 0, "target": "hunter name or 'all'" }
}`

// ─── Full prompt assembly ─────────────────────────────────────────────────────

export function buildPrompt(context: AIGMContext): { system: string; user: string } {
  const user = [
    context.entitySummary,
    '',
    'HUNTERS:',
    context.hunterSummary,
    '',
    context.clueSummary,
    '',
    context.turnHistory,
    '',
    `PLAYER SAYS: "${context.playerInput}"`,
  ].join('\n')

  return { system: SYSTEM_PROMPT, user }
}
