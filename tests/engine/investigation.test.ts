import { describe, it, expect } from 'vitest'
import { revealAllClues } from '../../src/engine/debug'
import {
  DEFAULT_CLOCK_CONFIG,
  resolveClockConfig,
  clockCostForOutcome,
  tickClock,
  advanceClockForTravel,
  advanceClockForAction,
  isConfrontationAvailable,
  isDisasterReached,
  isLocationResolved,
  getUnvisitedLocationIds,
  getReachableLocationIds,
} from '../../src/engine/investigation'
import { applyAction } from '../../src/engine/actions'
import { createInitialState } from '../../src/engine/state'
import type { GameState, MysteryDefinition, ActionEntry, CountdownState } from '../../src/engine/types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const testDef: MysteryDefinition = {
  id: 'mystery-inv-test',
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
      name: 'Library',
      type: 'library',
      threatLevel: 1,
      clueDefs: [
        {
          id: 'clue-easy',
          significance: 'partial',
          description: 'easy clue',
          locationId: 'loc-a',
          requiresAction: 'investigate',
        },
        {
          id: 'clue-hard',
          significance: 'key',
          description: 'hard clue',
          locationId: 'loc-a',
          requiresAction: 'investigate',
          minRollOutcome: 'success',
        },
      ],
      availableActions: ['investigate', 'interview'],
      adjacentLocationIds: ['loc-b'],
    },
    {
      id: 'loc-b',
      name: 'Lair',
      type: 'monsterLair',
      threatLevel: 3,
      clueDefs: [],
      availableActions: ['investigate'],
      adjacentLocationIds: ['loc-a'],
    },
  ],
  countdownDef: {
    steps: Array.from({ length: 6 }, (_, i) => ({ step: i, description: `step ${i}` })),
    clockConfig: {
      actionCost: 1,
      travelCost: 2,
      missPenalty: 1,
      successRefund: 1,
      confrontationAt: 10,
      disasterAt: 20,
      stepThresholds: [3, 6, 9, 12, 15],
    },
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
    createInitialState('inv-test'),
    act('startMystery', { definition: testDef, hunters: [h1] }),
  )
}

function atLocA(): GameState {
  return applyAction(afterStart(), act('travel', { locationId: 'loc-a' }))
}

// ─── DEFAULT_CLOCK_CONFIG ─────────────────────────────────────────────────────

describe('DEFAULT_CLOCK_CONFIG', () => {
  it('has expected default values', () => {
    expect(DEFAULT_CLOCK_CONFIG.actionCost).toBe(1)
    expect(DEFAULT_CLOCK_CONFIG.travelCost).toBe(2)
    expect(DEFAULT_CLOCK_CONFIG.missPenalty).toBe(1)
    expect(DEFAULT_CLOCK_CONFIG.successRefund).toBe(1)
    expect(DEFAULT_CLOCK_CONFIG.confrontationAt).toBe(10)
    expect(DEFAULT_CLOCK_CONFIG.disasterAt).toBe(30)
    expect(DEFAULT_CLOCK_CONFIG.stepThresholds).toHaveLength(5)
  })
})

// ─── resolveClockConfig ───────────────────────────────────────────────────────

describe('resolveClockConfig()', () => {
  it('returns defaults when no clockConfig provided', () => {
    const resolved = resolveClockConfig({ steps: [] })
    expect(resolved).toEqual(DEFAULT_CLOCK_CONFIG)
  })

  it('merges partial clockConfig with defaults', () => {
    const resolved = resolveClockConfig({
      steps: [],
      clockConfig: { actionCost: 2, disasterAt: 40 },
    })
    expect(resolved.actionCost).toBe(2)
    expect(resolved.disasterAt).toBe(40)
    expect(resolved.travelCost).toBe(DEFAULT_CLOCK_CONFIG.travelCost) // unchanged
  })

  it('accepts fully-specified clockConfig', () => {
    const config = {
      actionCost: 1, travelCost: 2, missPenalty: 1, successRefund: 1,
      confrontationAt: 5, disasterAt: 20, stepThresholds: [3, 6, 9, 12, 15],
    }
    expect(resolveClockConfig({ steps: [], clockConfig: config })).toEqual(config)
  })
})

// ─── clockCostForOutcome ──────────────────────────────────────────────────────

