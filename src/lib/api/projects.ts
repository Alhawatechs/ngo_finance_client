import apiClient from './client'

export interface Grant {
  id: number
  organization_id: number
  donor_id: number
  parent_grant_id?: number | null
  grant_code: string
  grant_name: string
  description: string | null
  start_date: string
  end_date: string
  total_amount: number
  disbursed_amount?: number
  spent_amount?: number
  currency: string
  grant_type?: 'restricted' | 'unrestricted' | 'temporarily_restricted'
  status: string
  reporting_frequency?: string | null
  contract_number?: string | null
  contract_reference?: string | null
  contract_date?: string | null
  terms_conditions?: string | null
  location?: string | null
  locations?: string[] | null
  locations_list?: string[]
  document_type?: string | null
  donor_contribution_amount?: number | null
  partner_contribution_amount?: number | null
  partner_name?: string | null
  partner_details?: string | null
  sub_partner_allocation_amount?: number | null
  donor?: { id: number; code: string; name: string; short_name?: string }
  parent_grant?: { id: number; grant_code: string; grant_name: string } | null
  amendments?: Grant[]
  projects?: Project[]
  documents?: GrantDocument[]
  created_at: string
  updated_at: string
}

export interface GrantDocument {
  id: number
  title: string
  file_name: string
  file_path: string
  file_type: string
  file_size: number
  document_type: string
  created_at: string
}

export interface CostCenter {
  id: number
  code: string
  name: string
}

export interface Project {
  id: number
  organization_id: number
  grant_id: number
  parent_project_id?: number | null
  office_id: number
  cost_center_id?: number | null
  cost_center?: CostCenter | null
  project_code: string
  project_name: string
  description: string | null
  start_date: string
  end_date: string
  total_budget: number
  spent_amount: number
  committed_amount: number
  currency: string
  status: 'draft' | 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  project_manager_id: number | null
  sector: string | null
  target_beneficiaries: number | null
  location: string | null
  locations?: string[] | null
  locations_list?: string[]
  grant?: Grant
  office?: { id: number; name: string; code?: string; province?: string }
  manager?: { id: number; name: string }
  documents?: GrantDocument[]
  amendments?: Project[]
  parent_project?: Project | null
  created_at: string
  updated_at: string
}

export interface ProjectBudgetLine {
  id: number
  project_id: number
  account_id: number
  description: string
  budgeted_amount: number
  spent_amount: number
  period_start: string | null
  period_end: string | null
  account?: { id: number; account_code: string; account_name: string }
}

export interface GrantFormData {
  donor_id: number
  grant_code: string
  grant_name: string
  description?: string
  start_date: string
  end_date: string
  total_amount: number
  currency: string
  grant_type?: 'restricted' | 'unrestricted' | 'temporarily_restricted'
  reporting_frequency?: string
  contract_number?: string
  contract_reference?: string
  contract_date?: string
  terms_conditions?: string
  location?: string
  locations?: string[]
  document_type?: string
  donor_contribution_amount?: number
  partner_contribution_amount?: number
  partner_name?: string
  partner_details?: string
  sub_partner_allocation_amount?: number
  our_budget?: number
  parent_grant_id?: number | null
}

export interface ProjectFormData {
  grant_id: number
  office_id: number
  cost_center_id?: number | null
  project_code: string
  project_name: string
  description?: string
  start_date: string
  end_date: string
  total_budget: number
  currency: string
  project_manager_id?: number
  sector?: string
  target_beneficiaries?: number
  location?: string
  locations?: string[]
  status?: string
  parent_project_id?: number | null
  /** Grant type (for UI when editing project's grant); not sent in project API payload */
  grant_type?: 'restricted' | 'unrestricted' | 'temporarily_restricted'
}

/** Optional request config (e.g. skipAuthRedirect to avoid redirect on 401). */
export interface ApiRequestConfig {
  skipAuthRedirect?: boolean
}

