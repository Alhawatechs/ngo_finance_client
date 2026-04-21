import apiClient from './client'

/**
 * Pre-fill for New voucher only when opened from a journal book (GL → Journal entries).
 * Not used from Finance → Vouchers → New voucher.
 * Project-linked books set `project_id`; organization-level books may only set office + province.
 */
/** Voucher header defaults stored on the journal book (central DB); applied when opening New voucher from this book. */
export interface JournalVoucherPrefill {
  /** Journal book id — sent on save so the posted GL entry is linked to this book. */
  journal_id: number
  project_id: number | null
  province_code: string | null
  office_id: number | null
  /** Coding-block location (1 main / 2–3 sub) when project-linked. */
  location_code: string | null
  /** No FK to office funds table — numeric id only. */
  fund_id: number | null
  currency: string | null
  exchange_rate: number | null
  voucher_type: string | null
  payment_method: string | null
  default_payee_name: string | null
  voucher_description_template: string | null
}

export interface Journal {
  id: number
  organization_id: number
  project_id: number | null
  office_id: number | null
  province_code: string | null
  location_code?: string | null
  fund_id?: number | null
  currency?: string | null
  exchange_rate?: string | number | null
  voucher_type?: string | null
  payment_method?: string | null
  default_payee_name?: string | null
  voucher_description_template?: string | null
  name: string
  code: string
  is_active: boolean
  created_at: string
  updated_at: string
  project?: {
    id: number
    project_code: string
    project_name: string
  } | null
  office?: {
    id: number
    name: string
    code: string
    is_head_office?: boolean
  } | null
  /** Sum of posted entries' total_debit */
  total_debit?: number
  /** Sum of posted entries' total_credit */
  total_credit?: number
  /** total_debit - total_credit (from posted entries) */
  balance?: number
  deleted_at?: string | null
}

/** Build prefill from API journal row (single source of truth for journal → voucher header). */
export function journalToVoucherPrefill(journal: Journal | null): JournalVoucherPrefill | null {
  if (!journal?.id) return null
  const projectId = journal.project_id ?? journal.project?.id ?? null
  const officeId = journal.office_id ?? journal.office?.id ?? null
  const province = journal.province_code?.trim() ? journal.province_code.trim() : null
  const hasProject = projectId != null && projectId > 0
  const hasOffice = officeId != null && officeId > 0
  const rawEr = journal.exchange_rate
  const er =
    rawEr != null && rawEr !== ''
      ? typeof rawEr === 'number'
        ? rawEr
        : parseFloat(String(rawEr))
      : null
  const exchangeRate = er != null && !Number.isNaN(er) && er >= 0 ? er : null

  return {
    journal_id: journal.id,
    project_id: hasProject ? projectId : null,
    province_code: province,
    office_id: hasOffice ? officeId : null,
    location_code: journal.location_code?.trim() ? journal.location_code.trim() : null,
    fund_id: journal.fund_id != null && journal.fund_id > 0 ? journal.fund_id : null,
    currency: journal.currency?.trim() ? journal.currency.trim().toUpperCase() : null,
    exchange_rate: exchangeRate,
    voucher_type: journal.voucher_type?.trim() ? journal.voucher_type.trim() : null,
    payment_method: journal.payment_method?.trim() ? journal.payment_method.trim() : null,
    default_payee_name: journal.default_payee_name?.trim() ? journal.default_payee_name.trim() : null,
    voucher_description_template: journal.voucher_description_template?.trim()
      ? journal.voucher_description_template.trim()
      : null,
  }
}

export interface JournalListParams {
  page?: number
  per_page?: number
  project_id?: number
  office_id?: number
  is_active?: boolean
  search?: string
  /** When true, list soft-deleted books (requires delete-journal-books on the API). */
  only_trashed?: boolean
}

export interface CreateJournalInput {
  name: string
  code: string
  project_id?: number | null
  office_id?: number | null
  province_code?: string | null
  location_code?: string | null
  fund_id?: number | null
  currency?: string | null
  exchange_rate?: number | null
  voucher_type?: string | null
  payment_method?: string | null
  default_payee_name?: string | null
  voucher_description_template?: string | null
  is_active?: boolean
}

export interface UpdateJournalInput {
  name?: string
  code?: string
  project_id?: number | null
  office_id?: number | null
  province_code?: string | null
  location_code?: string | null
  fund_id?: number | null
  currency?: string | null
  exchange_rate?: number | null
  voucher_type?: string | null
  payment_method?: string | null
  default_payee_name?: string | null
  voucher_description_template?: string | null
  is_active?: boolean
}

export interface ProvinceOption {
  name: string
  code: string
}

export interface JournalProvincesResponse {
  provinces: ProvinceOption[]
  locations: { name: string; code: string }[]
}

export async function getJournalProvinces(): Promise<JournalProvincesResponse> {
  const response = await apiClient.get('/journals/provinces')
  const data = response.data?.data ?? response.data
  return {
    provinces: data?.provinces ?? [],
    locations: data?.locations ?? [],
  }
}

export async function getJournals(params?: JournalListParams) {
  const response = await apiClient.get('/journals', { params })
  return response.data
}

/** Single journal row (unwraps standard `{ success, message, data }` envelope). */
export async function getJournal(id: number): Promise<Journal | null> {
  const response = await apiClient.get(`/journals/${id}`)
  const body = response.data as { data?: Journal | null; success?: boolean } | null | undefined
  if (!body || typeof body !== 'object') return null
  if ('data' in body && body.data != null && typeof body.data === 'object' && 'id' in body.data) {
    return body.data as Journal
  }
  if ('id' in body && 'organization_id' in body && !('success' in body)) {
    return body as unknown as Journal
  }
  return null
}

export async function createJournal(data: CreateJournalInput) {
  const response = await apiClient.post('/journals', data)
  return response.data
}

export async function updateJournal(id: number, data: UpdateJournalInput) {
  const response = await apiClient.put(`/journals/${id}`, data)
  return response.data
}

export async function deleteJournal(id: number) {
  const response = await apiClient.delete(`/journals/${id}`)
  return response.data
}

export async function restoreJournal(id: number) {
  const response = await apiClient.post(`/journals/${id}/restore`)
  return response.data
}

export async function forceDeleteJournal(id: number) {
  const response = await apiClient.post(`/journals/${id}/force-delete`)
  return response.data
}
