import apiClient from './client'

export interface AuditLogEntry {
  id: number
  organization_id: number | null
  user_id: number | null
  user_name: string | null
  action: string
  model_type: string
  model_id: number | null
  description: string
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  url: string | null
  method: string | null
  created_at: string
  user?: { id: number; name: string } | null
}

export interface AuditLogsParams {
  page?: number
  per_page?: number
  user_id?: number
  model_type?: string
  action?: string
  from?: string
  to?: string
}

export interface AuditLogsResponse {
  data: AuditLogEntry[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number | null
    to: number | null
  }
}

export async function getAuditLogs(
  params: AuditLogsParams = {}
): Promise<AuditLogsResponse> {
  const response = await apiClient.get('/audit-compliance/audit-logs', { params })
  return response.data
}

export async function getAuditLog(id: number): Promise<{ data: AuditLogEntry }> {
  const response = await apiClient.get(`/audit-compliance/audit-logs/${id}`)
  return response.data
}

/** Human-readable model type labels for filter display */
export const AUDIT_MODEL_TYPES: Record<string, string> = {
  'App\\Models\\Voucher': 'Voucher',
  'App\\Models\\JournalEntry': 'Journal Entry',
  'App\\Models\\User': 'User',
  'App\\Models\\Grant': 'Grant',
  'App\\Models\\Project': 'Project',
}

export function getModelTypeLabel(modelType: string): string {
  return AUDIT_MODEL_TYPES[modelType] ?? modelType
}
