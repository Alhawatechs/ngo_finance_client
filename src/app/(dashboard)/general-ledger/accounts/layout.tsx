'use client'

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/contexts/SidebarContext'
import { useChartOfAccountsPermissions } from '@/hooks/useChartOfAccountsPermissions'
import { Card, CardContent } from '@/components/ui/card'
import { GlBaseCurrencyStrip } from '@/components/finance'
import { CoaSubNavTabLink } from '@/components/finance/CoaSubNavTabLink'
import { ListTree, Wallet, Upload, Tag, FileText, Lock, ChevronRight, Info } from 'lucide-react'

/** App shell header height (matches Header.tsx h-14) */
const APP_HEADER_OFFSET_PX = 56

const subNavItems = [
  { href: '/general-ledger/accounts', label: 'Account List', icon: ListTree, group: 'ledger' },
  { href: '/general-ledger/accounts/opening-balances', label: 'Opening Balances', icon: Wallet, group: 'ledger' },
  { href: '/general-ledger/accounts/statement', label: 'Account Statement', icon: FileText, group: 'ledger' },
  { href: '/general-ledger/accounts/structure/donor-mapping', label: 'Donor Mapping', icon: Tag, group: 'ledger' },
  { href: '/general-ledger/accounts/import-export', label: 'Import & Export', icon: Upload, group: 'ledger' },
] as const

export default function ChartOfAccountsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { canViewCoaModule, canViewOpeningBalances } = useChartOfAccountsPermissions()
  const pathname = usePathname()
  const { contentLeft } = useSidebar()
  const headerRef = useRef<HTMLElement>(null)
  /** Approximate until measured (avoids content sliding under fixed header on first paint). */
  const [headerHeight, setHeaderHeight] = useState(120)

  const isActive = (href: string) =>
    href === '/general-ledger/accounts'
      ? pathname === '/general-ledger/accounts'
      : pathname === href || (href !== '/general-ledger/accounts' && pathname.startsWith(href))

  /** These routes fill module height; scrolling stays inside the table/card (no page-level vertical scrollbar). */
  const isAccountListRoot = pathname === '/general-ledger/accounts'
  const isOpeningBalancesPage = pathname === '/general-ledger/accounts/opening-balances'
  const coaFillHeightInnerScroll = isAccountListRoot || isOpeningBalancesPage

  const visibleSubNavItems = useMemo(
    () =>
      subNavItems.filter(
        (item) =>
          item.href !== '/general-ledger/accounts/opening-balances' || canViewOpeningBalances
      ),
    [canViewOpeningBalances]
  )

  useLayoutEffect(() => {
    const el = headerRef.current
    if (!el) return
    const measure = () => setHeaderHeight(el.offsetHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [pathname])

  return (
    <div
      data-chart-of-accounts-module
      className="-mx-6 flex min-h-0 flex-1 flex-col overflow-hidden bg-background"
    >
      {/*
        Fixed below app header so this block never scrolls away. (Sticky breaks when an ancestor
        uses overflow-x-hidden/clip on the scroll container.) Spacer reserves layout height.
      */}
      <header
        ref={headerRef}
        className="fixed right-0 z-30 border-b border-border bg-card shadow-sm [backface-visibility:hidden]"
        style={{
          top: APP_HEADER_OFFSET_PX,
          left: contentLeft,
        }}
      >
        <div className="border-b border-border/80 bg-gradient-to-b from-muted/25 to-card px-4 py-3 md:px-6 md:py-3.5 lg:px-8">
          <div className="border-l-[3px] border-primary pl-4 md:pl-5">
            <h1
              id="coa-module-title"
              aria-describedby="coa-module-hint"
              className="font-sans text-[12px] font-semibold uppercase leading-tight tracking-[0.16em] text-black dark:text-foreground"
            >
              CHART OF ACCOUNTS
            </h1>
            <p
              id="coa-module-hint"
              className="mt-2 flex max-w-3xl gap-2.5 text-[11px] leading-relaxed text-muted-foreground md:text-xs"
            >
              <Info
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70"
                aria-hidden
              />
              <span>
                <span className="font-medium text-foreground/85">Guide:</span> Ledger tabs handle accounts, opening
                balances, statements, and import/export. Reference tabs document code ranges, donor mapping, and
                hierarchy. Pick a tab below to work—changes apply to your organization&apos;s general ledger.
              </span>
            </p>
            <GlBaseCurrencyStrip />
          </div>
        </div>
        <div className="border-t border-border/80 bg-white py-0 pl-0 pr-4 md:pr-6 lg:pr-8 dark:bg-card">
          <nav
            className="inline-flex max-w-full flex-wrap gap-0 rounded-none"
            aria-label="Chart of accounts sections"
          >
            {visibleSubNavItems.map((item, index) => {
              const active = isActive(item.href)
              const Icon = item.icon
              return (
                <CoaSubNavTabLink
                  key={item.href}
                  href={item.href}
                  active={active}
                  className={index > 0 ? 'border-l border-primary' : undefined}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-current opacity-90" aria-hidden />
                    <span className="truncate text-left leading-tight">{item.label}</span>
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-current opacity-70" aria-hidden />
                </CoaSubNavTabLink>
              )
            })}
          </nav>
        </div>
      </header>

      <div aria-hidden className="shrink-0" style={{ height: headerHeight }} />

      <div
        className={cn(
          'min-h-0 flex-1 overflow-x-hidden',
          coaFillHeightInnerScroll
            ? 'flex flex-col overflow-hidden'
            : 'overflow-y-auto [scrollbar-gutter:stable]'
        )}
      >
        <div
          className={cn(
            'mx-auto w-full max-w-[min(100%,1920px)] px-4 py-3 md:px-6 md:py-4 lg:px-8',
            coaFillHeightInnerScroll && 'flex min-h-0 flex-1 flex-col'
          )}
        >
          {canViewCoaModule ? (
            children
          ) : (
            <Card className="coa-ledger-card border-dashed">
              <CardContent className="py-14 text-center">
                <Lock className="mx-auto h-10 w-10 text-muted-foreground/60" aria-hidden />
                <p className="mt-4 font-medium text-foreground">Chart of accounts access required</p>
                <p className="mt-2 max-w-md mx-auto text-sm text-muted-foreground">
                  You need at least View Chart of Accounts, or Edit / Delete permissions, to use this module. Ask a Super
                  Administrator or Finance Director to assign the right role or permissions.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
