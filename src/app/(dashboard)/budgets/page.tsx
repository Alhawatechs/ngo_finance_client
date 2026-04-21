'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  Plus,
  RefreshCw,
  Eye,
  Search,
  Calculator,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Send,
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
  getBudgets,
  getBudget,
  submitBudget,
  approveBudget,
  getBudgetTypeLabel,
  getBudgetTypeColor,
  getBudgetStatusLabel,
  getBudgetStatusColor,
  Budget,
} from '@/lib/api/budgets'

export default function BudgetsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewingBudget, setViewingBudget] = useState<any>(null)

  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch budgets
  const { data: budgetsData, isLoading, refetch } = useQuery({
    queryKey: ['budgets', { page, status: filterStatus, type: filterType }],
    queryFn: () => getBudgets({
      page,
      per_page: 25,
      status: filterStatus !== 'all' ? filterStatus : undefined,
      budget_type: filterType !== 'all' ? filterType : undefined,
    }),
  })

  const budgets: Budget[] = budgetsData?.data || []
  const pagination = budgetsData?.meta

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: submitBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      queryClient.invalidateQueries({ queryKey: ['approval-center'] })
      toast({ title: 'Budget Submitted', description: 'Budget has been submitted for approval.' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to submit budget', variant: 'destructive' })
    },
  })

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: approveBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      queryClient.invalidateQueries({ queryKey: ['approval-center'] })
      toast({ title: 'Budget Approved', description: 'Budget has been approved.' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to approve budget', variant: 'destructive' })
    },
  })

  const handleView = async (budget: Budget) => {
    try {
      const response = await getBudget(budget.id)
      setViewingBudget(response.data)
      setViewDialogOpen(true)
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load budget details', variant: 'destructive' })
    }
  }

  // Stats
  const approvedBudgets = budgets.filter(b => b.status === 'approved')
  const totalBudgeted = approvedBudgets.reduce((sum, b) => sum + (b.total_budget ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Budget Planning</h1>
          <p className="text-muted-foreground">
            Create and manage organizational budgets with variance tracking
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => refetch()}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Budget
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calculator className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pagination?.total || budgets.length}</p>
              <p className="text-sm text-muted-foreground">Total Budgets</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{approvedBudgets.length}</p>
              <p className="text-sm text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-emerald-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalBudgeted)}</p>
              <p className="text-sm text-muted-foreground">Total Budgeted</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{budgets.filter(b => b.status === 'pending_approval').length}</p>
              <p className="text-sm text-muted-foreground">Pending Approval</p>
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
                placeholder="Search budgets..."
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
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_approval">Pending Approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="operational">Operational</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="departmental">Departmental</SelectItem>
                <SelectItem value="consolidated">Consolidated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Budgets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Budget List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">Budget Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Fiscal Year</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Total Budget</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-8" /></td>
                    </tr>
                  ))}
                </>
              )}
              {!isLoading && budgets.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No budgets found.
                  </td>
                </tr>
              )}
              {!isLoading && budgets.map((budget) => (
                <tr key={budget.id} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{budget.name}</p>
                      {budget.office && (
                        <p className="text-sm text-muted-foreground">{budget.office.name}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={getBudgetTypeColor(budget.budget_type)}>
                      {getBudgetTypeLabel(budget.budget_type)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {budget.fiscal_year?.name || '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {budget.currency} {formatCurrency(budget.total_budget ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={getBudgetStatusColor(budget.status)}>
                      {getBudgetStatusLabel(budget.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ActionMenu
                      triggerClassName="h-8 w-8"
                      items={[
                        { label: 'View Details', icon: <Eye className="h-4 w-4" />, onClick: () => handleView(budget) },
                        ...(budget.status === 'draft' ? [{ label: 'Submit for Approval', icon: <Send className="h-4 w-4" />, onClick: () => { if (budget.id != null) submitMutation.mutate(budget.id) } }] : []),
                        ...(budget.status === 'pending_approval' ? [{ label: 'Approve', icon: <CheckCircle className="h-4 w-4" />, onClick: () => { if (budget.id != null) approveMutation.mutate(budget.id) } }] : []),
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination && pagination.last_page > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {pagination.from} to {pagination.to} of {pagination.total} budgets
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

      {/* View Budget Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={(open) => { if (open !== viewDialogOpen) setViewDialogOpen(open) }}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Budget Details</DialogTitle>
            <DialogDescription>{viewingBudget?.budget?.name}</DialogDescription>
          </DialogHeader>
          {viewingBudget && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={getBudgetStatusColor(viewingBudget.budget.status)}>
                  {getBudgetStatusLabel(viewingBudget.budget.status)}
                </Badge>
                <Badge className={getBudgetTypeColor(viewingBudget.budget.budget_type)}>
                  {getBudgetTypeLabel(viewingBudget.budget.budget_type)}
                </Badge>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Total Budget</p>
                  <p className="font-bold">{formatCurrency(viewingBudget.summary.total_budget)}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Actual</p>
                  <p className="font-bold">{formatCurrency(viewingBudget.summary.total_actual)}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Variance</p>
                  <p className={cn("font-bold", viewingBudget.summary.total_variance >= 0 ? "text-green-600" : "text-red-600")}>
                    {formatCurrency(viewingBudget.summary.total_variance)}
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Utilization</p>
                  <p className="font-bold">{viewingBudget.summary.utilization_rate}%</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Budget Lines</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="px-3 py-2 text-left">Account</th>
                        <th className="px-3 py-2 text-right">Budgeted</th>
                        <th className="px-3 py-2 text-right">Actual</th>
                        <th className="px-3 py-2 text-right">Variance</th>
                        <th className="px-3 py-2 text-center">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingBudget.lines?.map((line: any) => (
                        <tr key={line.id} className="border-b">
                          <td className="px-3 py-2">
                            <p className="font-mono text-xs">{line.account?.account_code}</p>
                            <p>{line.description}</p>
                          </td>
                          <td className="px-3 py-2 text-right font-mono">{formatCurrency(line.annual_amount)}</td>
                          <td className="px-3 py-2 text-right font-mono">{formatCurrency(line.actual_amount)}</td>
                          <td className={cn("px-3 py-2 text-right font-mono", line.variance >= 0 ? "text-green-600" : "text-red-600")}>
                            {formatCurrency(line.variance)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <div className="w-16 mx-auto">
                              <Progress value={line.utilization} className="h-2" />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
