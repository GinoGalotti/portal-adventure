import { describe, it, expect } from 'vitest'
import { createInitialState, deriveState } from '../../src/engine/state'
import { applyAction } from '../../src/engine/actions'
import type { MysteryDefinition, ActionEntry } from '../../src/engine/types'

// ─── Shared fixture ───────────────────────────────────────────────────────────

const testDef: MysteryDefinition = {
  id: 'mystery-state-test',
  monster: {
    id: 'mon-1',
    type: 'beast',
    name: 'Monster',
    motivation: 'hunger',
    weakness: { id: 'w1', type: 'ritual', description: 'w', statRequired: 'weird' },
    harm: 2,
    armor: 0,
    maxHarm: 6,
    attacks: ['atk'],
  },
  locationDefs: [
    {
      id: 'loc-a',
      name: 'Loc A',
      type: 'library',
      threatLevel: 1,
      clueDefs: [],
      availableActions: ['investigate'],
    },
    {
      id: 'loc-b',
      name: 'Loc B',
      type: 'publicSpace',
      threatLevel: 1,
      clueDefs: [],
      availableActions: ['investigate'],
    },
  ],
  countdownDef: {
    steps: Array.from({ length: 6 }, (_, i) => ({ step: i, description: `cd.${i}` })),
  },
}

const h1 = {
  id: 'h1',
  name: 'Rosa',
  playbookId: 'investigator',
  stats: { charm: 1, cool: 0, sharp: 2, tough: 1, weird: -1 },
  luck: 7,
  bondCapacity: 3,
}

function act(
  type: ActionEntry['type'],
  payload: Record<string, unknown> = {},
): ActionEntry {
  return { type, payload, timestamp: 0 }
}

const startAction = act('startMystery', { definition: testDef, hunters: [h1] })
const travelA = act('travel', { locationId: 'loc-a' })
const travelB = act('travel', { locationId: 'loc-b' })

// ─── createInitialState() ─────────────────────────────────────────────────────

describe('createInitialState()', () => {
  it('produces a setup-phase state', () => {
    const s = createInitialState('seed-x')
    expect(s.phase).toBe('setup')
  })

  it('embeds the seed in the state', () => {
    const s = createInitialState('my-seed')
    expect(s.seed).toBe('my-seed')
  })

  it('starts with zero actions, no mystery, no team', () => {
    const s = createInitialState('seed-x')
    expect(s.actionCount).toBe(0)
    expect(s.mystery).toBeNull()
    expect(s.team.hunters).toHaveLength(0)
  })

  it('same seed always produces identical state', () => {
    expect(createInitialState('abc')).toEqual(createInitialState('abc'))
  })

  it('different seeds produce different rngState', () => {
    const a = createInitialState('seed-a')
    const b = createInitialState('seed-b')
    expect(a.rngState).not.toBe(b.rngState)
  })
})

// ─── deriveState() ────────────────────────────────────────────────────────────

describe('deriveState()', () => {
  it('empty action log returns valid initial state', () => {
    const s = deriveState('seed-x', [])
    expect(s.phase).toBe('setup')
    expect(s.actionCount).toBe(0)
    expect(s.seed).toBe('seed-x')
  })

  it('replay identity — same seed + actions produces identical state', () => {
    const actions = [startAction, travelA]
    const s1 = deriveState('rep-seed', actions)
    const s2 = deriveState('rep-seed', actions)
    expect(s1).toEqual(s2)
  })

  it('different seeds with same actions produce different rngState', () => {
    const actions = [startAction, travelA]
    const sA = deriveState('seed-a', actions)
    const sB = deriveState('seed-b', actions)
    expect(sA.rngState).not.toBe(sB.rngState)
  })

  it('actionCount matches the number of replayed actions', () => {
    expect(deriveState('seed', []).actionCount).toBe(0)
    expect(deriveState('seed', [startAction]).actionCount).toBe(1)
    expect(deriveState('seed', [startAction, travelA]).actionCount).toBe(2)
    expect(deriveState('seed', [startAction, travelA, travelB]).actionCount).toBe(3)
  })

  it('partial replay produces correct intermediate state', () => {
    const s1 = deriveState('seed', [startAction])
    expect(s1.phase).toBe('investigation')
    expect(s1.mystery!.currentLocationId).toBeNull()

    const s2 = deriveState('seed', [startAction, travelA])
    expect(s2.mystery!.currentLocationId).toBe('loc-a')
  })

  it('does not mutate the input action list', () => {
    const actions = [startAction, travelA]
    const snapshot = JSON.stringify(actions)
    deriveState('seed', actions)
    expect(JSON.stringify(actions)).toBe(snapshot)
  })

  it('incremental apply produces identical state to full replay', () => {
    // Incremental: apply actions one by one to a running state
    let incremental = createInitialState('seed')
    incremental = applyAction(incremental, startAction)
    incremental = applyAction(incremental, travelA)

    // Full replay
    const replayed = deriveState('seed', [startAction, travelA])

    expect(incremental).toEqual(replayed)
  })

  it('snapshot state equals re-derived state at the same point', () => {
    // Derive state after 2 actions
    const snapshot = deriveState('seed', [startAction, travelA])

    // Re-derive from scratch — must be identical
    const rederived = deriveState('seed', [startAction, travelA])

    expect(snapshot).toEqual(rederived)
  })
})
