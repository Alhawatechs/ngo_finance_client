'use client'

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { displayCurrencyForAccount } from '@/lib/account-display-currency'
import { FileText, Download, RefreshCw } from 'lucide-react'
import { getGeneralLedger } from '@/lib/api/reports'
import { ChartOfAccount } from '@/types'
import { useToast } from '@/components/ui/use-toast'

interface GLReport {
  report_type?: string
  report_currency?: string
  account?: { code?: string; name?: string }
  period?: { start_date?: string; end_date?: string }
  opening_balance?: number
  closing_balance?: number
  total_debit?: number
  total_credit?: number
  transactions?: Array<Record<string, unknown>>
}

const defaultStartDate = () => {
  const d = new Date()
  d.setMonth(0)
  d.setDate(1)
  return d.toISOString().split('T')[0]
}
const defaultEndDate = () => new Date().toISOString().split('T')[0]

export interface AccountStatementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: ChartOfAccount | null
}

export function AccountStatementDialog({
  open,
  onOpenChange,
  account,
}: AccountStatementDialogProps) {
  const { toast } = useToast()
  const [startDate, setStartDate] = useState(defaultStartDate)
  const [endDate, setEndDate] = useState(defaultEndDate)

  const accountId = account?.id
  const { data: glData, isLoading: glLoading, refetch } = useQuery({
    queryKey: ['general-ledger-dialog', accountId, startDate, endDate],
    queryFn: () =>
      getGeneralLedger({
        account_id: Number(accountId),
        start_date: startDate,
        end_date: endDate,
      }),
    enabled: open && !!accountId && !!startDate && !!endDate,
  })

  const report: GLReport | null = glData?.data ?? null
  const currency =
    report?.report_currency ?? displayCurrencyForAccount(account, 'AFN')

  const handleExportCSV = () => {
    if (!report?.transactions?.length) {
      toast({ title: 'No data', description: 'No transactions to export.', variant: 'destructive' })
      return
    }
    const headers = ['Date', 'Reference', 'Description', 'Debit', 'Credit', 'Running Balance']
    const rows = (report.transactions ?? []).map((tx: Record<string, unknown>) => {
      const je = (tx.journal_entry ?? tx) as Record<string, unknown>
      return [
        formatDate(String(je.entry_date ?? tx.entry_date ?? '')),
        String(je.entry_number ?? tx.entry_number ?? ''),
        `"${String(je.description ?? tx.description ?? '').replace(/"/g, '""')}"`,
        (tx.report_debit as number) > 0 ? (tx.report_debit as number) : '',
        (tx.report_credit as number) > 0 ? (tx.report_credit as number) : '',
        (tx.running_balance as number) ?? 0,
      ].join(',')
    })
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `account-statement-${report?.account?.code ?? account?.account_code ?? 'account'}-${startDate}-${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Exported', description: 'Statement exported as CSV.' })
  }

  const hasReport = !!report
  const noTransactions = accountId && !report && !glLoading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-4xl max-h-[90vh] flex flex-col gap-4 p-6',
          'data-[state=open]:animate-dialog-enter data-[state=closed]:animate-dialog-exit'
        )}
      >
        <DialogHeader>
          <DialogTitle className="pr-8">
            {account
              ? `${account.account_code} — ${account.account_name}`
              : 'Account Statement'}
          </DialogTitle>
          <DialogDescription>
            {account
              ? `Ledger statement for this account. Adjust date range and click Generate to refresh.`
              : 'Select an account to view its statement.'}
          </DialogDescription>
        </DialogHeader>

        {account && (
          <>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label className="text-xs">From date</Label>
                <DatePicker value={startDate} onChange={setStartDate} className="w-[140px] h-9" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">To date</Label>
                <DatePicker value={endDate} onChange={setEndDate} minDate={startDate} className="w-[140px] h-9" />
              </div>
              <Button onClick={() => refetch()} disabled={glLoading} size="sm" className="h-9">
                {glLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Generate
              </Button>
            </div>

            {glLoading && (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            )}

            {hasReport && !glLoading && (
              <div className="flex flex-col gap-4 overflow-hidden min-h-0">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-muted/40 shrink-0">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Opening balance</p>
                    <p className="font-mono text-sm font-semibold mt-0.5">{formatCurrency(report.opening_balance ?? 0, currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total debit</p>
                    <p className="font-mono text-sm font-semibold mt-0.5">{formatCurrency(report.total_debit ?? 0, currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total credit</p>
                    <p className="font-mono text-sm font-semibold mt-0.5">{formatCurrency(report.total_credit ?? 0, currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Closing balance</p>
                    <p className="font-mono text-sm font-semibold mt-0.5">{formatCurrency(report.closing_balance ?? 0, currency)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(report.period?.start_date ?? '')} to {formatDate(report.period?.end_date ?? '')} · {currency}
                  </span>
                  <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-8 text-xs">
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Export CSV
                  </Button>
                </div>
                <div className="border rounded-lg overflow-auto flex-1 min-h-0 [max-height:50vh]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/80 z-10">
                      <tr className="border-b uppercase tracking-wider">
                        <th className="px-3 py-2 text-left font-semibold text-xs">Date</th>
                        <th className="px-3 py-2 text-left font-semibold text-xs">Reference</th>
                        <th className="px-3 py-2 text-left font-semibold text-xs">Description</th>
                        <th className="px-3 py-2 text-right font-semibold text-xs">Debit</th>
                        <th className="px-3 py-2 text-right font-semibold text-xs">Credit</th>
                        <th className="px-3 py-2 text-right font-semibold text-xs">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(report.transactions ?? []).map((tx: Record<string, unknown>, idx: number) => {
                        const je = (tx.journal_entry ?? tx) as Record<string, unknown>
                        return (
                          <tr key={idx} className="border-b hover:bg-muted/30">
                            <td className="px-3 py-2 whitespace-nowrap text-xs">{formatDate(String(je.entry_date ?? tx.entry_date ?? ''))}</td>
                            <td className="px-3 py-2 font-mono text-xs">{String(je.entry_number ?? tx.entry_number ?? '')}</td>
                            <td className="px-3 py-2 max-w-[180px] truncate text-xs" title={String(je.description ?? tx.description ?? '')}>
                              {String(je.description ?? tx.description ?? '')}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
                              {(tx.report_debit as number) > 0 ? formatCurrency(tx.report_debit as number, currency) : '—'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
                              {(tx.report_credit as number) > 0 ? formatCurrency(tx.report_credit as number, currency) : '—'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-xs tabular-nums font-medium">
                              {formatCurrency((tx.running_balance as number) ?? 0, currency)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/60 font-semibold text-xs">
                        <td className="px-3 py-2" colSpan={3}>Totals</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(report.total_debit ?? 0, currency)}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(report.total_credit ?? 0, currency)}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(report.closing_balance ?? 0, currency)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {noTransactions && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto opacity-50 mb-2" />
                <p>No transactions in the selected period.</p>
                <p className="text-xs mt-1">Try a different date range.</p>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
