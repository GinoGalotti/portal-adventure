/**
 * Typed API client for the PORTAL Field Operations Worker.
 * All endpoints are relative to /api — works both in wrangler dev and production.
 */
import type { ActionEntry } from '../engine/types'

export interface SlotSummary {
  id: string
  slotNumber: number
  name: string
  createdAt: string
  updatedAt: string
  seed: string
}

export interface SlotDetail extends SlotSummary {
  actions: ActionEntry[]
}

async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...rest } = options
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`/api${path}`, { ...rest, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  login(username: string, password: string) {
    return apiFetch<{ token: string; userId: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  },

  listSaves(token: string) {
    return apiFetch<SlotSummary[]>('/saves', { token })
  },

  createSave(token: string, name: string, seed: string, slotNumber: number) {
    return apiFetch<SlotSummary>('/saves', {
      method: 'POST',
      token,
      body: JSON.stringify({ name, seed, slotNumber }),
    })
  },

  getSave(token: string, slotId: string) {
    return apiFetch<SlotDetail>(`/saves/${slotId}`, { token })
  },

  deleteSave(token: string, slotId: string) {
    return apiFetch<{ ok: boolean }>(`/saves/${slotId}`, { method: 'DELETE', token })
  },

  deleteSlotByNumber(token: string, slotNumber: number) {
    return apiFetch<{ ok: boolean }>(`/saves/by-slot/${slotNumber}`, { method: 'DELETE', token })
  },

  appendAction(
    token: string,
    slotId: string,
    data: {
      mysterySeed: string
      actionData: ActionEntry
      stateSnapshot?: unknown
      gameState?: unknown
    },
  ) {
    return apiFetch<{ actionIndex: number }>(`/saves/${slotId}/actions`, {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    })
  },

  saveTranscript(token: string, transcript: Record<string, unknown>) {
    return apiFetch<{ ok: boolean }>('/transcripts', {
      method: 'POST',
      token,
      body: JSON.stringify(transcript),
    })
  },

  getTranscripts(token: string) {
    return apiFetch<Record<string, unknown>[]>('/transcripts', { token })
  },

  rateTranscript(token: string, transcriptId: string, rating: number, feedback?: string) {
    return apiFetch<{ ok: boolean }>(`/transcripts/${transcriptId}/rating`, {
      method: 'PUT',
      token,
      body: JSON.stringify({ playerRating: rating, playerFeedback: feedback }),
    })
  },
}
