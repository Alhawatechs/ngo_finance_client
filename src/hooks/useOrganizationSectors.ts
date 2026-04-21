'use client'

import { useEffect } from 'react'
import { useOrganizationStore } from '@/stores/organizationStore'
import { DEFAULT_SECTOR_OPTIONS } from '@/lib/organization-sectors'

/**
 * Returns sectors of operation from Organization setup. Used for sector dropdowns
 * (projects filter, project form, amendment form). When the organization has no
 * sectors configured, falls back to DEFAULT_SECTOR_OPTIONS so the app still works.
 */
export function useOrganizationSectors(): {
  sectors: string[]
  isLoading: boolean
  fromOrganization: boolean
} {
  const { organization, isLoading, fetchOrganization } = useOrganizationStore()

  useEffect(() => {
    if (organization === null && !isLoading) {
      void fetchOrganization()
    }
  }, [organization, isLoading, fetchOrganization])

  const orgSectors = organization?.sectors_of_operation ?? []
  const hasOrgSectors = Array.isArray(orgSectors) && orgSectors.length > 0

  return {
    sectors: hasOrgSectors ? orgSectors : [...DEFAULT_SECTOR_OPTIONS],
    isLoading,
    fromOrganization: hasOrgSectors,
  }
}
