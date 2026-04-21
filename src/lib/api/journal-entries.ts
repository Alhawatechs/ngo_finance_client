import apiClient from './client'

export interface JournalEntry {
  id: number
  organization_id: number
  journal_id?: number | null
  office_id: number
  fiscal_period_id: number
  entry_number: string
  voucher_number: string | null
  entry_date: string
  posting_date: string | null
  entry_type: 'standard' | 'adjusting' | 'closing' | 'reversing' | 'recurring'
  reference: string | null
  description: string
  currency: string
  exchange_rate: number
  total_debit: number
  total_credit: number
  status: 'draft' | 'pending' | 'posted' | 'reversed'
  created_by: number
  posted_by: number | null
  posted_at: string | null
  reversed_by: number | null
  reversed_at: string | null
  reversal_entry_id: number | null
  created_at: string
  updated_at: string
  lines?: JournalEntryLine[]
  office?: { id: number; name: string; code: string }
  fiscal_period?: { id: number; name: string }
  creator?: { id: number; name: string }
  poster?: { id: number; name: string }
  reverser?: { id: number; name: string }
  reversal_entry?: { id: number; entry_number: string }
  reversed_entry?: { id: number; entry_number: string }
  lines_count?: number
  journal?: { id: number; name: string; code: string; project_id?: number | null; project?: { id: number; project_code: string; project_name: string } }
}

export interface JournalEntryLine {
  id: number
  journal_entry_id: number
  account_id: number
  fund_id: number | null
  project_id: number | null
  office_id: number | null
  line_number: number
  description: string | null
  debit_amount: number
  credit_amount: number
  currency: string
  exchange_rate: number
  base_currency_debit: number
  base_currency_credit: number
  cost_center: string | null
  account?: {
    id: number
    account_code: string
    account_name: string
    account_type: string
  }
  fund?: { id: number; code: string; name: string }
  project?: { id: number; project_code: string; project_name: string }
}

export interface JournalEntryListParams {
  page?: number
  per_page?: number
  status?: string
  entry_type?: string
  journal_id?: number
  office_id?: number
  fiscal_period_id?: number
  project_id?: number
  start_date?: string
  end_date?: string
  search?: string
  sort?: string
  order?: 'asc' | 'desc'
}

export interface JournalEntryLineInput {
  id?: number
  account_id: number
  fund_id?: number | null
  project_id?: number | null
  description?: string
  debit_amount: number
  credit_amount: number
  cost_center?: string
}

export interface JournalEntryFormData {
  journal_id?: number | null
  office_id: number
  entry_date: string
  entry_type: 'standard' | 'adjusting' | 'closing' | 'reversing' | 'recurring'
  reference?: string
  description: string
  currency: string
  exchange_rate: number
  lines: JournalEntryLineInput[]
}

export interface JournalEntrySummary {
  stats: {
    total_entries: number
    draft_entries: number
    posted_entries: number
    reversed_entries: number
    total_debit: number
    total_credit: number
  }
  recent_entries: JournalEntry[]
}

/** One row per GL account — totals for posted lines for a project (see project-ledger API). */
export interface ProjectLedgerAccountSummaryRow {
  account_type: string
  account_id: number
  account_code: string
  account_name: string
  total_debit: string | number
  total_credit: string | number
}

/** Posted journal entry line with account and header context. */
export interface ProjectLedgerLine {
  id: number
  journal_entry_id: number
  account_id: number
  line_number: number
  description: string | null
  debit_amount: string | number
  credit_amount: string | number
  account?: {
    id: number
    account_code: string
    account_name: string
    account_type: string
  }
  journal_entry?: {
    id: number
    entry_number: string
    entry_date: string
    voucher_number: string | null
    reference: string | null
    description: string
    source_type: string | null
    source_id: number | null
    journal_id: number | null
    currency: string
    journal?: { id: number; name: string; code: string }
  }
}

