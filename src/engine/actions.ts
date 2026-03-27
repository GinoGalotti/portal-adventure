/**
 * Action definitions and the core reducer.
 *
 * applyAction(state, action) → GameState is a pure function.
 * It is the engine's single source of state transitions.
 * All randomness is derived from state.rngState via GameRNG.
 */

import {
  GameState,
  ActionEntry,
  ActionType,
  IntelLevel,
  RollResult,
  Hunter,
  Mystery,
  Location,
  ConfrontationAction,
  MysteryDefinition,
  LocationDef,
  ClueDef,
  Clue,
  CountdownState,
  HunterMissionReport,
  StatName,
  getRollOutcome,
  upgradeOutcome,
  conditionFromHarm,
  exploitModifier,
} from './types'
import { GameRNG } from './rng'
import {
  applyHarm,
  healHarm,
  setHarm,
  setLuck,
  gainExperience,
  resetSceneActions,
} from './hunters'
import { resolveClockConfig, advanceClockForTravel, advanceClockForAction, clockCostForOutcome, tickClock } from './investigation'
import { discoverClue, discoverDeepSearchClue } from './clues'
import { initConfrontation, getExploitOptionById } from './confrontation'
import { interpretAction } from './free-text/pipeline'

// ─── Error Type ───────────────────────────────────────────────────────────────

export class ActionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ActionError'
  }
}

// ─── Validation Helpers ───────────────────────────────────────────────────────

function requirePhase(state: GameState, ...phases: GameState['phase'][]): void {
  if (!phases.includes(state.phase)) {
    throw new ActionError(
      `Expected phase ${phases.join('|')}, got '${state.phase}'`,
    )
  }
}

function requireMystery(state: GameState): Mystery {
  if (!state.mystery) throw new ActionError('No active mystery')
  return state.mystery
}

function requireHunter(state: GameState, hunterId: string): Hunter {
  const h = state.team.hunters.find((x) => x.id === hunterId)
  if (!h) throw new ActionError(`Hunter not found: ${hunterId}`)
  return h
}

function requireLocation(state: GameState, locationId: string): Location {
  const loc = state.mystery?.locations.find((l) => l.id === locationId)
  if (!loc) throw new ActionError(`Location not found: ${locationId}`)
  return loc
}

function requireCurrentLocation(state: GameState): Location {
  const mystery = requireMystery(state)
  if (!mystery.currentLocationId) {
    throw new ActionError('No current location — travel to a location first')
  }
  return requireLocation(state, mystery.currentLocationId)
}

// ─── RNG Roll Helper ──────────────────────────────────────────────────────────

function performRoll(
  state: GameState,
  rng: GameRNG,
  hunterId: string,
  stat: StatName,
  context: RollResult['context'],
  actionType: ActionType,
): RollResult {
  const hunter = requireHunter(state, hunterId)
  const modifier = hunter.stats[stat]

  let d1: number
  let d2: number

  if (state.debugForceRollValue !== null) {
    // Distribute forced total across two dice staying within d6 bounds
    const target = Math.max(2, Math.min(12, state.debugForceRollValue))
    d1 = Math.min(6, Math.max(1, Math.ceil(target / 2)))
    d2 = Math.min(6, Math.max(1, target - d1))
  } else {
    ;[d1, d2] = rng.roll2d6Detailed()
  }

  const total = d1 + d2 + modifier
  const outcome = getRollOutcome(total)

  return {
    hunterId,
    stat,
    modifier,
    dice: [d1, d2],
    total,
    outcome,
    luckAvailable: hunter.luck > 0,
    luckSpent: false,
    upgraded: false,
    context,
    actionType,
  }
}

// ─── Mystery Initialisation Helpers ──────────────────────────────────────────

function initLocation(def: LocationDef): Location {
  return {
    id: def.id,
    name: def.name,
    type: def.type,
    threatLevel: def.threatLevel,
    clues: def.clueDefs.map(
      (cd: ClueDef): Clue => ({ ...cd, found: false }),
    ),
    availableActions: [...def.availableActions],
    adjacentLocationIds: def.adjacentLocationIds ?? [],
    visited: false,
    cleared: false,
    minionsPresent: def.startingMinions ?? 0,
    requiredClueIds: def.requiredClueIds ?? [],
  }
}

function initCountdown(def: MysteryDefinition['countdownDef']): CountdownState {
  return {
    currentStep: 0,
    clockValue: 0,
    clockConfig: resolveClockConfig(def),
    steps: def.steps.map((s) => ({ ...s })),
    triggeredAt: [],
  }
}

// advanceCountdown removed — clock advancement now handled by
// advanceClockForTravel / advanceClockForAction in investigation.ts

// ─── Per-Action Handlers (mutate the already-cloned state in place) ───────────

function handleStartMystery(s: GameState, action: ActionEntry, rng: GameRNG): void {
  requirePhase(s, 'setup')

  const def = action.payload.definition as MysteryDefinition | undefined
  const hunterDefs = action.payload.hunters as Array<{
    id: string
    name: string
    playbookId: string
    stats: {
      charm: number
      cool: number
      sharp: number
      tough: number
      weird: number
    }
    luck?: number
    bondCapacity?: number
    gear?: string[]
  }> | undefined

  if (!def) throw new ActionError('startMystery: payload.definition is required')
  if (!hunterDefs || hunterDefs.length === 0) {
    throw new ActionError('startMystery: payload.hunters must be non-empty')
  }
  if (hunterDefs.length > 4) {
    throw new ActionError('startMystery: cannot deploy more than 4 hunters')
  }

  const hunters: Hunter[] = hunterDefs.map((hd) => ({
    id: hd.id,
    name: hd.name,
    playbookId: hd.playbookId,
    stats: { ...hd.stats },
    harm: 0,
    luck: hd.luck ?? 7,
    maxLuck: 7,
    experience: 0,
    experienceThreshold: 5,
    conditions: ['healthy' as const],
    bonds: [],
    assistChargesRemaining: hd.bondCapacity ?? 3,
    sceneActionsRemaining: 2,
    maxSceneActions: 2,
    gear: hd.gear ?? [],
    alive: true,
  }))

  const maxStamina = 4 + hunters.length
  s.team = { hunters, staminaPool: maxStamina, maxStamina }

  s.mystery = {
    id: def.id,
    seed: s.seed,
    monster: { ...def.monster, weakness: { ...def.monster.weakness } },
    locations: def.locationDefs.map(initLocation),
    countdown: initCountdown(def.countdownDef),
    intelLevel: 'blind',
    cluesFound: [],
    locationsVisited: [],
    currentLocationId: null,
    totalActionsThisLocation: 0,
    monsterRevealed: false,
    mapRevealed: false,
  }

  s.phase = 'investigation'
  s.mysteryStartTime = action.timestamp
  void rng // seed has already been consumed into rngState; no extra roll needed
}

