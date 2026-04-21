import apiClient from './client'

export interface DashboardSummary {
  vouchers_this_month: number
  pending_approvals: number
  cash_balance: number
  bank_balance: number
  total_liquidity: number
  total_liquidity_base?: number
  liquidity_by_currency?: { currency: string; total: number }[]
  default_currency?: string
  active_projects: number
}

export interface RecentVoucher {
  id: number
  voucher_number: string
  type: string
  payee: string
  amount: number
  currency?: string
  status: string
  date: string
  office: string
}

export interface PendingApproval {
  id: number
  voucher_number: string
  type: string
  amount: number
  currency?: string
  current_level: number
  created_at: string
  office: string
}

export interface CashPosition {
  cash: {
    total: number
    total_base?: number
    by_currency?: { currency: string; total: number }[]
    accounts: {
      id: number
      name: string
      type: string
      currency: string
      balance: number
      office: string
    }[]
  }
  bank: {
    total: number
    total_base?: number
    by_currency?: { currency: string; total: number }[]
    accounts: {
      id: number
      name: string
      bank: string
      currency: string
      balance: number
      office: string
    }[]
  }
  default_currency?: string
}

export interface BudgetStatus {
  total_budget: number
  total_spent: number
  total_committed: number
  available: number
  total_budget_base?: number
  total_spent_base?: number
  available_base?: number
  by_currency?: { currency: string; total_budget: number; total_spent: number; total_committed: number; available: number }[]
  default_currency?: string
  utilization_rate: number
}

export interface MonthlyTrend {
  month: string
  revenue: number
  expenses: number
  net: number
}

export interface Alert {
  type: 'info' | 'warning' | 'error'
  title: string
  message: string
  link?: string
}

export interface ActivityItem {
  type: string
  action: string
  title: string
  description: string
  user: string
  amount: number
  timestamp: string
}

// Dashboard APIs
export async function getDashboardOverview() {
  const response = await apiClient.get('/dashboard')
  return response.data
}

export async function getDashboardSummary() {
  const response = await apiClient.get('/dashboard/summary')
  return response.data
}

export async function getCashPosition() {
  const response = await apiClient.get('/dashboard/cash-position')
  return response.data
}

export async function getMonthlyTrends(months: number = 12) {
  const response = await apiClient.get('/dashboard/trends', { params: { months } })
  return response.data
}

export async function getProjectStatus() {
  const response = await apiClient.get('/dashboard/project-status')
  return response.data
}

export async function getFundAllocation() {
  const response = await apiClient.get('/dashboard/fund-allocation')
  return response.data
}

export async function getAlerts() {
  const response = await apiClient.get('/dashboard/alerts')
  return response.data
}

export async function getActivityFeed(limit: number = 20) {
  const response = await apiClient.get('/dashboard/activity', { params: { limit } })
  return response.data
}

// Helper functions
export function formatTrendValue(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toFixed(0)
}

export function getAlertIcon(type: string): string {
  switch (type) {
    case 'error':
      return 'AlertTriangle'
    case 'warning':
      return 'AlertCircle'
    default:
      return 'Info'
  }
}

export function getAlertColor(type: string): string {
  switch (type) {
    case 'error':
      return 'text-red-600 bg-red-50'
    case 'warning':
      return 'text-yellow-600 bg-yellow-50'
    default:
      return 'text-emerald-700 bg-emerald-50'
  }
}
