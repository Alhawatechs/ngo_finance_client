'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PayrollProcessingPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/payroll')
  }, [router])
  return (
    <div className="p-6 flex items-center justify-center min-h-[200px]">
      <p className="text-sm text-muted-foreground">Redirecting to payroll…</p>
    </div>
  )
}
