import apiClient, { ApiResponse } from './client'
import { User } from './auth'

export interface CreateUserData {
  name: string
  email: string
  password: string
  password_confirmation: string
  employee_id?: string
  phone?: string
  position?: string
  department?: string
  office_id: number | null
  can_manage_all_offices?: boolean
  roles: number[]
  approval_level?: number
  approval_limit?: number
  status?: 'active' | 'inactive' | 'suspended'
}

export interface UpdateUserData {
  name?: string
  email?: string
  password?: string
  password_confirmation?: string
  employee_id?: string
  phone?: string
  position?: string
  department?: string
  office_id?: number | null
  can_manage_all_offices?: boolean
  roles?: number[]
  approval_level?: number
  approval_limit?: number
  status?: 'active' | 'inactive' | 'suspended'
}

export interface UserFilters {
  search?: string
  status?: string
  office_id?: number
  role_id?: number
  page?: number
  per_page?: number
}

// Get all users (backend returns paginated: { data: User[], meta })
export async function getUsers(filters?: UserFilters): Promise<User[]> {
  const params = new URLSearchParams()
  params.append('per_page', String(filters?.per_page ?? 500))

  if (filters?.search) params.append('search', filters.search)
  if (filters?.status) params.append('status', filters.status)
  if (filters?.office_id) params.append('office_id', filters.office_id.toString())
  if (filters?.role_id) params.append('role_id', filters.role_id.toString())
  if (filters?.page) params.append('page', filters.page.toString())

  const response = await apiClient.get<ApiResponse<User[]>>(`/users?${params.toString()}`)
  const data = response.data?.data
  return Array.isArray(data) ? data : []
}

// Get single user
export async function getUser(id: number): Promise<User> {
  const response = await apiClient.get<ApiResponse<User>>(`/users/${id}`)
  return response.data.data
}

// Create user
export async function createUser(data: CreateUserData): Promise<User> {
  const response = await apiClient.post<ApiResponse<User>>('/users', data)
  return response.data.data
}

// Update user
export async function updateUser(id: number, data: UpdateUserData): Promise<User> {
  const response = await apiClient.put<ApiResponse<User>>(`/users/${id}`, data)
  return response.data.data
}

// Delete user
export async function deleteUser(id: number): Promise<void> {
  await apiClient.delete(`/users/${id}`)
}

// Activate user
export async function activateUser(id: number): Promise<User> {
  const response = await apiClient.post<ApiResponse<User>>(`/users/${id}/activate`)
  return response.data.data
}

// Deactivate user
export async function deactivateUser(id: number): Promise<User> {
  const response = await apiClient.post<ApiResponse<User>>(`/users/${id}/deactivate`)
  return response.data.data
}
