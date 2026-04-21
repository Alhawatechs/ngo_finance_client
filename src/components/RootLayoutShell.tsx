'use client'

import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'
import { Providers } from '@/components/providers'

const RootDeferredUi = dynamic(() => import('@/components/root-deferred-ui').then((m) => m.RootDeferredUi), {
  ssr: false,
})

export function RootLayoutShell({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <RootDeferredUi />
      <div className="flex min-h-screen flex-col flex-1">{children}</div>
    </Providers>
  )
}
