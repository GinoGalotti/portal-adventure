import { describe, it, expect } from 'vitest'
import { applyAction, ActionError } from '../../src/engine/actions'
import type { GameState, MysteryDefinition, ActionEntry } from '../../src/engine/types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const testDef: MysteryDefinition = {
  id: 'mystery-test',
  monster: {
    id: 'mon-1',
    type: 'beast',
    name: 'Test Monster',
    motivation: 'hunger',
    weakness: {
      id: 'w1',
      type: 'ritual',
      description: 'weakness.desc',
      statRequired: 'weird',
    },
    harm: 2,
    armor: 0,
    maxHarm: 6,
    attacks: ['attack.1'],
  },
  locationDefs: [
    {
      id: 'loc-a',
      name: 'Library',
      type: 'library',
      threatLevel: 1,
      clueDefs: [
        {
          id: 'clue-a1',
          significance: 'partial',
          description: 'clue.a1',
          locationId: 'loc-a',
          requiresAction: 'investigate',
        },
        {
          id: 'clue-a2',
          significance: 'key',
          description: 'clue.a2',
          locationId: 'loc-a',
          requiresAction: 'interview',
        },
      ],
      availableActions: ['investigate', 'interview', 'deepSearch', 'helpBystander', 'rest'],
    },
    {
      id: 'loc-b',
      name: 'Lair',
      type: 'monsterLair',
      threatLevel: 3,
      clueDefs: [],
      availableActions: ['investigate', 'fightMinion'],
      startingMinions: 2,
    },
  ],
  countdownDef: {
    steps: Array.from({ length: 6 }, (_, i) => ({ step: i, description: `cd.${i}` })),
  },
}

/** h1: sharp +2, tough +1, charm +1, cool 0, weird -1 */
const h1 = {
  id: 'h1',
  name: 'Rosa',
  playbookId: 'investigator',
  stats: { charm: 1, cool: 0, sharp: 2, tough: 1, weird: -1 },
  luck: 7,
  bondCapacity: 3,
}

