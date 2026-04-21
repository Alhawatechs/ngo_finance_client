'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Heart, Users, FileText } from 'lucide-react'

export default function ReceivableDonorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Donor Receivables</h1>
        <p className="text-muted-foreground">
          Track receivables from donors: pledges, grants, and donations. Use Donors and Reports for donor-level detail.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Donor receivables
          </CardTitle>
          <CardDescription>
            Manage donor-related receivables via Donors and Projects/Grants. Donor reports are available under Reports → Donor Reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button asChild variant="default">
            <Link href="/receivables/donors">Donors</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/reports/donor-reports">Donor reports</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
