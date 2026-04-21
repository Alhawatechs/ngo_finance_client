'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const ORG_REFETCH_THROTTLE_MS = 2 * 60 * 1000
/** Only if persist never calls onRehydrateStorage (corrupt storage / rare bugs) — avoid short timeouts that race before merge */
const HYDRATION_FALLBACK_MS = 15000
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { DynamicTitle } from '@/components/ui/dynamic-title'
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext'
import { OfficeProvider } from '@/contexts/OfficeContext'
import { SettingsApply } from '@/components/settings/SettingsApply'
import { useAuthStore } from '@/stores/authStore'
import { useOrganizationStore } from '@/stores/organizationStore'
import { getCurrentUser } from '@/lib/api/auth'

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { contentLeft } = useSidebar()
  return (
    <>
      <DynamicTitle />
      <Sidebar />
      <Suspense
        fallback={
          <div
            className="fixed top-0 right-0 z-40 h-14 border-b border-primary-dark bg-primary shadow-sm transition-[left] duration-200 ease-out"
            style={{ left: contentLeft }}
            aria-hidden
          />
        }
      >
        <Header />
      </Suspense>
      <main
        className="flex min-h-0 flex-1 flex-col mt-14 overflow-y-auto overflow-x-clip overscroll-contain bg-background transition-[margin] duration-200 ease-out"
        style={{ marginLeft: contentLeft }}
      >
        <div className="mx-auto flex min-h-0 w-full max-w-[min(100%,1920px)] flex-1 flex-col p-6">
          {children}
        </div>
      </main>
    </>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated, user, isHydrated, setHydrated, clearSession, setUser } = useAuthStore()
  const { fetchOrganization } = useOrganizationStore()
  const [hydrationFallbackFired, setHydrationFallbackFired] = useState(false)

  // Long fallback only if persist never finishes (corrupt storage). Short timers race merge and cleared valid sessions.
  useEffect(() => {
    if (isHydrated) return
    const t = setTimeout(() => {
      setHydrationFallbackFired(true)
      setHydrated()
    }, HYDRATION_FALLBACK_MS)
    return () => clearTimeout(t)
  }, [isHydrated, setHydrated])

  // After hydration (or rare fallback): redirect if not authenticated or no user; clear session first to avoid redirect loop
  const hydrated = isHydrated || hydrationFallbackFired
  useEffect(() => {
    if (!hydrated) return
    if (!isAuthenticated || !user) {
      clearSession()
      router.replace('/login')
    }
  }, [hydrated, isAuthenticated, user, router, clearSession])

  useEffect(() => {
    if (isAuthenticated && user && hydrated) {
      fetchOrganization()
    }
  }, [isAuthenticated, user, hydrated, fetchOrganization])

  /** Sync user from API so roles/permissions/is_super_admin match backend (fixes stale persisted auth). */
  useEffect(() => {
    if (!hydrated || !isAuthenticated || !user?.id) return
    let cancelled = false
    getCurrentUser()
      .then((fresh) => {
        if (!cancelled) setUser(fresh)
      })
      .catch(() => {
        /* invalid/expired token handled by API client or redirect */
      })
    return () => {
      cancelled = true
    }
  }, [hydrated, isAuthenticated, user?.id, setUser])

  const lastOrgFetch = useRef<number>(0)
  useEffect(() => {
    if (!isAuthenticated || !user || !hydrated) return
    const maybeRefetch = () => {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (now - lastOrgFetch.current < ORG_REFETCH_THROTTLE_MS) return
      lastOrgFetch.current = now
      fetchOrganization()
    }
    document.addEventListener('visibilitychange', maybeRefetch)
    return () => document.removeEventListener('visibilitychange', maybeRefetch)
  }, [isAuthenticated, user, hydrated, fetchOrganization])

  // Show loading only while we're hydrated but waiting for auth state or redirect
  const showContent = hydrated && isAuthenticated && user
  if (!showContent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <SettingsApply />
      <SidebarProvider>
        <OfficeProvider>
          <DashboardContent>{children}</DashboardContent>
        </OfficeProvider>
      </SidebarProvider>
    </div>
  )
}
