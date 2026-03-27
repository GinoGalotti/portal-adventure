/// <reference types="@cloudflare/workers-types" />

/**
 * AI GM proxy endpoint.
 *
 * Receives { system: string, user: string } from the frontend client,
 * adds the API key, and forwards to the configured AI provider
 * (Ollama locally, Groq/Together/Workers AI in production).
 *
 * The API key never leaves the Worker — it is never sent to the browser.
 * Provider switching is a config change, not a code change.
 */

export interface AIEnv {
  AI_GM_ENABLED: string   // 'true' | 'false'
  AI_GM_URL: string       // e.g. 'http://localhost:11434/v1' or 'https://api.groq.com/openai/v1'
  AI_GM_MODEL: string     // e.g. 'llama3.1:8b' or 'llama-3.1-8b-instant'
  AI_GM_KEY?: string      // secret — set via `npx wrangler secret put AI_GM_KEY`
}

interface ProxyRequestBody {
  system: string
  user: string
}

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string } }>
}

function jsonResponse(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

export async function handleAIGM(request: Request, env: AIEnv): Promise<Response> {
  // Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  if (env.AI_GM_ENABLED !== 'true') {
    return jsonResponse({ error: 'AI GM disabled' }, 503)
  }

  let body: ProxyRequestBody
  try {
    body = (await request.json()) as ProxyRequestBody
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  if (!body.system || !body.user) {
    return jsonResponse({ error: 'system and user fields required' }, 400)
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (env.AI_GM_KEY) {
    headers['Authorization'] = `Bearer ${env.AI_GM_KEY}`
  }

  let upstream: Response
  try {
    upstream = await fetch(`${env.AI_GM_URL}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: env.AI_GM_MODEL,
        messages: [
          { role: 'system', content: body.system },
          { role: 'user', content: body.user },
        ],
        temperature: 0.3,
        max_tokens: 600,
        response_format: { type: 'json_object' },
      }),
    })
  } catch {
    return jsonResponse({ error: 'AI provider unreachable' }, 503)
  }

  if (!upstream.ok) {
    return jsonResponse({ error: `AI provider error: ${upstream.status}` }, 502)
  }

  let data: OpenAIChatResponse
  try {
    data = (await upstream.json()) as OpenAIChatResponse
  } catch {
    return jsonResponse({ error: 'Invalid response from AI provider' }, 502)
  }

  const content = data.choices?.[0]?.message?.content ?? ''
  return jsonResponse({ content }, 200)
}
