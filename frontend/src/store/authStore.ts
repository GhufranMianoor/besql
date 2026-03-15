import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '../services/besqlApi'
import type { UserRole } from '../types'

interface AuthState {
  accessToken:  string | null
  refreshToken: string | null
  username:     string | null
  role:         UserRole | null
  isAuth:       boolean

  login:   (username: string, password: string) => Promise<void>
  register:(username: string, email: string, password: string) => Promise<void>
  refresh: () => Promise<void>
  logout:  () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken:  null,
      refreshToken: null,
      username:     null,
      role:         null,
      isAuth:       false,

      login: async (username, password) => {
        const { data } = await authApi.login(username, password)
        set({
          accessToken:  data.accessToken,
          refreshToken: data.refreshToken,
          username:     data.username,
          role:         data.role as UserRole,
          isAuth:       true,
        })
      },

      register: async (username, email, password) => {
        const { data } = await authApi.register(username, email, password)
        set({
          accessToken:  data.accessToken,
          refreshToken: data.refreshToken,
          username:     data.username,
          role:         data.role as UserRole,
          isAuth:       true,
        })
      },

      refresh: async () => {
        const rt = get().refreshToken
        if (!rt) throw new Error('No refresh token')
        const { data } = await authApi.refresh(rt)
        set({ accessToken: data.accessToken, refreshToken: data.refreshToken })
      },

      logout: () => {
        set({ accessToken: null, refreshToken: null, username: null, role: null, isAuth: false })
      },
    }),
    { name: 'besql-auth', partialize: (s) => ({ refreshToken: s.refreshToken, username: s.username, role: s.role }) }
  )
)
