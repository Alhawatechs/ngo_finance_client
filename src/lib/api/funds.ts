import apiClient from './client'

export interface Fund {
  id: number
  organization_id: number
  fund_code: string
  fund_name: string
  fund_type: 'restricted' | 'unrestricted' | 'temporarily_restricted' | 'endowment'
  donor_id: number | null
  grant_id: number | null
  description: string | null
  start_date: string | null
  end_date: string | null
  total_amount: number
  current_balance: number
  currency: string
  restrictions: string | null
  is_active: boolean
  donor?: { id: number; code: string; name: string }
  grant?: { id: number; grant_code: string; grant_name: string }
  created_at: string
  updated_at: string
}

export interface FundFormData {
  fund_code: string
  fund_name: string
  fund_type: 'restricted' | 'unrestricted' | 'temporarily_restricted' | 'endowment'
  donor_id?: number
  grant_id?: number
  description?: string
  start_date?: string
  end_date?: string
  total_amount?: number
  currency: string
  restrictions?: string
}

// Fund APIs
export async function getFunds(params?: { page?: number; per_page?: number; fund_type?: string; is_active?: boolean; search?: string }) {
  const response = await apiClient.get('/funds', { params })
  return response.data
}

export async function getFund(id: number) {
  const response = await apiClient.get(`/funds/${id}`)
  return response.data
}

export async function createFund(data: FundFormData) {
  const response = await apiClient.post('/funds', data)
  return response.data
}

export async function updateFund(id: number, data: Partial<FundFormData & { is_active: boolean }>) {
  const response = await apiClient.put(`/funds/${id}`, data)
  return response.data
}

export async function deleteFund(id: number) {
  const response = await apiClient.delete(`/funds/${id}`)
  return response.data
}

export async function getFundBalances() {
  const response = await apiClient.get('/funds/balances')
  return response.data
}

export async function getFundStatement(id: number, params: { start_date: string; end_date: string }) {
  const response = await apiClient.get(`/funds/${id}/statement`, { params })
  return response.data
}

export async function getFundSummary() {
  const response = await apiClient.get('/funds/summary')
  return response.data
}

// Fund requests (donor fund requests)
export interface FundRequest {
  id: number
  organization_id: number
  grant_id: number
  project_id: number | null
  request_number: string
  request_date: string
  request_type: 'dct' | 'reimbursement' | 'advance' | 'other'
  description: string
  currency: string
  requested_amount: number
  approved_amount: number | null
  received_amount: number
  status: string
  expected_receipt_date: string | null
  received_date: string | null
  grant?: { id: number; grant_code: string; grant_name: string }
  project?: { id: number; project_code: string; project_name: string } | null
  creator?: { id: number; name: string }
  created_at: string
  updated_at: string
}

export interface FundRequestFormData {
  grant_id: number
  project_id?: number
  request_date: string
  request_type: 'dct' | 'reimbursement' | 'advance' | 'other'
  description: string
  currency: string
  requested_amount: number
  expected_receipt_date?: string
}

export async function getFundRequests(params?: { page?: number; per_page?: number; grant_id?: number; status?: string; from?: string; to?: string }) {
  const response = await apiClient.get('/fund-requests', { params })
  return response.data
}

export async function createFundRequest(data: FundRequestFormData) {
  const response = await apiClient.post('/fund-requests', data)
  return response.data
}

export async function getFundRequest(id: number) {
  const response = await apiClient.get(`/fund-requests/${id}`)
  return response.data
}

export async function submitFundRequest(id: number) {
  const response = await apiClient.post(`/fund-requests/${id}/submit`)
  return response.data
}

export function getFundRequestTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    dct: 'Direct Cash Transfer',
    reimbursement: 'Reimbursement',
    advance: 'Advance',
    other: 'Other',
  }
  return labels[type] || type
}

export function getFundRequestStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    submitted: 'bg-emerald-100 text-emerald-800',
    under_review: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    partially_received: 'bg-cyan-100 text-cyan-700',
    received: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-600',
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

// Helper functions
export function getFundTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    restricted: 'Restricted',
    unrestricted: 'Unrestricted',
    temporarily_restricted: 'Temporarily Restricted',
    endowment: 'Endowment',
  }
  return labels[type] || type
}

export function getFundTypeColor(type: string): string {
  const colors: Record<string, string> = {
    restricted: 'bg-red-100 text-red-700',
    unrestricted: 'bg-green-100 text-green-700',
    temporarily_restricted: 'bg-yellow-100 text-yellow-700',
    endowment: 'bg-purple-100 text-purple-700',
  }
  return colors[type] || 'bg-gray-100 text-gray-700'
}

export function getFundTypeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    restricted: 'Funds with donor-imposed restrictions that must be used for specific purposes',
    unrestricted: 'Funds available for general use without donor restrictions',
    temporarily_restricted: 'Funds with time or purpose restrictions that will eventually be released',
    endowment: 'Funds where the principal must be maintained in perpetuity',
  }
  return descriptions[type] || ''
}
