'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
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
  Building,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Landmark,
  CheckSquare,
  FileText,
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
import { useRouter } from 'next/navigation'
import { useOfficeOptional } from '@/contexts/OfficeContext'
import { ChartOfAccountsPageFrame } from '@/components/finance/ChartOfAccountsPageFrame'
import {
  getBankAccounts,
  getBankAccount,
  createBankAccount,
  deleteBankAccount,
  recordBankTransaction,
  getAccountTypeLabel,
  getTransactionTypeLabel,
  getTransactionTypeColor,
  maskAccountNumber,
  BankAccount,
  BankTransaction,
  BankAccountFormData,
  BankTransactionFormData,
} from '@/lib/api/bank'

// Mock offices data
const mockOffices = [
  { id: 1, name: 'Kabul Head Office', code: 'KBL' },
  { id: 2, name: 'Mazar-i-Sharif Office', code: 'MZR' },
  { id: 3, name: 'Herat Office', code: 'HRT' },
  { id: 4, name: 'Kandahar Office', code: 'KDH' },
]

export function BankAccountsPage() {
  const router = useRouter()
  const officeContext = useOfficeOptional()
  const defaultOfficeId = officeContext?.officeId ?? 1

  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null)
  const [createAccountDialogOpen, setCreateAccountDialogOpen] = useState(false)
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false)
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdrawal'>('deposit')
  const [viewAccountDialogOpen, setViewAccountDialogOpen] = useState(false)
  const [viewingAccount, setViewingAccount] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(null)

  // Form states
  const [accountForm, setAccountForm] = useState<BankAccountFormData>({
    office_id: defaultOfficeId,
    gl_account_id: 1,
    bank_name: '',
    branch_name: '',
    account_number: '',
    account_name: '',
    account_type: 'checking',
    currency: 'USD',
    opening_balance: 0,
  })

  const [transactionForm, setTransactionForm] = useState<BankTransactionFormData>({
    transaction_type: 'deposit',
    transaction_date: new Date().toISOString().split('T')[0],
    amount: 0,
    description: '',
    reference: '',
    payee_payer: '',
  })

  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch bank accounts
  const { data: accountsData, isLoading, refetch } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => getBankAccounts(),
  })

  const accounts: BankAccount[] = accountsData?.data || []

  // Group accounts by office
  const accountsByOffice = accounts.reduce((acc, account) => {
    const officeId = account.office_id
    if (!acc[officeId]) {
      acc[officeId] = {
        office: account.office || { id: officeId, name: `Office ${officeId}`, code: 'OFC' },
        accounts: [],
      }
    }
    acc[officeId].accounts.push(account)
    return acc
  }, {} as Record<number, { office: any; accounts: BankAccount[] }>)

  // Calculate totals
  const totalsByType = accounts.reduce((acc, account) => {
    if (!acc[account.account_type]) {
      acc[account.account_type] = 0
    }
    acc[account.account_type] += account.current_balance
    return acc
  }, {} as Record<string, number>)

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.current_balance, 0)

  // Create account mutation
  const createAccountMutation = useMutation({
    mutationFn: createBankAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      setCreateAccountDialogOpen(false)
      resetAccountForm()
      toast({ title: 'Bank Account Created', description: 'The bank account has been created.' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to create account', variant: 'destructive' })
    },
  })

  // Record transaction mutation
  const transactionMutation = useMutation({
    mutationFn: ({ accountId, data }: { accountId: number; data: BankTransactionFormData }) =>
      recordBankTransaction(accountId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      setTransactionDialogOpen(false)
      setSelectedAccount(null)
      resetTransactionForm()
      toast({ title: 'Transaction Recorded', description: 'The transaction has been recorded successfully.' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to record transaction', variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBankAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      setDeleteDialogOpen(false)
      setAccountToDelete(null)
      toast({ title: 'Bank Account Deleted', description: 'The bank account has been deleted successfully.' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to delete bank account', variant: 'destructive' })
    },
  })

  const resetAccountForm = () => {
    setAccountForm({
      office_id: defaultOfficeId,
      gl_account_id: 1,
      bank_name: '',
      branch_name: '',
      account_number: '',
      account_name: '',
      account_type: 'checking',
      currency: 'USD',
      opening_balance: 0,
    })
  }

  const resetTransactionForm = () => {
    setTransactionForm({
      transaction_type: 'deposit',
      transaction_date: new Date().toISOString().split('T')[0],
      amount: 0,
      description: '',
      reference: '',
      payee_payer: '',
    })
  }

  const handleViewAccount = async (account: BankAccount) => {
    try {
      const response = await getBankAccount(account.id)
      setViewingAccount(response.data)
      setViewAccountDialogOpen(true)
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load account details', variant: 'destructive' })
    }
  }

  const handleOpenTransaction = (account: BankAccount, type: 'deposit' | 'withdrawal') => {
    setSelectedAccount(account)
    setTransactionType(type)
    setTransactionForm({
      ...transactionForm,
      transaction_type: type,
    })
    setTransactionDialogOpen(true)
  }

  return (
    <ChartOfAccountsPageFrame title="Bank accounts">
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Bank accounts</h1>
          <p className="text-muted-foreground">
            Register bank accounts and record deposits and withdrawals
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => refetch()}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => setCreateAccountDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Bank Account
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Landmark className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p>
              <p className="text-sm text-muted-foreground">Total Bank Balance</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-emerald-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalsByType.checking || 0)}</p>
              <p className="text-sm text-muted-foreground">Checking</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
              <Building className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalsByType.savings || 0)}</p>
              <p className="text-sm text-muted-foreground">Savings</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{accounts.length}</p>
              <p className="text-sm text-muted-foreground">Total Accounts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bank accounts list */}
      <Card>
        <CardHeader>
          <CardTitle>Bank accounts</CardTitle>
          <CardDescription>All bank accounts across offices</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">Bank / Account</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Office</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Account Number</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Balance</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Last Reconciled</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <>
                  {[...Array(3)].map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-4 py-3"><Skeleton className="h-10 w-40" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-8" /></td>
                    </tr>
                  ))}
                </>
              )}
              {!isLoading && accounts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No bank accounts configured.
                    <Button variant="link" onClick={() => setCreateAccountDialogOpen(true)} className="ml-2">
                      Add your first bank account
                    </Button>
                  </td>
                </tr>
              )}
              {!isLoading && accounts.map((account) => (
                <tr key={account.id} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Landmark className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{account.bank_name}</p>
                        <p className="text-sm text-muted-foreground">{account.account_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{account.office?.code || 'N/A'}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">
                    {maskAccountNumber(account.account_number)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{getAccountTypeLabel(account.account_type)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium">
                    {account.currency} {formatCurrency(account.current_balance)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {account.last_reconciled_date ? (
                      <span className="text-sm">{formatDate(account.last_reconciled_date)}</span>
                    ) : (
                      <Badge variant="outline" className="text-yellow-600">Never</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ActionMenu
                      triggerClassName="h-8 w-8"
                      menuWidth={180}
                      items={[
                        { label: 'View Details', icon: <Eye className="h-4 w-4" />, onClick: () => handleViewAccount(account) },
                        { label: 'Deposit', icon: <ArrowDownLeft className="h-4 w-4 text-green-600" />, onClick: () => handleOpenTransaction(account, 'deposit') },
                        { label: 'Withdrawal', icon: <ArrowUpRight className="h-4 w-4 text-red-600" />, onClick: () => handleOpenTransaction(account, 'withdrawal') },
                        {
                          label: 'Reconcile',
                          icon: <CheckSquare className="h-4 w-4" />,
                          onClick: () => router.push(`/treasury/bank/reconciliation?account=${account.id}`),
                        },
                        { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: () => { setAccountToDelete(account); setDeleteDialogOpen(true) }, destructive: true },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Create Account Dialog */}
      <Dialog open={createAccountDialogOpen} onOpenChange={(open) => { if (open !== createAccountDialogOpen) setCreateAccountDialogOpen(open) }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Bank Account</DialogTitle>
            <DialogDescription>Add a new bank account to the system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label required>Office</Label>
                <Select
                  value={accountForm.office_id.toString()}
                  onValueChange={(v) => setAccountForm({ ...accountForm, office_id: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mockOffices.map((office) => (
                      <SelectItem key={office.id} value={office.id.toString()}>
                        {office.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label required>Account Type</Label>
                <Select
                  value={accountForm.account_type}
                  onValueChange={(v) => setAccountForm({ ...accountForm, account_type: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Checking</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="fixed_deposit">Fixed Deposit</SelectItem>
                    <SelectItem value="money_market">Money Market</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label required>Bank Name</Label>
                <Input
                  placeholder="e.g., Afghanistan International Bank"
                  value={accountForm.bank_name}
                  onChange={(e) => setAccountForm({ ...accountForm, bank_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Branch Name</Label>
                <Input
                  placeholder="e.g., Main Branch"
                  value={accountForm.branch_name || ''}
                  onChange={(e) => setAccountForm({ ...accountForm, branch_name: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label required>Account Number</Label>
                <Input
                  placeholder="Account number"
                  value={accountForm.account_number}
                  onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label required>Account Name</Label>
                <Input
                  placeholder="Account holder name"
                  value={accountForm.account_name}
                  onChange={(e) => setAccountForm({ ...accountForm, account_name: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label required>Currency</Label>
                <CurrencySelect value={accountForm.currency || ''} onChange={(v) => setAccountForm({ ...accountForm, currency: v || 'USD' })} placeholder="Select currency" />
              </div>
              <div className="space-y-2">
                <Label>Opening Balance</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={accountForm.opening_balance || ''}
                  onChange={(e) => setAccountForm({ ...accountForm, opening_balance: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SWIFT Code</Label>
                <Input
                  placeholder="SWIFT/BIC code"
                  value={accountForm.swift_code || ''}
                  onChange={(e) => setAccountForm({ ...accountForm, swift_code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>IBAN</Label>
                <Input
                  placeholder="IBAN"
                  value={accountForm.iban || ''}
                  onChange={(e) => setAccountForm({ ...accountForm, iban: e.target.value })}
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
              disabled={createAccountMutation.isPending || !accountForm.bank_name || !accountForm.account_number}
            >
              {createAccountMutation.isPending ? 'Creating...' : 'Create Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Dialog */}
      <Dialog open={transactionDialogOpen} onOpenChange={(open) => { if (open !== transactionDialogOpen) setTransactionDialogOpen(open) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {transactionType === 'deposit' ? 'Record Deposit' : 'Record Withdrawal'}
            </DialogTitle>
            <DialogDescription>
              {selectedAccount?.bank_name} - {maskAccountNumber(selectedAccount?.account_number || '')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label required>Date</Label>
                <DatePicker
                  value={transactionForm.transaction_date}
                  onChange={(v) => setTransactionForm({ ...transactionForm, transaction_date: v })}
                />
              </div>
              <div className="space-y-2">
                <Label required>Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={transactionForm.amount || ''}
                  onChange={(e) => setTransactionForm({ ...transactionForm, amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reference</Label>
              <Input
                placeholder="Transaction reference"
                value={transactionForm.reference || ''}
                onChange={(e) => setTransactionForm({ ...transactionForm, reference: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{transactionType === 'deposit' ? 'Received From' : 'Paid To'}</Label>
              <Input
                placeholder="Name"
                value={transactionForm.payee_payer || ''}
                onChange={(e) => setTransactionForm({ ...transactionForm, payee_payer: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label required>Description</Label>
              <Textarea
                placeholder="Enter transaction details..."
                value={transactionForm.description}
                onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setTransactionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedAccount && transactionMutation.mutate({
                accountId: selectedAccount.id,
                data: { ...transactionForm, transaction_type: transactionType },
              })}
              disabled={transactionMutation.isPending || !transactionForm.amount || !transactionForm.description}
            >
              {transactionMutation.isPending ? 'Recording...' : 'Record Transaction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Account Dialog */}
      <Dialog open={viewAccountDialogOpen} onOpenChange={(open) => { if (open !== viewAccountDialogOpen) setViewAccountDialogOpen(open) }}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Bank Account Details</DialogTitle>
            <DialogDescription>{viewingAccount?.account?.bank_name}</DialogDescription>
          </DialogHeader>
          {viewingAccount && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Account Number</p>
                  <p className="font-mono">{viewingAccount.account.account_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Account Type</p>
                  <p className="font-medium">{getAccountTypeLabel(viewingAccount.account.account_type)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Balance</p>
                  <p className="font-medium">
                    {viewingAccount.account.currency} {formatCurrency(viewingAccount.account.current_balance)}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span>Unreconciled Transactions</span>
                  <Badge variant={viewingAccount.unreconciled_count > 0 ? 'destructive' : 'success'}>
                    {viewingAccount.unreconciled_count}
                  </Badge>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Recent Transactions</h4>
                <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                  {viewingAccount.recent_transactions?.length === 0 && (
                    <p className="p-4 text-center text-muted-foreground">No transactions yet</p>
                  )}
                  {viewingAccount.recent_transactions?.map((txn: BankTransaction) => (
                    <div key={txn.id} className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={getTransactionTypeColor(txn.transaction_type)}>
                          {getTransactionTypeLabel(txn.transaction_type)}
                        </Badge>
                        <div>
                          <p className="text-sm">{txn.description}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(txn.transaction_date)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "font-mono",
                          txn.credit_amount > 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {txn.credit_amount > 0 ? '+' : '-'}
                          {formatCurrency(txn.credit_amount || txn.debit_amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">Bal: {formatCurrency(txn.running_balance)}</p>
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (open !== deleteDialogOpen) setDeleteDialogOpen(open) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bank Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete bank account <strong>{accountToDelete?.account_name}</strong> ({accountToDelete?.account_number})?
              Only accounts with zero balance and no transactions can be deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => accountToDelete && deleteMutation.mutate(accountToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </ChartOfAccountsPageFrame>
  )
}
