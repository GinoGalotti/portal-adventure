/// <reference types="@cloudflare/workers-types" />

import { signJwt, authenticate } from './auth'
import { handleAIGM } from './ai'

export interface Env {
  DB: D1Database
  AUTH_PASSWORDS: string  // JSON: { [username]: password }
  AUTH_JWT_SECRET: string
  ENVIRONMENT: string
  // AI GM (optional — defaults to disabled)
  AI_GM_ENABLED?: string
  AI_GM_URL?: string
  AI_GM_MODEL?: string
  AI_GM_KEY?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

function err(message: string, status: number): Response {
  return json({ error: message }, status)
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function handleLogin(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as { username?: string; password?: string }
  const { username, password } = body

  if (!username || !password) return err('username and password required', 400)

  const passwords: Record<string, string> = JSON.parse(env.AUTH_PASSWORDS)
  if (passwords[username] !== password) return err('Invalid credentials', 401)

  // Upsert user row (FK anchor for save_slots)
  const now = new Date().toISOString()
  await env.DB.prepare(`
    INSERT INTO users (id, username, password_hash, created_at, last_login)
    VALUES (?, ?, '', ?, ?)
    ON CONFLICT(username) DO UPDATE SET last_login = excluded.last_login
  `).bind(username, username, now, now).run()

  const token = await signJwt(username, env.AUTH_JWT_SECRET)
  return json({ token, userId: username })
}

// ─── Save Slots ───────────────────────────────────────────────────────────────

async function handleListSaves(request: Request, env: Env): Promise<Response> {
  const userId = await authenticate(request, env.AUTH_JWT_SECRET)
  if (!userId) return err('Unauthorized', 401)

  const { results } = await env.DB.prepare(`
    SELECT id, slot_number, name, created_at, updated_at, seed
    FROM save_slots WHERE user_id = ? ORDER BY slot_number
  `).bind(userId).all()

  // Map D1 snake_case columns to frontend camelCase
  const mapped = results.map((r: Record<string, unknown>) => ({
    id: r.id,
    slotNumber: r.slot_number,
    name: r.name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    seed: r.seed,
  }))

  return json(mapped)
}

async function handleCreateSave(request: Request, env: Env): Promise<Response> {
  const userId = await authenticate(request, env.AUTH_JWT_SECRET)
  if (!userId) return err('Unauthorized', 401)

  const { results } = await env.DB.prepare(
    'SELECT slot_number FROM save_slots WHERE user_id = ? ORDER BY slot_number'
  ).bind(userId).all()

  if (results.length >= 3) return err('Maximum 3 save slots reached', 400)

  const body = await request.json() as { name?: string; seed?: string; slotNumber?: number }
  const { name = 'New Game', seed, slotNumber } = body
  if (!seed) return err('seed required', 400)

  // Pick first available slot number 1-3
  const taken = new Set(results.map(r => (r as { slot_number: number }).slot_number))
  const slot = slotNumber ?? ([1, 2, 3].find(n => !taken.has(n)) ?? 1)

  if (taken.has(slot)) return err(`Slot ${slot} already in use`, 400)

  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await env.DB.prepare(`
    INSERT INTO save_slots (id, user_id, slot_number, name, created_at, updated_at, seed, game_state)
    VALUES (?, ?, ?, ?, ?, ?, ?, '{}')
  `).bind(id, userId, slot, name, now, now, seed).run()

  return json({ id, userId, slotNumber: slot, name, createdAt: now, updatedAt: now, seed }, 201)
}

async function handleGetSave(request: Request, env: Env, slotId: string): Promise<Response> {
  const userId = await authenticate(request, env.AUTH_JWT_SECRET)
  if (!userId) return err('Unauthorized', 401)

  const slot = await env.DB.prepare(
    'SELECT * FROM save_slots WHERE id = ? AND user_id = ?'
  ).bind(slotId, userId).first()
  if (!slot) return err('Not found', 404)

  const { results: actionRows } = await env.DB.prepare(
    'SELECT action_data FROM action_logs WHERE slot_id = ? ORDER BY action_index'
  ).bind(slotId).all()

  const actions = actionRows.map(r => JSON.parse(r.action_data as string))
  return json({ ...slot, actions })
}

async function handleUpdateSave(request: Request, env: Env, slotId: string): Promise<Response> {
  const userId = await authenticate(request, env.AUTH_JWT_SECRET)
  if (!userId) return err('Unauthorized', 401)

  const exists = await env.DB.prepare(
    'SELECT id FROM save_slots WHERE id = ? AND user_id = ?'
  ).bind(slotId, userId).first()
  if (!exists) return err('Not found', 404)

  const body = await request.json() as { name?: string; gameState?: unknown }
  const now = new Date().toISOString()

  if (body.name !== undefined && body.gameState !== undefined) {
    await env.DB.prepare(
      'UPDATE save_slots SET name = ?, game_state = ?, updated_at = ? WHERE id = ?'
    ).bind(body.name, JSON.stringify(body.gameState), now, slotId).run()
  } else if (body.name !== undefined) {
    await env.DB.prepare(
      'UPDATE save_slots SET name = ?, updated_at = ? WHERE id = ?'
    ).bind(body.name, now, slotId).run()
  } else if (body.gameState !== undefined) {
    await env.DB.prepare(
      'UPDATE save_slots SET game_state = ?, updated_at = ? WHERE id = ?'
    ).bind(JSON.stringify(body.gameState), now, slotId).run()
  }

  return json({ ok: true })
}

async function handleDeleteSave(request: Request, env: Env, slotId: string): Promise<Response> {
  const userId = await authenticate(request, env.AUTH_JWT_SECRET)
  if (!userId) return err('Unauthorized', 401)

  const exists = await env.DB.prepare(
    'SELECT id FROM save_slots WHERE id = ? AND user_id = ?'
  ).bind(slotId, userId).first()
  if (!exists) return err('Not found', 404)

  await env.DB.batch([
    env.DB.prepare('DELETE FROM action_logs WHERE slot_id = ?').bind(slotId),
    env.DB.prepare('DELETE FROM save_slots WHERE id = ?').bind(slotId),
  ])

  return json({ ok: true })
}

async function handleDeleteSlotByNumber(request: Request, env: Env, slotNumber: number): Promise<Response> {
  const userId = await authenticate(request, env.AUTH_JWT_SECRET)
  if (!userId) return err('Unauthorized', 401)

  const slot = await env.DB.prepare(
    'SELECT id FROM save_slots WHERE user_id = ? AND slot_number = ?'
  ).bind(userId, slotNumber).first() as { id: string } | null
  if (!slot) return err('Slot not found', 404)

  await env.DB.batch([
    env.DB.prepare('DELETE FROM action_logs WHERE slot_id = ?').bind(slot.id),
    env.DB.prepare('DELETE FROM save_slots WHERE id = ?').bind(slot.id),
  ])

  return json({ ok: true })
}

// ─── Action Log ───────────────────────────────────────────────────────────────

async function handleAppendAction(request: Request, env: Env, slotId: string): Promise<Response> {
  const userId = await authenticate(request, env.AUTH_JWT_SECRET)
  if (!userId) return err('Unauthorized', 401)

  const exists = await env.DB.prepare(
    'SELECT id FROM save_slots WHERE id = ? AND user_id = ?'
  ).bind(slotId, userId).first()
  if (!exists) return err('Not found', 404)

  const body = await request.json() as {
    mysterySeed: string
    actionData: unknown
    stateSnapshot?: unknown
    gameState?: unknown
  }
  if (!body.mysterySeed || !body.actionData) return err('mysterySeed and actionData required', 400)

  const lastRow = await env.DB.prepare(
    'SELECT MAX(action_index) as last_idx FROM action_logs WHERE slot_id = ? AND mystery_seed = ?'
  ).bind(slotId, body.mysterySeed).first() as { last_idx: number | null }

  const nextIdx = (lastRow.last_idx ?? -1) + 1
  const now = new Date().toISOString()

  // Periodic snapshot every 20 actions
  const snapshot = nextIdx % 20 === 0 && body.stateSnapshot !== undefined
    ? JSON.stringify(body.stateSnapshot)
    : null

  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO action_logs (id, slot_id, mystery_seed, action_index, action_data, state_snapshot, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), slotId, body.mysterySeed, nextIdx,
      JSON.stringify(body.actionData), snapshot, now,
    ),
    env.DB.prepare(
      'UPDATE save_slots SET game_state = ?, updated_at = ? WHERE id = ?'
    ).bind(JSON.stringify(body.gameState ?? null), now, slotId),
  ])

  return json({ actionIndex: nextIdx }, 201)
}

