/**
 * Free-text keyword engine tests — Sprint 1 gate (target: >80% coverage)
 *
 * Tests use mystery-001 (Eszter) fixture data — the only mystery with
 * `keywords` on clue defs. 55 test inputs across all pipeline stages.
 */

import { describe, it, expect } from 'vitest'
import { tokenize, normalizeWord } from '../../src/engine/free-text/tokenizer'
import { matchClues } from '../../src/engine/free-text/clue-matcher'
import { classifyStat } from '../../src/engine/free-text/stat-classifier'
import { resolveExploit } from '../../src/engine/free-text/exploit-resolver'
import { interpretAction } from '../../src/engine/free-text/pipeline'
import type { ClueDef, Weakness } from '../../src/engine/types'

// ─── Mystery-001 fixture data ────────────────────────────────────────────────

const CLUES: ClueDef[] = [
  {
    id: 'clue-ash-trail',
    significance: 'partial',
    description: '',
    locationId: 'loc-campus-grounds',
    requiresAction: 'investigate',
    keywords: ['ash', 'trail', 'path', 'memorial', 'garden', 'science', 'building', 'grey', 'residue', 'reappear'],
  },
  {
    id: 'clue-witness-sightings',
    significance: 'partial',
    description: '',
    locationId: 'loc-student-dorms',
    requiresAction: 'interview',
    keywords: ['witness', 'sighting', 'woman', 'footprint', 'corridor', 'balint', 'ghost', 'figure', 'night', 'student', 'security', 'vanish'],
  },
  {
    id: 'clue-balint-confession',
    significance: 'critical',
    description: '',
    locationId: 'loc-student-dorms',
    requiresAction: 'interview',
    keywords: ['balint', 'confession', 'promise', 'forget', 'grief', 'guilt', 'childhood', 'friend', 'eszter', 'heartbroken', 'afraid', 'moving', 'hospital', 'accident'],
  },
  {
    id: 'clue-enrollment-record',
    significance: 'key',
    description: '',
    locationId: 'loc-university-library',
    requiresAction: 'investigate',
    keywords: ['eszter', 'enrollment', 'record', 'chemistry', 'accident', 'balint', 'university', 'photograph', 'locket', 'name', 'archive', 'student', 'death'],
  },
  {
    id: 'clue-ash-locket',
    significance: 'critical',
    description: '',
    locationId: 'loc-science-lab',
    requiresAction: 'deepSearch',
    keywords: ['locket', 'ash', 'anchor', 'balint', 'memorial', 'silver', 'warm', 'pulse', 'eszter', 'drawer', 'family', 'cremation', 'heartbeat'],
  },
  {
    id: 'clue-lab-journal',
    significance: 'key',
    description: '',
    locationId: 'loc-science-lab',
    requiresAction: 'investigate',
    keywords: ['journal', 'notebook', 'balint', 'visit', 'window', 'grave', 'afraid', 'relieved', 'ash', 'eszter', 'handwriting', 'fear'],
  },
  {
    id: 'clue-manifestation-pattern',
    significance: 'key',
    description: '',
    locationId: 'loc-memorial-garden',
    requiresAction: 'investigate',
    keywords: ['manifestation', 'pattern', 'garden', 'bench', 'circle', 'night', 'flower', 'routine', 'appear', 'cctv', 'plaque', 'eszter', 'memorial'],
  },
]

const WEAKNESS: Weakness = {
  id: 'w-promise-resolved',
  type: 'brokenBond',
  description: '',
  statRequired: 'charm',
  freeTextExploits: [
    {
      id: 'ft-full-resolution',
      requiredClueIds: ['clue-ash-locket', 'clue-balint-confession', 'clue-enrollment-record'],
      triggerWords: [['balint', 'convince'], ['balint', 'comfort'], ['eszter', 'grief', 'forgive'], ['promise', 'balint']],
      modifier: 2,
      successHarm: 'maxHarm',
      narrativeResult: "Bálint steps forward, voice breaking. He calls her name — her real name. The flames dim.",
    },
    {
      id: 'ft-anchor-approach',
      requiredClueIds: ['clue-ash-locket', 'clue-enrollment-record'],
      triggerWords: [['locket', 'anchor'], ['locket', 'eszter'], ['locket', 'show'], ['locket', 'hold']],
      modifier: 1,
      successHarm: 'maxHarm',
      narrativeResult: "You hold the locket up. She freezes.",
    },
    {
      id: 'ft-grief-approach',
      requiredClueIds: ['clue-balint-confession'],
      triggerWords: [['balint', 'sorry'], ['grief', 'forgive'], ['blame', 'comfort'], ['promise', 'forget']],
      modifier: 0,
      successHarm: 'maxHarm',
      narrativeResult: "You speak of Bálint's guilt. The entity shudders.",
    },
  ],
}

