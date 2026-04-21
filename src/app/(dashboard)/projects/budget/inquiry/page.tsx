'use client'

import React, { useState, Suspense } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Search, Wallet, ArrowLeft, Send, Check, Pencil, Copy, Download } from 'lucide-react'
import Link from 'next/link'
import {
  getBudgets,
  getBudget,
  submitBudget,
  approveBudget,
  reviseBudget,
  Budget,
  BudgetLine,
  getBudgetTypeLabel,
  getBudgetTypeColor,
  getBudgetStatusLabel,
  getBudgetStatusColor,
  exportBudgetToExcel,
} from '@/lib/api/budgets'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectsPageHeader } from '@/components/projects/PageHeader'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'

function BudgetInquiryPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const viewId = searchParams.get('id') ? parseInt(searchParams.get('id')!, 10) : null
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [revising, setRevising] = useState(false)
  const [exporting, setExporting] = useState(false)
  const { toast } = useToast()

  const handleExport = async () => {
    if (!viewId) return
    setExporting(true)
    try {
      const fmt = (budget as Budget & { budget_format_template?: { code?: string } })?.budget_format_template?.code === 'unicef_her' ? 'unicef_her' : 'unfpa_who'
      await exportBudgetToExcel(viewId, fmt)
      toast({ title: 'Exported', description: 'Budget exported to Excel.' })
    } catch {
      toast({ title: 'Export failed', description: 'Could not export budget.', variant: 'destructive' })
    } finally {
      setExporting(false)
    }
  }
  const queryClient = useQueryClient()

  const handleCreateRevision = async () => {
    if (!viewId) return
    setRevising(true)
    try {
      const revised = await reviseBudget(viewId)
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      queryClient.invalidateQueries({ queryKey: ['budgets-inquiry'] })
      toast({ title: 'Revision created', description: 'A new draft budget has been created.' })
      router.push(`/projects/budget/edit/${(revised as Budget).id}`)
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err && (err as { response?: { data?: { message?: string } } }).response?.data?.message
        ? (err as { response: { data: { message: string } } }).response.data.message
        : 'Failed to create revision.'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally {
      setRevising(false)
    }
  }

  const submitMutation = useMutation({
    mutationFn: (id: number) => submitBudget(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['budget', id] })
      queryClient.invalidateQueries({ queryKey: ['budgets-inquiry'] })
      queryClient.invalidateQueries({ queryKey: ['approval-center'] })
      toast({ title: 'Submitted', description: 'Budget submitted for approval.' })
    },
    onError: (err: unknown) => {
      const msg = err && typeof err === 'object' && 'response' in err && (err as { response?: { data?: { message?: string } } }).response?.data?.message
        ? (err as { response: { data: { message: string } } }).response.data.message
        : 'Failed to submit budget.'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    },
  })

  const approveMutation = useMutation({
    mutationFn: (id: number) => approveBudget(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['budget', id] })
      queryClient.invalidateQueries({ queryKey: ['budgets-inquiry'] })
      queryClient.invalidateQueries({ queryKey: ['approval-center'] })
      toast({ title: 'Approved', description: 'Budget approved successfully.' })
    },
    onError: (err: unknown) => {
      const msg = err && typeof err === 'object' && 'response' in err && (err as { response?: { data?: { message?: string } } }).response?.data?.message
        ? (err as { response: { data: { message: string } } }).response.data.message
        : 'Failed to approve budget.'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    },
  })

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['budgets-inquiry', searchQuery, statusFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { per_page: 50 }
      if (statusFilter !== 'all') params.status = statusFilter
      return getBudgets(params)
    },
  })

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['budget', viewId],
    queryFn: () => getBudget(viewId!),
    enabled: !!viewId,
  })

  const budgets = (listData?.data ?? []) as Budget[]
  const filtered = searchQuery.trim()
    ? budgets.filter(
        (b) =>
          b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (b.project?.project_code?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      )
    : budgets

  const budgetDetail = viewId && detailData?.data ? detailData.data as { budget?: Budget; lines?: BudgetLine[]; summary?: { total_budget: number; total_actual: number; total_variance: number; utilization_rate: number } } : null
  const budget = budgetDetail?.budget ?? (viewId && detailData?.data ? (detailData.data as Budget) : null)
  const lines = budgetDetail && 'lines' in budgetDetail ? (budgetDetail.lines ?? []) as BudgetLine[] : []
  const summary = budgetDetail && 'summary' in budgetDetail ? budgetDetail.summary : null

  if (viewId && (detailLoading || budget)) {
    return (
      <div className="space-y-6">
        <ProjectsPageHeader
          title={budget ? budget.name : 'Budget details'}
          description={budget ? `${getBudgetTypeLabel(budget.budget_type)} • ${getBudgetStatusLabel(budget.status)}` : 'Loading...'}
          breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: 'Budget', href: '/projects/budget' }, { label: budget ? 'Details' : '...' }]}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/projects/budget">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to register
                </Link>
              </Button>
              {budget?.status === 'draft' && (
                <Button
                  size="sm"
                  onClick={() => submitMutation.mutate(viewId)}
                  disabled={submitMutation.isPending}
                >
                  <Send className="h-4 w-4 mr-1" />
                  {submitMutation.isPending ? 'Submitting...' : 'Submit for approval'}
                </Button>
              )}
              {budget?.status === 'pending_approval' && (
                <Button
                  size="sm"
                  onClick={() => approveMutation.mutate(viewId)}
                  disabled={approveMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-1" />
                  {approveMutation.isPending ? 'Approving...' : 'Approve'}
                </Button>
              )}
              {budget?.status === 'draft' && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/projects/budget/edit/${viewId}`}>
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Link>
                </Button>
              )}
              {budget?.status === 'approved' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreateRevision}
                  disabled={revising}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  {revising ? 'Creating...' : 'Create revision'}
                </Button>
              )}
              {budget && (
                <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
                  <Download className="h-4 w-4 mr-1" />
                  {exporting ? 'Exporting...' : 'Export Excel'}
                </Button>
              )}
            </div>
          }
        />
        {detailLoading ? (
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ) : budget ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  {budget.name}
                </CardTitle>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary" className={getBudgetStatusColor(budget.status)}>
                    {getBudgetStatusLabel(budget.status)}
                  </Badge>
                  <Badge variant="outline">{getBudgetTypeLabel(budget.budget_type)}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-muted-foreground">Fiscal year</Label>
                    <p className="font-medium">
                      {typeof budget.fiscal_year === 'object' && budget.fiscal_year?.name
                        ? budget.fiscal_year.name
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Office</Label>
                    <p className="font-medium">{budget.office?.name ?? '—'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Project</Label>
                    <p className="font-medium">{budget.project?.project_name ?? budget.project?.project_code ?? '—'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Currency</Label>
                    <p className="font-medium">{budget.currency}</p>
                  </div>
                </div>
                {summary && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/50">
                    <div>
                      <Label className="text-muted-foreground text-xs">Total budgeted</Label>
                      <p className="font-semibold">{formatCurrency(summary.total_budget ?? 0, budget.currency)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Total actual</Label>
                      <p className="font-semibold">{formatCurrency(summary.total_actual ?? 0, budget.currency)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Variance</Label>
                      <p className="font-semibold">{formatCurrency(summary.total_variance ?? 0, budget.currency)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Utilization</Label>
                      <p className="font-semibold">{Number(summary.utilization_rate ?? 0).toFixed(1)}%</p>
                    </div>
                  </div>
                )}
                {budget.description && (
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{budget.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
            {lines.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Budget lines</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50 uppercase tracking-wider">
                          <th className="text-left p-3 font-medium">Account</th>
                          <th className="text-left p-3 font-medium">Description</th>
                          <th className="text-right p-3 font-medium">Annual</th>
                          <th className="text-right p-3 font-medium">Actual</th>
                          <th className="text-right p-3 font-medium">Variance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((line) => (
                          <tr key={line.id} className="border-b">
                            <td className="p-3">
                              {line.account && (
                                <span>{line.account.account_code} – {line.account.account_name}</span>
                              )}
                            </td>
                            <td className="p-3 text-muted-foreground">{line.description ?? '—'}</td>
                            <td className="p-3 text-right">{formatCurrency(line.annual_amount ?? 0, budget.currency)}</td>
                            <td className="p-3 text-right">{formatCurrency(line.actual_amount ?? 0, budget.currency)}</td>
                            <td className="p-3 text-right">
                              {formatCurrency((line.annual_amount ?? 0) - (line.actual_amount ?? 0), budget.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <p className="text-muted-foreground">Budget not found.</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ProjectsPageHeader
        title="Budget register"
        description="Search and view budget details and lines"
        breadcrumbs={[]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Budgets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Budget name or project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_approval">Pending approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {listLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
              Enter a search term or adjust filters to view budget details. Click View to open a budget.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 uppercase tracking-wider">
                    <th className="text-left p-3 font-medium">Budget name</th>
                    <th className="text-left p-3 font-medium">Fiscal year</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-right p-3 font-medium">Total</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="w-20 p-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => (
                    <tr key={b.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{b.name}</td>
                      <td className="p-3 text-muted-foreground">
                        {typeof b.fiscal_year === 'object' && b.fiscal_year?.name ? b.fiscal_year.name : '—'}
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary" className={getBudgetTypeColor(b.budget_type)}>
                          {getBudgetTypeLabel(b.budget_type)}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-medium">
                        {formatCurrency((b as Budget & { total_budget?: number }).total_budget ?? (b as Budget & { total_amount?: number }).total_amount ?? 0, b.currency)}
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary" className={getBudgetStatusColor(b.status)}>
                          {getBudgetStatusLabel(b.status)}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/projects/budget/inquiry?id=${b.id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function BudgetInquiryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[320px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <BudgetInquiryPageContent />
    </Suspense>
  )
}
