'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Shield } from 'lucide-react'

export default function InternalControlsPage() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">Internal Controls</h1>
        <p className="text-muted-foreground">Segregation of duties matrix, control checklist, control testing</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Internal controls
          </CardTitle>
          <CardDescription>SoD matrix and control testing. Implementation in progress.</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full rounded-md" />
        </CardContent>
      </Card>
    </>
  )
}
