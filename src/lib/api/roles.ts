import apiClient, { ApiResponse } from './client'

export interface Permission {
  id: number
  name: string
  display_name: string
  description?: string
  module: string
  guard_name: string
  created_at: string
  updated_at: string
}

export interface Role {
  id: number
  organization_id: number
  office_id?: number | null
  name: string
  display_name: string
  description?: string
  guard_name: string
  is_system: boolean
  permissions_count?: number
  users_count?: number
  permissions?: Permission[]
  office?: { id: number; name: string; code: string }
  created_at: string
  updated_at: string
}

export interface CreateRoleData {
  name: string
  display_name: string
  description?: string
  office_id?: number | null
  permissions?: number[]
}

export interface UpdateRoleData {
  name?: string
  display_name?: string
  description?: string
  office_id?: number | null
  permissions?: number[]
}

export interface PermissionsResponse {
  permissions: Permission[]
  grouped: Record<string, Permission[]>
  modules: string[]
}

// Get all roles
export async function getRoles(filters?: { search?: string; is_system?: boolean; office_id?: number }): Promise<Role[]> {
  const params = new URLSearchParams()
  
  if (filters?.search) params.append('search', filters.search)
  if (filters?.is_system !== undefined) params.append('is_system', filters.is_system.toString())
  if (filters?.office_id !== undefined) params.append('office_id', filters.office_id.toString())
  
  const response = await apiClient.get<ApiResponse<Role[]>>(`/roles?${params.toString()}`)
  return response.data.data
}

// Get single role
export async function getRole(id: number): Promise<Role> {
  const response = await apiClient.get<ApiResponse<Role>>(`/roles/${id}`)
  return response.data.data
}

// Create role
export async function createRole(data: CreateRoleData): Promise<Role> {
  const response = await apiClient.post<ApiResponse<Role>>('/roles', data)
  return response.data.data
}

// Update role
export async function updateRole(id: number, data: UpdateRoleData): Promise<Role> {
  const response = await apiClient.put<ApiResponse<Role>>(`/roles/${id}`, data)
  return response.data.data
}

// Delete role
export async function deleteRole(id: number): Promise<void> {
  await apiClient.delete(`/roles/${id}`)
}

// Assign permissions to role
export async function assignPermissions(roleId: number, permissions: number[]): Promise<Role> {
  const response = await apiClient.post<ApiResponse<Role>>(`/roles/${roleId}/permissions`, { permissions })
  return response.data.data
}

// Get all permissions
export async function getPermissions(filters?: { module?: string; search?: string }): Promise<PermissionsResponse> {
  const params = new URLSearchParams()
  
  if (filters?.module) params.append('module', filters.module)
  if (filters?.search) params.append('search', filters.search)
  
  const response = await apiClient.get<ApiResponse<PermissionsResponse>>(`/permissions?${params.toString()}`)
  return response.data.data
}

// Access Matrix (role-permission mapping for audit)
export interface AccessMatrixData {
  roles: {
    id: number
    name: string
    display_name: string
    description?: string
    is_system: boolean
    users_count: number
    permission_ids: number[]
  }[]
  permissions: {
    id: number
    name: string
    display_name: string
    module: string
  }[]
  permissions_by_module: Record<string, { id: number; name: string; display_name: string }[]>
  modules: string[]
}

export async function getAccessMatrix(): Promise<AccessMatrixData> {
  const response = await apiClient.get<ApiResponse<AccessMatrixData>>('/access-matrix')
  return response.data.data
}
