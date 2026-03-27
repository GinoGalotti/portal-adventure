/**
 * Core type definitions for the PORTAL Field Operations game engine.
 * These types are the contract that the entire codebase builds on.
 * The engine is purely functional: all types are plain serializable objects.
 */

// ─── Primitive Enumerations ───────────────────────────────────────────────────

/** The five stats used in 2d6+stat rolls */
export type StatName = 'charm' | 'cool' | 'sharp' | 'tough' | 'weird'

/** Game phases in sequence */
export type GamePhase =
  | 'setup'          // Before mystery starts — no mystery loaded
  | 'briefing'       // Mission briefing displayed, hunters not yet deployed
  | 'investigation'  // Exploring locations, gathering clues
  | 'confrontation'  // Turn-based combat with the monster
  | 'fieldReport'    // Viewing outcome and generated narrative report
  | 'complete'       // Mystery fully resolved and archived

/** Hunter physical and psychological state */
export type HunterCondition =
  | 'healthy'
  | 'injured'            // 4–5 harm: stat penalties on next mystery
  | 'seriouslyInjured'   // 6 harm: out 3+ mysteries, risk of permanent reduction
  | 'critical'           // injured but still deployed — very high risk
  | 'traumatized'        // psychological — locked out for X mysteries
  | 'dead'               // permanent removal from roster

/** Knowledge level about the monster going into confrontation */
export type IntelLevel = 'blind' | 'partial' | 'informed' | 'prepared'

/** How much a clue reveals about the mystery */
export type ClueSignificance = 'partial' | 'key' | 'critical'

/** Location archetypes with distinct encounter tables */
export type LocationType =
  | 'crimeScene'
  | 'witnessHome'
  | 'library'
  | 'monsterLair'
  | 'publicSpace'
  | 'hiddenArea'

/** Monster archetypes — each has distinct behavior and stat profiles */
export type MonsterType =
  | 'beast'
  | 'devourer'
  | 'trickster'
  | 'torturer'
  | 'destroyer'
  | 'parasite'
  | 'sorcerer'

/** What the monster wants — shapes NPC relationships and monster actions */
export type Motivation =
  | 'revenge'
  | 'hunger'
  | 'loneliness'
  | 'chaos'
  | 'territorial'
  | 'domination'
  | 'preservation'

/** How the monster can be defeated */
export type WeaknessType =
  | 'ritual'
  | 'trueName'
  | 'specificWeapon'
  | 'naturalElement'
  | 'brokenBond'
  | 'symbolicDestruction'

/** 2d6+stat roll outcome tiers: 6- miss, 7-9 mixed, 10+ full success */
export type RollOutcome = 'miss' | 'mixed' | 'success'

/** All valid action types in the game */
export type ActionType =
  // Setup / meta
  | 'startMystery'
  // Investigation phase
  | 'travel'
  | 'investigate'
  | 'interview'
  | 'deepSearch'
  | 'fightMinion'
  | 'helpBystander'
  | 'useSpecialMove'
  | 'assist'
  | 'rest'
  | 'startConfrontation'
  // Confrontation phase
  | 'attack'
  | 'defend'
  | 'resist'
  | 'distract'
  | 'assess'
  | 'exploitWeakness'
  // Post-roll
  | 'spendLuck'
  // Resolution
  | 'endMystery'
  // Debug commands (tagged debug: true)
  | 'debug_revealAllClues'
  | 'debug_revealMonster'
  | 'debug_revealMap'
  | 'debug_setIntelLevel'
  | 'debug_setHunterHarm'
  | 'debug_setHunterLuck'
  | 'debug_setCountdown'
  | 'debug_addStamina'
  | 'debug_skipToConfrontation'
  | 'debug_forceRoll'
  | 'debug_killHunter'
  | 'debug_completeCase'
  | 'debug_setSeed'
  | 'debug_unlockAllPlaybooks'
  | 'debug_grantResources'
  | 'debug_loadState'

/** Telemetry event categories — chosen + not-chosen tracked at every decision point */
export type TelemetryEventType =
  | 'action_taken'
  | 'action_not_taken'
  | 'roll'
  | 'clue_found'
  | 'clue_missed'
  | 'location_visited'
  | 'location_skipped'
  | 'confrontation_started'
  | 'luck_spent'
  | 'luck_not_spent'
  | 'harm_taken'
  | 'countdown_advanced'
  | 'mystery_outcome'
  | 'hunter_selection'
  | 'session_timing'

