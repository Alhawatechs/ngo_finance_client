'use client'

import Image from 'next/image'
import { Shield } from 'lucide-react'
import { security } from '@/content/homeCopy'
import { homeImages } from '@/content/homeImages'
import { publicPage } from '@/lib/public-page'
import { cn } from '@/lib/utils'

export function HomeSecurity() {
  const { src, alt } = homeImages.security

  return (
    <section
      id="security"
      className={cn(
        publicPage.scrollSection,
        publicPage.sectionBorder,
        publicPage.surfaceAlt,
        publicPage.sectionPad,
      )}
    >
      <div
        className={cn(publicPage.inner, 'grid gap-10 lg:grid-cols-[1fr_minmax(0,1.12fr)] lg:items-center lg:gap-14')}
      >
        <div className={cn('relative order-2 min-h-[280px] overflow-hidden lg:order-1 lg:min-h-[380px]', publicPage.imageFrame)}>
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 1024px) 100vw, 42vw"
            className="object-cover"
          />
        </div>
        <div className="order-1 flex flex-col justify-center lg:order-2">
          <p className={publicPage.kicker}>{security.kicker}</p>
          <h2 className={cn(publicPage.h2, 'mt-4')}>
            Security &amp; governance
          </h2>
          <p className={cn(publicPage.subKicker, 'mt-5')}>Roles, sessions, and oversight</p>
          <div className="mt-8 flex gap-5">
            <span className={publicPage.iconBox}>
              <Shield className="h-6 w-6" strokeWidth={1.75} aria-hidden />
            </span>
            <p className={cn(publicPage.bodyMuted, 'max-w-prose flex-1')}>{security.body}</p>
          </div>
          <div className="mt-10 h-px w-16 bg-gradient-to-r from-[#0f766e] to-transparent" aria-hidden />
        </div>
      </div>
    </section>
  )
}
