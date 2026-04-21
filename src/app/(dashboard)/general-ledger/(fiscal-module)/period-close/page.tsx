'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Calendar, CalendarRange, LayoutList, Lock, Unlock, RefreshCw, ShieldAlert } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { FiscalYear, getFiscalYears } from '@/lib/api/fiscal'
import {
  ProjectPeriodCloseOverview,
  ProjectPeriodCloseRow,
  ProjectCloseState,
  getProjectPeriodCloseOverview,
  closeProjectPosting,
  reopenProjectPosting,
  lockProjectPosting,
  unlockPermanentProjectPosting,
} from '@/lib/api/project-fiscal-periods'
import { getProjects } from '@/lib/api/projects'
import { handleApiError } from '@/lib/api/client'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import Link from 'next/link'

type DialogMode = 'close' | 'reopen' | 'lock' | 'unlock-permanent' | null
type BulkMode = 'close' | 'reopen' | 'lock' | null

function orgPeriodLabel(status: string): string {
  switch (status) {
    case 'open':
      return 'Open'
    case 'closed':
      return 'Closed (org)'
    case 'locked':
      return 'Locked (org)'
    case 'draft':
      return 'Draft'
    default:
      return status
  }
}

function getProjectCloseState(row: ProjectPeriodCloseRow): ProjectCloseState {
  if (row.project_close_state) {
    return row.project_close_state
  }
  if (!row.project_period_status) {
    return 'opened'
  }
  if (row.project_period_status === 'locked') {
    return 'permanently_locked'
  }
  return 'temporarily_locked'
}

function projectCloseStateDescription(row: ProjectPeriodCloseRow): string {
  const org = row.fiscal_period.status
  if (org !== 'open') {
    return '— (organization period not open)'
  }
  switch (getProjectCloseState(row)) {
    case 'opened':
      return 'Opened — posting allowed for this project'
    case 'temporarily_locked':
      return 'Temporarily locked — posting closed; you may reopen or lock permanently'
    case 'permanently_locked':
      return 'Permanently locked — posting blocked; Super Admin can remove the lock in Actions'
    default:
      return ''
  }
}

function projectCloseStateShortLabel(state: ProjectCloseState): string {
  switch (state) {
    case 'opened':
      return 'Opened'
    case 'temporarily_locked':
      return 'Temp. locked'
    case 'permanently_locked':
      return 'Perm. locked'
    default:
      return state
  }
}

function projectCloseStateBadgeVariant(
  state: ProjectCloseState
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (state) {
    case 'opened':
      return 'outline'
    case 'temporarily_locked':
      return 'secondary'
    case 'permanently_locked':
      return 'destructive'
    default:
      return 'outline'
  }
}

function rowSelectable(row: ProjectPeriodCloseRow): boolean {
  if (row.fiscal_period.status !== 'open') return false
  if (row.project_period_status === 'locked') return false
  return true
}

/** Select rows for bulk actions: open rows need temporary manage; closed rows need temporary or permanent. */
function canSelectPeriodRow(
  row: ProjectPeriodCloseRow,
  canManageTemporary: boolean,
  canManagePermanent: boolean
): boolean {
  if (!rowSelectable(row)) return false
  if (!row.project_period_status) return canManageTemporary
  if (row.project_period_status === 'closed') return canManageTemporary || canManagePermanent
  return false
}

function periodHue(index: number): number {
  return (index * 47) % 360
}

