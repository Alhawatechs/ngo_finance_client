'use client'

import { useMarketingI18n } from '../useMarketingI18n'
import { LegalMarketingPage } from './LegalMarketingPage'
import { getLegalContent } from './legal-content'

export function PrivacyPolicyClientPage() {
  const { locale } = useMarketingI18n()
  return <LegalMarketingPage content={getLegalContent(locale, 'privacy')} />
}
