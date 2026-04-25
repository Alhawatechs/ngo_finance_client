import type { Metadata } from 'next'
import { LegalMarketingPage } from '@/components/home/marketing/pages/LegalMarketingPage'
import { termsContent } from '@/components/home/marketing/pages/legal-content'

export const metadata: Metadata = {
  title: 'Terms of use | NGOBook',
  description: 'Terms of use for the NGOBook marketing website operated by NGOBook.',
}

export default function TermsConditionsPage() {
  return <LegalMarketingPage content={termsContent} />
}