describe('clockCostForOutcome()', () => {
  it('miss = actionCost + missPenalty', () => {
    expect(clockCostForOutcome('miss', DEFAULT_CLOCK_CONFIG)).toBe(2)
  })

  it('mixed = actionCost', () => {
    expect(clockCostForOutcome('mixed', DEFAULT_CLOCK_CONFIG)).toBe(1)
  })

  it('success = max(0, actionCost − successRefund)', () => {
    expect(clockCostForOutcome('success', DEFAULT_CLOCK_CONFIG)).toBe(0)
  })

  it('success cost clamps to 0 when successRefund >= actionCost', () => {
    const cfg = { ...DEFAULT_CLOCK_CONFIG, actionCost: 1, successRefund: 3 }
    expect(clockCostForOutcome('success', cfg)).toBe(0)
  })

  it('success cost > 0 when actionCost > successRefund', () => {
    const cfg = { ...DEFAULT_CLOCK_CONFIG, actionCost: 3, successRefund: 1 }
    expect(clockCostForOutcome('success', cfg)).toBe(2)
  })
})

// ─── tickClock ────────────────────────────────────────────────────────────────

describe('tickClock()', () => {
  function makeCountdown(clockValue = 0, currentStep = 0): CountdownState {
    return {
      clockValue,
      currentStep,
      clockConfig: {
        actionCost: 1, travelCost: 2, missPenalty: 1, successRefund: 1,
        confrontationAt: 5, disasterAt: 20,
        stepThresholds: [3, 6, 9, 12, 15],
      },
      steps: Array.from({ length: 6 }, (_, i) => ({ step: i, description: `s${i}` })),
      triggeredAt: [],
    }
  }

  it('advances clockValue by the given amount', () => {
    const cd = makeCountdown(0)
    tickClock(cd, 3, 1)
    expect(cd.clockValue).toBe(3)
  })

  it('triggers step 1 when clock crosses first threshold', () => {
    const cd = makeCountdown(0)
    tickClock(cd, 3, 1)
    expect(cd.currentStep).toBe(1)
    expect(cd.triggeredAt).toContain(1)
  })

  it('can skip multiple steps in one tick', () => {
    const cd = makeCountdown(0)
    tickClock(cd, 7, 5) // crosses thresholds 3 and 6
    expect(cd.currentStep).toBe(2)
  })

  it('does not decrease clockValue below 0', () => {
    const cd = makeCountdown(2)
    tickClock(cd, -5, 1)
    expect(cd.clockValue).toBe(0)
  })

  it('does not re-trigger already-passed steps', () => {
    const cd = makeCountdown(5, 1)  // already at step 1
    tickClock(cd, 1, 2)
    expect(cd.currentStep).toBe(2)  // clock=6, threshold for step 2 = 6 → triggered
  })

  it('does not advance step beyond 5', () => {
    const cd = makeCountdown(14, 4)
    tickClock(cd, 5, 10) // clock hits 19, crosses threshold 15 (step 5)
    expect(cd.currentStep).toBe(5)
    tickClock(cd, 10, 11) // well past — should stay at 5
    expect(cd.currentStep).toBe(5)
  })

  it('amount=0 is a no-op', () => {
    const cd = makeCountdown(4)
    tickClock(cd, 0, 1)
    expect(cd.clockValue).toBe(4)
    expect(cd.currentStep).toBe(0)
  })
})

// ─── advanceClockForTravel ────────────────────────────────────────────────────

describe('advanceClockForTravel()', () => {
  it('adds travelCost to the clock when mystery is active', () => {
    const before = afterStart()
    const s = { ...structuredClone(before) }
    advanceClockForTravel(s)
    expect(s.mystery!.countdown.clockValue).toBe(2)  // default travelCost
  })

  it('is a no-op when mystery is null', () => {
    const s = createInitialState('x')
    expect(() => advanceClockForTravel(s)).not.toThrow()
  })
})

// ─── advanceClockForAction ────────────────────────────────────────────────────

describe('advanceClockForAction()', () => {
  it('adds missPenalty+actionCost on miss', () => {
    const s = structuredClone(atLocA())
    const before = s.mystery!.countdown.clockValue
    advanceClockForAction(s, 'miss')
    expect(s.mystery!.countdown.clockValue).toBe(before + 2)
  })

  it('adds actionCost on mixed', () => {
    const s = structuredClone(atLocA())
    const before = s.mystery!.countdown.clockValue
    advanceClockForAction(s, 'mixed')
    expect(s.mystery!.countdown.clockValue).toBe(before + 1)
  })

  it('refunds on success (net 0 with defaults)', () => {
    const s = structuredClone(atLocA())
    const before = s.mystery!.countdown.clockValue
    advanceClockForAction(s, 'success')
    expect(s.mystery!.countdown.clockValue).toBe(before + 0)
  })

  it('travel + action sequence accumulates correctly', () => {
    // travel = +2, mixed action = +1, miss action = +2
    const s = structuredClone(atLocA())  // already traveled, clock = 2
    advanceClockForAction(s, 'mixed')   // +1 → 3
    advanceClockForAction(s, 'miss')    // +2 → 5
    expect(s.mystery!.countdown.clockValue).toBe(5)
  })
})

