'use client'

import { useEffect } from 'react'
import { useOrganizationStore } from '@/stores/organizationStore'

const FAVICON_ID = 'dynamic-favicon'

/** Remove all existing favicon links so our dynamic one takes precedence */
function removeExistingFavicons() {
  if (typeof document === 'undefined') return
  const existing = document.head.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]')
  existing.forEach((el) => {
    if (el.id !== FAVICON_ID) el.remove()
  })
}

/**
 * Sets the browser tab favicon to the organization logo when available.
 * Runs after hydration so persisted branding (with logo_url) is used.
 */
export function DynamicFavicon() {
  const { branding, isHydrated } = useOrganizationStore()
  const logoUrl = branding?.logo_url

  useEffect(() => {
    if (!isHydrated) return

    if (logoUrl) {
      removeExistingFavicons()
      let link = document.getElementById(FAVICON_ID) as HTMLLinkElement | null
      if (!link) {
        link = document.createElement('link')
        link.id = FAVICON_ID
        link.rel = 'icon'
        link.type = 'image/png'
        document.head.insertBefore(link, document.head.firstChild)
      }
      link.href = logoUrl
    } else {
      const link = document.getElementById(FAVICON_ID)
      if (link) link.remove()
    }
  }, [isHydrated, logoUrl])

  return null
}
