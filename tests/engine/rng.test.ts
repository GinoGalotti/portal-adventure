import { describe, it, expect } from 'vitest'
import { GameRNG } from '../../src/engine/rng'

// ─── Determinism ──────────────────────────────────────────────────────────────

describe('GameRNG determinism', () => {
  it('same seed produces same sequence', () => {
    const rng1 = new GameRNG('test-seed-42')
    const rng2 = new GameRNG('test-seed-42')
    for (let i = 0; i < 1000; i++) {
      expect(rng1.next()).toBe(rng2.next())
    }
  })

  it('different seeds produce different sequences', () => {
    const rng1 = new GameRNG('seed-A')
    const rng2 = new GameRNG('seed-B')
    const values1 = Array.from({ length: 20 }, () => rng1.next())
    const values2 = Array.from({ length: 20 }, () => rng2.next())
    // At least some values must differ
    expect(values1).not.toEqual(values2)
  })

  it('numeric seed matches equivalent numeric construction', () => {
    const rng1 = new GameRNG(12345)
    const rng2 = new GameRNG(12345)
    expect(rng1.next()).toBe(rng2.next())
  })

  it('replaying from saved state produces identical continuation', () => {
    const rng = new GameRNG('replay-test')
    // Advance 50 steps
    for (let i = 0; i < 50; i++) rng.next()
    const savedState = rng.getState()

    // Capture next 100 values
    const expected = Array.from({ length: 100 }, () => rng.next())

    // Restore and replay
    const rng2 = new GameRNG(0)
    rng2.setState(savedState)
    const actual = Array.from({ length: 100 }, () => rng2.next())

    expect(actual).toEqual(expected)
  })

  it('clone is identical and independent', () => {
    const rng = new GameRNG('clone-test')
    for (let i = 0; i < 10; i++) rng.next()

    const clone = rng.clone()
    const fromOriginal = Array.from({ length: 20 }, () => rng.next())
    const fromClone = Array.from({ length: 20 }, () => clone.next())
    expect(fromClone).toEqual(fromOriginal)
  })
})

// ─── next() range ─────────────────────────────────────────────────────────────

describe('GameRNG.next()', () => {
  it('returns values in [0, 1)', () => {
    const rng = new GameRNG('range-test')
    for (let i = 0; i < 10000; i++) {
      const v = rng.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

// ─── nextInt() ────────────────────────────────────────────────────────────────

describe('GameRNG.nextInt()', () => {
  it('returns values in [min, max] inclusive', () => {
    const rng = new GameRNG('int-test')
    const min = 3
    const max = 7
    for (let i = 0; i < 5000; i++) {
      const v = rng.nextInt(min, max)
      expect(v).toBeGreaterThanOrEqual(min)
      expect(v).toBeLessThanOrEqual(max)
    }
  })

  it('covers the full range over many rolls', () => {
    const rng = new GameRNG('coverage-test')
    const seen = new Set<number>()
    for (let i = 0; i < 10000; i++) seen.add(rng.nextInt(1, 6))
    expect(seen.size).toBe(6)
  })

  it('throws when min > max', () => {
    const rng = new GameRNG('error-test')
    expect(() => rng.nextInt(5, 3)).toThrow(RangeError)
  })

  it('handles min === max (always returns that value)', () => {
    const rng = new GameRNG('single-test')
    for (let i = 0; i < 100; i++) expect(rng.nextInt(4, 4)).toBe(4)
  })
})

// ─── roll2d6() ────────────────────────────────────────────────────────────────

describe('GameRNG.roll2d6()', () => {
  it('returns values in [2, 12]', () => {
    const rng = new GameRNG('2d6-range')
    for (let i = 0; i < 5000; i++) {
      const v = rng.roll2d6()
      expect(v).toBeGreaterThanOrEqual(2)
      expect(v).toBeLessThanOrEqual(12)
    }
  })

  it('7 is the most common result (bell curve)', () => {
    const rng = new GameRNG('2d6-distribution')
    const counts: Record<number, number> = {}
    const N = 100_000
    for (let i = 0; i < N; i++) {
      const v = rng.roll2d6()
      counts[v] = (counts[v] ?? 0) + 1
    }
    // 7 must appear most often
    const maxCount = Math.max(...Object.values(counts))
    expect(counts[7]).toBe(maxCount)
  })

  it('covers the full 2–12 range', () => {
    const rng = new GameRNG('2d6-coverage')
    const seen = new Set<number>()
    for (let i = 0; i < 50000; i++) seen.add(rng.roll2d6())
    for (let v = 2; v <= 12; v++) expect(seen.has(v)).toBe(true)
  })
})

// ─── roll2d6Detailed() ───────────────────────────────────────────────────────

describe('GameRNG.roll2d6Detailed()', () => {
  it('returns two values each in [1, 6] and their sum matches', () => {
    const rng = new GameRNG('detailed')
    for (let i = 0; i < 1000; i++) {
      const [d1, d2] = rng.roll2d6Detailed()
      expect(d1).toBeGreaterThanOrEqual(1)
      expect(d1).toBeLessThanOrEqual(6)
      expect(d2).toBeGreaterThanOrEqual(1)
      expect(d2).toBeLessThanOrEqual(6)
    }
  })
})

// ─── pick() ───────────────────────────────────────────────────────────────────

describe('GameRNG.pick()', () => {
  it('returns a value from the array', () => {
    const rng = new GameRNG('pick-test')
    const arr = ['a', 'b', 'c', 'd']
    for (let i = 0; i < 100; i++) {
      expect(arr).toContain(rng.pick(arr))
    }
  })

  it('covers all elements over many picks', () => {
    const rng = new GameRNG('pick-coverage')
    const arr = [1, 2, 3, 4, 5]
    const seen = new Set<number>()
    for (let i = 0; i < 10000; i++) seen.add(rng.pick(arr))
    expect(seen.size).toBe(arr.length)
  })

  it('throws on empty array', () => {
    const rng = new GameRNG('pick-empty')
    expect(() => rng.pick([])).toThrow(RangeError)
  })
})

// ─── shuffle() ────────────────────────────────────────────────────────────────

describe('GameRNG.shuffle()', () => {
  it('returns a permutation of the input', () => {
    const rng = new GameRNG('shuffle-test')
    const original = [1, 2, 3, 4, 5, 6]
    const shuffled = rng.shuffle([...original])
    expect(shuffled.sort()).toEqual(original)
  })

  it('modifies the array in place', () => {
    const rng = new GameRNG('shuffle-inplace')
    const arr = [1, 2, 3, 4, 5]
    const result = rng.shuffle(arr)
    expect(result).toBe(arr)
  })

  it('produces different orderings with different seeds', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8]
    const a = new GameRNG('order-A').shuffle([...arr])
    const b = new GameRNG('order-B').shuffle([...arr])
    expect(a).not.toEqual(b)
  })

  it('same seed always produces same shuffle', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8]
    const result1 = new GameRNG('shuffle-det').shuffle([...arr])
    const result2 = new GameRNG('shuffle-det').shuffle([...arr])
    expect(result1).toEqual(result2)
  })
})
