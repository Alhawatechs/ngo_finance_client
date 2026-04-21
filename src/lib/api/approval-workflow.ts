import apiClient from './client'

export interface ApprovalWorkflowSettings {
  id: number
  organization_id: number
  enable_approval_workflow: boolean
  approval_levels: number
  approval_limit_level1: number
  approval_limit_level2: number
  approval_limit_level3: number
  require_dual_signature: boolean
  dual_signature_threshold: number
  allow_self_approval: boolean
  auto_approve_below: number
  require_supporting_documents: boolean
  updated_at?: string
}

export interface ApprovalWorkflowResponse {
  data: ApprovalWorkflowSettings
  base_currency: string
}

export interface UpdateApprovalWorkflowData {
  enable_approval_workflow?: boolean
  approval_levels?: number
  approval_limit_level1?: number
  approval_limit_level2?: number
  approval_limit_level3?: number
  require_dual_signature?: boolean
  dual_signature_threshold?: number
  allow_self_approval?: boolean
  auto_approve_below?: number
  require_supporting_documents?: boolean
}

export async function getApprovalWorkflow(): Promise<ApprovalWorkflowResponse> {
  const response = await apiClient.get<ApprovalWorkflowResponse>('/approval-workflow')
  return response.data
}

export async function updateApprovalWorkflow(
  data: UpdateApprovalWorkflowData
): Promise<ApprovalWorkflowResponse> {
  const response = await apiClient.put<ApprovalWorkflowResponse>('/approval-workflow', data)
  return response.data
}
