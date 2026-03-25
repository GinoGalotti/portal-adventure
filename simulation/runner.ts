/**
 * Headless simulation runner.
 *
 * runSimulation() drives a complete mystery from startMystery through
 * endMystery, using a Strategy to make all decisions. Returns a RunResult
 * with pre/post-confrontation snapshots and the full action log.
 */

import { applyAction } from '../src/engine/actions'
import { createInitialState } from '../src/engine/state'
import { isDisasterReached, isConfrontationAvailable } from '../src/engine/investigation'
import { getConfrontationResult } from '../src/engine/confrontation'
import type { GameState, ActionEntry, MysteryDefinition } from '../src/engine/types'
import type {
  Strategy,
  HunterDef,
  PreConfrontationSnapshot,
  PostConfrontationSnapshot,
  RunResult,
} from './types'
import { getValidActions } from './valid-actions'

// ─── Constants ────────────────────────────────────────────────────────────────

/** Safety valve: force confrontation after this many investigation actions */
export const MAX_INVESTIGATION_ACTIONS = 200
/** Safety valve: force retreat after this many confrontation actions */
export const MAX_CONFRONTATION_ACTIONS = 50

/** Action types that produce a dice roll (eligible for luck spending) */
const ROLL_ACTIONS = new Set<ActionEntry['type']>([
  'investigate', 'interview', 'deepSearch', 'fightMinion', 'helpBystander',
  'attack', 'defend', 'resist', 'distract', 'assess', 'exploitWeakness',
])

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeAction(
  type: ActionEntry['type'],
  payload: Record<string, unknown> = {},
): ActionEntry {
  return { type, payload, timestamp: 0 }
}

function capturePreSnapshot(state: GameState): PreConfrontationSnapshot {
  const mystery = state.mystery!
  const cluesAvailable = mystery.locations.reduce((n, l) => n + l.clues.length, 0)
  return {
    clockValue: mystery.countdown.clockValue,
    currentStep: mystery.countdown.currentStep,
    intelLevel: mystery.intelLevel,
    cluesFound: [...mystery.cluesFound],
    cluesAvailable,
    locationsVisited: [...mystery.locationsVisited],
    locationsAvailable: mystery.locations.length,
    hunterStates: state.team.hunters.map((h) => ({
      id: h.id,
      name: h.name,
      playbookId: h.playbookId,
      harm: h.harm,
      luck: h.luck,
      conditions: [...h.conditions],
      alive: h.alive,
    })),
    staminaRemaining: state.team.staminaPool,
    staminaMax: state.team.maxStamina,
    totalActions: state.actionCount,
    forcedByCountdown: state.confrontation?.forcedByCountdown ?? false,
  }
}

function capturePostSnapshot(
  state: GameState,
  outcome: 'win' | 'loss' | 'retreat',
  luckAtStart: Record<string, number>,
): PostConfrontationSnapshot {
  const conf = state.confrontation
  const history = conf?.history ?? []

  const actionsUsed: Record<string, number> = {}
  for (const ca of history) {
    actionsUsed[ca.actionType] = (actionsUsed[ca.actionType] ?? 0) + 1
  }

  const exploitAttempts = history.filter((ca) => ca.actionType === 'exploitWeakness')

  return {
    outcome,
    roundsFought: history.length,
    monsterHarmDealt: conf?.monsterHarmTaken ?? 0,
    monsterMaxHarm: conf?.monsterMaxHarm ?? 0,
    hunterStates: state.team.hunters.map((h) => ({
      id: h.id,
      harm: h.harm,
      luck: h.luck,
      luckSpent: (luckAtStart[h.id] ?? h.maxLuck) - h.luck,
      conditions: [...h.conditions],
      alive: h.alive,
      rollsSucceeded: history.filter(
        (ca) => ca.hunterId === h.id && ca.roll?.outcome === 'success',
      ).length,
      rollsMixed: history.filter(
        (ca) => ca.hunterId === h.id && ca.roll?.outcome === 'mixed',
      ).length,
      rollsMissed: history.filter(
        (ca) => ca.hunterId === h.id && ca.roll?.outcome === 'miss',
      ).length,
    })),
    actionsUsed,
    exploitWeaknessAttempted: exploitAttempts.length > 0,
    exploitWeaknessSucceeded: exploitAttempts.some((ca) => ca.roll?.outcome === 'success'),
  }
}

// ─── Runner ───────────────────────────────────────────────────────────────────