/** Compact “calendar” tab: period date range, document count, voucher number span, total — no day grid. */
function PeriodCloseSummaryView({
  rows,
  fiscalYearName,
  rangeStart,
  rangeEnd,
  baseCurrency,
  organizationBaseCurrency,
  totalsInOrganizationBase,
}: {
  rows: ProjectPeriodCloseRow[]
  fiscalYearName?: string
  rangeStart: string
  rangeEnd: string
  baseCurrency: string
  organizationBaseCurrency: string
  totalsInOrganizationBase: boolean
}) {
  const amountBasis =
    totalsInOrganizationBase || baseCurrency === organizationBaseCurrency
      ? `organization base (${baseCurrency})`
      : `journal book currency (${baseCurrency}); organization reporting is ${organizationBaseCurrency}`

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-lg border border-border/60 bg-muted/15 px-4 py-3">
        <p className="text-sm font-medium text-foreground">
          {fiscalYearName ? `${fiscalYearName} · ` : ''}
          {formatDate(rangeStart, 'short')} → {formatDate(rangeEnd, 'short')}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          For each fiscal period: <span className="font-medium text-foreground/90">from → to</span> (posting dates),{' '}
          <span className="font-medium text-foreground/90">how many</span> posted voucher documents for this project,{' '}
          <span className="font-medium text-foreground/90">voucher number</span> range, and{' '}
          <span className="font-medium text-foreground/90">total amount</span> in {baseCurrency} ({amountBasis}).
          {' '}
          When totals follow a project journal book, that currency comes from the active journal(s) for the project (see{' '}
          <span className="font-medium text-foreground/90">Journal entries → journal books</span>
          ); active codes are maintained under{' '}
          <Link href="/general-ledger/currency" className="font-medium text-primary underline underline-offset-2">
            General Ledger → Currency
          </Link>
          .
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row, i) => {
          const fp = row.fiscal_period
          const h = periodHue(i)
          const from = row.voucher_number_from
          const to = row.voucher_number_to
          const n = row.posted_voucher_count ?? 0
          const amt = row.total_base_amount != null ? Number(row.total_base_amount) : 0

          return (
            <div
              key={fp.id}
              className="flex min-h-0 flex-col gap-3 rounded-lg border border-border/60 bg-card p-4 shadow-sm"
              style={{ borderLeftWidth: 4, borderLeftColor: `hsl(${h} 42% 42%)` }}
            >
              <div className="min-w-0">
                <p className="font-semibold leading-tight text-foreground">{fp.name}</p>
                <p className="text-[11px] text-muted-foreground">Period {fp.period_number}</p>
              </div>

              <dl className="space-y-2.5 text-sm">
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Period (from → to)
                  </dt>
                  <dd className="mt-0.5 tabular-nums text-foreground">
                    {formatDate(fp.start_date, 'short')} → {formatDate(fp.end_date, 'short')}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Posted documents
                  </dt>
                  <dd className="mt-0.5 text-foreground">
                    {n} {n === 1 ? 'voucher' : 'vouchers'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Voucher numbers
                  </dt>
                  <dd className="mt-0.5 font-mono text-xs tabular-nums text-foreground">
                    {from && to ? (
                      <>
                        {from} → {to}
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Total ({baseCurrency})
                  </dt>
                  <dd className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
                    {formatCurrency(amt, baseCurrency)}
                  </dd>
                </div>
              </dl>

              <div className="mt-auto border-t border-border/50 pt-2">
                <p className="text-[11px] text-muted-foreground">Org period</p>
                <Badge variant="outline" className="mt-1 font-normal text-[11px]">
                  {orgPeriodLabel(fp.status)}
                </Badge>
                <p className="mt-2 text-[11px] text-muted-foreground">Project close state</p>
                <div className="mt-1 flex flex-col gap-1">
                  <Badge
                    variant={projectCloseStateBadgeVariant(getProjectCloseState(row))}
                    className="w-fit font-normal text-[11px]"
                  >
                    {projectCloseStateShortLabel(getProjectCloseState(row))}
                  </Badge>
                  <p className="text-xs leading-snug text-muted-foreground">{projectCloseStateDescription(row)}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function PeriodClosePage() {
  const { toast } = useToast()
  const user = useAuthStore((s) => s.user)
  const canView =
    !!user?.is_super_admin ||
    user?.permissions?.includes('view-period-close') ||
    user?.permissions?.includes('manage-period-close') ||
    user?.permissions?.includes('permanently-lock-period-close')
  const canManageTemporary =
    !!user?.is_super_admin || !!user?.permissions?.includes('manage-period-close')
  const canManagePermanent =
    !!user?.is_super_admin || !!user?.permissions?.includes('permanently-lock-period-close')
  const canAnyManage = canManageTemporary || canManagePermanent
  const isSuperAdmin =
    !!user?.is_super_admin || !!user?.roles?.some((r) => r.name === 'super-admin')

  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([])
  const [projects, setProjects] = useState<{ id: number; project_code: string; project_name: string }[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [selectedYearId, setSelectedYearId] = useState<string>('')
  const [rows, setRows] = useState<ProjectPeriodCloseRow[]>([])
  const [overviewMeta, setOverviewMeta] = useState<{
    base_currency: string
    organization_base_currency: string
    totals_in_organization_base: boolean
    fiscal_year: { start_date: string; end_date: string } | null
  }>({
    base_currency: 'AFN',
    organization_base_currency: 'AFN',
    totals_in_organization_base: true,
    fiscal_year: null,
  })
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const [singleDialog, setSingleDialog] = useState<{ mode: DialogMode; row: ProjectPeriodCloseRow | null }>({
    mode: null,
    row: null,
  })
  const [bulkDialog, setBulkDialog] = useState<BulkMode>(null)
  const [viewTab, setViewTab] = useState<'list' | 'summary'>('list')

  useEffect(() => {
    void (async () => {
      try {
        const data = await getFiscalYears()
        setFiscalYears(data)
        if (data.length > 0) {
          setSelectedYearId((prev) => prev || String((data.find((y) => y.is_current) ?? data[0]).id))
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: handleApiError(error),
          variant: 'destructive',
        })
      }
    })()
  }, [toast])

  useEffect(() => {
    void (async () => {
      try {
        const res = (await getProjects({
          per_page: 400,
          status: 'active',
          all_offices: true,
        })) as { data?: { id: number; project_code: string; project_name: string }[] }
        const list = res?.data ?? []
        setProjects(Array.isArray(list) ? list : [])
      } catch (error) {
        toast({
          title: 'Error',
          description: handleApiError(error),
          variant: 'destructive',
        })
      }
    })()
  }, [toast])

  const loadOverview = useCallback(async () => {
    if (!selectedProjectId || !selectedYearId) {
      setRows([])
      setOverviewMeta({
        base_currency: 'AFN',
        organization_base_currency: 'AFN',
        totals_in_organization_base: true,
        fiscal_year: null,
      })
      return
    }
    try {
      setOverviewLoading(true)
      const overview: ProjectPeriodCloseOverview = await getProjectPeriodCloseOverview(
        parseInt(selectedProjectId, 10),
        parseInt(selectedYearId, 10)
      )
      setRows(overview.periods)
      const orgBase = overview.organization_base_currency ?? overview.base_currency ?? 'AFN'
      setOverviewMeta({
        base_currency: overview.base_currency ?? 'AFN',
        organization_base_currency: orgBase,
        totals_in_organization_base: overview.totals_in_organization_base !== false,
        fiscal_year: overview.fiscal_year ?? null,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: handleApiError(error),
        variant: 'destructive',
      })
      setRows([])
      setOverviewMeta({
        base_currency: 'AFN',
        organization_base_currency: 'AFN',
        totals_in_organization_base: true,
        fiscal_year: null,
      })
    } finally {
      setOverviewLoading(false)
    }
  }, [selectedProjectId, selectedYearId, toast])

  useEffect(() => {
    setSelectedIds([])
    if (selectedProjectId && selectedYearId) {
      void loadOverview()
    } else {
      setRows([])
    }
  }, [selectedProjectId, selectedYearId, loadOverview])

  const selectedRows = useMemo(
    () => rows.filter((r) => selectedIds.includes(r.fiscal_period.id)),
    [rows, selectedIds]
  )

  const selectionStatuses = useMemo(() => {
    const s = new Set(
      selectedRows.map((r) => {
        if (r.fiscal_period.status !== 'open') return 'org_blocked'
        if (!r.project_period_status) return 'proj_open'
        return r.project_period_status
      })
    )
    return s
  }, [selectedRows])

  const homogeneousProjOpen =
    selectedIds.length > 0 &&
    selectionStatuses.size === 1 &&
    selectionStatuses.has('proj_open') &&
    selectedRows.every((r) => r.fiscal_period.status === 'open')
  const homogeneousProjClosed =
    selectedIds.length > 0 &&
    selectionStatuses.size === 1 &&
    selectionStatuses.has('closed') &&
    selectedRows.every((r) => r.fiscal_period.status === 'open')
  const mixedSelection = selectedIds.length > 0 && selectionStatuses.size > 1

  const counts = useMemo(() => {
    let openProj = 0
    let closedProj = 0
    let lockedProj = 0
    for (const r of rows) {
      if (r.fiscal_period.status !== 'open') continue
      if (!r.project_period_status) openProj++
      else if (r.project_period_status === 'closed') closedProj++
      else if (r.project_period_status === 'locked') lockedProj++
    }
    return { openProj, closedProj, lockedProj }
  }, [rows])

  const toggleSelect = (row: ProjectPeriodCloseRow) => {
    if (!canSelectPeriodRow(row, canManageTemporary, canManagePermanent)) return
    const id = row.fiscal_period.id
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const pid = selectedProjectId ? parseInt(selectedProjectId, 10) : 0

  const fyRange = useMemo((): { start: string; end: string } | null => {
    const y = fiscalYears.find((fy) => String(fy.id) === selectedYearId)
    if (y) return { start: y.start_date, end: y.end_date }
    const meta = overviewMeta.fiscal_year
    if (!meta) return null
    return { start: meta.start_date, end: meta.end_date }
  }, [fiscalYears, selectedYearId, overviewMeta.fiscal_year])

  const handleSingleConfirm = async () => {
    const row = singleDialog.row
    const mode = singleDialog.mode
    if (!row || !mode || !pid) return
    if (mode === 'lock' && !canManagePermanent) return
    if (mode === 'unlock-permanent' && !isSuperAdmin) return
    if ((mode === 'close' || mode === 'reopen') && !canManageTemporary) return
    try {
      setActionLoading(true)
      const fpId = row.fiscal_period.id
      if (mode === 'close') await closeProjectPosting(pid, fpId)
      else if (mode === 'reopen') await reopenProjectPosting(pid, fpId)
      else if (mode === 'lock') await lockProjectPosting(pid, fpId)
      else if (mode === 'unlock-permanent') await unlockPermanentProjectPosting(pid, fpId)
      toast({
        title: 'Success',
        description:
          mode === 'close'
            ? 'Project posting closed for this period.'
            : mode === 'reopen'
              ? 'Project posting reopened for this period.'
              : mode === 'unlock-permanent'
                ? 'Permanent lock removed. Posting is allowed for this project again.'
                : 'Project period locked permanently.',
      })
      setSingleDialog({ mode: null, row: null })
      setSelectedIds((ids) => ids.filter((id) => id !== fpId))
      await loadOverview()
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description:
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          handleApiError(error),
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleBulkConfirm = async () => {
    const mode = bulkDialog
    if (!mode || selectedRows.length === 0 || !pid) return
    if (mode === 'lock' && !canManagePermanent) return
    if ((mode === 'close' || mode === 'reopen') && !canManageTemporary) return
    if (mode === 'close' && !homogeneousProjOpen) {
      toast({
        title: 'Invalid selection',
        description: 'Bulk close applies only when the organization period is open and project posting is open.',
        variant: 'destructive',
      })
      return
    }
    if ((mode === 'reopen' || mode === 'lock') && !homogeneousProjClosed) {
      toast({
        title: 'Invalid selection',
        description:
          'Bulk reopen and lock apply only to periods closed for project posting (organization period open).',
        variant: 'destructive',
      })
      return
    }
    try {
      setActionLoading(true)
      const list = [...selectedRows]
      for (const r of list) {
        const fpId = r.fiscal_period.id
        if (mode === 'close') await closeProjectPosting(pid, fpId)
        else if (mode === 'reopen') await reopenProjectPosting(pid, fpId)
        else if (mode === 'lock') await lockProjectPosting(pid, fpId)
      }
      toast({ title: 'Bulk action completed', description: `${list.length} period(s) updated.` })
      setBulkDialog(null)
      setSelectedIds([])
      await loadOverview()
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description:
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          handleApiError(error),
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  if (!canView) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Card className="coa-ledger-card flex min-h-0 flex-1 flex-col overflow-hidden">
          <CardContent className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
            <ShieldAlert className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Period close is restricted</p>
            <p className="max-w-md text-sm text-muted-foreground">
              You do not have permission to view this screen. Ask an administrator to grant &quot;View Period
              Close&quot;, &quot;Manage Period Close (temporary)&quot;, or &quot;Permanently Lock Period
              Close&quot; (Finance Director and Super Admin have access by default).
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <h2 className="sr-only">Period close by project</h2>
        <Card className="coa-ledger-card flex min-h-0 flex-1 flex-col overflow-hidden">
            <Tabs
            value={viewTab}
            onValueChange={(v) => setViewTab(v as 'list' | 'summary')}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
          <div className="coa-toolbar shrink-0 px-3 py-1.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <div className="flex flex-col gap-0.5">
                  <Label htmlFor="period-close-project" className="sr-only">
                    Project
                  </Label>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger
                      id="period-close-project"
                      className="h-8 w-[min(100%,260px)] border-border/80 bg-background text-xs sm:w-[260px]"
                    >
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.project_code} — {p.project_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-0.5">
                  <Label htmlFor="period-close-fy" className="sr-only">
                    Fiscal year
                  </Label>
                  <Select
                    value={selectedYearId}
                    onValueChange={setSelectedYearId}
                    disabled={fiscalYears.length === 0}
                  >
                    <SelectTrigger
                      id="period-close-fy"
                      className="h-8 w-[min(100%,200px)] border-border/80 bg-background text-xs sm:w-[200px]"
                    >
                      <SelectValue placeholder="Fiscal year" />
                    </SelectTrigger>
                    <SelectContent>
                      {fiscalYears.map((y) => (
                        <SelectItem key={y.id} value={y.id.toString()}>
                          {y.name}
                          {y.is_current && ' (Current)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void loadOverview()}
                  disabled={overviewLoading || !selectedProjectId || !selectedYearId}
                  className="h-8 px-2"
                  aria-label="Refresh period list"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', overviewLoading && 'animate-spin')} />
                </Button>
              </div>
              {rows.length > 0 && (
                <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  <span title="Posting open for project">
                    <span className="font-medium text-foreground">{counts.openProj}</span> opened
                  </span>
                  <span className="text-border" aria-hidden>
                    |
                  </span>
                  <span title="Closed for posting; can reopen or lock permanently">
                    <span className="font-medium text-foreground">{counts.closedProj}</span> temp. locked
                  </span>
                  <span className="text-border" aria-hidden>
                    |
                  </span>
                  <span title="Cannot reopen for posting">
                    <span className="font-medium text-foreground">{counts.lockedProj}</span> perm. locked
                  </span>
                  <span className="text-border" aria-hidden>
                    |
                  </span>
                  <span
                    className="text-[10px] text-muted-foreground/90 max-w-[min(100%,280px)] text-right leading-snug"
                    title={
                      overviewMeta.totals_in_organization_base
                        ? 'Totals in organization base currency'
                        : `Totals in journal book currency (${overviewMeta.base_currency}). Posted vouchers in ${overviewMeta.base_currency} only. Org reporting currency: ${overviewMeta.organization_base_currency}.`
                    }
                  >
                    {!overviewMeta.totals_in_organization_base &&
                    overviewMeta.organization_base_currency !== overviewMeta.base_currency ? (
                      <>
                        Journal: {overviewMeta.base_currency} · Org: {overviewMeta.organization_base_currency}
                      </>
                    ) : (
                      <>Base: {overviewMeta.base_currency}</>
                    )}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-1.5">
              <TabsList className="h-8 w-auto min-w-0 bg-muted/50 p-0.5">
                <TabsTrigger value="list" className="h-7 gap-1 px-2.5 text-xs">
                  <LayoutList className="h-3.5 w-3.5" />
                  List
                </TabsTrigger>
                <TabsTrigger
                  value="summary"
                  className="h-7 gap-1 px-2.5 text-xs"
                  disabled={!selectedProjectId || !selectedYearId || rows.length === 0}
                >
                  <CalendarRange className="h-3.5 w-3.5" />
                  Summary
                </TabsTrigger>
              </TabsList>
              {!canAnyManage && (
                <p className="text-[11px] text-muted-foreground">
                  Read-only: <span className="font-medium text-foreground">Manage Period Close (temporary)</span>{' '}
                  is required to close or reopen;{' '}
                  <span className="font-medium text-foreground">Permanently Lock Period Close</span> is required to
                  lock permanently.
                </p>
              )}
              {canAnyManage && !canManageTemporary && (
                <p className="text-[11px] text-muted-foreground">
                  You can permanently lock temporarily closed periods only. Close and reopen require{' '}
                  <span className="font-medium text-foreground">Manage Period Close (temporary)</span>.
                </p>
              )}
              {canManageTemporary && !canManagePermanent && (
                <p className="text-[11px] text-muted-foreground">
                  Permanent lock requires{' '}
                  <span className="font-medium text-foreground">Permanently Lock Period Close</span> (Super Admin and
                  Finance Director by default).
                </p>
              )}
            </div>

            {selectedIds.length > 0 && canAnyManage && (
              <div className="mt-1.5 flex flex-col gap-2 border-t border-border/60 pt-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {selectedIds.length} selected
                  {mixedSelection && (
                    <span className="text-amber-700 dark:text-amber-500">
                      {' '}
                      — same project-posting state only (all open for project, or all closed).
                    </span>
                  )}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 text-xs"
                    disabled={actionLoading || !canManageTemporary || !homogeneousProjOpen}
                    onClick={() => setBulkDialog('close')}
                  >
                    <Lock className="h-3.5 w-3.5 mr-1" />
                    Close project posting
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    disabled={actionLoading || !canManageTemporary || !homogeneousProjClosed}
                    onClick={() => setBulkDialog('reopen')}
                  >
                    <Unlock className="h-3.5 w-3.5 mr-1" />
                    Reopen
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    disabled={actionLoading || !canManagePermanent || !homogeneousProjClosed}
                    onClick={() => setBulkDialog('lock')}
                  >
                    <ShieldAlert className="h-3.5 w-3.5 mr-1" />
                    Lock
                  </Button>
                </div>
              </div>
            )}
          </div>

          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
              <TabsContent value="list" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden">
                <div
                  className="voucher-sheet-grid relative min-h-0 flex-1 overflow-y-auto overflow-x-auto overscroll-contain"
                  role="region"
                  aria-label="Project fiscal periods"
                >
                  <div className="coa-ledger-table-frame w-full min-w-0">
                    {!selectedProjectId ? (
                      <div className="py-10 px-4 text-center text-sm text-muted-foreground">
                        Select a project to load fiscal periods.
                      </div>
                    ) : overviewLoading && rows.length === 0 ? (
                      <div className="space-y-2 p-4">
                        {[...Array(6)].map((_, i) => (
                          <Skeleton key={i} className="h-9 w-full" />
                        ))}
                      </div>
                    ) : !selectedYearId ? (
                      <div className="py-10 px-4 text-center text-sm text-muted-foreground">
                        Select a fiscal year.
                      </div>
                    ) : rows.length === 0 ? (
                      <div className="py-10 px-4 text-center text-sm text-muted-foreground">
                        No periods for this fiscal year. Create a fiscal year with periods first.
                      </div>
                    ) : (
                      <table className="w-full min-w-[1020px] border-collapse text-sm">
                        <thead className="coa-ledger-thead sticky top-0 z-10">
                          <tr>
                            <th
                              scope="col"
                              className="w-10 py-2 px-2 text-center text-xs font-semibold uppercase tracking-wider"
                            >
                              <span className="sr-only">Select</span>
                            </th>
                            <th
                              scope="col"
                              className="py-2 px-3 text-left text-xs font-semibold uppercase tracking-wider"
                            >
                              Period
                            </th>
                            <th
                              scope="col"
                              className="min-w-[200px] py-2 px-3 text-left text-xs font-semibold uppercase tracking-wider"
                            >
                              Vouchers (posted)
                            </th>
                            <th
                              scope="col"
                              className="w-36 py-2 px-3 text-right text-xs font-semibold uppercase tracking-wider"
                            >
                              Total ({overviewMeta.base_currency})
                            </th>
                            <th
                              scope="col"
                              className="w-36 py-2 px-3 text-center text-xs font-semibold uppercase tracking-wider"
                            >
                              Org period
                            </th>
                            <th
                              scope="col"
                              className="min-w-[200px] py-2 px-3 text-left text-xs font-semibold uppercase tracking-wider"
                            >
                              Project close state
                            </th>
                            <th
                              scope="col"
                              className="w-40 py-2 px-3 text-left text-xs font-semibold uppercase tracking-wider"
                            >
                              Closed for project
                            </th>
                            <th
                              scope="col"
                              className="w-[200px] py-2 px-3 text-right text-xs font-semibold uppercase tracking-wider"
                            >
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => {
                            const fp = row.fiscal_period
                            const orgOpen = fp.status === 'open'
                            const voucherFrom = row.voucher_number_from
                            const voucherTo = row.voucher_number_to
                            const totalAmt =
                              row.total_base_amount != null ? Number(row.total_base_amount) : 0
                            return (
                              <tr
                                key={fp.id}
                                className="coa-ledger-table-row border-b border-border/70 bg-white dark:bg-card"
                              >
                                <td className="w-10 py-2 px-2 text-center align-middle">
                                  {canSelectPeriodRow(row, canManageTemporary, canManagePermanent) ? (
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 rounded border-input accent-primary"
                                      checked={selectedIds.includes(fp.id)}
                                      onChange={() => toggleSelect(row)}
                                      aria-label={`Select ${fp.name}`}
                                    />
                                  ) : (
                                    <span className="inline-block w-4" aria-hidden />
                                  )}
                                </td>
                                <td className="py-2 px-3 align-top">
                                  <div className="flex items-start gap-2">
                                    <div className="mt-0.5 rounded bg-muted p-1.5 shrink-0">
                                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-medium leading-tight">{fp.name}</p>
                                      <p className="text-[11px] text-muted-foreground">
                                        P{fp.period_number} · {fp.start_date} – {fp.end_date}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2 px-3 align-middle text-xs">
                                  {voucherFrom && voucherTo ? (
                                    <span className="font-mono text-[11px]">
                                      {voucherFrom} → {voucherTo}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                  <span className="text-muted-foreground"> · {row.posted_voucher_count ?? 0}</span>
                                </td>
                                <td className="py-2 px-3 text-right align-middle">
                                  <span className="font-mono text-xs tabular-nums">
                                    {formatCurrency(totalAmt, overviewMeta.base_currency)}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-center align-middle">
                                  <Badge variant="outline" className="font-normal text-[11px]">
                                    {orgPeriodLabel(fp.status)}
                                  </Badge>
                                </td>
                                <td className="max-w-[280px] py-2 px-3 align-middle text-xs leading-snug">
                                  {orgOpen ? (
                                    <div className="flex flex-col gap-1.5">
                                      <Badge
                                        variant={projectCloseStateBadgeVariant(getProjectCloseState(row))}
                                        className="w-fit font-normal text-[11px]"
                                      >
                                        {projectCloseStateShortLabel(getProjectCloseState(row))}
                                      </Badge>
                                      <span className="text-[11px] leading-snug text-muted-foreground">
                                        {projectCloseStateDescription(row)}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 align-middle text-xs text-muted-foreground">
                                  {row.project_closed_at && row.project_period_status
                                    ? formatDate(row.project_closed_at, 'readable')
                                    : '—'}
                                </td>
                                <td className="py-2 px-3 text-right align-middle">
                                  <div className="flex flex-wrap justify-end gap-1">
                                    {orgOpen && !row.project_period_status && canManageTemporary && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 gap-1 px-2 text-xs"
                                        onClick={() => setSingleDialog({ mode: 'close', row })}
                                        disabled={actionLoading}
                                      >
                                        <Lock className="h-3.5 w-3.5" />
                                        Close for project
                                      </Button>
                                    )}
                                    {orgOpen && row.project_period_status === 'closed' && (
                                      <>
                                        {canManageTemporary && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 gap-1 px-2 text-xs"
                                            onClick={() => setSingleDialog({ mode: 'reopen', row })}
                                            disabled={actionLoading}
                                          >
                                            <Unlock className="h-3.5 w-3.5" />
                                            Reopen
                                          </Button>
                                        )}
                                        {canManagePermanent && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 gap-1 px-2 text-xs"
                                            onClick={() => setSingleDialog({ mode: 'lock', row })}
                                            disabled={actionLoading}
                                          >
                                            <ShieldAlert className="h-3.5 w-3.5" />
                                            Lock
                                          </Button>
                                        )}
                                      </>
                                    )}
                                    {orgOpen && row.project_period_status === 'locked' && (
                                      <>
                                        {isSuperAdmin ? (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 gap-1 px-2 text-xs border-amber-600/60 text-amber-900 dark:text-amber-100"
                                            onClick={() => setSingleDialog({ mode: 'unlock-permanent', row })}
                                            disabled={actionLoading}
                                          >
                                            <Unlock className="h-3.5 w-3.5" />
                                            Remove permanent lock
                                          </Button>
                                        ) : (
                                          <span className="text-[11px] text-muted-foreground px-1 py-1">—</span>
                                        )}
                                      </>
                                    )}
                                    {!orgOpen && (
                                      <span className="text-[11px] text-muted-foreground px-1 py-1">
                                        Org period closed
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="summary" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden">
                <div className="min-h-0 flex-1 overflow-y-auto overflow-x-auto overscroll-contain">
                  {!fyRange ? (
                    <div className="py-10 px-4 text-center text-sm text-muted-foreground">
                      Select a project and fiscal year to see the summary.
                    </div>
                  ) : (
                    <PeriodCloseSummaryView
                      rows={rows}
                      fiscalYearName={fiscalYears.find((x) => String(x.id) === selectedYearId)?.name}
                      rangeStart={fyRange.start}
                      rangeEnd={fyRange.end}
                      baseCurrency={overviewMeta.base_currency}
                      organizationBaseCurrency={overviewMeta.organization_base_currency}
                      totalsInOrganizationBase={overviewMeta.totals_in_organization_base}
                    />
                  )}
                </div>
              </TabsContent>
          </CardContent>
          </Tabs>
        </Card>
      </div>

      <AlertDialog
        open={singleDialog.mode !== null && !!singleDialog.row}
        onOpenChange={(open) => !open && setSingleDialog({ mode: null, row: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {singleDialog.mode === 'close' && 'Close posting for project'}
              {singleDialog.mode === 'reopen' && 'Reopen posting for project'}
              {singleDialog.mode === 'lock' && 'Lock project period permanently'}
              {singleDialog.mode === 'unlock-permanent' && 'Remove permanent lock (Super Admin)'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                {singleDialog.mode === 'close' && (
                  <>
                    <p>
                      Close project posting for &quot;{singleDialog.row?.fiscal_period.name}&quot;? Vouchers and journal
                      lines tagged with this project will not post for this calendar period until reopened or locked.
                    </p>
                    <p>Organization period must remain open; this control is specific to the selected project.</p>
                  </>
                )}
                {singleDialog.mode === 'reopen' && (
                  <p>
                    Reopen project posting for &quot;{singleDialog.row?.fiscal_period.name}&quot;? Posting for this
                    project in this period will be allowed again.
                  </p>
                )}
                {singleDialog.mode === 'lock' && (
                  <>
                    <p className="font-medium text-foreground">
                      Permanently lock project posting for &quot;{singleDialog.row?.fiscal_period.name}&quot;? Vouchers
                      and journal lines for this project will stay blocked until a Super Admin removes the lock.
                    </p>
                    <p>Use after audit or donor reporting sign-off for this project.</p>
                    <p className="text-xs">
                      Requires <span className="font-medium text-foreground/90">Permanently Lock Period Close</span>{' '}
                      (or Super Admin).
                    </p>
                  </>
                )}
                {singleDialog.mode === 'unlock-permanent' && (
                  <>
                    <p>
                      Remove the permanent lock for &quot;{singleDialog.row?.fiscal_period.name}&quot;? Posting for this
                      project in this period will be allowed again (same as reopening a temporarily closed period).
                    </p>
                    <p className="text-xs font-medium text-foreground">Super Admin only.</p>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleSingleConfirm()} disabled={actionLoading}>
              {singleDialog.mode === 'close' && 'Close for project'}
              {singleDialog.mode === 'reopen' && 'Reopen'}
              {singleDialog.mode === 'lock' && 'Lock permanently'}
              {singleDialog.mode === 'unlock-permanent' && 'Remove lock'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDialog !== null} onOpenChange={(open) => !open && setBulkDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkDialog === 'close' && `Close project posting for ${selectedRows.length} period(s)`}
              {bulkDialog === 'reopen' && `Reopen project posting for ${selectedRows.length} period(s)`}
              {bulkDialog === 'lock' && `Lock project posting for ${selectedRows.length} period(s)`}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                {bulkDialog === 'close' && (
                  <p>Close project posting for all selected periods where the organization period is open.</p>
                )}
                {bulkDialog === 'reopen' && <p>Reopen project posting for all selected closed periods.</p>}
                {bulkDialog === 'lock' && (
                  <>
                    <p className="font-medium text-foreground">
                      Permanently lock project posting for all selected periods?
                    </p>
                    <p>Posting stays blocked until a Super Admin removes the lock from Period Close.</p>
                    <p className="text-xs">
                      Requires <span className="font-medium text-foreground/90">Permanently Lock Period Close</span>{' '}
                      (or Super Admin).
                    </p>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleBulkConfirm()} disabled={actionLoading}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
