'use client'

import React, { useLayoutEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSidebar } from '@/contexts/SidebarContext'
import { CoaSubNavTabLink } from '@/components/finance/CoaSubNavTabLink'
import { ClipboardCheck, LayoutGrid, FileText, Wallet, ChevronRight, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApprovalCenterCounts } from '@/hooks/useApprovalCenterCounts'

const APP_HEADER_OFFSET_PX = 56

const tabs = [
  { href: '/approvals', label: 'All', countKey: 'all' as const, icon: LayoutGrid },
  { href: '/approvals/vouchers', label: 'Vouchers', countKey: 'voucher' as const, icon: FileText },
  { href: '/approvals/budgets', label: 'Budgets', countKey: 'budget' as const, icon: Wallet },
]

export default function ApprovalCenterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { contentLeft } = useSidebar()
  const headerRef = useRef<HTMLElement>(null)
  const [headerHeight, setHeaderHeight] = useState(120)
  const { data: counts, isPending: countsLoading } = useApprovalCenterCounts()

  const countForTab = (key: (typeof tabs)[number]['countKey']) => {
    if (countsLoading) return null
    return counts?.[key] ?? 0
  }

  const isActive = (href: string) =>
    href === '/approvals' ? pathname === '/approvals' : pathname === href || pathname.startsWith(href + '/')

  useLayoutEffect(() => {
    const el = headerRef.current
    if (!el) return
    const measure = () => setHeaderHeight(el.offsetHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [pathname, countsLoading, counts?.all, counts?.voucher, counts?.budget])

  return (
    <div
      data-approval-center-module
      className="-mx-6 flex min-h-0 flex-1 flex-col overflow-hidden bg-background"
    >
      <header
        ref={headerRef}
        className="fixed right-0 z-30 border-b border-border bg-card shadow-sm [backface-visibility:hidden]"
        style={{
          top: APP_HEADER_OFFSET_PX,
          left: contentLeft,
        }}
      >
        <div className="border-b border-border/80 bg-gradient-to-b from-muted/25 to-card px-4 py-3 md:px-6 md:py-3.5 lg:px-8">
          <div className="border-l-[3px] border-primary pl-4 md:pl-5 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                <h1
                  id="approval-center-module-title"
                  aria-describedby="approval-center-module-hint"
                  className="font-sans text-[12px] font-semibold uppercase leading-tight tracking-[0.16em] text-black dark:text-foreground"
                >
                  Approval Center
                </h1>
              </div>
              {!countsLoading && counts != null && (
                <p
                  className={cn(
                    'mt-1.5 text-xs font-medium tabular-nums',
                    counts.all > 0
                      ? 'text-amber-800 dark:text-amber-400/95'
                      : 'text-muted-foreground'
                  )}
                  aria-live="polite"
                >
                  {counts.all > 0 ? (
                    <>
                      <span className="font-semibold">{counts.all}</span>{' '}
                      {counts.all === 1 ? 'item' : 'items'} pending
                      <span className="text-muted-foreground font-normal">
                        {' '}
                        ({counts.voucher} voucher{counts.voucher === 1 ? '' : 's'}, {counts.budget} budget
                        {counts.budget === 1 ? '' : 's'})
                      </span>
                    </>
                  ) : (
                    <>No pending approvals — you&apos;re caught up.</>
                  )}
                </p>
              )}
              <p
                id="approval-center-module-hint"
                className="mt-2 flex max-w-3xl gap-2.5 text-[11px] leading-relaxed text-muted-foreground md:text-xs"
              >
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden />
                <span>
                  <span className="font-medium text-foreground/85">Guide:</span> Vouchers follow a layered finance
                  ladder — L1 Finance Controller through L4 General Director — with how many layers apply determined by
                  amount (see the ladder card below). Use the tabs to filter all items, vouchers only, or budgets.
                  Budget quick-approve is available when your role allows; vouchers are approved on the voucher screen.
                  Configure limits and approver access under{' '}
                  <span className="font-medium text-foreground/90">System Administration → Approval Workflow</span>.
                </span>
              </p>
            </div>
        </div>
        <div className="border-t border-border/80 bg-white py-0 pl-0 pr-4 md:pr-6 lg:pr-8 dark:bg-card">
          <nav className="inline-flex max-w-full flex-wrap gap-0 rounded-none" aria-label="Approval center sections">
            {tabs.map((item, index) => {
              const active = isActive(item.href)
              const Icon = item.icon
              const n = countForTab(item.countKey)
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
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums',
                        n === null && 'bg-muted text-muted-foreground',
                        n !== null && n > 0 && active && 'bg-white/25 text-white',
                        n !== null && n > 0 && !active && 'bg-primary/15 text-primary',
                        n !== null && n === 0 && active && 'bg-white/15 text-white/80',
                        n !== null && n === 0 && !active && 'bg-muted text-muted-foreground'
                      )}
                      title="Pending count"
                      aria-label={`${n ?? '…'} pending`}
                    >
                      {n === null ? '…' : n}
                    </span>
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-current opacity-70" aria-hidden />
                </CoaSubNavTabLink>
              )
            })}
          </nav>
        </div>
      </header>

      <div aria-hidden className="shrink-0" style={{ height: headerHeight }} />

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable]">
        <div className="mx-auto w-full max-w-[min(100%,1920px)] px-4 py-3 md:px-6 md:py-4 lg:px-8">{children}</div>
      </div>
    </div>
  )
}
