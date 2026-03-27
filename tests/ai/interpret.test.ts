import { describe, it, expect, vi } from 'vitest'
import {
  interpretActionWithAI,
  createConfrontationContext,
  addTurnToContext,
} from '../../src/ai/interpret'
import type { ConfrontationContext } from '../../src/ai/interpret'
import type { MonsterDef, Hunter, ClueDef } from '../../src/engine/types'
import type { AIGMResult } from '../../src/ai/types'

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
    freeTextExploits: [
      {
        id: 'ft-full-resolution',
        requiredClueIds: [],
        triggerWords: [['balint', 'convince']],
        modifier: 2,
        successHarm: 'maxHarm',
        narrativeResult: 'Bálint speaks and Eszter listens.',
      },
    ],
  },
  harm: 2,
  armor: 4,
  maxHarm: 8,
  attacks: [],
  capabilities: [
    { id: 'cap-flames', name: 'Grief Flames', harm: 2, description: 'Projects fire.', disableConditions: ['locket present'] },
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
  description: 'An ash-covered locket initialed B.K.',
  locationId: 'loc-apartment',
  requiresAction: 'investigate',
}

// ─── createConfrontationContext ──────────────────────────────────────────────

describe('createConfrontationContext', () => {
  it('creates empty context', () => {
    const ctx = createConfrontationContext()
    expect(ctx.turns).toEqual([])
    expect(ctx.disabledCapabilityIds).toEqual([])
    expect(ctx.activeConditions).toEqual([])
  })
})

// ─── addTurnToContext ────────────────────────────────────────────────────────

describe('addTurnToContext', () => {
  it('appends a turn to the context', () => {
    const ctx = createConfrontationContext()
    const next = addTurnToContext(ctx, {
      hunterName: 'Rosa',
      input: 'show the locket',
      outcome: 'success',
    })
    expect(next.turns).toHaveLength(1)
    expect(next.turns[0].hunterName).toBe('Rosa')
  })

  it('does not mutate the original context', () => {
    const ctx = createConfrontationContext()
    const next = addTurnToContext(ctx, {
      hunterName: 'Rosa',
      input: 'test',
      outcome: 'miss',
    })
    expect(ctx.turns).toHaveLength(0)
    expect(next.turns).toHaveLength(1)
  })

  it('accumulates disabled capabilities from AI result', () => {
    const ctx = createConfrontationContext()
    const aiResult: AIGMResult = {
      valid: true,
      stat: 'charm',
      modifier: 1,
      narrative: { success: 's', mixed: 'm', miss: 'x' },
      capabilitiesDisabled: ['cap-flames'],
      conditionsApplied: ['entity_shaken'],
      entityResponseHarm: 1,
      entityResponseTarget: 'Rosa',
      guardrailsTriggered: [],
    }
    const next = addTurnToContext(ctx, {
      hunterName: 'Rosa',
      input: 'jam the fire',
      outcome: 'success',
    }, aiResult)

    expect(next.disabledCapabilityIds).toContain('cap-flames')
    expect(next.activeConditions).toContain('entity_shaken')
  })

  it('does not duplicate already-disabled capabilities', () => {
    let ctx: ConfrontationContext = {
      turns: [],
      disabledCapabilityIds: ['cap-flames'],
      activeConditions: [],
    }
    const aiResult: AIGMResult = {
      valid: true,
      stat: 'cool',
      modifier: 0,
      narrative: { success: 's', mixed: 'm', miss: 'x' },
      capabilitiesDisabled: ['cap-flames'],
      conditionsApplied: [],
      entityResponseHarm: 0,
      entityResponseTarget: 'all',
      guardrailsTriggered: [],
    }
    ctx = addTurnToContext(ctx, {
      hunterName: 'Mack',
      input: 'block flames again',
      outcome: 'mixed',
    }, aiResult)

    expect(ctx.disabledCapabilityIds).toEqual(['cap-flames'])
  })
})

// ─── interpretActionWithAI ──────────────────────────────────────────────────

