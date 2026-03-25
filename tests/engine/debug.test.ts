import { describe, it, expect } from 'vitest'
import {
  revealAllClues,
  revealMonster,
  revealMap,
  setIntelLevel,
  setHunterHarm,
  setHunterLuck,
  setCountdown,
  addStamina,
  skipToConfrontation,
  forceRoll,
  killHunter,
  completeCase,
  setSeed,
  unlockAllPlaybooks,
  grantResources,
  loadState,
} from '../../src/engine/debug'
import { applyAction } from '../../src/engine/actions'
import { createInitialState } from '../../src/engine/state'
import type { GameState, MysteryDefinition, ActionEntry } from '../../src/engine/types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const testDef: MysteryDefinition = {
  id: 'mystery-debug-test',
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
          id: 'clue-1',
          significance: 'partial',
          description: 'c1',
          locationId: 'loc-a',
          requiresAction: 'investigate',
        },
        {
          id: 'clue-2',
          significance: 'key',
          description: 'c2',
          locationId: 'loc-a',
          requiresAction: 'interview',
        },
      ],
      availableActions: ['investigate', 'interview'],
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

function act(type: ActionEntry['type'], payload: Record<string, unknown> = {}): ActionEntry {
  return { type, payload, timestamp: 0 }
}

function afterStart(): GameState {
  return applyAction(
    createInitialState('debug-test'),
    act('startMystery', { definition: testDef, hunters: [h1] }),
  )
}

function inConfrontation(): GameState {
  return applyAction(afterStart(), act('startConfrontation', {}))
}

// ─── revealAllClues ───────────────────────────────────────────────────────────

describe('revealAllClues()', () => {
  it('marks all clues as found', () => {
    const s = revealAllClues(afterStart())
    const allClues = s.mystery!.locations.flatMap(l => l.clues)
    expect(allClues.every(c => c.found)).toBe(true)
  })

  it('populates cluesFound with all clue IDs', () => {
    const s = revealAllClues(afterStart())
    expect(s.mystery!.cluesFound).toContain('clue-1')
    expect(s.mystery!.cluesFound).toContain('clue-2')
  })

  it('sets intelLevel to prepared', () => {
    const s = revealAllClues(afterStart())
    expect(s.mystery!.intelLevel).toBe('prepared')
  })

  it('does not mutate the input state', () => {
    const before = afterStart()
    const snapshot = JSON.stringify(before)
    revealAllClues(before)
    expect(JSON.stringify(before)).toBe(snapshot)
  })
})

// ─── revealMonster ────────────────────────────────────────────────────────────

describe('revealMonster()', () => {
  it('sets monsterRevealed to true', () => {
    const s = revealMonster(afterStart())
    expect(s.mystery!.monsterRevealed).toBe(true)
  })

  it('does not mutate the input state', () => {
    const before = afterStart()
    const snapshot = JSON.stringify(before)
    revealMonster(before)
    expect(JSON.stringify(before)).toBe(snapshot)
  })
})

// ─── revealMap ────────────────────────────────────────────────────────────────

describe('revealMap()', () => {
  it('sets mapRevealed to true', () => {
    const s = revealMap(afterStart())
    expect(s.mystery!.mapRevealed).toBe(true)
  })

  it('marks all locations as visited', () => {
    const s = revealMap(afterStart())
    expect(s.mystery!.locations.every(l => l.visited)).toBe(true)
  })
})

// ─── setIntelLevel ────────────────────────────────────────────────────────────

describe('setIntelLevel()', () => {
  it('changes mystery intel level', () => {
    const s = setIntelLevel(afterStart(), 'informed')
    expect(s.mystery!.intelLevel).toBe('informed')
  })

  it('also updates confrontation intel when active', () => {
    const s = setIntelLevel(inConfrontation(), 'prepared')
    expect(s.mystery!.intelLevel).toBe('prepared')
    expect(s.confrontation!.intelLevel).toBe('prepared')
  })

  it('accepts all valid intel levels', () => {
    for (const level of ['blind', 'partial', 'informed', 'prepared'] as const) {
      const s = setIntelLevel(afterStart(), level)
      expect(s.mystery!.intelLevel).toBe(level)
    }
  })
})

