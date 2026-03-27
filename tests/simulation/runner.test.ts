import { describe, it, expect } from 'vitest'
import { runSimulation } from '../../simulation/runner'
import { createStrategy, RandomStrategy, GreedyCluesStrategy, BalancedStrategy } from '../../simulation/strategies'
import type { MysteryDefinition } from '../../src/engine/types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const testDef: MysteryDefinition = {
  id: 'mystery-runner-test',
  monster: {
    id: 'mon-1', type: 'sorcerer', name: 'Eszter', motivation: 'preservation',
    weakness: { id: 'w1', type: 'brokenBond', description: 'bond', statRequired: 'charm' },
    harm: 2, armor: 0, maxHarm: 4, attacks: ['atk'],
  },
  locationDefs: [
    {
      id: 'loc-a', name: 'Library', type: 'library', threatLevel: 1,
      clueDefs: [
        { id: 'clue-1', significance: 'partial', description: 'c1',
          locationId: 'loc-a', requiresAction: 'investigate' },
        { id: 'clue-2', significance: 'key', description: 'c2',
          locationId: 'loc-a', requiresAction: 'interview' },
      ],
      availableActions: ['investigate', 'interview'],
      adjacentLocationIds: ['loc-b'],
    },
    {
      id: 'loc-b', name: 'Scene', type: 'crimeScene', threatLevel: 2,
      clueDefs: [
        { id: 'clue-3', significance: 'key', description: 'c3',
          locationId: 'loc-b', requiresAction: 'investigate' },
      ],
      availableActions: ['investigate'],
      adjacentLocationIds: ['loc-a'],
    },
  ],
  countdownDef: {
    steps: Array.from({ length: 6 }, (_, i) => ({ step: i, description: `s${i}` })),
    clockConfig: { confrontationAt: 5, disasterAt: 25 },
  },
}

const hunters = [
  {
    id: 'h1', name: 'Rosa', playbookId: 'expert',
    stats: { charm: -1, cool: 1, sharp: 2, tough: 1, weird: 0 },
    luck: 7, bondCapacity: 3,
  },
  {
    id: 'h2', name: 'Mack', playbookId: 'mundane',
    stats: { charm: 2, cool: 1, sharp: 0, tough: 1, weird: -1 },
    luck: 7, bondCapacity: 4,
  },
]

// ─── Basic Completion ─────────────────────────────────────────────────────────

