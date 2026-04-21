import axios from 'axios'
import apiClient, { handleApiError } from './client'
import { exportChartOfAccountsToPdf, normalizeChartOfAccountsForPdf } from '@/lib/chart-of-accounts-export'
import type { ChartOfAccountExportColumnKey } from '@/lib/chart-of-accounts-export-columns'
import { getOrganization } from '@/lib/api/organization'
import { ChartOfAccount } from '@/types'

export interface ChartOfAccountsListParams {
  page?: number
  per_page?: number
  account_type?: string
  level?: number
  is_active?: boolean
  posting_only?: boolean
  currency_code?: string
  search?: string
}

export interface ChartOfAccountFormData {
  parent_id?: number | null
  account_code: string
  account_name: string
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  normal_balance: 'debit' | 'credit'
  is_header?: boolean
  is_posting?: boolean
  is_bank_account?: boolean
  is_cash_account?: boolean
  fund_type?: 'unrestricted' | 'restricted' | 'temporarily_restricted' | null
  /** Posting accounts only; null for category / subcategory / GL headers */
  currency_code?: string | null
  description?: string
  opening_balance?: number
  opening_balance_date?: string
  is_active?: boolean
}

export interface AccountsTreeResponse {
  success: boolean
  data: ChartOfAccount[]
  message?: string
}

export interface AccountsSummary {
  total_assets: number
  total_liabilities: number
  net_assets: number
  total_revenue: number
  total_expenses: number
  total_accounts: number
}

// Backend routes use 'chart-of-accounts' (see api.php)
const BASE = '/chart-of-accounts'

// Get list of accounts with pagination and filters
export async function getAccounts(params?: ChartOfAccountsListParams) {
  const response = await apiClient.get(BASE, { params })
  return response.data
}

// Get accounts in tree structure (backend route: chart-of-accounts-tree)
export async function getAccountsTree(params?: { with_trashed?: boolean; bypass_cache?: boolean }) {
  const query: Record<string, string | number> = {}
  if (params?.with_trashed) query.with_trashed = 1
  if (params?.bypass_cache) query.bypass_cache = 1
  const response = await apiClient.get<AccountsTreeResponse>('/chart-of-accounts-tree', {
    params: Object.keys(query).length ? query : undefined,
  })
  return response.data
}

/** Flat list for browser PDF — no tree/journal rollup (avoids 500s from the tree endpoint). */
export async function getAccountsFlatForExport(params?: { with_trashed?: boolean }) {
  const query: Record<string, string | number> = {}
  if (params?.with_trashed) query.with_trashed = 1
  const response = await apiClient.get<AccountsTreeResponse>('/chart-of-accounts/flat-for-export', {
    params: Object.keys(query).length ? query : undefined,
  })
  return response.data
}

/** Server-side parse/format issue before or instead of row-level validation. */
export interface ChartOfAccountsImportDiagnostics {
  phase: 'upload' | 'parse' | 'format'
  code: string
  message: string
  hint: string
  /** Concrete steps to align the file with system requirements */
  actions?: string[]
  /** Extra machine-readable context (e.g. missing column names) */
  details?: { missing_columns?: string[] }
}

export interface ChartOfAccountsImportResult {
  imported: number
  skipped: number
  errors: Array<{ row: number | null; account_code: string | null; message: string }>
  diagnostics?: ChartOfAccountsImportDiagnostics | null
}

export interface ChartOfAccountsImportResponse {
  success: boolean
  message?: string
  data: ChartOfAccountsImportResult
}

/** POST multipart: CSV or Excel (use the "Sample format" sheet). Requires edit COA + edit COA code. */
export async function importChartOfAccounts(file: File): Promise<ChartOfAccountsImportResponse> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiClient.post<ChartOfAccountsImportResponse>(`${BASE}/import`, formData, {
    timeout: 120000,
  })
  return response.data
}

/** Suggested code for a new account under the given parent (null = top-level Layer 1). */
export interface SuggestCodeResponse {
  success: boolean
  data?: { suggested_code: string | null; level: number }
  message?: string
}

