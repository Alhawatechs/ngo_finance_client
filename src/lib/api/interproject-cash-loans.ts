import apiClient from './client'

export interface InterprojectCashLoan {
  id: number
  organization_id: number
  lender_project_id: number
  borrower_project_id: number
  loan_number: string
  effective_date: string
  due_date: string | null
  principal: number
  currency: string
  status: 'draft' | 'active' | 'settled' | 'cancelled'
  notes: string | null
  created_by: number
  created_at: string
  updated_at: string
  lender_project?: { id: number; project_code: string; project_name: string }
  borrower_project?: { id: number; project_code: string; project_name: string }
  creator?: { id: number; name: string }
}

export interface InterprojectCashLoanFormData {
  lender_project_id: number
  borrower_project_id: number
  effective_date: string
  due_date?: string | undefined
  principal: number
  currency: string
  status?: InterprojectCashLoan['status']
  notes?: string
}

export async function getInterprojectCashLoans(params?: { page?: number; per_page?: number; status?: string }) {
  const response = await apiClient.get('/treasury/interproject-cash-loans', { params })
  return response.data
}

export async function createInterprojectCashLoan(data: InterprojectCashLoanFormData) {
  const response = await apiClient.post('/treasury/interproject-cash-loans', data)
  return response.data
}

export async function updateInterprojectCashLoan(id: number, data: Partial<InterprojectCashLoanFormData>) {
  const response = await apiClient.put(`/treasury/interproject-cash-loans/${id}`, data)
  return response.data
}

export async function deleteInterprojectCashLoan(id: number) {
  const response = await apiClient.delete(`/treasury/interproject-cash-loans/${id}`)
  return response.data
}
