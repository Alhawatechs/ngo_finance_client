'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeftRight, Info } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function OfficeTransfersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inter-Regional Office Transfers</h1>
        <p className="text-muted-foreground">
          Transfer funds or assets between regional offices. Use Treasury cash transfer or bank transfer for moving money between office accounts.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Regional Office Transfers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
            <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm">
                Inter-regional office transfers are handled through Treasury:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                <li>
                  <Link href="/treasury/cash" className="text-primary hover:underline">
                    Cash Management
                  </Link>
                  — Transfer between cash accounts (e.g. petty cash to main cash, or between regional offices when linked).
                </li>
                <li>
                  <Link href="/treasury/bank/accounts" className="text-primary hover:underline">
                    Bank accounts
                  </Link>
                  — Each regional office can have its own bank accounts; use vouchers (e.g. journal or contra) to record transfers between offices.
                </li>
              </ul>
              <p className="text-sm mt-2">
                For audit trail, create a voucher (payment from one office, receipt at another) or a journal entry allocating to the correct regional office and accounts.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="default">
              <Link href="/treasury/cash">Go to Cash Management</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/treasury/bank/accounts">Go to Bank accounts</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
