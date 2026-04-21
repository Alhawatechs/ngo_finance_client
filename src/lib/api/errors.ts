import { AxiosError } from 'axios'

type LaravelErrorPayload = {
  message?: string
  errors?: Record<string, string[] | string>
}

/**
 * Human-readable message from Laravel validation (422) or API error JSON.
 * Prefers `errors` over generic "The given data was invalid." when present.
 */
export function getApiErrorMessage(error: unknown, fallback = 'Request failed.'): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as LaravelErrorPayload | undefined
    if (data && typeof data === 'object') {
      const errs = data.errors
      if (errs && typeof errs === 'object') {
        const lines: string[] = []
        for (const [field, msgs] of Object.entries(errs)) {
          const arr = Array.isArray(msgs) ? msgs : [String(msgs)]
          const label = field.replace(/_/g, ' ')
          for (const m of arr) {
            if (m) lines.push(`${label}: ${m}`)
          }
        }
        if (lines.length) return lines.join(' · ')
      }
      if (typeof data.message === 'string' && data.message.trim() !== '') {
        if (data.message === 'The given data was invalid.' && data.errors) {
          return fallback
        }
        return data.message
      }
    }
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const m = (error as { message: unknown }).message
    if (typeof m === 'string' && m.trim() !== '') return m
  }
  return fallback
}
