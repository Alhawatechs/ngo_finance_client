import apiClient, { ApiResponse } from './client'

export interface Department {
  id: number
  organization_id: number
  office_id?: number | null
  code: string
  name: string
  description?: string
  parent_id?: number
  manager_id?: number
  is_active: boolean
  sort_order: number
  parent?: {
    id: number
    name: string
    code?: string
  }
  manager?: {
    id: number
    name: string
    email?: string
  }
  office?: {
    id: number
    name: string
    code?: string
  }
  children?: Department[]
  users_count?: number
  created_at: string
  updated_at: string
}

export interface CreateDepartmentData {
  code: string
  name: string
  description?: string
  office_id?: number | null
  parent_id?: number | null
  manager_id?: number | null
  is_active?: boolean
  sort_order?: number
}

export interface UpdateDepartmentData {
  code?: string
  name?: string
  description?: string
  office_id?: number | null
  parent_id?: number | null
  manager_id?: number | null
  is_active?: boolean
  sort_order?: number
}

// Get all departments
export async function getDepartments(filters?: { 
  search?: string
  is_active?: boolean
  root_only?: boolean
  office_id?: number | null
}): Promise<Department[]> {
  const params = new URLSearchParams()
  
  if (filters?.search) params.append('search', filters.search)
  if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString())
  if (filters?.root_only) params.append('root_only', 'true')
  if (filters?.office_id !== undefined && filters?.office_id !== null) params.append('office_id', filters.office_id.toString())
  if (filters?.office_id === null) params.append('office_id', '')
  
  const response = await apiClient.get<ApiResponse<Department[]>>(`/departments?${params.toString()}`)
  return response.data.data
}

// Get departments as tree
export async function getDepartmentsTree(): Promise<Department[]> {
  const response = await apiClient.get<ApiResponse<Department[]>>('/departments-tree')
  return response.data.data
}

// Get single department
export async function getDepartment(id: number): Promise<Department> {
  const response = await apiClient.get<ApiResponse<Department>>(`/departments/${id}`)
  return response.data.data
}

// Create department
export async function createDepartment(data: CreateDepartmentData): Promise<Department> {
  const response = await apiClient.post<ApiResponse<Department>>('/departments', data)
  return response.data.data
}

// Update department
export async function updateDepartment(id: number, data: UpdateDepartmentData): Promise<Department> {
  const response = await apiClient.put<ApiResponse<Department>>(`/departments/${id}`, data)
  return response.data.data
}

// Delete department
export async function deleteDepartment(id: number): Promise<void> {
  await apiClient.delete(`/departments/${id}`)
}

// Get users in department
export async function getDepartmentUsers(id: number): Promise<any[]> {
  const response = await apiClient.get<ApiResponse<any[]>>(`/departments/${id}/users`)
  return response.data.data
}
