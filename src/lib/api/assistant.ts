import apiClient, { ApiResponse } from './client'

export interface AssistantChatResponse {
  reply: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Send a message to the AI Finance Assistant. Uses current auth and office context.
 * Rate limit: 20 requests per minute per user.
 */
export async function sendAssistantMessage(
  message: string,
  conversationId?: string
): Promise<AssistantChatResponse> {
  const response = await apiClient.post<ApiResponse<AssistantChatResponse>>(
    '/assistant/chat',
    {
      message,
      ...(conversationId ? { conversation_id: conversationId } : {}),
    },
    { timeout: 60000 }
  )
  const payload = response?.data
  if (!payload?.success || payload.data == null) {
    throw new Error(payload?.message ?? 'Invalid response from assistant')
  }
  return payload.data
}
