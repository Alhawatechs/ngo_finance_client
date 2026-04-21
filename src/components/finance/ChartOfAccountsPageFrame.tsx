'use client'

import React from 'react'
import { cn } from '@/lib/utils'

/**
 * Wraps Chart of Accounts sub-pages (same shell as Account list): fills module height,
 * no duplicate page title (module header + tabs), accessible screen title.
 */
export function ChartOfAccountsPageFrame({
  title,
  children,
  className,
}: {
  /** Announced to assistive tech; visible title lives in the module header. */
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col overflow-hidden', className)}>
      <h2 className="sr-only">{title}</h2>
      {children}
    </div>
  )
}
