'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Donor reports — redirects to the main donor reports page under Financial Reporting.
 */
export default function DonorReportsRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/reports/donor-reports')
  }, [router])

  return (
    <div className="p-6 flex items-center justify-center min-h-[200px]">
      <p className="text-sm text-muted-foreground">Opening donor reports…</p>
    </div>
  )
}
