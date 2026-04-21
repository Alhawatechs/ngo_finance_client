'use client'

import Link from 'next/link'
import { Building2, ChevronRight, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useOrganizationStore } from '@/stores/organizationStore'
import { cn } from '@/lib/utils'
import { footer, headerActions, headerNavLinkClass, homeNav } from '@/content/homeCopy'
import { publicPage } from '@/lib/public-page'

export function HomeHeader() {
  const branding = useOrganizationStore((s) => s.branding)

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 shadow-[0_1px_0_rgba(15,23,42,0.04),0_8px_32px_-12px_rgba(15,23,42,0.08)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/80">
      <div className={cn('flex h-[64px] w-full items-center justify-between gap-2 sm:gap-3', publicPage.inner)}>
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-3 outline-none ring-offset-2 transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[#0f766e]/45"
        >
          {branding?.logo_url ? (
            <span className="flex h-10 max-w-[200px] items-center sm:max-w-[220px]">
              {/* eslint-disable-next-line @next/next/no-img-element -- same-origin /storage URLs as login */}
              <img
                src={branding.logo_url}
                alt={branding.name || footer.productName}
                className="max-h-10 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]"
              />
            </span>
          ) : (
            <>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0f766e] text-white shadow-sm transition-transform duration-200 group-hover:scale-[1.02]">
                <Building2 className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <span className="truncate font-sans text-base font-bold tracking-tight text-slate-900">
                {branding?.name || footer.productName}
              </span>
            </>
          )}
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-2.5 md:gap-3">
          <nav className="hidden min-w-0 items-center gap-1 md:flex" aria-label="On this page">
            {homeNav.map((item) => (
              <a key={item.href} href={item.href} className={headerNavLinkClass}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden h-6 w-px shrink-0 bg-slate-200 md:block" aria-hidden />

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden h-9 whitespace-nowrap rounded-md border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-none transition-colors hover:border-[#0f766e]/30 hover:bg-slate-50 hover:text-[#0f766e] sm:inline-flex"
            >
              <Link href="/login">{headerActions.logIn}</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="hidden h-9 whitespace-nowrap rounded-md bg-[#0f766e] px-4 text-xs font-semibold text-white shadow-[0_1px_2px_rgba(15,23,42,0.06),0_2px_6px_-1px_rgba(15,118,110,0.22)] transition-colors hover:bg-[#115e59] sm:inline-flex"
            >
              <a href="#overview">{headerActions.getStarted}</a>
            </Button>

            <Button
              asChild
              size="sm"
              className="h-9 whitespace-nowrap rounded-md bg-[#0f766e] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#115e59] sm:hidden"
            >
              <Link href="/login">{footer.signIn}</Link>
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="group h-9 w-9 shrink-0 rounded-md border border-slate-200 bg-white shadow-none transition-colors hover:border-[#0f766e]/30 hover:bg-slate-50 md:hidden"
                  aria-label="Open page menu"
                >
                  <Menu
                    className="h-[18px] w-[18px] text-slate-700 transition-colors group-hover:text-[#0f766e]"
                    strokeWidth={2}
                    aria-hidden
                  />
                </Button>
              </DialogTrigger>
              <DialogContent
                id="home-mobile-menu"
                className="max-w-[min(100vw-2rem,22rem)] gap-0 overflow-hidden rounded-xl border-slate-200 p-0 shadow-2xl shadow-slate-900/10"
                overlayClassName="z-[60] bg-slate-950/40 backdrop-blur-[2px]"
              >
                <DialogHeader className="border-b border-slate-200 bg-white px-5 py-4 text-left">
                  <DialogTitle className="font-sans text-sm font-bold uppercase tracking-[0.2em] text-[#0f766e]">
                    {footer.onThisPage}
                  </DialogTitle>
                  <p className="mt-1 text-xs text-slate-500">Jump to a section</p>
                </DialogHeader>
                <nav className="flex flex-col gap-0.5 px-3 py-3" aria-label="On this page">
                  {homeNav.map((item) => (
                    <DialogClose key={item.href} asChild>
                      <a
                        href={item.href}
                        className={cn(
                          'group flex items-center justify-between gap-3 rounded-md px-3 py-3 text-sm font-medium text-slate-800',
                          'border border-transparent transition-colors',
                          'hover:bg-slate-50 hover:text-[#0f766e]',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/35 focus-visible:ring-offset-2',
                        )}
                      >
                        <span>{item.label}</span>
                        <ChevronRight
                          className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#0f766e]"
                          aria-hidden
                        />
                      </a>
                    </DialogClose>
                  ))}
                </nav>
                <div className="border-t border-slate-200 bg-white px-3 py-3">
                  <div className="flex flex-col gap-2">
                    <DialogClose asChild>
                      <Link
                        href="/login"
                        className="flex min-h-[44px] items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors hover:border-[#0f766e]/30 hover:bg-slate-50 hover:text-[#0f766e]"
                      >
                        {headerActions.logIn}
                      </Link>
                    </DialogClose>
                    <DialogClose asChild>
                      <a
                        href="#overview"
                        className="flex min-h-[44px] items-center justify-center rounded-md bg-[#0f766e] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#115e59]"
                      >
                        {headerActions.getStarted}
                      </a>
                    </DialogClose>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </header>
  )
}