function handleTravel(s: GameState, action: ActionEntry): void {
  requirePhase(s, 'investigation')
  const mystery = requireMystery(s)

  const locationId = action.payload.locationId as string | undefined
  if (!locationId) throw new ActionError('travel: payload.locationId is required')

  const location = requireLocation(s, locationId)
  if (locationId === mystery.currentLocationId) {
    throw new ActionError('travel: already at this location')
  }

  // Check clue-based location gating
  if (location.requiredClueIds.length > 0) {
    const foundClues = new Set(mystery.cluesFound)
    const unmet = location.requiredClueIds.filter((id) => !foundClues.has(id))
    if (unmet.length > 0) {
      throw new ActionError(`travel: location requires clues not yet found: ${unmet.join(', ')}`)
    }
  }

  mystery.currentLocationId = locationId
  mystery.totalActionsThisLocation = 0

  if (!mystery.locationsVisited.includes(locationId)) {
    mystery.locationsVisited.push(locationId)
  }
  location.visited = true

  // Reset scene actions for the whole team
  for (const hunter of s.team.hunters) {
    const reset = resetSceneActions(hunter)
    hunter.sceneActionsRemaining = reset.sceneActionsRemaining
  }

  // Clock advances on every travel (cost = clockConfig.travelCost)
  advanceClockForTravel(s)
}

function handleInvestigate(
  s: GameState,
  action: ActionEntry,
  rng: GameRNG,
): void {
  requirePhase(s, 'investigation')
  const mystery = requireMystery(s)
  const location = requireCurrentLocation(s)

  const hunterId = action.payload.hunterId as string | undefined
  if (!hunterId) throw new ActionError('investigate: payload.hunterId is required')

  const hunterIdx = s.team.hunters.findIndex((h) => h.id === hunterId)
  if (hunterIdx === -1) throw new ActionError(`investigate: hunter not found: ${hunterId}`)
  const hunter = s.team.hunters[hunterIdx]

  if (!hunter.alive) throw new ActionError('investigate: dead hunter cannot act')
  if (hunter.sceneActionsRemaining <= 0) {
    throw new ActionError('investigate: no scene actions remaining')
  }
  if (!location.availableActions.includes('investigate')) {
    throw new ActionError('investigate: not available at this location')
  }

  // Consume scene action
  s.team.hunters[hunterIdx] = { ...hunter, sceneActionsRemaining: hunter.sceneActionsRemaining - 1 }
  mystery.totalActionsThisLocation++

  // Roll 2d6 + Sharp
  const roll = performRoll(s, rng, hunterId, 'sharp', 'investigation', 'investigate')
  s.lastRoll = roll

  // Discover one matching clue (respects minRollOutcome gate)
  discoverClue(mystery, location, 'investigate', roll.outcome, hunterId, s.actionCount)

  // Miss → gain experience (learning from failure)
  if (roll.outcome === 'miss') {
    s.team.hunters[hunterIdx] = gainExperience(s.team.hunters[hunterIdx])
  }

  // Clock advances based on roll outcome
  advanceClockForAction(s, roll.outcome)
}

function handleInterview(
  s: GameState,
  action: ActionEntry,
  rng: GameRNG,
): void {
  requirePhase(s, 'investigation')
  const mystery = requireMystery(s)
  const location = requireCurrentLocation(s)

  const hunterId = action.payload.hunterId as string | undefined
  if (!hunterId) throw new ActionError('interview: payload.hunterId is required')

  const hunterIdx = s.team.hunters.findIndex((h) => h.id === hunterId)
  if (hunterIdx === -1) throw new ActionError(`interview: hunter not found: ${hunterId}`)
  const hunter = s.team.hunters[hunterIdx]

  if (!hunter.alive) throw new ActionError('interview: dead hunter cannot act')
  if (hunter.sceneActionsRemaining <= 0) {
    throw new ActionError('interview: no scene actions remaining')
  }
  if (!location.availableActions.includes('interview')) {
    throw new ActionError('interview: not available at this location')
  }

  s.team.hunters[hunterIdx] = { ...hunter, sceneActionsRemaining: hunter.sceneActionsRemaining - 1 }
  mystery.totalActionsThisLocation++

  const roll = performRoll(s, rng, hunterId, 'charm', 'investigation', 'interview')
  s.lastRoll = roll

  discoverClue(mystery, location, 'interview', roll.outcome, hunterId, s.actionCount)

  if (roll.outcome === 'miss') {
    s.team.hunters[hunterIdx] = gainExperience(s.team.hunters[hunterIdx])
  }

  advanceClockForAction(s, roll.outcome)
}

