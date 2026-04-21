'use client'

import React, { useLayoutEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSidebar } from '@/contexts/SidebarContext'
import { GlBaseCurrencyStrip } from '@/components/finance'
import { Info } from 'lucide-react'

/** App shell header height (matches Header.tsx h-14) */
const APP_HEADER_OFFSET_PX = 56

export default function FiscalModuleLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { contentLeft } = useSidebar()
  const headerRef = useRef<HTMLElement>(null)
  const [headerHeight, setHeaderHeight] = useState(120)

  const onFiscalYearsPage = pathname.startsWith('/general-ledger/fiscal-years')

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
              id="fiscal-module-title"
              aria-describedby="fiscal-module-hint"
              className="font-sans text-[12px] font-semibold uppercase leading-tight tracking-[0.16em] text-black dark:text-foreground"
            >
              {onFiscalYearsPage ? 'FISCAL YEARS' : 'PERIOD CLOSE'}
            </h1>
            <p
              id="fiscal-module-hint"
              className="mt-2 flex max-w-3xl gap-2.5 text-[11px] leading-relaxed text-muted-foreground md:text-xs"
            >
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden />
              {onFiscalYearsPage ? (
                <span>
                  <span className="font-medium text-foreground/85">Guide:</span> Define fiscal years and accounting
                  periods for your organization. Current year and open periods control which dates accept posting before
                  you apply <span className="font-medium text-foreground/90">project-level</span> close under{' '}
                  <span className="font-medium text-foreground/90">General Ledger → Period close</span>.
                </span>
              ) : (
                <span>
                  <span className="font-medium text-foreground/85">Guide:</span> Close or lock posting{' '}
                  <span className="font-medium text-foreground/90">per project</span> for each calendar period after
                  donor and internal review. The organization fiscal period must still be open. Manage years and
                  periods under <span className="font-medium text-foreground/90">General Ledger → Fiscal years</span>.
                </span>
              )}
            </p>
            <GlBaseCurrencyStrip />
          </div>
        </div>
      </header>

      <div aria-hidden className="shrink-0" style={{ height: headerHeight }} />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden overflow-x-hidden">
        <div className="mx-auto flex min-h-0 w-full max-w-[min(100%,1920px)] flex-1 flex-col px-4 py-3 md:px-6 md:py-4 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  )
}
