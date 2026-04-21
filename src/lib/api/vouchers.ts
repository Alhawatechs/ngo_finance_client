import apiClient from './client'
import { Voucher, VoucherLine, VoucherApproval } from '@/types'

export interface VoucherListParams {
  page?: number
  per_page?: number
  status?: string
  voucher_type?: string
  office_id?: number
  project_id?: number
  /** GL journal book id — list vouchers posted into that book */
  journal_id?: number
  from_date?: string
  to_date?: string
  search?: string
  sort_by?: string
  sort_dir?: 'asc' | 'desc'
}

export interface VoucherLineInput {
  id?: number
  account_id: number
  fund_id?: number | null
  project_id?: number | null
  description?: string
  debit_amount: number
  credit_amount: number
  cost_center?: string
  project_account_code?: string
}

export interface VoucherFormData {
  office_id: number
  project_id?: number | null
  /** When set (e.g. New voucher from a journal book), posted GL entry is stored under this book. */
  journal_id?: number | null
  fund_id?: number | null
  /** Coding Block: province code 2 digits (e.g. 01, 24) */
  province_code?: string | null
  /** Coding Block: location 1=Main Office, 2=Sub-Office, 3=Health Facilities */
  location_code?: string | null
  /** Optional custom voucher number; must be unique. If empty, server auto-generates. */
  voucher_number?: string | null
  voucher_type: 'payment' | 'receipt' | 'journal' | 'contra'
  voucher_date: string
  payee_name?: string
  description: string
  currency: string
  exchange_rate?: number
  payment_method?: 'cash' | 'check' | 'bank_transfer' | 'mobile_money' | 'msp'
  check_number?: string
  bank_reference?: string
  lines: VoucherLineInput[]
}

/** Coding Block format component (e.g. Project Code, Province Code) */
export interface CodingBlockComponent {
  name: string
  length: number
  description: string
  example: string
}

/** Full Coding Block format specification */
export interface CodingBlockFormatSpec {
  description: string
  pattern: string
  example: string
  components: CodingBlockComponent[]
  month_codes?: Record<number, string>
}

/** Coding Block options and format spec for voucher number */
export interface CodingBlockOptions {
  format?: CodingBlockFormatSpec
  provinces: Array<{ name: string; code: string }>
  locations: Array<{ name: string; code: string }>
}

/** Get full Coding Block spec + options (provinces, locations). Pass location_code (1, 2, 3) for location-specific options. */
export async function getCodingBlockOptions(params?: { location_code?: string }): Promise<{ data: CodingBlockOptions }> {
  const response = await apiClient.get('/coding-block', { params })
  const data = response.data?.data ?? response.data
  return { data: data as CodingBlockOptions }
}

/** Single location coding block config (provinces, locations, month_codes). */
export interface CodingBlockLocationConfig {
  provinces: Array<{ name: string; code: string }>
  locations: Array<{ name: string; code: string }>
  month_codes: Record<number, string>
}

/** Coding block config for settings: suggested, current, location_options, format_spec, sample_voucher_numbers. */
export interface CodingBlockConfigResponse {
  suggested: CodingBlockLocationConfig
  current: {
    by_location?: Record<string, CodingBlockLocationConfig>
    provinces?: Array<{ name: string; code: string }>
    locations?: Array<{ name: string; code: string }>
    month_codes?: Record<number, string>
  } | null
  /** Main office (1) and sub offices (2, 3, ...) for per-location coding. */
  location_options?: Array<{ code: string; name: string }>
  format_spec?: CodingBlockFormatSpec
  /** Sample voucher numbers by location code (e.g. { "1": "0A01A261A01", "2": "0A01A262A01" }). */
  sample_voucher_numbers?: Record<string, string>
}

export async function getCodingBlockConfig(): Promise<{ data: CodingBlockConfigResponse }> {
  const response = await apiClient.get('/coding-block/config')
  const data = response.data?.data ?? response.data
  return { data: data as CodingBlockConfigResponse }
}

