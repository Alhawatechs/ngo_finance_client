'use client'

import Image from 'next/image'
import { audience } from '@/content/homeCopy'
import { homeImages } from '@/content/homeImages'
import { publicPage } from '@/lib/public-page'
import { cn } from '@/lib/utils'

export function HomeAudience() {
  const { src, alt } = homeImages.audience

  return (
    <section
      id="audience"
      className={cn(
        publicPage.scrollSection,
        publicPage.sectionBorder,
        publicPage.surfaceAlt,
        publicPage.sectionPad,
      )}
    >
      <div className={cn(publicPage.inner, 'grid gap-10 md:grid-cols-2 md:items-center lg:gap-14')}>
        <div
          className={cn(
            'relative order-2 min-h-[260px] overflow-hidden md:order-1 md:min-h-[360px]',
            publicPage.imageFrame,
          )}
        >
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
        <div className="order-1 flex flex-col justify-center md:order-2">
          <p className={publicPage.kicker}>{audience.kicker}</p>
          <h2 className={cn(publicPage.h2, 'mt-4 max-w-xl')}>{audience.title}</h2>
          <p className={cn(publicPage.subKicker, 'mt-4')}>Your teams &amp; stakeholders</p>
          <p className={cn(publicPage.body, 'mt-5 max-w-prose')}>{audience.body}</p>
          <div className="mt-8 h-px w-16 bg-gradient-to-r from-[#0f766e] to-transparent" aria-hidden />
        </div>
      </div>
    </section>
  )
}
