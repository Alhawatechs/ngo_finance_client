'use client'

import { PiggyBank, Landmark, BarChart3 } from 'lucide-react'
import { heroStats } from '@/content/homeCopy'

const iconMap = {
  piggy: PiggyBank,
  bank: Landmark,
  chart: BarChart3,
} as const

export function HomeHeroStatsBar() {
  return (
    <aside
      className="mx-auto flex w-full max-w-sm flex-row overflow-hidden rounded-none border border-black/10 shadow-[0_6px_20px_-8px_rgba(0,77,64,0.28)] lg:mx-0 lg:max-w-[220px] lg:shrink-0 lg:self-start"
      aria-label="NGO finance ERP highlights"
    >
      <div
        className="w-1.5 shrink-0 self-stretch bg-gradient-to-b from-[#ffb347] via-[#f5a623] to-[#e69a2e] sm:w-2"
        aria-hidden
      />
      <div className="min-w-0 flex-1 bg-[#004d40]">
        <ul className="divide-y divide-white/15">
          {heroStats.map((item) => {
            const Icon = iconMap[item.icon]
            return (
              <li key={item.key} className="flex items-start gap-2 px-2 py-2.5 sm:gap-2.5 sm:px-2.5 sm:py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/25 bg-[#003a32] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:h-8 sm:w-8">
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2} aria-hidden />
                </span>
                <div className="min-w-0 flex-1 pt-px">
                  <p className="text-sm font-bold leading-tight tracking-tight text-white sm:text-[15px]">
                    {item.value}
                  </p>
                  <p className="mt-0.5 text-[9px] font-semibold uppercase leading-snug tracking-wide text-white/95 sm:text-[10px]">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-[8px] leading-snug text-white/72 sm:text-[9px]">{item.subtitle}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
      <div
        className="flex w-1.5 shrink-0 flex-col items-center justify-center gap-1 bg-[#0a0a0a] py-3 sm:w-2"
        aria-hidden
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className="h-1 w-1 shrink-0 bg-stone-500/90 [border-radius:1px] sm:h-1.5 sm:w-1.5" />
        ))}
      </div>
    </aside>
  )
}
