'use client'

import React, { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const HEALTH_URL = '/api/v1/health'
const CHECK_INTERVAL_MS = 15000

/**
 * Pings the backend health endpoint. If the API is unreachable (e.g. backend not running),
 * shows a dismissible banner so users know why login/data might fail.
 */
export function ApiHealthBanner() {
  const [apiDown, setApiDown] = useState<boolean | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const res = await fetch(HEALTH_URL, {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
        })
        if (!cancelled) setApiDown(!res.ok)
      } catch {
        if (!cancelled) setApiDown(true)
      }
    }
    check()
    const id = setInterval(check, CHECK_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  if (apiDown !== true || dismissed) return null

  return (
    <div
      role="alert"
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 bg-amber-500/95 text-amber-950 text-sm font-medium',
        'border-b border-amber-600/50 shadow-sm'
      )}
    >
      <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <strong>Backend API is not running.</strong> Login and data will not work. Start the backend in a separate
        terminal: <code className="mx-1 rounded bg-amber-600/30 px-1.5 py-0.5 font-mono text-xs">cd backend</code>
        then <code className="rounded bg-amber-600/30 px-1.5 py-0.5 font-mono text-xs">php artisan serve</code>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded p-1 hover:bg-amber-600/30 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
