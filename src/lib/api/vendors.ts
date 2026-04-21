import apiClient from './client'

export interface Vendor {
  id: number
  organization_id: number
  vendor_code: string
  name: string
  vendor_type: 'supplier' | 'contractor' | 'consultant' | 'service_provider' | 'other'
  tax_id: string | null
  contact_person: string | null
  email: string | null
  phone: string | null
  mobile: string | null
  address: string | null
  city: string | null
  country: string | null
  bank_name: string | null
  bank_account_number: string | null
  bank_account_name: string | null
  payment_terms: string | null
  currency: string
  credit_limit: number | null
  current_balance: number
  ap_account_id: number | null
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface VendorInvoice {
  id: number
  organization_id: number
  office_id: number
  vendor_id: number
  project_id: number | null
  invoice_number: string
  vendor_invoice_number: string | null
  invoice_date: string
  due_date: string
  received_date: string | null
  description: string
  currency: string
  exchange_rate: number
  subtotal: number
  tax_amount: number
  total_amount: number
  paid_amount: number
  balance_due: number
  status: 'draft' | 'pending_approval' | 'approved' | 'partially_paid' | 'paid' | 'cancelled'
  voucher_id: number | null
  created_by: number
  vendor?: Vendor
  office?: { id: number; name: string }
  project?: { id: number; project_name: string }
  lines?: VendorInvoiceLine[]
}

export interface VendorInvoiceLine {
  id: number
  vendor_invoice_id: number
  account_id: number
  project_id: number | null
  fund_id: number | null
  line_number: number
  description: string
  quantity: number
  unit_price: number
  amount: number
  tax_rate: number
  tax_amount: number
  cost_center: string | null
  account?: { id: number; account_code: string; account_name: string }
}

export interface VendorFormData {
  name: string
  vendor_type: 'supplier' | 'contractor' | 'consultant' | 'service_provider' | 'other'
  tax_id?: string
  contact_person?: string
  email?: string
  phone?: string
  mobile?: string
  address?: string
  city?: string
  country?: string
  bank_name?: string
  bank_account_number?: string
  bank_account_name?: string
  payment_terms?: string
  currency: string
  credit_limit?: number
  ap_account_id?: number
  notes?: string
}

export interface VendorListParams {
  page?: number
  per_page?: number
  vendor_type?: string
  is_active?: boolean
  search?: string
}

// Vendor APIs
export async function getVendors(params?: VendorListParams) {
  const response = await apiClient.get('/payables/vendors', { params })
  return response.data
}

export async function getVendor(id: number) {
  const response = await apiClient.get(`/payables/vendors/${id}`)
  return response.data
}

export async function createVendor(data: VendorFormData) {
  const response = await apiClient.post('/payables/vendors', data)
  return response.data
}

export async function updateVendor(id: number, data: Partial<VendorFormData>) {
  const response = await apiClient.put(`/payables/vendors/${id}`, data)
  return response.data
}

export async function deleteVendor(id: number) {
  const response = await apiClient.delete(`/payables/vendors/${id}`)
  return response.data
}

export async function getVendorInvoices(vendorId: number, params?: { page?: number; per_page?: number; status?: string }) {
  const response = await apiClient.get(`/payables/vendors/${vendorId}/invoices`, { params })
  return response.data
}

export async function getVendorPayments(vendorId: number, params?: { page?: number; per_page?: number }) {
  const response = await apiClient.get(`/payables/vendors/${vendorId}/payments`, { params })
  return response.data
}

export async function getVendorSummary() {
  const response = await apiClient.get('/payables/vendors/summary')
  return response.data
}

// Helper functions
export function getVendorTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    supplier: 'Supplier',
    contractor: 'Contractor',
    consultant: 'Consultant',
    service_provider: 'Service Provider',
    other: 'Other',
  }
  return labels[type] || type
}

export function getVendorTypeColor(type: string): string {
  const colors: Record<string, string> = {
    supplier: 'bg-emerald-100 text-emerald-800',
    contractor: 'bg-green-100 text-green-700',
    consultant: 'bg-purple-100 text-purple-700',
    service_provider: 'bg-orange-100 text-orange-700',
    other: 'bg-gray-100 text-gray-700',
  }
  return colors[type] || 'bg-gray-100 text-gray-700'
}

export function getInvoiceStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    pending_approval: 'Pending Approval',
    approved: 'Approved',
    partially_paid: 'Partially Paid',
    paid: 'Paid',
    cancelled: 'Cancelled',
  }
  return labels[status] || status
}

export function getInvoiceStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    pending_approval: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-emerald-100 text-emerald-800',
    partially_paid: 'bg-orange-100 text-orange-700',
    paid: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}
