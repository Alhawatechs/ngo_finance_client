'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  Plus,
  Search,
  Download,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  FileText,
  Clock,
  AlertTriangle,
  User,
  DollarSign,
  Wallet,
  ArrowRightLeft,
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { Voucher } from '@/types'
import {
  getVouchers,
  getVoucher,
  deleteVoucher,
  submitVoucher,
  approveVoucher,
  rejectVoucher,
  getVoucherStatusColor,
  getVoucherTypeLabel,
  getVoucherTypeCode,
  getPaymentMethodLabel,
  APPROVAL_LEVELS,
} from '@/lib/api/vouchers'
import { getVoucherStepApprovalEligibility } from '@/lib/voucher-approval'
import { useAuthStore } from '@/stores/authStore'
import { getProjects } from '@/lib/api/projects'
import {
  FinancePageHeader,
  FinanceModuleCard,
  FinanceModuleLinks,
  FinanceFilterBar,
  FinanceEmptyState,
  FinancePagination,
} from '@/components/finance'
import { VoucherApprovalWorkflow } from '@/components/vouchers/VoucherApprovalWorkflow'

// Mock offices data
const mockOffices = [
  { id: 1, name: 'Kabul Head Office', code: 'KBL' },
  { id: 2, name: 'Mazar-i-Sharif Office', code: 'MZR' },
  { id: 3, name: 'Herat Office', code: 'HRT' },
  { id: 4, name: 'Kandahar Office', code: 'KDH' },
]

const voucherTypeIcons: Record<string, React.ReactNode> = {
  payment: <Wallet className="h-4 w-4" />,
  receipt: <DollarSign className="h-4 w-4" />,
  journal: <FileText className="h-4 w-4" />,
  contra: <ArrowRightLeft className="h-4 w-4" />,
}

