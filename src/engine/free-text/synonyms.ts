/**
 * Global synonym groups for the free-text keyword engine.
 * Each group normalizes to its first member (the canonical form).
 * Add game-specific terms here as new mysteries introduce new vocabulary.
 */

export const SYNONYM_GROUPS: readonly string[][] = [
  // ── Approach verbs → maps to stat classification ──────────────────────────
  // CHARM: persuade / comfort
  ['convince', 'persuade', 'talk', 'speak', 'comfort', 'reason', 'plead', 'negotiate', 'befriend', 'soothe', 'reassure', 'appeal', 'implore', 'coax', 'appeal'],
  // COOL: protect / endure
  ['protect', 'shield', 'guard', 'defend', 'save', 'cover', 'endure', 'brace', 'steady', 'hold', 'stand', 'anchor'],
  // TOUGH: fight / force
  ['attack', 'fight', 'hit', 'punch', 'strike', 'slash', 'shoot', 'tackle', 'force', 'overpower', 'wrestle', 'charge', 'rush', 'smash', 'beat', 'destroy', 'break', 'shatter'],
  // SHARP: investigate / outmaneuver
  ['analyze', 'deduce', 'study', 'observe', 'figure', 'examine', 'outsmart', 'trick', 'outmaneuver', 'identify', 'investigate', 'notice', 'spot', 'determine', 'assess', 'read'],
  // WEIRD: supernatural / ritual
  ['ritual', 'banish', 'channel', 'invoke', 'exorcise', 'cast', 'summon', 'chant', 'sense', 'supernatural', 'psychic', 'energy', 'aura', 'spirit', 'ward', 'sigil'],
  // COOL (movement / avoidance)
  ['flee', 'run', 'escape', 'retreat', 'dodge', 'evade', 'hide', 'avoid', 'wait', 'calm'],

  // ── Common action verbs ───────────────────────────────────────────────────
  ['use', 'employ', 'wield', 'apply', 'utilize'],
  ['show', 'reveal', 'display', 'present', 'hold', 'lift', 'raise'],
  ['call', 'shout', 'yell', 'cry', 'whisper', 'say', 'tell', 'ask'],
  ['grab', 'take', 'snatch', 'seize', 'pick', 'collect', 'gather'],
  ['disable', 'jam', 'destroy', 'sabotage', 'break', 'disable', 'shutdown', 'turn off', 'cut'],
  ['trap', 'lure', 'bait', 'snare', 'contain', 'bind', 'restrain', 'capture'],

  // ── Emotional / thematic concepts ────────────────────────────────────────
  ['grief', 'grieve', 'grieving', 'mourn', 'mourning', 'sadness', 'sad', 'loss', 'sorrow'],
  ['guilt', 'guilty', 'blame', 'fault', 'responsible', 'regret', 'remorse'],
  ['forgive', 'forgiveness', 'pardon', 'absolve', 'release', 'let go', 'move on'],
  ['love', 'loved', 'loving', 'care', 'caring', 'affection', 'bond', 'attachment'],
  ['anger', 'angry', 'rage', 'furious', 'wrath', 'hatred', 'hate'],
  ['fear', 'afraid', 'scared', 'terror', 'panic'],

  // ── Common nouns ──────────────────────────────────────────────────────────
  ['partner', 'companion', 'ally', 'colleague', 'friend'],
  ['memory', 'memories', 'remember', 'recall', 'past'],
  ['name', 'identity', 'self', 'who'],
  ['fire', 'flame', 'burn', 'burning', 'ash', 'smoke', 'heat'],
  ['electronics', 'electric', 'electrical', 'device', 'machine', 'robot', 'wifi', 'signal'],
  ['document', 'record', 'file', 'paper', 'report', 'form', 'enrollment'],
]

/** Flat map from synonym → canonical form (first item in each group) */
export const SYNONYM_MAP: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>()
  for (const group of SYNONYM_GROUPS) {
    const canonical = group[0]
    for (const word of group) {
      map.set(word, canonical)
    }
  }
  return map
})()
