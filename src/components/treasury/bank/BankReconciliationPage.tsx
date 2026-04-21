'use client'

import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/ui/date-picker'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CheckSquare, RefreshCw } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { ChartOfAccountsPageFrame } from '@/components/finance/ChartOfAccountsPageFrame'
import {
  getBankAccounts,
  startReconciliation,
  BankAccount,
  ReconciliationFormData,
} from '@/lib/api/bank'
import { cn } from '@/lib/utils'

export function BankReconciliationPage() {
  const searchParams = useSearchParams()
  const accountFromUrl = searchParams.get('account')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [accountId, setAccountId] = useState<number | null>(null)
  const [form, setForm] = useState<ReconciliationFormData>({
    reconciliation_date: new Date().toISOString().split('T')[0],
    statement_balance: 0,
    notes: '',
  })

  const { data: accountsData, isLoading, refetch } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => getBankAccounts(),
  })

  const accounts: BankAccount[] = accountsData?.data || []

  useEffect(() => {
    const id = accountFromUrl ? parseInt(accountFromUrl, 10) : NaN
    if (Number.isFinite(id) && accounts.some((a) => a.id === id)) {
      setAccountId(id)
      return
    }
    setAccountId((prev) => {
      if (prev != null) return prev
      return accounts[0]?.id ?? null
    })
  }, [accountFromUrl, accounts])

  const selected = accounts.find((a) => a.id === accountId)

  const startMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ReconciliationFormData }) => startReconciliation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      toast({ title: 'Reconciliation started', description: 'Continue matching transactions in the ledger workflow.' })
      setForm((f) => ({ ...f, notes: '' }))
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } }
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Could not start reconciliation',
        variant: 'destructive',
      })
    },
  })

  return (
    <ChartOfAccountsPageFrame title="Bank reconciliation">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Bank reconciliation</h1>
            <p className="text-sm text-muted-foreground">
              Match the book balance to the bank statement closing balance for the selected account
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="coa-ledger-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckSquare className="h-4 w-4 text-primary" />
                New reconciliation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Bank account</Label>
                {isLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    value={accountId ? String(accountId) : ''}
                    onValueChange={(v) => setAccountId(parseInt(v, 10))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.bank_name} — {a.account_name} ({a.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              {selected && (
                <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                  <p>
                    <span className="text-muted-foreground">Book balance: </span>
                    <strong>
                      {selected.currency} {formatCurrency(selected.current_balance)}
                    </strong>
                  </p>
                  {selected.last_reconciled_date && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Last reconciled: {formatDate(selected.last_reconciled_date)}
                    </p>
                  )}
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Statement date</Label>
                  <DatePicker
                    value={form.reconciliation_date}
                    onChange={(v) => setForm({ ...form, reconciliation_date: v })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Statement closing balance</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.statement_balance || ''}
                    onChange={(e) =>
                      setForm({ ...form, statement_balance: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  rows={3}
                  value={form.notes || ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <Button
                className="w-full"
                disabled={startMut.isPending || !accountId}
                onClick={() => accountId && startMut.mutate({ id: accountId, data: form })}
              >
                {startMut.isPending ? 'Starting…' : 'Start reconciliation'}
              </Button>
            </CardContent>
          </Card>

          <Card className="coa-ledger-card">
            <CardHeader>
              <CardTitle className="text-base">Reconciliation status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                After you start a reconciliation, clear outstanding items in the bank register and complete the session
                when the adjusted book balance matches the statement.
              </p>
              <div className="rounded-md border border-dashed border-border p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-foreground">Tip</p>
                <p className="mt-2">
                  Open <strong>Bank accounts</strong> under Treasury &amp; Cash → Bank Management to review transactions and unreconciled lines for
                  this account before closing the period.
                </p>
              </div>
              {selected?.last_reconciled_date ? (
                <Badge variant="secondary" className="text-xs">
                  Last reconciled {formatDate(selected.last_reconciled_date)}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  Not yet reconciled on this account
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ChartOfAccountsPageFrame>
  )
}
