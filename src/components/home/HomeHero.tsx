'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ShieldCheck, BarChart3, Globe, Lock, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { hero } from '@/content/homeCopy'
import { homeImages } from '@/content/homeImages'
import { publicPage } from '@/lib/public-page'
import { cn } from '@/lib/utils'

const HERO_CHIPS = [
  { icon: ShieldCheck, text: 'Controls & approvals' },
  { icon: BarChart3, text: 'Donor-grade reporting' },
  { icon: Globe, text: 'Multi-office, multi-currency' },
] as const

export function HomeHero() {
  const { src, alt } = homeImages.hero

  return (
    <section className={cn('relative overflow-hidden', publicPage.surface)} aria-labelledby="hero-heading">
      {/* Soft ambient gradients — NGOBook "glow" effect */}
      <div
        className="pointer-events-none absolute inset-0 -z-0"
        aria-hidden
      >
        <div className="absolute -right-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-[#14b8a6]/10 blur-3xl" />
        <div className="absolute -left-40 top-40 h-[28rem] w-[28rem] rounded-full bg-[#0f766e]/8 blur-3xl" />
      </div>

      <div className={cn(publicPage.inner, 'relative z-10 pb-14 pt-10 sm:pt-14 lg:pb-20 lg:pt-20')}>
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14 xl:gap-20">
          {/* Left column: copy + CTAs */}
          <div className="flex min-w-0 flex-col">
            <p className={publicPage.kicker}>{hero.brand}</p>
            <h1
              id="hero-heading"
              className="mt-6 font-sans text-4xl font-bold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.25rem]"
            >
              <span className="sr-only">{hero.headlineAccessible}</span>
              <span aria-hidden className="block">
                {hero.headlineLine1}
              </span>
              <span aria-hidden className="mt-1 block bg-gradient-to-r from-[#0f766e] to-[#14b8a6] bg-clip-text text-transparent">
                {hero.headlineLine2}
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg sm:leading-[1.65]">
              {hero.subhead}
            </p>

            {/* Chips */}
            <div className="mt-7 flex flex-wrap gap-2">
              {HERO_CHIPS.map((chip) => {
                const Icon = chip.icon
                return (
                  <span
                    key={chip.text}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm"
                  >
                    <Icon className="h-3.5 w-3.5 text-[#0f766e]" aria-hidden />
                    {chip.text}
                  </span>
                )
              })}
            </div>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Button
                asChild
                size="lg"
                className="h-12 min-h-[48px] min-w-[12rem] rounded-md bg-[#0f766e] px-7 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(15,23,42,0.06),0_2px_10px_-1px_rgba(15,118,110,0.28)] transition hover:bg-[#115e59] hover:shadow-[0_4px_14px_-2px_rgba(15,118,110,0.35)]"
              >
                <a href="#overview">
                  {hero.primaryCta}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 min-h-[48px] rounded-md border border-slate-300 bg-white px-7 text-sm font-semibold text-slate-800 transition hover:border-[#0f766e]/40 hover:bg-slate-50 hover:text-[#0f766e]"
              >
                <Link href="/login">{hero.secondaryCta}</Link>
              </Button>
            </div>

            <p className="mt-6 text-xs text-slate-500">
              No account needed to learn more — browse the sections below or jump ahead from the header.
            </p>
          </div>

          {/* Right column: chrome-frame dashboard mockup */}
          <div className="relative flex min-w-0 flex-col">
            {/* Mockup glow */}
            <div
              className="pointer-events-none absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-br from-[#14b8a6]/15 via-transparent to-[#0f766e]/15 blur-2xl"
              aria-hidden
            />
            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06),0_24px_60px_-18px_rgba(15,23,42,0.2)] ring-1 ring-slate-900/[0.04]">
              {/* Chrome bar: traffic lights + URL pill */}
              <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
                <div className="flex items-center gap-1.5" aria-hidden>
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                </div>
                <div className="flex min-w-0 flex-1 items-center justify-center">
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
                    <Lock className="h-3 w-3" aria-hidden />
                    <span className="truncate">app.aada-erp.com</span>
                  </div>
                </div>
              </div>
              {/* Dashboard image */}
              <div className="relative aspect-[16/10] w-full bg-slate-100">
                <Image
                  src={src}
                  alt={alt}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 48vw"
                  className="object-cover"
                />
              </div>
              {/* Caption strip */}
              <div className="flex items-center gap-2 border-t border-slate-100 bg-white px-4 py-2.5 text-[11px] text-slate-500">
                <Monitor className="h-3.5 w-3.5 text-[#0f766e]" aria-hidden />
                <span>Finance dashboard — budgets, liquidity, and approvals in one view.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
