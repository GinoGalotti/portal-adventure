import { SYNONYM_MAP } from './synonyms'

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'it',
  'its', 'this', 'that', 'these', 'those', 'i', 'we', 'you', 'he',
  'she', 'they', 'my', 'our', 'your', 'his', 'her', 'their', 'then',
  'if', 'so', 'not', 'no', 'up', 'out', 'him', 'them', 'what', 'how',
])

// Simple suffix stemmer: strips common English inflection endings.
// Not a full stemmer — just enough to normalize game input.
function stem(word: string): string {
  if (word.length <= 4) return word
  if (word.endsWith('ing')) return word.slice(0, -3)
  if (word.endsWith('tion')) return word.slice(0, -4)
  if (word.endsWith('ness')) return word.slice(0, -4)
  if (word.endsWith('ment')) return word.slice(0, -4)
  if (word.endsWith('tion')) return word.slice(0, -4)
  if (word.endsWith('ed') && word.length > 5) return word.slice(0, -2)
  if (word.endsWith('ly') && word.length > 5) return word.slice(0, -2)
  if (word.endsWith('er') && word.length > 5) return word.slice(0, -2)
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 4) return word.slice(0, -1)
  return word
}

/**
 * Normalize a single word: lowercase → strip punctuation → stem → synonym expand.
 * Returns the canonical form, or null if it's a stop word or too short.
 */
export function normalizeWord(raw: string): string | null {
  const lower = raw.toLowerCase().replace(/[^a-z0-9''-]/g, '')
  if (!lower || lower.length < 2) return null
  if (STOP_WORDS.has(lower)) return null

  const stemmed = stem(lower)

  // Synonym expand: check both original and stemmed
  return SYNONYM_MAP.get(lower) ?? SYNONYM_MAP.get(stemmed) ?? stemmed
}

/**
 * Tokenize player free text into a deduplicated set of normalized tokens.
 * Order is preserved for the first occurrence; duplicates are removed.
 */
export function tokenize(input: string): string[] {
  const words = input.split(/[\s,;:.!?()\[\]{}'"]+/)
  const seen = new Set<string>()
  const tokens: string[] = []
  for (const word of words) {
    const normalized = normalizeWord(word)
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized)
      tokens.push(normalized)
    }
  }
  return tokens
}