/** Pluggable simulation strategies */
export type SimulationStrategy =
  | 'random'
  | 'greedyClues'
  | 'blindRush'
  | 'balanced'
  | 'exhaustive'
  | 'playbookBiased'
  | 'staminaConservative'

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface PlaybookStats {
  charm: number  // –1 to +3
  cool: number
  sharp: number
  tough: number
  weird: number
}

// ─── Playbook (class definition from data files) ──────────────────────────────

export interface Move {
  id: string
  name: string         // i18n key
  description: string  // i18n key
  statUsed?: StatName
  cost: 'scene_action' | 'stamina' | 'assist_charge' | 'free' | 'special'
  effect?: string      // mechanical descriptor used by engine
}

export interface GearOption {
  id: string
  name: string        // i18n key
  description?: string
}

export interface Playbook {
  id: string
  name: string         // i18n key
  description: string  // i18n key
  baseStats: PlaybookStats
  signatureMoves: Move[]
  gearOptions: GearOption[][]  // player picks one item from each inner array
  vulnerability: string        // i18n key — the playbook's built-in flaw
  bondCapacity: number         // base assist charges available per mystery
  bonusAssistBonds?: string[]  // conditions that grant extra assist charges
}

// ─── Hunter ───────────────────────────────────────────────────────────────────

export interface Bond {
  hunterId: string
  strength: number  // 0–3, grows over shared mysteries
}

export interface Hunter {
  id: string
  name: string
  playbookId: string
  stats: PlaybookStats
  harm: number                  // 0–7 (7 = dead)
  luck: number                  // 0–7, permanent pool — never regenerates
  maxLuck: number               // 7 for all hunters currently
  experience: number
  experienceThreshold: number   // 5 — advance on reaching this
  conditions: HunterCondition[] // can have multiple (e.g. injured + traumatized)
  bonds: Bond[]
  assistChargesRemaining: number // resets each mystery based on bondCapacity
  sceneActionsRemaining: number  // 1–2, resets when team moves to new location
  maxSceneActions: number        // usually 2
  gear: string[]                 // gear item IDs
  alive: boolean
}

// ─── Monster ──────────────────────────────────────────────────────────────────

export interface Weakness {
  id: string
  type: WeaknessType
  description: string  // i18n key
  statRequired?: StatName
  requiresItem?: string
  /** Clue-based exploit options. If present, replaces the legacy intelLevel modifier. */
  exploitOptions?: ExploitOptionDef[]
  /** Free-text exploit definitions for the keyword engine. If present, shows text input in confrontation. */
  freeTextExploits?: FreeTextExploit[]
}

/**
 * A free-text exploit triggered by keyword matching against player input.
 * Ordered best-to-worst; engine walks the list and picks the first match.
 */
export interface FreeTextExploit {
  id: string
  /** Clue IDs that must ALL be found for this exploit to be available */
  requiredClueIds: string[]
  /**
   * OR-groups of AND-keywords. At least one group must be fully present in player tokens.
   * e.g. [["balint","comfort"], ["locket","return"]]  →  either group triggers this exploit.
   */
  triggerWords: string[][]
  /** Roll modifier (-3 to +3) */
  modifier: number
  /** Harm dealt to monster on success: 'maxHarm' = instant defeat, number = flat damage */
  successHarm: 'maxHarm' | number
  /** Short narrative result shown to player after resolution */
  narrativeResult: string
}

/**
 * A specific way to exploit the monster's weakness, unlocked by finding
 * particular clues during investigation. Each option has its own modifier,
 * stat, and damage profile.
 */
export interface ExploitOptionDef {
  id: string
  /** Clue IDs that must ALL be found for this option to be available */
  requiredClueIds: string[]
  /** Roll modifier when using this exploit */
  modifier: number
  /** Override stat for this option (falls back to weakness.statRequired) */
  statRequired?: StatName
  /** Description of the approach (i18n key) */
  description: string
  /** Harm dealt to monster on success: 'maxHarm' = instant defeat, number = flat damage */
  successHarm: 'maxHarm' | number
  /** Harm dealt to monster on mixed. Default: monster.harm + 1 */
  mixedHarm?: 'maxHarm' | number
  /** Harm dealt to acting hunter on mixed. Default: 1 */
  mixedHarmToHunter?: number
}

