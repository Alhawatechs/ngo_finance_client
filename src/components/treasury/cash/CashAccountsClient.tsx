'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencySelect } from '@/components/ui/currency-select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  Plus,
  RefreshCw,
  Eye,
  Trash2,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Banknote,
  Shield,
  Building2,
  Landmark,
  ClipboardList,
} from 'lucide-react'
import { ActionMenu } from '@/components/ui/action-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { useOfficeOptional } from '@/contexts/OfficeContext'
import { FinanceModuleLinks } from '@/components/finance'
import { ChartOfAccountsPageFrame } from '@/components/finance/ChartOfAccountsPageFrame'
import { CashManagementSubNav } from '@/components/treasury/cash/CashManagementSubNav'
import { getOffices } from '@/lib/api/offices'
import { getAccountsTree, flattenAccountsTree } from '@/lib/api/chart-of-accounts'
import type { ChartOfAccount } from '@/types'
import type { ApiResponse } from '@/lib/api/client'
import {
  getCashAccounts,
  getCashAccount,
  createCashAccount,
  deleteCashAccount,
  getCashTypeLabel,
  getTransactionTypeLabel,
  getTransactionTypeColor,
  CashAccount,
  CashTransaction,
  CashAccountFormData,
} from '@/lib/api/cash'

const cashTypeIcons: Record<string, React.ReactNode> = {
  petty_cash: <Banknote className="h-5 w-5" />,
  main_cash: <Wallet className="h-5 w-5" />,
  safe: <Shield className="h-5 w-5" />,
}

