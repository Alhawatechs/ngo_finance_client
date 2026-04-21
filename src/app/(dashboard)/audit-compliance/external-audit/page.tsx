'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { FileCheck } from 'lucide-react'

export default function ExternalAuditPage() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">External Audit</h1>
        <p className="text-muted-foreground">Audit calendar, auditor info, management letter, follow-up</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            External audit
          </CardTitle>
          <CardDescription>Auditor details, last audit date, audit opinion. Implementation in progress.</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full rounded-md" />
        </CardContent>
      </Card>
    </>
  )
}
