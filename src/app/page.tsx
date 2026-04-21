import type { Metadata } from 'next'
import { PublicHome } from '@/components/home/PublicHome'
import { PUBLIC_SITE_META } from '@/content/publicSiteMeta'

export const metadata: Metadata = {
  title: PUBLIC_SITE_META.title,
  description: PUBLIC_SITE_META.description,
  openGraph: {
    title: PUBLIC_SITE_META.openGraphTitle,
    description: PUBLIC_SITE_META.openGraphDescription,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: PUBLIC_SITE_META.openGraphTitle,
    description: PUBLIC_SITE_META.openGraphDescription,
  },
}

export default function HomePage() {
  return <PublicHome />
}
