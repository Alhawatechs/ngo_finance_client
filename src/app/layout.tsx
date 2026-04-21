import type { Metadata, Viewport } from 'next'
import './globals.css'
import { RootLayoutShell } from '@/components/RootLayoutShell'

/**
 * Root layout must stay a Server Component. Do not use `next/dynamic` with `ssr: false` here—
 * put that only inside a file marked `'use client'` (see RootLayoutShell).
 */
export const metadata: Metadata = {
  title: 'AADA ERP Finance',
  description: 'NGO Finance Management System',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#14532d',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="font-sans">
      <body className="flex min-h-screen flex-col font-sans">
        <RootLayoutShell>{children}</RootLayoutShell>
      </body>
    </html>
  )
}