function handleDeepSearch(
  s: GameState,
  action: ActionEntry,
  rng: GameRNG,
): void {
  requirePhase(s, 'investigation')
  const mystery = requireMystery(s)
  const location = requireCurrentLocation(s)

  const hunterId = action.payload.hunterId as string | undefined
  if (!hunterId) throw new ActionError('deepSearch: payload.hunterId is required')

  if (s.team.staminaPool <= 0) throw new ActionError('deepSearch: no stamina remaining')
  if (!location.availableActions.includes('deepSearch')) {
    throw new ActionError('deepSearch: not available at this location')
  }

  const hunterIdx = s.team.hunters.findIndex((h) => h.id === hunterId)
  if (hunterIdx === -1) throw new ActionError(`deepSearch: hunter not found: ${hunterId}`)
  const hunter = s.team.hunters[hunterIdx]
  if (!hunter.alive) throw new ActionError('deepSearch: dead hunter cannot act')

  // Costs 1 stamina instead of a scene action
  s.team.staminaPool--
  mystery.totalActionsThisLocation++

  const roll = performRoll(s, rng, hunterId, 'sharp', 'investigation', 'deepSearch')
  s.lastRoll = roll

  // Deep search can find hidden clues (respects minRollOutcome gate)
  discoverDeepSearchClue(mystery, location, roll.outcome, hunterId, s.actionCount)

  if (roll.outcome === 'miss') {
    // Dangerous — location threat can cause harm on a miss
    if (location.threatLevel > 0) {
      s.team.hunters[hunterIdx] = applyHarm(s.team.hunters[hunterIdx], 1)
    }
    s.team.hunters[hunterIdx] = gainExperience(s.team.hunters[hunterIdx])
  }

  advanceClockForAction(s, roll.outcome)
}

function handleFightMinion(
  s: GameState,
  action: ActionEntry,
  rng: GameRNG,
): void {
  requirePhase(s, 'investigation')
  const mystery = requireMystery(s)
  const location = requireCurrentLocation(s)

  const hunterId = action.payload.hunterId as string | undefined
  if (!hunterId) throw new ActionError('fightMinion: payload.hunterId is required')
  if (s.team.staminaPool <= 0) throw new ActionError('fightMinion: no stamina remaining')
  if (location.minionsPresent <= 0) throw new ActionError('fightMinion: no minions at this location')

  const hunterIdx = s.team.hunters.findIndex((h) => h.id === hunterId)
  if (hunterIdx === -1) throw new ActionError(`fightMinion: hunter not found: ${hunterId}`)
  const hunter = s.team.hunters[hunterIdx]
  if (!hunter.alive) throw new ActionError('fightMinion: dead hunter cannot act')

  s.team.staminaPool--
  mystery.totalActionsThisLocation++

  const roll = performRoll(s, rng, hunterId, 'tough', 'investigation', 'fightMinion')
  s.lastRoll = roll

  if (roll.outcome === 'success') {
    location.minionsPresent--
    if (location.minionsPresent === 0) location.cleared = true
  } else if (roll.outcome === 'mixed') {
    // Minion cleared but hunter takes harm
    location.minionsPresent--
    if (location.minionsPresent === 0) location.cleared = true
    s.team.hunters[hunterIdx] = applyHarm(hunter, 1)
  } else {
    // Miss: hunter takes harm, minion remains
    s.team.hunters[hunterIdx] = applyHarm(hunter, 2)
    s.team.hunters[hunterIdx] = gainExperience(s.team.hunters[hunterIdx])
  }

  advanceClockForAction(s, roll.outcome)
}

function handleHelpBystander(s: GameState, action: ActionEntry): void {
  requirePhase(s, 'investigation')
  const mystery = requireMystery(s)

  const hunterId = action.payload.hunterId as string | undefined
  if (!hunterId) throw new ActionError('helpBystander: payload.hunterId is required')

  const hunterIdx = s.team.hunters.findIndex((h) => h.id === hunterId)
  if (hunterIdx === -1) throw new ActionError(`helpBystander: hunter not found: ${hunterId}`)
  const hunter = s.team.hunters[hunterIdx]
  if (!hunter.alive) throw new ActionError('helpBystander: dead hunter cannot act')
  if (hunter.sceneActionsRemaining <= 0) {
    throw new ActionError('helpBystander: no scene actions remaining')
  }

  s.team.hunters[hunterIdx] = { ...hunter, sceneActionsRemaining: hunter.sceneActionsRemaining - 1 }
  mystery.totalActionsThisLocation++
  // Effect: good outcome in the narrative, may provide a clue — full implementation in Phase C
}

function handleUseSpecialMove(
  s: GameState,
  action: ActionEntry,
  rng: GameRNG,
): void {
  requirePhase(s, 'investigation', 'confrontation')

  const hunterId = action.payload.hunterId as string | undefined
  const moveId = action.payload.moveId as string | undefined
  if (!hunterId) throw new ActionError('useSpecialMove: payload.hunterId is required')
  if (!moveId) throw new ActionError('useSpecialMove: payload.moveId is required')

  const hunterIdx = s.team.hunters.findIndex((h) => h.id === hunterId)
  if (hunterIdx === -1) throw new ActionError(`useSpecialMove: hunter not found: ${hunterId}`)
  const hunter = s.team.hunters[hunterIdx]
  if (!hunter.alive) throw new ActionError('useSpecialMove: dead hunter cannot act')

  // Phase A stub: roll 2d6 + Weird and record result
  const roll = performRoll(s, rng, hunterId, 'weird', s.phase === 'confrontation' ? 'confrontation' : 'investigation', 'useSpecialMove')
  s.lastRoll = roll

  if (s.mystery) s.mystery.totalActionsThisLocation++
}

function handleAssist(s: GameState, action: ActionEntry): void {
  requirePhase(s, 'investigation', 'confrontation')

  const assistingId = action.payload.assistingHunterId as string | undefined
  const targetId = action.payload.targetHunterId as string | undefined
  if (!assistingId) throw new ActionError('assist: payload.assistingHunterId is required')
  if (!targetId) throw new ActionError('assist: payload.targetHunterId is required')
  if (assistingId === targetId) throw new ActionError('assist: hunter cannot assist themselves')

  const assistingIdx = s.team.hunters.findIndex((h) => h.id === assistingId)
  if (assistingIdx === -1) throw new ActionError(`assist: assisting hunter not found: ${assistingId}`)
  requireHunter(s, targetId) // verify target exists

  const assisting = s.team.hunters[assistingIdx]
  if (!assisting.alive) throw new ActionError('assist: dead hunter cannot assist')
  if (assisting.assistChargesRemaining <= 0) {
    throw new ActionError('assist: no assist charges remaining')
  }

  s.team.hunters[assistingIdx] = {
    ...assisting,
    assistChargesRemaining: assisting.assistChargesRemaining - 1,
  }
}

