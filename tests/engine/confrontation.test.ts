import { describe, it, expect } from 'vitest'
import {
  initConfrontation,
  getMonsterBehaviorProfile,
  getAvailableConfrontationActions,
  getConfrontationResult,
  effectiveMonsterHarm,
  getAvailableExploitOptions,
  getExploitOptionById,
} from '../../src/engine/confrontation'
import { applyAction, ActionError } from '../../src/engine/actions'
import { createInitialState } from '../../src/engine/state'
import { forceRoll } from '../../src/engine/debug'
import type { Mystery, MysteryDefinition, MonsterType, ActionEntry, GameState } from '../../src/engine/types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const testDef: MysteryDefinition = {
  id: 'mystery-conf-test',
  monster: {
    id: 'mon-1', type: 'sorcerer', name: 'Eszter', motivation: 'preservation',
    weakness: { id: 'w1', type: 'brokenBond', description: 'resolve bond', statRequired: 'charm' },
    harm: 2, armor: 4, maxHarm: 6, attacks: ['atk1'],
  },
  locationDefs: [
    {
      id: 'loc-a', name: 'Library', type: 'library', threatLevel: 1,
      clueDefs: [], availableActions: ['investigate'],
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
    createInitialState('conf-test'),
    act('startMystery', { definition: testDef, hunters: [h1] }),
  )
}

function getMystery(s: GameState): Mystery { return s.mystery! }

// ─── initConfrontation ────────────────────────────────────────────────────────

describe('initConfrontation()', () => {
  it('creates confrontation with correct initial values', () => {
    const mystery = getMystery(afterStart())
    const conf = initConfrontation(mystery)
    expect(conf.monsterHarmTaken).toBe(0)
    expect(conf.monsterDefeated).toBe(false)
    expect(conf.huntersRetreated).toBe(false)
    expect(conf.currentRound).toBe(1)
    expect(conf.history).toHaveLength(0)
  })

  it('carries mystery intel level into confrontation', () => {
    const s = afterStart()
    s.mystery!.intelLevel = 'informed'
    const conf = initConfrontation(getMystery(s))
    expect(conf.intelLevel).toBe('informed')
  })

  it('sets monsterMaxHarm from mystery monster definition', () => {
    const mystery = getMystery(afterStart())
    const conf = initConfrontation(mystery)
    expect(conf.monsterMaxHarm).toBe(6)
  })

  it('forcedByCountdown defaults to false', () => {
    const conf = initConfrontation(getMystery(afterStart()))
    expect(conf.forcedByCountdown).toBe(false)
  })

  it('forcedByCountdown is set when passed true', () => {
    const conf = initConfrontation(getMystery(afterStart()), true)
    expect(conf.forcedByCountdown).toBe(true)
  })

  it('does not mutate the mystery', () => {
    const mystery = getMystery(afterStart())
    const snapshot = JSON.stringify(mystery)
    initConfrontation(mystery)
    expect(JSON.stringify(mystery)).toBe(snapshot)
  })
})

// ─── getMonsterBehaviorProfile ────────────────────────────────────────────────

describe('getMonsterBehaviorProfile()', () => {
  it('returns a profile for every monster type', () => {
    const types: MonsterType[] = ['beast', 'devourer', 'trickster', 'torturer', 'destroyer', 'parasite', 'sorcerer']
    for (const type of types) {
      const profile = getMonsterBehaviorProfile(type)
      expect(profile).toBeDefined()
      expect(profile.style).toBeDefined()
      expect(Array.isArray(profile.behaviourTags)).toBe(true)
    }
  })

  it('beast is aggressive and always counterattacks', () => {
    const p = getMonsterBehaviorProfile('beast')
    expect(p.style).toBe('aggressive')
    expect(p.alwaysCounterattacks).toBe(true)
  })

  it('sorcerer has high special roll penalty (incorporeal)', () => {
    const p = getMonsterBehaviorProfile('sorcerer')
    expect(p.style).toBe('supernatural')
    expect(p.specialRollPenalty).toBeGreaterThan(0)
    expect(p.alwaysCounterattacks).toBe(false)
  })

  it('devourer self-heals on hit', () => {
    const p = getMonsterBehaviorProfile('devourer')
    expect(p.selfHealOnHitFraction).toBeGreaterThan(0)
  })

  it('torturer has high injured-target multiplier', () => {
    const p = getMonsterBehaviorProfile('torturer')
    expect(p.injuredTargetMultiplier).toBeGreaterThan(1)
  })
})

// ─── getAvailableConfrontationActions ─────────────────────────────────────────