export interface CodingBlockConfigUpdate {
  use_suggested?: boolean
  /** Legacy: single config for all locations */
  provinces?: Array<{ name: string; code: string }>
  locations?: Array<{ name: string; code: string }>
  month_codes?: Record<number, string>
  /** Per-location config. When saving main office (1), set apply_main_to_sub_offices to copy to sub offices. */
  by_location?: Record<string, CodingBlockLocationConfig>
  apply_main_to_sub_offices?: boolean
}

export async function updateCodingBlockConfig(
  payload: CodingBlockConfigUpdate
): Promise<{ data: { coding_block_config: CodingBlockConfigResponse['current']; message: string } }> {
  const response = await apiClient.put('/coding-block/config', payload)
  const data = response.data?.data ?? response.data
  return { data } as { data: { coding_block_config: CodingBlockConfigResponse['current']; message: string } }
}

export async function getNextVoucherNumberPreview(params: {
  project_id?: number | null
  voucher_date?: string | null
  office_id?: number | null
  voucher_type?: string
}): Promise<{ data: { next_voucher_number: string | null } }> {
  const response = await apiClient.get('/vouchers/next-number-preview', {
    params: {
      project_id: params.project_id ?? undefined,
      voucher_date: params.voucher_date ?? undefined,
      office_id: params.office_id ?? undefined,
      voucher_type: params.voucher_type ?? 'payment',
    },
  })
  return response.data
}

/** Check if a voucher number is available (unique) in the given office. For edit mode pass exclude_id. */
export async function checkVoucherNumberAvailable(params: {
  voucher_number: string
  office_id: number
  exclude_id?: number | null
}): Promise<{ data: { available: boolean } }> {
  const response = await apiClient.get('/vouchers/check-voucher-number', {
    params: {
      voucher_number: params.voucher_number?.trim() ?? '',
      office_id: params.office_id,
      exclude_id: params.exclude_id ?? undefined,
    },
  })
  return response.data
}

export interface ApprovalAction {
  comments?: string
}

export interface RejectAction {
  reason: string
}

// Get list of vouchers with pagination and filters
export async function getVouchers(params?: VoucherListParams) {
  const response = await apiClient.get('/vouchers', { params })
  return response.data
}

// Get a single voucher
export async function getVoucher(id: number) {
  const response = await apiClient.get(`/vouchers/${id}`)
  return response.data
}

/** Only keys the API validates and persists — avoids sending form-only fields (tax_amount, expenditure_account_id, etc.). */
function serializeVoucherPayload(data: VoucherFormData): Record<string, unknown> {
  const {
    office_id,
    project_id,
    journal_id,
    fund_id,
    province_code,
    location_code,
    voucher_number,
    voucher_type,
    voucher_date,
    payee_name,
    description,
    currency,
    exchange_rate,
    payment_method,
    check_number,
    bank_reference,
    lines,
  } = data

  const pc = typeof province_code === 'string' ? province_code.trim() : ''
  const lcRaw = location_code != null ? String(location_code).trim() : ''
  const cur = typeof currency === 'string' ? currency.trim().toUpperCase() : ''

  return {
    office_id,
    project_id: project_id ?? undefined,
    journal_id: journal_id ?? undefined,
    fund_id: fund_id ?? undefined,
    /** Backend expects size:2 when project is set; omit invalid values so office defaults can apply. */
    province_code: pc.length === 2 ? pc : undefined,
    location_code: lcRaw === '1' || lcRaw === '2' || lcRaw === '3' ? lcRaw : undefined,
    voucher_number: voucher_number?.trim() ? voucher_number.trim() : undefined,
    voucher_type,
    voucher_date,
    payee_name: payee_name?.trim() || undefined,
    description,
    /** Omit empty / partial codes so Laravel `nullable` + server default currency apply. */
    currency: cur.length === 3 ? cur : undefined,
    exchange_rate: exchange_rate ?? undefined,
    payment_method: payment_method ?? undefined,
    check_number: check_number?.trim() || undefined,
    bank_reference: bank_reference?.trim() || undefined,
    lines: lines.map((line) => ({
      ...line,
      debit_amount: Number(line.debit_amount) || 0,
      credit_amount: Number(line.credit_amount) || 0,
    })),
  }
}