function handleRest(s: GameState, action: ActionEntry): void {
  requirePhase(s, 'investigation')

  const hunterId = action.payload.hunterId as string | undefined
  if (!hunterId) throw new ActionError('rest: payload.hunterId is required')

  const hunterIdx = s.team.hunters.findIndex((h) => h.id === hunterId)
  if (hunterIdx === -1) throw new ActionError(`rest: hunter not found: ${hunterId}`)
  const hunter = s.team.hunters[hunterIdx]
  if (!hunter.alive) throw new ActionError('rest: dead hunter cannot rest')
  if (hunter.sceneActionsRemaining <= 0) {
    throw new ActionError('rest: no scene actions remaining')
  }

  s.team.hunters[hunterIdx] = healHarm(
    { ...hunter, sceneActionsRemaining: hunter.sceneActionsRemaining - 1 },
    1,
  )

  if (s.mystery) s.mystery.totalActionsThisLocation++
}

function handleStartConfrontation(s: GameState, action: ActionEntry): void {
  requirePhase(s, 'investigation')
  const mystery = requireMystery(s)

  const forced = action.payload.forcedByCountdown as boolean | undefined
  s.confrontation = initConfrontation(mystery, forced ?? false)
  s.phase = 'confrontation'
}

function handleAttack(s: GameState, action: ActionEntry, rng: GameRNG): void {
  requirePhase(s, 'confrontation')
  const conf = s.confrontation!

  const hunterId = action.payload.hunterId as string | undefined
  if (!hunterId) throw new ActionError('attack: payload.hunterId is required')

  const hunterIdx = s.team.hunters.findIndex((h) => h.id === hunterId)
  if (hunterIdx === -1) throw new ActionError(`attack: hunter not found: ${hunterId}`)
  const hunter = s.team.hunters[hunterIdx]
  if (!hunter.alive) throw new ActionError('attack: dead hunter cannot act')

  const roll = performRoll(s, rng, hunterId, 'tough', 'confrontation', 'attack')
  s.lastRoll = roll

  const monster = s.mystery!.monster
  let harmToMonster = 0
  let harmToHunter = 0

  if (roll.outcome === 'success') {
    harmToMonster = Math.max(0, 2 - monster.armor)  // armor reduces damage to monster
  } else if (roll.outcome === 'mixed') {
    harmToMonster = Math.max(0, 1 - monster.armor)  // armor reduces damage to monster
    harmToHunter = monster.harm                      // monster hits back with full harm
  } else {
    harmToHunter = monster.harm                      // miss — monster hits with full harm
    s.team.hunters[hunterIdx] = gainExperience(hunter)
  }

  conf.monsterHarmTaken += harmToMonster
  if (harmToHunter > 0) {
    s.team.hunters[hunterIdx] = applyHarm(s.team.hunters[hunterIdx], harmToHunter)
  }

  // Check if monster is defeated
  if (conf.monsterHarmTaken >= conf.monsterMaxHarm) {
    conf.monsterDefeated = true
  }

  const ca: ConfrontationAction = {
    round: conf.currentRound,
    hunterId,
    actionType: 'attack',
    roll,
    harmDealtToMonster: harmToMonster,
    harmDealtToHunter: harmToHunter,
  }
  conf.history.push(ca)
}

function handleDefend(s: GameState, action: ActionEntry, rng: GameRNG): void {
  requirePhase(s, 'confrontation')
  const conf = s.confrontation!

  const hunterId = action.payload.hunterId as string | undefined
  const targetId = action.payload.targetHunterId as string | undefined
  if (!hunterId) throw new ActionError('defend: payload.hunterId is required')

  const hunterIdx = s.team.hunters.findIndex((h) => h.id === hunterId)
  if (hunterIdx === -1) throw new ActionError(`defend: hunter not found: ${hunterId}`)
  const hunter = s.team.hunters[hunterIdx]
  if (!hunter.alive) throw new ActionError('defend: dead hunter cannot act')

  const roll = performRoll(s, rng, hunterId, 'tough', 'confrontation', 'defend')
  s.lastRoll = roll

  let harmToHunter = 0
  if (roll.outcome === 'mixed') harmToHunter = 1  // take the hit they were deflecting
  if (roll.outcome === 'miss') {
    harmToHunter = 2
    s.team.hunters[hunterIdx] = gainExperience(hunter)
  }

  if (harmToHunter > 0) {
    s.team.hunters[hunterIdx] = applyHarm(s.team.hunters[hunterIdx], harmToHunter)
  }

  const ca: ConfrontationAction = {
    round: conf.currentRound,
    hunterId,
    actionType: 'defend',
    roll,
    harmDealtToMonster: 0,
    harmDealtToHunter: harmToHunter,
    targetHunterId: targetId,
  }
  conf.history.push(ca)
}

