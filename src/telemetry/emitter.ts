/**
 * Telemetry emitter.
 * Call registerWorkerHandler(apiBase, getToken) once on app init to enable remote ingestion.
 * Fire-and-forget: never blocks gameplay.
 */
import type { TelemetryEvent } from '../engine/types'

type TelemetryHandler = (event: TelemetryEvent) => void

const handlers: TelemetryHandler[] = []

export const telemetry = {
  on(handler: TelemetryHandler): void {
    handlers.push(handler)
  },

  emit(event: TelemetryEvent): void {
    // Non-blocking: schedule after current call stack
    Promise.resolve().then(() => {
      for (const handler of handlers) {
        try {
          handler(event)
        } catch {
          // Telemetry never crashes the game
        }
      }
    })
  },

  off(handler: TelemetryHandler): void {
    const idx = handlers.indexOf(handler)
    if (idx !== -1) handlers.splice(idx, 1)
  },
}

/**
 * Register a fire-and-forget handler that POSTs events to the Worker.
 * Call once on app init after the user has authenticated.
 * Returns the registered handler so it can be removed on logout.
 */
export function registerWorkerHandler(
  apiBase: string,
  getToken: () => string | null,
): TelemetryHandler {
  const handler: TelemetryHandler = (event) => {
    const token = getToken()
    if (!token) return
    fetch(`${apiBase}/api/telemetry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(event),
    }).catch(() => { /* fire-and-forget */ })
  }
  telemetry.on(handler)
  return handler
}
