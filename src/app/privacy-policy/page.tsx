import type { Metadata } from 'next'
import { PrivacyPolicyClientPage } from '@/components/home/marketing/pages/PrivacyPolicyClientPage'

export const metadata: Metadata = {
  title: 'Privacy notice | NGOBook',
  description: 'How NGOBook handles information collected through this marketing website and contact forms.',
}

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyClientPage />
}
