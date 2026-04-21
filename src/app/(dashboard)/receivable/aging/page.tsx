'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Calendar, FileText, Heart } from 'lucide-react'

export default function ReceivableAgingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Aging Reports</h1>
        <p className="text-muted-foreground">
          Aging of receivables by donor or account. Use reports and general ledger for aging analysis.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Aging
          </CardTitle>
          <CardDescription>
            Aging reports can be extended from the General Ledger and Account Statement reports. Donor-level aging is available via Donor Reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button asChild variant="default">
            <Link href="/reports">Financial reports</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/reports/donor-reports">Donor reports</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
