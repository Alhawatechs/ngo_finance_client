'use client'

import { Suspense } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from 'sonner'
import { PageLoader } from '@/components/ui/page-loader'
import { ApiHealthBanner } from '@/components/ui/api-health-banner'
import { DynamicFavicon } from '@/components/ui/dynamic-favicon'

/**
 * Loaded via `next/dynamic` + `ssr: false` from the root layout so the main bundle
 * does not include toast, health banner, favicon, or route progress until after hydration.
 */
export function RootDeferredUi() {
  return (
    <>
      <DynamicFavicon />
      <ApiHealthBanner />
      <Suspense fallback={null}>
        <PageLoader />
      </Suspense>
      <Toaster />
      <SonnerToaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            borderRadius: '12px',
          },
        }}
      />
    </>
  )
}
