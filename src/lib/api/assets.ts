import apiClient from './client'

export interface FixedAsset {
  id: number
  organization_id: number
  office_id: number
  category_id: number
  asset_code: string
  name: string
  description: string | null
  serial_number: string | null
  model: string | null
  manufacturer: string | null
  acquisition_date: string
  acquisition_cost: number
  currency: string
  current_value: number
  accumulated_depreciation: number
  useful_life_years: number
  salvage_value: number
  depreciation_method: 'straight_line' | 'declining_balance' | 'units_of_production'
  location: string | null
  custodian_id: number | null
  project_id: number | null
  fund_id: number | null
  warranty_expiry: string | null
  status: 'active' | 'inactive' | 'disposed' | 'transferred'
  last_depreciation_date: string | null
  office_name?: string
  category_name?: string
  created_at: string
}

export interface AssetCategory {
  id: number
  name: string
  description: string | null
  useful_life_years: number
  depreciation_method: string
}

export interface AssetFormData {
  office_id: number
  category_id: number
  name: string
  description?: string
  serial_number?: string
  model?: string
  manufacturer?: string
  acquisition_date: string
  acquisition_cost: number
  currency: string
  useful_life_years: number
  salvage_value?: number
  depreciation_method: 'straight_line' | 'declining_balance' | 'units_of_production'
  location?: string
  custodian_id?: number
  project_id?: number
  fund_id?: number
  warranty_expiry?: string
}

// Asset APIs
export async function getAssets(params?: { page?: number; per_page?: number; status?: string; office_id?: number; category_id?: number; search?: string }) {
  const response = await apiClient.get('/assets', { params })
  return response.data
}

export async function getAsset(id: number) {
  const response = await apiClient.get(`/assets/${id}`)
  return response.data
}

export async function createAsset(data: AssetFormData) {
  const response = await apiClient.post('/assets', data)
  return response.data
}

export async function updateAsset(id: number, data: Partial<AssetFormData & { status: string }>) {
  const response = await apiClient.put(`/assets/${id}`, data)
  return response.data
}

export async function deleteAsset(id: number) {
  const response = await apiClient.delete(`/assets/${id}`)
  return response.data
}

export async function calculateDepreciation(id: number, data: { depreciation_date: string; period: string }) {
  const response = await apiClient.post(`/assets/${id}/depreciate`, data)
  return response.data
}

export async function disposeAsset(id: number, data: { disposal_date: string; disposal_method: string; disposal_amount?: number; disposal_notes?: string }) {
  const response = await apiClient.post(`/assets/${id}/dispose`, data)
  return response.data
}

export async function getAssetCategories() {
  const response = await apiClient.get('/assets/categories')
  return response.data
}

export async function getAssetSummary() {
  const response = await apiClient.get('/assets/summary')
  return response.data
}

// Helper functions
export function getAssetStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Active',
    inactive: 'Inactive',
    disposed: 'Disposed',
    transferred: 'Transferred',
  }
  return labels[status] || status
}

export function getAssetStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-700',
    disposed: 'bg-red-100 text-red-700',
    transferred: 'bg-emerald-100 text-emerald-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

export function getDepreciationMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    straight_line: 'Straight Line',
    declining_balance: 'Declining Balance',
    units_of_production: 'Units of Production',
  }
  return labels[method] || method
}

export function calculateBookValue(cost: number, accumulatedDepreciation: number): number {
  return cost - accumulatedDepreciation
}

export function calculateDepreciationPercent(accumulated: number, cost: number, salvage: number): number {
  const depreciable = cost - salvage
  if (depreciable <= 0) return 100
  return Math.min(100, Math.round((accumulated / depreciable) * 100))
}
