import apiClient from './client'

export type ApprovalResourceType = 'voucher' | 'budget'

export type ApprovalWorkflowStepState = 'completed' | 'current' | 'upcoming'

export interface ApprovalWorkflowStep {
  level: number
  code: string
  title: string
  state: ApprovalWorkflowStepState
}

export interface VoucherItemWorkflow {
  resource_type: 'voucher'
  required_levels: number
  current_approval_level: number
  next_level: number | null
  steps: ApprovalWorkflowStep[]
}

export interface BudgetItemWorkflow {
  resource_type: 'budget'
  summary: string
  required_levels: number
  current_approval_level: number
  next_level: number | null
  steps: ApprovalWorkflowStep[]
}

export type ApprovalItemWorkflow = VoucherItemWorkflow | BudgetItemWorkflow

export interface ApprovalWorkflowLayerDef {
  level: number
  code: string
  title: string
}

export interface ApprovalWorkflowDefinition {
  summary: string
  max_levels: number
  layers: ApprovalWorkflowLayerDef[]
}

export interface ApprovalCenterItem {
  resource_type: ApprovalResourceType
  id: number
  reference: string
  title: string
  subtitle?: string | null
  amount: string
  base_currency_amount: string
  currency: string
  status: string
  submitted_at: string | null
  submitted_by: { id: number; name: string; department: string | null } | null
  department: string | null
  office: { id: number; name: string } | null
  project: { id: number; name: string } | null
  meta: Record<string, unknown> & {
    workflow?: ApprovalItemWorkflow
  }
  actions: { can_approve: boolean; can_reject: boolean }
  deep_link: string
}

export interface ApprovalCenterListParams {
  type?: 'all' | 'voucher' | 'budget'
  office_id?: number
  department?: string
  date_from?: string
  date_to?: string
  search?: string
  page?: number
  per_page?: number
}

export interface ApprovalCenterListResponse {
  success: boolean
  message: string
  data: ApprovalCenterItem[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number | null
    to: number | null
  }
  workflow_definition?: ApprovalWorkflowDefinition
}

export async function getApprovalCenterItems(
  params?: ApprovalCenterListParams
): Promise<ApprovalCenterListResponse> {
  const response = await apiClient.get<ApprovalCenterListResponse>('/approval-center/items', {
    params,
  })
  return response.data
}

export interface ApprovalCenterCounts {
  voucher: number
  budget: number
  all: number
  workflow_definition?: ApprovalWorkflowDefinition
}

export interface ApprovalCenterCountsResponse {
  success: boolean
  message: string
  data: ApprovalCenterCounts
}

export async function getApprovalCenterCounts(
  params?: Pick<ApprovalCenterListParams, 'office_id' | 'department' | 'date_from' | 'date_to' | 'search'>
): Promise<ApprovalCenterCountsResponse> {
  const response = await apiClient.get<ApprovalCenterCountsResponse>('/approval-center/counts', {
    params,
  })
  return response.data
}