/**
 * A discrete capability the entity uses during confrontation.
 * The AI GM / keyword engine can disable these via player actions.
 */
export interface EntityCapability {
  id: string
  name: string
  /** Base harm dealt when this capability is used */
  harm: number
  description: string
  /** Player action keywords that disable this capability (for keyword matching) */
  disableConditions: string[]
}

export interface MonsterDef {
  id: string
  type: MonsterType
  name: string        // plain name (hand-authored) or i18n key
  motivation: Motivation
  weakness: Weakness
  harm: number        // harm dealt per successful hit on hunters
  armor: number       // reduces incoming harm
  maxHarm: number     // total harm required to defeat
  attacks: string[]   // i18n keys for attack descriptions used in field report
  specialAbility?: string
  /** Entity capabilities for the AI GM / keyword engine to track and disable */
  capabilities?: EntityCapability[]
}

// ─── Clues ────────────────────────────────────────────────────────────────────

export interface ClueDef {
  id: string
  significance: ClueSignificance
  description: string        // i18n key
  locationId: string
  requiresAction: ActionType // which investigation action reveals this clue
  guardedByMinion?: boolean  // minion must be cleared first
  /**
   * Minimum roll outcome required to discover this clue.
   * - undefined / 'mixed': any non-miss (7+) reveals it
   * - 'success': requires 10+ on the roll
   */
  minRollOutcome?: 'mixed' | 'success'
  /**
   * Lowercase keywords the free-text engine matches against player input.
   * Include: entity names, item names, emotional concepts, setting details.
   */
  keywords?: string[]
}

// ─── Free-text engine ─────────────────────────────────────────────────────────

export type FreeTextStat = StatName

/** How strongly the player's approach aligns with the entity's weakness */
export type WeaknessAlignment = 'direct' | 'partial' | 'tangential' | 'none'

/** Confidence in the stat classification */
export type ClassificationConfidence = 'strong' | 'partial' | 'weak'

/** A clue that was matched in the player's input */
export interface ClueMatch {
  clueId: string
  matchedKeywords: string[]
  /** 0–1: matched keywords / total clue keywords */
  score: number
}

/**
 * Full interpretation of a player's free-text confrontation input.
 * Produced by the keyword pipeline; optionally enhanced by the AI GM.
 */
export interface ActionInterpretation {
  /** Raw player input (for logging / transcripts) */
  rawInput: string
  /** Normalized tokens after stemming + synonym expansion */
  tokens: string[]
  /** Which collected clues the input references */
  matchedClues: ClueMatch[]
  /** Classified stat for the roll */
  stat: StatName
  statConfidence: ClassificationConfidence
  /** Roll modifier: sum of exploit match + clue evidence + move bonus */
  modifier: number
  /** Which FreeTextExploit was matched (null = fallback tier) */
  exploitId: string | null
  weaknessAlignment: WeaknessAlignment
  /** Harm definition for a success roll */
  successHarm: 'maxHarm' | number
  /** Short narrative shown to the player (from matched exploit or generic fallback) */
  narrativeResult: string | null
  /** Whether this came from keyword engine or AI GM */
  source: 'keyword' | 'ai' | 'merged'
}

export interface Clue extends ClueDef {
  found: boolean
  foundBy?: string   // hunterId
  foundAt?: number   // actionCount when found
}

// ─── Locations ────────────────────────────────────────────────────────────────

export interface LocationDef {
  id: string
  name: string              // i18n key
  type: LocationType
  threatLevel: number       // 1–3
  clueDefs: ClueDef[]
  availableActions: ActionType[]
  adjacentLocationIds?: string[]
  startingMinions?: number
  /** If set, this location is only accessible after ALL listed clues are found */
  requiredClueIds?: string[]
}

export interface Location {
  id: string
  name: string
  type: LocationType
  threatLevel: number
  clues: Clue[]
  availableActions: ActionType[]
  adjacentLocationIds: string[]
  visited: boolean
  cleared: boolean          // all threats removed
  minionsPresent: number
  /** If set, this location is only accessible after ALL listed clues are found */
  requiredClueIds: string[]
}

// ─── Clock / Countdown ────────────────────────────────────────────────────────

/**
 * Clock advancement costs for a mystery. Each mystery can specify its own
 * pacing. These values are stored in CountdownState so the engine doesn't
 * need to carry the original MysteryDefinition at runtime.
 */
