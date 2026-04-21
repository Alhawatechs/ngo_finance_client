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
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { RefreshCw, RefreshCcw } from 'lucide-react'
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
  getCashTransactions,
  exchangeCash,
  getTransactionTypeLabel,
  getTransactionTypeColor,
  CashAccount,
  CashTransaction,
  ExchangeFormData,
} from '@/lib/api/cash'
import {
  FinanceDataTable,
  FinanceDataTableHeader,
  FinanceDataTableTh,
  FinanceDataTableRow,
  FinanceDataTableTd,
} from '@/components/finance'

export function CashExchangePage() {
  const [form, setForm] = useState<ExchangeFormData>({
    from_account_id: 0,
    to_account_id: 0,
    transaction_date: new Date().toISOString().split('T')[0],
    amount_from: 0,
    exchange_rate: 1,
    description: '',
    reference: '',
  })

  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: accountsData, isLoading: accLoading } = useQuery({
    queryKey: ['cash-accounts'],
    queryFn: () => getCashAccounts(),
  })
  const accounts: CashAccount[] = accountsData?.data || []

  React.useEffect(() => {
    if (accounts.length < 2) return
    setForm((f) => {
      if (f.from_account_id !== 0 && f.to_account_id !== 0) return f
      return { ...f, from_account_id: accounts[0].id, to_account_id: accounts[1].id }
    })
  }, [accounts])

  const { data: txData, isLoading: txLoading, refetch } = useQuery({
    queryKey: ['cash-transactions', form.from_account_id, 'exchange'],
    queryFn: async () => {
      if (!form.from_account_id) return null
      const res = await getCashTransactions(form.from_account_id, { transaction_type: 'exchange', per_page: 100 })
      return res as PaginatedResponse<CashTransaction>
    },
    enabled: form.from_account_id > 0,
  })

  const rows = txData?.data ?? []

  const amountTo = useMemo(
    () => Math.round(form.amount_from * form.exchange_rate * 100) / 100,
    [form.amount_from, form.exchange_rate]
  )

  const mutation = useMutation({
    mutationFn: exchangeCash,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['cash-accounts'] })
      toast({ title: 'Exchange completed' })
      setForm((f) => ({
        ...f,
        amount_from: 0,
        description: '',
        reference: '',
      }))
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } }
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Exchange failed',
        variant: 'destructive',
      })
    },
  })

  const fromAcc = accounts.find((a) => a.id === form.from_account_id)
  const toAcc = accounts.find((a) => a.id === form.to_account_id)

  return (
    <ChartOfAccountsPageFrame title="Cash exchange">
      <div className="flex flex-col gap-4">
        <CashManagementSubNav variant="strip" />
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Cash exchange</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Move value between two cash accounts using an exchange rate (e.g. different currencies or revaluation).
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="coa-ledger-card">
            <div className="coa-toolbar px-3 py-2">
              <RefreshCcw className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider">Exchange</span>
            </div>
            <CardContent className="space-y-4 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>From account</Label>
                  <Select
                    value={form.from_account_id ? String(form.from_account_id) : ''}
                    onValueChange={(v) => setForm({ ...form, from_account_id: parseInt(v, 10) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.name} ({a.currency}) — {formatCurrency(a.current_balance)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>To account</Label>
                  <Select
                    value={form.to_account_id ? String(form.to_account_id) : ''}
                    onValueChange={(v) => setForm({ ...form, to_account_id: parseInt(v, 10) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts
                        .filter((a) => a.id !== form.from_account_id)
                        .map((a) => (
                          <SelectItem key={a.id} value={String(a.id)}>
                            {a.name} ({a.currency})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <DatePicker
                    value={form.transaction_date}
                    onChange={(v) => setForm({ ...form, transaction_date: v })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.amount_from || ''}
                    onChange={(e) => setForm({ ...form, amount_from: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Rate</Label>
                <Input
                  type="number"
                  step="0.00000001"
                  value={form.exchange_rate || ''}
                  onChange={(e) => setForm({ ...form, exchange_rate: parseFloat(e.target.value) || 0 })}
                />
              </div>
              {fromAcc && toAcc && fromAcc.currency !== toAcc.currency && (
                <p className="rounded-none border border-border bg-muted/30 px-3 py-2 text-sm">
                  Converts <strong>{fromAcc.currency}</strong> {formatCurrency(form.amount_from)} →{' '}
                  <strong>{toAcc.currency}</strong> {formatCurrency(amountTo)}
                </p>
              )}
              <div className="space-y-2">
                <Label>Reference</Label>
                <Input
                  value={form.reference || ''}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <Button
                className="w-full"
                disabled={
                  mutation.isPending ||
                  !form.from_account_id ||
                  !form.to_account_id ||
                  !form.amount_from ||
                  !form.description ||
                  form.from_account_id === form.to_account_id
                }
                onClick={() => mutation.mutate(form)}
              >
                {mutation.isPending ? 'Processing…' : 'Execute exchange'}
              </Button>
            </CardContent>
          </Card>

          <Card className="coa-ledger-card overflow-hidden">
            <div className="coa-toolbar flex items-center justify-between gap-2 px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wider">History</span>
              <Button variant="secondary" size="sm" onClick={() => refetch()}>
                <RefreshCw className={cn('h-4 w-4', txLoading && 'animate-spin')} />
              </Button>
            </div>
            <CardContent className="p-0">
              {accLoading ? (
                <Skeleton className="m-4 h-40" />
              ) : (
                <div className="max-h-[420px] overflow-auto">
                  <div className="coa-ledger-table-frame rounded-none border-0 shadow-none">
                    <FinanceDataTable className="min-w-0 rounded-none border-0 bg-transparent shadow-none">
                      <FinanceDataTableHeader
                        theadClassName="coa-ledger-thead sticky top-0 z-10"
                        className="[&_th]:!text-primary-foreground [&_th]:px-3 [&_th]:py-2 [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase"
                      >
                        <FinanceDataTableTh>Date</FinanceDataTableTh>
                        <FinanceDataTableTh>Description</FinanceDataTableTh>
                        <FinanceDataTableTh className="text-right">Amount</FinanceDataTableTh>
                      </FinanceDataTableHeader>
                      <tbody>
                        {rows.length === 0 && (
                          <FinanceDataTableRow className="coa-ledger-table-row">
                            <FinanceDataTableTd colSpan={3} className="py-8 text-center text-muted-foreground">
                              No exchange movements for this account.
                            </FinanceDataTableTd>
                          </FinanceDataTableRow>
                        )}
                        {rows.map((txn) => (
                          <FinanceDataTableRow key={txn.id} className="coa-ledger-table-row">
                            <FinanceDataTableTd>{formatDate(txn.transaction_date)}</FinanceDataTableTd>
                            <FinanceDataTableTd>
                              <Badge className={getTransactionTypeColor(txn.transaction_type)}>
                                {getTransactionTypeLabel(txn.transaction_type)}
                              </Badge>
                              <span className="ml-2 line-clamp-2">{txn.description}</span>
                            </FinanceDataTableTd>
                            <FinanceDataTableTd className="text-right tabular-nums">
                              {txn.currency} {formatCurrency(txn.amount)}
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