export async function suggestAccountCode(parentId: number | null): Promise<string | null> {
  const params = parentId != null ? { parent_id: parentId } : {}
  const response = await apiClient.get<SuggestCodeResponse>(`${BASE}/suggest-code`, { params })
  const code = response.data?.data?.suggested_code
  return code ?? null
}

// Get a single account
export async function getAccount(id: number) {
  const response = await apiClient.get(`${BASE}/${id}`)
  return response.data
}

// Get children of an account
export async function getAccountChildren(id: number) {
  const response = await apiClient.get(`${BASE}/${id}/children`)
  return response.data
}

// Create a new account
export async function createAccount(data: ChartOfAccountFormData) {
  const response = await apiClient.post(BASE, data)
  return response.data
}

// Update an account
export async function updateAccount(id: number, data: Partial<ChartOfAccountFormData>) {
  const response = await apiClient.put(`${BASE}/${id}`, data)
  return response.data
}

// Delete an account (soft delete)
export async function deleteAccount(id: number) {
  const response = await apiClient.delete(`${BASE}/${id}`)
  return response.data
}

/** Restore a temporarily deleted account. */
export async function restoreAccount(id: number) {
  const response = await apiClient.post(`${BASE}/${id}/restore`)
  return response.data
}

/** Permanently delete a soft-deleted account. Frees the code for reuse. Optional reason for audit trail. */
export async function forceDeleteAccount(id: number, options?: { reason?: string }) {
  const response = await apiClient.post(`${BASE}/${id}/force-delete`, options ?? {})
  return response.data
}

/** Parse Laravel/JSON/HTML error body when the server returned a non-file response. */
export async function parseBlobErrorMessage(blob: Blob): Promise<string | null> {
  try {
    const text = await blob.text()
    const t = text.trim()
    if (!t) return null
    const lower = t.slice(0, 200).toLowerCase()
    if (lower.startsWith('<!doctype') || lower.startsWith('<html')) {
      return 'The server returned an HTML error page instead of a file. Try signing in again or check that the API proxy is working.'
    }
    if (t.startsWith('{')) {
      const parsed = JSON.parse(t) as { message?: string; error?: string }
      return parsed.message ?? parsed.error ?? null
    }
    return t.slice(0, 400)
  } catch {
    return null
  }
}

/** Prefer RFC 5987 `filename*`, then quoted `filename="..."`. */
function extractFilenameFromContentDisposition(disposition: string | undefined): string | null {
  if (!disposition) return null
  const star = /filename\*=UTF-8''([^;\n]+)/i.exec(disposition)
  if (star) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ''))
    } catch {
      return star[1]
    }
  }
  const quoted = /filename="((?:[^"\\]|\\.)*)"/.exec(disposition)
  if (quoted) return quoted[1].replace(/\\"/g, '"')
  const simple = /filename=([^;\n]+)/i.exec(disposition)
  if (simple) return simple[1].trim().replace(/^"|"$/g, '')
  return null
}

export interface ExportChartOfAccountsOptions {
  /** When true, includes soft-deleted accounts (matches “Deleted” view on the account list). */
  withTrashed?: boolean
  /** Columns to include (order preserved). Defaults to all columns; must include at least one. */
  columns?: ChartOfAccountExportColumnKey[]
}

