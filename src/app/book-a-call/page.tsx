import type { Metadata } from 'next'
import { BookCallMarketingPage } from '@/components/home/marketing/pages/BookCallMarketingPage'

export const metadata: Metadata = {
  title: 'Book a call | NGOBook',
  description: 'Book a sales and discovery call with NGOBook.',
}

export default function BookACallPage() {
  return <BookCallMarketingPage />
}
