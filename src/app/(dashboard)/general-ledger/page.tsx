'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import { useOrganizationStore } from '@/stores/organizationStore'
import { useAuthStore } from '@/stores/authStore'
import {
  FinancePageHeader,
  FinanceModuleCard,
  FinanceModuleLinks,
} from '@/components/finance'
import {
  BookOpen,
  FileText,
  Receipt,
  Calendar,
  Lock,
  Settings,
  Coins,
  ArrowRight,
  FolderKanban,
  ScrollText,
} from 'lucide-react'

function canAccessPeriodClose(
  user: { is_super_admin?: boolean; permissions?: string[] } | null
): boolean {
  if (!user) return false
  if (user.is_super_admin) return true
  const p = user.permissions ?? []
  return (
    p.includes('view-period-close') ||
    p.includes('manage-period-close') ||
    p.includes('permanently-lock-period-close')
  )
}

const modules = [
  {
    title: 'Chart of Accounts',
    description: 'Manage account structure, opening balances, and import/export. View account statements by clicking a posting account.',
    href: '/general-ledger/accounts',
    icon: <BookOpen className="h-6 w-6" />,
  },
  {
    title: 'Journal Entries',
    description: 'Journal books per project, plus Posted ledger for GL lines by project and account class.',
    href: '/general-ledger/journal-entries',
    icon: <FileText className="h-6 w-6" />,
  },
  {
    title: 'Vouchers',
    description: 'Payment, receipt, journal, and contra vouchers with approval workflow.',
    href: '/vouchers',
    icon: <Receipt className="h-6 w-6" />,
  },
  {
    title: 'Fiscal Years',
    description: 'Define fiscal years and periods for reporting and period close.',
    href: '/general-ledger/fiscal-years',
    icon: <Calendar className="h-6 w-6" />,
  },
  {
    title: 'Period Close',
    description: 'Close accounting periods and lock prior periods.',
    href: '/general-ledger/period-close',
    icon: <Lock className="h-6 w-6" />,
  },
  {
    title: 'Voucher Settings',
    description: 'Voucher number format and prefixes by organization.',
    href: '/vouchers/settings',
    icon: <Settings className="h-6 w-6" />,
  },
  {
    title: 'Currency',
    description: 'Manage currencies and exchange rates.',
    href: '/general-ledger/currency',
    icon: <Coins className="h-6 w-6" />,
  },
]

export default function GeneralLedgerPage() {
  const organization = useOrganizationStore((s) => s.organization)
  const user = useAuthStore((s) => s.user)
  const projectListLabel = (organization?.short_name || organization?.name) ? `${organization.short_name || organization.name}'s Project List` : 'Project Portfolio'
  const glModules = useMemo(
    () => modules.filter((m) => m.href !== '/general-ledger/period-close' || canAccessPeriodClose(user)),
    [user]
  )
  return (
    <div className="space-y-8">
      <FinancePageHeader
        title="General Ledger"
        description="Central hub for accounting: chart of accounts, journal entries, vouchers, and financial reporting. Each project has its own journal and ledger through to financial statements."
      />

      <FinanceModuleLinks
        variant="card"
        title="Quick links"
        includePeriodClose={canAccessPeriodClose(user)}
      />

      {/* Quick GL actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/general-ledger/accounts"
          className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <BookOpen className="h-4 w-4" />
          Chart of Accounts
        </Link>
        <Link
          href="/general-ledger/journal-entries"
          className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <FileText className="h-4 w-4" />
          Journal Entries
        </Link>
        <Link
          href="/general-ledger/journal-entries/posted"
          className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <ScrollText className="h-4 w-4" />
          Posted ledger
        </Link>
        <Link
          href="/general-ledger/fiscal-years"
          className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Calendar className="h-4 w-4" />
          Fiscal years
        </Link>
        {canAccessPeriodClose(user) && (
          <Link
            href="/general-ledger/period-close"
            className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Lock className="h-4 w-4" />
            Period close
          </Link>
        )}
        <Link
          href="/general-ledger/currency"
          className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Coins className="h-4 w-4" />
          Currency
        </Link>
      </div>

      {/* Link to Projects: journal, vouchers and reports can be filtered by project */}
      <div className="rounded-lg border bg-muted/20 p-4">
        <div className="flex items-center gap-3 mb-2">
          <FolderKanban className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Projects &amp; General Ledger</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Each project has its own journal and vouchers. Open the project portfolio to view project budgets, then use Journal Entries (or Financial Reporting for trial balance and statements) with the project filter where available.
        </p>
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <FolderKanban className="h-4 w-4" />
          Open {projectListLabel}
        </Link>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Modules</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {glModules.map((mod) => (
            <Link key={mod.href} href={mod.href} className="group block">
              <FinanceModuleCard
                title={mod.title}
                subtitle={mod.description}
                icon={mod.icon}
                className="h-full transition-shadow hover:shadow-md group-hover:border-primary/50"
              >
                <div className="flex items-center justify-between text-sm text-primary font-medium">
                  <span>Open</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </FinanceModuleCard>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
