'use client'

import Image from 'next/image'
import Link from 'next/link'
import { BookText } from 'lucide-react'
import { type MarketingMessages } from '../i18n'

type Props = {
  t: MarketingMessages
  year: number
  onScrollTo: (id: string) => void
}

export function FooterSection({ t, year, onScrollTo }: Props) {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-12">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="inline-flex rounded-lg   px-3 py-2">
            <Image
              src="/assets/logo-ngobook-transparent.png"
              alt="NGOBook finance"
              width={180}
              height={48}
              className="h-10 w-auto max-w-[200px] object-contain object-left"
            />
          </div>
          <p className="mt-3 text-sm text-slate-600">{t.footer.tagline}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{t.footer.contact}</p>
          <a href="mailto:sales@ngobook.com" className="mt-3 block text-sm font-semibold text-[#0f766e]">sales@ngobook.com</a>
          <a href="tel:+93704519947" className="mt-1 block text-sm font-semibold text-[#0f766e]">+93 (0) 704519947</a>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{t.footer.legal}</p>
          <Link href="/privacy-policy" className="mt-3 block text-sm font-semibold text-[#0f766e]">{t.footer.privacy}</Link>
          <Link href="/terms-conditions" className="mt-1 block text-sm font-semibold text-[#0f766e]">{t.footer.terms}</Link>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{t.footer.website}</p>
          <a href="https://www.ngobook.com" target="_blank" rel="noopener noreferrer" className="mt-3 block text-sm font-semibold text-[#0f766e]">ngobook.com</a>
          <button type="button" onClick={() => onScrollTo('main')} className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#0f766e]">
            <BookText className="h-4 w-4" /> Top
          </button>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-6xl px-5 text-xs text-slate-500">© {year} AADA ERP Finance. {t.footer.copy}</p>
    </footer>
  )
}
