'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AuditCompliancePage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/audit-compliance/dashboard')
  }, [router])
  return null
}
