'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileText, RefreshCw } from 'lucide-react'
import { subMonths } from 'date-fns'
import { formatCurrency, formatDate, todayISO, toISODate } from '@/lib/utils'
import { getFunds, getFundStatement, Fund } from '@/lib/api/funds'
import { DatePicker } from '@/components/ui/date-picker'

function lastMonthStart(): string {
  return toISODate(subMonths(new Date(), 1)) || todayISO()
}

export default function FundStatementsPage() {
  const [fundId, setFundId] = useState<number | null>(null)
  const [startDate, setStartDate] = useState(lastMonthStart)
  const [endDate, setEndDate] = useState(todayISO)
  const [submitted, setSubmitted] = useState(false)

  const { data: fundsData } = useQuery({
    queryKey: ['funds-list-statements'],
    queryFn: () => getFunds({ per_page: 200, is_active: true }),
  })

  const { data: statementData, isLoading: statementLoading, refetch } = useQuery({
    queryKey: ['fund-statement', fundId, startDate, endDate],
    queryFn: () => getFundStatement(fundId!, { start_date: startDate, end_date: endDate }),
    enabled: submitted && fundId != null && !!startDate && !!endDate,
  })

  const funds: Fund[] = fundsData?.data ?? []
  const fund = funds.find((f) => f.id === fundId)
  const statement = statementData?.data

  const handleGenerate = () => {
    if (!fundId) return
    setSubmitted(true)
    refetch()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fund statements</h1>
        <p className="text-muted-foreground">Per-fund statement: movements and balance for a date range</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate statement
          </CardTitle>
          <CardDescription>Select a fund and date range to view transactions and opening/closing balance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fund</label>
              <Select
                value={fundId != null ? String(fundId) : '__none__'}
                onValueChange={(v) => {
                  setFundId(v === '__none__' ? null : parseInt(v, 10))
                  setSubmitted(false)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fund" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select fund</SelectItem>
                  {funds.map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.fund_code} — {f.fund_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">From date</label>
              <DatePicker
                value={startDate}
                onChange={(v) => { setStartDate(v); setSubmitted(false); }}
                maxDate={endDate}
                placeholder="From date"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">To date</label>
              <DatePicker
                value={endDate}
                onChange={(v) => { setEndDate(v); setSubmitted(false); }}
                minDate={startDate}
                placeholder="To date"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleGenerate} disabled={!fundId}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {submitted && fundId != null && (
        <Card>
          <CardHeader>
            <CardTitle>Statement</CardTitle>
            <CardDescription>
              {fund ? `${fund.fund_code} — ${fund.fund_name}` : ''} from {formatDate(startDate)} to {formatDate(endDate)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statementLoading ? (
              <Skeleton className="h-64 w-full rounded-md" />
            ) : statement ? (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Opening balance</p>
                    <p className="text-lg font-semibold">{formatCurrency(statement.opening_balance, statement.fund?.currency)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Total debits</p>
                    <p className="text-lg font-semibold">{formatCurrency(statement.total_debits, statement.fund?.currency)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Total credits</p>
                    <p className="text-lg font-semibold">{formatCurrency(statement.total_credits, statement.fund?.currency)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Closing balance</p>
                    <p className="text-lg font-semibold">{formatCurrency(statement.closing_balance, statement.fund?.currency)}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Transactions</h3>
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50 uppercase tracking-wider">
                          <th className="text-left py-2 px-3 font-medium">Date</th>
                          <th className="text-left py-2 px-3 font-medium">Entry</th>
                          <th className="text-left py-2 px-3 font-medium">Description</th>
                          <th className="text-left py-2 px-3 font-medium">Account</th>
                          <th className="text-right py-2 px-3 font-medium">Debit</th>
                          <th className="text-right py-2 px-3 font-medium">Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statement.transactions?.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-muted-foreground">No transactions in this period</td>
                          </tr>
                        ) : (
                          statement.transactions?.map((tx: {
                            id: number
                            journal_entry?: { entry_number: string; entry_date: string; description?: string }
                            journalEntry?: { entry_number: string; entry_date: string; description?: string }
                            account?: { account_code: string; account_name: string }
                            debit: number
                            credit: number
                          }) => {
                            const je = tx.journal_entry ?? tx.journalEntry
                            return (
                              <tr key={tx.id} className="border-b hover:bg-muted/30">
                                <td className="py-2 px-3">{je?.entry_date ? formatDate(je.entry_date) : '—'}</td>
                                <td className="py-2 px-3">{je?.entry_number ?? '—'}</td>
                                <td className="py-2 px-3 max-w-[200px] truncate">{je?.description ?? '—'}</td>
                                <td className="py-2 px-3">{tx.account ? `${tx.account.account_code} ${tx.account.account_name}` : '—'}</td>
                                <td className="py-2 px-3 text-right">{tx.debit ? formatCurrency(tx.debit, statement.fund?.currency) : '—'}</td>
                                <td className="py-2 px-3 text-right">{tx.credit ? formatCurrency(tx.credit, statement.fund?.currency) : '—'}</td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground py-4">No statement data. Check dates and try again.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
