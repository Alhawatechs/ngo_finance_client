'use client'

import Link from 'next/link'
import { DollarSign, Hash, Calendar, ChevronRight, ExternalLink } from 'lucide-react'

const links = [
  {
    title: 'Currency',
    description: 'Currencies, exchange rates, and multi-currency (General Ledger).',
    href: '/general-ledger/currency',
  },
  {
    title: 'Voucher settings',
    description: 'Numbering, prefixes, coding blocks, and print options.',
    href: '/vouchers/settings',
  },
  {
    title: 'Fiscal years',
    description: 'Fiscal years, periods, and period close controls.',
    href: '/general-ledger/fiscal-years',
  },
  {
    title: 'Help & guides',
    description: 'Documentation and FAQs.',
    href: '/help',
  },
]

export function FinanceShortcutsSection() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {links.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/5"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground group-hover:bg-primary/10 group-hover:text-primary">
            {item.title.includes('Currency') ? (
              <DollarSign className="h-5 w-5" />
            ) : item.title.includes('Voucher') ? (
              <Hash className="h-5 w-5" />
            ) : item.title.includes('Fiscal') ? (
              <Calendar className="h-5 w-5" />
            ) : (
              <ExternalLink className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground group-hover:text-primary">{item.title}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-primary" />
        </Link>
      ))}
    </div>
  )
}
