'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

/**
 * Donor grants — redirects to main grants page with optional donor_id filter.
 */
export default function DonorGrantsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const donorId = searchParams.get('donor_id')

  useEffect(() => {
    const url = donorId ? `/projects/grants?donor_id=${donorId}` : '/projects/grants'
    router.replace(url)
  }, [donorId, router])

  return (
    <div className="p-6 flex items-center justify-center min-h-[200px]">
      <p className="text-sm text-muted-foreground">Opening donor grants…</p>
    </div>
  )
}