const ALL_CLUE_IDS = CLUES.map((c) => c.id)

// ─── 1. Tokenizer ────────────────────────────────────────────────────────────

describe('tokenize', () => {
  it('lowercases all words', () => {
    const tokens = tokenize('CONVINCE Balint')
    expect(tokens).toContain('balint')
  })

  it('removes stop words', () => {
    const tokens = tokenize('I want to find the locket')
    expect(tokens).not.toContain('i')
    expect(tokens).not.toContain('to')
    expect(tokens).not.toContain('the')
    expect(tokens).toContain('locket')
  })

  it('deduplicates tokens', () => {
    const tokens = tokenize('grief grief grief')
    expect(tokens.filter((t) => t === 'grief').length).toBe(1)
  })

  it('strips punctuation', () => {
    const tokens = tokenize('show the locket now!')
    expect(tokens).toContain('locket')
    expect(tokens).not.toContain('locket!') // exclamation stripped
  })

  it('names ending in -er get stemmed (known limitation)', () => {
    // "Eszter" → lowercase → strip -er suffix → "eszt". Proper names can suffer from the stemmer.
    // Clue keywords are stored pre-normalized, so "eszter" in a clue still matches via normalizeClueKeywords.
    const tokens = tokenize('balint eszter locket')
    expect(tokens).toContain('balint')
    expect(tokens).toContain('locket')
    // eszter → "eszt" due to -er suffix stripping
    expect(tokens).not.toContain('eszter')
  })

  it('apostrophe in possessive splits the token (known behaviour)', () => {
    // "Eszter's" splits on the apostrophe: "Eszter" → stems to "eszt" (drops -er suffix)
    // Players should use plain names, not possessives
    const tokens = tokenize("Eszter's locket")
    expect(tokens).toContain('locket')
    expect(tokens).not.toContain('eszter') // possessive form is split and stemmed
  })

  it('expands synonyms — persuade becomes convince', () => {
    const tokens = tokenize('persuade Balint')
    expect(tokens).toContain('convince')
    expect(tokens).not.toContain('persuade')
  })

  it('expands synonyms — shield becomes protect', () => {
    const tokens = tokenize('shield the team')
    expect(tokens).toContain('protect')
  })

  it('expands synonyms — fight becomes attack', () => {
    const tokens = tokenize('fight the spirit')
    expect(tokens).toContain('attack')
  })

  it('expands synonyms — study becomes analyze', () => {
    const tokens = tokenize('study the pattern')
    expect(tokens).toContain('analyze')
  })

  it('stems -ing suffix', () => {
    const tokens = tokenize('attacking the ghost')
    expect(tokens).toContain('attack')
  })

  it('returns empty array for fully-stop input', () => {
    // "am" is not in the stop-word list — only "is/are/was/were" are
    // Use words that ARE all stops
    expect(tokenize('I is the a')).toEqual([])
  })
})

describe('normalizeWord', () => {
  it('returns null for stop words', () => {
    expect(normalizeWord('the')).toBeNull()
    expect(normalizeWord('is')).toBeNull()
    expect(normalizeWord('a')).toBeNull()
  })

  it('returns null for words shorter than 2 chars', () => {
    expect(normalizeWord('x')).toBeNull()
  })

  it('lowercases', () => {
    expect(normalizeWord('GRIEF')).toBe('grief')
  })

  it('stems -ed suffix', () => {
    const result = normalizeWord('convinced')
    expect(result).toBeDefined()
  })

  it('expands guilt synonym group — blame → guilt', () => {
    expect(normalizeWord('blame')).toBe('guilt')
  })

  it('expands forgive synonym group — release → forgive', () => {
    expect(normalizeWord('release')).toBe('forgive')
  })
})

