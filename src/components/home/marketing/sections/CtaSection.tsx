'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Send } from 'lucide-react'
import { type MarketingMessages } from '../i18n'

const CTA_VISUAL_SRC =
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=82'

type Props = {
  t: MarketingMessages
  onScrollTo: (id: string) => void
}

export function CtaSection({ t, onScrollTo }: Props) {
  return (
    <section id="cta" className="pb-16">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid min-h-[min(22rem,70vw)] overflow-hidden rounded-3xl bg-[#063931] text-white shadow-[0_24px_60px_-20px_rgba(6,57,49,0.45)] md:min-h-[20rem] md:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
          <div className="relative z-10 flex flex-col justify-center p-8 md:p-10 lg:p-12">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/75">{t.cta.tag}</p>
            <h2 className="mt-4 max-w-xl text-3xl font-extrabold leading-[1.12] tracking-tight text-white md:text-[1.75rem] lg:text-4xl">
              {t.cta.h2}
            </h2>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/85 md:text-base">{t.cta.text}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-[#0f1419] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-black"
              >
                <Send className="h-4 w-4 shrink-0 opacity-95" aria-hidden />
                {t.cta.primary}
              </Link>
              <button
                type="button"
                onClick={() => onScrollTo('overview')}
                className="inline-flex items-center rounded-lg border border-white/55 bg-transparent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {t.cta.secondary}
              </button>
            </div>
          </div>

          <div className="relative min-h-[14rem] md:min-h-full">
            <Image
              src={CTA_VISUAL_SRC}
              alt=""
              fill
              className="object-cover object-center"
              sizes="(min-width: 768px) 42vw, 100vw"
              priority={false}
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#063931] via-[#063931]/75 to-transparent md:from-[#063931] md:via-[#063931]/45 md:to-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#063931]/50 to-transparent md:hidden"
              aria-hidden
            />
          </div>
        </div>
      </div>
    </section>
  )
}
