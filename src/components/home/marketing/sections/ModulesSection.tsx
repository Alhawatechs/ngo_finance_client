'use client'

import { FinanceModuleCard } from '@/components/finance/ModuleCard'
import { cn } from '@/lib/utils'
import { type MarketingMessages } from '../i18n'

export function ModulesSection({ t }: { t: MarketingMessages }) {
  return (
    <section id="modules" className="border-y border-slate-200 bg-slate-50 py-16">
      <div className="mx-auto max-w-6xl px-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0f766e]">{t.modules.eyebrow}</p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{t.modules.h2}</h2>
        <p className="mt-4 max-w-3xl text-slate-600">{t.modules.lead}</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {t.modules.items.map((item, i) => (
            <FinanceModuleCard
              key={item.id}
              icon={
                <span className="tabular-nums text-xs font-bold text-[#0f766e]">{String(i + 1).padStart(2, '0')}</span>
              }
              title={item.title}
              subtitle={item.text}
              headerClassName="p-4 pb-2"
              className={cn(
                'border border-slate-200 shadow-none transition-shadow hover:shadow-sm',
                '[&_h3]:text-sm [&_h3]:font-semibold',
                '[&_h3+p]:mt-1 [&_h3+p]:text-xs [&_h3+p]:text-slate-500',
              )}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