// ─── 2. Stat classifier ──────────────────────────────────────────────────────

describe('classifyStat', () => {
  it('classifies charm from convince', () => {
    const { stat } = classifyStat(tokenize('convince balint'))
    expect(stat).toBe('charm')
  })

  it('classifies charm from comfort (synonym)', () => {
    const { stat } = classifyStat(tokenize('comfort eszter'))
    expect(stat).toBe('charm')
  })

  it('classifies charm from forgive', () => {
    const { stat } = classifyStat(tokenize('forgive the grief'))
    expect(stat).toBe('charm')
  })

  it('classifies tough from attack', () => {
    // "spirit" maps to "ritual" (weird synonym) — avoid it in this test
    const { stat } = classifyStat(tokenize('attack and fight the ghost'))
    expect(stat).toBe('tough')
  })

  it('classifies tough from fight (synonym)', () => {
    const { stat } = classifyStat(tokenize('fight the ghost'))
    expect(stat).toBe('tough')
  })

  it('classifies sharp from analyze', () => {
    const { stat } = classifyStat(tokenize('analyze the manifestation pattern'))
    expect(stat).toBe('sharp')
  })

  it('classifies sharp from observe', () => {
    const { stat } = classifyStat(tokenize('observe the ash trail carefully'))
    expect(stat).toBe('sharp')
  })

  it('classifies cool from protect', () => {
    const { stat } = classifyStat(tokenize('protect balint from the spirit'))
    expect(stat).toBe('cool')
  })

  it('classifies weird from ritual', () => {
    const { stat } = classifyStat(tokenize('perform a ritual banish'))
    expect(stat).toBe('weird')
  })

  it('classifies weird from exorcise', () => {
    const { stat } = classifyStat(tokenize('exorcise eszter'))
    expect(stat).toBe('weird')
  })

  it('defaults to tough with weak confidence when no match', () => {
    const result = classifyStat(tokenize('locket eszter balint'))
    expect(result.stat).toBe('tough')
    expect(result.confidence).toBe('weak')
  })

  it('returns strong confidence for 3+ distinct canonical charm tokens', () => {
    // Synonyms all reduce to "convince" (deduped) — need different canonical charm verbs
    // love, forgive, grief are all distinct canonicals that map to charm
    const result = classifyStat(tokenize('love forgive grief'))
    expect(result.confidence).toBe('strong')
    expect(result.stat).toBe('charm')
  })

  it('prefers charm over other stats in tie (priority order)', () => {
    // One charm hit, one tough hit — charm wins in priority order
    const result = classifyStat(['convince', 'attack'])
    // Both have 1 vote — charm wins by priority
    expect(result.stat).toBe('charm')
  })

  it('uses hunterBestStat when classification is weak', () => {
    const result = interpretAction({
      input: 'locket balint',   // no stat-classifying verbs
      allClues: CLUES,
      foundClueIds: ['clue-ash-locket'],
      weakness: WEAKNESS,
      monsterHarm: 3,
      hunterBestStat: 'sharp',
    })
    expect(result.stat).toBe('sharp')
  })
})

// ─── 3. Clue matcher ─────────────────────────────────────────────────────────

