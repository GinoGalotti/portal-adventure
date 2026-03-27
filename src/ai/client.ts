import type { AIGMContext, AIGMParseResult } from './types'
import { buildPrompt } from './prompts/confrontation-gm'
import { parseAIGMResponse } from './parser'

export interface AIGMClientOpts {
  workerBaseUrl: string
  token: string              // JWT — sent as Authorization header
  maxEntityHarm: number
  validCapabilityIds: string[]
  timeoutMs?: number         // default 10 000
}

/**
 * Calls the /api/ai/gm Worker proxy endpoint.
 *
 * The client builds the full prompt (system + user) from the AIGMContext,
 * sends it to the Worker (which adds the API key and forwards to Ollama/Groq),
 * then parses and validates the AI response.
 *
 * Returns null on any network failure, timeout, or upstream error so callers
 * can silently fall back to the keyword engine (Layer 0).
 */
export class AIGMClient {
  private timeoutMs: number

  constructor(private opts: AIGMClientOpts) {
    this.timeoutMs = opts.timeoutMs ?? 10_000
  }

  async interpret(context: AIGMContext): Promise<AIGMParseResult | null> {
    const { system, user } = buildPrompt(context)

    let response: Response
    try {
      response = await fetch(`${this.opts.workerBaseUrl}/api/ai/gm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.opts.token}`,
        },
        body: JSON.stringify({ system, user }),
        signal: AbortSignal.timeout(this.timeoutMs),
      })
    } catch {
      // Network error or timeout — silent fallback
      return null
    }

    if (!response.ok) return null

    let data: { content?: string }
    try {
      data = (await response.json()) as { content?: string }
    } catch {
      return null
    }

    if (!data.content) return null

    return parseAIGMResponse(data.content, {
      maxEntityHarm: this.opts.maxEntityHarm,
      validCapabilityIds: this.opts.validCapabilityIds,
    })
  }
}