// ─── setHunterHarm ────────────────────────────────────────────────────────────

describe('setHunterHarm()', () => {
  it('sets hunter harm to exact value', () => {
    const s = setHunterHarm(afterStart(), 'h1', 4)
    expect(s.team.hunters[0].harm).toBe(4)
  })

  it('updates conditions to match new harm (4 → injured)', () => {
    const s = setHunterHarm(afterStart(), 'h1', 4)
    expect(s.team.hunters[0].conditions).toContain('injured')
  })

  it('clamps harm to [0, 7]', () => {
    expect(setHunterHarm(afterStart(), 'h1', 10).team.hunters[0].harm).toBe(7)
    expect(setHunterHarm(afterStart(), 'h1', -5).team.hunters[0].harm).toBe(0)
  })

  it('marks hunter dead when harm set to 7', () => {
    const s = setHunterHarm(afterStart(), 'h1', 7)
    expect(s.team.hunters[0].alive).toBe(false)
    expect(s.team.hunters[0].conditions).toContain('dead')
  })

  it('does not mutate the input state', () => {
    const before = afterStart()
    const snapshot = JSON.stringify(before)
    setHunterHarm(before, 'h1', 3)
    expect(JSON.stringify(before)).toBe(snapshot)
  })
})

// ─── setHunterLuck ────────────────────────────────────────────────────────────

describe('setHunterLuck()', () => {
  it('sets hunter luck to exact value', () => {
    const s = setHunterLuck(afterStart(), 'h1', 3)
    expect(s.team.hunters[0].luck).toBe(3)
  })

  it('clamps to [0, maxLuck]', () => {
    expect(setHunterLuck(afterStart(), 'h1', 0).team.hunters[0].luck).toBe(0)
    expect(setHunterLuck(afterStart(), 'h1', 100).team.hunters[0].luck).toBe(7)
  })
})

// ─── setCountdown ─────────────────────────────────────────────────────────────

describe('setCountdown()', () => {
  it('sets countdown currentStep', () => {
    const s = setCountdown(afterStart(), 3)
    expect(s.mystery!.countdown.currentStep).toBe(3)
  })

  it('accepts boundary values 0 and 6', () => {
    expect(setCountdown(afterStart(), 0).mystery!.countdown.currentStep).toBe(0)
    expect(setCountdown(afterStart(), 6).mystery!.countdown.currentStep).toBe(6)
  })
})

// ─── addStamina ───────────────────────────────────────────────────────────────

describe('addStamina()', () => {
  it('increases staminaPool by the given amount', () => {
    const before = afterStart()
    const after = addStamina(before, 5)
    expect(after.team.staminaPool).toBe(before.team.staminaPool + 5)
  })

  it('clamps pool to minimum 0 on negative amount', () => {
    const s = addStamina(afterStart(), -9999)
    expect(s.team.staminaPool).toBe(0)
  })
})

// ─── skipToConfrontation ──────────────────────────────────────────────────────

describe('skipToConfrontation()', () => {
  it('transitions phase from investigation → confrontation', () => {
    const s = skipToConfrontation(afterStart())
    expect(s.phase).toBe('confrontation')
  })

  it('creates a confrontation state with default values', () => {
    const s = skipToConfrontation(afterStart())
    expect(s.confrontation).not.toBeNull()
    expect(s.confrontation!.monsterHarmTaken).toBe(0)
    expect(s.confrontation!.monsterDefeated).toBe(false)
    expect(s.confrontation!.currentRound).toBe(1)
  })

  it('carries the mystery intel level into confrontation', () => {
    const s = setIntelLevel(afterStart(), 'partial')
    const conf = skipToConfrontation(s)
    expect(conf.confrontation!.intelLevel).toBe('partial')
  })
})

// ─── forceRoll ────────────────────────────────────────────────────────────────