function handleResist(s: GameState, action: ActionEntry, rng: GameRNG): void {
  requirePhase(s, 'confrontation')
  const conf = s.confrontation!

  const hunterId = action.payload.hunterId as string | undefined
  if (!hunterId) throw new ActionError('resist: payload.hunterId is required')

  const hunterIdx = s.team.hunters.findIndex((h) => h.id === hunterId)
  if (hunterIdx === -1) throw new ActionError(`resist: hunter not found: ${hunterId}`)
  const hunter = s.team.hunters[hunterIdx]
  if (!hunter.alive) throw new ActionError('resist: dead hunter cannot act')

  const roll = performRoll(s, rng, hunterId, 'cool', 'confrontation', 'resist')
  s.lastRoll = roll

  let harmToHunter = 0
  if (roll.outcome === 'miss') {
    harmToHunter = 1
    s.team.hunters[hunterIdx] = gainExperience(hunter)
  }
  if (harmToHunter > 0) {
    s.team.hunters[hunterIdx] = applyHarm(s.team.hunters[hunterIdx], harmToHunter)
  }

  const ca: ConfrontationAction = {
    round: conf.currentRound,
    hunterId,
    actionType: 'resist',
    roll,
    harmDealtToMonster: 0,
    harmDealtToHunter: harmToHunter,
  }
  conf.history.push(ca)
}

function handleDistract(s: GameState, action: ActionEntry, rng: GameRNG): void {
  requirePhase(s, 'confrontation')
  const conf = s.confrontation!

  const hunterId = action.payload.hunterId as string | undefined
  if (!hunterId) throw new ActionError('distract: payload.hunterId is required')

  const hunterIdx = s.team.hunters.findIndex((h) => h.id === hunterId)
  if (hunterIdx === -1) throw new ActionError(`distract: hunter not found: ${hunterId}`)
  const hunter = s.team.hunters[hunterIdx]
  if (!hunter.alive) throw new ActionError('distract: dead hunter cannot act')

  const roll = performRoll(s, rng, hunterId, 'charm', 'confrontation', 'distract')
  s.lastRoll = roll

  if (roll.outcome === 'miss') {
    s.team.hunters[hunterIdx] = gainExperience(hunter)
  }

  const ca: ConfrontationAction = {
    round: conf.currentRound,
    hunterId,
    actionType: 'distract',
    roll,
    harmDealtToMonster: 0,
    harmDealtToHunter: 0,
  }
  conf.history.push(ca)
}

function handleAssess(s: GameState, action: ActionEntry, rng: GameRNG): void {
  requirePhase(s, 'confrontation')
  const conf = s.confrontation!

  const hunterId = action.payload.hunterId as string | undefined
  if (!hunterId) throw new ActionError('assess: payload.hunterId is required')

  const hunterIdx = s.team.hunters.findIndex((h) => h.id === hunterId)
  if (hunterIdx === -1) throw new ActionError(`assess: hunter not found: ${hunterId}`)
  const hunter = s.team.hunters[hunterIdx]
  if (!hunter.alive) throw new ActionError('assess: dead hunter cannot act')

  const roll = performRoll(s, rng, hunterId, 'sharp', 'confrontation', 'assess')
  s.lastRoll = roll

  if (roll.outcome === 'miss') {
    s.team.hunters[hunterIdx] = gainExperience(hunter)
  }

  const ca: ConfrontationAction = {
    round: conf.currentRound,
    hunterId,
    actionType: 'assess',
    roll,
    harmDealtToMonster: 0,
    harmDealtToHunter: 0,
  }
  conf.history.push(ca)
}

function handleExploitWeakness(
  s: GameState,
  action: ActionEntry,
  rng: GameRNG,
): void {
  requirePhase(s, 'confrontation')
  const conf = s.confrontation!
  const mystery = requireMystery(s)
  const weakness = mystery.monster.weakness

  const hunterId = action.payload.hunterId as string | undefined
  if (!hunterId) throw new ActionError('exploitWeakness: payload.hunterId is required')

  const hunterIdx = s.team.hunters.findIndex((h) => h.id === hunterId)
  if (hunterIdx === -1) throw new ActionError(`exploitWeakness: hunter not found: ${hunterId}`)
  const hunter = s.team.hunters[hunterIdx]
  if (!hunter.alive) throw new ActionError('exploitWeakness: dead hunter cannot act')

  // Exploit cooldown: a hunter cannot exploit again if their last action was exploitWeakness
  const hunterHistory = conf.history.filter((a) => a.hunterId === hunterId)
  const lastHunterAction = hunterHistory[hunterHistory.length - 1]
  if (lastHunterAction?.actionType === 'exploitWeakness') {
    throw new ActionError('exploitWeakness: hunter must take a different action before exploiting again')
  }

  // ── Determine stat, modifier, and harm profile ─────────────────────────────
  let stat: StatName
  let baseModifier: number
  let successHarm: 'maxHarm' | number
  let mixedHarmToMonster: 'maxHarm' | number | undefined
  let mixedHarmToHunter: number | undefined
  let exploitOptionId: string | undefined

  if (weakness.exploitOptions && weakness.exploitOptions.length > 0) {
    exploitOptionId = action.payload.exploitOptionId as string | undefined
    const freeTextInput = action.payload.freeTextInput as string | undefined

    if (exploitOptionId) {
      // ── Structured option path: clue-based exploit options ─────────────────
      const option = getExploitOptionById(weakness, exploitOptionId)
      if (!option) {
        throw new ActionError(`exploitWeakness: unknown exploitOptionId: ${exploitOptionId}`)
      }
      const foundClues = new Set(mystery.cluesFound)
      const unmet = option.requiredClueIds.filter((id) => !foundClues.has(id))
      if (unmet.length > 0) {
        throw new ActionError(`exploitWeakness: clue prerequisites not met: ${unmet.join(', ')}`)
      }
      stat = option.statRequired ?? weakness.statRequired ?? 'tough'
      baseModifier = option.modifier
      successHarm = option.successHarm
      mixedHarmToMonster = option.mixedHarm
      mixedHarmToHunter = option.mixedHarmToHunter
    } else if (freeTextInput && weakness.freeTextExploits && weakness.freeTextExploits.length > 0) {
      // ── Free-text path: keyword pipeline ──────────────────────────────────
      const allClues = mystery.locations.flatMap((loc) => loc.clues)
      const interpretation = interpretAction({
        input: freeTextInput,
        allClues,
        foundClueIds: mystery.cluesFound,
        weakness,
        monsterHarm: mystery.monster.harm,
      })
      stat = interpretation.stat
      baseModifier = interpretation.modifier
      successHarm = interpretation.successHarm
      mixedHarmToMonster = interpretation.successHarm
      mixedHarmToHunter = 1
      exploitOptionId = interpretation.exploitId ?? undefined
    } else {
      throw new ActionError('exploitWeakness: payload.exploitOptionId or freeTextInput is required')
    }
  } else {
    // ── Legacy path: intelLevel-based modifier ───────────────────────────────
    if (conf.intelLevel === 'blind') {
      throw new ActionError('exploitWeakness: unavailable at blind intel level')
    }
    stat = weakness.statRequired ?? 'tough'
    baseModifier = exploitModifier(conf.intelLevel)
    successHarm = 'maxHarm'
    mixedHarmToMonster = undefined
    mixedHarmToHunter = undefined
  }

  // ── Roll ────────────────────────────────────────────────────────────────────
  const modifiedHunter: Hunter = {
    ...hunter,
    stats: { ...hunter.stats, [stat]: hunter.stats[stat] + baseModifier },
  }
  s.team.hunters[hunterIdx] = modifiedHunter
  const roll = performRoll(s, rng, hunterId, stat, 'confrontation', 'exploitWeakness')
  s.lastRoll = roll
  s.team.hunters[hunterIdx] = hunter

  // ── Resolve harm ────────────────────────────────────────────────────────────
  let harmToMonster = 0
  let harmToHunter = 0

  const resolveHarm = (value: 'maxHarm' | number): number =>
    value === 'maxHarm' ? mystery.monster.maxHarm : value

  if (roll.outcome === 'success') {
    harmToMonster = resolveHarm(successHarm)
    if (harmToMonster >= conf.monsterMaxHarm - conf.monsterHarmTaken) {
      conf.monsterDefeated = true
    }
  } else if (roll.outcome === 'mixed') {
    harmToMonster = resolveHarm(mixedHarmToMonster ?? (mystery.monster.harm + 1))
    harmToHunter = mixedHarmToHunter ?? 1
  } else {
    harmToHunter = mystery.monster.harm
    s.team.hunters[hunterIdx] = gainExperience(hunter)
  }

  conf.monsterHarmTaken += harmToMonster
  if (conf.monsterHarmTaken >= conf.monsterMaxHarm) conf.monsterDefeated = true
  if (harmToHunter > 0) {
    s.team.hunters[hunterIdx] = applyHarm(s.team.hunters[hunterIdx], harmToHunter)
  }

  const ca: ConfrontationAction = {
    round: conf.currentRound,
    hunterId,
    actionType: 'exploitWeakness',
    roll,
    harmDealtToMonster: harmToMonster,
    harmDealtToHunter: harmToHunter,
    exploitOptionId,
    freeTextInput: action.payload.freeTextInput as string | undefined,
  }
  conf.history.push(ca)
}

