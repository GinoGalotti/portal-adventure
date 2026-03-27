import type { ClueDef, ClueMatch } from '../types'
import { normalizeWord } from './tokenizer'

/**
 * Normalize a clue's keyword list once for matching.
 * Keywords in mystery JSON should already be lowercase, but we normalize
 * them through the same pipeline as player input for consistency.
 */
function normalizeClueKeywords(keywords: string[]): string[] {
  const result: string[] = []
  for (const kw of keywords) {
    const normalized = normalizeWord(kw)
    if (normalized) result.push(normalized)
  }
  return result
}

/**
 * Match player tokens against the keywords of a single clue.
 * Returns a ClueMatch if any keywords overlap, null otherwise.
 */
function matchClue(tokens: Set<string>, clue: ClueDef): ClueMatch | null {
  if (!clue.keywords || clue.keywords.length === 0) return null

  const normalized = normalizeClueKeywords(clue.keywords)
  const matched: string[] = []

  for (const kw of normalized) {
    if (tokens.has(kw)) matched.push(kw)
  }

  if (matched.length === 0) return null

  return {
    clueId: clue.id,
    matchedKeywords: matched,
    score: matched.length / normalized.length,
  }
}

/**
 * Match player tokens against all collected clues.
 * Only clues that have been found (present in foundClueIds) are checked.
 * Returns matches sorted by score descending.
 */
export function matchClues(
  tokens: string[],
  allClues: ClueDef[],
  foundClueIds: string[],
): ClueMatch[] {
  const tokenSet = new Set(tokens)
  const foundSet = new Set(foundClueIds)
  const matches: ClueMatch[] = []

  for (const clue of allClues) {
    if (!foundSet.has(clue.id)) continue
    const match = matchClue(tokenSet, clue)
    if (match) matches.push(match)
  }

  return matches.sort((a, b) => b.score - a.score)
}