export interface ClockConfig {
  /** Clock added per scene action taken at a location (default 1) */
  actionCost: number
  /** Clock added per travel action (default 2) */
  travelCost: number
  /** Extra clock added on a miss roll, stacked on top of actionCost (default 1) */
  missPenalty: number
  /** Clock refunded on a 10+ success roll (default 1) */
  successRefund: number
  /**
   * Minimum clock value before startConfrontation is available.
   * Enforced in the UI layer only — the engine does not block it.
   * Default 10.
   */
  confrontationAt: number
  /**
   * Clock value at which disaster triggers (forced confrontation).
   * Engine advances clock and checks; UI handles forced transition.
   * Default 30.
   */
  disasterAt: number
  /**
   * Clock values at which each narrative step (1–5) triggers.
   * Array index 0 = step 1, index 4 = step 5.
   * Defaults: [5, 10, 15, 20, 25]
   */
  stepThresholds: number[]
}

export interface CountdownStep {
  step: number        // 0–5
  description: string // i18n key
  effect?: string     // mechanical effect identifier
}

export interface CountdownDef {
  steps: CountdownStep[]
  /** Optional clock config — if absent, DEFAULT_CLOCK_CONFIG is used. */
  clockConfig?: Partial<ClockConfig>
}

export interface CountdownState {
  currentStep: number    // 0–5 (reaching 6 triggers disaster / forced confrontation)
  clockValue: number     // continuous clock counter — drives step advancement
  clockConfig: ClockConfig  // resolved config (with defaults applied)
  steps: CountdownStep[]
  triggeredAt: number[]  // actionCount values when each step was triggered
}

// ─── Roll Result ──────────────────────────────────────────────────────────────

export interface RollResult {
  hunterId: string
  stat: StatName
  modifier: number
  dice: [number, number]  // individual d6 values
  total: number           // dice[0] + dice[1] + modifier
  outcome: RollOutcome
  luckAvailable: boolean  // was luck > 0 at roll time?
  luckSpent: boolean
  upgraded: boolean       // true if outcome was upgraded by luck
  context: 'investigation' | 'confrontation' | 'special'
  actionType: ActionType
}

// ─── Mystery (runtime state) ──────────────────────────────────────────────────

export interface MysteryDefinition {
  id: string
  monster: MonsterDef
  locationDefs: LocationDef[]
  countdownDef: CountdownDef
}

export interface Mystery {
  id: string
  seed: string
  monster: MonsterDef
  locations: Location[]
  countdown: CountdownState
  intelLevel: IntelLevel
  cluesFound: string[]          // clue IDs in discovery order
  locationsVisited: string[]    // location IDs in visit order
  currentLocationId: string | null
  totalActionsThisLocation: number
  monsterRevealed: boolean      // debug flag
  mapRevealed: boolean          // debug flag
}

// ─── Team ─────────────────────────────────────────────────────────────────────

export interface TeamState {
  hunters: Hunter[]
  staminaPool: number
  maxStamina: number
}

// ─── Confrontation ────────────────────────────────────────────────────────────

export interface ConfrontationAction {
  round: number
  hunterId: string
  actionType: ActionType
  roll?: RollResult
  harmDealtToMonster: number
  harmDealtToHunter: number
  targetHunterId?: string  // for defend / assist actions
  exploitOptionId?: string // which clue-based exploit option was used
  freeTextInput?: string   // raw player text (when free-text path used)
}

export interface ConfrontationState {
  intelLevel: IntelLevel
  history: ConfrontationAction[]
  currentRound: number
  monsterHarmTaken: number
  monsterMaxHarm: number
  monsterDefeated: boolean
  huntersRetreated: boolean
  forcedByCountdown: boolean  // true if countdown hit max and forced this
  cluesFoundAtStart: string[] // snapshot of found clue IDs for exploit option resolution
}

// ─── Field Report ─────────────────────────────────────────────────────────────

export interface HunterMissionReport {
  hunterId: string
  name: string
  playbookId: string
  finalHarm: number
  finalCondition: HunterCondition
  luckRemaining: number
  luckSpent: number
  expGained: number
  rollsSucceeded: number
  rollsMixed: number
  rollsMissed: number
}

export interface FieldReport {
  mysteryId: string
  seed: string
  outcome: 'win' | 'loss' | 'retreat'
  intelLevel: IntelLevel
  hunterReports: HunterMissionReport[]
  cluesFound: number
  cluesAvailable: number
  countdownReached: number
  totalActions: number
  durationMs: number
  narrative?: string   // CAMPBELL-generated (Phase F)
  generatedAt: string  // ISO timestamp
}