function handleSpendLuck(s: GameState, _action: ActionEntry): void {
  const roll = s.lastRoll
  if (!roll) throw new ActionError('spendLuck: no roll available to upgrade')

  const hunterId = roll.hunterId
  const hunterIdx = s.team.hunters.findIndex((h) => h.id === hunterId)
  if (hunterIdx === -1) throw new ActionError(`spendLuck: hunter not found: ${hunterId}`)
  const hunter = s.team.hunters[hunterIdx]

  if (hunter.luck <= 0) throw new ActionError('spendLuck: hunter has no luck remaining')
  if (roll.luckSpent) throw new ActionError('spendLuck: luck already spent on this roll')
  if (roll.outcome === 'success') {
    throw new ActionError('spendLuck: roll is already a full success')
  }

  // Spend luck and upgrade outcome
  s.team.hunters[hunterIdx] = { ...hunter, luck: hunter.luck - 1 }
  const upgraded = upgradeOutcome(roll.outcome)

  // Update the recorded roll
  s.lastRoll = { ...roll, luckSpent: true, upgraded: true, outcome: upgraded }

  // ── Re-resolve investigation effects ────────────────────────────────────────
  // When luck is spent on an investigation miss (miss → mixed), two things must happen:
  //   1. Reverse the missPenalty clock ticks that were charged during the action.
  //   2. Re-attempt clue discovery with the upgraded outcome (miss never finds clues;
  //      mixed/success may, per isClueRevealedByOutcome rules).
  if (roll.context === 'investigation' && s.mystery) {
    const mystery = s.mystery
    const config = mystery.countdown.clockConfig
    const costBefore = clockCostForOutcome('miss', config)
    const costAfter  = clockCostForOutcome(upgraded, config)
    const clockRefund = costBefore - costAfter  // positive → saves clock ticks
    if (clockRefund > 0) {
      tickClock(mystery.countdown, -clockRefund, s.actionCount)
    }
    // Re-attempt clue discovery at the current location
    const location = mystery.locations.find((l) => l.id === mystery.currentLocationId)
    if (location) {
      if (roll.actionType === 'deepSearch') {
        discoverDeepSearchClue(mystery, location, upgraded, hunterId, s.actionCount)
      } else {
        discoverClue(mystery, location, roll.actionType, upgraded, hunterId, s.actionCount)
      }
    }
  }

  // ── Re-resolve confrontation effects ─────────────────────────────────────────
  if (s.confrontation && s.confrontation.history.length > 0) {
    const last = s.confrontation.history[s.confrontation.history.length - 1]
    if (last.roll && last.roll.hunterId === hunterId) {
      last.roll = s.lastRoll

      // Recalculate harm based on upgraded outcome
      if (last.actionType === 'attack' && upgraded === 'success' && last.harmDealtToMonster < 2) {
        const extra = 2 - last.harmDealtToMonster
        s.confrontation.monsterHarmTaken += extra
        last.harmDealtToMonster = 2
        last.harmDealtToHunter = 0  // clean success — no return harm
        // Reverse any harm taken on the mixed result
        // (complex — Phase C will handle full luck retroaction)
      }
      if (s.confrontation.monsterHarmTaken >= s.confrontation.monsterMaxHarm) {
        s.confrontation.monsterDefeated = true
      }
    }
  }
}

