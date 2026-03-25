/**
 * Seeded deterministic PRNG using the mulberry32 algorithm.
 *
 * INVARIANT: No Math.random() anywhere in game logic — ever.
 * All randomness must flow through this class so that:
 *   - same seed + same action sequence → identical game
 *   - state can be serialised to a uint32 and fully restored
 *   - simulation, replay, and debug all work without side effects
 */

export class GameRNG {
  private state: number

  constructor(seed: string | number) {
    this.state =
      typeof seed === 'string' ? GameRNG.hashString(seed) : seed >>> 0
  }

  /**
   * Convert a string seed to a uint32 using fxhash-style mixing.
   * Deterministic: identical strings always produce the same value.
   */
  private static hashString(seed: string): number {
    let h = 0x811c9dc5 ^ seed.length
    for (let i = 0; i < seed.length; i++) {
      h = Math.imul(h ^ seed.charCodeAt(i), 0x01000193)
    }
    // Final avalanche
    h ^= h >>> 16
    h = Math.imul(h, 0x45d9f3b)
    h ^= h >>> 16
    return h >>> 0
  }

  /**
   * Advance the generator and return a float in [0, 1).
   * Uses the mulberry32 algorithm.
   */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0
    let z = this.state
    z = Math.imul(z ^ (z >>> 15), z | 1)
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61)
    return ((z ^ (z >>> 14)) >>> 0) / 0x100000000
  }

  /**
   * Return an integer in [min, max] inclusive.
   */
  nextInt(min: number, max: number): number {
    if (min > max) throw new RangeError(`nextInt: min (${min}) > max (${max})`)
    return min + Math.floor(this.next() * (max - min + 1))
  }

  /**
   * Roll 2d6 — returns a value in [2, 12].
   * Consumes two RNG calls so the individual dice values can be reconstructed
   * from the state sequence.
   */
  roll2d6(): number {
    return this.nextInt(1, 6) + this.nextInt(1, 6)
  }

  /**
   * Roll 2d6 and return both dice individually.
   */
  roll2d6Detailed(): [number, number] {
    const d1 = this.nextInt(1, 6)
    const d2 = this.nextInt(1, 6)
    return [d1, d2]
  }

  /**
   * Pick a random element from a non-empty array.
   */
  pick<T>(array: readonly T[]): T {
    if (array.length === 0) throw new RangeError('pick: cannot pick from empty array')
    return array[this.nextInt(0, array.length - 1)]
  }

  /**
   * Fisher-Yates shuffle — mutates and returns the given array.
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i)
      const tmp = array[i]
      array[i] = array[j]
      array[j] = tmp
    }
    return array
  }

  // ─── State serialisation (for GameState.rngState) ────────────────────────

  /** Return the raw uint32 state for serialisation into GameState. */
  getState(): number {
    return this.state >>> 0
  }

  /** Restore from a serialised uint32 state. */
  setState(state: number): void {
    this.state = state >>> 0
  }

  /** Return a clone with identical state (useful for snapshots / testing). */
  clone(): GameRNG {
    const copy = new GameRNG(0)
    copy.state = this.state
    return copy
  }
}
