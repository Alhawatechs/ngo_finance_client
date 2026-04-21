'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Wallet } from 'lucide-react'
import { FinanceModuleLinks } from '@/components/finance'

export default function PayableExpensesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
        <p className="text-muted-foreground">
          Track and record expenses. Record expense vouchers and link to projects or cost centers.
        </p>
      </div>
      <FinanceModuleLinks variant="inline" />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Expense management
          </CardTitle>
          <CardDescription>
            Record expenses via Journal Entries or Vouchers. Use the correct expense accounts from the Chart of Accounts and optionally allocate to projects and funds.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button asChild variant="default">
            <Link href="/vouchers">Vouchers</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/general-ledger/journal-entries">Journal entries</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
