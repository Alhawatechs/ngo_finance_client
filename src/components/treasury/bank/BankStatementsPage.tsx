'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Upload, FileSpreadsheet, RefreshCw } from 'lucide-react'
import { ChartOfAccountsPageFrame } from '@/components/finance/ChartOfAccountsPageFrame'
import { getBankAccounts, BankAccount } from '@/lib/api/bank'
import { cn } from '@/lib/utils'

/** Placeholder row until bank statement import API is wired */
export function BankStatementsPage() {
  const [accountFilter, setAccountFilter] = useState<string>('all')

  const { data: accountsData, isLoading, refetch } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => getBankAccounts(),
  })

  const accounts: BankAccount[] = accountsData?.data || []

  return (
    <ChartOfAccountsPageFrame title="Bank statements">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Bank statements</h1>
            <p className="text-sm text-muted-foreground">
              Imported or uploaded bank statement periods by account
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
              Refresh
            </Button>
            <Button size="sm" disabled title="Connect bank statement import when available">
              <Upload className="mr-2 h-4 w-4" />
              Import statement
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">Bank account</Label>
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="w-[min(100%,280px)]">
                <SelectValue placeholder="All accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.bank_name} — {a.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="coa-ledger-card overflow-hidden">
          <CardHeader className="flex flex-row items-center gap-2 py-3">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Statement register</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Period</th>
                    <th className="px-4 py-3 text-left font-medium">Bank / Account</th>
                    <th className="px-4 py-3 text-right font-medium">Opening</th>
                    <th className="px-4 py-3 text-right font-medium">Closing</th>
                    <th className="px-4 py-3 text-left font-medium">Imported</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <>
                      {[1, 2, 3].map((i) => (
                        <tr key={i} className="border-b">
                          <td className="px-4 py-3">
                            <Skeleton className="h-4 w-28" />
                          </td>
                          <td className="px-4 py-3">
                            <Skeleton className="h-4 w-48" />
                          </td>
                          <td className="px-4 py-3">
                            <Skeleton className="h-4 w-20" />
                          </td>
                          <td className="px-4 py-3">
                            <Skeleton className="h-4 w-20" />
                          </td>
                          <td className="px-4 py-3">
                            <Skeleton className="h-4 w-24" />
                          </td>
                          <td className="px-4 py-3">
                            <Skeleton className="h-4 w-16" />
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                  {!isLoading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                        No bank statements imported yet. Use <strong>Import statement</strong> when file upload is
                        enabled, or add statement lines via your finance workflow.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ChartOfAccountsPageFrame>
  )
}
