/**
 * Free-text keyword engine — Layer 0.
 *
 * Entry point: `interpretAction(input, clues, foundClueIds, weakness, monsterHarm)`
 * Returns a full ActionInterpretation with stat, modifier, matched clues, exploit, and narrative.
 *
 * Pure function — no I/O, no randomness, no side effects.
 * Safe to call in tests, simulation, and the UI.
 */

import type {
  ClueDef,
  Weakness,
  StatName,
  ActionInterpretation,
} from '../types'
import { tokenize } from './tokenizer'
import { matchClues } from './clue-matcher'
import { classifyStat } from './stat-classifier'
import { resolveExploit } from './exploit-resolver'

export interface InterpretActionInput {
  /** Raw player text */
  input: string
  /** All clue definitions for this mystery */
  allClues: ClueDef[]
  /** IDs of clues the player has found so far */
  foundClueIds: string[]
  /** Entity's weakness definition (may include freeTextExploits) */
  weakness: Weakness
  /** Entity's base harm (used for fallback harm tiers) */
  monsterHarm: number
  /**
   * Optional: override the stat classification with the active hunter's best stat
   * when classification confidence is 'weak'. This is player-friendly — we don't
   * punish vague input by forcing the worst stat.
   */
  hunterBestStat?: StatName
}

/**
 * Interpret a player's free-text confrontation input through the keyword pipeline.
 *
 * Pipeline: tokenize → match clues → classify stat → resolve exploit → return interpretation
 */
export function interpretAction(opts: InterpretActionInput): ActionInterpretation {
  const { input, allClues, foundClueIds, weakness, monsterHarm, hunterBestStat } = opts

  // Stage 1: Tokenize & normalize
  const tokens = tokenize(input)

  // Stage 2: Match against collected clues
  const matchedClues = matchClues(tokens, allClues, foundClueIds)

  // Stage 3: Classify stat
  const { stat: rawStat, confidence, votes } = classifyStat(tokens)
  // Player-friendly fallback: if confidence is weak and hunter has a clear best stat, prefer that
  const stat: StatName = confidence === 'weak' && hunterBestStat ? hunterBestStat : rawStat

  // Stage 4: Resolve exploit (best match or fallback tier)
  const resolution = resolveExploit(tokens, matchedClues, foundClueIds, weakness, monsterHarm)

  // Debug info attached for transcripts (stripped in production telemetry)
  void votes  // referenced to avoid unused-var lint warning

  return {
    rawInput: input,
    tokens,
    matchedClues,
    stat,
    statConfidence: confidence,
    modifier: resolution.modifier,
    exploitId: resolution.exploitId,
    weaknessAlignment: resolution.weaknessAlignment,
    successHarm: resolution.successHarm,
    narrativeResult: resolution.narrativeResult,
    source: 'keyword',
  }
}

// Re-export individual stages for testing and simulation
export { tokenize } from './tokenizer'
export { matchClues } from './clue-matcher'
export { classifyStat } from './stat-classifier'
export { resolveExploit } from './exploit-resolver'