// ─── Clock integration: travel actually advances clock ────────────────────────

describe('clock integration via applyAction', () => {
  it('travel action advances clock by travelCost', () => {
    const s = afterStart()  // clock = 0
    const after = applyAction(s, act('travel', { locationId: 'loc-a' }))
    expect(after.mystery!.countdown.clockValue).toBe(2)
  })

  it('clock advances step when threshold crossed by travel', () => {
    // testDef threshold: step 1 at 3
    // One travel = +2, second travel = +2, third travel = +2 (total 6 → step 2)
    let s = afterStart()
    s = applyAction(s, act('travel', { locationId: 'loc-a' }))  // 2
    s = applyAction(s, act('travel', { locationId: 'loc-b' }))  // 4 — step 1 at 3
    expect(s.mystery!.countdown.currentStep).toBe(1)
  })

  it('countdown step does not advance without travel or actions', () => {
    const s = afterStart()
    expect(s.mystery!.countdown.clockValue).toBe(0)
    expect(s.mystery!.countdown.currentStep).toBe(0)
  })
})

// ─── isConfrontationAvailable / isDisasterReached ────────────────────────────

describe('isConfrontationAvailable()', () => {
  it('false when clock < confrontationAt', () => {
    const s = afterStart()
    expect(isConfrontationAvailable(s)).toBe(false)
  })

  it('true when clock >= confrontationAt (10 in testDef)', () => {
    const s = structuredClone(atLocA())
    s.mystery!.countdown.clockValue = 10
    expect(isConfrontationAvailable(s)).toBe(true)
  })

  it('false when no active mystery', () => {
    expect(isConfrontationAvailable(createInitialState('x'))).toBe(false)
  })
})

describe('isDisasterReached()', () => {
  it('false when clock < disasterAt', () => {
    expect(isDisasterReached(atLocA())).toBe(false)
  })

  it('true when clock >= disasterAt (20 in testDef)', () => {
    const s = structuredClone(atLocA())
    s.mystery!.countdown.clockValue = 20
    expect(isDisasterReached(s)).toBe(true)
  })
})

// ─── isLocationResolved ───────────────────────────────────────────────────────

describe('isLocationResolved()', () => {
  it('false when location has undiscovered clues', () => {
    expect(isLocationResolved(atLocA(), 'loc-a')).toBe(false)
  })

  it('true when all clues found', () => {
    // Force both clues found via debug action
    const s = revealAllClues(atLocA())
    expect(isLocationResolved(s, 'loc-a')).toBe(true)
  })

  it('true for location with no clues', () => {
    expect(isLocationResolved(atLocA(), 'loc-b')).toBe(true)
  })

  it('false when mystery is null', () => {
    expect(isLocationResolved(createInitialState('x'), 'loc-a')).toBe(false)
  })
})

// ─── getUnvisitedLocationIds ──────────────────────────────────────────────────

describe('getUnvisitedLocationIds()', () => {
  it('all locations unvisited after mystery start', () => {
    const ids = getUnvisitedLocationIds(afterStart())
    expect(ids).toContain('loc-a')
    expect(ids).toContain('loc-b')
  })

  it('visited location not returned', () => {
    const ids = getUnvisitedLocationIds(atLocA())
    expect(ids).not.toContain('loc-a')
    expect(ids).toContain('loc-b')
  })

  it('returns empty array when no mystery', () => {
    expect(getUnvisitedLocationIds(createInitialState('x'))).toEqual([])
  })
})

// ─── getReachableLocationIds ──────────────────────────────────────────────────

describe('getReachableLocationIds()', () => {
  it('returns all locations before first travel (no current location)', () => {
    const ids = getReachableLocationIds(afterStart())
    expect(ids).toContain('loc-a')
    expect(ids).toContain('loc-b')
  })

  it('returns current location and its adjacent locations after travel', () => {
    const ids = getReachableLocationIds(atLocA())
    expect(ids).toContain('loc-a')   // current
    expect(ids).toContain('loc-b')   // adjacent
  })
})
