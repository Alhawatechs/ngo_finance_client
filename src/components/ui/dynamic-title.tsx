'use client'

import { useEffect } from 'react'
import { useOrganizationStore } from '@/stores/organizationStore'

interface DynamicTitleProps {
  suffix?: string
}

export function DynamicTitle({ suffix = 'Finance' }: DynamicTitleProps) {
  const { branding } = useOrganizationStore()

  useEffect(() => {
    const orgName = branding?.short_name || branding?.name || 'ERP'
    document.title = `${orgName} ${suffix}`
  }, [branding, suffix])

  return null
}

// Hook version for more flexibility
export function useDynamicTitle(pageTitle?: string) {
  const { branding } = useOrganizationStore()

  useEffect(() => {
    const orgName = branding?.short_name || branding?.name || 'ERP'
    const baseName = `${orgName} Finance`
    
    if (pageTitle) {
      document.title = `${pageTitle} | ${baseName}`
    } else {
      document.title = baseName
    }
  }, [branding, pageTitle])
}
