'use client'

import React from 'react'
import Link from 'next/link'

export default function AuditComplianceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        <Link href="/audit-compliance" className="hover:text-foreground">
          Audit & Compliance
        </Link>
      </div>
      {children}
    </div>
  )
}