// ─── Full Game State ──────────────────────────────────────────────────────────

export interface GameState {
  seed: string
  phase: GamePhase
  team: TeamState
  mystery: Mystery | null
  fieldReport: FieldReport | null
  confrontation: ConfrontationState | null
  lastRoll: RollResult | null         // most recent roll — available for luck spending
  rngState: number                    // current mulberry32 uint32 state
  actionCount: number                 // total actions processed
  mysteryStartTime: number | null     // wall-clock ms when mystery started
  debugMode: boolean
  debugForceRollValue: number | null  // override total of next roll (cleared after use)
}

// ─── Action Entry ─────────────────────────────────────────────────────────────

export interface ActionEntry {
  type: ActionType
  payload: Record<string, unknown>
  timestamp: number  // ms since mystery start (0 for pre-mystery actions)
  debug?: boolean    // must be true on all debug_ action types
}

// ─── Telemetry ────────────────────────────────────────────────────────────────

export interface GameStateContext {
  phase: GamePhase
  cluesFound: number
  countdownStep: number
  intelLevel: IntelLevel
  hunterConditions: Array<{
    id: string
    condition: HunterCondition
    harm: number
    luck: number
  }>
  staminaRemaining: number
}

export interface TelemetryEvent {
  id: string
  userId: string
  mysterySeed: string
  arcId?: string
  caseId?: string
  eventType: TelemetryEventType
  eventData: Record<string, unknown>
  availableOptions: unknown[] | null
  chosenOption: string | null
  context: GameStateContext
  gameTimestamp: number  // ms since mystery start
  wallClock: string      // ISO timestamp
}

// ─── Save Slot ────────────────────────────────────────────────────────────────

export interface ArcProgress {
  arcId: string
  completedCases: string[]
  achievements: string[]
}

export interface SaveSlot {
  id: string
  userId: string
  slotNumber: number    // 1–3
  name: string
  createdAt: string     // ISO timestamp
  updatedAt: string     // ISO timestamp
  seed: string
  actions: ActionEntry[]
  cachedState?: GameState
  arcProgress?: ArcProgress
}

// ─── Simulation ───────────────────────────────────────────────────────────────

export interface SimulationReport {
  seed: string
  mysteryId: string
  strategy: SimulationStrategy
  outcome: 'win' | 'loss' | 'retreat'
  intelLevelAtConfrontation: IntelLevel
  totalActions: number
  cluesFound: number
  cluesAvailable: number
  locationsVisited: number
  locationsAvailable: number
  huntersDeployed: number
  huntersInjured: number
  huntersDead: number
  countdownReached: number
  luckSpent: number
  staminaSpent: number
  roundsInConfrontation: number
  unreachableClues: string[]
  unreachableLocations: string[]
  deadEndStates: number
  actionLog: ActionEntry[]
  durationMs: number
}

// ─── Pure Utility Functions ───────────────────────────────────────────────────

/** Map a 2d6+stat total to a roll outcome tier */
export function getRollOutcome(total: number): RollOutcome {
  if (total >= 10) return 'success'
  if (total >= 7) return 'mixed'
  return 'miss'
}

/** Upgrade a roll outcome by one tier (for luck spending) */
export function upgradeOutcome(outcome: RollOutcome): RollOutcome {
  if (outcome === 'miss') return 'mixed'
  if (outcome === 'mixed') return 'success'
  return 'success'
}

/** Derive the primary HunterCondition from a harm value */
export function conditionFromHarm(harm: number): HunterCondition {
  if (harm >= 7) return 'dead'
  if (harm >= 6) return 'seriouslyInjured'
  if (harm >= 4) return 'injured'
  return 'healthy'
}

/** Derive IntelLevel from number of clues found */
export function intelFromClueCount(count: number): IntelLevel {
  if (count >= 6) return 'prepared'
  if (count >= 4) return 'informed'
  if (count >= 2) return 'partial'
  return 'blind'
}

/** Modifier applied to Exploit Weakness rolls by intel level */
export function exploitModifier(intel: IntelLevel): number {
  switch (intel) {
    case 'blind':    return -99  // action unavailable
    case 'partial':  return -1
    case 'informed': return 0
    case 'prepared': return +1
  }
}
