import { describe, it, expect } from 'vitest'
import { getValidActions } from '../../simulation/valid-actions'
import { applyAction } from '../../src/engine/actions'
import { createInitialState } from '../../src/engine/state'
import type { GameState, MysteryDefinition, ActionEntry } from '../../src/engine/types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const testDef: MysteryDefinition = {
  id: 'mystery-va-test',
  monster: {
    id: 'mon-1', type: 'beast', name: 'Beast',
    motivation: 'hunger',
    weakness: { id: 'w1', type: 'ritual', description: 'ritual', statRequired: 'weird' },
    harm: 2, armor: 0, maxHarm: 6, attacks: ['atk'],
  },
  locationDefs: [
    {
      id: 'loc-a', name: 'Library', type: 'library', threatLevel: 1,
      clueDefs: [
        { id: 'clue-1', significance: 'partial', description: 'c1',
          locationId: 'loc-a', requiresAction: 'investigate' },
      ],
      availableActions: ['investigate', 'interview', 'deepSearch'],
      adjacentLocationIds: ['loc-b'],
    },
    {
      id: 'loc-b', name: 'Lair', type: 'monsterLair', threatLevel: 3,
      clueDefs: [],
      availableActions: ['investigate'],
      adjacentLocationIds: ['loc-a'],
    },
  ],
  countdownDef: {
    steps: Array.from({ length: 6 }, (_, i) => ({ step: i, description: `s${i}` })),
  },
}

const h1 = {
  id: 'h1', name: 'Rosa', playbookId: 'expert',
  stats: { charm: -1, cool: 1, sharp: 2, tough: 1, weird: 0 },
  luck: 7, bondCapacity: 3,
}

function act(type: ActionEntry['type'], payload: Record<string, unknown> = {}): ActionEntry {
  return { type, payload, timestamp: 0 }
}

function afterStart(): GameState {
  return applyAction(
    createInitialState('va-test'),
    act('startMystery', { definition: testDef, hunters: [h1] }),
  )
}

function atLocA(): GameState {
  return applyAction(afterStart(), act('travel', { locationId: 'loc-a' }))
}

// ─── Investigation Phase — no current location ────────────────────────────────

describe('getValidActions() — investigation, no location', () => {
  it('returns travel to all locations before first move', () => {
    const actions = getValidActions(afterStart())
    const travels = actions.filter((a) => a.type === 'travel')
    expect(travels.map((a) => a.payload.locationId)).toContain('loc-a')
    expect(travels.map((a) => a.payload.locationId)).toContain('loc-b')
  })

  it('includes startConfrontation', () => {
    const actions = getValidActions(afterStart())
    expect(actions.some((a) => a.type === 'startConfrontation')).toBe(true)
  })

  it('does not include scene actions before any travel', () => {
    const actions = getValidActions(afterStart())
    expect(actions.some((a) => a.type === 'investigate')).toBe(false)
    expect(actions.some((a) => a.type === 'interview')).toBe(false)
  })
})

// ─── Investigation Phase — at a location ─────────────────────────────────────