function handleEndMystery(s: GameState, action: ActionEntry): void {
  requirePhase(s, 'confrontation', 'investigation')

  const outcome = action.payload.outcome as 'win' | 'loss' | 'retreat' | undefined
  if (!outcome) throw new ActionError('endMystery: payload.outcome is required')
  if (!['win', 'loss', 'retreat'].includes(outcome)) {
    throw new ActionError(`endMystery: invalid outcome '${outcome}'`)
  }

  const mystery = requireMystery(s)
  const totalClues = mystery.locations.reduce((n, l) => n + l.clues.length, 0)
  const conf = s.confrontation

  const hunterReports: HunterMissionReport[] = s.team.hunters.map((h) => ({
    hunterId: h.id,
    name: h.name,
    playbookId: h.playbookId,
    finalHarm: h.harm,
    finalCondition: conditionFromHarm(h.harm),
    luckRemaining: h.luck,
    luckSpent: h.maxLuck - h.luck,
    expGained: h.experience,
    rollsSucceeded: conf?.history.filter((a) => a.hunterId === h.id && a.roll?.outcome === 'success').length ?? 0,
    rollsMixed: conf?.history.filter((a) => a.hunterId === h.id && a.roll?.outcome === 'mixed').length ?? 0,
    rollsMissed: conf?.history.filter((a) => a.hunterId === h.id && a.roll?.outcome === 'miss').length ?? 0,
  }))

  s.fieldReport = {
    mysteryId: mystery.id,
    seed: mystery.seed,
    outcome,
    intelLevel: mystery.intelLevel,
    hunterReports,
    cluesFound: mystery.cluesFound.length,
    cluesAvailable: totalClues,
    countdownReached: mystery.countdown.currentStep,
    totalActions: s.actionCount,
    durationMs: s.mysteryStartTime ? Date.now() - s.mysteryStartTime : 0,
    generatedAt: new Date().toISOString(),
  }

  s.phase = 'fieldReport'
}

// ─── Debug Action Dispatch ────────────────────────────────────────────────────

function handleDebugAction(s: GameState, action: ActionEntry): void {
  if (!action.debug) {
    throw new ActionError(`Debug action '${action.type}' must have debug: true`)
  }

  const mystery = s.mystery
  const payload = action.payload

  switch (action.type) {
    case 'debug_revealAllClues': {
      if (!mystery) throw new ActionError('debug_revealAllClues: no active mystery')
      for (const loc of mystery.locations) {
        for (const clue of loc.clues) {
          if (!clue.found) {
            clue.found = true
            mystery.cluesFound.push(clue.id)
          }
        }
      }
      mystery.intelLevel = 'prepared'
      break
    }

    case 'debug_revealMonster': {
      if (!mystery) throw new ActionError('debug_revealMonster: no active mystery')
      mystery.monsterRevealed = true
      break
    }

    case 'debug_revealMap': {
      if (!mystery) throw new ActionError('debug_revealMap: no active mystery')
      mystery.mapRevealed = true
      for (const loc of mystery.locations) loc.visited = true
      break
    }

    case 'debug_setIntelLevel': {
      if (!mystery) throw new ActionError('debug_setIntelLevel: no active mystery')
      const level = payload.level as IntelLevel | undefined
      if (!level || !['blind', 'partial', 'informed', 'prepared'].includes(level)) {
        throw new ActionError('debug_setIntelLevel: invalid level')
      }
      mystery.intelLevel = level
      if (s.confrontation) s.confrontation.intelLevel = level
      break
    }

    case 'debug_setHunterHarm': {
      const hunterId = payload.hunterId as string | undefined
      const harm = payload.harm as number | undefined
      if (!hunterId) throw new ActionError('debug_setHunterHarm: hunterId required')
      if (harm === undefined) throw new ActionError('debug_setHunterHarm: harm required')
      const idx = s.team.hunters.findIndex((h) => h.id === hunterId)
      if (idx === -1) throw new ActionError(`debug_setHunterHarm: hunter not found: ${hunterId}`)
      s.team.hunters[idx] = setHarm(s.team.hunters[idx], harm)
      break
    }

    case 'debug_setHunterLuck': {
      const hunterId = payload.hunterId as string | undefined
      const luck = payload.luck as number | undefined
      if (!hunterId) throw new ActionError('debug_setHunterLuck: hunterId required')
      if (luck === undefined) throw new ActionError('debug_setHunterLuck: luck required')
      const idx = s.team.hunters.findIndex((h) => h.id === hunterId)
      if (idx === -1) throw new ActionError(`debug_setHunterLuck: hunter not found: ${hunterId}`)
      s.team.hunters[idx] = setLuck(s.team.hunters[idx], luck)
      break
    }

    case 'debug_setCountdown': {
      if (!mystery) throw new ActionError('debug_setCountdown: no active mystery')
      const step = payload.step as number | undefined
      if (step === undefined || step < 0 || step > 6) {
        throw new ActionError('debug_setCountdown: step must be 0–6')
      }
      mystery.countdown.currentStep = step
      break
    }

    case 'debug_addStamina': {
      const n = payload.amount as number | undefined
      if (n === undefined) throw new ActionError('debug_addStamina: amount required')
      s.team.staminaPool = Math.max(0, s.team.staminaPool + n)
      break
    }

    case 'debug_skipToConfrontation': {
      if (!mystery) throw new ActionError('debug_skipToConfrontation: no active mystery')
      if (s.phase !== 'investigation') {
        throw new ActionError('debug_skipToConfrontation: must be in investigation phase')
      }
      s.confrontation = initConfrontation(mystery, false)
      s.phase = 'confrontation'
      break
    }

    case 'debug_forceRoll': {
      const value = payload.value as number | undefined
      if (value === undefined || value < 2 || value > 12) {
        throw new ActionError('debug_forceRoll: value must be 2–12')
      }
      s.debugForceRollValue = value
      break
    }

    case 'debug_killHunter': {
      const hunterId = payload.hunterId as string | undefined
      if (!hunterId) throw new ActionError('debug_killHunter: hunterId required')
      const idx = s.team.hunters.findIndex((h) => h.id === hunterId)
      if (idx === -1) throw new ActionError(`debug_killHunter: hunter not found: ${hunterId}`)
      s.team.hunters[idx] = setHarm(s.team.hunters[idx], 7)
      break
    }

    case 'debug_completeCase': {
      const outcome = payload.outcome as 'win' | 'loss' | 'retreat' | undefined
      if (!outcome) throw new ActionError('debug_completeCase: outcome required')
      if (!mystery) throw new ActionError('debug_completeCase: no active mystery')
      const totalClues = mystery.locations.reduce((n, l) => n + l.clues.length, 0)
      s.fieldReport = {
        mysteryId: mystery.id,
        seed: mystery.seed,
        outcome,
        intelLevel: mystery.intelLevel,
        hunterReports: s.team.hunters.map((h) => ({
          hunterId: h.id,
          name: h.name,
          playbookId: h.playbookId,
          finalHarm: h.harm,
          finalCondition: conditionFromHarm(h.harm),
          luckRemaining: h.luck,
          luckSpent: h.maxLuck - h.luck,
          expGained: h.experience,
          rollsSucceeded: 0,
          rollsMixed: 0,
          rollsMissed: 0,
        })),
        cluesFound: mystery.cluesFound.length,
        cluesAvailable: totalClues,
        countdownReached: mystery.countdown.currentStep,
        totalActions: s.actionCount,
        durationMs: 0,
        generatedAt: new Date().toISOString(),
      }
      s.phase = 'fieldReport'
      break
    }

    case 'debug_setSeed': {
      // Can only change seed at setup phase — dangerous otherwise
      const seed = payload.seed as string | undefined
      if (!seed) throw new ActionError('debug_setSeed: seed required')
      s.seed = seed
      break
    }

    case 'debug_unlockAllPlaybooks': {
      // No-op in Phase A (playbook unlocking is a Phase 2 HQ feature)
      break
    }

    case 'debug_grantResources': {
      // No-op in Phase A (resources are a Phase 2 HQ feature)
      break
    }

    case 'debug_loadState': {
      const json = payload.json as string | undefined
      if (!json) throw new ActionError('debug_loadState: json required')
      let loaded: GameState
      try {
        loaded = JSON.parse(json) as GameState
      } catch {
        throw new ActionError('debug_loadState: invalid JSON')
      }
      // Replace entire state
      Object.assign(s, loaded)
      break
    }

    default: {
      const _exhaustive: never = action.type as never
      throw new ActionError(`Unknown debug action: ${String(_exhaustive)}`)
    }
  }
}

