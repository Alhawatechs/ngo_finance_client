'use client'

import React from 'react'
import { GlBaseCurrencyStrip } from '@/components/finance'

export default function VouchersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3" data-gl-vouchers-module>
      <div className="shrink-0 rounded-lg border border-border/40 bg-muted/10 px-3 py-2 md:px-4">
        <GlBaseCurrencyStrip />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  )
}
