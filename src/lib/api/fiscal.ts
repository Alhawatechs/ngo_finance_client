import apiClient, { ApiResponse } from './client'

export interface FiscalYear {
  id: number
  organization_id: number
  name: string
  start_date: string
  end_date: string
  status: 'draft' | 'open' | 'closed' | 'locked'
  is_current: boolean
  closed_at?: string
  closed_by?: number
  periods_count?: number
  periods?: FiscalPeriod[]
  created_at?: string
  updated_at?: string
}

export interface FiscalPeriod {
  id: number
  fiscal_year_id: number
  name: string
  period_number: number
  start_date: string
  end_date: string
  status: 'draft' | 'open' | 'closed' | 'locked'
  is_adjustment_period: boolean
  closed_at?: string
  closed_by?: number
  fiscal_year?: FiscalYear
}

export interface CreateFiscalYearData {
  name: string
  start_date: string
  end_date: string
  status?: 'draft' | 'open' | 'closed' | 'locked'
  is_current?: boolean
  create_periods?: boolean
}

export async function getFiscalYears(params?: { current_only?: boolean }): Promise<FiscalYear[]> {
  const searchParams = new URLSearchParams()
  if (params?.current_only) searchParams.set('current_only', 'true')
  const response = await apiClient.get<ApiResponse<FiscalYear[]>>(
    `/fiscal-years?${searchParams.toString()}`
  )
  return response.data.data
}

export async function getFiscalYear(id: number): Promise<FiscalYear> {
  const response = await apiClient.get<ApiResponse<FiscalYear>>(`/fiscal-years/${id}`)
  return response.data.data
}

export async function getFiscalYearPeriods(fiscalYearId: number): Promise<FiscalPeriod[]> {
  const response = await apiClient.get<ApiResponse<FiscalPeriod[]>>(
    `/fiscal-years/${fiscalYearId}/periods`
  )
  return response.data.data
}

export async function createFiscalYear(data: CreateFiscalYearData): Promise<FiscalYear> {
  const response = await apiClient.post<ApiResponse<FiscalYear>>('/fiscal-years', data)
  return response.data.data
}

export async function updateFiscalYear(
  id: number,
  data: Partial<CreateFiscalYearData>
): Promise<FiscalYear> {
  const response = await apiClient.put<ApiResponse<FiscalYear>>(`/fiscal-years/${id}`, data)
  return response.data.data
}

export async function deleteFiscalYear(id: number): Promise<void> {
  await apiClient.delete(`/fiscal-years/${id}`)
}

export async function closeFiscalPeriod(periodId: number): Promise<FiscalPeriod> {
  const response = await apiClient.post<ApiResponse<FiscalPeriod>>(
    `/fiscal-periods/${periodId}/close`
  )
  return response.data.data
}

export async function reopenFiscalPeriod(periodId: number): Promise<FiscalPeriod> {
  const response = await apiClient.post<ApiResponse<FiscalPeriod>>(
    `/fiscal-periods/${periodId}/reopen`
  )
  return response.data.data
}

export async function lockFiscalPeriod(periodId: number): Promise<FiscalPeriod> {
  const response = await apiClient.post<ApiResponse<FiscalPeriod>>(
    `/fiscal-periods/${periodId}/lock`
  )
  return response.data.data
}
