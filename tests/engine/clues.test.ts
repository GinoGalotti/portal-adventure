import { describe, it, expect } from 'vitest'
import {
  isClueRevealedByOutcome,
  discoverClue,
  discoverDeepSearchClue,
  isClueFound,
  getUndiscoveredClues,
  getCluesByAction,
  recalculateIntel,
  getUnreachableClueIds,
} from '../../src/engine/clues'
import { applyAction } from '../../src/engine/actions'
import { createInitialState } from '../../src/engine/state'
import { forceRoll } from '../../src/engine/debug'
import type { ClueDef, Location, Mystery, MysteryDefinition, ActionEntry, GameState } from '../../src/engine/types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const testDef: MysteryDefinition = {
  id: 'mystery-clue-test',
  monster: {
    id: 'mon-1', type: 'beast', name: 'M', motivation: 'hunger',
    weakness: { id: 'w1', type: 'ritual', description: 'w', statRequired: 'weird' },
    harm: 2, armor: 0, maxHarm: 6, attacks: [],
  },
  locationDefs: [
    {
      id: 'loc-a',
      name: 'Library',
      type: 'library',
      threatLevel: 1,
      clueDefs: [
        { id: 'clue-easy', significance: 'partial', description: 'easy', locationId: 'loc-a', requiresAction: 'investigate' },
        { id: 'clue-hard', significance: 'key', description: 'hard', locationId: 'loc-a', requiresAction: 'investigate', minRollOutcome: 'success' },
        { id: 'clue-interview', significance: 'partial', description: 'talk', locationId: 'loc-a', requiresAction: 'interview' },
        { id: 'clue-deep', significance: 'key', description: 'deep', locationId: 'loc-a', requiresAction: 'deepSearch' },
        { id: 'clue-guarded', significance: 'partial', description: 'guarded', locationId: 'loc-a', requiresAction: 'investigate', guardedByMinion: true },
      ],
      availableActions: ['investigate', 'interview', 'deepSearch'],
    },
    {
      id: 'loc-unreachable',
      name: 'Unreachable',
      type: 'hiddenArea',
      threatLevel: 1,
      clueDefs: [
        { id: 'clue-orphan', significance: 'partial', description: 'orphan', locationId: 'loc-unreachable', requiresAction: 'investigate' },
      ],
      availableActions: ['interview'],  // investigate NOT in availableActions — orphan unreachable
    },
  ],
  countdownDef: {
    steps: Array.from({ length: 6 }, (_, i) => ({ step: i, description: `s${i}` })),
  },
}

const h1 = {
  id: 'h1', name: 'Rosa', playbookId: 'investigator',
  stats: { charm: 1, cool: 0, sharp: 2, tough: 1, weird: -1 },
  luck: 7, bondCapacity: 3,
}

function act(type: ActionEntry['type'], payload: Record<string, unknown> = {}): ActionEntry {
  return { type, payload, timestamp: 0 }
}

function afterStart(): GameState {
  return applyAction(
    createInitialState('clue-test'),
    act('startMystery', { definition: testDef, hunters: [h1] }),
  )
}

function atLocA(): GameState {
  return applyAction(afterStart(), act('travel', { locationId: 'loc-a' }))
}

function getMystery(s: GameState): Mystery { return s.mystery! }
function getLocA(s: GameState): Location { return s.mystery!.locations[0] }

// ─── isClueRevealedByOutcome ──────────────────────────────────────────────────

describe('isClueRevealedByOutcome()', () => {
  it('miss never reveals any clue', () => {
    const clue: ClueDef = { id: 'x', significance: 'partial', description: '', locationId: 'a', requiresAction: 'investigate' }
    expect(isClueRevealedByOutcome(clue, 'miss')).toBe(false)
  })

  it('mixed reveals clue with no minRollOutcome', () => {
    const clue: ClueDef = { id: 'x', significance: 'partial', description: '', locationId: 'a', requiresAction: 'investigate' }
    expect(isClueRevealedByOutcome(clue, 'mixed')).toBe(true)
  })

  it('mixed reveals clue with minRollOutcome=mixed', () => {
    const clue: ClueDef = { id: 'x', significance: 'partial', description: '', locationId: 'a', requiresAction: 'investigate', minRollOutcome: 'mixed' }
    expect(isClueRevealedByOutcome(clue, 'mixed')).toBe(true)
  })

  it('success reveals clue with no minRollOutcome', () => {
    const clue: ClueDef = { id: 'x', significance: 'partial', description: '', locationId: 'a', requiresAction: 'investigate' }
    expect(isClueRevealedByOutcome(clue, 'success')).toBe(true)
  })

  it('mixed does NOT reveal clue with minRollOutcome=success', () => {
    const clue: ClueDef = { id: 'x', significance: 'key', description: '', locationId: 'a', requiresAction: 'investigate', minRollOutcome: 'success' }
    expect(isClueRevealedByOutcome(clue, 'mixed')).toBe(false)
  })

  it('success DOES reveal clue with minRollOutcome=success', () => {
    const clue: ClueDef = { id: 'x', significance: 'key', description: '', locationId: 'a', requiresAction: 'investigate', minRollOutcome: 'success' }
    expect(isClueRevealedByOutcome(clue, 'success')).toBe(true)
  })
})

