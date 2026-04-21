import apiClient from './client'
import { Donor } from '@/types'

export type { Donor }

export interface DonorFormData {
  code: string
  name: string
  short_name?: string
  donor_type: 'bilateral' | 'multilateral' | 'foundation' | 'corporate' | 'individual' | 'government'
  contact_person?: string
  email?: string
  phone?: string
  address?: string
  country?: string
  website?: string
  reporting_currency: string
  reporting_frequency?: string
  notes?: string
  default_budget_format_id?: number | null
}

export interface DonorListParams {
  page?: number
  per_page?: number
  donor_type?: string
  is_active?: boolean
  search?: string
}

export interface Donation {
  id: number
  organization_id: number
  office_id: number
  donor_id: number
  grant_id: number | null
  project_id: number | null
  donation_number: string
  donation_date: string
  description: string
  currency: string
  amount: number
  exchange_rate: number
  base_amount: number
  donation_type: 'cash' | 'in_kind' | 'service'
  receipt_number: string | null
  bank_reference: string | null
  status: 'pending' | 'received' | 'acknowledged' | 'cancelled'
  donor?: Donor
  grant?: { id: number; grant_code: string; grant_name: string }
  project?: { id: number; project_code: string; project_name: string }
}

export interface DonationFormData {
  office_id: number
  donor_id: number
  grant_id?: number
  project_id?: number
  donation_date: string
  description: string
  currency: string
  amount: number
  exchange_rate?: number
  donation_type: 'cash' | 'in_kind' | 'service'
  receipt_number?: string
  bank_reference?: string
}

/** Optional request config (e.g. skipAuthRedirect to avoid redirect on 401). */
export interface ApiRequestConfig {
  skipAuthRedirect?: boolean
}

// Donor APIs
export async function getDonors(params?: DonorListParams, config?: ApiRequestConfig) {
  const response = await apiClient.get('/receivables/donors', {
    params,
    ...config,
    headers: { ...(config?.skipAuthRedirect && { 'X-Skip-Auth-Redirect': 'true' }) },
  })
  return response.data
}

export async function getDonor(id: number) {
  const response = await apiClient.get(`/receivables/donors/${id}`)
  return response.data
}

export async function createDonor(data: DonorFormData) {
  const response = await apiClient.post('/receivables/donors', data)
  return response.data
}

export async function updateDonor(id: number, data: Partial<DonorFormData>) {
  const response = await apiClient.put(`/receivables/donors/${id}`, data)
  return response.data
}

export async function deleteDonor(id: number) {
  const response = await apiClient.delete(`/receivables/donors/${id}`)
  return response.data
}

export async function getDonorGrants(donorId: number) {
  const response = await apiClient.get(`/receivables/donors/${donorId}/grants`)
  return response.data
}

export async function getDonorDonations(donorId: number, params?: { page?: number; per_page?: number }) {
  const response = await apiClient.get(`/receivables/donors/${donorId}/donations`, { params })
  return response.data
}

export interface Pledge {
  id: number
  donor_id: number
  grant_id: number | null
  pledge_number: string
  pledge_date: string
  description: string
  currency: string
  pledged_amount: number
  received_amount: number
  outstanding_amount: number
  expected_fulfillment_date: string | null
  status: string
  grant?: { id: number; grant_code: string; grant_name: string }
}

export async function getDonorPledges(donorId: number, params?: { page?: number; per_page?: number }) {
  const response = await apiClient.get(`/receivables/donors/${donorId}/pledges`, { params })
  return response.data
}

export async function getDonorSummary() {
  const response = await apiClient.get('/receivables/donors/summary')
  return response.data
}

// Donation APIs
export async function getDonations(params?: { page?: number; per_page?: number; donor_id?: number; status?: string }) {
  const response = await apiClient.get('/receivables/donations', { params })
  return response.data
}

export async function createDonation(data: DonationFormData) {
  const response = await apiClient.post('/receivables/donations', data)
  return response.data
}

export async function acknowledgeDonation(id: number) {
  const response = await apiClient.post(`/receivables/donations/${id}/acknowledge`)
  return response.data
}

// Helper functions
export function getDonorTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    bilateral: 'Bilateral',
    multilateral: 'Multilateral',
    foundation: 'Foundation',
    corporate: 'Corporate',
    individual: 'Individual',
    government: 'Government',
  }
  return labels[type] || type
}

export function getDonorTypeColor(type: string): string {
  const colors: Record<string, string> = {
    bilateral: 'bg-emerald-100 text-emerald-800',
    multilateral: 'bg-purple-100 text-purple-700',
    foundation: 'bg-green-100 text-green-700',
    corporate: 'bg-orange-100 text-orange-700',
    individual: 'bg-gray-100 text-gray-700',
    government: 'bg-red-100 text-red-700',
  }
  return colors[type] || 'bg-gray-100 text-gray-700'
}

export function getDonationStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    received: 'bg-emerald-100 text-emerald-800',
    acknowledged: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

export function getDonationTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    cash: 'Cash',
    in_kind: 'In-Kind',
    service: 'Service',
    pledge_payment: 'Pledge Payment',
    grant_disbursement: 'Grant Disbursement',
  }
  return labels[type] || type
}

// Common donors for NGO operations
export const COMMON_DONORS = [
  { name: 'UNICEF', type: 'multilateral', country: 'International' },
  { name: 'WHO', type: 'multilateral', country: 'International' },
  { name: 'UNHCR', type: 'multilateral', country: 'International' },
  { name: 'European Union', type: 'bilateral', country: 'Europe' },
  { name: 'USAID', type: 'bilateral', country: 'United States' },
  { name: 'DFID/FCDO', type: 'bilateral', country: 'United Kingdom' },
  { name: 'GIZ', type: 'bilateral', country: 'Germany' },
  { name: 'JICA', type: 'bilateral', country: 'Japan' },
  { name: 'World Bank', type: 'multilateral', country: 'International' },
  { name: 'Asian Development Bank', type: 'multilateral', country: 'Asia' },
]
