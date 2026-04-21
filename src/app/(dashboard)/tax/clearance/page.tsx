'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { FileCheck, BookOpen, Calculator } from 'lucide-react'

export default function TaxClearancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tax Clearance</h1>
        <p className="text-muted-foreground">
          Tax clearance and compliance. Use reports and GL to support clearance documentation.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Tax clearance
          </CardTitle>
          <CardDescription>
            Export General Ledger and financial reports for tax clearance. Ensure tax accounts are up to date and use Reports for period summaries.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button asChild variant="default">
            <Link href="/reports">Reports</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/general-ledger/journal-entries">Journal entries</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
