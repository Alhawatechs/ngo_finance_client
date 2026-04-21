'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Heart } from 'lucide-react'

export default function DonorCompliancePage() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">Donor / Grant Compliance</h1>
        <p className="text-muted-foreground">Donor reporting deadlines, covenant tracking, eligibility</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Donor & grant compliance
          </CardTitle>
          <CardDescription>Deadlines and covenant status by donor/grant. Implementation in progress.</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full rounded-md" />
        </CardContent>
      </Card>
    </>
  )
}
