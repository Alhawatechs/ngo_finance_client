import apiClient from './client'

export interface BankAccount {
  id: number
  organization_id: number
  office_id: number
  gl_account_id: number
  bank_name: string
  branch_name: string | null
  account_number: string
  account_name: string
  account_type: 'checking' | 'savings' | 'fixed_deposit' | 'money_market'
  currency: string
  swift_code: string | null
  iban: string | null
  address: string | null
  contact_person: string | null
  contact_phone: string | null
  current_balance: number
  available_balance: number
  last_reconciled_date: string | null
  last_reconciled_balance: number | null
  is_active: boolean
  created_at: string
  updated_at: string
  office?: { id: number; name: string; code: string }
  gl_account?: { id: number; account_code: string; account_name: string }
}

export interface BankTransaction {
  id: number
  bank_account_id: number
  journal_entry_id: number | null
  transaction_date: string
  value_date: string | null
  transaction_type: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'fee' | 'interest' | 'check'
  reference: string | null
  description: string
  debit_amount: number
  credit_amount: number
  running_balance: number
  check_number: string | null
  payee_payer: string | null
  is_reconciled: boolean
  reconciliation_id: number | null
  status: 'pending' | 'cleared' | 'bounced' | 'cancelled'
  created_at: string
}

export interface BankReconciliation {
  id: number
  bank_account_id: number
  bank_statement_id: number | null
  reconciliation_date: string
  statement_balance: number
  book_balance: number
  adjusted_book_balance: number
  difference: number
  status: 'in_progress' | 'completed' | 'approved'
  notes: string | null
  prepared_by: number
  approved_by: number | null
  approved_at: string | null
}

export interface BankAccountFormData {
  office_id: number
  gl_account_id: number
  bank_name: string
  branch_name?: string
  account_number: string
  account_name: string
  account_type: 'checking' | 'savings' | 'fixed_deposit' | 'money_market'
  currency: string
  swift_code?: string
  iban?: string
  address?: string
  contact_person?: string
  contact_phone?: string
  opening_balance?: number
}

export interface BankTransactionFormData {
  transaction_type: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'fee' | 'interest' | 'check'
  transaction_date: string
  value_date?: string
  amount: number
  description: string
  reference?: string
  check_number?: string
  payee_payer?: string
}

export interface ReconciliationFormData {
  reconciliation_date: string
  statement_balance: number
  notes?: string
}

export interface BankAccountListParams {
  office_id?: number
  currency?: string
  account_type?: string
  is_active?: boolean
}

export interface TransactionListParams {
  page?: number
  per_page?: number
  transaction_type?: string
  from_date?: string
  to_date?: string
  is_reconciled?: boolean
  status?: string
}

// Bank Account APIs
export async function getBankAccounts(params?: BankAccountListParams) {
  const response = await apiClient.get('/treasury/bank-accounts', { params })
  return response.data
}

export async function getBankAccount(id: number) {
  const response = await apiClient.get(`/treasury/bank-accounts/${id}`)
  return response.data
}

export async function createBankAccount(data: BankAccountFormData) {
  const response = await apiClient.post('/treasury/bank-accounts', data)
  return response.data
}

export async function updateBankAccount(id: number, data: Partial<BankAccountFormData>) {
  const response = await apiClient.put(`/treasury/bank-accounts/${id}`, data)
  return response.data
}

export async function deleteBankAccount(id: number) {
  const response = await apiClient.delete(`/treasury/bank-accounts/${id}`)
  return response.data
}

// Transaction APIs
export async function getBankTransactions(accountId: number, params?: TransactionListParams) {
  const response = await apiClient.get(`/treasury/bank-accounts/${accountId}/transactions`, { params })
  return response.data
}

export async function recordBankTransaction(accountId: number, data: BankTransactionFormData) {
  const response = await apiClient.post(`/treasury/bank-accounts/${accountId}/transactions`, data)
  return response.data
}

// Reconciliation APIs
export async function startReconciliation(accountId: number, data: ReconciliationFormData) {
  const response = await apiClient.post(`/treasury/bank-accounts/${accountId}/reconciliation`, data)
  return response.data
}

export async function reconcileTransactions(reconciliationId: number, transactionIds: number[]) {
  const response = await apiClient.post(`/treasury/reconciliations/${reconciliationId}/reconcile`, {
    transaction_ids: transactionIds,
  })
  return response.data
}

export async function completeReconciliation(reconciliationId: number) {
  const response = await apiClient.post(`/treasury/reconciliations/${reconciliationId}/complete`)
  return response.data
}

// Summary
export async function getBankSummary() {
  const response = await apiClient.get('/treasury/bank-accounts/summary')
  return response.data
}

// Helper functions
export function getAccountTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    checking: 'Checking',
    savings: 'Savings',
    fixed_deposit: 'Fixed Deposit',
    money_market: 'Money Market',
  }
  return labels[type] || type
}

export function getTransactionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    deposit: 'Deposit',
    withdrawal: 'Withdrawal',
    transfer_in: 'Transfer In',
    transfer_out: 'Transfer Out',
    fee: 'Bank Fee',
    interest: 'Interest',
    check: 'Check',
  }
  return labels[type] || type
}

export function getTransactionTypeColor(type: string): string {
  const colors: Record<string, string> = {
    deposit: 'bg-green-100 text-green-700',
    withdrawal: 'bg-red-100 text-red-700',
    transfer_in: 'bg-emerald-100 text-emerald-700',
    transfer_out: 'bg-orange-100 text-orange-700',
    fee: 'bg-gray-100 text-gray-700',
    interest: 'bg-emerald-100 text-emerald-800',
    check: 'bg-purple-100 text-purple-700',
  }
  return colors[type] || 'bg-gray-100 text-gray-700'
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    cleared: 'bg-green-100 text-green-700',
    bounced: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-700',
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

export function maskAccountNumber(accountNumber: string): string {
  const length = accountNumber.length
  if (length <= 4) return accountNumber
  return '*'.repeat(length - 4) + accountNumber.slice(-4)
}