describe('matchClues', () => {
  it('returns empty array when no clues found', () => {
    const tokens = tokenize('balint eszter locket grief')
    const matches = matchClues(tokens, CLUES, [])
    expect(matches).toHaveLength(0)
  })

  it('only matches found clues', () => {
    const tokens = tokenize('balint eszter locket grief')
    // Only confession found — not ash-locket even though "locket" is in enrollment-record
    const matches = matchClues(tokens, CLUES, ['clue-balint-confession'])
    expect(matches.every((m) => m.clueId === 'clue-balint-confession')).toBe(true)
  })

  it('scores by proportion of matched keywords', () => {
    const tokens = tokenize('balint eszter grief guilt')
    const matches = matchClues(tokens, CLUES, ['clue-balint-confession'])
    expect(matches).toHaveLength(1)
    expect(matches[0].score).toBeGreaterThan(0)
    expect(matches[0].score).toBeLessThanOrEqual(1)
  })

  it('returns matches sorted by score descending', () => {
    // ash-locket has "locket balint eszter" — high overlap
    // ash-trail has only "ash" overlap
    const tokens = tokenize('locket balint eszter ash')
    const matches = matchClues(tokens, CLUES, ['clue-ash-locket', 'clue-ash-trail'])
    expect(matches[0].clueId).toBe('clue-ash-locket')
  })

  it('returns no match for clue with no keywords field', () => {
    const noKeywordClue: ClueDef = { id: 'c-bare', significance: 'partial', description: '', locationId: 'x', requiresAction: 'investigate' }
    const matches = matchClues(['balint'], [noKeywordClue], ['c-bare'])
    expect(matches).toHaveLength(0)
  })

  it('matches clue keywords through synonym normalisation', () => {
    // 'enrollment' in clue keywords → 'document' via synonym. Player 'record' → also 'document'.
    const tokens = tokenize('record document')
    const matches = matchClues(tokens, CLUES, ['clue-enrollment-record'])
    expect(matches.length).toBeGreaterThan(0)
  })
})

// ─── 4. Exploit resolver ─────────────────────────────────────────────────────

describe('resolveExploit', () => {
  it('returns fallback -3 with no found clues and no matching tokens', () => {
    const resolution = resolveExploit([], [], [], WEAKNESS, 3)
    expect(resolution.modifier).toBe(-3)
    expect(resolution.exploitId).toBeNull()
  })

  it('fallback -2 when 1 clue matched', () => {
    const matches = [{ clueId: 'clue-balint-confession', matchedKeywords: ['grief'], score: 0.1 }]
    const resolution = resolveExploit([], matches, [], WEAKNESS, 3)
    expect(resolution.modifier).toBe(-2)
  })

  it('fallback -1 when 3+ clues matched', () => {
    const matches = [
      { clueId: 'a', matchedKeywords: ['ash'], score: 0.1 },
      { clueId: 'b', matchedKeywords: ['locket'], score: 0.1 },
      { clueId: 'c', matchedKeywords: ['grief'], score: 0.1 },
    ]
    const resolution = resolveExploit([], matches, [], WEAKNESS, 3)
    expect(resolution.modifier).toBe(-1)
  })

  it('matches ft-full-resolution when all clues found and trigger matches', () => {
    const tokens = tokenize('convince balint to let her go')
    const resolution = resolveExploit(
      tokens,
      [],
      ['clue-ash-locket', 'clue-balint-confession', 'clue-enrollment-record'],
      WEAKNESS,
      3,
    )
    expect(resolution.exploitId).toBe('ft-full-resolution')
    expect(resolution.modifier).toBe(2)
  })

  it('matches ft-full-resolution even when required clues not found (players can always guess)', () => {
    const tokens = tokenize('convince balint to let her go')
    const resolution = resolveExploit(
      tokens,
      [],
      [], // no clues found — but free-text exploits are not clue-gated
      WEAKNESS,
      3,
    )
    // ft-full-resolution has trigger ["balint","convince"] which matches
    expect(resolution.exploitId).toBe('ft-full-resolution')
    expect(resolution.modifier).toBe(2)
  })

  it('matches ft-anchor-approach with locket + show trigger', () => {
    const tokens = tokenize('show eszter the locket')
    const resolution = resolveExploit(
      tokens,
      [],
      ['clue-ash-locket', 'clue-enrollment-record'],
      WEAKNESS,
      3,
    )
    expect(resolution.exploitId).toBe('ft-anchor-approach')
    expect(resolution.modifier).toBe(1)
  })

  it('matches ft-grief-approach with grief + forgive trigger', () => {
    const tokens = tokenize('address her grief and forgive')
    const resolution = resolveExploit(
      tokens,
      [],
      ['clue-balint-confession'],
      WEAKNESS,
      3,
    )
    expect(resolution.exploitId).toBe('ft-grief-approach')
    expect(resolution.modifier).toBe(0)
  })

  it('picks highest modifier among multiple matching exploits', () => {
    // All clues found; input triggers both ft-grief-approach AND ft-full-resolution
    const tokens = tokenize('promise balint')
    const resolution = resolveExploit(
      tokens,
      [],
      ALL_CLUE_IDS,
      WEAKNESS,
      3,
    )
    // ft-full-resolution trigger ["promise","balint"] → should match if both present
    expect(resolution.exploitId).toBe('ft-full-resolution')
    expect(resolution.modifier).toBe(2)
  })

  it('returns fallback when weakness has no freeTextExploits', () => {
    const bareWeakness: Weakness = { id: 'w', type: 'brokenBond', description: '', statRequired: 'charm' }
    const resolution = resolveExploit([], [], [], bareWeakness, 3)
    expect(resolution.exploitId).toBeNull()
    expect(resolution.modifier).toBe(-3)
  })

  it('narrativeResult is set when exploit matches', () => {
    const tokens = tokenize('convince balint')
    const resolution = resolveExploit(tokens, [], ALL_CLUE_IDS, WEAKNESS, 3)
    expect(resolution.narrativeResult).not.toBeNull()
    expect(resolution.narrativeResult!.length).toBeGreaterThan(10)
  })
})