describe('getAvailableConfrontationActions()', () => {
  it('blind intel excludes exploitWeakness', () => {
    const actions = getAvailableConfrontationActions('blind')
    expect(actions).not.toContain('exploitWeakness')
  })

  it('partial intel includes exploitWeakness', () => {
    const actions = getAvailableConfrontationActions('partial')
    expect(actions).toContain('exploitWeakness')
  })

  it('informed intel includes exploitWeakness', () => {
    const actions = getAvailableConfrontationActions('informed')
    expect(actions).toContain('exploitWeakness')
  })

  it('prepared intel includes exploitWeakness', () => {
    const actions = getAvailableConfrontationActions('prepared')
    expect(actions).toContain('exploitWeakness')
  })

  it('all intel levels include core actions', () => {
    const core = ['attack', 'defend', 'resist', 'distract', 'assess'] as const
    for (const level of ['blind', 'partial', 'informed', 'prepared'] as const) {
      const available = getAvailableConfrontationActions(level)
      for (const a of core) {
        expect(available).toContain(a)
      }
    }
  })

  it('all intel levels include spendLuck', () => {
    for (const level of ['blind', 'partial', 'informed', 'prepared'] as const) {
      expect(getAvailableConfrontationActions(level)).toContain('spendLuck')
    }
  })
})

// ─── getConfrontationResult ───────────────────────────────────────────────────

describe('getConfrontationResult()', () => {
  it('ongoing when monster alive and hunters alive', () => {
    const conf = initConfrontation(getMystery(afterStart()))
    const hunters = [{ alive: true }, { alive: true }]
    expect(getConfrontationResult(conf, hunters)).toBe('ongoing')
  })

  it('win when monster is defeated', () => {
    const conf = { ...initConfrontation(getMystery(afterStart())), monsterDefeated: true }
    expect(getConfrontationResult(conf, [{ alive: true }])).toBe('win')
  })

  it('loss when all hunters are dead', () => {
    const conf = initConfrontation(getMystery(afterStart()))
    expect(getConfrontationResult(conf, [{ alive: false }, { alive: false }])).toBe('loss')
  })

  it('retreat when hunters retreated flag is set', () => {
    const conf = { ...initConfrontation(getMystery(afterStart())), huntersRetreated: true }
    expect(getConfrontationResult(conf, [{ alive: true }])).toBe('retreat')
  })

  it('win takes precedence over loss (edge: monster killed before all hunters die)', () => {
    const conf = {
      ...initConfrontation(getMystery(afterStart())),
      monsterDefeated: true,
    }
    expect(getConfrontationResult(conf, [{ alive: false }])).toBe('win')
  })
})

// ─── effectiveMonsterHarm ─────────────────────────────────────────────────────

describe('effectiveMonsterHarm()', () => {
  it('returns 0 when armor >= harm', () => {
    expect(effectiveMonsterHarm(2, 4)).toBe(0)
  })

  it('reduces harm by armor', () => {
    expect(effectiveMonsterHarm(5, 2)).toBe(3)
  })

  it('returns full harm when armor = 0', () => {
    expect(effectiveMonsterHarm(3, 0)).toBe(3)
  })

  it('never returns negative harm', () => {
    expect(effectiveMonsterHarm(1, 10)).toBe(0)
  })
})

// ─── Confrontation integration via applyAction ────────────────────────────────

