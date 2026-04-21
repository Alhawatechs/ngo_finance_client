'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { useOrganizationStore } from '@/stores/organizationStore'
import { HomeHeader } from '@/components/home/HomeHeader'
import { HomeHero } from '@/components/home/HomeHero'
import { HomeAudience } from '@/components/home/HomeAudience'
import { HomeOverview } from '@/components/home/HomeOverview'
import { HomeFeatures } from '@/components/home/HomeFeatures'
import { HomeTrust } from '@/components/home/HomeTrust'
import { HomeSecurity } from '@/components/home/HomeSecurity'
import { HomeFooter } from '@/components/home/HomeFooter'

/**
 * Public home (`/`): org branding, authenticated redirect to dashboard, skip link,
 * and scroll region for long content.
 */
export function PublicHome() {
  const router = useRouter()
  const fetchBranding = useOrganizationStore((s) => s.fetchBranding)
  const { isAuthenticated, user, isHydrated } = useAuthStore()

  useEffect(() => {
    fetchBranding().catch(() => {})
  }, [fetchBranding])

  useEffect(() => {
    if (isHydrated && isAuthenticated && user) {
      router.replace('/dashboard')
    }
  }, [isHydrated, isAuthenticated, user, router])

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-white">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-[#0f766e] focus:px-4 focus:py-2 focus:text-white focus:outline-none focus:ring-2 focus:ring-[#14b8a6]/50"
      >
        Skip to main content
      </a>
      <div
        id="public-home-scroll"
        className="scroll-smooth motion-reduce:scroll-auto flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain antialiased [-webkit-overflow-scrolling:touch]"
      >
        <HomeHeader />
        <main id="main-content" className="flex-1">
          <HomeHero />
          <HomeAudience />
          <HomeOverview />
          <HomeFeatures />
          <HomeTrust />
          <HomeSecurity />
        </main>
        <HomeFooter />
      </div>
    </div>
  )
}