describe('getValidActions() — investigation, at loc-a', () => {
  it('does not include travel to current location', () => {
    const actions = getValidActions(atLocA())
    const travels = actions.filter((a) => a.type === 'travel')
    expect(travels.map((a) => a.payload.locationId)).not.toContain('loc-a')
    expect(travels.map((a) => a.payload.locationId)).toContain('loc-b')  // adjacent
  })

  it('includes investigate when location supports it and hunter has scene actions', () => {
    const actions = getValidActions(atLocA())
    const investigates = actions.filter((a) => a.type === 'investigate')
    expect(investigates.length).toBeGreaterThan(0)
    expect(investigates[0].payload.hunterId).toBe('h1')
  })

  it('includes interview when location supports it', () => {
    const actions = getValidActions(atLocA())
    expect(actions.some((a) => a.type === 'interview')).toBe(true)
  })

  it('includes deepSearch when stamina available', () => {
    const state = atLocA()
    expect(state.team.staminaPool).toBeGreaterThan(0)
    const actions = getValidActions(state)
    expect(actions.some((a) => a.type === 'deepSearch')).toBe(true)
  })

  it('excludes deepSearch when staminaPool is 0', () => {
    const state = structuredClone(atLocA())
    state.team.staminaPool = 0
    const actions = getValidActions(state)
    expect(actions.some((a) => a.type === 'deepSearch')).toBe(false)
  })

  it('excludes scene actions when hunter has no scene actions remaining', () => {
    const state = structuredClone(atLocA())
    state.team.hunters[0].sceneActionsRemaining = 0
    const actions = getValidActions(state)
    expect(actions.some((a) => a.type === 'investigate')).toBe(false)
    expect(actions.some((a) => a.type === 'interview')).toBe(false)
  })

  it('excludes rest when hunter has no harm', () => {
    const state = atLocA()
    expect(state.team.hunters[0].harm).toBe(0)
    const actions = getValidActions(state)
    expect(actions.some((a) => a.type === 'rest')).toBe(false)
  })

  it('includes rest when hunter has harm', () => {
    const state = structuredClone(atLocA())
    state.team.hunters[0].harm = 2
    // Also need scene actions remaining
    state.team.hunters[0].sceneActionsRemaining = 1
    const actions = getValidActions(state)
    expect(actions.some((a) => a.type === 'rest')).toBe(true)
  })

  it('excludes dead hunters from action list', () => {
    const state = structuredClone(atLocA())
    state.team.hunters[0].alive = false
    const actions = getValidActions(state)
    expect(actions.some((a) => a.payload.hunterId === 'h1')).toBe(false)
  })
})

// ─── Confrontation Phase ──────────────────────────────────────────────────────

describe('getValidActions() — confrontation phase', () => {
  function inConfrontation(): GameState {
    return applyAction(afterStart(), act('startConfrontation', {}))
  }

  it('includes all core confrontation actions for alive hunters', () => {
    const state = inConfrontation()
    const actions = getValidActions(state)
    const types = new Set(actions.map((a) => a.type))
    expect(types.has('attack')).toBe(true)
    expect(types.has('defend')).toBe(true)
    expect(types.has('resist')).toBe(true)
    expect(types.has('distract')).toBe(true)
    expect(types.has('assess')).toBe(true)
  })

  it('excludes exploitWeakness at blind intel', () => {
    const state = inConfrontation()
    expect(state.confrontation!.intelLevel).toBe('blind')
    const actions = getValidActions(state)
    expect(actions.some((a) => a.type === 'exploitWeakness')).toBe(false)
  })

  it('includes exploitWeakness when intel is not blind', () => {
    const state = structuredClone(inConfrontation())
    state.confrontation!.intelLevel = 'partial'
    const actions = getValidActions(state)
    expect(actions.some((a) => a.type === 'exploitWeakness')).toBe(true)
  })

  it('excludes actions for dead hunters in confrontation', () => {
    const state = structuredClone(inConfrontation())
    state.team.hunters[0].alive = false
    const actions = getValidActions(state)
    expect(actions.some((a) => a.payload.hunterId === 'h1')).toBe(false)
  })

  it('returns empty array for confrontation with no alive hunters', () => {
    const state = structuredClone(inConfrontation())
    state.team.hunters[0].alive = false
    const actions = getValidActions(state)
    expect(actions).toHaveLength(0)
  })
})

// ─── Confrontation — Clue-based exploit options ──────────────────────────────

