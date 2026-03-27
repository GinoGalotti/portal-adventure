import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  userId: string | null
  token: string | null
  login: (userId: string, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      token: null,
      login: (userId, token) => set({ userId, token }),
      logout: () => set({ userId: null, token: null }),
    }),
    { name: 'portal-auth' },
  ),
)