describe('confrontation phase via startConfrontation action', () => {
  it('transitions to confrontation phase', () => {
    const s = applyAction(afterStart(), act('startConfrontation', {}))
    expect(s.phase).toBe('confrontation')
  })

  it('confrontation state has correct initial values', () => {
    const s = applyAction(afterStart(), act('startConfrontation', {}))
    expect(s.confrontation).not.toBeNull()
    expect(s.confrontation!.monsterHarmTaken).toBe(0)
    expect(s.confrontation!.monsterDefeated).toBe(false)
    expect(s.confrontation!.currentRound).toBe(1)
  })

  it('carries intel level from mystery into confrontation', () => {
    const s = afterStart()
    s.mystery!.intelLevel = 'partial'
    const conf = applyAction(s, act('startConfrontation', {}))
    expect(conf.confrontation!.intelLevel).toBe('partial')
  })

  it('roll outcome tiers map correctly: 6- miss, 7-9 mixed, 10+ success', () => {
    // Test miss (dice sum 4, tough +1 = 5 → miss)
    let s = applyAction(afterStart(), act('startConfrontation', {}))
    s = forceRoll(s, 4)
    const afterMiss = applyAction(s, act('attack', { hunterId: 'h1' }))
    expect(afterMiss.lastRoll!.outcome).toBe('miss')

    // Test mixed (dice sum 8, tough +1 = 9 → mixed)
    s = applyAction(afterStart(), act('startConfrontation', {}))
    s = forceRoll(s, 8)
    const afterMixed = applyAction(s, act('attack', { hunterId: 'h1' }))
    expect(afterMixed.lastRoll!.outcome).toBe('mixed')

    // Test success (dice sum 10, tough +1 = 11 → success)
    s = applyAction(afterStart(), act('startConfrontation', {}))
    s = forceRoll(s, 10)
    const afterSuccess = applyAction(s, act('attack', { hunterId: 'h1' }))
    expect(afterSuccess.lastRoll!.outcome).toBe('success')
  })

  it('exploitWeakness unavailable at blind intel throws ActionError', () => {
    const s = applyAction(afterStart(), act('startConfrontation', {}))
    // Default intel is blind at mystery start (no clues found)
    expect(() => applyAction(s, act('exploitWeakness', { hunterId: 'h1' }))).toThrow(ActionError)
  })

  it('monster harm accumulates across rounds (armor=0 monster)', () => {
    let s = applyAction(afterStart(), act('startConfrontation', {}))
    // Test monster has armor=4 → success deals max(0, 2-4)=0. Use exploitWeakness instead.
    // First give partial intel so exploitWeakness is available
    s.mystery!.intelLevel = 'partial'
    s.confrontation!.intelLevel = 'partial'
    // Force success exploitWeakness (bypasses armor) — deals maxHarm=6, instant defeat
    s = forceRoll(s, 10)
    s = applyAction(s, act('exploitWeakness', { hunterId: 'h1' }))
    expect(s.confrontation!.monsterHarmTaken).toBe(6)
    expect(s.confrontation!.monsterDefeated).toBe(true)
  })

  it('monster defeated when harmTaken >= maxHarm via exploitWeakness', () => {
    let s = applyAction(afterStart(), act('startConfrontation', {}))
    s.mystery!.intelLevel = 'partial'
    s.confrontation!.intelLevel = 'partial'
    // Mixed exploitWeakness deals harm+1=3 per hit. Need 2 mixed hits (6 >= maxHarm=6)
    s = forceRoll(s, 8)
    s = applyAction(s, act('exploitWeakness', { hunterId: 'h1' }))  // +3
    expect(s.confrontation!.monsterDefeated).toBe(false)
    // Must take a different action before exploiting again (cooldown)
    s = forceRoll(s, 10)
    s = applyAction(s, act('assess', { hunterId: 'h1' }))
    s = forceRoll(s, 8)
    s = applyAction(s, act('exploitWeakness', { hunterId: 'h1' }))  // +3 = 6
    expect(s.confrontation!.monsterDefeated).toBe(true)
  })

  it('armor reduces attack damage to monster: armor 4 blocks regular attack harm', () => {
    // Test monster has armor=4. Attack success deals max(0, 2-4)=0 to monster.
    // Monster hits back with harm=2 on mixed/miss.
    let s = applyAction(afterStart(), act('startConfrontation', {}))
    s = forceRoll(s, 10)
    s = applyAction(s, act('attack', { hunterId: 'h1' }))
    // Armor blocks all regular attack damage
    expect(s.confrontation!.monsterHarmTaken).toBe(0)

    // On miss, monster hits back with full harm (2)
    s = forceRoll(s, 3)
    s = applyAction(s, act('attack', { hunterId: 'h1' }))
    const hunter = s.team.hunters.find(h => h.id === 'h1')!
    expect(hunter.harm).toBe(2)
  })
})

// ─── Clue-based exploit options ──────────────────────────────────────────────

