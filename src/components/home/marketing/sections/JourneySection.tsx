'use client'

import { type MarketingMessages } from '../i18n'

export function JourneySection({ t }: { t: MarketingMessages }) {
  return (
    <section id="journey" className="py-16">
      <div className="mx-auto max-w-6xl px-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0f766e]">{t.journey.eyebrow}</p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{t.journey.h2}</h2>
        <p className="mt-4 max-w-3xl text-slate-600">{t.journey.lead}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {t.journey.steps.map((step) => (
            <article key={step.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-extrabold tracking-[0.14em] text-[#0f766e]">{step.n}</p>
              <h3 className="mt-2 text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{step.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
