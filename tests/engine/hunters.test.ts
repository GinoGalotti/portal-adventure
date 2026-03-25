import { describe, it, expect } from 'vitest'
import {
  createHunter,
  createHunterFromStats,
  applyHarm,
  setHarm,
  healHarm,
  spendLuck,
  setLuck,
  gainExperience,
  canAdvance,
  consumeSceneAction,
  resetSceneActions,
  consumeAssistCharge,
  canDeploy,
  hasSceneAction,
  hasAssistCharge,
} from '../../src/engine/hunters'
import type { Playbook, Hunter } from '../../src/engine/types'

// ─── Test fixtures ────────────────────────────────────────────────────────────

const testPlaybook: Playbook = {
  id: 'the-investigator',
  name: 'playbook.investigator.name',
  description: 'playbook.investigator.desc',
  baseStats: { charm: 1, cool: 0, sharp: 2, tough: 0, weird: -1 },
  signatureMoves: [
    {
      id: 'move-forensics',
      name: 'move.forensics.name',
      description: 'move.forensics.desc',
      statUsed: 'sharp',
      cost: 'scene_action',
    },
  ],
  gearOptions: [
    [
      { id: 'gear-badge', name: 'gear.badge' },
      { id: 'gear-camera', name: 'gear.camera' },
    ],
  ],
  vulnerability: 'playbook.investigator.vulnerability',
  bondCapacity: 3,
}

function makeHunter(overrides: Partial<Hunter> = {}): Hunter {
  return createHunterFromStats({
    id: 'h1',
    name: 'Rosa Quintero',
    playbookId: 'the-investigator',
    stats: { charm: 1, cool: 0, sharp: 2, tough: 0, weird: -1 },
    ...overrides,
  })
}

// ─── createHunter ─────────────────────────────────────────────────────────────

describe('createHunter()', () => {
  it('creates a hunter with the playbook base stats', () => {
    const h = createHunter(testPlaybook, 'h1', 'Rosa')
    expect(h.stats).toEqual(testPlaybook.baseStats)
  })

  it('starts at harm 0, luck 7, experience 0', () => {
    const h = createHunter(testPlaybook, 'h1', 'Rosa')
    expect(h.harm).toBe(0)
    expect(h.luck).toBe(7)
    expect(h.experience).toBe(0)
  })

  it('starts alive with healthy condition', () => {
    const h = createHunter(testPlaybook, 'h1', 'Rosa')
    expect(h.alive).toBe(true)
    expect(h.conditions).toContain('healthy')
  })

  it('sets bondCapacity from playbook', () => {
    const h = createHunter(testPlaybook, 'h1', 'Rosa')
    expect(h.assistChargesRemaining).toBe(testPlaybook.bondCapacity)
  })

  it('picks gear from option groups', () => {
    const h = createHunter(testPlaybook, 'h1', 'Rosa', [0])
    expect(h.gear).toContain('gear-badge')
  })

  it('picks second gear option when index is 1', () => {
    const h = createHunter(testPlaybook, 'h1', 'Rosa', [1])
    expect(h.gear).toContain('gear-camera')
  })
})

// ─── Harm thresholds ──────────────────────────────────────────────────────────

describe('Harm thresholds', () => {
  it('harm 0–3 → healthy', () => {
    for (let h = 0; h <= 3; h++) {
      const hunter = setHarm(makeHunter(), h)
      expect(hunter.conditions).toContain('healthy')
      expect(hunter.alive).toBe(true)
    }
  })

  it('harm 4 → injured', () => {
    const hunter = setHarm(makeHunter(), 4)
    expect(hunter.conditions).toContain('injured')
    expect(hunter.alive).toBe(true)
  })

  it('harm 5 → injured', () => {
    const hunter = setHarm(makeHunter(), 5)
    expect(hunter.conditions).toContain('injured')
    expect(hunter.alive).toBe(true)
  })

  it('harm 6 → seriouslyInjured', () => {
    const hunter = setHarm(makeHunter(), 6)
    expect(hunter.conditions).toContain('seriouslyInjured')
    expect(hunter.alive).toBe(true)
  })

  it('harm 7 → dead', () => {
    const hunter = setHarm(makeHunter(), 7)
    expect(hunter.conditions).toContain('dead')
    expect(hunter.alive).toBe(false)
  })

  it('applyHarm accumulates correctly', () => {
    let hunter = makeHunter()
    hunter = applyHarm(hunter, 3) // harm = 3, healthy
    expect(hunter.conditions).toContain('healthy')
    hunter = applyHarm(hunter, 1) // harm = 4, injured
    expect(hunter.conditions).toContain('injured')
    hunter = applyHarm(hunter, 2) // harm = 6, seriouslyInjured
    expect(hunter.conditions).toContain('seriouslyInjured')
    hunter = applyHarm(hunter, 1) // harm = 7, dead
    expect(hunter.conditions).toContain('dead')
    expect(hunter.alive).toBe(false)
  })

  it('dead hunters do not take more harm', () => {
    let hunter = setHarm(makeHunter(), 7) // dead
    hunter = applyHarm(hunter, 5) // should not change
    expect(hunter.harm).toBe(7)
  })

  it('harm cannot exceed 7', () => {
    const hunter = setHarm(makeHunter(), 10) // clamped to 7
    expect(hunter.harm).toBe(7)
  })

  it('harm cannot go below 0', () => {
    const hunter = setHarm(makeHunter(), -3)
    expect(hunter.harm).toBe(0)
  })

  it('healHarm reduces harm', () => {
    const injured = setHarm(makeHunter(), 5)
    const healed = healHarm(injured, 2)
    expect(healed.harm).toBe(3)
    expect(healed.conditions).toContain('healthy')
  })

  it('healHarm does not reduce harm below 0', () => {
    const healed = healHarm(makeHunter(), 10)
    expect(healed.harm).toBe(0)
  })
})