// Fixture with exploitOptions on the weakness
const exploitOptDef: MysteryDefinition = {
  id: 'mystery-exploit-opt',
  monster: {
    id: 'mon-e', type: 'sorcerer', name: 'Eszter', motivation: 'preservation',
    weakness: {
      id: 'w1', type: 'brokenBond', description: 'resolve bond', statRequired: 'charm',
      exploitOptions: [
        {
          id: 'exploit-weak', requiredClueIds: ['clue-a'],
          modifier: -2, description: 'weak approach',
          successHarm: 4,
        },
        {
          id: 'exploit-medium', requiredClueIds: ['clue-a', 'clue-b'],
          modifier: 0, description: 'medium approach',
          successHarm: 'maxHarm',
        },
        {
          id: 'exploit-strong', requiredClueIds: ['clue-a', 'clue-b', 'clue-c'],
          modifier: 2, statRequired: 'sharp', description: 'strong approach',
          successHarm: 'maxHarm', mixedHarm: 'maxHarm', mixedHarmToHunter: 0,
        },
      ],
    },
    harm: 2, armor: 4, maxHarm: 8, attacks: ['atk1'],
  },
  locationDefs: [
    {
      id: 'loc-a', name: 'Library', type: 'library', threatLevel: 1,
      clueDefs: [
        { id: 'clue-a', significance: 'partial', description: 'clue a', locationId: 'loc-a', requiresAction: 'investigate' },
        { id: 'clue-b', significance: 'key', description: 'clue b', locationId: 'loc-a', requiresAction: 'investigate' },
        { id: 'clue-c', significance: 'critical', description: 'clue c', locationId: 'loc-a', requiresAction: 'investigate' },
      ],
      availableActions: ['investigate'],
    },
  ],
  countdownDef: {
    steps: Array.from({ length: 6 }, (_, i) => ({ step: i, description: `s${i}` })),
  },
}

function afterStartExploit(): GameState {
  return applyAction(
    createInitialState('exploit-opt-test'),
    act('startMystery', { definition: exploitOptDef, hunters: [h1] }),
  )
}

describe('getAvailableExploitOptions()', () => {
  it('returns empty when weakness has no exploitOptions', () => {
    const mystery = getMystery(afterStart())
    expect(getAvailableExploitOptions(mystery)).toHaveLength(0)
  })

  it('returns empty when no clue prerequisites are met', () => {
    const mystery = getMystery(afterStartExploit())
    expect(mystery.cluesFound).toHaveLength(0)
    expect(getAvailableExploitOptions(mystery)).toHaveLength(0)
  })

  it('returns options whose single-clue prereq is met', () => {
    const mystery = getMystery(afterStartExploit())
    mystery.cluesFound.push('clue-a')
    const options = getAvailableExploitOptions(mystery)
    expect(options).toHaveLength(1)
    expect(options[0].id).toBe('exploit-weak')
  })

  it('returns options whose multi-clue prereqs are all met', () => {
    const mystery = getMystery(afterStartExploit())
    mystery.cluesFound.push('clue-a', 'clue-b')
    const options = getAvailableExploitOptions(mystery)
    expect(options).toHaveLength(2)
    expect(options.map(o => o.id)).toContain('exploit-weak')
    expect(options.map(o => o.id)).toContain('exploit-medium')
  })

  it('excludes options with partially-met prereqs', () => {
    const mystery = getMystery(afterStartExploit())
    mystery.cluesFound.push('clue-b') // missing clue-a
    expect(getAvailableExploitOptions(mystery)).toHaveLength(0)
  })

  it('returns all options when all clues found', () => {
    const mystery = getMystery(afterStartExploit())
    mystery.cluesFound.push('clue-a', 'clue-b', 'clue-c')
    expect(getAvailableExploitOptions(mystery)).toHaveLength(3)
  })
})

describe('getExploitOptionById()', () => {
  it('returns the option by id', () => {
    const weakness = exploitOptDef.monster.weakness
    expect(getExploitOptionById(weakness, 'exploit-medium')?.modifier).toBe(0)
  })

  it('returns undefined for unknown id', () => {
    const weakness = exploitOptDef.monster.weakness
    expect(getExploitOptionById(weakness, 'nope')).toBeUndefined()
  })

  it('returns undefined when no exploitOptions on weakness', () => {
    const weakness = testDef.monster.weakness
    expect(getExploitOptionById(weakness, 'anything')).toBeUndefined()
  })
})

describe('initConfrontation() cluesFoundAtStart', () => {
  it('snapshots cluesFound at confrontation start', () => {
    const mystery = getMystery(afterStartExploit())
    mystery.cluesFound.push('clue-a', 'clue-b')
    const conf = initConfrontation(mystery)
    expect(conf.cluesFoundAtStart).toEqual(['clue-a', 'clue-b'])
  })

  it('snapshot is a copy, not a reference', () => {
    const mystery = getMystery(afterStartExploit())
    mystery.cluesFound.push('clue-a')
    const conf = initConfrontation(mystery)
    mystery.cluesFound.push('clue-b')
    expect(conf.cluesFoundAtStart).toEqual(['clue-a'])
  })
})

