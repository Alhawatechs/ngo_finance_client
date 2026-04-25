import type { Metadata } from 'next'
import { TermsConditionsClientPage } from '@/components/home/marketing/pages/TermsConditionsClientPage'

export const metadata: Metadata = {
  title: 'Terms of use | NGOBook',
  description: 'Terms of use for the NGOBook marketing website operated by NGOBook.',
}

export default function TermsConditionsPage() {
  return <TermsConditionsClientPage />
}
