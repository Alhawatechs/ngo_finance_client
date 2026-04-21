'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  Plus,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Search,
  Wallet,
  DollarSign,
  Lock,
  Unlock,
  Clock,
} from 'lucide-react'
import { ActionMenu } from '@/components/ui/action-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CurrencySelect } from '@/components/ui/currency-select'
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
import {
  getFunds,
  getFund,
  createFund,
  updateFund,
  deleteFund,
  getFundTypeLabel,
  getFundTypeColor,
  getFundTypeDescription,
  Fund,
  FundFormData,
} from '@/lib/api/funds'
import { ProjectsPageHeader } from '@/components/projects/PageHeader'
export default function DonorFundsRegisterPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [fundDialogOpen, setFundDialogOpen] = useState(false)
  const [editingFund, setEditingFund] = useState<Fund | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewingFund, setViewingFund] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [fundToDelete, setFundToDelete] = useState<Fund | null>(null)

  const [fundForm, setFundForm] = useState<FundFormData>({
    fund_code: '',
    fund_name: '',
    fund_type: 'restricted',
    currency: 'USD',
    description: '',
    restrictions: '',
  })

  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: fundsData, isLoading, refetch } = useQuery({
    queryKey: ['funds', { page, type: filterType, search: searchQuery }],
    queryFn: () => getFunds({
      page,
      per_page: 25,
      fund_type: filterType !== 'all' ? filterType : undefined,
      search: searchQuery || undefined,
    }),
  })

  const funds: Fund[] = fundsData?.data || []
  const pagination = fundsData?.meta

  const createMutation = useMutation({
    mutationFn: createFund,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funds'] })
      setFundDialogOpen(false)
      resetForm()
      toast({ title: 'Fund Created', description: 'The fund has been created successfully.' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to create fund', variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<FundFormData & { is_active: boolean }> }) => updateFund(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funds'] })
      setFundDialogOpen(false)
      setEditingFund(null)
      resetForm()
      toast({ title: 'Fund Updated', description: 'The fund has been updated successfully.' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to update fund', variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteFund,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funds'] })
      setDeleteDialogOpen(false)
      setFundToDelete(null)
      toast({ title: 'Fund Deleted', description: 'The fund has been deleted successfully.' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to delete fund', variant: 'destructive' })
    },
  })

  const resetForm = () => {
    setFundForm({
      fund_code: '',
      fund_name: '',
      fund_type: 'restricted',
      currency: 'USD',
      description: '',
      restrictions: '',
    })
  }

  const handleEdit = (fund: Fund) => {
    setEditingFund(fund)
    setFundForm({
      fund_code: fund.fund_code,
      fund_name: fund.fund_name,
      fund_type: fund.fund_type,
      currency: fund.currency,
      description: fund.description || '',
      restrictions: fund.restrictions || '',
      total_amount: fund.total_amount,
    })
    setFundDialogOpen(true)
  }

  const handleView = async (fund: Fund) => {
    try {
      const response = await getFund(fund.id)
      setViewingFund(response.data)
      setViewDialogOpen(true)
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load fund details', variant: 'destructive' })
    }
  }

  const handleSave = () => {
    if (editingFund) {
      updateMutation.mutate({ id: editingFund.id, data: fundForm })
    } else {
      createMutation.mutate(fundForm)
    }
  }

  const restrictedBalance = funds.filter(f => f.fund_type === 'restricted').reduce((sum, f) => sum + f.current_balance, 0)
  const unrestrictedBalance = funds.filter(f => f.fund_type === 'unrestricted').reduce((sum, f) => sum + f.current_balance, 0)
  const tempRestrictedBalance = funds.filter(f => f.fund_type === 'temporarily_restricted').reduce((sum, f) => sum + f.current_balance, 0)
  const totalBalance = funds.reduce((sum, f) => sum + f.current_balance, 0)

  const getFundIcon = (type: string) => {
    switch (type) {
      case 'restricted': return <Lock className="h-4 w-4" />
      case 'unrestricted': return <Unlock className="h-4 w-4" />
      case 'temporarily_restricted': return <Clock className="h-4 w-4" />
      default: return <Wallet className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      <ProjectsPageHeader
        title="Fund Register"
        description="Donor funds: restricted and unrestricted funds with donor requirements"
        breadcrumbs={[]}
        actions={
          <>
            <Button variant="secondary" onClick={() => refetch()}>
              <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
              Refresh
            </Button>
            <Button onClick={() => { setEditingFund(null); resetForm(); setFundDialogOpen(true) }}>
              <Plus className="h-4 w-4 mr-2" />
              New Fund
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
              <Lock className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(restrictedBalance)}</p>
              <p className="text-sm text-muted-foreground">Restricted</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
              <Unlock className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(unrestrictedBalance)}</p>
              <p className="text-sm text-muted-foreground">Unrestricted</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(tempRestrictedBalance)}</p>
              <p className="text-sm text-muted-foreground">Temp. Restricted</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p>
              <p className="text-sm text-muted-foreground">Total Balance</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search funds..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Fund Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="restricted">Restricted</SelectItem>
                <SelectItem value="unrestricted">Unrestricted</SelectItem>
                <SelectItem value="temporarily_restricted">Temporarily Restricted</SelectItem>
                <SelectItem value="endowment">Endowment</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && (
          <>
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </>
        )}
        {!isLoading && funds.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center text-muted-foreground">
              No funds found.
              <Button variant="link" onClick={() => { setEditingFund(null); resetForm(); setFundDialogOpen(true) }} className="ml-2">
                Create your first fund
              </Button>
            </CardContent>
          </Card>
        )}
        {!isLoading && funds.map((fund) => (
          <Card key={fund.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("p-2 rounded-lg", getFundTypeColor(fund.fund_type).replace('text-', 'bg-').split(' ')[0])}>
                    {getFundIcon(fund.fund_type)}
                  </div>
                  <div>
                    <p className="text-xs font-mono text-muted-foreground">{fund.fund_code}</p>
                    <CardTitle className="text-base">{fund.fund_name}</CardTitle>
                  </div>
                </div>
                <ActionMenu
                  triggerClassName="h-8 w-8"
                  items={[
                    { label: 'View Details', icon: <Eye className="h-4 w-4" />, onClick: () => handleView(fund) },
                    { label: 'Edit', icon: <Edit className="h-4 w-4" />, onClick: () => handleEdit(fund) },
                    { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: () => { setFundToDelete(fund); setDeleteDialogOpen(true) }, destructive: true },
                  ]}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge className={getFundTypeColor(fund.fund_type)}>
                {getFundTypeLabel(fund.fund_type)}
              </Badge>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Current Balance</p>
                <p className="text-xl font-bold">{formatCurrency(fund.current_balance, fund.currency)}</p>
              </div>
              {fund.donor && (
                <p className="text-sm text-muted-foreground">Donor: {fund.donor.name}</p>
              )}
              {fund.end_date && (
                <p className="text-xs text-muted-foreground">Ends: {formatDate(fund.end_date)}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {pagination && pagination.last_page > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {pagination.from} to {pagination.to} of {pagination.total} funds
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="secondary" size="sm" disabled={page === pagination.last_page} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      <Dialog open={fundDialogOpen} onOpenChange={(open) => { if (open !== fundDialogOpen) setFundDialogOpen(open) }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingFund ? 'Edit Fund' : 'New Fund'}</DialogTitle>
            <DialogDescription>
              {editingFund ? 'Update fund information' : 'Create a new donor fund'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label required>Fund Code</Label>
                <Input placeholder="FND-001" value={fundForm.fund_code} onChange={(e) => setFundForm({ ...fundForm, fund_code: e.target.value.toUpperCase() })} disabled={!!editingFund} />
              </div>
              <div className="space-y-2">
                <Label required>Fund Type</Label>
                <Select value={fundForm.fund_type} onValueChange={(v) => setFundForm({ ...fundForm, fund_type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restricted">Restricted</SelectItem>
                    <SelectItem value="unrestricted">Unrestricted</SelectItem>
                    <SelectItem value="temporarily_restricted">Temporarily Restricted</SelectItem>
                    <SelectItem value="endowment">Endowment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{getFundTypeDescription(fundForm.fund_type)}</p>
            <div className="space-y-2">
              <Label required>Fund Name</Label>
              <Input placeholder="Fund name" value={fundForm.fund_name} onChange={(e) => setFundForm({ ...fundForm, fund_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Amount</Label>
                <Input type="number" placeholder="0.00" value={fundForm.total_amount || ''} onChange={(e) => setFundForm({ ...fundForm, total_amount: parseFloat(e.target.value) || undefined })} />
              </div>
              <div className="space-y-2">
                <Label required>Currency</Label>
                <CurrencySelect value={fundForm.currency || ''} onChange={(v) => setFundForm({ ...fundForm, currency: v || 'USD' })} placeholder="Select currency" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Fund description..." value={fundForm.description || ''} onChange={(e) => setFundForm({ ...fundForm, description: e.target.value })} rows={2} />
            </div>
            {(fundForm.fund_type === 'restricted' || fundForm.fund_type === 'temporarily_restricted') && (
              <div className="space-y-2">
                <Label>Restrictions</Label>
                <Textarea placeholder="Describe donor restrictions..." value={fundForm.restrictions || ''} onChange={(e) => setFundForm({ ...fundForm, restrictions: e.target.value })} rows={2} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setFundDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending || !fundForm.fund_name || !fundForm.fund_code}>
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Fund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={(open) => { if (open !== viewDialogOpen) setViewDialogOpen(open) }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Fund Details</DialogTitle>
            <DialogDescription>{viewingFund?.fund?.fund_code}</DialogDescription>
          </DialogHeader>
          {viewingFund && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={cn("p-3 rounded-lg", getFundTypeColor(viewingFund.fund.fund_type).replace('text-', 'bg-').split(' ')[0])}>
                  {getFundIcon(viewingFund.fund.fund_type)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{viewingFund.fund.fund_name}</h3>
                  <Badge className={getFundTypeColor(viewingFund.fund.fund_type)}>{getFundTypeLabel(viewingFund.fund.fund_type)}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-xl font-bold">{formatCurrency(viewingFund.fund.total_amount, viewingFund.fund.currency)}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className="text-xl font-bold">{formatCurrency(viewingFund.fund.current_balance, viewingFund.fund.currency)}</p>
                </div>
              </div>
              {viewingFund.fund.restrictions && (
                <div>
                  <p className="text-sm text-muted-foreground">Restrictions</p>
                  <p className="text-sm">{viewingFund.fund.restrictions}</p>
                </div>
              )}
              {viewingFund.transactions?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Recent Transactions</h4>
                  <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {viewingFund.transactions.map((txn: any) => (
                      <div key={txn.id} className="p-3 flex items-center justify-between text-sm">
                        <div>
                          <p className="font-mono text-xs">{txn.journal_entry?.entry_number}</p>
                          <p>{txn.account?.account_name}</p>
                        </div>
                        <div className="text-right">
                          {txn.debit > 0 && <p className="text-red-600">-{formatCurrency(txn.debit, viewingFund.fund.currency)}</p>}
                          {txn.credit > 0 && <p className="text-green-600">+{formatCurrency(txn.credit, viewingFund.fund.currency)}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (open !== deleteDialogOpen) setDeleteDialogOpen(open) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fund</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete fund <strong>{fundToDelete?.fund_name}</strong> ({fundToDelete?.fund_code})?
              This action cannot be undone. Funds with non-zero balance or journal entries cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => fundToDelete && deleteMutation.mutate(fundToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
