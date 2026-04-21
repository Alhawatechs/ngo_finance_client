'use client'

import React, { useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DatePicker } from '@/components/ui/date-picker'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Calendar,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Layers,
  CalendarRange,
  Search,
  MoreHorizontal,
  Loader2,
  Settings2,
  Table2,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import {
  FiscalYear,
  FiscalPeriod,
  getFiscalYears,
  getFiscalYearPeriods,
  createFiscalYear,
  updateFiscalYear,
  deleteFiscalYear,
  type CreateFiscalYearData,
} from '@/lib/api/fiscal'
import { handleApiError } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'
import { useOrganizationStore } from '@/stores/organizationStore'
import { FinanceModuleCard, FinanceEmptyState } from '@/components/finance'
import {
  FinanceDataTable,
  FinanceDataTableHeader,
  FinanceDataTableTh,
  FinanceDataTableRow,
  FinanceDataTableTd,
} from '@/components/finance/DataTable'
import { cn, formatDate } from '@/lib/utils'

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  open: 'Open',
  closed: 'Closed',
  locked: 'Locked',
}

/** Semantic colors aligned with finance status patterns */
const FY_STATUS_BADGE: Record<string, 'secondary' | 'success' | 'warning' | 'outline'> = {
  draft: 'secondary',
  open: 'success',
  closed: 'warning',
  locked: 'outline',
}