// ─── Luck spending ────────────────────────────────────────────────────────────

describe('Luck spending', () => {
  it('spendLuck decrements luck and returns success: true', () => {
    const hunter = makeHunter()
    const { hunter: updated, success } = spendLuck(hunter)
    expect(success).toBe(true)
    expect(updated.luck).toBe(6)
  })

  it('luck at 0 cannot be spent', () => {
    const hunter = setLuck(makeHunter(), 0)
    const { hunter: updated, success } = spendLuck(hunter)
    expect(success).toBe(false)
    expect(updated.luck).toBe(0)
  })

  it('spendLuck does not mutate the original hunter', () => {
    const hunter = makeHunter()
    const originalLuck = hunter.luck
    spendLuck(hunter)
    expect(hunter.luck).toBe(originalLuck)
  })

  it('spending all luck reaches 0', () => {
    let hunter = makeHunter() // luck = 7
    for (let i = 0; i < 7; i++) {
      const result = spendLuck(hunter)
      expect(result.success).toBe(true)
      hunter = result.hunter
    }
    expect(hunter.luck).toBe(0)
    // Next spend fails
    const { success } = spendLuck(hunter)
    expect(success).toBe(false)
  })

  it('setLuck clamps to [0, maxLuck]', () => {
    const h = makeHunter()
    expect(setLuck(h, -1).luck).toBe(0)
    expect(setLuck(h, 100).luck).toBe(h.maxLuck)
    expect(setLuck(h, 3).luck).toBe(3)
  })
})

// ─── Experience ───────────────────────────────────────────────────────────────

describe('Experience from failed rolls', () => {
  it('gainExperience increments by 1 by default', () => {
    const hunter = makeHunter()
    expect(gainExperience(hunter).experience).toBe(1)
  })

  it('gainExperience increments by custom amount', () => {
    const hunter = makeHunter()
    expect(gainExperience(hunter, 3).experience).toBe(3)
  })

  it('canAdvance is false below threshold', () => {
    const hunter = makeHunter() // experience = 0, threshold = 5
    expect(canAdvance(hunter)).toBe(false)
  })

  it('canAdvance is true at threshold', () => {
    let hunter = makeHunter()
    for (let i = 0; i < 5; i++) hunter = gainExperience(hunter)
    expect(canAdvance(hunter)).toBe(true)
  })

  it('gainExperience does not mutate original hunter', () => {
    const hunter = makeHunter()
    gainExperience(hunter, 5)
    expect(hunter.experience).toBe(0)
  })
})

// ─── Action economy ───────────────────────────────────────────────────────────

describe('Action economy', () => {
  it('consumeSceneAction decrements sceneActionsRemaining', () => {
    const h = makeHunter()
    const updated = consumeSceneAction(h)
    expect(updated.sceneActionsRemaining).toBe(h.sceneActionsRemaining - 1)
  })

  it('consumeSceneAction throws when no actions remain', () => {
    const h = { ...makeHunter(), sceneActionsRemaining: 0 }
    expect(() => consumeSceneAction(h)).toThrow()
  })

  it('resetSceneActions restores to max', () => {
    const depleted = { ...makeHunter(), sceneActionsRemaining: 0 }
    const reset = resetSceneActions(depleted)
    expect(reset.sceneActionsRemaining).toBe(reset.maxSceneActions)
  })

  it('consumeAssistCharge decrements and reports success', () => {
    const h = { ...makeHunter(), assistChargesRemaining: 2 }
    const { hunter, success } = consumeAssistCharge(h)
    expect(success).toBe(true)
    expect(hunter.assistChargesRemaining).toBe(1)
  })

  it('consumeAssistCharge at 0 returns success: false', () => {
    const h = { ...makeHunter(), assistChargesRemaining: 0 }
    const { success } = consumeAssistCharge(h)
    expect(success).toBe(false)
  })
})

// ─── Deployability ────────────────────────────────────────────────────────────

describe('canDeploy()', () => {
  it('healthy hunter can deploy', () => {
    expect(canDeploy(makeHunter())).toBe(true)
  })

  it('dead hunter cannot deploy', () => {
    expect(canDeploy(setHarm(makeHunter(), 7))).toBe(false)
  })

  it('traumatized hunter cannot deploy', () => {
    const h: Hunter = { ...makeHunter(), conditions: ['traumatized'] }
    expect(canDeploy(h)).toBe(false)
  })

  it('seriously injured hunter cannot deploy', () => {
    expect(canDeploy(setHarm(makeHunter(), 6))).toBe(false)
  })

  it('injured hunter CAN deploy (risky but allowed)', () => {
    expect(canDeploy(setHarm(makeHunter(), 4))).toBe(true)
  })
})

describe('hasSceneAction() / hasAssistCharge()', () => {
  it('hasSceneAction true when actions > 0 and alive', () => {
    expect(hasSceneAction(makeHunter())).toBe(true)
  })

  it('hasSceneAction false when depleted', () => {
    expect(hasSceneAction({ ...makeHunter(), sceneActionsRemaining: 0 })).toBe(false)
  })

  it('hasSceneAction false when dead', () => {
    expect(hasSceneAction(setHarm(makeHunter(), 7))).toBe(false)
  })

  it('hasAssistCharge true when charges > 0', () => {
    expect(hasAssistCharge(makeHunter())).toBe(true)
  })

  it('hasAssistCharge false when 0', () => {
    expect(hasAssistCharge({ ...makeHunter(), assistChargesRemaining: 0 })).toBe(false)
  })
})
