import apiClient, { ApiResponse } from './client'

export interface OfficeKeyStaff {
  name: string
  role?: string
  email?: string
  phone?: string
}

export interface Office {
  id: number
  organization_id: number
  name: string
  code: string
  is_head_office: boolean
  address?: string
  city: string
  province?: string
  phone?: string
  email?: string
  manager_name?: string
  description?: string
  key_staff?: OfficeKeyStaff[]
  timezone?: string
  cost_center_prefix?: string
  operating_hours?: string
  is_active: boolean
  users_count?: number
  bank_accounts_count?: number
  cash_accounts_count?: number
  departments_count?: number
  vouchers_count?: number
  created_at: string
  updated_at: string
}

export interface CreateOfficeData {
  name: string
  code: string
  is_head_office?: boolean
  address?: string
  city: string
  province?: string
  phone?: string
  email?: string
  manager_name?: string
  description?: string
  key_staff?: OfficeKeyStaff[]
  timezone?: string
  cost_center_prefix?: string
  operating_hours?: string
  is_active?: boolean
}

export interface UpdateOfficeData {
  name?: string
  code?: string
  is_head_office?: boolean
  address?: string
  city?: string
  province?: string
  phone?: string
  email?: string
  manager_name?: string
  description?: string
  key_staff?: OfficeKeyStaff[]
  timezone?: string
  cost_center_prefix?: string
  operating_hours?: string
  is_active?: boolean
}

export async function getOffices(filters?: {
  search?: string
  is_active?: boolean
  per_page?: number
}): Promise<Office[]> {
  const params = new URLSearchParams()
  if (filters?.search) params.append('search', filters.search)
  if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString())
  if (filters?.per_page !== undefined) params.append('per_page', String(filters.per_page))
  const response = await apiClient.get<ApiResponse<Office[]>>(`/offices?${params.toString()}`)
  return response.data.data
}

export async function getOffice(id: number): Promise<Office> {
  const response = await apiClient.get<ApiResponse<Office>>(`/offices/${id}`)
  return response.data.data
}

export async function createOffice(data: CreateOfficeData): Promise<Office> {
  const response = await apiClient.post<ApiResponse<Office>>('/offices', data)
  return response.data.data
}

export async function updateOffice(id: number, data: UpdateOfficeData): Promise<Office> {
  const response = await apiClient.put<ApiResponse<Office>>(`/offices/${id}`, data)
  return response.data.data
}

export async function deleteOffice(id: number): Promise<void> {
  await apiClient.delete(`/offices/${id}`)
}