// Grant (Contract) APIs — base path /grants
export async function getGrants(
  params?: {
    page?: number
    per_page?: number
    status?: string
    donor_id?: number
    search?: string
    expiring_within_days?: number
  },
  config?: ApiRequestConfig
) {
  const response = await apiClient.get('/grants', {
    params,
    ...config,
    headers: { ...(config?.skipAuthRedirect && { 'X-Skip-Auth-Redirect': 'true' }) },
  })
  return response.data
}

export async function getGrant(id: number) {
  const response = await apiClient.get(`/grants/${id}`)
  return response.data
}

export async function createGrant(data: GrantFormData) {
  const response = await apiClient.post('/grants', data)
  return response.data
}

export async function updateGrant(id: number, data: Partial<GrantFormData & { status: string }>) {
  const response = await apiClient.put(`/grants/${id}`, data)
  return response.data
}

export async function deleteGrant(id: number) {
  const response = await apiClient.delete(`/grants/${id}`)
  return response.data
}

export async function getGrantProjects(grantId: number) {
  const response = await apiClient.get(`/grants/${grantId}/projects`)
  return response.data
}

export async function recordDisbursement(grantId: number, data: { amount: number; disbursement_date: string; reference?: string; notes?: string }) {
  const response = await apiClient.post(`/grants/${grantId}/disbursement`, data)
  return response.data
}

export async function getGrantsSummary() {
  const response = await apiClient.get('/grants/summary')
  return response.data
}

export async function getGrantDocuments(grantId: number) {
  const response = await apiClient.get(`/grants/${grantId}/documents`)
  return response.data
}

export type GrantDocumentType = 'contract' | 'amendment' | 'budget' | 'other'

export async function uploadGrantDocument(
  grantId: number,
  file: File,
  title?: string,
  onUploadProgress?: (percent: number) => void,
  documentType?: GrantDocumentType
) {
  const formData = new FormData()
  formData.append('file', file)
  if (title) formData.append('title', title)
  if (documentType) formData.append('document_type', documentType)
  const response = await apiClient.post(`/grants/${grantId}/documents`, formData, {
    onUploadProgress: onUploadProgress
      ? (e) => onUploadProgress(e.total ? Math.round((e.loaded / e.total) * 100) : 0)
      : undefined,
  })
  return response.data
}

