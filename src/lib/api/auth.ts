import apiClient, { ApiResponse } from './client'
import { clearAuthStorage } from '@/lib/auth-storage'

export interface User {
  id: number
  /** Mirrors backend hasRole('super-admin'); use when roles[] is missing from persisted auth */
  is_super_admin?: boolean
  name: string
  email: string
  phone?: string
  position?: string
  department?: string
  employee_id?: string
  status: 'active' | 'inactive' | 'suspended'
  office_id?: number | null
  can_manage_all_offices?: boolean
  approval_level?: number
  /** Max base-currency amount this user may approve; null means no limit. */
  approval_limit?: number | null
  avatar_url?: string
  initials: string
  last_login_at?: string
  organization?: {
    id: number
    name: string
    short_name: string
  }
  office?: {
    id: number
    name: string
    code: string
  }
  roles: Array<{
    id: number
    name: string
    display_name: string
  }>
  permissions: string[]
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResponse {
  user: User
  token: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}

// Auth API functions
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', credentials)
  
  // Store token and user in localStorage
  localStorage.setItem('token', response.data.data.token)
  localStorage.setItem('user', JSON.stringify(response.data.data.user))
  
  return response.data.data
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout')
  } finally {
    clearAuthStorage()
  }
}

export async function getCurrentUser(): Promise<User> {
  const response = await apiClient.get<ApiResponse<User>>('/auth/me')
  return response.data.data
}

export async function updateProfile(data: Partial<Pick<User, 'name' | 'phone'>> | FormData): Promise<User> {
  const response = await apiClient.put<ApiResponse<User>>('/auth/profile', data)
  return response.data.data
}

export async function changePassword(data: {
  current_password: string
  password: string
  password_confirmation: string
}): Promise<void> {
  await apiClient.put('/auth/password', data)
}

/** Get stored auth state (SSR-safe) */
export function getStoredAuthState(): AuthState {
  if (typeof window === 'undefined') {
    return { user: null, token: null, isAuthenticated: false }
  }
  const token = localStorage.getItem('token')
  const userStr = localStorage.getItem('user')
  const user = userStr ? (JSON.parse(userStr) as User) : null
  return { user, token, isAuthenticated: !!token && !!user }
}