export function runSimulation(config: {
  mysteryDef: MysteryDefinition
  hunters: HunterDef[]
  strategy: Strategy
  seed: string
}): RunResult {
  const { mysteryDef, hunters, strategy, seed } = config
  const startTime = Date.now()
  const actionLog: ActionEntry[] = []

  function apply(s: GameState, action: ActionEntry): GameState {
    actionLog.push(action)
    return applyAction(s, action)
  }

  function trySpendLuck(s: GameState, lastAction: ActionEntry): GameState {
    if (!ROLL_ACTIONS.has(lastAction.type) || !s.lastRoll) return s
    const roll = s.lastRoll
    if (roll.luckSpent || roll.outcome === 'success') return s
    const hunter = s.team.hunters.find((h) => h.id === roll.hunterId)
    if (!hunter || hunter.luck <= 0) return s
    if (!strategy.shouldSpendLuck(s, roll)) return s
    return apply(s, makeAction('spendLuck', {}))
  }

  // ── 1. Setup ────────────────────────────────────────────────────────────────

  let state = createInitialState(seed)
  state = apply(state, makeAction('startMystery', { definition: mysteryDef, hunters }))

  // ── 2. Investigation loop ────────────────────────────────────────────────────

  let investigationActions = 0

  while (state.phase === 'investigation') {
    // Safety valve: too many actions → force confrontation
    if (investigationActions >= MAX_INVESTIGATION_ACTIONS) {
      state = apply(state, makeAction('startConfrontation', { forcedByCountdown: true }))
      break
    }

    // Disaster check: clock hit max → force confrontation
    if (isDisasterReached(state)) {
      state = apply(state, makeAction('startConfrontation', { forcedByCountdown: true }))
      break
    }

    // All hunters dead → early loss (endMystery from investigation phase)
    if (state.team.hunters.every((h) => !h.alive)) {
      state = apply(state, makeAction('endMystery', { outcome: 'loss' }))
      break
    }

    // Strategy decides to confront
    if (strategy.shouldConfront(state)) {
      state = apply(state, makeAction('startConfrontation', { forcedByCountdown: false }))
      break
    }

    const validActions = getValidActions(state)
    if (validActions.length === 0) {
      // No valid moves — shouldn't happen, but guard against infinite loop
      state = apply(state, makeAction('startConfrontation', { forcedByCountdown: false }))
      break
    }

    const action = strategy.pickAction(state, validActions)

    // If strategy explicitly picks startConfrontation, honour it and exit loop
    if (action.type === 'startConfrontation') {
      state = apply(state, makeAction('startConfrontation', { forcedByCountdown: false }))
      break
    }

    state = apply(state, action)
    investigationActions++
    state = trySpendLuck(state, action)
  }

  // ── Early exit: mystery ended during investigation (all hunters died) ────────

  if (state.phase !== 'confrontation') {
    const outcome = (state.fieldReport?.outcome ?? 'loss') as 'win' | 'loss' | 'retreat'
    const emptyPre: PreConfrontationSnapshot = {
      clockValue: 0,
      currentStep: 0,
      intelLevel: 'blind',
      cluesFound: [],
      cluesAvailable: 0,
      locationsVisited: [],
      locationsAvailable: 0,
      hunterStates: [],
      staminaRemaining: 0,
      staminaMax: 0,
      totalActions: state.actionCount,
      forcedByCountdown: false,
    }
    return {
      seed,
      mysteryId: mysteryDef.id,
      strategyName: strategy.name,
      pre: emptyPre,
      post: capturePostSnapshot(state, outcome, {}),
      actionLog: [...actionLog],
      durationMs: Date.now() - startTime,
    }
  }

  // ── 3. Pre-confrontation snapshot ────────────────────────────────────────────

  const pre = capturePreSnapshot(state)
  const luckAtStart: Record<string, number> = {}
  for (const h of state.team.hunters) luckAtStart[h.id] = h.luck

  // ── 4. Confrontation loop ────────────────────────────────────────────────────

  let confrontationActions = 0
  let finalOutcome: 'win' | 'loss' | 'retreat' = 'retreat'

  while (state.phase === 'confrontation') {
    const conf = state.confrontation!
    const result = getConfrontationResult(conf, state.team.hunters)

    if (result !== 'ongoing') {
      finalOutcome = result
      break
    }

    if (confrontationActions >= MAX_CONFRONTATION_ACTIONS) {
      finalOutcome = 'retreat'
      break
    }

    const validActions = getValidActions(state)
    if (validActions.length === 0) {
      finalOutcome = 'retreat'
      break
    }

    const action = strategy.pickAction(state, validActions)
    state = apply(state, action)
    confrontationActions++
    state = trySpendLuck(state, action)
  }

  // ── 5. End mystery ────────────────────────────────────────────────────────────

  if (state.phase === 'confrontation') {
    state = apply(state, makeAction('endMystery', { outcome: finalOutcome }))
  }

  // ── 6. Post-confrontation snapshot ───────────────────────────────────────────

  const post = capturePostSnapshot(state, finalOutcome, luckAtStart)

  return {
    seed,
    mysteryId: mysteryDef.id,
    strategyName: strategy.name,
    pre,
    post,
    actionLog: [...actionLog],
    durationMs: Date.now() - startTime,
  }
}

// Re-export for convenience
export { isConfrontationAvailable }
