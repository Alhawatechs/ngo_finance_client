'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Globe, Menu, X } from 'lucide-react'
import { type MarketingLocale, type MarketingMessages } from '../i18n'

type Props = {
  t: MarketingMessages
  locale: MarketingLocale
  open: boolean
  setOpen: (value: boolean) => void
  langOpen: boolean
  setLangOpen: (value: boolean) => void
  onScrollTo: (id: string) => void
  onPickLocale: (locale: MarketingLocale) => void
  onDownloadPlatformTour: () => void
  logoName?: string | null
}

export function HeaderSection({
  t,
  locale,
  open,
  setOpen,
  langOpen,
  setLangOpen,
  onScrollTo,
  onPickLocale,
  onDownloadPlatformTour,
  logoName,
}: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between gap-3 px-5">
        <button
          type="button"
          onClick={() => onScrollTo('cta')}
          className="inline-flex items-center rounded-md px-3 py-2 text-sm font-semibold text-white transition "
          aria-label={t.header.bookCall}
        >
          <Image src="/assets/logo-ngobook-transparent.png" alt={logoName || 'AADA ERP Finance'} width={150} height={50} className="h-10 w-auto object-contain" />
        </button>

        <nav className="hidden items-center gap-1 lg:flex">
          {t.nav.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => onScrollTo(link.id)}
              className="rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-[#0f766e]"
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => setLangOpen(!langOpen)}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-semibold text-slate-700  outline-none focus:outline-none"
            >
              <Globe className="h-5 w-5" />
               
            </button>
            {langOpen && (
              <div className="absolute right-0 z-20 mt-2 w-36 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                <button type="button" onClick={() => onPickLocale('en')} className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-slate-50">English</button>
                <button type="button" onClick={() => onPickLocale('fa-AF')} className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-slate-50">دری</button>
                <button type="button" onClick={() => onPickLocale('ps')} className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-slate-50">پښتو</button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onDownloadPlatformTour}
            className="hidden rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#0f766e]/40 hover:text-[#0f766e] sm:inline-flex"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 18h16"/>
            </svg>
            {t.header.platformTour}
          </button>
     
          <Link
            href="/login"
            className="hidden rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold bg-[#0f766e]  text-white transition hover:border-[#0f766e]/40   sm:inline-flex"
          >
            {t.header.login}
          </Link>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 lg:hidden"
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white px-5 py-4 lg:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-2">
            <div className="mb-2 flex gap-2">
              <button type="button" onClick={() => onPickLocale('en')} className="rounded border px-2 py-1 text-xs">EN</button>
              <button type="button" onClick={() => onPickLocale('fa-AF')} className="rounded border px-2 py-1 text-xs">FA</button>
              <button type="button" onClick={() => onPickLocale('ps')} className="rounded border px-2 py-1 text-xs">PS</button>
            </div>
            <button type="button" onClick={onDownloadPlatformTour} className="rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50">
              {t.header.platformTour}
            </button>
            {t.nav.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => onScrollTo(link.id)}
                className="rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
