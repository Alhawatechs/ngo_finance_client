'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { BarChart3, FileText, Calculator } from 'lucide-react'

export default function TaxReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tax Reports</h1>
        <p className="text-muted-foreground">
          Tax reports by period and account. Use General Ledger and account statement for tax account detail.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Tax reports
          </CardTitle>
          <CardDescription>
            Run General Ledger or Account Statement reports filtered by tax accounts for period-end tax reporting.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button asChild variant="default">
            <Link href="/reports">Financial reports</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/general-ledger/accounts">Chart of accounts</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
