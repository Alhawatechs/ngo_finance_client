'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Donor Funds now lives under Project Management. Redirect to Fund register. */
export default function FundsPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/projects/donor-funds')
  }, [router])
  return null
}