export interface ProjectLedgerResponse {
  success: boolean
  data: {
    project: { id: number; project_code: string; project_name: string }
    account_summary: ProjectLedgerAccountSummaryRow[]
    lines: ProjectLedgerLine[]
  }
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number | null
    to: number | null
  }
}

export interface ProjectLedgerParams {
  project_id: number
  start_date?: string
  end_date?: string
  journal_id?: number
  page?: number
  per_page?: number
}

/** Posted GL lines for a project: account totals by class + paginated lines. */
export async function getProjectLedger(params: ProjectLedgerParams): Promise<ProjectLedgerResponse> {
  const response = await apiClient.get('/journal-entries/project-ledger', { params })
  return response.data as ProjectLedgerResponse
}

// Get list of journal entries with pagination and filters
export async function getJournalEntries(params?: JournalEntryListParams) {
  const response = await apiClient.get('/journal-entries', { params })
  return response.data
}

// Get a single journal entry
export async function getJournalEntry(id: number) {
  const response = await apiClient.get(`/journal-entries/${id}`)
  return response.data
}

// Create a new journal entry
export async function createJournalEntry(data: JournalEntryFormData) {
  const response = await apiClient.post('/journal-entries', data)
  return response.data
}

// Update a journal entry
export async function updateJournalEntry(id: number, data: Partial<JournalEntryFormData>) {
  const response = await apiClient.put(`/journal-entries/${id}`, data)
  return response.data
}

// Delete a journal entry
export async function deleteJournalEntry(id: number) {
  const response = await apiClient.delete(`/journal-entries/${id}`)
  return response.data
}

// Post a journal entry
export async function postJournalEntry(id: number) {
  const response = await apiClient.post(`/journal-entries/${id}/post`)
  return response.data
}

// Reverse a journal entry
export async function reverseJournalEntry(id: number, data: { reversal_date: string; description?: string }) {
  const response = await apiClient.post(`/journal-entries/${id}/reverse`, data)
  return response.data
}

// Get journal entry summary statistics
export async function getJournalEntrySummary(): Promise<{ data: JournalEntrySummary }> {
  const response = await apiClient.get('/journal-entries/summary')
  return response.data
}

/**
 * Export journal entries as CSV (journal book format). Uses same filters as list.
 * Triggers a file download in the browser.
 */
export async function exportJournalBookCsv(params?: JournalEntryListParams): Promise<void> {
  const response = await apiClient.get('/journal-entries/export', {
    params: {
      project_id: params?.project_id,
      journal_id: params?.journal_id,
      status: params?.status,
      entry_type: params?.entry_type,
      office_id: params?.office_id,
      fiscal_period_id: params?.fiscal_period_id,
      start_date: params?.start_date,
      end_date: params?.end_date,
      search: params?.search,
    },
    responseType: 'blob',
  })
  const blob = response.data as Blob
  const disposition = response.headers['content-disposition']
  const match = disposition?.match(/filename="?([^";]+)"?/)
  const filename = match?.[1] ?? `journal-book-${new Date().toISOString().slice(0, 10)}.csv`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Helper to validate double-entry balance
export function validateJournalEntry(lines: JournalEntryLineInput[]): { 
  isValid: boolean
  totalDebit: number
  totalCredit: number
  difference: number
} {
  const totalDebit = lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0)
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0)
  const difference = Math.abs(totalDebit - totalCredit)
  
  return {
    isValid: difference < 0.01 && totalDebit > 0, // Allow small rounding differences
    totalDebit,
    totalCredit,
    difference,
  }
}

// Helper to get entry type label
export function getEntryTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    standard: 'Standard Entry',
    adjusting: 'Adjusting Entry',
    closing: 'Closing Entry',
    reversing: 'Reversing Entry',
    recurring: 'Recurring Entry',
  }
  return labels[type] || type
}

// Helper to get status badge color
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    pending: 'bg-yellow-100 text-yellow-700',
    posted: 'bg-green-100 text-green-700',
    reversed: 'bg-red-100 text-red-700',
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}