describe('runSimulation() — basic completion', () => {
  it('completes without throwing (random strategy)', () => {
    expect(() => runSimulation({
      mysteryDef: testDef,
      hunters,
      strategy: new RandomStrategy(),
      seed: 'test-seed-1',
    })).not.toThrow()
  })

  it('returns a RunResult with all required fields', () => {
    const result = runSimulation({
      mysteryDef: testDef,
      hunters,
      strategy: new RandomStrategy(),
      seed: 'test-seed-2',
    })
    expect(result.seed).toBe('test-seed-2')
    expect(result.mysteryId).toBe(testDef.id)
    expect(result.strategyName).toBe('random')
    expect(result.pre).toBeDefined()
    expect(result.post).toBeDefined()
    expect(result.actionLog).toBeInstanceOf(Array)
    expect(result.actionLog.length).toBeGreaterThan(0)
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('post.outcome is always win, loss, or retreat', () => {
    for (let i = 0; i < 5; i++) {
      const result = runSimulation({
        mysteryDef: testDef,
        hunters,
        strategy: new RandomStrategy(),
        seed: `outcome-test-${i}`,
      })
      expect(['win', 'loss', 'retreat']).toContain(result.post.outcome)
    }
  })
})

// ─── Pre-Confrontation Snapshot ───────────────────────────────────────────────

describe('runSimulation() — pre-confrontation snapshot', () => {
  it('pre snapshot has correct hunter count', () => {
    const result = runSimulation({
      mysteryDef: testDef,
      hunters,
      strategy: new GreedyCluesStrategy(),
      seed: 'pre-snap-1',
    })
    expect(result.pre.hunterStates.length).toBe(2)
    expect(result.pre.hunterStates[0].id).toBe('h1')
    expect(result.pre.hunterStates[1].id).toBe('h2')
  })

  it('pre snapshot cluesAvailable matches total clues in mystery', () => {
    const result = runSimulation({
      mysteryDef: testDef,
      hunters,
      strategy: new GreedyCluesStrategy(),
      seed: 'pre-snap-2',
    })
    // testDef has 3 clues across 2 locations
    expect(result.pre.cluesAvailable).toBe(3)
  })

  it('pre snapshot locationsAvailable matches mystery locations', () => {
    const result = runSimulation({
      mysteryDef: testDef,
      hunters,
      strategy: new RandomStrategy(),
      seed: 'pre-snap-3',
    })
    expect(result.pre.locationsAvailable).toBe(2)
  })

  it('pre snapshot staminaMax = 4 + number of hunters', () => {
    const result = runSimulation({
      mysteryDef: testDef,
      hunters,
      strategy: new RandomStrategy(),
      seed: 'pre-snap-4',
    })
    // 4 + 2 hunters = 6
    expect(result.pre.staminaMax).toBe(6)
  })

  it('pre intelLevel is valid', () => {
    const result = runSimulation({
      mysteryDef: testDef,
      hunters,
      strategy: new RandomStrategy(),
      seed: 'pre-snap-5',
    })
    expect(['blind', 'partial', 'informed', 'prepared']).toContain(result.pre.intelLevel)
  })
})

// ─── Post-Confrontation Snapshot ─────────────────────────────────────────────

describe('runSimulation() — post-confrontation snapshot', () => {
  it('post snapshot has correct hunter count', () => {
    const result = runSimulation({
      mysteryDef: testDef,
      hunters,
      strategy: new BalancedStrategy(),
      seed: 'post-snap-1',
    })
    expect(result.post.hunterStates.length).toBe(2)
  })

  it('post.monsterMaxHarm matches mystery definition', () => {
    const result = runSimulation({
      mysteryDef: testDef,
      hunters,
      strategy: new BalancedStrategy(),
      seed: 'post-snap-2',
    })
    expect(result.post.monsterMaxHarm).toBe(testDef.monster.maxHarm)
  })

  it('win result has monsterHarmDealt >= monsterMaxHarm', () => {
    // Run many seeds to find a win
    let found = false
    for (let i = 0; i < 30 && !found; i++) {
      const result = runSimulation({
        mysteryDef: testDef,
        hunters,
        strategy: new GreedyCluesStrategy(),
        seed: `win-check-${i}`,
      })
      if (result.post.outcome === 'win') {
        expect(result.post.monsterHarmDealt).toBeGreaterThanOrEqual(result.post.monsterMaxHarm)
        found = true
      }
    }
  })

  it('post hunter luckSpent is non-negative', () => {
    const result = runSimulation({
      mysteryDef: testDef,
      hunters,
      strategy: new BalancedStrategy(),
      seed: 'post-snap-3',
    })
    for (const h of result.post.hunterStates) {
      expect(h.luckSpent).toBeGreaterThanOrEqual(0)
    }
  })
})

// ─── Action Log ───────────────────────────────────────────────────────────────

describe('runSimulation() — action log', () => {
  it('action log starts with startMystery', () => {
    const result = runSimulation({
      mysteryDef: testDef,
      hunters,
      strategy: new RandomStrategy(),
      seed: 'log-1',
    })
    expect(result.actionLog[0].type).toBe('startMystery')
  })

  it('action log ends with endMystery', () => {
    const result = runSimulation({
      mysteryDef: testDef,
      hunters,
      strategy: new RandomStrategy(),
      seed: 'log-2',
    })
    const last = result.actionLog[result.actionLog.length - 1]
    expect(last.type).toBe('endMystery')
  })

  it('action log contains startConfrontation exactly once', () => {
    const result = runSimulation({
      mysteryDef: testDef,
      hunters,
      strategy: new BalancedStrategy(),
      seed: 'log-3',
    })
    const count = result.actionLog.filter((a) => a.type === 'startConfrontation').length
    expect(count).toBe(1)
  })

  it('action log is deterministic for same seed + strategy', () => {
    const config = {
      mysteryDef: testDef,
      hunters,
      strategy: new GreedyCluesStrategy(),
      seed: 'determinism-test',
    }
    const r1 = runSimulation(config)
    const r2 = runSimulation({ ...config, strategy: new GreedyCluesStrategy() })
    // Same outcome
    expect(r1.post.outcome).toBe(r2.post.outcome)
    expect(r1.pre.cluesFound.length).toBe(r2.pre.cluesFound.length)
    expect(r1.actionLog.length).toBe(r2.actionLog.length)
  })
})

// ─── Strategy Registry ────────────────────────────────────────────────────────

describe('createStrategy()', () => {
  it('creates all named strategies', () => {
    for (const name of ['random', 'greedy', 'rush', 'balanced']) {
      expect(() => createStrategy(name)).not.toThrow()
      expect(createStrategy(name).name).toBe(name)
    }
  })

  it('throws for unknown strategy name', () => {
    expect(() => createStrategy('unknown')).toThrow()
  })
})

// ─── All Strategies Smoke Test ────────────────────────────────────────────────

describe('all strategies complete mystery-runner-test', () => {
  for (const stratName of ['random', 'greedy', 'rush', 'balanced']) {
    it(`${stratName} strategy completes without error`, () => {
      const strategy = createStrategy(stratName)
      expect(() => runSimulation({
        mysteryDef: testDef,
        hunters,
        strategy,
        seed: `smoke-${stratName}`,
      })).not.toThrow()
    })
  }
})
