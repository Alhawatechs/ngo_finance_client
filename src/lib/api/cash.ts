import apiClient from './client'

export interface CashAccount {
  id: number
  organization_id: number
  office_id: number
  gl_account_id: number
  name: string
  code: string
  currency: string
  cash_type: 'petty_cash' | 'main_cash' | 'safe'
  current_balance: number
  limit_amount: number | null
  custodian_id: number | null
  is_active: boolean
  created_at: string
  updated_at: string
  office?: { id: number; name: string; code: string }
  custodian?: { id: number; name: string }
  gl_account?: { id: number; account_code: string; account_name: string }
}

export interface CashTransaction {
  id: number
  cash_account_id: number
  journal_entry_id: number | null
  voucher_id: number | null
  transaction_number: string
  transaction_date: string
  transaction_type: 'withdrawal' | 'deposit' | 'exchange' | 'transfer_in' | 'transfer_out' | 'adjustment'
  description: string
  amount: number
  currency: string
  exchange_rate: number
  running_balance: number
  payee_payer: string | null
  reference: string | null
  related_transaction_id: number | null
  status: 'pending' | 'completed' | 'cancelled'
  created_by: number
  created_at: string
  creator?: { id: number; name: string }
}

export interface CashCount {
  id: number
  cash_account_id: number
  count_date: string
  expected_balance: number
  actual_balance: number
  difference: number
  denomination_details: DenominationDetail[] | null
  notes: string | null
  counted_by: number
  verified_by: number | null
  verified_at: string | null
  counter?: { id: number; name: string }
  verifier?: { id: number; name: string }
}

export interface DenominationDetail {
  denomination: number
  count: number
  total: number
}

export interface CashAccountFormData {
  office_id: number
  gl_account_id: number
  name: string
  code: string
  currency: string
  cash_type: 'petty_cash' | 'main_cash' | 'safe'
  limit_amount?: number
  custodian_id?: number
}

export interface CashTransactionFormData {
  transaction_type: 'withdrawal' | 'deposit' | 'adjustment'
  transaction_date: string
  amount: number
  description: string
  payee_payer?: string
  reference?: string
}

export interface TransferFormData {
  from_account_id: number
  to_account_id: number
  amount: number
  transaction_date: string
  description: string
}

export interface ExchangeFormData {
  from_account_id: number
  to_account_id: number
  transaction_date: string
  amount_from: number
  exchange_rate: number
  description: string
  reference?: string
}

export interface CashCountFormData {
  count_date: string
  actual_balance: number
  denomination_details?: DenominationDetail[]
  notes?: string
}

export interface CashAccountListParams {
  office_id?: number
  currency?: string
  cash_type?: string
  is_active?: boolean
}

export interface TransactionListParams {
  page?: number
  per_page?: number
  transaction_type?: string
  from_date?: string
  to_date?: string
}

// Cash Account APIs
export async function getCashAccounts(params?: CashAccountListParams) {
  const response = await apiClient.get('/treasury/cash-accounts', { params })
  return response.data
}

export async function getCashAccount(id: number) {
  const response = await apiClient.get(`/treasury/cash-accounts/${id}`)
  return response.data
}

export async function createCashAccount(data: CashAccountFormData) {
  const response = await apiClient.post('/treasury/cash-accounts', data)
  return response.data
}

export async function updateCashAccount(id: number, data: Partial<CashAccountFormData>) {
  const response = await apiClient.put(`/treasury/cash-accounts/${id}`, data)
  return response.data
}

export async function deleteCashAccount(id: number) {
  const response = await apiClient.delete(`/treasury/cash-accounts/${id}`)
  return response.data
}

// Transaction APIs
export async function getCashTransactions(accountId: number, params?: TransactionListParams) {
  const response = await apiClient.get(`/treasury/cash-accounts/${accountId}/transactions`, { params })
  return response.data
}

export async function recordCashTransaction(accountId: number, data: CashTransactionFormData) {
  const response = await apiClient.post(`/treasury/cash-accounts/${accountId}/transactions`, data)
  return response.data
}

export async function transferCash(data: TransferFormData) {
  const response = await apiClient.post('/treasury/cash-accounts/transfer', data)
  return response.data
}

export async function exchangeCash(data: ExchangeFormData) {
  const response = await apiClient.post('/treasury/cash-accounts/exchange', data)
  return response.data
}

// Cash Count APIs
export async function getCashCounts(accountId: number, params?: { page?: number; per_page?: number }) {
  const response = await apiClient.get(`/treasury/cash-accounts/${accountId}/cash-counts`, { params })
  return response.data
}

export async function recordCashCount(accountId: number, data: CashCountFormData) {
  const response = await apiClient.post(`/treasury/cash-accounts/${accountId}/cash-counts`, data)
  return response.data
}

export async function verifyCashCount(countId: number) {
  const response = await apiClient.post(`/treasury/cash-counts/${countId}/verify`)
  return response.data
}

// Summary
export async function getCashSummary() {
  const response = await apiClient.get('/treasury/cash-accounts/summary')
  return response.data
}

// Helper functions
export function getCashTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    petty_cash: 'Petty Cash',
    main_cash: 'Main Cash',
    safe: 'Safe',
  }
  return labels[type] || type
}

export function getTransactionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    withdrawal: 'Withdrawal',
    deposit: 'Deposit',
    exchange: 'Exchange',
    transfer_in: 'Transfer In',
    transfer_out: 'Transfer Out',
    adjustment: 'Adjustment',
  }
  return labels[type] || type
}

export function getTransactionTypeColor(type: string): string {
  const colors: Record<string, string> = {
    withdrawal: 'bg-red-100 text-red-700',
    deposit: 'bg-green-100 text-green-700',
    exchange: 'bg-emerald-100 text-emerald-800',
    transfer_in: 'bg-emerald-100 text-emerald-700',
    transfer_out: 'bg-orange-100 text-orange-700',
    adjustment: 'bg-purple-100 text-purple-700',
  }
  return colors[type] || 'bg-gray-100 text-gray-700'
}

// Standard denominations for Afghanistan
export const AFN_DENOMINATIONS = [
  { value: 1000, label: '1000 AFN' },
  { value: 500, label: '500 AFN' },
  { value: 100, label: '100 AFN' },
  { value: 50, label: '50 AFN' },
  { value: 20, label: '20 AFN' },
  { value: 10, label: '10 AFN' },
  { value: 5, label: '5 AFN' },
  { value: 2, label: '2 AFN' },
  { value: 1, label: '1 AFN' },
]

export const USD_DENOMINATIONS = [
  { value: 100, label: '$100' },
  { value: 50, label: '$50' },
  { value: 20, label: '$20' },
  { value: 10, label: '$10' },
  { value: 5, label: '$5' },
  { value: 1, label: '$1' },
  { value: 0.25, label: '$0.25' },
  { value: 0.10, label: '$0.10' },
  { value: 0.05, label: '$0.05' },
  { value: 0.01, label: '$0.01' },
]

export function getDenominations(currency: string) {
  switch (currency) {
    case 'AFN':
      return AFN_DENOMINATIONS
    case 'USD':
      return USD_DENOMINATIONS
    default:
      return USD_DENOMINATIONS
  }
}
