'use client'

import { Calendar, CheckCircle2 } from 'lucide-react'
import { type MarketingMessages } from '../i18n'

type Props = {
  t: MarketingMessages
  onScrollTo: (id: string) => void
}

export function PricingSection({ t, onScrollTo }: Props) {
  return (
    <section id="pricing" className="py-16">
      <div className="mx-auto max-w-6xl px-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0f766e]">{t.pricing.eyebrow}</p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{t.pricing.h2}</h2>
        <p className="mt-4 max-w-3xl text-slate-600">{t.pricing.lead}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-[1.2fr_1fr]">
          <article className="rounded-2xl border border-[#0f766e]/30 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold">Platform + onboarding</h3>
            <p className="mt-2 text-sm text-slate-600">{t.pricing.lead}</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {t.pricing.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#0f766e]" /> {bullet}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => onScrollTo('cta')}
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#115e59]"
            >
              <Calendar className="h-4 w-4" /> {t.pricing.cta}
            </button>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold">Readiness & compliance</h3>
            <p className="mt-2 text-sm text-slate-600">
              We assess current workflows, data quality, and compliance requirements to shape a realistic plan.
            </p>
          </article>
        </div>
      </div>
    </section>
  )
}
