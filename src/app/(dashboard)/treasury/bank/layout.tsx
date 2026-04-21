'use client'

import React, { useLayoutEffect, useRef, useState } from 'react'
import { useSidebar } from '@/contexts/SidebarContext'

const APP_HEADER_OFFSET_PX = 56

/**
 * Bank Management module shell (Treasury & Cash): sub-modules are separate sidebar entries
 * under Treasury & Cash → Bank Management.
 */
export default function BankManagementModuleLayout({ children }: { children: React.ReactNode }) {
  const { contentLeft } = useSidebar()
  const headerRef = useRef<HTMLElement>(null)
  const [headerHeight, setHeaderHeight] = useState(56)

  useLayoutEffect(() => {
    const el = headerRef.current
    if (!el) return
    const measure = () => setHeaderHeight(el.offsetHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      data-treasury-bank-module
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
              id="bank-module-title"
              className="font-sans text-[12px] font-semibold uppercase leading-tight tracking-[0.16em] text-black dark:text-foreground"
            >
              BANK MANAGEMENT
            </h1>
          </div>
        </div>
      </header>

      <div aria-hidden className="shrink-0" style={{ height: headerHeight }} />

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable]">
        <div className="mx-auto w-full max-w-[min(100%,1920px)] px-4 py-3 md:px-6 md:py-4 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  )
}