// ─── Main Reducer ─────────────────────────────────────────────────────────────

/**
 * Pure reducer: given a state and an action, produce the next state.
 * This is the engine's single entry point for state mutation.
 * Always returns a new object — does not mutate its input.
 */
export function applyAction(state: GameState, action: ActionEntry): GameState {
  // Single deep clone at entry — all handlers mutate this clone
  const s = structuredClone(state) as GameState
  s.actionCount++
  // Preserve lastRoll for spendLuck (which needs to read the previous roll).
  // All other actions clear it; their own performRoll call will set a fresh one.
  if (action.type !== 'spendLuck') {
    s.lastRoll = null
  }

  const hadForceRoll = s.debugForceRollValue !== null
  const rng = new GameRNG(0)
  rng.setState(s.rngState)

  switch (action.type) {
    case 'startMystery':         handleStartMystery(s, action, rng); break
    case 'travel':               handleTravel(s, action); break
    case 'investigate':          handleInvestigate(s, action, rng); break
    case 'interview':            handleInterview(s, action, rng); break
    case 'deepSearch':           handleDeepSearch(s, action, rng); break
    case 'fightMinion':          handleFightMinion(s, action, rng); break
    case 'helpBystander':        handleHelpBystander(s, action); break
    case 'useSpecialMove':       handleUseSpecialMove(s, action, rng); break
    case 'assist':               handleAssist(s, action); break
    case 'rest':                 handleRest(s, action); break
    case 'startConfrontation':   handleStartConfrontation(s, action); break
    case 'attack':               handleAttack(s, action, rng); break
    case 'defend':               handleDefend(s, action, rng); break
    case 'resist':               handleResist(s, action, rng); break
    case 'distract':             handleDistract(s, action, rng); break
    case 'assess':               handleAssess(s, action, rng); break
    case 'exploitWeakness':      handleExploitWeakness(s, action, rng); break
    case 'spendLuck':            handleSpendLuck(s, action); break
    case 'endMystery':           handleEndMystery(s, action); break
    case 'debug_revealAllClues':
    case 'debug_revealMonster':
    case 'debug_revealMap':
    case 'debug_setIntelLevel':
    case 'debug_setHunterHarm':
    case 'debug_setHunterLuck':
    case 'debug_setCountdown':
    case 'debug_addStamina':
    case 'debug_skipToConfrontation':
    case 'debug_forceRoll':
    case 'debug_killHunter':
    case 'debug_completeCase':
    case 'debug_setSeed':
    case 'debug_unlockAllPlaybooks':
    case 'debug_grantResources':
    case 'debug_loadState':
      handleDebugAction(s, action)
      break
    default: {
      const _exhaustive: never = action.type as never
      throw new ActionError(`Unknown action type: ${String(_exhaustive)}`)
    }
  }

  // Capture final RNG state after all rolls in this action
  s.rngState = rng.getState()

  // Clear force-roll flag after it has been used (not when it was just set)
  if (hadForceRoll && action.type !== 'debug_forceRoll') {
    s.debugForceRollValue = null
  }

  return s
}
