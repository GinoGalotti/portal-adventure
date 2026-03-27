import type { StatName, ClassificationConfidence } from '../types'
import { SYNONYM_MAP } from './synonyms'

/**
 * Maps canonical verb forms (after synonym expansion) to stats.
 * A token can map to multiple stats (via multiple entries) — whichever
 * stat accumulates the most hits from player tokens wins.
 */
const VERB_STAT_MAP: ReadonlyMap<string, StatName> = new Map([
  // CHARM — persuade, comfort, social
  ['convince', 'charm'],
  ['comfort', 'charm'],
  ['appeal', 'charm'],
  ['befriend', 'charm'],
  ['soothe', 'charm'],
  ['reassure', 'charm'],
  ['implore', 'charm'],
  ['coax', 'charm'],
  ['love', 'charm'],
  ['forgive', 'charm'],
  ['grief', 'charm'],      // emotional approach hints charm
  ['guilt', 'charm'],
  ['memory', 'charm'],

  // COOL — protect, endure, steady
  ['protect', 'cool'],
  ['endure', 'cool'],
  ['brace', 'cool'],
  ['steady', 'cool'],
  ['anchor', 'cool'],
  ['calm', 'cool'],
  ['wait', 'cool'],
  ['flee', 'cool'],

  // TOUGH — attack, force, physical
  ['attack', 'tough'],
  ['tackle', 'tough'],
  ['force', 'tough'],
  ['overpower', 'tough'],
  ['charge', 'tough'],
  ['smash', 'tough'],
  ['beat', 'tough'],
  ['destroy', 'tough'],

  // SHARP — observe, analyze, outmaneuver
  ['analyze', 'sharp'],
  ['deduce', 'sharp'],
  ['observe', 'sharp'],
  ['figure', 'sharp'],
  ['outsmart', 'sharp'],
  ['trick', 'sharp'],
  ['outmaneuver', 'sharp'],
  ['identify', 'sharp'],
  ['assess', 'sharp'],
  ['read', 'sharp'],       // "read the situation"

  // WEIRD — supernatural, ritual
  ['ritual', 'weird'],
  ['banish', 'weird'],
  ['channel', 'weird'],
  ['invoke', 'weird'],
  ['exorcise', 'weird'],
  ['cast', 'weird'],
  ['summon', 'weird'],
  ['chant', 'weird'],
  ['sense', 'weird'],
  ['psychic', 'weird'],
  ['energy', 'weird'],
  ['spirit', 'weird'],
  ['ward', 'weird'],
])

export interface StatClassification {
  stat: StatName
  confidence: ClassificationConfidence
  /** Per-stat vote counts for debugging / transcripts */
  votes: Partial<Record<StatName, number>>
}

/**
 * Classify the primary stat for a player's action based on their tokens.
 * Each token is checked against the verb→stat map (after synonym expansion).
 * The stat with the highest vote count wins.
 * Ties broken by priority order: charm → cool → sharp → weird → tough.
 */
export function classifyStat(tokens: string[]): StatClassification {
  const votes: Partial<Record<StatName, number>> = {}

  for (const token of tokens) {
    // Check token directly, then its synonym-expanded form
    const canonical = SYNONYM_MAP.get(token) ?? token
    const stat = VERB_STAT_MAP.get(token) ?? VERB_STAT_MAP.get(canonical)
    if (stat) {
      votes[stat] = (votes[stat] ?? 0) + 1
    }
  }

  const allStats: StatName[] = ['charm', 'cool', 'sharp', 'weird', 'tough']
  const sorted = allStats
    .filter((s) => (votes[s] ?? 0) > 0)
    .sort((a, b) => (votes[b] ?? 0) - (votes[a] ?? 0))

  if (sorted.length === 0) {
    // No verbs matched at all — default to tough (brute force)
    return { stat: 'tough', confidence: 'weak', votes }
  }

  const topVotes = votes[sorted[0]] ?? 0
  const secondVotes = sorted[1] ? (votes[sorted[1]] ?? 0) : 0
  const confidence: ClassificationConfidence =
    topVotes >= 3 ? 'strong'
    : topVotes > secondVotes ? 'partial'
    : 'weak'

  return { stat: sorted[0], confidence, votes }
}
