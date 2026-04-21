'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCcw,
  ArrowRightLeft,
  Coins,
  Calculator,
  type LucideIcon,
} from 'lucide-react'

export type CashSubNavItem = {
  href: string
  label: string
  description: string
  icon: LucideIcon
}

export const CASH_MANAGEMENT_NAV_ITEMS: CashSubNavItem[] = [
  {
    href: '/treasury/cash',
    label: 'Cash accounts',
    description: 'Balances by office and cash type',
    icon: Wallet,
  },
  {
    href: '/treasury/cash/withdrawal',
    label: 'Withdrawal',
    description: 'Pay out cash or bank withdrawals',
    icon: ArrowUpRight,
  },
  {
    href: '/treasury/cash/deposit',
    label: 'Deposit',
    description: 'Receive cash into an account',
    icon: ArrowDownLeft,
  },
  {
    href: '/treasury/cash/exchange',
    label: 'Exchange',
    description: 'Convert between cash accounts / currencies',
    icon: RefreshCcw,
  },
  {
    href: '/treasury/cash/transfer',
    label: 'Transfer',
    description: 'Move cash between accounts',
    icon: ArrowRightLeft,
  },
  {
    href: '/treasury/cash/interproject-loan',
    label: 'Inter-project loan',
    description: 'Lend cash between funded projects',
    icon: Coins,
  },
  {
    href: '/treasury/cash/cash-count',
    label: 'Cash count',
    description: 'Denomination count & variance',
    icon: Calculator,
  },
]

function navItemIsActive(pathname: string, href: string): boolean {
  if (href === '/treasury/cash') {
    return pathname === '/treasury/cash'
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function CashManagementSubNav({
  variant = 'strip',
  className,
}: {
  variant?: 'strip' | 'cards'
  className?: string
}) {
  const pathname = usePathname() ?? ''

  if (variant === 'cards') {
    return (
      <nav
        className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-4', className)}
        aria-label="Cash Management sections"
      >
        {CASH_MANAGEMENT_NAV_ITEMS.map((item) => {
          const active = navItemIsActive(pathname, item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm transition-colors',
                active
                  ? 'border-primary ring-1 ring-primary/20 bg-primary/[0.04]'
                  : 'border-border hover:border-primary/40 hover:bg-muted/40'
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-md border bg-muted/50',
                    active && 'border-primary/30 bg-primary/10 text-primary'
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className={cn('font-semibold leading-tight', active && 'text-primary')}>{item.label}</span>
              </div>
              <p className="text-xs leading-snug text-muted-foreground">{item.description}</p>
            </Link>
          )
        })}
      </nav>
    )
  }

  return (
    <nav
      className={cn(
        '-mx-1 flex gap-1 overflow-x-auto pb-1 [scrollbar-gutter:stable] md:flex-wrap',
        className
      )}
      aria-label="Cash Management sections"
    >
      {CASH_MANAGEMENT_NAV_ITEMS.map((item) => {
        const active = navItemIsActive(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-transparent bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
