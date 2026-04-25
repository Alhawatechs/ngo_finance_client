'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Globe, Landmark, ShieldCheck } from 'lucide-react'
import { type MarketingMessages } from '../i18n'

type Props = {
  t: MarketingMessages
  dir: 'ltr' | 'rtl'
  onScrollTo: (id: string) => void
}

export function HeroSection({ t, dir, onScrollTo }: Props) {
  return (
    <section className="relative mx-auto grid max-w-6xl gap-10 overflow-hidden px-5 pb-14 pt-12 lg:grid-cols-2 lg:items-center lg:pt-16">
      <Image
        src={dir === 'rtl' ? '/assets/hero-wash-rtl.svg' : '/assets/hero-wash.svg'}
        alt=""
        width={1200}
        height={400}
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-auto w-full opacity-35"
      />
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0f766e]">{t.hero.label}</p>
        <p className="mt-3 text-5xl font-extrabold leading-none tracking-tight">
          {t.hero.brand.slice(0, -4)}
          <span className="text-[#0f766e]">{t.hero.brand.slice(-4)}</span>
        </p>
        <h1 className="mt-4 max-w-xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">{t.hero.title}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">{t.hero.lead}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">
            <ShieldCheck className="h-3.5 w-3.5 text-[#0f766e]" /> {t.hero.chip1}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">
            <Landmark className="h-3.5 w-3.5 text-[#0f766e]" /> {t.hero.chip2}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">
            <Globe className="h-3.5 w-3.5 text-[#0f766e]" /> {t.hero.chip3}
          </span>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onScrollTo('modules')}
            className="inline-flex items-center gap-2 rounded-full bg-[#0f766e] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#115e59]"
          >
            {t.hero.explore} <ArrowRight className="h-4 w-4" />
          </button>
          <Link
            href="/book-a-call"
            className="inline-flex items-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#0f766e]/40 hover:text-[#0f766e]"
          >
            {t.hero.talk}
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-500">{t.hero.note}</p>
      </div>
      <div className="overflow-hidden rounded-[28px] border border-[#c9ece8] bg-[#f7f8f9] shadow-[0_20px_55px_-25px_rgba(15,23,42,0.35)]">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-[#ece9e4] px-5 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          <span className="ml-auto rounded-full border border-slate-200 bg-white px-4 py-1 text-xs font-semibold text-slate-500">
            https://app.aadafinance.com
          </span>
        </div>
        <div className="p-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <Image
              src="/assets/dashboard-hero.png"
              alt="Dashboard preview"
              width={1100}
              height={620}
              className="aspect-[16/10] w-full object-contain"
            />
          </div>
        </div>
        <div className="border-t border-slate-200 px-5 py-4 text-[33px] sm:text-[13px] leading-tight text-slate-500">
          
          Finance dashboard: budgets, utilization, liquidity, and approvals in one view - aligned with your general
          ledger and close process.
        </div>
      </div>
    </section>
  )
}
