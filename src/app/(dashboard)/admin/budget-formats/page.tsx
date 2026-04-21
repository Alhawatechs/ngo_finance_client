'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Redirect from legacy admin route to Project Budget -> Format Templates.
 */
export default function AdminBudgetFormatsRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/projects/budget/formats')
  }, [router])
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  )
}
