'use client'

import React, { useLayoutEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSidebar } from '@/contexts/SidebarContext'
import { GlBaseCurrencyStrip } from '@/components/finance'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

const APP_HEADER_OFFSET_PX = 56

/** Single journal book view: /general-ledger/journal-entries/<numeric id> — hide module chrome so the book fills the pane. */
function isJournalBookDetailPath(pathname: string | null): boolean {
  if (!pathname) return false
  return /^\/general-ledger\/journal-entries\/\d+$/.test(pathname)
}

export default function JournalEntriesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isBookDetail = isJournalBookDetailPath(pathname)
  const { contentLeft } = useSidebar()
  const headerRef = useRef<HTMLElement>(null)
  const [headerHeight, setHeaderHeight] = useState(120)

  useLayoutEffect(() => {
    if (isBookDetail) {
      setHeaderHeight(0)
      return
    }
    const el = headerRef.current
    if (!el) return
    const measure = () => setHeaderHeight(el.offsetHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [isBookDetail, pathname])

  return (
    <div
      data-gl-journal-module
      className={cn('-mx-6 flex min-h-0 flex-1 flex-col overflow-hidden bg-background', isBookDetail && 'min-h-[calc(100vh-3.5rem)]')}
    >
      {!isBookDetail && (
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
                id="journal-entries-module-title"
                className="font-sans text-[12px] font-semibold uppercase leading-tight tracking-[0.16em] text-black dark:text-foreground"
              >
                JOURNAL ENTRIES
              </h1>
              <p className="mt-2 flex max-w-3xl gap-2.5 text-[11px] leading-relaxed text-muted-foreground md:text-xs">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden />
                <span>
                  <span className="font-medium text-foreground/85">About:</span> Journal entries are the core of your
                  general ledger: double-entry lines tied to accounts, projects, and funds. Use journal books to organize
                  work by project or organization—create drafts, balance debits and credits, post when approved, and reverse
                  posted entries when needed. Open <span className="font-medium text-foreground/90">Posted ledger</span> from
                  the sidebar under <span className="font-medium text-foreground/90">General Ledger → Journal Entries</span>{' '}
                  to review posted GL lines by project and account class.
                </span>
              </p>
              <GlBaseCurrencyStrip />
            </div>
          </div>
        </header>
      )}

      <div aria-hidden className="shrink-0" style={{ height: isBookDetail ? 0 : headerHeight }} />

      <div
        className={cn(
          'min-h-0 flex-1 overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable]',
          isBookDetail && 'flex min-h-0 flex-1 flex-col'
        )}
      >
        <div
          className={cn(
            'mx-auto w-full max-w-[min(100%,1920px)] px-4 py-3 md:px-6 md:py-4 lg:px-8',
            isBookDetail &&
              'flex min-h-0 min-w-0 flex-1 flex-col px-3 py-2 md:px-5 md:py-3 lg:px-8 max-w-none h-full'
          )}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
