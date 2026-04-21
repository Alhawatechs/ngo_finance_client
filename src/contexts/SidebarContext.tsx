'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useUserPreferencesStore } from '@/stores/userPreferencesStore'

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed'

const SIDEBAR_WIDTH_OPEN = 220
const SIDEBAR_WIDTH_CLOSED = 56
export const FLYOUT_WIDTH = 220

type SidebarContextValue = {
  isCollapsed: boolean
  toggle: () => void
  width: number
  flyoutOpen: boolean
  setFlyoutOpen: (open: boolean) => void
  contentLeft: number
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const sidebarDefaultOpen = useUserPreferencesStore((s) => s.appearancePreferences.sidebarDefaultOpen)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [flyoutOpen, setFlyoutOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
      if (stored !== null) {
        setIsCollapsed(stored === 'true')
      } else {
        setIsCollapsed(!sidebarDefaultOpen)
      }
    } catch {
      // ignore
    }
    setMounted(true)
  }, [sidebarDefaultOpen])

  useEffect(() => {
    if (!mounted) return
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed))
    } catch {
      // ignore
    }
  }, [mounted, isCollapsed])

  const toggle = useCallback(() => setIsCollapsed((p) => !p), [])

  const width = isCollapsed ? SIDEBAR_WIDTH_CLOSED : SIDEBAR_WIDTH_OPEN
  // Second sidebar overlays the page (does not push content); content area stays fixed
  const contentLeft = width

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggle, width, flyoutOpen, setFlyoutOpen, contentLeft }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
  return ctx
}

export { SIDEBAR_WIDTH_OPEN, SIDEBAR_WIDTH_CLOSED }