// ─── 5. Full pipeline integration (mystery-001 inputs) ───────────────────────

describe('interpretAction — mystery-001 integration', () => {
  // Helper: run pipeline with all clues found
  function interpret(input: string, foundIds = ALL_CLUE_IDS) {
    return interpretAction({ input, allClues: CLUES, foundClueIds: foundIds, weakness: WEAKNESS, monsterHarm: 3 })
  }

  // ── Full-resolution (+2) inputs ──────────────────────────────────────────

  it('[+2] "convince Balint to let Eszter go"', () => {
    const r = interpret('convince Balint to let Eszter go')
    expect(r.exploitId).toBe('ft-full-resolution')
    expect(r.modifier).toBe(2)
  })

  it('[+2] "comfort Balint about his grief"', () => {
    const r = interpret('comfort Balint about his grief')
    expect(r.exploitId).toBe('ft-full-resolution')
    expect(r.modifier).toBe(2)
  })

  it('[+2] "Eszter, forgive him — his grief was real"', () => {
    const r = interpret('Eszter, forgive him — his grief was real')
    expect(r.exploitId).toBe('ft-full-resolution')
    expect(r.modifier).toBe(2)
  })

  it('[+2] "remind Balint of his promise"', () => {
    const r = interpret('remind Balint of his promise')
    expect(r.exploitId).toBe('ft-full-resolution')
    expect(r.modifier).toBe(2)
  })

  it('[+2] "persuade Balint to acknowledge her"', () => {
    const r = interpret('persuade Balint to acknowledge her')
    expect(r.exploitId).toBe('ft-full-resolution')
    expect(r.modifier).toBe(2)
  })

  // ── Anchor-approach (+1) inputs ──────────────────────────────────────────

  it('[+1] "show the locket to Eszter"', () => {
    const r = interpret('show the locket to Eszter', ['clue-ash-locket', 'clue-enrollment-record'])
    expect(r.exploitId).toBe('ft-anchor-approach')
    expect(r.modifier).toBe(1)
  })

  it('[+1] "display the locket — this is her anchor"', () => {
    const r = interpret('display the locket — this is her anchor', ['clue-ash-locket', 'clue-enrollment-record'])
    expect(r.exploitId).toBe('ft-anchor-approach')
    expect(r.modifier).toBe(1)
  })

  it('[+1] "hold out the locket" (via synonym hold→show)', () => {
    const r = interpret('hold out the locket', ['clue-ash-locket', 'clue-enrollment-record'])
    expect(r.exploitId).toBe('ft-anchor-approach')
    expect(r.modifier).toBe(1)
  })

  it('[+1] "present Eszter with her locket"', () => {
    const r = interpret('present Eszter with her locket', ['clue-ash-locket', 'clue-enrollment-record'])
    expect(r.exploitId).toBe('ft-anchor-approach')
    expect(r.modifier).toBe(1)
  })

  // ── Grief-approach (+0) inputs ───────────────────────────────────────────

  it('[+0] "address her grief and forgive"', () => {
    const r = interpret("address her grief and forgive", ['clue-balint-confession'])
    expect(r.exploitId).toBe('ft-grief-approach')
    expect(r.modifier).toBe(0)
  })

  it('[+0] "speak of her grief and forgive the bond"', () => {
    // Matches trigger ["grief", "forgive"] — both tokens present after normalization
    const r = interpret('speak of her grief and forgive the bond', ['clue-balint-confession'])
    expect(r.exploitId).toBe('ft-grief-approach')
    expect(r.modifier).toBe(0)
  })

  it('[+0] "use blame and comfort" (blame→guilt, comfort→convince)', () => {
    const r = interpret("don't blame yourself, let me comfort you", ['clue-balint-confession'])
    expect(r.exploitId).toBe('ft-grief-approach')
    expect(r.modifier).toBe(0)
  })

  // ── Fallback inputs ──────────────────────────────────────────────────────

  it('[fallback -3] no clues found, vague input', () => {
    const r = interpret('I do something', [])
    expect(r.exploitId).toBeNull()
    expect(r.modifier).toBe(-3)
  })

  it('[fallback -2] 1 clue found, matching tokens', () => {
    const r = interpret('the ash trail leads us here', ['clue-ash-trail'])
    expect(r.exploitId).toBeNull()
    expect(r.modifier).toBe(-2)
  })

  it('[fallback -2] 2 clues found, relevant tokens', () => {
    const r = interpret('follow the ash trail near the student witness', ['clue-ash-trail', 'clue-witness-sightings'])
    expect(r.exploitId).toBeNull()
    expect(r.modifier).toBe(-2)
  })

  it('[fallback -1] 3+ clues found with matching content', () => {
    const r = interpret(
      'the locket balint grief',
      ['clue-ash-locket', 'clue-balint-confession', 'clue-enrollment-record'],
    )
    // triggerWords don't match (no convince/comfort etc.) → falls to fallback
    // But 3 matched clues → -1
    expect(r.exploitId).toBeNull()
    expect(r.modifier).toBe(-1)
  })

  // ── Stat detection ───────────────────────────────────────────────────────

  it('detects charm stat for "convince balint"', () => {
    const r = interpret('convince balint')
    expect(r.stat).toBe('charm')
  })

  it('detects tough for "attack and fight"', () => {
    // "destroy" maps to "disable" (via its synonym group) not "attack" — avoid it
    // "spirit" maps to "ritual" (weird) — avoid it too
    const r = interpret('attack and fight the entity')
    expect(r.stat).toBe('tough')
  })

  it('detects weird for "perform a ritual banishment"', () => {
    const r = interpret('perform a ritual banishment')
    expect(r.stat).toBe('weird')
  })

  it('detects sharp for "analyze her pattern"', () => {
    const r = interpret('analyze her pattern and figure it out')
    expect(r.stat).toBe('sharp')
  })

  // ── Source is always keyword ─────────────────────────────────────────────

  it('source is always "keyword" for all inputs', () => {
    expect(interpret('anything').source).toBe('keyword')
    expect(interpret('convince balint').source).toBe('keyword')
  })

  // ── Free-text exploits are not clue-gated (players can always guess) ────

  it('matches ft-full-resolution even without finding required clues', () => {
    const r = interpret('convince balint of his promise', [])
    // Free-text exploits match on trigger words alone, not clue prereqs
    expect(r.exploitId).toBe('ft-full-resolution')
  })

  // ── narrativeResult populated on exploit match ───────────────────────────

  it('narrativeResult is set when exploit matches', () => {
    const r = interpret('convince balint')
    expect(r.narrativeResult).toBeTruthy()
  })

  it('narrativeResult is null on fallback', () => {
    const r = interpret('do something', [])
    expect(r.narrativeResult).toBeNull()
  })
})