describe('interpretActionWithAI', () => {
  const baseOpts = {
    input: 'convince balint to let her go',
    allClues: [CLUE],
    foundClueIds: ['clue-locket'],
    weakness: MONSTER.weakness,
    monsterHarm: MONSTER.harm,
    monster: MONSTER,
    hunters: [HUNTER],
    foundClues: [CLUE],
    unfoundClueCount: 3,
  }

  it('returns keyword result when no AI client is provided', async () => {
    const result = await interpretActionWithAI({
      ...baseOpts,
      aiClient: null,
    })

    expect(result.source).toBe('keyword')
    expect(result.aiResult).toBeNull()
    expect(result.aiLatencyMs).toBeNull()
    expect(result.interpretation.rawInput).toBe('convince balint to let her go')
    expect(result.interpretation.source).toBe('keyword')
  })

  it('returns keyword result when aiClient is undefined', async () => {
    const result = await interpretActionWithAI(baseOpts)

    expect(result.source).toBe('keyword')
    expect(result.interpretation.source).toBe('keyword')
  })

  it('returns keyword result with latency when AI fails', async () => {
    const mockClient = {
      interpret: vi.fn().mockResolvedValue(null),
    }

    const result = await interpretActionWithAI({
      ...baseOpts,
      aiClient: mockClient as any,
    })

    expect(result.source).toBe('keyword')
    expect(result.aiResult).toBeNull()
    expect(result.aiLatencyMs).toBeGreaterThanOrEqual(0)
    expect(mockClient.interpret).toHaveBeenCalledOnce()
  })

  it('returns keyword result when AI throws', async () => {
    const mockClient = {
      interpret: vi.fn().mockRejectedValue(new Error('Network error')),
    }

    const result = await interpretActionWithAI({
      ...baseOpts,
      aiClient: mockClient as any,
    })

    expect(result.source).toBe('keyword')
    expect(result.aiResult).toBeNull()
  })

  it('returns keyword result when AI returns invalid parse', async () => {
    const mockClient = {
      interpret: vi.fn().mockResolvedValue({ valid: false, errors: ['bad JSON'] }),
    }

    const result = await interpretActionWithAI({
      ...baseOpts,
      aiClient: mockClient as any,
    })

    expect(result.source).toBe('keyword')
  })

  it('merges AI result when AI succeeds', async () => {
    const aiResult: AIGMResult = {
      valid: true,
      stat: 'charm',
      modifier: 2,
      narrative: { success: 'Bálint calls out.', mixed: 'Partial response.', miss: 'No effect.' },
      capabilitiesDisabled: [],
      conditionsApplied: [],
      entityResponseHarm: 1,
      entityResponseTarget: 'Rosa',
      guardrailsTriggered: [],
    }
    const mockClient = {
      interpret: vi.fn().mockResolvedValue(aiResult),
    }

    const result = await interpretActionWithAI({
      ...baseOpts,
      aiClient: mockClient as any,
    })

    expect(result.source).toBe('ai')
    expect(result.aiResult).toEqual(aiResult)
    expect(result.aiLatencyMs).toBeGreaterThanOrEqual(0)
    // Merged: AI stat and modifier override keywords
    expect(result.interpretation.stat).toBe('charm')
    expect(result.interpretation.modifier).toBe(2)
    expect(result.interpretation.narrativeResult).toBe('Bálint calls out.')
    expect(result.interpretation.source).toBe('ai')
    // Keywords preserved: tokens, matchedClues
    expect(result.interpretation.tokens.length).toBeGreaterThan(0)
  })

  it('passes confrontation context to AI', async () => {
    const ctx: ConfrontationContext = {
      turns: [{ hunterName: 'Mack', input: 'attack', outcome: 'miss' }],
      disabledCapabilityIds: ['cap-flames'],
      activeConditions: ['entity_shaken'],
    }

    const mockClient = {
      interpret: vi.fn().mockResolvedValue(null),
    }

    await interpretActionWithAI({
      ...baseOpts,
      aiClient: mockClient as any,
      confrontationContext: ctx,
    })

    // Verify the AI context includes disabled capabilities and turn history
    const call = mockClient.interpret.mock.calls[0][0]
    expect(call.entitySummary).toContain('Disabled')
    expect(call.entitySummary).toContain('Grief Flames')
    expect(call.turnHistory).toContain('Mack')
    expect(call.turnHistory).toContain('attack')
  })
})
