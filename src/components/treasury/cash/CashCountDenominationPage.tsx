'use client'

import React, { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Calculator, RefreshCw, ShieldCheck } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { ChartOfAccountsPageFrame } from '@/components/finance/ChartOfAccountsPageFrame'
import { CashManagementSubNav } from '@/components/treasury/cash/CashManagementSubNav'
import type { PaginatedResponse } from '@/lib/api/client'
import {
  getCashAccounts,
  getCashCounts,
  recordCashCount,
  verifyCashCount,
  getDenominations,
  CashAccount,
  CashCount,
  CashCountFormData,
  DenominationDetail,
} from '@/lib/api/cash'
import {
  FinanceDataTable,
  FinanceDataTableHeader,
  FinanceDataTableTh,
  FinanceDataTableRow,
  FinanceDataTableTd,
} from '@/components/finance'

export function CashCountDenominationPage() {
  const [accountId, setAccountId] = useState<number | null>(null)
  const [counts, setCounts] = useState<Record<number, number>>({})
  const [countForm, setCountForm] = useState<CashCountFormData>({
    count_date: new Date().toISOString().split('T')[0],
    actual_balance: 0,
    notes: '',
  })

  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: accountsData, isLoading: accLoading } = useQuery({
    queryKey: ['cash-accounts'],
    queryFn: () => getCashAccounts(),
  })
  const accounts: CashAccount[] = accountsData?.data || []

  React.useEffect(() => {
    if (!accountId && accounts.length > 0) setAccountId(accounts[0].id)
  }, [accounts, accountId])

  const selected = useMemo(() => accounts.find((a) => a.id === accountId), [accounts, accountId])

  const denoms = useMemo(() => (selected ? getDenominations(selected.currency) : []), [selected])

  const denomTotal = useMemo(() => {
    return denoms.reduce((sum, d) => {
      const c = counts[d.value] ?? 0
      return sum + d.value * c
    }, 0)
  }, [denoms, counts])

  React.useEffect(() => {
    setCountForm((f) => ({ ...f, actual_balance: Math.round(denomTotal * 100) / 100 }))
  }, [denomTotal])

  const { data: historyData, isLoading: histLoading, refetch } = useQuery({
    queryKey: ['cash-counts', accountId],
    queryFn: async () => {
      if (!accountId) return null
      const res = await getCashCounts(accountId, { per_page: 50 })
      return res as PaginatedResponse<CashCount>
    },
    enabled: !!accountId,
  })

  const historyRows = historyData?.data ?? []

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CashCountFormData }) => recordCashCount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-counts'] })
      queryClient.invalidateQueries({ queryKey: ['cash-accounts'] })
      toast({ title: 'Cash count recorded' })
      setCounts({})
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } }
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed',
        variant: 'destructive',
      })
    },
  })

  const verifyMutation = useMutation({
    mutationFn: verifyCashCount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-counts'] })
      toast({ title: 'Verified' })
    },
  })

  const denominationDetails: DenominationDetail[] | undefined = useMemo(() => {
    const details: DenominationDetail[] = []
    for (const d of denoms) {
      const c = counts[d.value] ?? 0
      if (c > 0) {
        details.push({ denomination: d.value, count: c, total: d.value * c })
      }
    }
    return details.length > 0 ? details : undefined
  }, [denoms, counts])

  return (
    <ChartOfAccountsPageFrame title="Cash count & Denomination">
      <div className="flex flex-col gap-4">
        <CashManagementSubNav variant="strip" />
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Cash count &amp; denomination</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Enter physical note and coin counts, compare to the book balance, and record variances. Verify counts when
            review is complete.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
        <Card className="coa-ledger-card">
          <div className="coa-toolbar px-3 py-2">
            <Calculator className="h-4 w-4 text-primary" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wider">Cash count</span>
          </div>
          <CardContent className="space-y-4 p-4">
            <div className="space-y-2">
              <Label>Cash account</Label>
              <Select value={accountId ? String(accountId) : ''} onValueChange={(v) => setAccountId(parseInt(v, 10))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name} ({a.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selected && (
              <div className="grid grid-cols-2 gap-2 rounded-none border border-border bg-muted/20 p-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Balance</span>
                  <p className="font-medium tabular-nums">
                    {formatCurrency(selected.current_balance)} {selected.currency}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Denomination total</span>
                  <p className="font-medium tabular-nums">{formatCurrency(denomTotal)}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 border-b border-border/80 pb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="min-w-[5.5rem]">Denomination</span>
              <span className="flex-1 text-center">Pieces</span>
              <span className="w-24 text-right">Line total</span>
            </div>
            <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
              {denoms.map((d) => (
                <div key={d.value} className="flex items-center gap-2">
                  <span className="w-28 shrink-0 text-xs font-medium text-foreground">{d.label}</span>
                  <Input
                    type="number"
                    min={0}
                    className="h-9 flex-1"
                    value={counts[d.value] ?? ''}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10)
                      setCounts((prev) => ({ ...prev, [d.value]: Number.isFinite(n) ? n : 0 }))
                    }}
                    placeholder="0"
                    aria-label={`Pieces of ${d.label}`}
                  />
                  <span className="w-24 text-right text-xs tabular-nums text-muted-foreground">
                    {formatCurrency((counts[d.value] ?? 0) * d.value)}
                  </span>
                </div>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Count date</Label>
                <DatePicker value={countForm.count_date} onChange={(v) => setCountForm({ ...countForm, count_date: v })} />
              </div>
              <div className="space-y-2">
                <Label>Actual balance</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={countForm.actual_balance}
                  onChange={(e) =>
                    setCountForm({ ...countForm, actual_balance: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                rows={2}
                value={countForm.notes || ''}
                onChange={(e) => setCountForm({ ...countForm, notes: e.target.value })}
              />
            </div>
            <Button
              className="w-full"
              disabled={mutation.isPending || !accountId}
              onClick={() =>
                accountId &&
                mutation.mutate({
                  id: accountId,
                  data: {
                    ...countForm,
                    denomination_details: denominationDetails,
                  },
                })
              }
            >
              {mutation.isPending ? 'Saving…' : 'Record cash count'}
            </Button>
          </CardContent>
        </Card>

        <Card className="coa-ledger-card overflow-hidden">
          <div className="coa-toolbar flex items-center justify-between gap-2 px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider">History</span>
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <CardContent className="p-0">
            {accLoading || histLoading ? (
              <Skeleton className="m-4 h-40" />
            ) : (
              <div className="max-h-[min(70vh,520px)] overflow-auto">
                <div className="coa-ledger-table-frame rounded-none border-0 shadow-none">
                  <FinanceDataTable className="min-w-0 rounded-none border-0 bg-transparent shadow-none">
                    <FinanceDataTableHeader
                      theadClassName="coa-ledger-thead sticky top-0 z-10"
                      className="[&_th]:!text-primary-foreground [&_th]:px-3 [&_th]:py-2 [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase"
                    >
                      <FinanceDataTableTh>Date</FinanceDataTableTh>
                      <FinanceDataTableTh className="text-right">Expected</FinanceDataTableTh>
                      <FinanceDataTableTh className="text-right">Actual</FinanceDataTableTh>
                      <FinanceDataTableTh className="text-right">Diff</FinanceDataTableTh>
                      <FinanceDataTableTh>Status</FinanceDataTableTh>
                      <FinanceDataTableTh className="w-24" />
                    </FinanceDataTableHeader>
                    <tbody>
                      {historyRows.length === 0 && (
                        <FinanceDataTableRow className="coa-ledger-table-row">
                          <FinanceDataTableTd colSpan={6} className="py-8 text-center text-muted-foreground">
                            No counts yet.
                          </FinanceDataTableTd>
                        </FinanceDataTableRow>
                      )}
                      {historyRows.map((row) => (
                        <FinanceDataTableRow key={row.id} className="coa-ledger-table-row">
                          <FinanceDataTableTd>{formatDate(row.count_date)}</FinanceDataTableTd>
                          <FinanceDataTableTd className="text-right tabular-nums">
                            {formatCurrency(row.expected_balance)}
                          </FinanceDataTableTd>
                          <FinanceDataTableTd className="text-right tabular-nums">
                            {formatCurrency(row.actual_balance)}
                          </FinanceDataTableTd>
                          <FinanceDataTableTd className="text-right tabular-nums">
                            {formatCurrency(row.difference)}
                          </FinanceDataTableTd>
                          <FinanceDataTableTd>
                            {row.verified_at ? (
                              <Badge variant="secondary" className="gap-1">
                                <ShieldCheck className="h-3 w-3" /> Verified
                              </Badge>
                            ) : (
                              <Badge variant="outline">Pending</Badge>
                            )}
                          </FinanceDataTableTd>
                          <FinanceDataTableTd>
                            {!row.verified_at && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8"
                                onClick={() => verifyMutation.mutate(row.id)}
                                disabled={verifyMutation.isPending}
                              >
                                Verify
                              </Button>
                            )}
                          </FinanceDataTableTd>
                        </FinanceDataTableRow>
                      ))}
                    </tbody>
                  </FinanceDataTable>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </ChartOfAccountsPageFrame>
  )
}
