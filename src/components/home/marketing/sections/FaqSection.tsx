'use client'

import { ChevronDown } from 'lucide-react'
import { type MarketingMessages } from '../i18n'

type Props = {
  t: MarketingMessages
  openFaq: number | null
  setOpenFaq: (value: number | null) => void
}

export function FaqSection({ t, openFaq, setOpenFaq }: Props) {
  return (
    <section id="faq" className="py-16">
      <div className="mx-auto max-w-6xl px-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0f766e]">{t.faq.eyebrow}</p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{t.faq.h2}</h2>
        <p className="mt-4 max-w-2xl text-slate-600">{t.faq.intro}</p>
        <div className="mt-8 space-y-3">
          {t.faq.items.map((item, i) => {
            const isOpen = openFaq === i
            return (
              <article key={item.q} className="rounded-xl border border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
                >
                  <span className="font-semibold">{item.q}</span>
                  <ChevronDown className={`h-4 w-4 text-slate-500 transition ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && <p className="px-4 pb-4 text-sm leading-relaxed text-slate-600">{item.a}</p>}
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
