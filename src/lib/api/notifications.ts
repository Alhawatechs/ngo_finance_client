import apiClient from './client'

export interface UserNotification {
  id: number
  user_id: number
  type: string
  title: string
  message: string
  action_url: string | null
  data: Record<string, unknown> | null
  is_read: boolean
  read_at: string | null
  created_at: string
  updated_at: string
}

export interface NotificationsListParams {
  page?: number
  per_page?: number
  unread_only?: boolean
  type?: string
}

export interface PaginatedMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

export interface NotificationsListResponse {
  success: boolean
  message: string
  data: UserNotification[]
  meta: PaginatedMeta
}

export async function getNotificationsUnreadCount(): Promise<{ data: { unread_count: number } }> {
  const res = await apiClient.get('/notifications/unread-count')
  return res.data
}

export async function getNotificationsRecent(limit = 10): Promise<{ data: UserNotification[] }> {
  const res = await apiClient.get('/notifications/recent', { params: { limit } })
  return res.data
}

export async function listNotifications(
  params?: NotificationsListParams
): Promise<NotificationsListResponse> {
  const res = await apiClient.get('/notifications', { params })
  return res.data
}

export async function markNotificationRead(id: number): Promise<{ data: UserNotification }> {
  const res = await apiClient.patch(`/notifications/${id}/read`)
  return res.data
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post('/notifications/mark-all-read')
}

export async function deleteNotification(id: number): Promise<void> {
  await apiClient.delete(`/notifications/${id}`)
}
