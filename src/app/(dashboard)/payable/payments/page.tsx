'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { CreditCard } from 'lucide-react'
import { FinanceModuleLinks } from '@/components/finance'

export default function PayablePaymentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
        <p className="text-muted-foreground">
          Process vendor payments and allocate to invoices. Use vouchers to record payments and link to bank or cash.
        </p>
      </div>
      <FinanceModuleLinks variant="inline" />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment processing
          </CardTitle>
          <CardDescription>
            Create a payment voucher (Vouchers) for vendor payments. Use Treasury (Bank or Cash) for the payment method. Payment allocation to vendor invoices can be extended when the payments API is implemented.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button asChild variant="default">
            <Link href="/vouchers">Vouchers</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/treasury/bank/accounts">Bank</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/treasury/cash">Cash</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
