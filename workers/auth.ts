/// <reference types="@cloudflare/workers-types" />

export interface JwtPayload {
  sub: string  // userId (username)
  iat: number
  exp: number
}

function b64urlEncode(data: string | ArrayBuffer): string {
  const str = typeof data === 'string'
    ? data
    : String.fromCharCode(...new Uint8Array(data))
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function b64urlDecode(str: string): string {
  return atob(str.replace(/-/g, '+').replace(/_/g, '/'))
}

async function getHmacKey(secret: string, usage: 'sign' | 'verify'): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage],
  )
}

export async function signJwt(userId: string, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload: JwtPayload = { sub: userId, iat: now, exp: now + 60 * 60 * 24 * 30 } // 30 days

  const header = b64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body   = b64urlEncode(JSON.stringify(payload))
  const input  = `${header}.${body}`

  const key = await getHmacKey(secret, 'sign')
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(input))

  return `${input}.${b64urlEncode(sig)}`
}

export async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [header, body, sig] = parts
  const input = `${header}.${body}`

  try {
    const key = await getHmacKey(secret, 'verify')
    const sigBytes = Uint8Array.from(b64urlDecode(sig), c => c.charCodeAt(0))
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(input))
    if (!valid) return null

    const payload: JwtPayload = JSON.parse(b64urlDecode(body))
    if (payload.exp < Math.floor(Date.now() / 1000)) return null

    return payload
  } catch {
    return null
  }
}

/** Extract and verify Bearer token from Authorization header. Returns userId or null. */
export async function authenticate(request: Request, secret: string): Promise<string | null> {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const payload = await verifyJwt(auth.slice(7), secret)
  return payload?.sub ?? null
}
