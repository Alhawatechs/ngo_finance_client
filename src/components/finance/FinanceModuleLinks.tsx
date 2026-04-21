'use client'

import React from 'react'
import Link from 'next/link'
import {
  BookOpen,
  FileText,
  Receipt,
  BarChart3,
  FolderKanban,
  ScrollText,
  Calendar,
  Lock,
  Coins,
  LayoutGrid,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FinanceModuleLinkItem {
  label: string
  href: string
  icon?: React.ReactNode
}

const DEFAULT_LINKS: FinanceModuleLinkItem[] = [
  { label: 'GL hub', href: '/general-ledger', icon: <LayoutGrid className="h-4 w-4" /> },
  { label: 'Chart of Accounts', href: '/general-ledger/accounts', icon: <BookOpen className="h-4 w-4" /> },
  { label: 'Journal Entries', href: '/general-ledger/journal-entries', icon: <FileText className="h-4 w-4" /> },
  { label: 'Posted ledger', href: '/general-ledger/journal-entries/posted', icon: <ScrollText className="h-4 w-4" /> },
  { label: 'Vouchers', href: '/vouchers', icon: <Receipt className="h-4 w-4" /> },
  { label: 'Fiscal years', href: '/general-ledger/fiscal-years', icon: <Calendar className="h-4 w-4" /> },
  { label: 'Period close', href: '/general-ledger/period-close', icon: <Lock className="h-4 w-4" /> },
  { label: 'Currency', href: '/general-ledger/currency', icon: <Coins className="h-4 w-4" /> },
  { label: 'Voucher settings', href: '/vouchers/settings', icon: <Settings className="h-4 w-4" /> },
  { label: 'Financial Reporting', href: '/reports', icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'Projects', href: '/projects', icon: <FolderKanban className="h-4 w-4" /> },
]

const PERIOD_CLOSE_HREF = '/general-ledger/period-close'

export interface FinanceModuleLinksProps {
  /** Override default links (e.g. hide current page) */
  links?: FinanceModuleLinkItem[]
  /** When false, omits Period close (e.g. user lacks permission). Ignored if custom `links` omit it. Default true. */
  includePeriodClose?: boolean
  /** Compact inline style vs card style */
  variant?: 'card' | 'inline'
  /** Optional title */
  title?: string
  className?: string
}

/**
 * Cross-navigation between core finance modules: GL hub, Chart of Accounts, journals, fiscal years, currency, etc.
 * Use on the General Ledger hub and other finance pages to link the finance lifecycle.
 */
export function FinanceModuleLinks({
  links,
  includePeriodClose = true,
  variant = 'card',
  title = 'Finance modules',
  className,
}: FinanceModuleLinksProps) {
  const resolvedLinks = React.useMemo(() => {
    const base = links ?? DEFAULT_LINKS
    if (includePeriodClose !== false) return base
    return base.filter((l) => l.href !== PERIOD_CLOSE_HREF)
  }, [links, includePeriodClose])

  if (variant === 'inline') {
    return (
      <nav className={cn('flex flex-wrap items-center gap-1 text-sm', className)} aria-label={title}>
        {resolvedLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    )
  }

  return (
    <div className={cn('rounded-lg border bg-muted/30 p-3', className)}>
      <p className="text-xs font-medium text-muted-foreground mb-2">{title}</p>
      <nav className="flex flex-wrap gap-2" aria-label={title}>
        {resolvedLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
