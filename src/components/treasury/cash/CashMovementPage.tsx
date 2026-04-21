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
import { Plus, RefreshCw, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { ChartOfAccountsPageFrame } from '@/components/finance/ChartOfAccountsPageFrame'
import { CashManagementSubNav } from '@/components/treasury/cash/CashManagementSubNav'
import type { PaginatedResponse } from '@/lib/api/client'
import {
  getCashAccounts,
  getCashTransactions,
  recordCashTransaction,
  getTransactionTypeLabel,
  getTransactionTypeColor,
  CashAccount,
  CashTransaction,
  CashTransactionFormData,
} from '@/lib/api/cash'
import {
  FinanceDataTable,
  FinanceDataTableHeader,
  FinanceDataTableTh,
  FinanceDataTableRow,
  FinanceDataTableTd,
} from '@/components/finance'
import {
  BankCashWithdrawalFormDialog,
  buildWithdrawalDescription,
  initialWithdrawalExtra,
  type WithdrawalFormExtra,
} from '@/components/treasury/cash/BankCashWithdrawalFormDialog'

type Mode = 'withdrawal' | 'deposit'

export function CashMovementPage({ mode }: { mode: Mode }) {
  const isWithdrawal = mode === 'withdrawal'
  const [accountId, setAccountId] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [withdrawalExtra, setWithdrawalExtra] = useState<WithdrawalFormExtra>(initialWithdrawalExtra)
  const [form, setForm] = useState<CashTransactionFormData>({
    transaction_type: mode,
    transaction_date: new Date().toISOString().split('T')[0],
    amount: 0,
    description: '',
    payee_payer: '',
    reference: '',
  })

  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ['cash-accounts'],
    queryFn: () => getCashAccounts(),
  })
  const accounts: CashAccount[] = accountsData?.data || []

  React.useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(accounts[0].id)
    }
  }, [accounts, accountId])

  const { data: txData, isLoading: txLoading, refetch } = useQuery({
    queryKey: ['cash-transactions', accountId, mode],
    queryFn: async () => {
      if (!accountId) return null
      const res = await getCashTransactions(accountId, {
        transaction_type: mode,
        per_page: 100,
      })
      return res as PaginatedResponse<CashTransaction>
    },
    enabled: !!accountId,
  })

  const rows = txData?.data ?? []

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CashTransactionFormData }) =>
      recordCashTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['cash-accounts'] })
      setDialogOpen(false)
      setForm({
        transaction_type: mode,
        transaction_date: new Date().toISOString().split('T')[0],
        amount: 0,
        description: '',
        payee_payer: '',
        reference: '',
      })
      setWithdrawalExtra(initialWithdrawalExtra())
      toast({ title: 'Recorded' })
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

  const selected = useMemo(() => accounts.find((a) => a.id === accountId), [accounts, accountId])

  const title = isWithdrawal ? 'Cash withdrawal' : 'Cash deposit'
  const Icon = isWithdrawal ? ArrowUpRight : ArrowDownLeft

  return (
    <ChartOfAccountsPageFrame title={title}>
      <div className="flex flex-col gap-4">
        <CashManagementSubNav variant="strip" />

        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            {isWithdrawal
              ? 'Record cash paid out or transferred to bank. Movements are stored against the selected cash account.'
              : 'Record cash received into the selected account. Use a clear description for audit.'}
          </p>
        </div>

        <div className="coa-ledger-card flex flex-wrap items-center justify-between gap-3 p-3">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wider">{isWithdrawal ? 'Withdrawal' : 'Deposit'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={accountId ? String(accountId) : ''}
              onValueChange={(v) => setAccountId(parseInt(v, 10))}
            >
              <SelectTrigger className="w-[min(100%,280px)]">
                <SelectValue placeholder="Cash account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.name} ({a.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              <RefreshCw className={cn('mr-2 h-4 w-4', txLoading && 'animate-spin')} />
              Refresh
            </Button>
            <Button
              size="sm"
              disabled={!accountId}
              onClick={() => {
                if (isWithdrawal) {
                  setWithdrawalExtra(initialWithdrawalExtra())
                }
                setDialogOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {isWithdrawal ? 'Add withdrawal' : 'Add deposit'}
            </Button>
          </div>
        </div>

        <Card className="coa-ledger-card overflow-hidden">
          <CardContent className="p-0">
            {accountsLoading || (txLoading && rows.length === 0) ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="max-h-[min(70vh,560px)] overflow-auto">
                <div className="coa-ledger-table-frame rounded-none border-0 border-b-0 shadow-none">
                  <FinanceDataTable className="min-w-0 rounded-none border-0 bg-transparent shadow-none">
                    <FinanceDataTableHeader
                      theadClassName="coa-ledger-thead sticky top-0 z-10"
                      className="[&_th]:!text-primary-foreground [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider"
                    >
                      <FinanceDataTableTh className="w-12">#</FinanceDataTableTh>
                      <FinanceDataTableTh>Date</FinanceDataTableTh>
                      <FinanceDataTableTh>Description</FinanceDataTableTh>
                      <FinanceDataTableTh className="min-w-[7rem]">Reference</FinanceDataTableTh>
                      <FinanceDataTableTh className="text-right">Amount</FinanceDataTableTh>
                      <FinanceDataTableTh className="text-right">Balance</FinanceDataTableTh>
                    </FinanceDataTableHeader>
                    <tbody>
                      {rows.length === 0 && (
                        <FinanceDataTableRow className="coa-ledger-table-row">
                          <FinanceDataTableTd colSpan={6} className="py-8 text-center text-muted-foreground">
                            No {mode}s for this account.
                          </FinanceDataTableTd>
                        </FinanceDataTableRow>
                      )}
                      {rows.map((txn, i) => (
                        <FinanceDataTableRow key={txn.id} className="coa-ledger-table-row">
                          <FinanceDataTableTd className="tabular-nums text-muted-foreground">{i + 1}</FinanceDataTableTd>
                          <FinanceDataTableTd>{formatDate(txn.transaction_date)}</FinanceDataTableTd>
                          <FinanceDataTableTd>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className={getTransactionTypeColor(txn.transaction_type)}>
                                {getTransactionTypeLabel(txn.transaction_type)}
                              </Badge>
                              <span className="line-clamp-2">{txn.description}</span>
                            </div>
                          </FinanceDataTableTd>
                          <FinanceDataTableTd className="max-w-[10rem] truncate text-xs text-muted-foreground" title={txn.reference ?? ''}>
                            {txn.reference ?? '—'}
                          </FinanceDataTableTd>
                          <FinanceDataTableTd className="text-right font-medium tabular-nums">
                            {formatCurrency(txn.amount)}
                          </FinanceDataTableTd>
                          <FinanceDataTableTd className="text-right text-muted-foreground tabular-nums">
                            {formatCurrency(txn.running_balance)}
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

        {isWithdrawal ? (
          <BankCashWithdrawalFormDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            selected={selected}
            transactionDate={form.transaction_date}
            onTransactionDateChange={(v) => setForm({ ...form, transaction_date: v })}
            amount={form.amount}
            onAmountChange={(v) => setForm({ ...form, amount: v })}
            purpose={form.description}
            onPurposeChange={(v) => setForm({ ...form, description: v })}
            extra={withdrawalExtra}
            onExtraChange={(patch) => setWithdrawalExtra((prev) => ({ ...prev, ...patch }))}
            isPending={mutation.isPending}
            onSubmit={() => {
              if (!accountId || !selected) return
              const description = buildWithdrawalDescription(form.description, withdrawalExtra)
              mutation.mutate({
                id: accountId,
                data: {
                  transaction_type: 'withdrawal',
                  transaction_date: form.transaction_date,
                  amount: form.amount,
                  description,
                  payee_payer: withdrawalExtra.bankName.trim() || undefined,
                  reference: withdrawalExtra.chequeNumber.trim() || undefined,
                },
              })
            }}
          />
        ) : (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record cash deposit</DialogTitle>
                <DialogDescription className="sr-only">
                  {selected?.name} — {selected?.currency} {formatCurrency(selected?.current_balance ?? 0)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Transaction date</Label>
                    <DatePicker value={form.transaction_date} onChange={(v) => setForm({ ...form, transaction_date: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount ({selected?.currency ?? ''})</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.amount || ''}
                      onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Received from</Label>
                  <Input
                    value={form.payee_payer || ''}
                    onChange={(e) => setForm({ ...form, payee_payer: e.target.value })}
                  />
                </div>
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
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    accountId &&
                    mutation.mutate({
                      id: accountId,
                      data: { ...form, transaction_type: mode },
                    })
                  }
                  disabled={mutation.isPending || !form.amount || !form.description}
                >
                  {mutation.isPending ? 'Saving…' : 'Save'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </ChartOfAccountsPageFrame>
  )
}
