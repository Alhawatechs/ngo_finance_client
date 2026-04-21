'use client'

import React, { useLayoutEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSidebar } from '@/contexts/SidebarContext'
import { CoaSubNavTabLink } from '@/components/finance/CoaSubNavTabLink'
import { ShieldCheck, SlidersHorizontal, Inbox, Users, ChevronRight, Info } from 'lucide-react'

const APP_HEADER_OFFSET_PX = 56

const tabs = [
  { href: '/admin/approval-workflow', label: 'Policy & limits', icon: SlidersHorizontal },
  { href: '/admin/approval-workflow/queue', label: 'Queue & review', icon: Inbox },
  { href: '/admin/approval-workflow/approvers', label: 'Approvers & access', icon: Users },
] as const

export default function AdminApprovalWorkflowLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { contentLeft } = useSidebar()
  const headerRef = useRef<HTMLElement>(null)
  const [headerHeight, setHeaderHeight] = useState(120)

  const isActive = (href: string) =>
    href === '/admin/approval-workflow'
      ? pathname === '/admin/approval-workflow'
      : pathname === href || pathname.startsWith(href + '/')

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
      data-admin-approval-workflow-module
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
          <div className="border-l-[3px] border-primary pl-4 md:pl-5 min-w-0">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              <h1
                id="admin-approval-workflow-title"
                className="font-sans text-[12px] font-semibold uppercase leading-tight tracking-[0.16em] text-black dark:text-foreground"
              >
                Approval Workflow
              </h1>
            </div>
            <p className="mt-2 flex max-w-3xl gap-2.5 text-[11px] leading-relaxed text-muted-foreground md:text-xs">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden />
              <span>
                <span className="font-medium text-foreground/85">Guide:</span> Set voucher and journal approval levels
                and amount limits under <span className="font-medium text-foreground/90">Policy &amp; limits</span>.
                Monitor the unified inbox under <span className="font-medium text-foreground/90">Queue &amp; review</span>.
                Align user approval levels and roles under <span className="font-medium text-foreground/90">Approvers
                &amp; access</span>. Staff use <span className="font-medium text-foreground/90">Approval Center</span>{' '}
                on the main menu to act on pending items.
              </span>
            </p>
          </div>
        </div>
        <div className="border-t border-border/80 bg-white py-0 pl-0 pr-4 md:pr-6 lg:pr-8 dark:bg-card">
          <nav className="inline-flex max-w-full flex-wrap gap-0 rounded-none" aria-label="Approval workflow sections">
            {tabs.map((item, index) => {
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

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable]">
        <div className="mx-auto w-full max-w-[min(100%,1920px)] px-4 py-3 md:px-6 md:py-4 lg:px-8">{children}</div>
      </div>
    </div>
  )
}
