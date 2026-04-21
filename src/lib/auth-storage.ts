/**
 * Centralized auth storage - single source of truth for clearing auth state.
 * Prevents login/logout blink loop and keeps API client, auth store, and auth API in sync.
 */

const AUTH_STORAGE_KEYS = [
  'token',
  'user',
  'auth-storage',
  'selected_office_id',
] as const

/** Clear all auth-related localStorage. Call on 401 or explicit logout. */
export function clearAuthStorage(): void {
  if (typeof window === 'undefined') return
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key))
}

/** Get token from localStorage. Checks both 'token' and auth-storage for compatibility. */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem('token')
  if (token) return token
  try {
    const stored = localStorage.getItem('auth-storage')
    if (stored) {
      const parsed = JSON.parse(stored) as { state?: { token?: string } }
      return parsed?.state?.token ?? null
    }
  } catch {
    /* ignore */
  }
  return null
}