export function CashAccountsClient() {
  const officeContext = useOfficeOptional()
  const defaultOfficeId = officeContext?.officeId ?? undefined

  const [createAccountDialogOpen, setCreateAccountDialogOpen] = useState(false)
  const [viewAccountDialogOpen, setViewAccountDialogOpen] = useState(false)
  const [viewingAccount, setViewingAccount] = useState<{
    account: CashAccount
    recent_transactions: CashTransaction[]
  } | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<CashAccount | null>(null)

  const [accountForm, setAccountForm] = useState<CashAccountFormData>({
    office_id: defaultOfficeId ?? 0,
    gl_account_id: 0,
    name: '',
    code: '',
    currency: 'USD',
    cash_type: 'petty_cash',
  })

  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: offices = [], isLoading: officesLoading } = useQuery({
    queryKey: ['offices', 'cash-form'],
    queryFn: () => getOffices({ is_active: true, per_page: 200 }),
  })

  const { data: coaTree } = useQuery({
    queryKey: ['chart-of-accounts-tree', 'cash'],
    queryFn: () => getAccountsTree(),
  })

  const flatCoa = useMemo(() => flattenAccountsTree(coaTree?.data), [coaTree?.data])

  const { data: accountsData, isLoading, refetch } = useQuery({
    queryKey: ['cash-accounts'],
    queryFn: () => getCashAccounts(),
  })

  const accounts: CashAccount[] = accountsData?.data || []

  const accountsByOffice = accounts.reduce(
    (acc, account) => {
      const officeId = account.office_id
      if (!acc[officeId]) {
        acc[officeId] = {
          office: account.office || { id: officeId, name: `Office ${officeId}`, code: 'OFC' },
          accounts: [],
        }
      }
      acc[officeId].accounts.push(account)
      return acc
    },
    {} as Record<number, { office: { id: number; name: string; code: string }; accounts: CashAccount[] }>
  )

  const totalsByType = accounts.reduce(
    (acc, account) => {
      if (!acc[account.cash_type]) acc[account.cash_type] = 0
      acc[account.cash_type] += account.current_balance
      return acc
    },
    {} as Record<string, number>
  )

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.current_balance, 0)

  const createAccountMutation = useMutation({
    mutationFn: createCashAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-accounts'] })
      setCreateAccountDialogOpen(false)
      resetAccountForm()
      toast({ title: 'Cash account created' })
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } }
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to create account',
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCashAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-accounts'] })
      setDeleteDialogOpen(false)
      setAccountToDelete(null)
      toast({ title: 'Cash account deleted' })
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } }
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to delete',
        variant: 'destructive',
      })
    },
  })

  const resetAccountForm = () => {
    const firstOffice = offices[0]?.id
    const firstGl = flatCoa.find((a) => a.is_posting)?.id ?? flatCoa[0]?.id ?? 0
    setAccountForm({
      office_id: defaultOfficeId ?? firstOffice ?? 0,
      gl_account_id: firstGl,
      name: '',
      code: '',
      currency: 'USD',
      cash_type: 'petty_cash',
    })
  }

  const handleOpenCreate = () => {
    resetAccountForm()
    setCreateAccountDialogOpen(true)
  }

  const handleViewAccount = async (account: CashAccount) => {
    try {
      const res = (await getCashAccount(account.id)) as ApiResponse<{
        account: CashAccount
        recent_transactions: CashTransaction[]
      }>
      setViewingAccount({
        account: res.data.account,
        recent_transactions: res.data.recent_transactions || [],
      })
      setViewAccountDialogOpen(true)
    } catch {
      toast({ title: 'Error', description: 'Failed to load account', variant: 'destructive' })
    }
  }

  return (
    <ChartOfAccountsPageFrame title="Cash accounts">
      <div className="flex flex-col gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Cash accounts</h1>
          <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
            Petty cash, main cash, and safe accounts by office. Open a section below for movements, exchange, transfers,
            inter-project loans, or physical cash counts.
          </p>
        </div>

        <CashManagementSubNav variant="cards" />

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border/80 bg-muted/10 px-3 py-2.5">
          <span className="text-xs font-medium text-muted-foreground">Also in Treasury &amp; Cash</span>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" asChild>
            <Link href="/treasury/bank/accounts">
              <Landmark className="h-3.5 w-3.5" />
              Bank Management
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" asChild>
            <Link href="/treasury/advances/advance-list">
              <ClipboardList className="h-3.5 w-3.5" />
              Advances
            </Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Register balances and custodians. Post activity from <strong>Withdrawal</strong>, <strong>Deposit</strong>, or
            related tabs.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
              Refresh
            </Button>
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New cash account
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Related finance modules</p>
          <FinanceModuleLinks variant="inline" title="Related finance modules" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Total cash', value: totalBalance, icon: Wallet },
            { label: 'Petty cash', value: totalsByType.petty_cash || 0, icon: Banknote },
            { label: 'Main cash', value: totalsByType.main_cash || 0, icon: Wallet },
            { label: 'Safe', value: totalsByType.safe || 0, icon: Shield },
          ].map((s) => (
            <Card key={s.label} className="coa-ledger-card">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-none border border-border bg-muted/40">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-semibold tabular-nums">{formatCurrency(s.value)}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {isLoading && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Card key={i} className="coa-ledger-card">
                <CardContent className="p-6">
                  <Skeleton className="mb-4 h-6 w-48" />
                  <div className="grid gap-4 md:grid-cols-3">
                    {[1, 2, 3].map((j) => (
                      <Skeleton key={j} className="h-28" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && Object.keys(accountsByOffice).length === 0 && (
          <Card className="coa-ledger-card">
            <CardContent className="p-8 text-center">
              <p className="mb-4 text-muted-foreground">No cash accounts configured.</p>
              <Button onClick={handleOpenCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Create first cash account
              </Button>
            </CardContent>
          </Card>
        )}

        {!isLoading &&
          Object.values(accountsByOffice).map(({ office, accounts: officeAccounts }) => (
            <Card key={office.id} className="coa-ledger-card overflow-hidden">
              <div className="coa-toolbar flex flex-wrap items-center gap-2 px-3 py-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider">{office.name}</span>
                <Badge variant="outline">{office.code}</Badge>
              </div>
              <CardContent className="p-4 pt-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {officeAccounts.map((account) => (
                    <Card key={account.id} className="border border-border shadow-none">
                      <CardContent className="p-4">
                        <div className="mb-3 flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {cashTypeIcons[account.cash_type]}
                            <div>
                              <p className="font-medium">{account.name}</p>
                              <p className="text-xs text-muted-foreground">{account.code}</p>
                            </div>
                          </div>
                          <ActionMenu
                            triggerClassName="h-8 w-8"
                            menuWidth={180}
                            items={[
                              {
                                label: 'View details',
                                icon: <Eye className="h-4 w-4" />,
                                onClick: () => handleViewAccount(account),
                              },
                              {
                                label: 'Delete',
                                icon: <Trash2 className="h-4 w-4" />,
                                onClick: () => {
                                  setAccountToDelete(account)
                                  setDeleteDialogOpen(true)
                                },
                                destructive: true,
                              },
                            ]}
                          />
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Balance</span>
                            <span className="font-semibold tabular-nums">
                              {account.currency} {formatCurrency(account.current_balance)}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Type</span>
                            <Badge variant="outline">{getCashTypeLabel(account.cash_type)}</Badge>
                          </div>
                          {account.custodian && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Custodian</span>
                              <span>{account.custodian.name}</span>
                            </div>
                          )}
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">
                          Use <strong>Withdrawal</strong> / <strong>Deposit</strong> tabs to post movements.
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

        <Dialog
          open={createAccountDialogOpen}
          onOpenChange={(open) => {
            if (open !== createAccountDialogOpen) setCreateAccountDialogOpen(open)
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create cash account</DialogTitle>
              <DialogDescription>Link an office and GL cash account.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Office</Label>
                  <Select
                    value={accountForm.office_id ? String(accountForm.office_id) : ''}
                    onValueChange={(v) => setAccountForm({ ...accountForm, office_id: parseInt(v, 10) })}
                    disabled={officesLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select office" />
                    </SelectTrigger>
                    <SelectContent>
                      {offices.map((office) => (
                        <SelectItem key={office.id} value={String(office.id)}>
                          {office.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cash type</Label>
                  <Select
                    value={accountForm.cash_type}
                    onValueChange={(v) =>
                      setAccountForm({ ...accountForm, cash_type: v as CashAccountFormData['cash_type'] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="petty_cash">Petty cash</SelectItem>
                      <SelectItem value="main_cash">Main cash</SelectItem>
                      <SelectItem value="safe">Safe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>GL account</Label>
                <Select
                  value={accountForm.gl_account_id ? String(accountForm.gl_account_id) : ''}
                  onValueChange={(v) => setAccountForm({ ...accountForm, gl_account_id: parseInt(v, 10) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select chart account" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {flatCoa.map((a: ChartOfAccount) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.account_code} — {a.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={accountForm.name}
                    onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                    placeholder="e.g. Petty cash – Kabul"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input
                    value={accountForm.code}
                    onChange={(e) => setAccountForm({ ...accountForm, code: e.target.value })}
                    placeholder="e.g. PC-KBL-01"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <CurrencySelect
                    value={accountForm.currency || ''}
                    onChange={(v) => setAccountForm({ ...accountForm, currency: v || 'USD' })}
                    placeholder="Currency"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Limit (optional)</Label>
                  <Input
                    type="number"
                    value={accountForm.limit_amount ?? ''}
                    onChange={(e) =>
                      setAccountForm({
                        ...accountForm,
                        limit_amount: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setCreateAccountDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createAccountMutation.mutate(accountForm)}
                disabled={
                  createAccountMutation.isPending ||
                  !accountForm.name ||
                  !accountForm.code ||
                  !accountForm.office_id ||
                  !accountForm.gl_account_id
                }
              >
                {createAccountMutation.isPending ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={viewAccountDialogOpen}
          onOpenChange={(open) => {
            if (open !== viewAccountDialogOpen) setViewAccountDialogOpen(open)
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Cash account</DialogTitle>
              <DialogDescription>{viewingAccount?.account?.name}</DialogDescription>
            </DialogHeader>
            {viewingAccount && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Code</p>
                    <p className="font-medium">{viewingAccount.account.code}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Type</p>
                    <p className="font-medium">{getCashTypeLabel(viewingAccount.account.cash_type)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Balance</p>
                    <p className="font-medium">
                      {viewingAccount.account.currency} {formatCurrency(viewingAccount.account.current_balance)}
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="mb-2 font-medium">Recent transactions</h4>
                  <div className="coa-ledger-table-frame max-h-64 overflow-y-auto rounded-none">
                    {viewingAccount.recent_transactions?.length === 0 && (
                      <p className="p-4 text-center text-sm text-muted-foreground">No transactions yet</p>
                    )}
                    {viewingAccount.recent_transactions?.map((txn) => (
                      <div
                        key={txn.id}
                        className="flex items-center justify-between border-b border-border/70 px-3 py-2 text-sm last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <Badge className={getTransactionTypeColor(txn.transaction_type)}>
                            {getTransactionTypeLabel(txn.transaction_type)}
                          </Badge>
                          <span className="line-clamp-1">{txn.description}</span>
                        </div>
                        <div className="text-right tabular-nums">
                          <span
                            className={cn(
                              txn.transaction_type === 'deposit' || txn.transaction_type === 'transfer_in'
                                ? 'text-green-600'
                                : 'text-red-600'
                            )}
                          >
                            {formatCurrency(txn.amount)}
                          </span>
                          <p className="text-xs text-muted-foreground">{formatDate(txn.transaction_date)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="secondary" onClick={() => setViewAccountDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={(o) => o !== deleteDialogOpen && setDeleteDialogOpen(o)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete cash account?</AlertDialogTitle>
              <AlertDialogDescription>
                Only zero-balance accounts with no transactions can be removed. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => accountToDelete && deleteMutation.mutate(accountToDelete.id)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ChartOfAccountsPageFrame>
  )
}
