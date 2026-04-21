'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Calculator, BookOpen, FileText } from 'lucide-react'

export default function TaxJournalsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tax Journals</h1>
        <p className="text-muted-foreground">
          Record tax entries (withholding, VAT, etc.) via the General Ledger. Use tax accounts from the Chart of Accounts.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Tax journals
          </CardTitle>
          <CardDescription>
            Post tax-related entries using Journal Entries or Vouchers. Ensure tax liability and expense accounts exist in the Chart of Accounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button asChild variant="default">
            <Link href="/general-ledger/journal-entries">Journal entries</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/general-ledger/accounts">Chart of accounts</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
