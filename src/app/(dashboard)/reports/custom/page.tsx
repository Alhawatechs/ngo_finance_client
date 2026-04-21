'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { BarChart3, FileText } from 'lucide-react'

export default function ReportsCustomPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Custom Reports</h1>
        <p className="text-muted-foreground">
          Build custom reports from the standard financial and donor reports. Use filters and date ranges on the main Reports page.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Custom reports
          </CardTitle>
          <CardDescription>
            Use the main Reports page to run Trial Balance, Income Statement, Balance Sheet, Cash Flow, Budget vs Actual, General Ledger, and Donor Reports with custom date ranges and parameters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/reports">Open Reports</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
