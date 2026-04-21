'use client'

import { BookOpen, Landmark, FolderKanban, BarChart3 } from 'lucide-react'
import { pillars, pillarsIntro } from '@/content/homeCopy'
import { publicPage } from '@/lib/public-page'
import { cn } from '@/lib/utils'

const iconMap = {
  ledger: BookOpen,
  treasury: Landmark,
  projects: FolderKanban,
  reports: BarChart3,
} as const

export function HomeFeatures() {
  return (
    <section
      id="features"
      className={cn(
        publicPage.scrollSection,
        publicPage.sectionBorder,
        publicPage.surfaceAlt,
        'py-20 sm:py-24 lg:py-28',
      )}
      aria-labelledby="features-heading"
    >
      <div className={cn(publicPage.inner, 'relative')}>
        <div className="max-w-3xl">
          <p className={publicPage.kicker}>Capabilities</p>
          <h2 id="features-heading" className={cn(publicPage.h2Display, 'mt-4')}>
            Product pillars
          </h2>
          <p className={cn(publicPage.bodyMuted, 'mt-5 max-w-2xl text-pretty')}>{pillarsIntro}</p>
        </div>
        <ul className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p, i) => {
            const Icon = iconMap[p.icon]
            return (
              <li
                key={p.title}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-[#0f766e]/30 hover:shadow-[0_16px_36px_-12px_rgba(15,23,42,0.14)] sm:p-7"
              >
                <div className="flex items-baseline justify-between">
                  <span className={publicPage.iconBox}>
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="font-sans text-sm font-bold tracking-[0.12em] text-slate-300 transition-colors group-hover:text-[#14b8a6]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mt-5 font-sans text-base font-semibold leading-snug text-slate-900">
                  {p.title}
                </h3>
                <p className={cn(publicPage.bodyMuted, 'mt-3 flex-1')}>{p.description}</p>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
