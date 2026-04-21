'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Wallet,
  Plus,
  Eye,
  Pencil,
  Copy,
  Trash2,
  Search,
  RefreshCw,
  BarChart3,
  AlertTriangle,
} from 'lucide-react'
import {
  getBudgets,
  getBudgetSummary,
  getBudgetFormatTemplates,
  deleteBudget,
  Budget,
  getBudgetTypeLabel,
  getBudgetTypeColor,
  getBudgetStatusLabel,
  getBudgetStatusColor,
  reviseBudget,
} from '@/lib/api/budgets'
import { getFiscalYears } from '@/lib/api/fiscal'
import { getOffices } from '@/lib/api/offices'
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
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'
import { ActionMenu } from '@/components/ui/action-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectsPageHeader } from '@/components/projects/PageHeader'
import {
  FinanceDataTable,
  FinanceDataTableHeader,
  FinanceDataTableTh,
  FinanceDataTableRow,
  FinanceDataTableTd,
  FinancePagination,
} from '@/components/finance/DataTable'
import { ProjectsPageLayout } from '../ProjectsPageLayout'
import { DEFAULT_PAGE_SIZE } from '@/lib/projects-constants'

export default function BudgetListPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [formatFilter, setFormatFilter] = useState<string>('all')
  const [fiscalYearFilter, setFiscalYearFilter] = useState<string>('all')
  const [officeFilter, setOfficeFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE)
  const [revisingId, setRevisingId] = useState<number | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null)

  const { data: summaryData } = useQuery({
    queryKey: ['budget-summary-list'],
    queryFn: getBudgetSummary,
  })

  const { data: fiscalYearsData } = useQuery({
    queryKey: ['fiscal-years-list'],
    queryFn: () => getFiscalYears(),
  })

  const { data: officesData } = useQuery({
    queryKey: ['offices-list'],
    queryFn: () => getOffices({ per_page: 100 }),
  })

  const { data: formatsData } = useQuery({
    queryKey: ['budget-format-templates-list'],
    queryFn: () => getBudgetFormatTemplates(),
  })
  const formatTemplates = (formatsData ?? []) as { id: number; name: string; code: string }[]

  const summary = (summaryData?.data ?? summaryData) as {
    total_budgets?: number
    approved_budgets?: number
    total_budgeted?: number
    total_actual?: number
    utilization_rate?: number
    by_type?: Record<string, { count?: number; total?: number }>
  } | undefined

  const fiscalYears = Array.isArray(fiscalYearsData) ? fiscalYearsData : (fiscalYearsData as { data?: { id: number; name: string }[] } | undefined)?.data ?? []
  const offices = Array.isArray(officesData) ? officesData : []

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['budgets', page, perPage, searchQuery, statusFilter, typeFilter, formatFilter, fiscalYearFilter, officeFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page,
        per_page: perPage,
      }
      if (statusFilter !== 'all') params.status = statusFilter
      if (typeFilter !== 'all') params.budget_type = typeFilter
      if (formatFilter !== 'all') params.budget_format_template_id = formatFilter
      if (fiscalYearFilter !== 'all') params.fiscal_year_id = fiscalYearFilter
      if (officeFilter !== 'all') params.office_id = officeFilter
      if (searchQuery.trim()) params.search = searchQuery.trim()
      return getBudgets(params)
    },
  })

  const budgets = (data?.data ?? []) as Budget[]
  const meta = data?.meta

  const deleteMutation = useMutation({
    mutationFn: deleteBudget,
    onSuccess: () => {
      refetch()
      setDeleteDialogOpen(false)
      setBudgetToDelete(null)
      toast({ title: 'Budget Deleted', description: 'The draft budget has been deleted successfully.' })
    },
    onError: (error: unknown) => {
      const msg = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Failed to delete budget'
      toast({ title: 'Error', description: String(msg), variant: 'destructive' })
    },
  })

  const handleCreateRevision = async (b: Budget) => {
    setRevisingId(b.id)
    try {
      const result = await reviseBudget(b.id)
      const revised = (result as { data?: Budget })?.data ?? (result as Budget)
      const newId = revised?.id
      toast({ title: 'Revision created', description: 'A new draft budget has been created from the approved budget.' })
      if (newId) router.push(`/projects/budget/edit/${newId}`)
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Failed to create revision.'
      toast({ title: 'Error', description: String(msg), variant: 'destructive' })
    } finally {
      setRevisingId(null)
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setTypeFilter('all')
    setFormatFilter('all')
    setFiscalYearFilter('all')
    setOfficeFilter('all')
    setPage(1)
  }

  const hasActiveFilters =
    searchQuery.trim() ||
    statusFilter !== 'all' ||
    typeFilter !== 'all' ||
    formatFilter !== 'all' ||
    fiscalYearFilter !== 'all' ||
    officeFilter !== 'all'

  return (
    <ProjectsPageLayout>
      <div className="space-y-6">
        <ProjectsPageHeader
          title="Budget List"
          description="Create, edit, and revise operational or project budgets. Draft budgets can be edited; approved budgets can be revised into a new draft."
          breadcrumbs={[
            { label: 'Projects', href: '/projects' },
            { label: 'Budget', href: '/projects/budget' },
            { label: 'Budget List' },
          ]}
          actions={
            <Link href="/projects/budget/add">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New budget
              </Button>
            </Link>
          }
        />

        {/* Budget summary bar */}
        {summary && (
          <section
            className="mb-4 rounded-lg border border-slate-200/70 bg-slate-50/50 px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm"
            aria-label="Budget summary"
          >
            <Link
              href="/projects/budget/reports"
              className="text-slate-500 font-medium pr-1 hover:text-slate-800 hover:underline"
            >
              Summary
            </Link>
            <span className="text-slate-300 select-none" aria-hidden>|</span>
            <Link
              href="/projects/budget/formats"
              className="text-slate-500 font-medium pr-1 hover:text-slate-800 hover:underline"
            >
              Format Templates
            </Link>
            <span className="text-slate-300 select-none" aria-hidden>|</span>
            <span className="tabular-nums font-semibold text-slate-800">{summary.total_budgets ?? 0}</span>
            <span className="text-slate-500">budgets</span>
            <span className="text-slate-300 select-none" aria-hidden>·</span>
            <span className="tabular-nums font-semibold text-emerald-700">{summary.approved_budgets ?? 0}</span>
            <span className="text-slate-500">approved</span>
            <span className="text-slate-300 select-none" aria-hidden>·</span>
            <span className="text-slate-500">Budgeted</span>
            <span className="tabular-nums font-semibold text-slate-800">
              {formatCurrency(summary.total_budgeted ?? 0, 'USD')}
            </span>
            <span className="text-slate-300 select-none" aria-hidden>·</span>
            <span className="text-slate-500">Actual</span>
            <span className="tabular-nums font-semibold text-amber-800">
              {formatCurrency(summary.total_actual ?? 0, 'USD')}
            </span>
            <span className="text-slate-300 select-none" aria-hidden>·</span>
            <span className="text-slate-500">Util</span>
            <span className="tabular-nums font-semibold text-slate-800">
              {summary.utilization_rate != null ? `${summary.utilization_rate}%` : '—'}
            </span>
          </section>
        )}

        <Card className="border border-slate-200/80 shadow-sm overflow-hidden rounded-xl bg-white">
          {/* List header */}
          <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50/80 to-white px-6 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#023e8a] to-[#0353a6] text-white shadow-lg shadow-[#023e8a]/20">
                  <Wallet className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800 tracking-tight">Budget list</h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {isError ? 'Could not load' : meta ? `${meta.total} budget${meta.total !== 1 ? 's' : ''}` : 'Loading…'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="border-slate-200 bg-white hover:bg-slate-50 hover:border-[#023e8a]/30 shadow-sm">
                  <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" asChild className="border-slate-200 bg-white hover:bg-slate-50 hover:border-[#023e8a]/30 shadow-sm">
                  <Link href="/projects/budget/reports">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Reports
                  </Link>
                </Button>
                <Link href="/projects/budget/add">
                  <Button size="sm" className="shadow-sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New budget
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Search & filter toolbar */}
          <div className="border-b border-slate-100 bg-slate-50/40 px-6 py-3.5">
            <div className="flex flex-wrap gap-2.5 items-center">
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Search budgets…"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                  className="pl-9 h-9 text-sm border-slate-200 bg-white rounded-lg focus-visible:ring-0.5 focus-visible:ring-ring focus-visible:border-[#023e8a]/30 placeholder:text-slate-400"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[135px] h-9 text-sm border-slate-200 bg-white rounded-lg">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[135px] h-9 text-sm border-slate-200 bg-white rounded-lg">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="operational">Operational</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="departmental">Departmental</SelectItem>
                  <SelectItem value="consolidated">Consolidated</SelectItem>
                </SelectContent>
              </Select>
              <Select value={formatFilter} onValueChange={(v) => { setFormatFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[155px] h-9 text-sm border-slate-200 bg-white rounded-lg">
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All formats</SelectItem>
                  {formatTemplates.map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={fiscalYearFilter} onValueChange={(v) => { setFiscalYearFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[150px] h-9 text-sm border-slate-200 bg-white rounded-lg">
                  <SelectValue placeholder="Fiscal year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All fiscal years</SelectItem>
                  {fiscalYears.map((fy) => (
                    <SelectItem key={fy.id} value={String(fy.id)}>{fy.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={officeFilter} onValueChange={(v) => { setOfficeFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[145px] h-9 text-sm border-slate-200 bg-white rounded-lg">
                  <SelectValue placeholder="Office" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All offices</SelectItem>
                  {offices.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>{o.code} – {o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                  onClick={clearFilters}
                >
                  Clear filters
                </Button>
              )}
              {hasActiveFilters && meta && (
                <span className="text-xs text-slate-500 ml-auto font-medium tabular-nums">
                  {meta.total} result{meta.total !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          <CardContent className="p-0">
            {isError && (
              <div className="p-12 text-center border-b bg-muted/20">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mx-auto mb-4">
                  <AlertTriangle className="h-7 w-7" />
                </div>
                <p className="text-base font-semibold text-foreground">Failed to load budgets</p>
                <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                  {(error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? (error as Error)?.message ?? 'Please try again.'}
                </p>
                <Button variant="outline" size="sm" className="mt-4 border-[#979dac]/40" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            )}

            <FinanceDataTable
              className="rounded-lg border-0 w-full min-w-0 overflow-x-auto"
              tableClassName="w-full min-w-max border-collapse [&_thead_th]:text-xs [&_thead_th]:tracking-wide [&_tbody_td]:!text-xs [&_tbody_td]:text-slate-800 [&_tbody_tr]:border-b [&_tbody_tr]:border-slate-100 [&_tbody_tr:hover]:bg-slate-50/70 [&_td]:border-r [&_td]:border-slate-100 [&_td:last-child]:border-r-0 [&_th]:border-r [&_th]:border-slate-200 [&_th:last-child]:border-r-0 [&_th]:py-2 [&_th]:px-2 [&_td]:py-1.5 [&_td]:px-2"
            >
                <FinanceDataTableHeader className="!bg-slate-100/95 !border-0 sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.06)] border-b border-slate-200">
                  <FinanceDataTableTh className="min-w-[40px] w-10 py-2 px-2 text-xs font-semibold text-slate-800 text-center sticky left-0 z-20 bg-slate-100/95 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">No</FinanceDataTableTh>
                  <FinanceDataTableTh className="min-w-[160px] py-2 px-2 text-xs font-semibold text-slate-800 text-left">Budget name</FinanceDataTableTh>
                  <FinanceDataTableTh className="min-w-[100px] py-2 px-2 text-xs font-semibold text-slate-800 text-center">Fiscal year</FinanceDataTableTh>
                  <FinanceDataTableTh className="min-w-[100px] py-2 px-2 text-xs font-semibold text-slate-800 text-center">Type</FinanceDataTableTh>
                  <FinanceDataTableTh className="min-w-[120px] py-2 px-2 text-xs font-semibold text-slate-800 text-left">Format</FinanceDataTableTh>
                  <FinanceDataTableTh className="min-w-[140px] py-2 px-2 text-xs font-semibold text-slate-800 text-left">Project</FinanceDataTableTh>
                  <FinanceDataTableTh className="min-w-[90px] py-2 px-2 text-xs font-semibold text-slate-800 text-right">Total</FinanceDataTableTh>
                  <FinanceDataTableTh className="min-w-[90px] py-2 px-2 text-xs font-semibold text-slate-800 text-center">Status</FinanceDataTableTh>
                  <FinanceDataTableTh align="center" className="min-w-[52px] w-[52px] py-2 px-2 text-xs font-semibold text-slate-800 sticky right-0 z-20 bg-slate-100/95 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.06)]">Actions</FinanceDataTableTh>
                </FinanceDataTableHeader>
                <tbody>
                  {isLoading && (
                    [...Array(8)].map((_, i) => (
                      <FinanceDataTableRow key={i} className="bg-white border-slate-100">
                        <FinanceDataTableTd className="py-1.5 px-2 text-center sticky left-0 z-10 bg-white"><Skeleton className="h-3.5 w-5 mx-auto" /></FinanceDataTableTd>
                        <FinanceDataTableTd className="py-1.5 px-2"><Skeleton className="h-3.5 w-32" /></FinanceDataTableTd>
                        <FinanceDataTableTd className="py-1.5 px-2 text-center"><Skeleton className="h-3.5 w-20 mx-auto" /></FinanceDataTableTd>
                        <FinanceDataTableTd className="py-1.5 px-2 text-center"><Skeleton className="h-3.5 w-24 mx-auto" /></FinanceDataTableTd>
                        <FinanceDataTableTd className="py-1.5 px-2"><Skeleton className="h-3.5 w-24" /></FinanceDataTableTd>
                        <FinanceDataTableTd className="py-1.5 px-2"><Skeleton className="h-3.5 w-28" /></FinanceDataTableTd>
                        <FinanceDataTableTd className="py-1.5 px-2 text-right"><Skeleton className="h-3.5 w-16 ml-auto" /></FinanceDataTableTd>
                        <FinanceDataTableTd className="py-1.5 px-2 text-center"><Skeleton className="h-3.5 w-16 mx-auto" /></FinanceDataTableTd>
                        <FinanceDataTableTd className="py-1.5 px-2 text-center sticky right-0 z-10 bg-white"><Skeleton className="h-3.5 w-8 mx-auto" /></FinanceDataTableTd>
                      </FinanceDataTableRow>
                    ))
                  )}

                  {!isLoading && !isError && budgets.length === 0 && (
                    <tr className="border-b border-slate-100 bg-white">
                      <td colSpan={9} className="py-20 text-center">
                        <div className="flex flex-col items-center max-w-md mx-auto">
                          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 text-slate-400 ring-1 ring-slate-200/60 mb-5">
                            <Wallet className="h-10 w-10" />
                          </div>
                          <p className="font-semibold text-slate-800 text-lg">No budgets found</p>
                          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                            {hasActiveFilters
                              ? 'Try adjusting your search or filters. Use Budget register to add new budgets.'
                              : 'No budgets yet. Use Budget register to create operational or project budgets.'}
                          </p>
                          <Link href="/projects/budget/add" className="mt-4">
                            <Button>
                              <Plus className="h-4 w-4 mr-2" />
                              New budget
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )}

                  {!isLoading &&
                    !isError &&
                    budgets.map((b, index) => {
                      const rowNo = (meta?.from ?? 1) + index
                      const totalAmt = (b as Budget & { total_budget?: number }).total_budget ?? (b as Budget & { total_amount?: number }).total_amount ?? 0
                      return (
                        <FinanceDataTableRow key={b.id} className="bg-white transition-colors border-slate-100 group">
                          <FinanceDataTableTd className="py-1.5 px-2 text-slate-600 tabular-nums text-center text-xs sticky left-0 z-10 bg-white group-hover:bg-slate-50/70 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                            {rowNo}
                          </FinanceDataTableTd>
                          <FinanceDataTableTd className="py-1.5 px-2 text-left">
                            <span className="font-medium text-slate-800">{b.name}</span>
                          </FinanceDataTableTd>
                          <FinanceDataTableTd className="py-1.5 px-2 text-center text-slate-600">
                            {typeof b.fiscal_year === 'object' && b.fiscal_year?.name ? b.fiscal_year.name : '—'}
                          </FinanceDataTableTd>
                          <FinanceDataTableTd className="py-1.5 px-2 text-center">
                            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 rounded-md ${getBudgetTypeColor(b.budget_type)}`}>
                              {getBudgetTypeLabel(b.budget_type)}
                            </Badge>
                          </FinanceDataTableTd>
                          <FinanceDataTableTd className="py-1.5 px-2 text-left text-slate-600 text-xs">
                            {(b as Budget & { budget_format_template?: { name: string } }).budget_format_template?.name ?? 'Legacy'}
                          </FinanceDataTableTd>
                          <FinanceDataTableTd className="py-1.5 px-2 text-left text-slate-600">
                            {b.project?.project_name ?? b.project?.project_code ?? '—'}
                          </FinanceDataTableTd>
                          <FinanceDataTableTd className="py-1.5 px-2 text-right font-mono tabular-nums text-slate-700">
                            {formatCurrency(totalAmt, b.currency)}
                          </FinanceDataTableTd>
                          <FinanceDataTableTd className="py-1.5 px-2 text-center">
                            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 rounded-md ${getBudgetStatusColor(b.status)}`}>
                              {getBudgetStatusLabel(b.status)}
                            </Badge>
                          </FinanceDataTableTd>
                          <FinanceDataTableTd className="py-1.5 px-2 text-center sticky right-0 z-10 bg-white group-hover:bg-slate-50/70 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                            <ActionMenu
                              triggerClassName="h-8 w-8"
                              items={[
                                { label: 'View', icon: <Eye className="h-4 w-4" />, href: `/projects/budget/inquiry?id=${b.id}` },
                                ...(b.status === 'draft'
                                  ? [
                                      { label: 'Edit', icon: <Pencil className="h-4 w-4" />, href: `/projects/budget/edit/${b.id}` },
                                      { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: () => { setBudgetToDelete(b); setDeleteDialogOpen(true) }, destructive: true },
                                    ]
                                  : []),
                                ...(b.status === 'approved'
                                  ? [{
                                      label: revisingId === b.id ? 'Creating…' : 'Create revision',
                                      icon: <Copy className="h-4 w-4" />,
                                      onClick: () => { if (revisingId == null) handleCreateRevision(b) },
                                    }]
                                  : []),
                              ]}
                            />
                          </FinanceDataTableTd>
                        </FinanceDataTableRow>
                      )
                    })}
                </tbody>
            </FinanceDataTable>

            {!isError && meta && meta.last_page > 1 && (
              <div className="px-6">
                <FinancePagination
                  from={meta.from ?? 0}
                  to={meta.to ?? 0}
                  total={meta.total}
                  label="budgets"
                  onPrevious={() => setPage((p) => Math.max(1, p - 1))}
                  onNext={() => setPage((p) => Math.min(meta.last_page ?? 1, p + 1))}
                  previousDisabled={page <= 1}
                  nextDisabled={page >= (meta.last_page ?? 1)}
                  currentPage={page}
                  lastPage={meta.last_page ?? 1}
                  onPageChange={(p) => setPage(p)}
                  pageSize={perPage}
                  pageSizeOptions={[10, 15, 25, 50]}
                  onPageSizeChange={(size) => { setPerPage(size); setPage(1) }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (open !== deleteDialogOpen) setDeleteDialogOpen(open) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete draft budget <strong>{budgetToDelete?.name}</strong>?
              Only draft budgets can be deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => budgetToDelete && deleteMutation.mutate(budgetToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProjectsPageLayout>
  )
}