// ─── discoverClue ─────────────────────────────────────────────────────────────

describe('discoverClue()', () => {
  it('discovers matching clue on mixed outcome', () => {
    const s = structuredClone(atLocA())
    const found = discoverClue(getMystery(s), getLocA(s), 'investigate', 'mixed', 'h1', 1)
    expect(found).not.toBeNull()
    expect(found!.id).toBe('clue-easy')  // easy clue has no minRollOutcome gate
  })

  it('does not discover gated clue on mixed', () => {
    const s = structuredClone(atLocA())
    // Mark easy clue as already found so we skip to the gated one
    getLocA(s).clues.find(c => c.id === 'clue-easy')!.found = true
    getMystery(s).cluesFound.push('clue-easy')
    const found = discoverClue(getMystery(s), getLocA(s), 'investigate', 'mixed', 'h1', 2)
    expect(found).toBeNull()  // clue-hard requires success
  })

  it('discovers gated clue on success', () => {
    const s = structuredClone(atLocA())
    getLocA(s).clues.find(c => c.id === 'clue-easy')!.found = true
    getMystery(s).cluesFound.push('clue-easy')
    const found = discoverClue(getMystery(s), getLocA(s), 'investigate', 'success', 'h1', 2)
    expect(found).not.toBeNull()
    expect(found!.id).toBe('clue-hard')
  })

  it('returns null on miss', () => {
    const s = structuredClone(atLocA())
    const found = discoverClue(getMystery(s), getLocA(s), 'investigate', 'miss', 'h1', 1)
    expect(found).toBeNull()
  })

  it('skips guarded clues', () => {
    const s = structuredClone(atLocA())
    // Mark all non-guarded clues found
    for (const c of getLocA(s).clues) {
      if (!c.guardedByMinion && c.requiresAction === 'investigate') {
        c.found = true
        getMystery(s).cluesFound.push(c.id)
      }
    }
    const found = discoverClue(getMystery(s), getLocA(s), 'investigate', 'success', 'h1', 5)
    expect(found).toBeNull()  // only guarded clue remains
  })

  it('sets foundBy and foundAt on discovery', () => {
    const s = structuredClone(atLocA())
    const found = discoverClue(getMystery(s), getLocA(s), 'investigate', 'mixed', 'h1', 7)
    expect(found!.foundBy).toBe('h1')
    expect(found!.foundAt).toBe(7)
  })

  it('updates mystery.cluesFound and intelLevel', () => {
    const s = structuredClone(atLocA())
    discoverClue(getMystery(s), getLocA(s), 'investigate', 'mixed', 'h1', 1)
    expect(getMystery(s).cluesFound).toContain('clue-easy')
    // 1 clue → still blind (need 2 for partial)
    expect(getMystery(s).intelLevel).toBe('blind')
  })

  it('duplicate discovery does not double-count clue', () => {
    const s = structuredClone(atLocA())
    discoverClue(getMystery(s), getLocA(s), 'investigate', 'mixed', 'h1', 1)
    // Mark as not found to simulate calling again (shouldn't happen in practice)
    // Actually, the clue.found flag prevents re-discovery naturally
    const before = getMystery(s).cluesFound.length
    discoverClue(getMystery(s), getLocA(s), 'investigate', 'mixed', 'h1', 2)
    // No unfound investigate clue without minRollOutcome remains at this point
    // (clue-hard requires success, so not discovered on mixed)
    expect(getMystery(s).cluesFound.length).toBe(before)
  })
})

// ─── discoverDeepSearchClue ───────────────────────────────────────────────────

describe('discoverDeepSearchClue()', () => {
  it('finds deepSearch-specific clue on success', () => {
    const s = structuredClone(atLocA())
    const found = discoverDeepSearchClue(getMystery(s), getLocA(s), 'success', 'h1', 1)
    expect(found!.id).toBe('clue-deep')
  })

  it('returns null on miss', () => {
    const s = structuredClone(atLocA())
    const found = discoverDeepSearchClue(getMystery(s), getLocA(s), 'miss', 'h1', 1)
    expect(found).toBeNull()
  })

  it('falls back to any non-guarded unfound clue when deepSearch-specific not available', () => {
    const s = structuredClone(atLocA())
    // Mark deepSearch clue as found
    getLocA(s).clues.find(c => c.id === 'clue-deep')!.found = true
    getMystery(s).cluesFound.push('clue-deep')
    const found = discoverDeepSearchClue(getMystery(s), getLocA(s), 'mixed', 'h1', 2)
    // Falls back to any undiscovered non-guarded clue (clue-easy on mixed)
    expect(found).not.toBeNull()
    expect(found!.id).not.toBe('clue-guarded')  // guarded is skipped
  })
})

// ─── isClueFound ──────────────────────────────────────────────────────────────

