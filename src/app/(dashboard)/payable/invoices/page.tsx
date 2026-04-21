'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { FinanceModuleLinks } from '@/components/finance'

export default function PayableInvoicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vendor Invoices</h1>
        <p className="text-muted-foreground">
          Record and track vendor invoices for accounts payable. Link invoices to vouchers and payments.
        </p>
      </div>
      <FinanceModuleLinks variant="inline" />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoices
          </CardTitle>
          <CardDescription>
            Vendor invoice management will use the existing Vendors and Vouchers modules. Create payment vouchers from Payables → Payments and allocate to invoices when the payment API is extended.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button asChild variant="default">
            <Link href="/payables/vendors">Vendors</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/vouchers">Vouchers</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
