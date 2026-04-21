'use client'

import { BadgeCheck, Landmark, LayoutDashboard } from 'lucide-react'
import { whyTrust, trustStrip } from '@/content/homeCopy'
import { publicPage } from '@/lib/public-page'
import { cn } from '@/lib/utils'

const icons = {
  oversight: LayoutDashboard,
  donor: BadgeCheck,
  integration: Landmark,
} as const

export function HomeTrust() {
  return (
    <section
      id="trust"
      className={cn(
        publicPage.scrollSection,
        publicPage.sectionBorder,
        publicPage.surface,
        publicPage.sectionPad,
      )}
      aria-labelledby="trust-heading"
    >
      <div className={cn(publicPage.inner)}>
        <div className="max-w-3xl">
          <p className={publicPage.kicker}>{whyTrust.kicker}</p>
          <h2
            id="trust-heading"
            className={cn(publicPage.h2Display, 'mt-4')}
          >
            {whyTrust.title}
          </h2>
          <p className={cn(publicPage.bodyMuted, 'mt-5 max-w-2xl')}>{whyTrust.intro}</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {whyTrust.items.map((item) => {
            const Icon = icons[item.icon]
            return (
              <article
                key={item.key}
                className="group flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#0f766e]/30 hover:shadow-[0_16px_36px_-12px_rgba(15,23,42,0.14)]"
              >
                <div className={publicPage.iconBox}>
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-5 text-base font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </article>
            )
          })}
        </div>
        <div className="mt-16 border-y border-slate-200 py-10">
          <p className="text-center text-sm font-medium text-slate-700 sm:text-base">{trustStrip.headline}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {trustStrip.partners.map((label) => (
              <span
                key={label}
                className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
