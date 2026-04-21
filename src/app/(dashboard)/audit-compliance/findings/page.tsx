'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle } from 'lucide-react'

export default function FindingsPage() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">Findings & Remediation</h1>
        <p className="text-muted-foreground">Audit findings, management response, due dates, closure</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Findings & remediation
          </CardTitle>
          <CardDescription>Track findings, responses, and closure. Implementation in progress.</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full rounded-md" />
        </CardContent>
      </Card>
    </>
  )
}
