import apiClient from './client'

export interface PayrollRun {
  id: number
  organization_id: number
  office_id: number
  run_number: string
  period_start: string
  period_end: string
  pay_date: string
  description: string | null
  status: 'draft' | 'processed' | 'approved' | 'paid' | 'cancelled'
  total_gross: number
  total_deductions: number
  total_net: number
  employee_count: number
  office_name?: string
  created_at: string
}

export interface PayrollItem {
  id: number
  payroll_run_id: number
  employee_id: number
  basic_salary: number
  allowances: number
  overtime: number
  bonuses: number
  gross_salary: number
  tax_deduction: number
  social_security: number
  other_deductions: number
  total_deductions: number
  net_salary: number
  project_id: number | null
  cost_center: string | null
  employee_name?: string
}

export interface PayrollRunFormData {
  office_id: number
  period_start: string
  period_end: string
  pay_date: string
  description?: string
}

export interface PayrollItemFormData {
  employee_id: number
  basic_salary: number
  allowances?: number
  overtime?: number
  bonuses?: number
  tax_deduction?: number
  social_security?: number
  other_deductions?: number
  project_id?: number
  cost_center?: string
}

// Payroll APIs
export async function getPayrollRuns(params?: { page?: number; per_page?: number; status?: string; office_id?: number }) {
  const response = await apiClient.get('/payroll', { params })
  return response.data
}

export async function getPayrollRun(id: number) {
  const response = await apiClient.get(`/payroll/${id}`)
  return response.data
}

export async function createPayrollRun(data: PayrollRunFormData) {
  const response = await apiClient.post('/payroll', data)
  return response.data
}

export async function addPayrollEmployee(runId: number, data: PayrollItemFormData) {
  const response = await apiClient.post(`/payroll/${runId}/employees`, data)
  return response.data
}

export async function processPayroll(id: number) {
  const response = await apiClient.post(`/payroll/${id}/process`)
  return response.data
}

export async function approvePayroll(id: number) {
  const response = await apiClient.post(`/payroll/${id}/approve`)
  return response.data
}

export async function getPayrollSummary() {
  const response = await apiClient.get('/payroll/summary')
  return response.data
}

// Helper functions
export function getPayrollStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    processed: 'Processed',
    approved: 'Approved',
    paid: 'Paid',
    cancelled: 'Cancelled',
  }
  return labels[status] || status
}

export function getPayrollStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    processed: 'bg-emerald-100 text-emerald-800',
    approved: 'bg-green-100 text-green-700',
    paid: 'bg-purple-100 text-purple-700',
    cancelled: 'bg-red-100 text-red-700',
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}
