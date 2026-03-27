import { describe, it, expect } from 'vitest'
import {
  buildEntitySummary,
  buildHunterSummary,
  buildClueSummary,
  buildTurnHistory,
  buildPrompt,
  SYSTEM_PROMPT,
} from '../../src/ai/prompts/confrontation-gm'
import type { MonsterDef, Hunter, ClueDef } from '../../src/engine/types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MONSTER: MonsterDef = {
  id: 'mon-eszter',
  type: 'sorcerer',
  name: 'Eszter',
  motivation: 'preservation',
  weakness: {
    id: 'w-promise',
    type: 'brokenBond',
    description: 'Must be reminded of her love for Bálint.',
    statRequired: 'charm',
    exploitOptions: [],
  },
  harm: 2,
  armor: 4,
  maxHarm: 8,
  attacks: [],
  capabilities: [
    { id: 'cap-flames', name: 'Grief Flames', harm: 2, description: 'Projects fire.', disableConditions: ['locket present'] },
    { id: 'cap-wail', name: 'Sorrow Wail', harm: 1, description: 'Emotional shockwave.', disableConditions: [] },
  ],
}

const HUNTER: Hunter = {
  id: 'h1',
  name: 'Rosa Quintero',
  playbookId: 'professional',
  stats: { charm: 1, cool: 2, sharp: 0, tough: 1, weird: -1 },
  harm: 0,
  luck: 5,
  alive: true,
  conditions: [],
  bonds: [],
  moves: [],
  experience: 0,
  sceneActionsRemaining: 2,
}

const CLUE: ClueDef = {
  id: 'clue-locket',
  significance: 'key',
  description: 'An ash-covered locket initialed B.K. found at the scene.',
  locationId: 'loc-apartment',
  requiresAction: 'investigate',
}

// ─── buildEntitySummary ───────────────────────────────────────────────────────

describe('buildEntitySummary', () => {
  it('includes entity name, type, motivation', () => {
    const result = buildEntitySummary(MONSTER)
    expect(result).toContain('Eszter')
    expect(result).toContain('sorcerer')
    expect(result).toContain('preservation')
  })

  it('includes weakness description', () => {
    const result = buildEntitySummary(MONSTER)
    expect(result).toContain('reminded of her love')
  })

  it('lists active capabilities', () => {
    const result = buildEntitySummary(MONSTER)
    expect(result).toContain('Grief Flames')
    expect(result).toContain('Sorrow Wail')
  })

  it('marks disabled capabilities separately', () => {
    const result = buildEntitySummary(MONSTER, ['cap-flames'])
    expect(result).toContain('Disabled')
    expect(result).toContain('Grief Flames')
    // Active caps should not include the disabled one
    const activeSection = result.split('Disabled')[0]
    expect(activeSection).not.toContain('Grief Flames')
  })

  it('handles monster with no capabilities', () => {
    const mon = { ...MONSTER, capabilities: undefined }
    const result = buildEntitySummary(mon)
    expect(result).toContain('Eszter')
  })
})

// ─── buildHunterSummary ───────────────────────────────────────────────────────

describe('buildHunterSummary', () => {
  it('includes hunter name and playbook', () => {
    const result = buildHunterSummary([HUNTER])
    expect(result).toContain('Rosa Quintero')
    expect(result).toContain('professional')
  })

  it('includes stats', () => {
    const result = buildHunterSummary([HUNTER])
    expect(result).toContain('charm')
    expect(result).toContain('cool')
  })

  it('excludes dead hunters', () => {
    const dead = { ...HUNTER, alive: false, name: 'Dead Guy' }
    const result = buildHunterSummary([HUNTER, dead])
    expect(result).not.toContain('Dead Guy')
    expect(result).toContain('Rosa')
  })

  it('returns empty string for all-dead team', () => {
    const result = buildHunterSummary([{ ...HUNTER, alive: false }])
    expect(result).toBe('')
  })
})

// ─── buildClueSummary ─────────────────────────────────────────────────────────

describe('buildClueSummary', () => {
  it('shows found clue count', () => {
    const result = buildClueSummary([CLUE], 2)
    expect(result).toContain('CLUES FOUND (1)')
  })

  it('includes clue description excerpt', () => {
    const result = buildClueSummary([CLUE], 0)
    expect(result).toContain('locket')
  })

  it('notes unfound clues without revealing them', () => {
    const result = buildClueSummary([CLUE], 3)
    expect(result).toContain('3 clue(s) not yet found')
    expect(result).toContain('Do not reveal')
  })

  it('does not add unfound note when count is 0', () => {
    const result = buildClueSummary([CLUE], 0)
    expect(result).not.toContain('not yet found')
  })

  it('handles no found clues', () => {
    const result = buildClueSummary([], 5)
    expect(result).toContain('CLUES FOUND (0)')
    expect(result).toContain('(none)')
  })
})

// ─── buildTurnHistory ─────────────────────────────────────────────────────────

describe('buildTurnHistory', () => {
  it('returns "turn 1" message when empty', () => {
    const result = buildTurnHistory([])
    expect(result).toContain('turn 1')
  })

  it('lists turns with hunter name and input', () => {
    const result = buildTurnHistory([
      { hunterName: 'Rosa', input: 'show the locket', outcome: 'success' },
    ])
    expect(result).toContain('Rosa')
    expect(result).toContain('show the locket')
    expect(result).toContain('success')
  })
})

// ─── buildPrompt ─────────────────────────────────────────────────────────────

describe('buildPrompt', () => {
  it('returns system and user strings', () => {
    const { system, user } = buildPrompt({
      entitySummary: 'ENTITY: Eszter',
      hunterSummary: 'Rosa',
      clueSummary: 'CLUES FOUND (1)',
      turnHistory: 'PREVIOUS TURNS: (none)',
      playerInput: 'show her the locket',
    })
    expect(system).toBe(SYSTEM_PROMPT)
    expect(user).toContain('PLAYER SAYS: "show her the locket"')
    expect(user).toContain('ENTITY: Eszter')
    expect(user).toContain('HUNTERS:')
  })
})
