/**
 * Sound manager stub.
 * Hook architecture: game actions dispatch sound events here.
 * Audio files connected in post-MVP phase.
 */

export type SoundEvent =
  | 'clue_found'
  | 'roll_dice'
  | 'luck_spent'
  | 'harm_taken'
  | 'hunter_dead'
  | 'countdown_advance'
  | 'mystery_complete'
  | 'mystery_fail'
  | 'location_enter'
  | 'button_click'
  | 'terminal_type'

type SoundHandler = (event: SoundEvent) => void

const handlers: SoundHandler[] = []

export const sound = {
  on(handler: SoundHandler): void {
    handlers.push(handler)
  },

  play(event: SoundEvent): void {
    for (const handler of handlers) {
      try {
        handler(event)
      } catch {
        // Sound never crashes the game
      }
    }
  },

  off(handler: SoundHandler): void {
    const idx = handlers.indexOf(handler)
    if (idx !== -1) handlers.splice(idx, 1)
  },
}
