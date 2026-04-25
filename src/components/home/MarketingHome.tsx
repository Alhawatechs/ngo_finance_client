'use client'

import { useState } from 'react'
import { useOrganizationStore } from '@/stores/organizationStore'
import { type MarketingLocale } from './marketing/i18n'
import { useMarketingI18n } from './marketing/useMarketingI18n'
import { HeaderSection } from './marketing/sections/HeaderSection'
import { HeroSection } from './marketing/sections/HeroSection'
import { OverviewSection } from './marketing/sections/OverviewSection'
import { JourneySection } from './marketing/sections/JourneySection'
import { ModulesSection } from './marketing/sections/ModulesSection'
import { PricingSection } from './marketing/sections/PricingSection'
import { SpotlightSection } from './marketing/sections/SpotlightSection'
import { PartnersSection } from './marketing/sections/PartnersSection'
import { FaqSection } from './marketing/sections/FaqSection'
import { CtaSection } from './marketing/sections/CtaSection'
import { FooterSection } from './marketing/sections/FooterSection'

export function MarketingHome() {
  const { locale, setLocale, t, dir } = useMarketingI18n()
  const [open, setOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const branding = useOrganizationStore((s) => s.branding)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const year = new Date().getFullYear()

  const scrollTo = (id: string) => {
    setOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const downloadPlatformTour = () => {
    const a = document.createElement('a')
    a.href = '/assets/ngobook-platform-tour.pdf'
    a.download = 'NGOBook-Platform-Tour.pdf'
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const pickLocale = (value: MarketingLocale) => {
    setLocale(value)
    setLangOpen(false)
    setOpen(false)
  }

  return (
    <div className="bg-white text-slate-900" dir={dir}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-[#0f766e] focus:px-3 focus:py-2 focus:text-white"
      >
        {t.skipLink}
      </a>
      <HeaderSection
        t={t}
        locale={locale}
        open={open}
        setOpen={setOpen}
        langOpen={langOpen}
        setLangOpen={setLangOpen}
        onScrollTo={scrollTo}
        onPickLocale={pickLocale}
        onDownloadPlatformTour={downloadPlatformTour}
        logoName={branding?.name}
      />

      <main id="main">
        <HeroSection t={t} dir={dir} onScrollTo={scrollTo} />
        <OverviewSection t={t} />
        <JourneySection t={t} />
        <ModulesSection t={t} />
        <PricingSection t={t} onScrollTo={scrollTo} />
        <SpotlightSection t={t} />
        <PartnersSection />
        <FaqSection t={t} openFaq={openFaq} setOpenFaq={setOpenFaq} />
        <CtaSection t={t} onScrollTo={scrollTo} />
      </main>
      <FooterSection t={t} year={year} onScrollTo={scrollTo} />
    </div>
  )
}
