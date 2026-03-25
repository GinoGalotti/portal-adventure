/**
 * Telemetry emitter stub.
 * Wired into action reducer in Phase E.
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
