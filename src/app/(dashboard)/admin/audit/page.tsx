'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Redirect to Audit & Compliance > Audit Trail. Audit Trail now lives under the main Audit & Compliance module. */
export default function AdminAuditPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/audit-compliance/audit-trail')
  }, [router])
  return null
}
