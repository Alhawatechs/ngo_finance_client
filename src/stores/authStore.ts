import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, login as apiLogin, logout as apiLogout, LoginCredentials } from '@/lib/api/auth'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  isHydrated: boolean
  error: string | null
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  /** Clear session locally without API call (stops redirect loops, works when backend is down) */
  clearSession: () => void
  setUser: (user: User) => void
  clearError: () => void
  setHydrated: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isHydrated: false,
      error: null,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null })
        try {
          const response = await apiLogin(credentials)
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error: unknown) {
          let message = 'Login failed'
          if (error && typeof error === 'object' && 'response' in error) {
            const res = (error as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } } })
              .response
            const data = res?.data
            const status = res?.status
            if (status === 429) message = 'Too many login attempts. Please try again later.'
            else if (data?.message) message = data.message
            else if (data?.errors?.email?.[0]) message = data.errors.email[0]
          } else if (error instanceof Error) {
            message = error.message
          }
          set({ error: message, isLoading: false })
          throw error
        }
      },

      logout: async () => {
        set({ isLoading: true })
        try {
          await apiLogout()
        } finally {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          })
        }
      },

      clearSession: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        })
      },

      setUser: (user: User) => {
        set({ user, isAuthenticated: true })
      },

      clearError: () => {
        set({ error: null })
      },

      setHydrated: () => {
        set({ isHydrated: true })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      // Always mark hydrated when persist finishes (success or error). Do not rely on a short
      // timer in the layout — that can fire before merge and clear a valid session (infinite spinner).
      onRehydrateStorage: () => (state, error) => {
        if (error) console.warn('[auth-storage] rehydrate:', error)
        state?.setHydrated()
      },
    }
  )
)

// Permission check helper
export function useHasPermission(permission: string): boolean {
  const user = useAuthStore((state) => state.user)
  return user?.permissions?.includes(permission) ?? false
}

export function useHasAnyPermission(permissions: string[]): boolean {
  const user = useAuthStore((state) => state.user)
  return permissions.some((p) => user?.permissions?.includes(p))
}

export function useHasAllPermissions(permissions: string[]): boolean {
  const user = useAuthStore((state) => state.user)
  return permissions.every((p) => user?.permissions?.includes(p))
}
