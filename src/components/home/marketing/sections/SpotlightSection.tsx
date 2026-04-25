'use client'

import { type MarketingMessages } from '../i18n'

export function SpotlightSection({ t }: { t: MarketingMessages }) {
  return (
    <section id="spotlight" className="bg-gradient-to-r from-[#0a3d39] via-[#0f766e] to-[#115e59] py-16 text-white">
      <div className="mx-auto max-w-6xl px-5 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-100">{t.spotlight.eyebrow}</p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{t.spotlight.h2}</h2>
        <p className="mx-auto mt-4 max-w-3xl text-teal-50/90">{t.spotlight.text}</p>
      </div>
    </section>
  )
}