describe('forceRoll()', () => {
  it('sets debugForceRollValue on the state', () => {
    const s = forceRoll(afterStart(), 7)
    expect(s.debugForceRollValue).toBe(7)
  })

  it('forces the dice sum on the next performRoll call', () => {
    // dice=10, h1.sharp=+2 → total=12 → success, discovers clue
    let s = applyAction(afterStart(), act('travel', { locationId: 'loc-a' }))
    s = forceRoll(s, 10)
    const after = applyAction(s, act('investigate', { hunterId: 'h1' }))
    expect(after.lastRoll!.outcome).toBe('success')
  })

  it('clears after one use', () => {
    let s = applyAction(afterStart(), act('travel', { locationId: 'loc-a' }))
    s = forceRoll(s, 10)
    s = applyAction(s, act('investigate', { hunterId: 'h1' })) // consumes the force
    expect(s.debugForceRollValue).toBeNull()
  })
})

// ─── killHunter ───────────────────────────────────────────────────────────────

describe('killHunter()', () => {
  it('sets hunter harm to 7', () => {
    const s = killHunter(afterStart(), 'h1')
    expect(s.team.hunters[0].harm).toBe(7)
  })

  it('marks hunter as not alive', () => {
    const s = killHunter(afterStart(), 'h1')
    expect(s.team.hunters[0].alive).toBe(false)
  })

  it('sets dead condition', () => {
    const s = killHunter(afterStart(), 'h1')
    expect(s.team.hunters[0].conditions).toContain('dead')
  })
})

// ─── completeCase ─────────────────────────────────────────────────────────────

describe('completeCase()', () => {
  it('generates a field report with the given outcome', () => {
    const s = completeCase(afterStart(), 'win')
    expect(s.fieldReport).not.toBeNull()
    expect(s.fieldReport!.outcome).toBe('win')
  })

  it('transitions phase to fieldReport', () => {
    const s = completeCase(afterStart(), 'loss')
    expect(s.phase).toBe('fieldReport')
  })

  it('includes hunter reports in the field report', () => {
    const s = completeCase(afterStart(), 'retreat')
    expect(s.fieldReport!.hunterReports).toHaveLength(1)
    expect(s.fieldReport!.hunterReports[0].hunterId).toBe('h1')
  })

  it('works with all three outcomes', () => {
    for (const outcome of ['win', 'loss', 'retreat'] as const) {
      expect(completeCase(afterStart(), outcome).fieldReport!.outcome).toBe(outcome)
    }
  })
})

// ─── setSeed ──────────────────────────────────────────────────────────────────

describe('setSeed()', () => {
  it('updates the seed in the state', () => {
    const s = setSeed(afterStart(), 'new-seed-xyz')
    expect(s.seed).toBe('new-seed-xyz')
  })
})

// ─── unlockAllPlaybooks / grantResources ──────────────────────────────────────

describe('unlockAllPlaybooks()', () => {
  it('resolves without error (no-op in Phase A)', () => {
    expect(() => unlockAllPlaybooks(afterStart())).not.toThrow()
  })

  it('increments actionCount', () => {
    const before = afterStart()
    const after = unlockAllPlaybooks(before)
    expect(after.actionCount).toBe(before.actionCount + 1)
  })
})

describe('grantResources()', () => {
  it('resolves without error (no-op in Phase A)', () => {
    expect(() => grantResources(afterStart())).not.toThrow()
  })
})

// ─── loadState ────────────────────────────────────────────────────────────────

describe('loadState()', () => {
  it('replaces game state from a JSON string', () => {
    const target = createInitialState('injected-seed')
    const result = loadState(afterStart(), JSON.stringify(target))
    expect(result.seed).toBe('injected-seed')
  })

  it('does not mutate the input state', () => {
    const before = afterStart()
    const snapshot = JSON.stringify(before)
    loadState(before, JSON.stringify(createInitialState('x')))
    expect(JSON.stringify(before)).toBe(snapshot)
  })
})
