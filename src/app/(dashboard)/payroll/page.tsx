'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  Plus,
  RefreshCw,
  Eye,
  MoreHorizontal,
  Users,
  DollarSign,
  Calendar,
  CheckCircle,
  Play,
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
import { useOfficeOptional } from '@/contexts/OfficeContext'
import {
  getPayrollRuns,
  getPayrollRun,
  createPayrollRun,
  processPayroll,
  approvePayroll,
  getPayrollStatusLabel,
  getPayrollStatusColor,
  PayrollRun,
  PayrollRunFormData,
} from '@/lib/api/payroll'

export default function PayrollPage() {
  const officeContext = useOfficeOptional()
  const defaultOfficeId = officeContext?.officeId ?? 1

  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewingPayroll, setViewingPayroll] = useState<any>(null)

  const [formData, setFormData] = useState<PayrollRunFormData>({
    office_id: defaultOfficeId,
    period_start: '',
    period_end: '',
    pay_date: '',
    description: '',
  })

  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch payroll runs
  const { data: payrollData, isLoading, refetch } = useQuery({
    queryKey: ['payroll-runs', { page, status: filterStatus }],
    queryFn: () => getPayrollRuns({
      page,
      per_page: 25,
      status: filterStatus !== 'all' ? filterStatus : undefined,
    }),
  })

  const payrollRuns: PayrollRun[] = payrollData?.data || []
  const pagination = payrollData?.meta

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createPayrollRun,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] })
      setCreateDialogOpen(false)
      setFormData({ office_id: defaultOfficeId, period_start: '', period_end: '', pay_date: '', description: '' })
      toast({ title: 'Payroll Run Created', description: 'The payroll run has been created.' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to create payroll run', variant: 'destructive' })
    },
  })

  // Process mutation
  const processMutation = useMutation({
    mutationFn: processPayroll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] })
      toast({ title: 'Payroll Processed', description: 'The payroll has been processed.' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to process payroll', variant: 'destructive' })
    },
  })

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: approvePayroll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] })
      toast({ title: 'Payroll Approved', description: 'The payroll has been approved.' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to approve payroll', variant: 'destructive' })
    },
  })

  const handleView = async (payroll: PayrollRun) => {
    try {
      const response = await getPayrollRun(payroll.id)
      setViewingPayroll(response.data)
      setViewDialogOpen(true)
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load payroll details', variant: 'destructive' })
    }
  }

  // Stats
  const totalNet = payrollRuns.reduce((sum, p) => sum + p.total_net, 0)
  const totalEmployees = payrollRuns.reduce((sum, p) => sum + p.employee_count, 0)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Payroll Processing</h1>
          <p className="text-muted-foreground">
            Manage payroll runs and employee salary processing
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => refetch()}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Payroll Run
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pagination?.total || payrollRuns.length}</p>
              <p className="text-sm text-muted-foreground">Payroll Runs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalEmployees}</p>
              <p className="text-sm text-muted-foreground">Employees</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-emerald-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalNet)}</p>
              <p className="text-sm text-muted-foreground">Total Net Pay</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{payrollRuns.filter(p => p.status === 'approved').length}</p>
              <p className="text-sm text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payroll Runs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Runs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">Run Number</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Period</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Pay Date</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Employees</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Net Amount</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-12" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-8" /></td>
                    </tr>
                  ))}
                </>
              )}
              {!isLoading && payrollRuns.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No payroll runs found.
                  </td>
                </tr>
              )}
              {!isLoading && payrollRuns.map((payroll) => (
                <tr key={payroll.id} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-mono">{payroll.run_number}</td>
                  <td className="px-4 py-3 text-sm">
                    {formatDate(payroll.period_start)} - {formatDate(payroll.period_end)}
                  </td>
                  <td className="px-4 py-3 text-sm">{formatDate(payroll.pay_date)}</td>
                  <td className="px-4 py-3 text-center">{payroll.employee_count}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(payroll.total_net)}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={getPayrollStatusColor(payroll.status)}>
                      {getPayrollStatusLabel(payroll.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ActionMenu
                      triggerClassName="h-8 w-8"
                      items={[
                        { label: 'View Details', icon: <Eye className="h-4 w-4" />, onClick: () => handleView(payroll) },
                        ...(payroll.status === 'draft' ? [{ label: 'Process', icon: <Play className="h-4 w-4" />, onClick: () => processMutation.mutate(payroll.id) }] : []),
                        ...(payroll.status === 'processed' ? [{ label: 'Approve', icon: <CheckCircle className="h-4 w-4" />, onClick: () => approveMutation.mutate(payroll.id) }] : []),
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Create Payroll Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => { if (open !== createDialogOpen) setCreateDialogOpen(open) }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>New Payroll Run</DialogTitle>
            <DialogDescription>Create a new payroll run for a pay period</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label required>Period Start</Label>
                <DatePicker
                  value={formData.period_start}
                  onChange={(v) => setFormData({ ...formData, period_start: v })}
                  maxDate={formData.period_end || undefined}
                />
              </div>
              <div className="space-y-2">
                <Label required>Period End</Label>
                <DatePicker
                  value={formData.period_end}
                  onChange={(v) => setFormData({ ...formData, period_end: v })}
                  minDate={formData.period_start || undefined}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label required>Pay Date</Label>
              <DatePicker
                value={formData.pay_date}
                onChange={(v) => setFormData({ ...formData, pay_date: v })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="e.g., January 2024 Payroll"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={createMutation.isPending || !formData.period_start || !formData.period_end || !formData.pay_date}
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Payroll Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={(open) => { if (open !== viewDialogOpen) setViewDialogOpen(open) }}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Payroll Details</DialogTitle>
            <DialogDescription>{viewingPayroll?.payroll_run?.run_number}</DialogDescription>
          </DialogHeader>
          {viewingPayroll && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={getPayrollStatusColor(viewingPayroll.payroll_run.status)}>
                  {getPayrollStatusLabel(viewingPayroll.payroll_run.status)}
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Period</p>
                  <p className="font-medium">
                    {formatDate(viewingPayroll.payroll_run.period_start)} - {formatDate(viewingPayroll.payroll_run.period_end)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pay Date</p>
                  <p className="font-medium">{formatDate(viewingPayroll.payroll_run.pay_date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Employees</p>
                  <p className="font-medium">{viewingPayroll.payroll_run.employee_count}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Gross</p>
                  <p className="font-bold">{formatCurrency(viewingPayroll.payroll_run.total_gross)}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Deductions</p>
                  <p className="font-bold text-red-600">{formatCurrency(viewingPayroll.payroll_run.total_deductions)}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Net</p>
                  <p className="font-bold text-green-600">{formatCurrency(viewingPayroll.payroll_run.total_net)}</p>
                </div>
              </div>

              {viewingPayroll.items?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Employee Details</h4>
                  <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          <th className="px-3 py-2 text-left">Employee</th>
                          <th className="px-3 py-2 text-right">Gross</th>
                          <th className="px-3 py-2 text-right">Deductions</th>
                          <th className="px-3 py-2 text-right">Net</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingPayroll.items.map((item: any) => (
                          <tr key={item.id} className="border-b">
                            <td className="px-3 py-2">{item.employee_name || `Employee #${item.employee_id}`}</td>
                            <td className="px-3 py-2 text-right font-mono">{formatCurrency(item.gross_salary)}</td>
                            <td className="px-3 py-2 text-right font-mono text-red-600">{formatCurrency(item.total_deductions)}</td>
                            <td className="px-3 py-2 text-right font-mono text-green-600">{formatCurrency(item.net_salary)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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
