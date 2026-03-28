/**
 * Mystery registry — maps mystery IDs to their JSON definitions and
 * narrative modules. Used by BriefingScreen (selector) and
 * InvestigationScreen (dynamic narrative loading).
 *
 * Mysteries without a hand-authored narrative layer get an auto-generated
 * fallback from their JSON data (location names as ambiance, no scene
 * prose, no NPC dialogue). This lets new mysteries be playable immediately
 * while narrative layers are authored incrementally.
 */

import type { MysteryDefinition } from '../engine/types'
import type { LocationNarrative, SceneElement, NpcDialogue } from './narrative/mystery-001'

// Re-export narrative types so consumers don't need to import from mystery-001
export type { LocationNarrative, SceneElement, SceneElementResponse, SceneSegment, DialogueOption, NpcDialogue } from './narrative/mystery-001'

// ─── JSON Definitions ────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import m001Raw from '../../data/mysteries/mystery-001.json'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import m002Raw from '../../data/mysteries/mystery-002.json'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import m003Raw from '../../data/mysteries/mystery-003.json'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import m004Raw from '../../data/mysteries/mystery-004.json'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import m005Raw from '../../data/mysteries/mystery-005.json'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import m006Raw from '../../data/mysteries/mystery-006.json'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import m007Raw from '../../data/mysteries/mystery-007.json'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import m008Raw from '../../data/mysteries/mystery-008.json'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import m009Raw from '../../data/mysteries/mystery-009.json'

// ─── Narrative Modules ───────────────────────────────────────────────────────

import * as narrative001 from './narrative/mystery-001'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MysteryMeta {
  id: string
  title: string
  briefingText: string
  /** Monster type label for the selector card */
  monsterType: string
  /** Primary weakness stat */
  weaknessStat: string
  /** Short tone description */
  tone: string
}

export interface MysteryEntry {
  meta: MysteryMeta
  definition: MysteryDefinition
  /** Map layout for ASCII mini-map */
  mapRows: string[]
  /** Map token → location ID mapping */
  mapTokens: Record<string, string>
  /** Get narrative for a location (null = no narrative authored yet) */
  getNarrativeForLocation: (locationId: string) => LocationNarrative | null
  /** Get NPC by ID within a narrative */
  getNpcById: (narrative: LocationNarrative, npcId: string) => NpcDialogue | null
}

// ─── Fallback Narrative Generator ────────────────────────────────────────────

/**
 * Generates a minimal narrative from the JSON definition so mysteries
 * without hand-authored narrative layers are still playable.
 */
function makeFallbackEntry(
  raw: Record<string, unknown>,
): Pick<MysteryEntry, 'mapRows' | 'mapTokens' | 'getNarrativeForLocation' | 'getNpcById'> {
  const def = raw as unknown as MysteryDefinition & { title: string }
  const locs = def.locationDefs

  // Generate map tokens from location names (take first 3 chars uppercase)
  const tokens: Record<string, string> = {}
  const tokenLabels: string[] = []
  for (const loc of locs) {
    // Extract a short label: first word after any "— " separator, max 3 chars
    const parts = loc.name.split('—')
    const shortName = (parts[parts.length - 1] || parts[0]).trim().slice(0, 3).toUpperCase()
    const token = `[${shortName}]`
    tokens[token] = loc.id
    tokenLabels.push(token)
  }

  // Simple horizontal map layout
  const mapRows = [tokenLabels.join('───')]

  // Generate minimal LocationNarrative per location
  const narratives: LocationNarrative[] = locs.map((loc) => {
    // Create scene elements from clues + available actions
    const elements: SceneElement[] = []
    for (const clue of loc.clueDefs) {
      elements.push({
        id: `el-${clue.id}`,
        label: clue.description.split('.')[0] + '.',
        actionType: clue.requiresAction as SceneElement['actionType'],
        requiresStamina: clue.requiresAction === 'deepSearch',
        response: clue.description,
      })
    }

    return {
      locationId: loc.id,
      ambiance: loc.name,
      scene: [{ type: 'text' as const, content: `You arrive at ${loc.name}. Look around for leads.` }],
      elements,
      npcs: [],
    }
  })

  return {
    mapRows,
    mapTokens: tokens,
    getNarrativeForLocation: (locationId: string) =>
      narratives.find((n) => n.locationId === locationId) ?? null,
    getNpcById: (_narrative: LocationNarrative, _npcId: string) => null,
  }
}

// ─── Extract Meta ────────────────────────────────────────────────────────────

function extractMeta(raw: Record<string, unknown>): MysteryMeta {
  const def = raw as unknown as MysteryDefinition & {
    title: string
    briefingText: string
    _story_notes?: { tone?: string }
  }
  return {
    id: def.id,
    title: def.title,
    briefingText: def.briefingText,
    monsterType: def.monster.type,
    weaknessStat: def.monster.weakness.statRequired ?? 'tough',
    tone: def._story_notes?.tone?.split('.')[0] ?? '',
  }
}

// ─── Registry ────────────────────────────────────────────────────────────────

const MYSTERY_ENTRIES: MysteryEntry[] = [
  // mystery-001: hand-authored narrative
  {
    meta: extractMeta(m001Raw as Record<string, unknown>),
    definition: m001Raw as unknown as MysteryDefinition,
    mapRows: narrative001.MAP_ROWS,
    mapTokens: narrative001.MAP_TOKENS,
    getNarrativeForLocation: narrative001.getNarrativeForLocation,
    getNpcById: narrative001.getNpcById,
  },
  // mystery-002 through mystery-009: fallback narratives (to be replaced with hand-authored layers)
  ...[m002Raw, m003Raw, m004Raw, m005Raw, m006Raw, m007Raw, m008Raw, m009Raw].map((raw) => {
    const r = raw as Record<string, unknown>
    const fallback = makeFallbackEntry(r)
    return {
      meta: extractMeta(r),
      definition: r as unknown as MysteryDefinition,
      ...fallback,
    }
  }),
]

// ─── Public API ──────────────────────────────────────────────────────────────

/** All available mysteries, ordered by ID */
export const ALL_MYSTERIES: readonly MysteryEntry[] = MYSTERY_ENTRIES

/** Get a mystery entry by ID */
export function getMysteryById(id: string): MysteryEntry | undefined {
  return MYSTERY_ENTRIES.find((e) => e.meta.id === id)
}

/** Get mystery entry for a running game state (by mystery.id) */
export function getMysteryForState(mysteryId: string): MysteryEntry | undefined {
  return getMysteryById(mysteryId)
}
