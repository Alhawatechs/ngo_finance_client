'use client'

import { useEffect, useMemo, useState } from 'react'
import { MARKETING_MESSAGES, type MarketingLocale } from './i18n'

const STORAGE_KEY = 'marketing_home_locale'

const isRtl = (locale: MarketingLocale) => locale === 'fa-AF' || locale === 'ps'

export function useMarketingI18n() {
  const [locale, setLocale] = useState<MarketingLocale>('en')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as MarketingLocale | null
      if (stored && (stored === 'en' || stored === 'fa-AF' || stored === 'ps')) {
        setLocale(stored)
      }
    } catch {
      // no-op
    }
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('lang', locale)
    document.documentElement.setAttribute('dir', isRtl(locale) ? 'rtl' : 'ltr')
    try {
      localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      // no-op
    }
  }, [locale])

  const t = useMemo(() => MARKETING_MESSAGES[locale], [locale])
  const dir: 'rtl' | 'ltr' = isRtl(locale) ? 'rtl' : 'ltr'

  return { locale, setLocale, t, dir } as const
}