const testDefWithExploitOptions: MysteryDefinition = {
  id: 'mystery-va-exploit',
  monster: {
    id: 'mon-2', type: 'sorcerer', name: 'Spirit',
    motivation: 'preservation',
    weakness: {
      id: 'w2', type: 'brokenBond', description: 'resolve bond', statRequired: 'charm',
      exploitOptions: [
        {
          id: 'opt-easy', requiredClueIds: ['clue-1'], modifier: -2,
          description: 'weak exploit', successHarm: 5,
        },
        {
          id: 'opt-medium', requiredClueIds: ['clue-1', 'clue-2'], modifier: 0,
          description: 'medium exploit', successHarm: 'maxHarm',
        },
        {
          id: 'opt-hard', requiredClueIds: ['clue-1', 'clue-2', 'clue-3'], modifier: 2,
          description: 'strong exploit', successHarm: 'maxHarm', mixedHarm: 'maxHarm',
        },
      ],
    },
    harm: 3, armor: 4, maxHarm: 10, attacks: ['atk'],
  },
  locationDefs: [
    {
      id: 'loc-a', name: 'Library', type: 'library', threatLevel: 1,
      clueDefs: [
        { id: 'clue-1', significance: 'partial', description: 'c1',
          locationId: 'loc-a', requiresAction: 'investigate' },
        { id: 'clue-2', significance: 'key', description: 'c2',
          locationId: 'loc-a', requiresAction: 'investigate' },
        { id: 'clue-3', significance: 'critical', description: 'c3',
          locationId: 'loc-a', requiresAction: 'deepSearch' },
      ],
      availableActions: ['investigate', 'deepSearch'],
      adjacentLocationIds: [],
    },
  ],
  countdownDef: {
    steps: Array.from({ length: 6 }, (_, i) => ({ step: i, description: `s${i}` })),
  },
}

describe('getValidActions() — confrontation, clue-based exploit options', () => {
  function exploitState(cluesFound: string[]): GameState {
    let state = applyAction(
      createInitialState('va-exploit'),
      act('startMystery', { definition: testDefWithExploitOptions, hunters: [h1] }),
    )
    state = applyAction(state, act('startConfrontation', {}))
    // Manually inject clues into the mystery snapshot
    const s = structuredClone(state)
    s.mystery!.cluesFound = cluesFound
    for (const loc of s.mystery!.locations) {
      for (const clue of loc.clues) {
        clue.found = cluesFound.includes(clue.id)
      }
    }
    return s
  }

  it('returns no exploitWeakness when no clues found (despite exploitOptions defined)', () => {
    const actions = getValidActions(exploitState([]))
    expect(actions.some((a) => a.type === 'exploitWeakness')).toBe(false)
  })

  it('returns one exploit per hunter when one option is unlocked', () => {
    const actions = getValidActions(exploitState(['clue-1']))
    const exploits = actions.filter((a) => a.type === 'exploitWeakness')
    expect(exploits).toHaveLength(1)
    expect(exploits[0].payload.exploitOptionId).toBe('opt-easy')
    expect(exploits[0].payload.hunterId).toBe('h1')
  })

  it('returns two exploit actions when two options are unlocked (1 hunter)', () => {
    const actions = getValidActions(exploitState(['clue-1', 'clue-2']))
    const exploits = actions.filter((a) => a.type === 'exploitWeakness')
    expect(exploits).toHaveLength(2)
    const optionIds = exploits.map((a) => a.payload.exploitOptionId)
    expect(optionIds).toContain('opt-easy')
    expect(optionIds).toContain('opt-medium')
  })

  it('returns three exploit actions when all clues found', () => {
    const actions = getValidActions(exploitState(['clue-1', 'clue-2', 'clue-3']))
    const exploits = actions.filter((a) => a.type === 'exploitWeakness')
    expect(exploits).toHaveLength(3)
    const optionIds = exploits.map((a) => a.payload.exploitOptionId)
    expect(optionIds).toContain('opt-easy')
    expect(optionIds).toContain('opt-medium')
    expect(optionIds).toContain('opt-hard')
  })

  it('exploit actions include exploitOptionId in payload', () => {
    const actions = getValidActions(exploitState(['clue-1']))
    const exploit = actions.find((a) => a.type === 'exploitWeakness')!
    expect(exploit.payload).toHaveProperty('exploitOptionId', 'opt-easy')
    expect(exploit.payload).toHaveProperty('hunterId', 'h1')
  })
})

// ─── Non-gameplay phases ──────────────────────────────────────────────────────

describe('getValidActions() — non-gameplay phases', () => {
  it('returns empty array in setup phase', () => {
    expect(getValidActions(createInitialState('x'))).toEqual([])
  })

  it('returns empty array for unknown phase', () => {
    const state = structuredClone(createInitialState('x'))
    ;(state as GameState & { phase: string }).phase = 'fieldReport'
    expect(getValidActions(state)).toEqual([])
  })
})
