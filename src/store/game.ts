import { create } from 'zustand'
import type { ActionEntry, GameState } from '../engine/types'
import { applyAction } from '../engine/actions'
import { createInitialState, deriveState } from '../engine/state'
import { api } from '../api/client'

interface GameStoreState {
  slotId: string | null
  seed: string
  actions: ActionEntry[]
  state: GameState | null
  loading: boolean
  error: string | null

  /** Load a slot from the Worker, replay the action log, and set state. */
  loadSlot: (token: string, slotId: string) => Promise<void>

  /** Initialise a freshly-created slot locally without a network round-trip. */
  initSlot: (slotId: string, seed: string) => void

  /**
   * Dispatch a game action:
   * 1. Applies it locally (optimistic).
   * 2. Persists it to the Worker.
   * Rolls back on network failure.
   */
  dispatch: (
    token: string,
    action: Omit<ActionEntry, 'timestamp'>,
  ) => Promise<void>

  clearSlot: () => void
  clearError: () => void

  /** Apply a debug-mutated state locally without persisting to the Worker. */
  setDebugState: (state: GameState) => void
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  slotId: null,
  seed: '',
  actions: [],
  state: null,
  loading: false,
  error: null,

  loadSlot: async (token, slotId) => {
    set({ loading: true, error: null })
    try {
      const slot = await api.getSave(token, slotId)
      const gameState =
        slot.actions.length > 0
          ? deriveState(slot.seed, slot.actions)
          : createInitialState(slot.seed)
      set({
        slotId,
        seed: slot.seed,
        actions: slot.actions,
        state: gameState,
        loading: false,
      })
    } catch (e) {
      set({ loading: false, error: (e as Error).message })
    }
  },

  initSlot: (slotId, seed) => {
    set({
      slotId,
      seed,
      actions: [],
      state: createInitialState(seed),
      loading: false,
      error: null,
    })
  },

  dispatch: async (token, actionDef) => {
    const { state, actions, slotId } = get()
    if (!state || !slotId) return

    const action: ActionEntry = { ...actionDef, timestamp: Date.now() }

    // Optimistic local apply
    const nextState = applyAction(state, action)
    const nextActions = [...actions, action]
    set({ state: nextState, actions: nextActions })

    // Persist to Worker
    try {
      const mysterySeed = nextState.mystery?.seed ?? get().seed
      await api.appendAction(token, slotId, {
        mysterySeed,
        actionData: action,
        gameState: nextState,
        stateSnapshot: nextActions.length % 20 === 0 ? nextState : undefined,
      })
    } catch (e) {
      // Rollback
      set({ state, actions, error: (e as Error).message })
      throw e
    }
  },

  clearSlot: () =>
    set({ slotId: null, seed: '', actions: [], state: null, loading: false, error: null }),

  clearError: () => set({ error: null }),

  setDebugState: (state) => set({ state }),
}))
