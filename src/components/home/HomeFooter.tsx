'use client'

import Link from 'next/link'
import { ArrowUp, Building2 } from 'lucide-react'
import { footer, homeNav } from '@/content/homeCopy'
import { publicPage } from '@/lib/public-page'
import { cn } from '@/lib/utils'

export function HomeFooter() {
  const year = new Date().getFullYear()

  const scrollTop = () => {
    document.getElementById('public-home-scroll')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className="border-t border-slate-200 bg-slate-50/80 py-14 text-slate-700">
      <div className={publicPage.inner}>
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_auto] lg:items-start lg:gap-14">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0f766e] text-white shadow-sm">
                <Building2 className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <p className="font-sans text-lg font-bold tracking-tight text-slate-900">{footer.productName}</p>
            </div>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-600">{footer.tagline}</p>
            <p className="mt-6 text-xs text-slate-500">
              © {year} {footer.productName}. {footer.copyright}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{footer.onThisPage}</p>
            <ul className="mt-4 flex flex-col gap-2.5 sm:gap-2">
              {homeNav.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className={cn(
                      'rounded-sm text-sm font-medium text-slate-700 underline-offset-4 transition-colors',
                      'hover:text-[#0f766e] hover:underline',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/40 focus-visible:ring-offset-2',
                    )}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col items-start gap-4 lg:items-end">
            <Link
              href="/login"
              className={cn(
                'inline-flex min-h-[44px] min-w-[9rem] items-center justify-center rounded-md bg-[#0f766e] px-6 text-sm font-semibold text-white',
                'shadow-[0_1px_2px_rgba(15,23,42,0.06),0_2px_6px_-1px_rgba(15,118,110,0.2)] transition-colors hover:bg-[#115e59]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/40 focus-visible:ring-offset-2',
              )}
            >
              {footer.signIn}
            </Link>
            <button
              type="button"
              onClick={scrollTop}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-slate-500 transition-colors',
                'hover:text-[#0f766e]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/40 focus-visible:ring-offset-2',
              )}
            >
              <ArrowUp className="h-4 w-4 shrink-0" aria-hidden />
              {footer.backToTop}
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
