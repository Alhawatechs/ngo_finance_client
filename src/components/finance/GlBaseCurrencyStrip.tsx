'use client'

import React, { useEffect } from 'react'
import { useOrganizationStore } from '@/stores/organizationStore'
import { getCurrencyIsoCode } from '@/lib/utils'

/**
 * Shows organization reporting base currency in General Ledger module headers (amounts in GL use this basis).
 */
export function GlBaseCurrencyStrip() {
  const organization = useOrganizationStore((s) => s.organization)
  const fetchOrganization = useOrganizationStore((s) => s.fetchOrganization)

  useEffect(() => {
    void fetchOrganization()
  }, [fetchOrganization])

  const code = getCurrencyIsoCode(organization?.default_currency)

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span
        className="inline-flex items-center rounded border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] font-medium tabular-nums text-foreground"
        title="Organization default / reporting base currency for GL amounts"
      >
        Base currency: {code}
      </span>
    </div>
  )
}