/** h2: tough +2, cool +1, sharp +1, charm 0, weird 0 */
const h2 = {
  id: 'h2',
  name: 'Marcus',
  playbookId: 'expert',
  stats: { charm: 0, cool: 1, sharp: 1, tough: 2, weird: 0 },
  luck: 7,
  bondCapacity: 2,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function baseState(): GameState {
  return {
    seed: 'test',
    phase: 'setup',
    team: { hunters: [], staminaPool: 0, maxStamina: 0 },
    mystery: null,
    fieldReport: null,
    confrontation: null,
    lastRoll: null,
    rngState: 1,
    actionCount: 0,
    mysteryStartTime: null,
    debugMode: false,
    debugForceRollValue: null,
  }
}

function act(
  type: ActionEntry['type'],
  payload: Record<string, unknown> = {},
  debug?: boolean,
): ActionEntry {
  return { type, payload, timestamp: 0, ...(debug !== undefined ? { debug } : {}) }
}

function afterStart(hunters = [h1]): GameState {
  return applyAction(baseState(), act('startMystery', { definition: testDef, hunters }))
}

function atLibrary(hunters = [h1]): GameState {
  return applyAction(afterStart(hunters), act('travel', { locationId: 'loc-a' }))
}

function atLair(): GameState {
  return applyAction(afterStart(), act('travel', { locationId: 'loc-b' }))
}

function inConfrontation(): GameState {
  return applyAction(atLibrary(), act('startConfrontation', {}))
}

/**
 * Force the dice sum (not including stat modifier) for the next performRoll call.
 * e.g. withForcedRoll(state, 10) → d1=5, d2=5; total = 10 + stat_modifier
 */
function withForcedRoll(state: GameState, value: number): GameState {
  return applyAction(state, act('debug_forceRoll', { value }, true))
}

function setIntel(state: GameState, level: string): GameState {
  return applyAction(state, act('debug_setIntelLevel', { level }, true))
}

// ─── applyAction: general invariants ─────────────────────────────────────────

describe('applyAction() invariants', () => {
  it('does not mutate the input state', () => {
    const s = atLibrary()
    const snapshot = JSON.stringify(s)
    applyAction(s, act('investigate', { hunterId: 'h1' }))
    expect(JSON.stringify(s)).toBe(snapshot)
  })

  it('increments actionCount on each action', () => {
    const s0 = baseState()
    const s1 = applyAction(s0, act('startMystery', { definition: testDef, hunters: [h1] }))
    expect(s1.actionCount).toBe(1)
    const s2 = applyAction(s1, act('travel', { locationId: 'loc-a' }))
    expect(s2.actionCount).toBe(2)
  })
})

// ─── startMystery ─────────────────────────────────────────────────────────────

describe('startMystery', () => {
  it('transitions phase from setup → investigation', () => {
    expect(afterStart().phase).toBe('investigation')
  })

  it('initialises mystery with locations and countdown', () => {
    const s = afterStart()
    expect(s.mystery).not.toBeNull()
    expect(s.mystery!.locations).toHaveLength(2)
    expect(s.mystery!.countdown.currentStep).toBe(0)
  })

  it('populates team hunters and stamina pool', () => {
    const s = afterStart([h1, h2])
    expect(s.team.hunters).toHaveLength(2)
    expect(s.team.staminaPool).toBe(6) // 4 + 2 hunters
  })

  it('throws when definition is missing', () => {
    expect(() =>
      applyAction(baseState(), act('startMystery', { hunters: [h1] })),
    ).toThrow(ActionError)
  })

  it('throws when hunters array is empty', () => {
    expect(() =>
      applyAction(baseState(), act('startMystery', { definition: testDef, hunters: [] })),
    ).toThrow(ActionError)
  })

  it('throws when more than 4 hunters provided', () => {
    expect(() =>
      applyAction(baseState(), act('startMystery', {
        definition: testDef,
        hunters: [h1, h2, h1, h2, h1],
      })),
    ).toThrow(ActionError)
  })

  it('throws when called outside setup phase', () => {
    expect(() =>
      applyAction(afterStart(), act('startMystery', { definition: testDef, hunters: [h1] })),
    ).toThrow(ActionError)
  })
})

// ─── travel ───────────────────────────────────────────────────────────────────

describe('travel', () => {
  it('sets currentLocationId', () => {
    expect(atLibrary().mystery!.currentLocationId).toBe('loc-a')
  })

  it('marks location as visited', () => {
    const s = atLibrary()
    expect(s.mystery!.locations.find(l => l.id === 'loc-a')!.visited).toBe(true)
  })

  it('resets all hunters sceneActionsRemaining to max', () => {
    // deplete one action then travel to new location
    const s = applyAction(atLibrary(), act('investigate', { hunterId: 'h1' }))
    expect(s.team.hunters[0].sceneActionsRemaining).toBe(1)
    const moved = applyAction(s, act('travel', { locationId: 'loc-b' }))
    expect(moved.team.hunters[0].sceneActionsRemaining).toBe(2)
  })

  it('throws when locationId is missing', () => {
    expect(() => applyAction(afterStart(), act('travel', {}))).toThrow(ActionError)
  })

  it('throws when location not found', () => {
    expect(() =>
      applyAction(afterStart(), act('travel', { locationId: 'nonexistent' })),
    ).toThrow(ActionError)
  })

  it('throws when already at the target location', () => {
    expect(() =>
      applyAction(atLibrary(), act('travel', { locationId: 'loc-a' })),
    ).toThrow(ActionError)
  })
})

// ─── investigate ─────────────────────────────────────────────────────────────

describe('investigate', () => {
  it('resolves without error', () => {
    expect(() => applyAction(atLibrary(), act('investigate', { hunterId: 'h1' }))).not.toThrow()
  })

  it('decrements sceneActionsRemaining', () => {
    const after = applyAction(atLibrary(), act('investigate', { hunterId: 'h1' }))
    expect(after.team.hunters[0].sceneActionsRemaining).toBe(1)
  })

  it('sets lastRoll with stat=sharp', () => {
    const s = applyAction(atLibrary(), act('investigate', { hunterId: 'h1' }))
    expect(s.lastRoll).not.toBeNull()
    expect(s.lastRoll!.stat).toBe('sharp')
    expect(s.lastRoll!.hunterId).toBe('h1')
  })

  it('discovers clue on success (dice=10, h1.sharp=+2 → total=12)', () => {
    const s = withForcedRoll(atLibrary(), 10)
    const after = applyAction(s, act('investigate', { hunterId: 'h1' }))
    expect(after.mystery!.cluesFound).toContain('clue-a1')
  })

  it('discovers clue on mixed (dice=6, h1.sharp=+2 → total=8)', () => {
    const s = withForcedRoll(atLibrary(), 6)
    const after = applyAction(s, act('investigate', { hunterId: 'h1' }))
    expect(after.mystery!.cluesFound).toContain('clue-a1')
  })

  it('gains experience on miss and discovers no clue (dice=2, total=4)', () => {
    const s = withForcedRoll(atLibrary(), 2)
    const after = applyAction(s, act('investigate', { hunterId: 'h1' }))
    expect(after.team.hunters[0].experience).toBe(1)
    expect(after.mystery!.cluesFound).toHaveLength(0)
  })

  it('throws when hunterId is missing', () => {
    expect(() => applyAction(atLibrary(), act('investigate', {}))).toThrow(ActionError)
  })

  it('throws when hunter not found', () => {
    expect(() =>
      applyAction(atLibrary(), act('investigate', { hunterId: 'nobody' })),
    ).toThrow(ActionError)
  })

  it('throws when no scene actions remain', () => {
    let s = applyAction(atLibrary(), act('investigate', { hunterId: 'h1' }))
    s = applyAction(s, act('investigate', { hunterId: 'h1' })) // 2nd action (depleted)
    expect(() => applyAction(s, act('investigate', { hunterId: 'h1' }))).toThrow(ActionError)
  })

  it('throws when called outside investigation phase', () => {
    expect(() =>
      applyAction(inConfrontation(), act('investigate', { hunterId: 'h1' })),
    ).toThrow(ActionError)
  })
})

// ─── interview ────────────────────────────────────────────────────────────────

describe('interview', () => {
  it('resolves without error', () => {
    expect(() => applyAction(atLibrary(), act('interview', { hunterId: 'h1' }))).not.toThrow()
  })

  it('sets lastRoll with stat=charm', () => {
    const s = applyAction(atLibrary(), act('interview', { hunterId: 'h1' }))
    expect(s.lastRoll!.stat).toBe('charm')
  })

  it('discovers clue on success (dice=10, h1.charm=+1 → total=11)', () => {
    const s = withForcedRoll(atLibrary(), 10)
    const after = applyAction(s, act('interview', { hunterId: 'h1' }))
    expect(after.mystery!.cluesFound).toContain('clue-a2')
  })

  it('gains experience on miss (dice=2, h1.charm=+1 → total=4)', () => {
    const s = withForcedRoll(atLibrary(), 2)
    const after = applyAction(s, act('interview', { hunterId: 'h1' }))
    expect(after.team.hunters[0].experience).toBe(1)
  })

  it('throws when action not available at location', () => {
    expect(() =>
      applyAction(atLair(), act('interview', { hunterId: 'h1' })),
    ).toThrow(ActionError)
  })
})

// ─── deepSearch ───────────────────────────────────────────────────────────────

describe('deepSearch', () => {
  it('resolves without error', () => {
    expect(() => applyAction(atLibrary(), act('deepSearch', { hunterId: 'h1' }))).not.toThrow()
  })

  it('costs 1 stamina (not a scene action)', () => {
    const before = atLibrary()
    const after = applyAction(before, act('deepSearch', { hunterId: 'h1' }))
    expect(after.team.staminaPool).toBe(before.team.staminaPool - 1)
    expect(after.team.hunters[0].sceneActionsRemaining).toBe(before.team.hunters[0].sceneActionsRemaining)
  })

  it('sets lastRoll with stat=sharp', () => {
    const s = applyAction(atLibrary(), act('deepSearch', { hunterId: 'h1' }))
    expect(s.lastRoll!.stat).toBe('sharp')
  })

  it('throws when no stamina remains', () => {
    // drain all stamina (1 hunter → staminaPool = 5)
    let s = atLibrary()
    for (let i = 0; i < 5; i++) {
      s = applyAction(s, act('deepSearch', { hunterId: 'h1' }))
    }
    expect(() => applyAction(s, act('deepSearch', { hunterId: 'h1' }))).toThrow(ActionError)
  })

  it('throws when action not available at location', () => {
    expect(() => applyAction(atLair(), act('deepSearch', { hunterId: 'h1' }))).toThrow(ActionError)
  })
})

// ─── fightMinion ──────────────────────────────────────────────────────────────

describe('fightMinion', () => {
  it('resolves without error', () => {
    expect(() => applyAction(atLair(), act('fightMinion', { hunterId: 'h1' }))).not.toThrow()
  })

  it('defeats minion on success (dice=10, h1.tough=+1 → total=11)', () => {
    const s = withForcedRoll(atLair(), 10)
    const after = applyAction(s, act('fightMinion', { hunterId: 'h1' }))
    const lair = after.mystery!.locations.find(l => l.id === 'loc-b')!
    expect(lair.minionsPresent).toBe(1)
  })

  it('hunter takes harm on miss (dice=2, h1.tough=+1 → total=4)', () => {
    const s = withForcedRoll(atLair(), 2)
    const after = applyAction(s, act('fightMinion', { hunterId: 'h1' }))
    expect(after.team.hunters[0].harm).toBeGreaterThan(0)
  })

  it('costs 1 stamina', () => {
    const before = atLair()
    const after = applyAction(before, act('fightMinion', { hunterId: 'h1' }))
    expect(after.team.staminaPool).toBe(before.team.staminaPool - 1)
  })

  it('throws when no minions at location', () => {
    expect(() =>
      applyAction(atLibrary(), act('fightMinion', { hunterId: 'h1' })),
    ).toThrow(ActionError)
  })
})

// ─── helpBystander ────────────────────────────────────────────────────────────

describe('helpBystander', () => {
  it('resolves without error', () => {
    expect(() =>
      applyAction(atLibrary(), act('helpBystander', { hunterId: 'h1' })),
    ).not.toThrow()
  })

  it('decrements sceneActionsRemaining', () => {
    const before = atLibrary()
    const after = applyAction(before, act('helpBystander', { hunterId: 'h1' }))
    expect(after.team.hunters[0].sceneActionsRemaining).toBe(1)
  })

  it('throws when hunter not found', () => {
    expect(() =>
      applyAction(atLibrary(), act('helpBystander', { hunterId: 'nobody' })),
    ).toThrow(ActionError)
  })
})

// ─── useSpecialMove ───────────────────────────────────────────────────────────

describe('useSpecialMove', () => {
  it('resolves in investigation phase', () => {
    expect(() =>
      applyAction(atLibrary(), act('useSpecialMove', { hunterId: 'h1', moveId: 'move-1' })),
    ).not.toThrow()
  })

  it('resolves in confrontation phase', () => {
    expect(() =>
      applyAction(inConfrontation(), act('useSpecialMove', { hunterId: 'h1', moveId: 'move-1' })),
    ).not.toThrow()
  })

  it('sets lastRoll with stat=weird', () => {
    const s = applyAction(atLibrary(), act('useSpecialMove', { hunterId: 'h1', moveId: 'move-1' }))
    expect(s.lastRoll!.stat).toBe('weird')
  })

  it('throws when moveId is missing', () => {
    expect(() =>
      applyAction(atLibrary(), act('useSpecialMove', { hunterId: 'h1' })),
    ).toThrow(ActionError)
  })
})

// ─── assist ───────────────────────────────────────────────────────────────────

describe('assist', () => {
  it('decrements assisting hunter assistChargesRemaining', () => {
    const before = atLibrary([h1, h2])
    const h2before = before.team.hunters.find(h => h.id === 'h2')!
    const after = applyAction(before, act('assist', {
      assistingHunterId: 'h2',
      targetHunterId: 'h1',
    }))
    const h2after = after.team.hunters.find(h => h.id === 'h2')!
    expect(h2after.assistChargesRemaining).toBe(h2before.assistChargesRemaining - 1)
  })

  it('throws when assisting self', () => {
    expect(() =>
      applyAction(atLibrary([h1, h2]), act('assist', {
        assistingHunterId: 'h1',
        targetHunterId: 'h1',
      })),
    ).toThrow(ActionError)
  })

  it('throws when no assist charges remain', () => {
    let s = atLibrary([h1, h2])
    // drain h2's 2 charges
    s = applyAction(s, act('assist', { assistingHunterId: 'h2', targetHunterId: 'h1' }))
    s = applyAction(s, act('assist', { assistingHunterId: 'h2', targetHunterId: 'h1' }))
    expect(() =>
      applyAction(s, act('assist', { assistingHunterId: 'h2', targetHunterId: 'h1' })),
    ).toThrow(ActionError)
  })

  it('throws when target hunter not found', () => {
    expect(() =>
      applyAction(atLibrary([h1, h2]), act('assist', {
        assistingHunterId: 'h1',
        targetHunterId: 'nobody',
      })),
    ).toThrow(ActionError)
  })
})

// ─── rest ─────────────────────────────────────────────────────────────────────

describe('rest', () => {
  it('resolves without error', () => {
    expect(() => applyAction(atLibrary(), act('rest', { hunterId: 'h1' }))).not.toThrow()
  })

  it('decrements sceneActionsRemaining', () => {
    const after = applyAction(atLibrary(), act('rest', { hunterId: 'h1' }))
    expect(after.team.hunters[0].sceneActionsRemaining).toBe(1)
  })

  it('heals exactly 1 harm', () => {
    let s = atLibrary()
    s = applyAction(s, act('debug_setHunterHarm', { hunterId: 'h1', harm: 3 }, true))
    const after = applyAction(s, act('rest', { hunterId: 'h1' }))
    expect(after.team.hunters[0].harm).toBe(2)
  })

  it('does not reduce harm below 0', () => {
    const after = applyAction(atLibrary(), act('rest', { hunterId: 'h1' })) // starts at 0
    expect(after.team.hunters[0].harm).toBe(0)
  })

  it('throws when no scene actions remain', () => {
    let s = applyAction(atLibrary(), act('rest', { hunterId: 'h1' }))
    s = applyAction(s, act('rest', { hunterId: 'h1' })) // depleted
    expect(() => applyAction(s, act('rest', { hunterId: 'h1' }))).toThrow(ActionError)
  })
})

// ─── startConfrontation ───────────────────────────────────────────────────────

describe('startConfrontation', () => {
  it('transitions phase to confrontation', () => {
    expect(inConfrontation().phase).toBe('confrontation')
  })

  it('initialises confrontation state', () => {
    const s = inConfrontation()
    expect(s.confrontation).not.toBeNull()
    expect(s.confrontation!.currentRound).toBe(1)
    expect(s.confrontation!.monsterHarmTaken).toBe(0)
    expect(s.confrontation!.monsterDefeated).toBe(false)
  })

  it('throws when not in investigation phase', () => {
    expect(() =>
      applyAction(inConfrontation(), act('startConfrontation', {})),
    ).toThrow(ActionError)
  })
})

// ─── attack ───────────────────────────────────────────────────────────────────

describe('attack', () => {
  it('resolves without error', () => {
    expect(() => applyAction(inConfrontation(), act('attack', { hunterId: 'h1' }))).not.toThrow()
  })

  it('deals 2 harm to monster on success (dice=10, h1.tough=+1 → total=11)', () => {
    const s = withForcedRoll(inConfrontation(), 10)
    const after = applyAction(s, act('attack', { hunterId: 'h1' }))
    expect(after.confrontation!.monsterHarmTaken).toBe(2)
    expect(after.confrontation!.history).toHaveLength(1)
    expect(after.confrontation!.history[0].harmDealtToMonster).toBe(2)
  })

  it('sets lastRoll with stat=tough', () => {
    const s = applyAction(inConfrontation(), act('attack', { hunterId: 'h1' }))
    expect(s.lastRoll!.stat).toBe('tough')
  })

  it('gains experience on miss', () => {
    const s = withForcedRoll(inConfrontation(), 2) // dice=2, h1.tough=+1, total=4 → miss
    const after = applyAction(s, act('attack', { hunterId: 'h1' }))
    expect(after.team.hunters[0].experience).toBe(1)
  })

  it('records action in confrontation history', () => {
    const after = applyAction(inConfrontation(), act('attack', { hunterId: 'h1' }))
    expect(after.confrontation!.history[0].actionType).toBe('attack')
    expect(after.confrontation!.history[0].hunterId).toBe('h1')
  })

  it('throws when not in confrontation phase', () => {
    expect(() =>
      applyAction(atLibrary(), act('attack', { hunterId: 'h1' })),
    ).toThrow(ActionError)
  })

  it('throws when hunter not found', () => {
    expect(() =>
      applyAction(inConfrontation(), act('attack', { hunterId: 'nobody' })),
    ).toThrow(ActionError)
  })
})

// ─── defend ───────────────────────────────────────────────────────────────────

describe('defend', () => {
  it('resolves without error', () => {
    expect(() => applyAction(inConfrontation(), act('defend', { hunterId: 'h1' }))).not.toThrow()
  })

  it('sets lastRoll with stat=tough', () => {
    const s = applyAction(inConfrontation(), act('defend', { hunterId: 'h1' }))
    expect(s.lastRoll!.stat).toBe('tough')
  })

  it('records action in confrontation history', () => {
    const after = applyAction(inConfrontation(), act('defend', { hunterId: 'h1' }))
    expect(after.confrontation!.history[0].actionType).toBe('defend')
  })
})

// ─── resist ───────────────────────────────────────────────────────────────────

describe('resist', () => {
  it('resolves without error', () => {
    expect(() => applyAction(inConfrontation(), act('resist', { hunterId: 'h1' }))).not.toThrow()
  })

  it('sets lastRoll with stat=cool', () => {
    const s = applyAction(inConfrontation(), act('resist', { hunterId: 'h1' }))
    expect(s.lastRoll!.stat).toBe('cool')
  })

  it('records action in confrontation history', () => {
    const after = applyAction(inConfrontation(), act('resist', { hunterId: 'h1' }))
    expect(after.confrontation!.history[0].actionType).toBe('resist')
  })
})

// ─── distract ─────────────────────────────────────────────────────────────────

describe('distract', () => {
  it('resolves without error', () => {
    expect(() => applyAction(inConfrontation(), act('distract', { hunterId: 'h1' }))).not.toThrow()
  })

  it('sets lastRoll with stat=charm', () => {
    const s = applyAction(inConfrontation(), act('distract', { hunterId: 'h1' }))
    expect(s.lastRoll!.stat).toBe('charm')
  })

  it('records action in confrontation history', () => {
    const after = applyAction(inConfrontation(), act('distract', { hunterId: 'h1' }))
    expect(after.confrontation!.history[0].actionType).toBe('distract')
  })
})

// ─── assess ───────────────────────────────────────────────────────────────────

describe('assess', () => {
  it('resolves without error', () => {
    expect(() => applyAction(inConfrontation(), act('assess', { hunterId: 'h1' }))).not.toThrow()
  })

  it('sets lastRoll with stat=sharp', () => {
    const s = applyAction(inConfrontation(), act('assess', { hunterId: 'h1' }))
    expect(s.lastRoll!.stat).toBe('sharp')
  })

  it('records action in confrontation history', () => {
    const after = applyAction(inConfrontation(), act('assess', { hunterId: 'h1' }))
    expect(after.confrontation!.history[0].actionType).toBe('assess')
  })
})

// ─── exploitWeakness ──────────────────────────────────────────────────────────

describe('exploitWeakness', () => {
  it('throws when intel level is blind', () => {
    expect(() =>
      applyAction(inConfrontation(), act('exploitWeakness', { hunterId: 'h1' })),
    ).toThrow(ActionError)
  })

  it('defeats monster on success at prepared intel (dice=10, weird+1 modifier → total=10)', () => {
    // prepared: exploitModifier=+1, h1.weird=-1, modified=-1+1=0; dice=10 → total=10 → success
    let s = setIntel(inConfrontation(), 'prepared')
    s = withForcedRoll(s, 10)
    const after = applyAction(s, act('exploitWeakness', { hunterId: 'h1' }))
    expect(after.confrontation!.monsterDefeated).toBe(true)
  })

  it('records action in confrontation history', () => {
    let s = setIntel(inConfrontation(), 'prepared')
    s = withForcedRoll(s, 10)
    const after = applyAction(s, act('exploitWeakness', { hunterId: 'h1' }))
    expect(after.confrontation!.history[0].actionType).toBe('exploitWeakness')
  })

  it('throws when hunter is dead', () => {
    let s = setIntel(inConfrontation(), 'partial')
    s = applyAction(s, act('debug_killHunter', { hunterId: 'h1' }, true))
    expect(() =>
      applyAction(s, act('exploitWeakness', { hunterId: 'h1' })),
    ).toThrow(ActionError)
  })
})

// ─── spendLuck ────────────────────────────────────────────────────────────────

describe('spendLuck', () => {
  it('throws when there is no lastRoll', () => {
    expect(() => applyAction(atLibrary(), act('spendLuck', {}))).toThrow(ActionError)
  })

  it('upgrades outcome from miss → mixed', () => {
    // dice=2, h1.sharp=+2, total=4 → miss
    let s = withForcedRoll(atLibrary(), 2)
    s = applyAction(s, act('investigate', { hunterId: 'h1' }))
    expect(s.lastRoll!.outcome).toBe('miss')
    const after = applyAction(s, act('spendLuck', {}))
    expect(after.lastRoll!.outcome).toBe('mixed')
    expect(after.lastRoll!.luckSpent).toBe(true)
  })

  it('upgrades outcome from mixed → success', () => {
    // dice=6, h1.sharp=+2, total=8 → mixed
    let s = withForcedRoll(atLibrary(), 6)
    s = applyAction(s, act('investigate', { hunterId: 'h1' }))
    expect(s.lastRoll!.outcome).toBe('mixed')
    const after = applyAction(s, act('spendLuck', {}))
    expect(after.lastRoll!.outcome).toBe('success')
  })

  it('decrements hunter luck by 1', () => {
    let s = withForcedRoll(atLibrary(), 2)
    s = applyAction(s, act('investigate', { hunterId: 'h1' }))
    const after = applyAction(s, act('spendLuck', {}))
    expect(after.team.hunters[0].luck).toBe(6)
  })

  it('throws when roll is already a full success', () => {
    let s = withForcedRoll(atLibrary(), 10) // total=12 → success
    s = applyAction(s, act('investigate', { hunterId: 'h1' }))
    expect(() => applyAction(s, act('spendLuck', {}))).toThrow(ActionError)
  })

  it('throws when hunter has no luck remaining', () => {
    let s = applyAction(atLibrary(), act('debug_setHunterLuck', { hunterId: 'h1', luck: 0 }, true))
    s = withForcedRoll(s, 2)
    s = applyAction(s, act('investigate', { hunterId: 'h1' }))
    expect(() => applyAction(s, act('spendLuck', {}))).toThrow(ActionError)
  })

  it('throws when luck already spent on this roll', () => {
    let s = withForcedRoll(atLibrary(), 2)
    s = applyAction(s, act('investigate', { hunterId: 'h1' }))
    s = applyAction(s, act('spendLuck', {})) // first spend
    expect(() => applyAction(s, act('spendLuck', {}))).toThrow(ActionError)
  })
})

// ─── endMystery ───────────────────────────────────────────────────────────────

describe('endMystery', () => {
  it('transitions phase to fieldReport', () => {
    const s = applyAction(atLibrary(), act('endMystery', { outcome: 'retreat' }))
    expect(s.phase).toBe('fieldReport')
  })

  it('generates a field report with the given outcome', () => {
    const s = applyAction(atLibrary(), act('endMystery', { outcome: 'win' }))
    expect(s.fieldReport).not.toBeNull()
    expect(s.fieldReport!.outcome).toBe('win')
    expect(s.fieldReport!.mysteryId).toBe('mystery-test')
  })

  it('generates hunter reports for all deployed hunters', () => {
    const s = applyAction(atLibrary(), act('endMystery', { outcome: 'loss' }))
    expect(s.fieldReport!.hunterReports).toHaveLength(1)
    expect(s.fieldReport!.hunterReports[0].hunterId).toBe('h1')
  })

  it('throws when outcome is missing', () => {
    expect(() => applyAction(atLibrary(), act('endMystery', {}))).toThrow(ActionError)
  })

  it('throws when outcome is invalid', () => {
    expect(() =>
      applyAction(atLibrary(), act('endMystery', { outcome: 'draw' })),
    ).toThrow(ActionError)
  })

  it('also works from confrontation phase', () => {
    const s = applyAction(inConfrontation(), act('endMystery', { outcome: 'win' }))
    expect(s.phase).toBe('fieldReport')
  })
})

// ─── Debug actions ────────────────────────────────────────────────────────────

describe('debug actions require debug: true', () => {
  const debugTypes: ActionEntry['type'][] = [
    'debug_revealAllClues',
    'debug_revealMonster',
    'debug_revealMap',
    'debug_setIntelLevel',
    'debug_setHunterHarm',
    'debug_setHunterLuck',
    'debug_setCountdown',
    'debug_addStamina',
    'debug_skipToConfrontation',
    'debug_forceRoll',
    'debug_killHunter',
    'debug_completeCase',
    'debug_setSeed',
    'debug_unlockAllPlaybooks',
    'debug_grantResources',
    'debug_loadState',
  ]

  for (const type of debugTypes) {
    it(`${type} throws without debug: true`, () => {
      expect(() => applyAction(afterStart(), act(type, {}))).toThrow(ActionError)
    })
  }
})

describe('debug_revealAllClues', () => {
  it('marks all clues found and sets intel to prepared', () => {
    const s = applyAction(
      afterStart(),
      act('debug_revealAllClues', {}, true),
    )
    const allClues = s.mystery!.locations.flatMap(l => l.clues)
    expect(allClues.every(c => c.found)).toBe(true)
    expect(s.mystery!.cluesFound).toHaveLength(2)
    expect(s.mystery!.intelLevel).toBe('prepared')
  })
})

describe('debug_revealMonster', () => {
  it('sets monsterRevealed to true', () => {
    const s = applyAction(afterStart(), act('debug_revealMonster', {}, true))
    expect(s.mystery!.monsterRevealed).toBe(true)
  })
})

describe('debug_revealMap', () => {
  it('marks all locations as visited and sets mapRevealed', () => {
    const s = applyAction(afterStart(), act('debug_revealMap', {}, true))
    expect(s.mystery!.mapRevealed).toBe(true)
    expect(s.mystery!.locations.every(l => l.visited)).toBe(true)
  })
})

describe('debug_setIntelLevel', () => {
  it('sets mystery and confrontation intel level', () => {
    const s = setIntel(inConfrontation(), 'informed')
    expect(s.mystery!.intelLevel).toBe('informed')
    expect(s.confrontation!.intelLevel).toBe('informed')
  })

  it('throws on invalid level', () => {
    expect(() =>
      applyAction(afterStart(), act('debug_setIntelLevel', { level: 'expert' }, true)),
    ).toThrow(ActionError)
  })
})

describe('debug_setHunterHarm', () => {
  it('sets hunter harm to specified value', () => {
    const s = applyAction(afterStart(), act('debug_setHunterHarm', { hunterId: 'h1', harm: 4 }, true))
    expect(s.team.hunters[0].harm).toBe(4)
    expect(s.team.hunters[0].conditions).toContain('injured')
  })
})

describe('debug_setHunterLuck', () => {
  it('sets hunter luck to specified value', () => {
    const s = applyAction(afterStart(), act('debug_setHunterLuck', { hunterId: 'h1', luck: 3 }, true))
    expect(s.team.hunters[0].luck).toBe(3)
  })
})

describe('debug_setCountdown', () => {
  it('sets countdown currentStep', () => {
    const s = applyAction(afterStart(), act('debug_setCountdown', { step: 4 }, true))
    expect(s.mystery!.countdown.currentStep).toBe(4)
  })

  it('throws when step is out of range', () => {
    expect(() =>
      applyAction(afterStart(), act('debug_setCountdown', { step: 7 }, true)),
    ).toThrow(ActionError)
  })
})

describe('debug_addStamina', () => {
  it('increases staminaPool by the given amount', () => {
    const before = afterStart()
    const after = applyAction(before, act('debug_addStamina', { amount: 3 }, true))
    expect(after.team.staminaPool).toBe(before.team.staminaPool + 3)
  })

  it('does not go below 0 when amount is negative', () => {
    const s = applyAction(afterStart(), act('debug_addStamina', { amount: -9999 }, true))
    expect(s.team.staminaPool).toBe(0)
  })
})

describe('debug_skipToConfrontation', () => {
  it('transitions phase from investigation → confrontation', () => {
    const s = applyAction(afterStart(), act('debug_skipToConfrontation', {}, true))
    expect(s.phase).toBe('confrontation')
    expect(s.confrontation).not.toBeNull()
  })

  it('throws when not in investigation phase', () => {
    expect(() =>
      applyAction(inConfrontation(), act('debug_skipToConfrontation', {}, true)),
    ).toThrow(ActionError)
  })
})

describe('debug_forceRoll', () => {
  it('sets debugForceRollValue', () => {
    const s = withForcedRoll(atLibrary(), 8)
    expect(s.debugForceRollValue).toBe(8)
  })

  it('clears debugForceRollValue after first use', () => {
    let s = withForcedRoll(atLibrary(), 8)
    s = applyAction(s, act('investigate', { hunterId: 'h1' })) // consumes the forced roll
    expect(s.debugForceRollValue).toBeNull()
  })

  it('throws when value is out of 2–12 range', () => {
    expect(() =>
      applyAction(atLibrary(), act('debug_forceRoll', { value: 1 }, true)),
    ).toThrow(ActionError)
  })
})

describe('debug_killHunter', () => {
  it('sets hunter harm to 7 and marks dead', () => {
    const s = applyAction(afterStart(), act('debug_killHunter', { hunterId: 'h1' }, true))
    expect(s.team.hunters[0].harm).toBe(7)
    expect(s.team.hunters[0].alive).toBe(false)
    expect(s.team.hunters[0].conditions).toContain('dead')
  })
})

describe('debug_completeCase', () => {
  it('generates a field report and transitions to fieldReport phase', () => {
    const s = applyAction(afterStart(), act('debug_completeCase', { outcome: 'win' }, true))
    expect(s.phase).toBe('fieldReport')
    expect(s.fieldReport).not.toBeNull()
    expect(s.fieldReport!.outcome).toBe('win')
  })
})

describe('debug_setSeed', () => {
  it('changes the game seed', () => {
    const s = applyAction(afterStart(), act('debug_setSeed', { seed: 'new-seed' }, true))
    expect(s.seed).toBe('new-seed')
  })
})

describe('debug_unlockAllPlaybooks', () => {
  it('resolves without error (no-op in Phase A)', () => {
    expect(() =>
      applyAction(afterStart(), act('debug_unlockAllPlaybooks', {}, true)),
    ).not.toThrow()
  })
})

describe('debug_grantResources', () => {
  it('resolves without error (no-op in Phase A)', () => {
    expect(() =>
      applyAction(afterStart(), act('debug_grantResources', {}, true)),
    ).not.toThrow()
  })
})

describe('debug_loadState', () => {
  it('replaces the game state from JSON', () => {
    const target: GameState = {
      ...baseState(),
      seed: 'loaded-seed',
    }
    const result = applyAction(
      afterStart(),
      act('debug_loadState', { json: JSON.stringify(target) }, true),
    )
    expect(result.seed).toBe('loaded-seed')
  })

  it('throws on invalid JSON', () => {
    expect(() =>
      applyAction(afterStart(), act('debug_loadState', { json: '{ not valid' }, true)),
    ).toThrow(ActionError)
  })
})
