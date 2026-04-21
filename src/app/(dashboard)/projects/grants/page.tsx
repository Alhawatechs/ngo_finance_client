'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { CurrencySelect } from '@/components/ui/currency-select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  Plus,
  RefreshCw,
  Eye,
  Edit,
  Search,
  FileText,
  DollarSign,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Banknote,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import {
  getGrants,
  getGrant,
  createGrant,
  updateGrant,
  recordDisbursement,
  getGrantStatusLabel,
  getGrantStatusColor,
  getGrantTypeLabel,
  getGrantTypeColor,
  calculateUtilization,
  calculateDaysRemaining,
  Grant,
  GrantFormData,
} from '@/lib/api/projects'
import { getDonors, Donor } from '@/lib/api/donors'

export default function GrantsPage() {
  const searchParams = useSearchParams()
  const donorIdFromUrl = searchParams.get('donor_id')
  const grantIdFromUrl = searchParams.get('grant_id')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterDonorId, setFilterDonorId] = useState<string>('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (donorIdFromUrl && donorIdFromUrl !== filterDonorId) setFilterDonorId(donorIdFromUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when URL param changes
  }, [donorIdFromUrl])

  // Open grant view when grant_id is in URL (e.g. from donor inquiry link)
  useEffect(() => {
    if (!grantIdFromUrl) return
    const id = parseInt(grantIdFromUrl, 10)
    if (isNaN(id)) return
    getGrant(id)
      .then((res) => {
        setViewingGrant(res.data)
        setViewDialogOpen(true)
      })
      .catch(() => {
        toast({ title: 'Error', description: 'Grant not found', variant: 'destructive' })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when grant_id changes
  }, [grantIdFromUrl])
  const [grantDialogOpen, setGrantDialogOpen] = useState(false)
  const [editingGrant, setEditingGrant] = useState<Grant | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewingGrant, setViewingGrant] = useState<any>(null)
  const [disbursementDialogOpen, setDisbursementDialogOpen] = useState(false)
  const [selectedGrantForDisbursement, setSelectedGrantForDisbursement] = useState<Grant | null>(null)
  const [disbursementForm, setDisbursementForm] = useState({ amount: 0, disbursement_date: '', reference: '' })

  const [grantForm, setGrantForm] = useState<GrantFormData>({
    donor_id: 0,
    grant_code: '',
    grant_name: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    total_amount: 0,
    currency: 'USD',
    grant_type: 'restricted',
    reporting_frequency: 'Quarterly',
    contract_number: '',
  })

  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch grants
  const { data: grantsData, isLoading, refetch } = useQuery({
    queryKey: ['grants', { page, status: filterStatus, search: searchQuery, donor_id: filterDonorId }],
    queryFn: () => getGrants({
      page,
      per_page: 25,
      status: filterStatus !== 'all' ? filterStatus : undefined,
      search: searchQuery || undefined,
      donor_id: filterDonorId ? parseInt(filterDonorId, 10) : undefined,
    }),
  })

  // Fetch donors for filter dropdown (include inactive for filtering)
  const { data: donorsData } = useQuery({
    queryKey: ['donors-list'],
    queryFn: () => getDonors({ per_page: 200 }),
  })

  const grants: Grant[] = grantsData?.data || []
  const pagination = grantsData?.meta
  const donors: Donor[] = donorsData?.data || []

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createGrant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grants'] })
      setGrantDialogOpen(false)
      resetForm()
      toast({ title: 'Grant Created', description: 'The grant has been created successfully.' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to create grant', variant: 'destructive' })
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<GrantFormData & { status: string }> }) => updateGrant(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grants'] })
      setGrantDialogOpen(false)
      setEditingGrant(null)
      resetForm()
      toast({ title: 'Grant Updated', description: 'The grant has been updated successfully.' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to update grant', variant: 'destructive' })
    },
  })

  // Disbursement mutation
  const disbursementMutation = useMutation({
    mutationFn: ({ grantId, data }: { grantId: number; data: any }) => recordDisbursement(grantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grants'] })
      setDisbursementDialogOpen(false)
      setSelectedGrantForDisbursement(null)
      setDisbursementForm({ amount: 0, disbursement_date: '', reference: '' })
      toast({ title: 'Disbursement Recorded', description: 'The disbursement has been recorded successfully.' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to record disbursement', variant: 'destructive' })
    },
  })

  const resetForm = () => {
    setGrantForm({
      donor_id: 0,
      grant_code: '',
      grant_name: '',
      description: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      total_amount: 0,
      currency: 'USD',
      grant_type: 'restricted',
      reporting_frequency: 'Quarterly',
      contract_number: '',
    })
  }

  const handleEdit = (grant: Grant) => {
    setEditingGrant(grant)
    setGrantForm({
      donor_id: grant.donor_id,
      grant_code: grant.grant_code,
      grant_name: grant.grant_name,
      description: grant.description || '',
      start_date: grant.start_date,
      end_date: grant.end_date,
      total_amount: grant.total_amount,
      currency: grant.currency,
      grant_type: grant.grant_type,
      reporting_frequency: grant.reporting_frequency || 'Quarterly',
      contract_number: grant.contract_number || '',
    })
    setGrantDialogOpen(true)
  }

  const handleView = async (grant: Grant) => {
    try {
      const response = await getGrant(grant.id)
      setViewingGrant(response.data)
      setViewDialogOpen(true)
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load grant details', variant: 'destructive' })
    }
  }

  const handleSave = () => {
    if (editingGrant) {
      updateMutation.mutate({ id: editingGrant.id, data: grantForm })
    } else {
      createMutation.mutate(grantForm)
    }
  }

  const handleRecordDisbursement = (grant: Grant) => {
    setSelectedGrantForDisbursement(grant)
    setDisbursementForm({ amount: 0, disbursement_date: new Date().toISOString().split('T')[0], reference: '' })
    setDisbursementDialogOpen(true)
  }

  // Stats
  const activeCount = grants.filter(g => g.status === 'active').length
  const totalAmount = grants.reduce((sum, g) => sum + g.total_amount, 0)
  const totalDisbursed = grants.reduce((sum, g) => sum + (g.disbursed_amount ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Grants</h1>
          <p className="text-muted-foreground">
            Manage donor grants and track disbursements
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => refetch()}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => { setEditingGrant(null); resetForm(); setGrantDialogOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            New Grant
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pagination?.total || grants.length}</p>
              <p className="text-sm text-muted-foreground">Total Grants</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-emerald-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
              <p className="text-sm text-muted-foreground">Total Value</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <Banknote className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalDisbursed)}</p>
              <p className="text-sm text-muted-foreground">Disbursed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search grants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterDonorId || 'all'} onValueChange={(v) => setFilterDonorId(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Donor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Donors</SelectItem>
                {donors.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Grants Table */}
      <Card>
        <CardHeader>
          <CardTitle>Grant List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50 uppercase tracking-wider">
                <th className="px-4 py-3 text-left text-sm font-medium">Grant</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Donor</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Period</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Amount</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Utilization</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-8" /></td>
                    </tr>
                  ))}
                </>
              )}
              {!isLoading && grants.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No grants found.
                    <Button variant="link" onClick={() => { setEditingGrant(null); resetForm(); setGrantDialogOpen(true) }} className="ml-2">
                      Create your first grant
                    </Button>
                  </td>
                </tr>
              )}
              {!isLoading && grants.map((grant) => {
                const utilization = calculateUtilization(grant.spent_amount ?? 0, grant.total_amount ?? 0)
                const daysRemaining = calculateDaysRemaining(grant.end_date)
                
                return (
                  <tr key={grant.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">{grant.grant_code}</p>
                        <p className="font-medium">{grant.grant_name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {grant.donor?.short_name || grant.donor?.name || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getGrantTypeColor(grant.grant_type ?? '')}>
                        {getGrantTypeLabel(grant.grant_type ?? '')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {formatDate(grant.start_date ?? '')} - {formatDate(grant.end_date ?? '')}
                      </div>
                      {daysRemaining > 0 && daysRemaining <= 90 && (
                        <span className="text-xs text-orange-600">{daysRemaining} days remaining</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {grant.currency} {formatCurrency(grant.total_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-24 mx-auto">
                        <Progress value={utilization} className="h-2" />
                        <p className="text-xs text-center mt-1">{utilization}%</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={getGrantStatusColor(grant.status ?? '')}>
                        {getGrantStatusLabel(grant.status ?? '')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ActionMenu
                        triggerClassName="h-8 w-8"
                        items={[
                          { label: 'View Details', icon: <Eye className="h-4 w-4" />, onClick: () => handleView(grant) },
                          { label: 'Edit', icon: <Edit className="h-4 w-4" />, onClick: () => handleEdit(grant) },
                          { label: 'Record Disbursement', icon: <Banknote className="h-4 w-4" />, onClick: () => handleRecordDisbursement(grant) },
                        ]}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination && pagination.last_page > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {pagination.from} to {pagination.to} of {pagination.total} grants
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  Previous
                </Button>
                <Button variant="secondary" size="sm" disabled={page === pagination.last_page} onClick={() => setPage(p => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grant Form Dialog */}
      <Dialog open={grantDialogOpen} onOpenChange={(open) => { if (open !== grantDialogOpen) setGrantDialogOpen(open) }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGrant ? 'Edit Grant' : 'New Grant'}</DialogTitle>
            <DialogDescription>
              {editingGrant ? 'Update grant information' : 'Create a new grant from a donor'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label required>Donor</Label>
                <Select
                  value={grantForm.donor_id?.toString() || ''}
                  onValueChange={(v) => setGrantForm({ ...grantForm, donor_id: parseInt(v) })}
                  disabled={!!editingGrant}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select donor" />
                  </SelectTrigger>
                  <SelectContent>
                    {donors.map((donor) => (
                      <SelectItem key={donor.id} value={donor.id.toString()}>
                        {donor.code} - {donor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label required>Grant Code</Label>
                <Input
                  placeholder="GRT-2024-001"
                  value={grantForm.grant_code}
                  onChange={(e) => setGrantForm({ ...grantForm, grant_code: e.target.value.toUpperCase() })}
                  disabled={!!editingGrant}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label required>Grant Name</Label>
              <Input
                placeholder="Grant name"
                value={grantForm.grant_name}
                onChange={(e) => setGrantForm({ ...grantForm, grant_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label required>Grant Type</Label>
                <Select
                  value={grantForm.grant_type}
                  onValueChange={(v) => setGrantForm({ ...grantForm, grant_type: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restricted">Restricted</SelectItem>
                    <SelectItem value="unrestricted">Unrestricted</SelectItem>
                    <SelectItem value="temporarily_restricted">Temporarily Restricted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Contract Number</Label>
                <Input
                  placeholder="Contract reference"
                  value={grantForm.contract_number || ''}
                  onChange={(e) => setGrantForm({ ...grantForm, contract_number: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label required>Start Date</Label>
                <DatePicker
                  value={grantForm.start_date}
                  onChange={(v) => setGrantForm({ ...grantForm, start_date: v })}
                  maxDate={grantForm.end_date || undefined}
                />
              </div>
              <div className="space-y-2">
                <Label required>End Date</Label>
                <DatePicker
                  value={grantForm.end_date}
                  onChange={(v) => setGrantForm({ ...grantForm, end_date: v })}
                  minDate={grantForm.start_date || undefined}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label required>Total Amount</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={grantForm.total_amount || ''}
                  onChange={(e) => setGrantForm({ ...grantForm, total_amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label required>Currency</Label>
                <CurrencySelect value={grantForm.currency || ''} onChange={(v) => setGrantForm({ ...grantForm, currency: v || 'USD' })} placeholder="Select currency" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reporting Frequency</Label>
              <Select
                value={grantForm.reporting_frequency || 'Quarterly'}
                onValueChange={(v) => setGrantForm({ ...grantForm, reporting_frequency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                  <SelectItem value="Semi-annually">Semi-annually</SelectItem>
                  <SelectItem value="Annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Grant description..."
                value={grantForm.description || ''}
                onChange={(e) => setGrantForm({ ...grantForm, description: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setGrantDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending || !grantForm.grant_name || !grantForm.donor_id}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Grant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disbursement Dialog */}
      <Dialog open={disbursementDialogOpen} onOpenChange={(open) => { if (open !== disbursementDialogOpen) setDisbursementDialogOpen(open) }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Record Disbursement</DialogTitle>
            <DialogDescription>
              Record a fund disbursement for {selectedGrantForDisbursement?.grant_code}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label required>Amount</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={disbursementForm.amount || ''}
                onChange={(e) => setDisbursementForm({ ...disbursementForm, amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label required>Date</Label>
              <DatePicker
                value={disbursementForm.disbursement_date}
                onChange={(v) => setDisbursementForm({ ...disbursementForm, disbursement_date: v })}
              />
            </div>
            <div className="space-y-2">
              <Label>Reference</Label>
              <Input
                placeholder="Bank reference or check number"
                value={disbursementForm.reference}
                onChange={(e) => setDisbursementForm({ ...disbursementForm, reference: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDisbursementDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedGrantForDisbursement && disbursementMutation.mutate({ grantId: selectedGrantForDisbursement.id, data: disbursementForm })}
              disabled={disbursementMutation.isPending || !disbursementForm.amount || !disbursementForm.disbursement_date}
            >
              {disbursementMutation.isPending ? 'Recording...' : 'Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Grant Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={(open) => { if (open !== viewDialogOpen) setViewDialogOpen(open) }}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Grant Details</DialogTitle>
            <DialogDescription>{viewingGrant?.grant?.grant_code}</DialogDescription>
          </DialogHeader>
          {viewingGrant && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{viewingGrant.grant.grant_name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getGrantStatusColor(viewingGrant.grant.status)}>
                    {getGrantStatusLabel(viewingGrant.grant.status)}
                  </Badge>
                  <Badge className={getGrantTypeColor(viewingGrant.grant.grant_type)}>
                    {getGrantTypeLabel(viewingGrant.grant.grant_type)}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Donor</p>
                  <p className="font-medium">{viewingGrant.grant.donor?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Contract Number</p>
                  <p className="font-medium">{viewingGrant.grant.contract_number || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Start Date</p>
                  <p className="font-medium">{formatDate(viewingGrant.grant.start_date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">End Date</p>
                  <p className="font-medium">{formatDate(viewingGrant.grant.end_date)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Budget Utilization</span>
                  <span className="font-medium">{viewingGrant.utilization_rate}%</span>
                </div>
                <Progress value={viewingGrant.utilization_rate} className="h-3" />
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-bold">{formatCurrency(viewingGrant.grant.total_amount)}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Disbursed</p>
                  <p className="font-bold">{formatCurrency(viewingGrant.grant.disbursed_amount)}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Spent</p>
                  <p className="font-bold">{formatCurrency(viewingGrant.grant.spent_amount)}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Available</p>
                  <p className="font-bold text-green-600">{formatCurrency(viewingGrant.available_amount)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Projects: {viewingGrant.projects_count}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