/** Download a grant document (uses auth; triggers browser download) */
export async function downloadGrantDocument(grantId: number, documentId: number, fileName?: string) {
  const { data } = await apiClient.get(`/grants/${grantId}/documents/${documentId}/download`, {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(data as Blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName ?? 'document'
  a.click()
  URL.revokeObjectURL(url)
}

/** Update a grant document (title, document_type) */
export async function updateGrantDocument(
  grantId: number,
  documentId: number,
  data: { title?: string; document_type?: GrantDocumentType }
) {
  const response = await apiClient.put(`/grants/${grantId}/documents/${documentId}`, data)
  return response.data
}

/** Delete a grant document */
export async function deleteGrantDocument(grantId: number, documentId: number) {
  const response = await apiClient.delete(`/grants/${grantId}/documents/${documentId}`)
  return response.data
}

// Project APIs
export async function getProjects(params?: {
  page?: number
  per_page?: number
  status?: string
  office_id?: number
  grant_id?: number
  search?: string
  sector?: string
  /** When true, returns projects from head office (full list for dropdowns e.g. voucher) */
  all_offices?: boolean
}) {
  const response = await apiClient.get('/projects', { params })
  return response.data
}

export async function getProject(id: number) {
  const response = await apiClient.get(`/projects/${id}`)
  return response.data
}

export async function createProject(data: ProjectFormData) {
  const response = await apiClient.post('/projects', data)
  return response.data
}

export async function updateProject(id: number, data: Partial<ProjectFormData & { status: string }>) {
  const response = await apiClient.put(`/projects/${id}`, data)
  return response.data
}

export async function deleteProject(id: number) {
  const response = await apiClient.delete(`/projects/${id}`)
  return response.data
}

export async function getProjectBudgetLines(projectId: number) {
  const response = await apiClient.get(`/projects/${projectId}/budget-lines`)
  return response.data
}

export async function addProjectBudgetLine(projectId: number, data: { account_id: number; description: string; budgeted_amount: number; period_start?: string; period_end?: string }) {
  const response = await apiClient.post(`/projects/${projectId}/budget-lines`, data)
  return response.data
}

export interface ProjectsSummaryParams {
  status?: string
  search?: string
  sector?: string
  office_id?: number
}

export async function getProjectsSummary(params?: ProjectsSummaryParams) {
  const response = await apiClient.get('/projects/summary', { params: params ?? {} })
  return response.data
}

/** Project documents (attachments belong to the project only) */
export async function getProjectDocuments(projectId: number) {
  const response = await apiClient.get(`/projects/${projectId}/documents`)
  return response.data
}

export async function uploadProjectDocument(
  projectId: number,
  file: File,
  title?: string,
  onUploadProgress?: (percent: number) => void,
  documentType?: GrantDocumentType
) {
  const formData = new FormData()
  formData.append('file', file)
  if (title) formData.append('title', title)
  if (documentType) formData.append('document_type', documentType)
  const response = await apiClient.post(`/projects/${projectId}/documents`, formData, {
    onUploadProgress: onUploadProgress
      ? (e) => onUploadProgress(e.total ? Math.round((e.loaded / e.total) * 100) : 0)
      : undefined,
  })
  return response.data
}

export async function downloadProjectDocument(projectId: number, documentId: number, fileName?: string) {
  const { data } = await apiClient.get(`/projects/${projectId}/documents/${documentId}/download`, {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(data as Blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName ?? 'document'
  a.click()
  URL.revokeObjectURL(url)
}

export async function updateProjectDocument(
  projectId: number,
  documentId: number,
  data: { title?: string; document_type?: GrantDocumentType }
) {
  const response = await apiClient.put(`/projects/${projectId}/documents/${documentId}`, data)
  return response.data
}

export async function deleteProjectDocument(projectId: number, documentId: number) {
  const response = await apiClient.delete(`/projects/${projectId}/documents/${documentId}`)
  return response.data
}

// Helper functions
export function getGrantStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    pending_approval: 'Pending Approval',
    approved: 'Approved',
    active: 'Active',
    on_hold: 'On Hold',
    completed: 'Completed',
    closed: 'Closed',
    pending: 'Pending',
    suspended: 'Suspended',
  }
  return labels[status] || status
}

export function getGrantStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    pending_approval: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-800',
    active: 'bg-green-100 text-green-700',
    on_hold: 'bg-orange-100 text-orange-700',
    completed: 'bg-indigo-100 text-indigo-700',
    closed: 'bg-gray-100 text-gray-600',
    pending: 'bg-yellow-100 text-yellow-700',
    suspended: 'bg-orange-100 text-orange-700',
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

export function getProjectStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    planning: 'Planning',
    active: 'Active',
    on_hold: 'On Hold',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }
  return labels[status] || status
}

export function getProjectStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    planning: 'bg-emerald-100 text-emerald-800',
    active: 'bg-green-100 text-green-700',
    on_hold: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-purple-100 text-purple-700',
    cancelled: 'bg-red-100 text-red-700',
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

export function getGrantTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    restricted: 'Restricted',
    unrestricted: 'Unrestricted',
    temporarily_restricted: 'Temporarily Restricted',
  }
  return labels[type] || type
}

export function getGrantTypeColor(type: string): string {
  const colors: Record<string, string> = {
    restricted: 'bg-red-100 text-red-700',
    unrestricted: 'bg-green-100 text-green-700',
    temporarily_restricted: 'bg-yellow-100 text-yellow-700',
  }
  return colors[type] || 'bg-gray-100 text-gray-700'
}

export function calculateUtilization(spent: number, budget: number): number {
  if (budget <= 0) return 0
  return Math.round((spent / budget) * 100)
}

export function calculateDaysRemaining(endDate: string): number {
  const end = new Date(endDate)
  const now = new Date()
  const diffTime = end.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}
