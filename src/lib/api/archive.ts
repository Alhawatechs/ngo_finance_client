import apiClient from './client'
import type { PaginatedResponse } from './client'

export interface ArchiveDocument {
  id: number
  title: string
  file_name: string
  file_path: string
  file_type: string
  file_size: number
  document_type: string
  archive_category: string | null
  retention_until: string | null
  office_id: number | null
  office: { id: number; name: string; code: string } | null
  source: 'grant' | 'project' | 'voucher' | 'standalone'
  source_label: string
  source_link: string | null
  uploaded_by: { id: number; name: string } | null
  created_at: string
}

export interface ArchiveListParams {
  page?: number
  per_page?: number
  document_type?: string
  archive_category?: string
  source?: 'grant' | 'project' | 'voucher' | 'standalone'
  date_from?: string
  date_to?: string
  search?: string
  retention_expired?: boolean | string
  office_id?: number | string
}

export async function getArchiveDocuments(
  params: ArchiveListParams = {}
): Promise<PaginatedResponse<ArchiveDocument>> {
  const { data } = await apiClient.get<PaginatedResponse<ArchiveDocument>>('/archive', {
    params,
  })
  return data
}

export async function getArchiveDocument(id: number): Promise<{ data: ArchiveDocument }> {
  const { data } = await apiClient.get<{ data: ArchiveDocument }>(`/archive/${id}`)
  return data
}

export async function uploadArchiveDocument(formData: FormData): Promise<{ data: { document: ArchiveDocument } }> {
  const { data } = await apiClient.post<{ data: { document: ArchiveDocument } }>('/archive', formData)
  return data
}

export async function downloadArchiveDocument(id: number): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/archive/${id}/download`, {
    responseType: 'blob',
  })
  return data
}

export async function deleteArchiveDocument(id: number): Promise<void> {
  await apiClient.delete(`/archive/${id}`)
}

export async function bulkDownloadArchiveDocuments(ids: number[]): Promise<Blob> {
  const { data } = await apiClient.post<Blob>('/archive/bulk-download', { ids }, {
    responseType: 'blob',
  })
  return data
}