function VouchersPageContent() {
  const authUser = useAuthStore((s) => s.user)
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectIdFromUrl = searchParams.get('project_id')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterProjectId, setFilterProjectId] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewingVoucher, setViewingVoucher] = useState<Voucher | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [voucherToDelete, setVoucherToDelete] = useState<Voucher | null>(null)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [voucherToApprove, setVoucherToApprove] = useState<Voucher | null>(null)
  const [approvalComments, setApprovalComments] = useState('')
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [voucherToReject, setVoucherToReject] = useState<Voucher | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  // Sync project_id from URL once (e.g. from Projects page link). Use primitive deps to avoid update loop.
  useEffect(() => {
    if (projectIdFromUrl && projectIdFromUrl !== filterProjectId) setFilterProjectId(projectIdFromUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when URL param changes
  }, [projectIdFromUrl])

  const { toast } = useToast()
  const queryClient = useQueryClient()

  const projectIdNum = filterProjectId === 'all' ? undefined : Number(filterProjectId)
  const { data: projectsData } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => getProjects({ per_page: 200, status: 'active' }),
    staleTime: 10 * 60 * 1000,
  })
  const projects = projectsData?.data ?? []

  // Fetch vouchers
  const { data: vouchersData, isLoading, error, refetch } = useQuery({
    queryKey: ['vouchers', { page, status: filterStatus, type: filterType, project_id: projectIdNum, search: searchQuery }],
    queryFn: () => getVouchers({
      page,
      per_page: 15,
      status: filterStatus !== 'all' ? filterStatus : undefined,
      voucher_type: filterType !== 'all' ? filterType : undefined,
      project_id: projectIdNum,
      search: searchQuery || undefined,
    }),
  })

  const vouchers = vouchersData?.data || []
  const pagination = vouchersData?.meta

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteVoucher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vouchers'] })
      setDeleteDialogOpen(false)
      setVoucherToDelete(null)
      toast({
        title: 'Voucher Deleted',
        description: 'The voucher has been deleted.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete voucher',
        variant: 'destructive',
      })
    },
  })

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: submitVoucher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vouchers'] })
      queryClient.invalidateQueries({ queryKey: ['approval-center'] })
      toast({
        title: 'Voucher Submitted',
        description: 'The voucher has been submitted for approval.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to submit voucher',
        variant: 'destructive',
      })
    },
  })

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: ({ id, comments }: { id: number; comments?: string }) =>
      approveVoucher(id, { comments }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vouchers'] })
      queryClient.invalidateQueries({ queryKey: ['approval-center'] })
      queryClient.invalidateQueries({ queryKey: ['project-ledger'] })
      setApproveDialogOpen(false)
      setVoucherToApprove(null)
      setApprovalComments('')
      toast({
        title: 'Voucher Approved',
        description: 'The voucher has been approved.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to approve voucher',
        variant: 'destructive',
      })
    },
  })

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      rejectVoucher(id, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vouchers'] })
      queryClient.invalidateQueries({ queryKey: ['approval-center'] })
      setRejectDialogOpen(false)
      setVoucherToReject(null)
      setRejectionReason('')
      toast({
        title: 'Voucher Rejected',
        description: 'The voucher has been rejected.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to reject voucher',
        variant: 'destructive',
      })
    },
  })

  // Handlers
  const handleAddVoucher = () => {
    router.push('/vouchers/new')
  }

  const handleEditVoucher = (voucher: Voucher) => {
    router.push(`/vouchers/${voucher.id}/edit`)
  }

  const handleViewVoucher = async (voucher: Voucher) => {
    try {
      const response = await getVoucher(voucher.id)
      setViewingVoucher((response as { data: Voucher }).data)
      setViewDialogOpen(true)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load voucher details',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteVoucher = (voucher: Voucher) => {
    setVoucherToDelete(voucher)
    setDeleteDialogOpen(true)
  }

  const handleSubmitVoucher = (voucher: Voucher) => {
    submitMutation.mutate(voucher.id)
  }

  const handleApproveVoucher = (voucher: Voucher) => {
    setVoucherToApprove(voucher)
    setApproveDialogOpen(true)
  }

  const handleRejectVoucher = (voucher: Voucher) => {
    setVoucherToReject(voucher)
    setRejectDialogOpen(true)
  }

  const confirmApprove = () => {
    if (voucherToApprove) {
      approveMutation.mutate({ id: voucherToApprove.id, comments: approvalComments || undefined })
    }
  }

  const confirmReject = () => {
    if (voucherToReject && rejectionReason) {
      rejectMutation.mutate({ id: voucherToReject.id, reason: rejectionReason })
    }
  }

  const getPendingApprovalMenuItems = (voucher: Voucher) => {
    const e = getVoucherStepApprovalEligibility(authUser, voucher)
    const reason = e.blockReasons.join(' ')
    return [
      {
        label: 'Approve',
        icon: <CheckCircle className="h-4 w-4" />,
        onClick: () => handleApproveVoucher(voucher),
        disabled: !e.canAct,
        disabledReason: e.canAct ? undefined : reason,
      },
      {
        label: 'Reject',
        icon: <XCircle className="h-4 w-4" />,
        onClick: () => handleRejectVoucher(voucher),
        disabled: !e.canAct,
        disabledReason: e.canAct ? undefined : reason,
      },
    ]
  }

  // Stats
  const stats = {
    total: vouchers.length,
    draft: vouchers.filter((v: Voucher) => v.status === 'draft').length,
    pending: vouchers.filter((v: Voucher) => v.status === 'pending_approval').length,
    approved: vouchers.filter((v: Voucher) => v.status === 'approved' || v.status === 'posted').length,
    rejected: vouchers.filter((v: Voucher) => v.status === 'rejected').length,
  }

  const approveEligibility = voucherToApprove
    ? getVoucherStepApprovalEligibility(authUser, voucherToApprove)
    : null
  const rejectEligibility = voucherToReject
    ? getVoucherStepApprovalEligibility(authUser, voucherToReject)
    : null

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-4">Failed to load vouchers</p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Vouchers"
        description="NGO transaction vouchers with layered finance approval (L1–L4 by amount); the GL is updated after final approval when periods allow."
        actions={
          <>
            <Button variant="secondary" onClick={() => refetch()}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="secondary">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={handleAddVoucher}>
              <Plus className="h-4 w-4 mr-2" />
              New transaction voucher
            </Button>
          </>
        }
      />
      <FinanceModuleLinks variant="inline" />

      {/* Summary Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pagination?.total || stats.total}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.draft}</p>
              <p className="text-sm text-muted-foreground">Draft</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Pending Approval</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.approved}</p>
              <p className="text-sm text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.rejected}</p>
              <p className="text-sm text-muted-foreground">Rejected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <FinanceModuleCard
        title="Voucher list"
        subtitle="View and manage transaction vouchers. Filter by status or type."
        icon={<FileText className="h-5 w-5" />}
      >
        <FinanceFilterBar
          searchPlaceholder="Search vouchers..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={refetch}
          isRefreshing={isLoading}
        >
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="pending_approval">Pending Approval</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="posted">Posted</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="payment">Payment Voucher</SelectItem>
              <SelectItem value="receipt">Receipt Voucher</SelectItem>
              <SelectItem value="journal">Journal Voucher</SelectItem>
              <SelectItem value="contra">Contra Voucher</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterProjectId} onValueChange={(v) => { setFilterProjectId(v); setPage(1); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((p: { id: number; project_code: string; project_name: string }) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.project_name || p.project_code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FinanceFilterBar>

        <div className="border rounded-md overflow-hidden">
          {!isLoading && vouchers.length === 0 ? (
            <FinanceEmptyState
              icon={FileText}
              title="No vouchers found"
              description="Create your first transaction voucher to record programme expenditure."
              action={
                <Button onClick={handleAddVoucher}>
                  New transaction voucher
                </Button>
              }
            />
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">Voucher #</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Payee/Description</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Amount</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">Approval</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <>
                    {[...Array(5)].map((_, i) => (
                      <tr key={i} className="border-b">
                        <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-8" /></td>
                      </tr>
                    ))}
                  </>
                )}
                {!isLoading && vouchers.map((voucher: Voucher) => (
                  <tr key={voucher.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm">{voucher.voucher_number}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {formatDate(voucher.voucher_date)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        {voucherTypeIcons[voucher.voucher_type]}
                        {getVoucherTypeCode(voucher.voucher_type)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate">
                      <div>
                        {voucher.payee_name && (
                          <span className="font-medium">{voucher.payee_name}</span>
                        )}
                        <p className="text-muted-foreground truncate">
                          {voucher.description}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {voucher.currency} {formatCurrency(voucher.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={cn("text-xs", getVoucherStatusColor(voucher.status))}>
                        {voucher.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {[1, 2, 3, 4].slice(0, voucher.required_approval_level || 4).map((level) => {
                          const isApproved = level <= (voucher.current_approval_level || 0)
                          return (
                            <div
                              key={level}
                              className={cn(
                                "h-2 w-2 rounded-full",
                                isApproved ? "bg-green-500" : "bg-gray-200"
                              )}
                              title={
                                APPROVAL_LEVELS.find((l) => l.level === level)?.name ?? `Level ${level}`
                              }
                            />
                          )
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ActionMenu
                        triggerClassName="h-8 w-8"
                        menuWidth={200}
                        items={[
                          { label: 'View Details', icon: <Eye className="h-4 w-4" />, onClick: () => handleViewVoucher(voucher) },
                          ...(voucher.status === 'draft'
                            ? [
                                { label: 'Edit', icon: <Edit className="h-4 w-4" />, onClick: () => handleEditVoucher(voucher) },
                                { label: 'Submit for Approval', icon: <Send className="h-4 w-4" />, onClick: () => handleSubmitVoucher(voucher) },
                                { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: () => handleDeleteVoucher(voucher) },
                              ]
                            : []),
                          ...(voucher.status === 'pending_approval' ? getPendingApprovalMenuItems(voucher) : []),
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}

          {pagination && pagination.last_page > 1 && (
            <FinancePagination
              from={pagination.from}
              to={pagination.to}
              total={pagination.total}
              label="vouchers"
              onPrevious={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(pagination.last_page, p + 1))}
              previousDisabled={page <= 1}
              nextDisabled={page >= pagination.last_page}
            />
          )}
        </div>
      </FinanceModuleCard>

      {/* View Voucher Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={(open) => { if (open !== viewDialogOpen) setViewDialogOpen(open) }}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Voucher Details</DialogTitle>
            <DialogDescription>
              {viewingVoucher?.voucher_number}
            </DialogDescription>
          </DialogHeader>
          {viewingVoucher && (
            <div className="space-y-4">
              {/* Approval Workflow */}
              <Card>
                <CardContent className="p-4">
                  <VoucherApprovalWorkflow voucher={viewingVoucher} />
                </CardContent>
              </Card>

              {/* Voucher Details */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">{formatDate(viewingVoucher.voucher_date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium">{getVoucherTypeLabel(viewingVoucher.voucher_type)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge className={getVoucherStatusColor(viewingVoucher.status)}>
                    {viewingVoucher.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Office</p>
                  <p className="font-medium">{viewingVoucher.office?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Currency</p>
                  <p className="font-medium">{viewingVoucher.currency}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payment Method</p>
                  <p className="font-medium">
                    {viewingVoucher.payment_method 
                      ? getPaymentMethodLabel(viewingVoucher.payment_method) 
                      : '-'}
                  </p>
                </div>
                {viewingVoucher.payee_name && (
                  <div>
                    <p className="text-muted-foreground">Payee</p>
                    <p className="font-medium">{viewingVoucher.payee_name}</p>
                  </div>
                )}
              </div>
              
              <div>
                <p className="text-muted-foreground text-sm">Description</p>
                <p className="text-sm">{viewingVoucher.description}</p>
              </div>

              {/* Voucher Lines */}
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-2 text-left">Account</th>
                        <th className="px-4 py-2 text-left">Description</th>
                        <th className="px-4 py-2 text-right">Debit</th>
                        <th className="px-4 py-2 text-right">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingVoucher.lines?.map((line) => (
                        <tr key={line.id} className="border-b">
                          <td className="px-4 py-2">
                            <span className="font-mono text-xs mr-2">{line.account?.account_code}</span>
                            {line.account?.account_name}
                          </td>
                          <td className="px-4 py-2">{line.description || '-'}</td>
                          <td className="px-4 py-2 text-right font-mono">
                            {(line.debit_amount ?? 0) !== 0 ? formatCurrency(line.debit_amount) : '-'}
                          </td>
                          <td className="px-4 py-2 text-right font-mono">
                            {(line.credit_amount ?? 0) !== 0 ? formatCurrency(line.credit_amount) : '-'}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-muted/50 font-medium">
                        <td colSpan={2} className="px-4 py-2 text-right">Total</td>
                        <td className="px-4 py-2 text-right font-mono">{formatCurrency(viewingVoucher.total_amount)}</td>
                        <td className="px-4 py-2 text-right font-mono">{formatCurrency(viewingVoucher.total_amount)}</td>
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Created By */}
              <div className="text-sm">
                <p className="text-muted-foreground">Created By</p>
                <p className="font-medium">{viewingVoucher.creator?.name || '-'}</p>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (open !== deleteDialogOpen) setDeleteDialogOpen(open) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Voucher</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete voucher{' '}
              <strong>{voucherToDelete?.voucher_number}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => voucherToDelete && deleteMutation.mutate(voucherToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={(open) => { if (open !== approveDialogOpen) setApproveDialogOpen(open) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Voucher</DialogTitle>
            <DialogDescription>
              Approve voucher {voucherToApprove?.voucher_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {approveEligibility && voucherToApprove ? (
              <>
                <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Next signature required
                  </p>
                  <p className="font-medium text-foreground">{approveEligibility.nextTitle}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Progress: {voucherToApprove.current_approval_level ?? 0} of{' '}
                    {voucherToApprove.required_approval_level ?? 1} layer(s). Base (policy) amount:{' '}
                    {formatCurrency(voucherToApprove.base_currency_amount ?? 0, 'USD')}
                  </p>
                </div>
                {!approveEligibility.canAct && (
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
                    <p className="flex items-center gap-2 font-medium">
                      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                      You cannot sign this step with your current user
                    </p>
                    <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs">
                      {approveEligibility.blockReasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : null}
            <div className="p-4 bg-muted rounded-lg text-sm">
              <p><strong>Amount:</strong> {voucherToApprove?.currency} {formatCurrency(voucherToApprove?.total_amount || 0)}</p>
              <p><strong>Description:</strong> {voucherToApprove?.description}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="approval_comments">Comments (Optional)</Label>
              <Textarea
                id="approval_comments"
                placeholder="Add any comments for this approval..."
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmApprove}
              disabled={approveMutation.isPending || !approveEligibility?.canAct}
            >
              {approveMutation.isPending ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={(open) => { if (open !== rejectDialogOpen) setRejectDialogOpen(open) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Voucher</DialogTitle>
            <DialogDescription>
              Reject voucher {voucherToReject?.voucher_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {rejectEligibility && voucherToReject ? (
              <>
                <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Signing as (next step)
                  </p>
                  <p className="font-medium text-foreground">{rejectEligibility.nextTitle}</p>
                </div>
                {!rejectEligibility.canAct && (
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
                    <p className="flex items-center gap-2 font-medium">
                      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                      You cannot reject at this step with your current user
                    </p>
                    <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs">
                      {rejectEligibility.blockReasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : null}
            <div className="p-4 bg-muted rounded-lg text-sm">
              <p><strong>Amount:</strong> {voucherToReject?.currency} {formatCurrency(voucherToReject?.total_amount || 0)}</p>
              <p><strong>Description:</strong> {voucherToReject?.description}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rejection_reason" required>Reason for Rejection</Label>
              <Textarea
                id="rejection_reason"
                placeholder="Please provide a reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={rejectMutation.isPending || !rejectionReason || !rejectEligibility?.canAct}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function VouchersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <VouchersPageContent />
    </Suspense>
  )
}
