'use client'

import Image from 'next/image'
import { CheckCircle2 } from 'lucide-react'
import { overview } from '@/content/homeCopy'
import { homeImages } from '@/content/homeImages'
import { publicPage } from '@/lib/public-page'
import { cn } from '@/lib/utils'

export function HomeOverview() {
  const { src, alt } = homeImages.overview

  return (
    <section
      id="overview"
      className={cn(
        publicPage.scrollSection,
        publicPage.sectionBorder,
        publicPage.surface,
        publicPage.sectionPad,
      )}
    >
      <div
        className={cn(
          publicPage.inner,
          'grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-14',
        )}
      >
        <div className={cn('relative order-2 min-h-[280px] overflow-hidden lg:order-1 lg:min-h-[420px]', publicPage.imageFrame)}>
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 1024px) 100vw, 48vw"
            className="object-cover"
          />
        </div>
        <div className="order-1 flex flex-col justify-center lg:order-2">
          <p className={publicPage.kicker}>{overview.kicker}</p>
          <h2 className={cn(publicPage.h2, 'mt-4 max-w-xl')}>{overview.title}</h2>
          <p className={cn(publicPage.subKicker, 'mt-5')}>One system, full traceability</p>
          <p className={cn(publicPage.body, 'mt-5 max-w-prose')}>{overview.lead}</p>
          {overview.paragraphs.map((p, i) => (
            <p key={i} className={cn(publicPage.bodyMuted, 'mt-4 max-w-prose')}>
              {p}
            </p>
          ))}
          <ul className={cn(publicPage.surfaceRaised, 'mt-10 overflow-hidden')}>
            {overview.highlights.map((h) => (
              <li
                key={h.title}
                className="border-b border-slate-100 bg-white px-5 py-4 transition-colors last:border-b-0 hover:bg-slate-50/80 sm:px-6 sm:py-5"
              >
                <div className="flex gap-4">
                  <span className={publicPage.iconBox}>
                    <CheckCircle2 className="h-5 w-5" strokeWidth={2} aria-hidden />
                  </span>
                  <div>
                    <p className="font-sans text-sm font-semibold text-slate-900">{h.title}</p>
                    <p className={cn(publicPage.bodyMuted, 'mt-1.5')}>{h.body}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