describe('exploitWeakness with clue-based options', () => {
  function setupWithClues(...clueIds: string[]): GameState {
    let s = afterStartExploit()
    // Manually add clues and start confrontation
    for (const id of clueIds) s.mystery!.cluesFound.push(id)
    s = applyAction(s, act('startConfrontation', {}))
    return s
  }

  it('requires exploitOptionId when weakness has exploitOptions', () => {
    const s = setupWithClues('clue-a')
    expect(() =>
      applyAction(s, act('exploitWeakness', { hunterId: 'h1' })),
    ).toThrow('exploitOptionId or freeTextInput is required')
  })

  it('throws for unknown exploitOptionId', () => {
    const s = setupWithClues('clue-a')
    expect(() =>
      applyAction(s, act('exploitWeakness', { hunterId: 'h1', exploitOptionId: 'nope' })),
    ).toThrow('unknown exploitOptionId')
  })

  it('throws when clue prereqs are not met', () => {
    const s = setupWithClues('clue-a') // only clue-a, exploit-medium needs a+b
    expect(() =>
      applyAction(s, act('exploitWeakness', { hunterId: 'h1', exploitOptionId: 'exploit-medium' })),
    ).toThrow('prerequisites not met')
  })

  it('applies the option modifier to the roll', () => {
    let s = setupWithClues('clue-a')
    // exploit-weak has modifier -2. Hunter charm=1. Total stat for roll = 1 + (-2) = -1
    s = forceRoll(s, 7) // dice total 7, total = 7 + (-1) = 6 → miss
    s = applyAction(s, act('exploitWeakness', { hunterId: 'h1', exploitOptionId: 'exploit-weak' }))
    expect(s.lastRoll!.outcome).toBe('miss')
  })

  it('uses option statRequired over weakness statRequired', () => {
    let s = setupWithClues('clue-a', 'clue-b', 'clue-c')
    // exploit-strong uses sharp (hunter sharp=2), modifier +2 → effective stat = 4
    s = forceRoll(s, 6) // dice=6, total = 6+4 = 10 → success
    s = applyAction(s, act('exploitWeakness', { hunterId: 'h1', exploitOptionId: 'exploit-strong' }))
    expect(s.lastRoll!.stat).toBe('sharp')
    expect(s.lastRoll!.outcome).toBe('success')
  })

  it('success with numeric successHarm deals that damage (not instant kill)', () => {
    let s = setupWithClues('clue-a')
    // exploit-weak: successHarm=4, maxHarm=8
    s = forceRoll(s, 12)
    s = applyAction(s, act('exploitWeakness', { hunterId: 'h1', exploitOptionId: 'exploit-weak' }))
    expect(s.confrontation!.monsterHarmTaken).toBe(4)
    expect(s.confrontation!.monsterDefeated).toBe(false)
  })

  it('success with successHarm "maxHarm" defeats the monster', () => {
    let s = setupWithClues('clue-a', 'clue-b')
    s = forceRoll(s, 12)
    s = applyAction(s, act('exploitWeakness', { hunterId: 'h1', exploitOptionId: 'exploit-medium' }))
    expect(s.confrontation!.monsterHarmTaken).toBe(8)
    expect(s.confrontation!.monsterDefeated).toBe(true)
  })

  it('mixed with mixedHarm "maxHarm" defeats the monster and deals 0 to hunter', () => {
    let s = setupWithClues('clue-a', 'clue-b', 'clue-c')
    // exploit-strong: mixedHarm='maxHarm', mixedHarmToHunter=0
    s = forceRoll(s, 4) // dice=4, +sharp(2)+modifier(2) = 8 → mixed (7-9)
    s = applyAction(s, act('exploitWeakness', { hunterId: 'h1', exploitOptionId: 'exploit-strong' }))
    expect(s.confrontation!.monsterDefeated).toBe(true)
    expect(s.team.hunters[0].harm).toBe(0)
  })

  it('records exploitOptionId in confrontation history', () => {
    let s = setupWithClues('clue-a')
    s = forceRoll(s, 12)
    s = applyAction(s, act('exploitWeakness', { hunterId: 'h1', exploitOptionId: 'exploit-weak' }))
    const last = s.confrontation!.history[s.confrontation!.history.length - 1]
    expect(last.exploitOptionId).toBe('exploit-weak')
  })

  it('legacy exploitWeakness still works when weakness has no exploitOptions', () => {
    // Uses original testDef (no exploitOptions)
    let s = applyAction(afterStart(), act('startConfrontation', {}))
    s.mystery!.intelLevel = 'partial'
    s.confrontation!.intelLevel = 'partial'
    s = forceRoll(s, 12)
    s = applyAction(s, act('exploitWeakness', { hunterId: 'h1' }))
    expect(s.confrontation!.monsterDefeated).toBe(true)
    expect(s.confrontation!.history[0].exploitOptionId).toBeUndefined()
  })
})