const PERIOD_STATUS_BADGE: Record<string, 'secondary' | 'success' | 'warning' | 'outline'> = {
  draft: 'secondary',
  open: 'success',
  closed: 'warning',
  locked: 'outline',
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function FiscalYearStatusBadge({ status }: { status: string }) {
  const variant = FY_STATUS_BADGE[status] ?? 'secondary'
  return (
    <Badge
      variant={variant}
      className={cn(
        'text-[10px] font-medium uppercase tracking-wide',
        status === 'locked' && 'border border-destructive/40 bg-destructive/5 text-destructive'
      )}
    >
      {STATUS_LABEL[status] ?? status}
    </Badge>
  )
}

function PeriodStatusBadge({ status }: { status: string }) {
  const variant = PERIOD_STATUS_BADGE[status] ?? 'secondary'
  return (
    <Badge
      variant={variant}
      className={cn(
        'text-[10px] font-medium',
        status === 'locked' && 'border border-destructive/40 bg-destructive/5 text-destructive'
      )}
    >
      {STATUS_LABEL[status] ?? status}
    </Badge>
  )
}

export default function FiscalYearsPage() {
  const { toast } = useToast()
  const user = useAuthStore((s) => s.user)
  const organization = useOrganizationStore((s) => s.organization)
  const fyStartMonth = organization?.fiscal_year_start_month ?? 1
  const fyHint = MONTH_NAMES[fyStartMonth - 1] ?? 'Jan'

  const canPeriodClose =
    !!user?.is_super_admin ||
    user?.permissions?.includes('view-period-close') ||
    user?.permissions?.includes('manage-period-close') ||
    user?.permissions?.includes('permanently-lock-period-close')

  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingYear, setEditingYear] = useState<FiscalYear | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FiscalYear | null>(null)
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState<'all' | 'current'>('all')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const [form, setForm] = useState<CreateFiscalYearData>({
    name: '',
    start_date: '',
    end_date: '',
    status: 'draft',
    is_current: false,
    create_periods: true,
  })

  const { data: fiscalYears = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['fiscal-years'],
    queryFn: () => getFiscalYears(),
  })

  const { data: expandedPeriods = [], isLoading: periodsLoading } = useQuery({
    queryKey: ['fiscal-year-periods', expandedId],
    queryFn: () => getFiscalYearPeriods(expandedId!),
    enabled: expandedId !== null,
  })

  const filteredYears = useMemo(() => {
    let list = fiscalYears
    if (scope === 'current') {
      list = list.filter((y) => y.is_current)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((y) => y.name.toLowerCase().includes(q))
    }
    return list
  }, [fiscalYears, scope, search])

  const stats = useMemo(() => {
    const totalPeriods = fiscalYears.reduce((sum, y) => sum + (y.periods_count ?? 0), 0)
    const current = fiscalYears.find((y) => y.is_current)
    const openYears = fiscalYears.filter((y) => y.status === 'open').length
    return {
      count: fiscalYears.length,
      totalPeriods,
      currentName: current?.name ?? null,
      openYears,
    }
  }, [fiscalYears])

  const createMutation = useMutation({
    mutationFn: createFiscalYear,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-years'] })
      setDialogOpen(false)
      resetForm()
      toast({ title: 'Fiscal year created', description: 'The fiscal year has been created successfully.' })
    },
    onError: (error: unknown) => {
      toast({ title: 'Error', description: handleApiError(error), variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateFiscalYearData> }) =>
      updateFiscalYear(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-years'] })
      setDialogOpen(false)
      setEditingYear(null)
      resetForm()
      toast({ title: 'Fiscal year updated', description: 'The fiscal year has been updated successfully.' })
    },
    onError: (error: unknown) => {
      toast({ title: 'Error', description: handleApiError(error), variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteFiscalYear,
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-years'] })
      queryClient.removeQueries({ queryKey: ['fiscal-year-periods', deletedId] })
      setDeleteTarget(null)
      setExpandedId((cur) => (cur === deletedId ? null : cur))
      toast({ title: 'Fiscal year deleted', description: 'The fiscal year has been deleted.' })
    },
    onError: (error: unknown) => {
      toast({ title: 'Cannot delete', description: handleApiError(error), variant: 'destructive' })
    },
  })

  const resetForm = () => {
    setForm({
      name: '',
      start_date: '',
      end_date: '',
      status: 'draft',
      is_current: false,
      create_periods: true,
    })
  }

  const openCreate = () => {
    setEditingYear(null)
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (year: FiscalYear) => {
    setEditingYear(year)
    setForm({
      name: year.name,
      start_date: year.start_date,
      end_date: year.end_date,
      status: year.status,
      is_current: year.is_current ?? false,
      create_periods: false,
    })
    setDialogOpen(true)
  }

  const applySuggestedNameFromDates = useCallback(() => {
    setForm((f) => {
      if (!f.start_date) return f
      const y = new Date(f.start_date + 'T12:00:00').getFullYear()
      return { ...f, name: f.name.trim() ? f.name : `FY ${y}` }
    })
  }, [])

  const createFormValid =
    Boolean(form.name?.trim()) && Boolean(form.start_date) && Boolean(form.end_date)

  const handleSubmit = () => {
    if (editingYear) {
      updateMutation.mutate({
        id: editingYear.id,
        data: {
          name: form.name,
          start_date: form.start_date,
          end_date: form.end_date,
          status: form.status,
          is_current: form.is_current,
        },
      })
    } else {
      if (!createFormValid) {
        toast({
          title: 'Required fields',
          description: 'Enter a name, start date, and end date.',
          variant: 'destructive',
        })
        return
      }
      createMutation.mutate(form)
    }
  }

  const confirmDelete = () => {
    if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
  }

  const toggleExpand = (id: number) => {
    setExpandedId((cur) => (cur === id ? null : id))
  }

  const busy = createMutation.isPending || updateMutation.isPending
  const showEmptyFilter = fiscalYears.length > 0 && filteredYears.length === 0

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex min-h-0 flex-1 flex-col gap-5">
        <h2 className="sr-only">Fiscal years</h2>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="overflow-hidden border-border/80 bg-gradient-to-br from-card via-card to-muted/30 shadow-sm ring-1 ring-border/40">
            <CardContent className="flex items-start gap-3 p-4">
              <div className="rounded-lg bg-primary/12 p-2.5 text-primary ring-1 ring-primary/10">
                <CalendarRange className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Fiscal years
                </p>
                <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                  {isLoading ? '—' : stats.count}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">Defined in your organization</p>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-border/80 bg-gradient-to-br from-card via-card to-muted/30 shadow-sm ring-1 ring-border/40">
            <CardContent className="flex items-start gap-3 p-4">
              <div className="rounded-lg bg-muted p-2.5 text-muted-foreground ring-1 ring-border/50">
                <Layers className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Accounting periods
                </p>
                <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                  {isLoading ? '—' : stats.totalPeriods}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">Across all years (monthly slices)</p>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-border/80 bg-gradient-to-br from-card via-card to-muted/30 shadow-sm ring-1 ring-border/40">
            <CardContent className="flex items-start gap-3 p-4">
              <div className="rounded-lg bg-emerald-500/12 p-2.5 text-emerald-700 ring-1 ring-emerald-500/15 dark:text-emerald-400">
                <Calendar className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Current year
                </p>
                <p
                  className="mt-0.5 truncate text-sm font-semibold leading-snug text-foreground"
                  title={stats.currentName ?? undefined}
                >
                  {isLoading ? '—' : stats.currentName ?? 'Not assigned'}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">Reporting &amp; default selection</p>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-border/80 bg-gradient-to-br from-card via-card to-muted/30 shadow-sm ring-1 ring-border/40">
            <CardContent className="flex items-start gap-3 p-4">
              <div className="rounded-lg bg-sky-500/10 p-2.5 text-sky-800 ring-1 ring-sky-500/15 dark:text-sky-300">
                <Table2 className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Open for posting
                </p>
                <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                  {isLoading ? '—' : stats.openYears}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">Years with status &quot;Open&quot;</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-xl border border-border/80 bg-muted/25 p-3 shadow-sm ring-1 ring-border/30">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative max-w-md flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by fiscal year name…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 border-border/80 bg-background pl-9 shadow-sm"
                  aria-label="Search fiscal years"
                />
              </div>
              <Select value={scope} onValueChange={(v) => setScope(v as 'all' | 'current')}>
                <SelectTrigger className="h-9 w-full border-border/80 bg-background shadow-sm sm:w-[168px]">
                  <SelectValue placeholder="Scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All fiscal years</SelectItem>
                  <SelectItem value="current">Current year only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <p className="text-xs tabular-nums text-muted-foreground lg:mr-2" aria-live="polite">
                {fiscalYears.length === 0
                  ? 'No data'
                  : `Showing ${filteredYears.length} of ${fiscalYears.length}`}
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 border-border/80 bg-background"
                    onClick={() => refetch()}
                    disabled={isFetching}
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
                    <span className="ml-1.5 hidden sm:inline">Refresh</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reload fiscal years from the server</TooltipContent>
              </Tooltip>
              <Button size="sm" className="h-9 shrink-0 gap-1.5 shadow-sm" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                New fiscal year
              </Button>
            </div>
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-0.5 border-t border-border/50 pt-3 text-[11px] leading-relaxed text-muted-foreground">
            <Settings2 className="mr-1 inline h-3.5 w-3.5 shrink-0 text-muted-foreground/80" aria-hidden />
            Organization fiscal calendar starts in{' '}
            <span className="font-medium text-foreground">{fyHint}</span>. Adjust in{' '}
            <Link href="/admin/organization" className="font-medium text-primary underline-offset-4 hover:underline">
              Organization settings
            </Link>
            . Overlapping fiscal year ranges are blocked when saving.
          </p>
        </div>

        <FinanceModuleCard
          title="Fiscal years"
          subtitle="Expand a row to inspect periods. Use actions for edit, delete, or period close. Status reflects the year lifecycle (draft → open → closed → locked)."
          icon={<Calendar className="h-5 w-5" />}
          className="border-border/80 shadow-sm ring-1 ring-border/30"
        >
          {isLoading && fiscalYears.length === 0 ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-11 w-full rounded-md" />
              ))}
            </div>
          ) : fiscalYears.length === 0 ? (
            <FinanceEmptyState
              icon={Calendar}
              title="No fiscal years yet"
              description="Create a fiscal year to anchor budgets, journals, and period close. Monthly periods can be generated automatically."
              action={
                <Button onClick={openCreate} className="gap-2 shadow-sm">
                  <Plus className="h-4 w-4" />
                  Create fiscal year
                </Button>
              }
            />
          ) : showEmptyFilter ? (
            <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 py-12 text-center">
              <p className="text-sm font-medium text-foreground">No matching fiscal years</p>
              <p className="mt-1 text-sm text-muted-foreground">Try another search or clear filters.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => { setSearch(''); setScope('all') }}>
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="coa-ledger-table-frame w-full min-w-0">
              <FinanceDataTable className="rounded-lg border-0 shadow-none ring-0">
                <FinanceDataTableHeader theadClassName="coa-ledger-thead">
                  <FinanceDataTableTh className="w-11 py-2.5 pl-3" />
                  <FinanceDataTableTh className="min-w-[140px] py-2.5">Fiscal year</FinanceDataTableTh>
                  <FinanceDataTableTh className="min-w-[200px] py-2.5">Reporting period</FinanceDataTableTh>
                  <FinanceDataTableTh className="py-2.5">Status</FinanceDataTableTh>
                  <FinanceDataTableTh align="center" className="w-[88px] py-2.5">
                    Periods
                  </FinanceDataTableTh>
                  <FinanceDataTableTh align="center" className="w-[100px] py-2.5">
                    Current
                  </FinanceDataTableTh>
                  <FinanceDataTableTh align="right" className="w-[72px] py-2.5 pr-3 text-[10px]">
                    Actions
                  </FinanceDataTableTh>
                </FinanceDataTableHeader>
                <tbody>
                  {filteredYears.map((year) => {
                    const isOpen = expandedId === year.id
                    return (
                      <React.Fragment key={year.id}>
                        <FinanceDataTableRow
                          className={cn(
                            'border-b border-border/50 transition-colors',
                            isOpen ? 'bg-muted/35' : 'hover:bg-muted/25'
                          )}
                        >
                          <FinanceDataTableTd className="w-11 py-2 pl-3 align-middle">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                                  onClick={() => toggleExpand(year.id)}
                                  aria-expanded={isOpen}
                                  aria-label={isOpen ? `Collapse periods for ${year.name}` : `Expand periods for ${year.name}`}
                                >
                                  <ChevronDown
                                    className={cn('h-4 w-4 transition-transform duration-200', isOpen && 'rotate-180')}
                                  />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                {isOpen ? 'Hide period detail' : 'View accounting periods'}
                              </TooltipContent>
                            </Tooltip>
                          </FinanceDataTableTd>
                          <FinanceDataTableTd className="py-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-foreground">{year.name}</span>
                              {year.is_current && (
                                <Badge className="h-5 border-0 bg-primary/15 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                  Current
                                </Badge>
                              )}
                            </div>
                          </FinanceDataTableTd>
                          <FinanceDataTableTd className="py-2 text-muted-foreground">
                            <span className="tabular-nums text-sm">
                              {formatDate(year.start_date)} <span className="text-muted-foreground/70">–</span>{' '}
                              {formatDate(year.end_date)}
                            </span>
                          </FinanceDataTableTd>
                          <FinanceDataTableTd className="py-2">
                            <FiscalYearStatusBadge status={year.status} />
                          </FinanceDataTableTd>
                          <FinanceDataTableTd align="center" className="py-2 tabular-nums text-sm text-muted-foreground">
                            {year.periods_count ?? '—'}
                          </FinanceDataTableTd>
                          <FinanceDataTableTd align="center" className="py-2">
                            {year.is_current ? (
                              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Yes</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </FinanceDataTableTd>
                          <FinanceDataTableTd align="right" className="py-2 pr-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  disabled={busy}
                                  aria-label={`Actions for ${year.name}`}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem className="gap-2" onClick={() => openEdit(year)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                  Edit fiscal year
                                </DropdownMenuItem>
                                {canPeriodClose && (
                                  <DropdownMenuItem asChild>
                                    <Link href="/general-ledger/period-close" className="flex cursor-pointer items-center gap-2">
                                      <ChevronRight className="h-3.5 w-3.5 opacity-70" />
                                      Period close
                                    </Link>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="gap-2 text-destructive focus:text-destructive"
                                  onClick={() => setDeleteTarget(year)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </FinanceDataTableTd>
                        </FinanceDataTableRow>
                        {isOpen && (
                          <tr className="border-b border-border/50 bg-muted/15">
                            <td colSpan={7} className="px-3 py-4">
                              {periodsLoading ? (
                                <div className="space-y-2">
                                  <Skeleton className="h-8 w-48 rounded-md" />
                                  <Skeleton className="h-32 w-full rounded-lg" />
                                </div>
                              ) : expandedPeriods.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-border/70 bg-background/50 px-4 py-8 text-center">
                                  <p className="text-sm font-medium text-foreground">No periods defined</p>
                                  <p className="mt-1 max-w-md mx-auto text-xs text-muted-foreground">
                                    Recreate the year with &quot;Create monthly periods&quot; enabled, or load periods via system integration.
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                      Accounting periods ({expandedPeriods.length})
                                    </h4>
                                  </div>
                                  <div className="overflow-x-auto rounded-lg border border-border/70 bg-card shadow-sm">
                                    <table className="w-full min-w-[560px] text-sm">
                                      <thead>
                                        <tr className="border-b bg-muted/40 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                          <th className="px-3 py-2.5">#</th>
                                          <th className="px-3 py-2.5">Period</th>
                                          <th className="px-3 py-2.5">Start</th>
                                          <th className="px-3 py-2.5">End</th>
                                          <th className="px-3 py-2.5">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {expandedPeriods.map((p: FiscalPeriod) => (
                                          <tr
                                            key={p.id}
                                            className="border-b border-border/40 last:border-0 hover:bg-muted/20"
                                          >
                                            <td className="px-3 py-2 tabular-nums text-muted-foreground">{p.period_number}</td>
                                            <td className="px-3 py-2 font-medium text-foreground">{p.name}</td>
                                            <td className="px-3 py-2 tabular-nums text-muted-foreground">{formatDate(p.start_date)}</td>
                                            <td className="px-3 py-2 tabular-nums text-muted-foreground">{formatDate(p.end_date)}</td>
                                            <td className="px-3 py-2">
                                              <PeriodStatusBadge status={p.status} />
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </FinanceDataTable>
            </div>
          )}
        </FinanceModuleCard>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="gap-0 overflow-hidden border-border/80 p-0 shadow-lg sm:max-w-[520px]">
            <div className="border-b border-border/60 bg-muted/20 px-6 py-4">
              <DialogHeader className="space-y-1 text-left">
                <DialogTitle className="text-lg font-semibold tracking-tight">
                  {editingYear ? 'Edit fiscal year' : 'New fiscal year'}
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed">
                  {editingYear
                    ? 'Adjust dates, lifecycle status, or which year is marked current. Periods appear in the table above.'
                    : 'Enter a label and inclusive date range. The system prevents overlaps with existing years.'}
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="space-y-5 px-6 py-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="fy-name" className="text-foreground">
                    Display name
                  </Label>
                  {!editingYear && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-primary"
                      onClick={applySuggestedNameFromDates}
                      disabled={!form.start_date}
                    >
                      Suggest from start date
                    </Button>
                  )}
                </div>
                <Input
                  id="fy-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. FY 2026"
                  maxLength={50}
                  className="border-border/80 shadow-sm"
                />
                <p className="text-[11px] text-muted-foreground">Shown in budgets, reports, and period close pickers.</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fy-start">Start date</Label>
                  <DatePicker
                    id="fy-start"
                    value={form.start_date}
                    onChange={(v) => setForm((f) => ({ ...f, start_date: v }))}
                    inputClassName="border-border/80"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fy-end">End date</Label>
                  <DatePicker
                    id="fy-end"
                    value={form.end_date}
                    onChange={(v) => setForm((f) => ({ ...f, end_date: v }))}
                    minDate={form.start_date || undefined}
                    inputClassName="border-border/80"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fy-status">Year status</Label>
                <Select
                  value={form.status ?? 'draft'}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, status: v as CreateFiscalYearData['status'] }))
                  }
                >
                  <SelectTrigger id="fy-status" className="border-border/80 bg-background shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft — planning only</SelectItem>
                    <SelectItem value="open">Open — active posting (subject to period rules)</SelectItem>
                    <SelectItem value="closed">Closed — year finalized</SelectItem>
                    <SelectItem value="locked">Locked — immutable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!editingYear && (
                <div className="rounded-lg border border-border/80 bg-muted/25 p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="create_periods"
                      checked={form.create_periods ?? true}
                      onChange={(e) => setForm((f) => ({ ...f, create_periods: e.target.checked }))}
                      className="mt-1 h-4 w-4 rounded border-input text-primary shadow-sm focus:ring-primary"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="create_periods" className="cursor-pointer text-sm font-medium leading-snug">
                        Generate monthly accounting periods
                      </Label>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Creates one period per calendar month from start through end (trimmed to your end date). Recommended
                        for standard period close.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-4 rounded-lg border border-border/80 bg-background px-4 py-3 shadow-sm">
                <div className="space-y-0.5">
                  <Label htmlFor="is_current" className="text-sm font-medium">
                    Mark as current fiscal year
                  </Label>
                  <p className="text-xs text-muted-foreground">Only one year should be current for organization defaults.</p>
                </div>
                <Switch
                  id="is_current"
                  checked={form.is_current ?? false}
                  onCheckedChange={(c) => setForm((f) => ({ ...f, is_current: c }))}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 border-t border-border/60 bg-muted/15 px-6 py-4 sm:justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="min-w-[88px]">
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={busy || (!editingYear && !createFormValid)}
                className="min-w-[100px] gap-2 shadow-sm"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                )}
                {editingYear ? 'Save changes' : 'Create fiscal year'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent className="border-border/80 shadow-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete fiscal year?</AlertDialogTitle>
              <AlertDialogDescription className="leading-relaxed">
                <span className="font-medium text-foreground">&quot;{deleteTarget?.name}&quot;</span> will be removed permanently.
                You cannot delete the current year, years with journal entries in their periods, or years that still have
                budgets attached.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  'Delete fiscal year'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}
