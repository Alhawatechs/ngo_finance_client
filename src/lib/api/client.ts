import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { clearAuthStorage, getStoredToken } from '@/lib/auth-storage'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
// Default 120s — ERP endpoints (reports, large lists) often exceed 30s on slow networks/servers.
// Override in .env.local: NEXT_PUBLIC_API_TIMEOUT_MS=180000
const API_TIMEOUT_MS = (() => {
  const raw = process.env.NEXT_PUBLIC_API_TIMEOUT_MS
  if (raw === undefined || raw === '') return 120000
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 120000
})()
// In browser: use relative path so requests go through Next.js proxy (avoids CORS, network errors)
const baseURL = typeof window !== 'undefined' ? '/api/v1' : API_URL
const SELECTED_OFFICE_ID_KEY = 'selected_office_id'

const apiClient: AxiosInstance = axios.create({
  baseURL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
})

let isRedirectingToLogin = false

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = getStoredToken()
      if (token) config.headers.Authorization = `Bearer ${token}`

      const officeId = localStorage.getItem(SELECTED_OFFICE_ID_KEY)
      if (officeId) config.headers['X-Office-Id'] = officeId

      // #region agent log
      const url = (config.url || '') as string
      if ((url.includes('grants') || url.includes('donors')) && !token) {
        fetch('http://127.0.0.1:7242/ingest/cdda7a83-fc55-4f20-b3c3-d1a82e77311d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'client.ts:request', message: 'Request to grants/donors without token', data: { url: config.url, hasToken: false }, timestamp: Date.now(), hypothesisId: 'H5' }) }).catch(() => {})
      }
      // #endregion
    }

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }
    return config
  },
  (error: AxiosError) => Promise.reject(error)
)

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; skipAuthRedirect?: boolean }
    const headers = originalRequest?.headers as Record<string, string> | undefined
    const skipByHeader = headers?.['X-Skip-Auth-Redirect'] === 'true' || headers?.['x-skip-auth-redirect'] === 'true'
    const skipAuthRedirect = originalRequest?.skipAuthRedirect === true || skipByHeader
    // #region agent log
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const hasAuth = !!(originalRequest?.headers && (originalRequest.headers as Record<string, string>)?.Authorization)
      const willRedirect = !originalRequest?._retry && !skipAuthRedirect && !isRedirectingToLogin
      try {
        localStorage.setItem('debug_401', JSON.stringify({ location: 'client.ts:401', message: '401 received', data: { url: originalRequest?.url, hasAuth, skipAuthRedirect, willRedirect }, timestamp: Date.now(), hypothesisId: 'H4' }))
      } catch (_) {}
      fetch('http://127.0.0.1:7242/ingest/cdda7a83-fc55-4f20-b3c3-d1a82e77311d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'client.ts:401', message: '401 received', data: { url: originalRequest?.url, hasAuth, skipAuthRedirect, willRedirect }, timestamp: Date.now(), hypothesisId: 'H4' }) }).catch(() => {})
    }
    // #endregion
    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !skipAuthRedirect &&
      !isRedirectingToLogin &&
      typeof window !== 'undefined'
    ) {
      isRedirectingToLogin = true
      clearAuthStorage()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data: T
}

export interface PaginatedResponse<T = unknown> {
  success: boolean
  message: string
  data: T[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

// Error handling
export interface ApiError {
  message: string
  errors?: Record<string, string[]>
}

export function handleApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError
    return apiError?.message || error.message || 'An error occurred'
  }
  return 'An unexpected error occurred'
}