// Create a new voucher
export async function createVoucher(data: VoucherFormData) {
  const response = await apiClient.post('/vouchers', serializeVoucherPayload(data))
  return response.data
}

// Update a voucher
export async function updateVoucher(id: number, data: Partial<VoucherFormData>) {
  const cleaned = { ...data } as Record<string, unknown>
  delete cleaned.expenditure_account_id
  delete cleaned.tax_amount
  const response = await apiClient.put(`/vouchers/${id}`, cleaned)
  return response.data
}

// Delete a voucher
export async function deleteVoucher(id: number) {
  const response = await apiClient.delete(`/vouchers/${id}`)
  return response.data
}

// Submit voucher for approval
export async function submitVoucher(id: number) {
  const response = await apiClient.post(`/vouchers/${id}/submit`)
  return response.data
}

// Approve a voucher
export async function approveVoucher(id: number, data?: ApprovalAction) {
  const response = await apiClient.post(`/vouchers/${id}/approve`, data)
  return response.data
}

// Reject a voucher
export async function rejectVoucher(id: number, data: RejectAction) {
  const response = await apiClient.post(`/vouchers/${id}/reject`, data)
  return response.data
}

// Get approval history
export async function getApprovalHistory(id: number) {
  const response = await apiClient.get(`/vouchers/${id}/approvals`)
  return response.data
}

// Get pending approvals for current user
export async function getPendingApprovals() {
  const response = await apiClient.get('/vouchers', { params: { status: 'pending_approval' } })
  return response.data
}

// Helper to get voucher type label
export function getVoucherTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    payment: 'Payment Voucher',
    receipt: 'Receipt Voucher',
    journal: 'Journal Voucher',
    contra: 'Contra Voucher',
  }
  return labels[type] || type
}

// Helper to get voucher type short code
export function getVoucherTypeCode(type: string): string {
  const codes: Record<string, string> = {
    payment: 'PV',
    receipt: 'RV',
    journal: 'JV',
    contra: 'CV',
  }
  return codes[type] || type
}

// Helper to get status badge color
export function getVoucherStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    submitted: 'bg-emerald-100 text-emerald-800',
    pending_approval: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    posted: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-200 text-gray-600',
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

// Helper to get payment method label
export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    cash: 'Cash',
    check: 'Check',
    bank_transfer: 'Bank Transfer',
    mobile_money: 'Mobile Money',
    msp: 'MSP (Money Service Provider)',
  }
  return labels[method] || method
}

/** L1–L4 finance control ladder (matches backend config `erp.approval.roles`). */
export const APPROVAL_LEVELS = [
  { level: 1, name: 'L1 Finance Controller', role: 'Finance Controller' },
  { level: 2, name: 'L2 Finance Manager', role: 'Finance Manager' },
  { level: 3, name: 'L3 Finance Director', role: 'Finance Director' },
  { level: 4, name: 'L4 General Director', role: 'General Director' },
]

export function getApprovalLevelName(level: number): string {
  const approval = APPROVAL_LEVELS.find(a => a.level === level)
  return approval?.name || `Level ${level}`
}

// Helper to validate voucher balance
export function validateVoucher(lines: VoucherLineInput[]): {
  isValid: boolean
  totalDebit: number
  totalCredit: number
  difference: number
} {
  const totalDebit = lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0)
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0)
  const difference = Math.abs(totalDebit - totalCredit)
  
  return {
    isValid: difference < 0.01 && Math.abs(totalDebit) > 0.000001,
    totalDebit,
    totalCredit,
    difference,
  }
}
