'use client'

import React, { useState } from 'react'
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
import { ArrowRightLeft, RefreshCw } from 'lucide-react'
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
  transferCash,
  getTransactionTypeLabel,
  getTransactionTypeColor,
  CashAccount,
  CashTransaction,
  TransferFormData,
} from '@/lib/api/cash'
import {
  FinanceDataTable,
  FinanceDataTableHeader,
  FinanceDataTableTh,
  FinanceDataTableRow,
  FinanceDataTableTd,
} from '@/components/finance'

export function CashTransferPage() {
  const [fromId, setFromId] = useState<number | null>(null)
  const [form, setForm] = useState<TransferFormData>({
    from_account_id: 0,
    to_account_id: 0,
    amount: 0,
    transaction_date: new Date().toISOString().split('T')[0],
    description: '',
  })

  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: accountsData, isLoading: accLoading } = useQuery({
    queryKey: ['cash-accounts'],
    queryFn: () => getCashAccounts(),
  })
  const accounts: CashAccount[] = accountsData?.data || []

  React.useEffect(() => {
    if (accounts.length >= 2 && !fromId) {
      setFromId(accounts[0].id)
      setForm((f) => ({
        ...f,
        from_account_id: accounts[0].id,
        to_account_id: accounts[1].id,
      }))
    }
  }, [accounts, fromId])

  const { data: txData, isLoading: txLoading, refetch } = useQuery({
    queryKey: ['cash-transactions', fromId, 'transfer'],
    queryFn: async () => {
      if (!fromId) return null
      const res = await getCashTransactions(fromId, { per_page: 100 })
      return res as PaginatedResponse<CashTransaction>
    },
    enabled: !!fromId,
  })

  const rows = (txData?.data ?? []).filter(
    (t) => t.transaction_type === 'transfer_in' || t.transaction_type === 'transfer_out'
  )

  const mutation = useMutation({
    mutationFn: transferCash,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['cash-accounts'] })
      toast({ title: 'Transfer completed' })
      setForm((f) => ({ ...f, amount: 0, description: '' }))
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } }
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Transfer failed',
        variant: 'destructive',
      })
    },
  })

  return (
    <ChartOfAccountsPageFrame title="Cash transfer">
      <div className="flex flex-col gap-4">
        <CashManagementSubNav variant="strip" />
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Cash transfer</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Move cash between two accounts in the same currency (e.g. petty to main cash). History shows transfer lines
            from the &quot;from&quot; account.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
        <Card className="coa-ledger-card">
          <div className="coa-toolbar px-3 py-2">
            <ArrowRightLeft className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider">Transfer</span>
          </div>
          <CardContent className="space-y-4 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>From account</Label>
                <Select
                  value={form.from_account_id ? String(form.from_account_id) : ''}
                  onValueChange={(v) => {
                    const id = parseInt(v, 10)
                    setForm({ ...form, from_account_id: id })
                    setFromId(id)
                  }}
                >
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
              <div className="space-y-2">
                <Label>To account</Label>
                <Select
                  value={form.to_account_id ? String(form.to_account_id) : ''}
                  onValueChange={(v) => setForm({ ...form, to_account_id: parseInt(v, 10) })}
                >
                  <SelectTrigger>
                    <SelectValue />
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
                <DatePicker value={form.transaction_date} onChange={(v) => setForm({ ...form, transaction_date: v })} />
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.amount || ''}
                  onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
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
                form.from_account_id === form.to_account_id ||
                !form.amount ||
                !form.description
              }
              onClick={() => mutation.mutate(form)}
            >
              {mutation.isPending ? 'Transferring…' : 'Transfer'}
            </Button>
          </CardContent>
        </Card>

        <Card className="coa-ledger-card overflow-hidden">
          <div className="coa-toolbar flex items-center justify-between px-3 py-2">
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
                            No transfers from this account.
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
                            {formatCurrency(txn.amount)}
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
