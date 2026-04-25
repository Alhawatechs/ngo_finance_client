import type { Metadata } from 'next'
import { LegalMarketingPage } from '@/components/home/marketing/pages/LegalMarketingPage'
import { privacyContent } from '@/components/home/marketing/pages/legal-content'

export const metadata: Metadata = {
  title: 'Privacy notice | NGOBook',
  description: 'How NGOBook handles information collected through this marketing website and contact forms.',
}

export default function PrivacyPolicyPage() {
  return <LegalMarketingPage content={privacyContent} />
}
