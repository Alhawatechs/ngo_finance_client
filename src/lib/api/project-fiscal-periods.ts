import apiClient, { ApiResponse } from './client'
import type { FiscalPeriod } from './fiscal'

export type ProjectCloseState = 'opened' | 'temporarily_locked' | 'permanently_locked'

export interface ProjectPeriodCloseRow {
  fiscal_period: FiscalPeriod
  project_period_status: 'closed' | 'locked' | null
  /** Derived: opened | temporarily_locked (closed) | permanently_locked (locked). */
  project_close_state?: ProjectCloseState
  project_closed_at?: string | null
  /** Posted vouchers for this project in the period (header or line project_id). */
  voucher_number_from?: string | null
  voucher_number_to?: string | null
  total_base_amount?: string
  posted_voucher_count?: number
}

export interface ProjectPeriodCloseOverview {
  project: { id: number; project_code: string; project_name: string }
  fiscal_year?: {
    id: number
    name: string
    start_date: string
    end_date: string
  }
  /**
   * Currency in which period totals are shown: journal book currency when the project has an active
   * journal with a currency set; otherwise organization base.
   */
  base_currency?: string
  /** Organization reporting (functional) currency. */
  organization_base_currency?: string
  /**
   * When true, totals sum base_currency_amount on vouchers (org reporting).
   * When false, journal book differs from org base and totals sum voucher amounts in `base_currency`.
   */
  totals_in_organization_base?: boolean
  periods: ProjectPeriodCloseRow[]
}

export async function getProjectPeriodCloseOverview(
  projectId: number,
  fiscalYearId: number
): Promise<ProjectPeriodCloseOverview> {
  const response = await apiClient.get<ApiResponse<ProjectPeriodCloseOverview>>(
    `/projects/${projectId}/fiscal-years/${fiscalYearId}/period-close-statuses`
  )
  return response.data.data
}

export async function closeProjectPosting(projectId: number, fiscalPeriodId: number): Promise<unknown> {
  const response = await apiClient.post<ApiResponse<unknown>>(
    `/projects/${projectId}/fiscal-periods/${fiscalPeriodId}/close-project-posting`
  )
  return response.data.data
}

export async function reopenProjectPosting(projectId: number, fiscalPeriodId: number): Promise<unknown> {
  const response = await apiClient.post<ApiResponse<unknown>>(
    `/projects/${projectId}/fiscal-periods/${fiscalPeriodId}/reopen-project-posting`
  )
  return response.data.data
}

export async function lockProjectPosting(projectId: number, fiscalPeriodId: number): Promise<unknown> {
  const response = await apiClient.post<ApiResponse<unknown>>(
    `/projects/${projectId}/fiscal-periods/${fiscalPeriodId}/lock-project-posting`
  )
  return response.data.data
}

/** Super Admin only: removes permanent lock so vouchers/journal can post for this project again. */
export async function unlockPermanentProjectPosting(
  projectId: number,
  fiscalPeriodId: number
): Promise<unknown> {
  const response = await apiClient.post<ApiResponse<unknown>>(
    `/projects/${projectId}/fiscal-periods/${fiscalPeriodId}/unlock-permanent-project-posting`
  )
  return response.data.data
}
