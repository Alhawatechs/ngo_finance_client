'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { TrendingUp, BookOpen, BarChart3 } from 'lucide-react'

export default function ReceivableRevenuePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Revenue</h1>
        <p className="text-muted-foreground">
          Record and track revenue. Use the General Ledger and reports for revenue recognition and reporting.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Revenue
          </CardTitle>
          <CardDescription>
            Record revenue via Journal Entries or Receipt Vouchers. View Income Statement and other reports under Reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button asChild variant="default">
            <Link href="/general-ledger/journal-entries">Journal entries</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/reports">Reports</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
