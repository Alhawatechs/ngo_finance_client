'use client'

import { type MarketingMessages } from '../i18n'

export function OverviewSection({ t }: { t: MarketingMessages }) {
  return (
    <section id="overview" className="border-y border-slate-200 bg-slate-50/60 py-16">
      <div className="mx-auto max-w-6xl px-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0f766e]">{t.overview.eyebrow}</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">{t.overview.h2}</h2>
        <p className="mt-4 max-w-3xl text-slate-600">{t.overview.lead}</p>
      </div>
    </section>
  )
}
