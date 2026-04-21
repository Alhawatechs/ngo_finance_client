import apiClient from './client'

export interface ReportParams {
  start_date?: string
  end_date?: string
  as_of_date?: string
  office_id?: number
  project_id?: number
  fund_id?: number
  account_id?: number
}

export interface TrialBalanceAccount {
  account_code: string
  account_name: string
  account_type: string
  debit: number
  credit: number
}

export interface TrialBalanceReport {
  report_type: string
  as_of_date: string
  accounts: TrialBalanceAccount[]
  totals: {
    debit: number
    credit: number
    balanced: boolean
  }
}

export interface IncomeStatementAccount {
  account_code: string
  account_name: string
  balance: number
}

export interface IncomeStatementReport {
  report_type: string
  period: { start_date: string; end_date: string }
  revenue: { accounts: IncomeStatementAccount[]; total: number }
  expenses: { accounts: IncomeStatementAccount[]; total: number }
  net_income: number
  net_income_label: string
}

export interface BalanceSheetReport {
  report_type: string
  as_of_date: string
  assets: { accounts: IncomeStatementAccount[]; total: number }
  liabilities: { accounts: IncomeStatementAccount[]; total: number }
  equity: { accounts: IncomeStatementAccount[]; retained_earnings: number; total: number }
  total_liabilities_and_equity: number
  balanced: boolean
}

export interface CashFlowReport {
  report_type: string
  period: { start_date: string; end_date: string }
  opening_balance: number
  operating_activities: number
  investing_activities: number
  financing_activities: number
  net_change_in_cash: number
  closing_balance: number
}

// Report APIs (project_id scopes each report to a project's finance lifecycle when set)
export async function getTrialBalance(params: { as_of_date: string; office_id?: number; fund_id?: number; project_id?: number }) {
  const response = await apiClient.get('/reports/trial-balance', { params })
  return response.data
}

export async function getIncomeStatement(params: { start_date: string; end_date: string; office_id?: number; project_id?: number; fund_id?: number }) {
  const response = await apiClient.get('/reports/income-statement', { params })
  return response.data
}

export async function getBalanceSheet(params: { as_of_date: string; office_id?: number; fund_id?: number; project_id?: number }) {
  const response = await apiClient.get('/reports/balance-sheet', { params })
  return response.data
}

export async function getCashFlowStatement(params: { start_date: string; end_date: string; office_id?: number; project_id?: number }) {
  const response = await apiClient.get('/reports/cash-flow', { params })
  return response.data
}

export async function getGeneralLedger(params: {
  account_id: number
  start_date: string
  end_date: string
  project_id?: number
  office_id?: number
}) {
  const response = await apiClient.get('/reports/general-ledger', { params })
  return response.data
}

// Donor Reports
export async function getDonorReport(params: { donor_id: number; start_date: string; end_date: string; format?: string }) {
  const response = await apiClient.get('/reports/donor', { params })
  return response.data
}

export async function getProjectReport(params: { project_id: number; start_date?: string; end_date?: string }) {
  const response = await apiClient.get('/reports/project', { params })
  return response.data
}

export async function getFundReport(params: { fund_id: number; start_date: string; end_date: string }) {
  const response = await apiClient.get('/reports/fund', { params })
  return response.data
}

// Export functions
export async function exportReportPDF(reportType: string, params: ReportParams) {
  const response = await apiClient.get(`/reports/${reportType}/export/pdf`, { 
    params, 
    responseType: 'blob' 
  })
  return response.data
}

export async function exportReportExcel(reportType: string, params: ReportParams) {
  const response = await apiClient.get(`/reports/${reportType}/export/excel`, { 
    params, 
    responseType: 'blob' 
  })
  return response.data
}

// Helper functions
export function formatReportPeriod(startDate: string, endDate: string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

export function getReportTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'trial-balance': 'Trial Balance',
    'income-statement': 'Income Statement',
    'balance-sheet': 'Balance Sheet',
    'cash-flow': 'Cash Flow Statement',
    'general-ledger': 'General Ledger',
  }
  return labels[type] || type
}

// Donor report formats
export const DONOR_REPORT_FORMATS = [
  { id: 'standard', name: 'Standard Format' },
  { id: 'unicef', name: 'UNICEF Format' },
  { id: 'who', name: 'WHO Format' },
  { id: 'eu', name: 'European Union Format' },
  { id: 'usaid', name: 'USAID Format' },
]
