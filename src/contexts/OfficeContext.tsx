'use client'

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { getOffices } from '@/lib/api/offices'
import type { Office } from '@/lib/api/offices'

const SELECTED_OFFICE_ID_KEY = 'selected_office_id'

type OfficeContextValue = {
  /** Currently selected office id for API context (X-Office-Id). Null = use backend default / user's office. */
  officeId: number | null
  setOfficeId: (id: number | null) => void
  /** All offices the user is allowed to switch to (based on can_manage_all_offices or single office). */
  allowedOffices: Office[]
  /** All offices from API (for admin views). */
  offices: Office[]
  isLoading: boolean
  /** Current selected office object, if any. */
  selectedOffice: Office | null
}

const OfficeContext = createContext<OfficeContextValue | null>(null)

export function OfficeProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const [offices, setOffices] = useState<Office[]>([])
  const [officeId, setOfficeIdState] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const setOfficeId = useCallback((id: number | null) => {
    setOfficeIdState(id)
    if (typeof window !== 'undefined') {
      if (id == null) localStorage.removeItem(SELECTED_OFFICE_ID_KEY)
      else localStorage.setItem(SELECTED_OFFICE_ID_KEY, String(id))
    }
  }, [])

  // Offices the user can switch to: all if can_manage_all_offices, else only their office
  const allowedOffices = React.useMemo(() => {
    if (!user) return []
    if (user.can_manage_all_offices) return offices
    const uid = user.office_id ?? user.office?.id
    if (uid == null) return offices.filter((o) => o.is_head_office) // head office only
    return offices.filter((o) => o.id === uid)
  }, [user, offices])

  const selectedOffice = officeId != null ? offices.find((o) => o.id === officeId) ?? null : null

  const initialized = React.useRef(false)

  // Load offices when authenticated
  useEffect(() => {
    if (!user) {
      setOffices([])
      setOfficeIdState(null)
      setIsLoading(false)
      initialized.current = false
      return
    }
    let cancelled = false
    setIsLoading(true)
    getOffices({ is_active: true })
      .then((list) => {
        if (!cancelled) setOffices(list)
      })
      .catch(() => {
        if (!cancelled) setOffices([])
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => { cancelled = true }
  }, [user?.id])

  // Initialize selected office once from localStorage or user default; sync to localStorage so API client sends X-Office-Id
  useEffect(() => {
    if (!user || offices.length === 0 || initialized.current) return
    initialized.current = true
    const stored = typeof window !== 'undefined' ? localStorage.getItem(SELECTED_OFFICE_ID_KEY) : null
    const parsed = stored ? parseInt(stored, 10) : NaN
    const validStored = !Number.isNaN(parsed) && offices.some((o) => o.id === parsed)
    const userOfficeId = user.office_id ?? user.office?.id ?? null
    const defaultId = user.can_manage_all_offices
      ? (validStored ? parsed : userOfficeId ?? offices[0]?.id ?? null)
      : (userOfficeId ?? offices[0]?.id ?? null)
    setOfficeIdState(defaultId)
    if (defaultId != null && typeof window !== 'undefined')
      localStorage.setItem(SELECTED_OFFICE_ID_KEY, String(defaultId))
  }, [user, offices])

  const value = React.useMemo<OfficeContextValue>(
    () => ({
      officeId,
      setOfficeId,
      allowedOffices,
      offices,
      isLoading,
      selectedOffice,
    }),
    [officeId, setOfficeId, allowedOffices, offices, isLoading, selectedOffice]
  )

  return <OfficeContext.Provider value={value}>{children}</OfficeContext.Provider>
}

export function useOffice(): OfficeContextValue {
  const ctx = useContext(OfficeContext)
  if (!ctx) throw new Error('useOffice must be used within OfficeProvider')
  return ctx
}

export function useOfficeOptional(): OfficeContextValue | null {
  return useContext(OfficeContext)
}