describe('isClueFound()', () => {
  it('false for undiscovered clue', () => {
    expect(isClueFound(getMystery(atLocA()), 'clue-easy')).toBe(false)
  })

  it('true after clue is discovered', () => {
    const s = structuredClone(atLocA())
    discoverClue(getMystery(s), getLocA(s), 'investigate', 'mixed', 'h1', 1)
    expect(isClueFound(getMystery(s), 'clue-easy')).toBe(true)
  })
})

// ─── getUndiscoveredClues ─────────────────────────────────────────────────────

describe('getUndiscoveredClues()', () => {
  it('returns all clues initially', () => {
    const undiscovered = getUndiscoveredClues(getLocA(atLocA()))
    expect(undiscovered.length).toBe(5)
  })

  it('excludes found clues', () => {
    const s = structuredClone(atLocA())
    discoverClue(getMystery(s), getLocA(s), 'investigate', 'mixed', 'h1', 1)
    expect(getUndiscoveredClues(getLocA(s)).length).toBe(4)
  })
})

// ─── getCluesByAction ─────────────────────────────────────────────────────────

describe('getCluesByAction()', () => {
  it('returns only clues for the given action type', () => {
    const loc = getLocA(atLocA())
    const invClues = getCluesByAction(loc, 'investigate')
    expect(invClues.every(c => c.requiresAction === 'investigate')).toBe(true)
    expect(invClues.length).toBe(3)  // clue-easy, clue-hard, clue-guarded
  })

  it('returns empty array for action with no clues', () => {
    expect(getCluesByAction(getLocA(atLocA()), 'fightMinion')).toHaveLength(0)
  })
})

// ─── recalculateIntel ─────────────────────────────────────────────────────────

describe('recalculateIntel()', () => {
  it('blind at 0–1 clues', () => {
    const m = getMystery(atLocA())
    expect(recalculateIntel(m)).toBe('blind')
  })

  it('partial at 2–3 clues', () => {
    const s = structuredClone(atLocA())
    getMystery(s).cluesFound = ['a', 'b']
    expect(recalculateIntel(getMystery(s))).toBe('partial')
  })

  it('informed at 4–5 clues', () => {
    const s = structuredClone(atLocA())
    getMystery(s).cluesFound = ['a', 'b', 'c', 'd']
    expect(recalculateIntel(getMystery(s))).toBe('informed')
  })

  it('prepared at 6+ clues', () => {
    const s = structuredClone(atLocA())
    getMystery(s).cluesFound = ['a', 'b', 'c', 'd', 'e', 'f']
    expect(recalculateIntel(getMystery(s))).toBe('prepared')
  })

  it('mutates mystery.intelLevel', () => {
    const s = structuredClone(atLocA())
    getMystery(s).cluesFound = ['a', 'b']
    recalculateIntel(getMystery(s))
    expect(getMystery(s).intelLevel).toBe('partial')
  })
})

// ─── getUnreachableClueIds ────────────────────────────────────────────────────

describe('getUnreachableClueIds()', () => {
  it('returns clue IDs whose requiresAction is not in availableActions', () => {
    const unreachable = getUnreachableClueIds(testDef)
    expect(unreachable).toContain('clue-orphan')
  })

  it('does not flag clues whose requiresAction is in availableActions', () => {
    const unreachable = getUnreachableClueIds(testDef)
    expect(unreachable).not.toContain('clue-easy')
    expect(unreachable).not.toContain('clue-interview')
  })

  it('returns empty array for a mystery with no unreachable clues', () => {
    const cleanDef: MysteryDefinition = {
      ...testDef,
      locationDefs: [testDef.locationDefs[0]],  // only loc-a (fully reachable)
    }
    expect(getUnreachableClueIds(cleanDef)).toHaveLength(0)
  })
})

// ─── Intel level integration via applyAction ─────────────────────────────────

describe('intel level advances correctly through investigation', () => {
  it('mystery-001-style: ash locket requires success, not found on mixed', () => {
    // Simulate: investigator (sharp+2) with forced mixed roll (8 + 2 = 10 wait no...)
    // We need forced roll of 6 to get mixed (6+2=8, mixed). Hard clue should NOT be found.
    // Use forceRoll from debug to control the outcome precisely.
    let s = atLocA()

    // Force a mixed outcome (dice=6, sharp=2, total=8 → mixed)
    s = forceRoll(s, 6)
    s = applyAction(s, act('investigate', { hunterId: 'h1' }))
    // clue-easy should be found (no gate), clue-hard should NOT (mixed < success gate)
    expect(getMystery(s).cluesFound).toContain('clue-easy')
    expect(getMystery(s).cluesFound).not.toContain('clue-hard')
  })

  it('gated clue is found on success', () => {
    let s = atLocA()
    // Mark easy clue found first
    s.mystery!.locations[0].clues.find(c => c.id === 'clue-easy')!.found = true
    s.mystery!.cluesFound.push('clue-easy')

    // Force success (dice=10, sharp=2, total=12 → success)
    s = forceRoll(s, 10)
    s = applyAction(s, act('investigate', { hunterId: 'h1' }))
    expect(getMystery(s).cluesFound).toContain('clue-hard')
  })
})
