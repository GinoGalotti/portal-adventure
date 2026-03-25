/**
 * Cloudflare Worker entry point.
 * Routes defined in Phase E when auth, save, and telemetry endpoints are built.
 */

export interface Env {
  DB: D1Database
}

export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'API not yet implemented' }), {
        status: 501,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response('Not found', { status: 404 })
  },
}