// ─── Telemetry ────────────────────────────────────────────────────────────────

async function handleTelemetry(request: Request, env: Env): Promise<Response> {
  // Fire-and-forget: always 202, never block on errors
  try {
    const event = await request.json() as Record<string, unknown>
    await env.DB.prepare(`
      INSERT INTO telemetry_events
        (id, user_id, slot_id, mystery_seed, event_type, event_data,
         available_options, chosen_option, game_state_context, game_timestamp, wall_clock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      event.userId ?? '',
      event.slotId ?? null,
      event.mysterySeed ?? null,
      event.eventType ?? 'unknown',
      JSON.stringify(event.eventData ?? {}),
      JSON.stringify(event.availableOptions ?? null),
      event.chosenOption ?? null,
      JSON.stringify(event.context ?? null),
      event.gameTimestamp ?? null,
      new Date().toISOString(),
    ).run()
  } catch {
    // Telemetry never crashes the game
  }

  return new Response(null, { status: 202 })
}

// ─── Transcripts ─────────────────────────────────────────────────────────────

async function handleSaveTranscript(request: Request, env: Env): Promise<Response> {
  const userId = await authenticate(request, env.AUTH_JWT_SECRET)
  if (!userId) return err('Unauthorized', 401)

  const body = await request.json() as Record<string, unknown>
  const now = new Date().toISOString()

  await env.DB.prepare(`
    INSERT INTO confrontation_transcripts
      (id, user_id, slot_id, mystery_seed, mystery_id, entity_name, hunters,
       intel_level, ai_enabled, ai_model, turns, outcome, player_rating,
       player_feedback, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    userId,
    (body.slotId as string) ?? null,
    (body.mysterySeed as string) ?? '',
    (body.mysteryId as string) ?? '',
    (body.entity as string) ?? '',
    JSON.stringify(body.hunters ?? []),
    (body.intelLevel as string) ?? '',
    body.aiEnabled ? 1 : 0,
    (body.aiModel as string) ?? null,
    JSON.stringify(body.turns ?? []),
    (body.outcome as string) ?? '',
    (body.playerRating as number) ?? null,
    (body.playerFeedback as string) ?? null,
    now,
  ).run()

  return json({ ok: true }, 201)
}

async function handleGetTranscripts(request: Request, env: Env): Promise<Response> {
  const userId = await authenticate(request, env.AUTH_JWT_SECRET)
  if (!userId) return err('Unauthorized', 401)

  const { results } = await env.DB.prepare(
    'SELECT * FROM confrontation_transcripts WHERE user_id = ? ORDER BY created_at DESC LIMIT 20'
  ).bind(userId).all()

  return json(results)
}

async function handleUpdateTranscriptRating(request: Request, env: Env, transcriptId: string): Promise<Response> {
  const userId = await authenticate(request, env.AUTH_JWT_SECRET)
  if (!userId) return err('Unauthorized', 401)

  const body = await request.json() as { playerRating?: number; playerFeedback?: string }

  await env.DB.prepare(
    'UPDATE confrontation_transcripts SET player_rating = ?, player_feedback = ? WHERE id = ? AND user_id = ?'
  ).bind(body.playerRating ?? null, body.playerFeedback ?? null, transcriptId, userId).run()

  return json({ ok: true })
}

// ─── Router ───────────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)
    const method = request.method

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      })
    }

    if (!pathname.startsWith('/api/')) return new Response('Not found', { status: 404 })

    try {
      if (pathname === '/api/auth/login' && method === 'POST') return handleLogin(request, env)

      if (pathname === '/api/saves' && method === 'GET')  return handleListSaves(request, env)
      if (pathname === '/api/saves' && method === 'POST') return handleCreateSave(request, env)

      const slotNumMatch = pathname.match(/^\/api\/saves\/by-slot\/([1-3])$/)
      if (slotNumMatch && method === 'DELETE') return handleDeleteSlotByNumber(request, env, Number(slotNumMatch[1]))

      const saveMatch = pathname.match(/^\/api\/saves\/([^/]+)$/)
      if (saveMatch) {
        const [, slotId] = saveMatch
        if (method === 'GET')    return handleGetSave(request, env, slotId)
        if (method === 'PUT')    return handleUpdateSave(request, env, slotId)
        if (method === 'DELETE') return handleDeleteSave(request, env, slotId)
      }

      const actionMatch = pathname.match(/^\/api\/saves\/([^/]+)\/actions$/)
      if (actionMatch && method === 'POST') return handleAppendAction(request, env, actionMatch[1])

      if (pathname === '/api/telemetry' && method === 'POST') return handleTelemetry(request, env)

      if (pathname === '/api/transcripts' && method === 'POST') return handleSaveTranscript(request, env)
      if (pathname === '/api/transcripts' && method === 'GET')  return handleGetTranscripts(request, env)

      const transcriptMatch = pathname.match(/^\/api\/transcripts\/([^/]+)\/rating$/)
      if (transcriptMatch && method === 'PUT') return handleUpdateTranscriptRating(request, env, transcriptMatch[1])

      if (pathname === '/api/ai/gm') return handleAIGM(request, {
        AI_GM_ENABLED: env.AI_GM_ENABLED ?? 'false',
        AI_GM_URL: env.AI_GM_URL ?? '',
        AI_GM_MODEL: env.AI_GM_MODEL ?? '',
        AI_GM_KEY: env.AI_GM_KEY,
      })

      return err('Not found', 404)
    } catch {
      return err('Internal server error', 500)
    }
  },
}