function acceptHeaderForExportFormat(format: 'xlsx' | 'csv'): string {
  if (format === 'csv') return 'text/csv, application/octet-stream;q=0.9, */*;q=0.1'
  return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/octet-stream;q=0.9, */*;q=0.1'
}

function pdfLoadErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined
    if (data?.message) return data.message
    const status = err.response?.status
    if (status === 500) return 'Server error while loading accounts.'
    if (status === 404) return 'Accounts endpoint not found (check backend deployment).'
    if (status === 403) return 'You may not have permission to load chart of accounts.'
    return handleApiError(err)
  }
  if (err instanceof Error) return err.message
  return String(err)
}

/**
 * Load all COA rows for client PDF: prefer lightweight flat endpoint, then tree, then paginated list.
 */
async function loadAccountsForPdfExport(withTrashed?: boolean): Promise<ChartOfAccount[]> {
  const tryFlat = async (): Promise<ChartOfAccount[]> => {
    const r = await getAccountsFlatForExport({ with_trashed: withTrashed })
    if (r.success && Array.isArray(r.data)) {
      return r.data
    }
    throw new Error(r.message || 'Flat export returned no data.')
  }

  const tryTree = async (): Promise<ChartOfAccount[]> => {
    let r: AccountsTreeResponse
    try {
      r = await getAccountsTree({ with_trashed: withTrashed, bypass_cache: true })
    } catch {
      r = await getAccountsTree({ with_trashed: withTrashed })
    }
    if (!r.success || !Array.isArray(r.data)) {
      throw new Error(r.message || 'Could not load chart of accounts tree.')
    }
    return flattenAccountsTree(r.data)
  }

  const tryPaginated = async (): Promise<ChartOfAccount[]> => {
    const all: ChartOfAccount[] = []
    let page = 1
    const perPage = 500
    for (;;) {
      const resp = await apiClient.get(BASE, {
        params: {
          page,
          per_page: perPage,
          ...(withTrashed ? { with_trashed: 1 } : {}),
        },
      })
      const body = resp.data as {
        success?: boolean
        data?: ChartOfAccount[]
        meta?: { last_page?: number }
        message?: string
      }
      if (!body?.success || !Array.isArray(body.data)) {
        throw new Error(body?.message || 'Could not load accounts list.')
      }
      all.push(...body.data)
      const lastPage = body.meta?.last_page ?? 1
      if (page >= lastPage) break
      page += 1
    }
    return all
  }

  try {
    return await tryFlat()
  } catch (e1) {
    try {
      return await tryTree()
    } catch (e2) {
      try {
        return await tryPaginated()
      } catch {
        const hint = pdfLoadErrorMessage(e1)
        throw new Error(
          `Could not load accounts for PDF (${hint}). Fallbacks also failed. Try Excel or CSV, or contact support.`
        )
      }
    }
  }
}

/**
 * Export chart of accounts as Excel, PDF, or CSV. Triggers a browser download.
 * Excel and CSV use the Laravel export API. PDF is generated in the browser (jsPDF), same pattern as the project list.
 */
export async function exportChartOfAccounts(
  format: 'xlsx' | 'pdf' | 'csv',
  options?: ExportChartOfAccountsOptions
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Export is only available in the browser.')
  }

  if (format === 'pdf') {
    const withTrashed = options?.withTrashed
    let orgName = 'Organization'
    let defaultCurrency = 'USD'
    try {
      const orgResp = await getOrganization()
      const org = orgResp?.data as { name?: string; default_currency?: string } | undefined
      if (org?.name) orgName = org.name
      if (org?.default_currency) defaultCurrency = org.default_currency
    } catch {
      /* PDF still works with defaults */
    }

    const rawAccounts = await loadAccountsForPdfExport(withTrashed)
    const accounts = normalizeChartOfAccountsForPdf(rawAccounts)
    const exportedAtLine = new Date().toLocaleString()
    try {
      exportChartOfAccountsToPdf(accounts, {
        organizationName: orgName,
        defaultCurrency,
        exportedAtLine,
        filename: `chart-of-accounts-${new Date().toISOString().split('T')[0]}.pdf`,
        columns: options?.columns,
      })
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e)
      throw new Error(detail || 'PDF export failed.')
    }
    return
  }

  const params: Record<string, string | number | ChartOfAccountExportColumnKey[]> = { format }
  if (options?.withTrashed) params.with_trashed = 1
  if (options?.columns?.length) params.columns = options.columns

  try {
    const response = await apiClient.get(`${BASE}/export`, {
      params,
      responseType: 'arraybuffer',
      timeout: 120000,
      headers: {
        Accept: acceptHeaderForExportFormat(format),
      },
    })

    const buf = response.data as ArrayBuffer
    const rawType = (response.headers['content-type'] || '').split(';')[0]?.trim().toLowerCase() ?? ''
    const mimeFromHeader =
      rawType ||
      (format === 'csv'
        ? 'text/csv'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    const blob = new Blob([buf], { type: mimeFromHeader })
    const ct = (rawType || blob.type || '').toLowerCase()

    if (ct.includes('application/json') || ct.includes('text/json')) {
      const msg = await parseBlobErrorMessage(blob)
      throw new Error(msg || 'Export failed')
    }

    const disposition = response.headers['content-disposition'] as string | undefined
    const ext = format === 'xlsx' ? 'xlsx' : 'csv'
    const filename =
      extractFilenameFromContentDisposition(disposition) ??
      `chart-of-accounts-${new Date().toISOString().split('T')[0]}.${ext}`

    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(objectUrl)
  } catch (e: unknown) {
    if (axios.isAxiosError(e)) {
      if (e.code === 'ECONNABORTED') {
        throw new Error('Export timed out. Try again or use CSV if the chart is very large.')
      }
      const data = e.response?.data
      if (data instanceof Blob) {
        const msg = await parseBlobErrorMessage(data)
        throw new Error(msg || `Export failed (${e.response?.status ?? 'error'})`)
      }
      if (data instanceof ArrayBuffer) {
        const msg = await parseBlobErrorMessage(new Blob([data]))
        throw new Error(msg || `Export failed (${e.response?.status ?? 'error'})`)
      }
      const msg = (e.response?.data as { message?: string } | undefined)?.message
      if (msg) throw new Error(msg)
    }
    const msg = e instanceof Error ? e.message : String(e)
    if (
      e instanceof TypeError &&
      (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network'))
    ) {
      throw new Error(
        'Could not reach the API. Start Laravel, ensure next.config rewrites /api to the backend, and reload the app.'
      )
    }
    throw e
  }
}

// Activate an account
export async function activateAccount(id: number) {
  const response = await apiClient.post(`${BASE}/${id}/activate`)
  return response.data
}

// Deactivate an account
export async function deactivateAccount(id: number) {
  const response = await apiClient.post(`${BASE}/${id}/deactivate`)
  return response.data
}

// Get accounts summary (for stats cards)
export async function getAccountsSummary(): Promise<AccountsSummary> {
  // This would ideally be a separate API endpoint
  // For now, we'll calculate from the tree data
  const response = await getAccountsTree()
  
  if (!response.success || !response.data) {
    return {
      total_assets: 0,
      total_liabilities: 0,
      net_assets: 0,
      total_revenue: 0,
      total_expenses: 0,
      total_accounts: 0,
    }
  }

  const calculateTotals = (accounts: ChartOfAccount[]): AccountsSummary => {
    let totals: AccountsSummary = {
      total_assets: 0,
      total_liabilities: 0,
      net_assets: 0,
      total_revenue: 0,
      total_expenses: 0,
      total_accounts: 0,
    }

    const processAccount = (account: ChartOfAccount) => {
      totals.total_accounts++
      
      // Only count leaf accounts (posting accounts) for balances
      if (account.is_posting && account.opening_balance) {
        switch (account.account_type) {
          case 'asset':
            totals.total_assets += account.opening_balance
            break
          case 'liability':
            totals.total_liabilities += account.opening_balance
            break
          case 'revenue':
            totals.total_revenue += account.opening_balance
            break
          case 'expense':
            totals.total_expenses += account.opening_balance
            break
        }
      }

      // Process children
      if (account.children && account.children.length > 0) {
        account.children.forEach(processAccount)
      }
    }

    accounts.forEach(processAccount)
    totals.net_assets = totals.total_assets - totals.total_liabilities

    return totals
  }

  return calculateTotals(response.data)
}

// Helper to flatten tree for search/filter (skips null/undefined nodes)
export function flattenAccountsTree(accounts: ChartOfAccount[] | undefined | null): ChartOfAccount[] {
  const result: ChartOfAccount[] = []
  if (!Array.isArray(accounts)) return result

  const flatten = (account: ChartOfAccount | null | undefined) => {
    if (!account) return
    result.push(account)
    if (Array.isArray(account.children) && account.children.length > 0) {
      account.children.forEach(flatten)
    }
  }

  accounts.forEach(flatten)
  return result
}

// Helper to get normal balance based on account type
export function getDefaultNormalBalance(accountType: string): 'debit' | 'credit' {
  switch (accountType) {
    case 'asset':
    case 'expense':
      return 'debit'
    case 'liability':
    case 'equity':
    case 'revenue':
      return 'credit'
    default:
      return 'debit'
  }
}
