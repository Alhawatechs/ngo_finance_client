'use client'

import React, { useMemo, useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { displayCurrencyForAccount } from '@/lib/account-display-currency'
import { FileText, Download, Printer, RefreshCw } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { VoucherPostingAccountCombo } from '@/components/finance/VoucherPostingAccountCombo'
import { PrintableReportHeader } from '@/components/ui/report-header'
import { getAccountsTree, flattenAccountsTree } from '@/lib/api/chart-of-accounts'
import { getGeneralLedger } from '@/lib/api/reports'
import { getProjects, type Project } from '@/lib/api/projects'
import { getOffices } from '@/lib/api/offices'
import { useToast } from '@/components/ui/use-toast'
import { ChartOfAccountsPageFrame } from '@/components/finance/ChartOfAccountsPageFrame'
import { useChartOfAccountsPermissions } from '@/hooks/useChartOfAccountsPermissions'
import { useOrganizationStore } from '@/stores/organizationStore'
import type { ChartOfAccount } from '@/types'

const EMPTY_ACCOUNTS_TREE: ChartOfAccount[] = []

/** Display label for project dropdowns (matches Financial Reports / voucher UX). */
function formatProjectLabel(p: Pick<Project, 'id' | 'project_code' | 'project_name'>): string {
  const code = (p.project_code ?? '').trim()
  const name = (p.project_name ?? '').trim()
  if (name && code && name !== code) return `${name} (${code})`
  return name || code || `Project ${p.id}`
}

function normalizeProjectsResponse(raw: unknown): Project[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw as Project[]
  const d = raw as { data?: Project[] }
  return Array.isArray(d.data) ? d.data : []
}

interface GLReport {
  report_type?: string
  report_currency?: string
  account?: { code?: string; name?: string }
  period?: { start_date?: string; end_date?: string }
  opening_balance?: number
  closing_balance?: number
  total_debit?: number
  total_credit?: number
  transactions?: Array<Record<string, unknown>>
}

const defaultStartDate = () => {
  const d = new Date()
  d.setMonth(0)
  d.setDate(1)
  return d.toISOString().split('T')[0]
}
const defaultEndDate = () => new Date().toISOString().split('T')[0]

function AccountStatementPageContent() {
  const { canViewAccountStatement } = useChartOfAccountsPermissions()
  const organization = useOrganizationStore((s) => s.organization)
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const reportRef = useRef<HTMLDivElement>(null)
  const [accountId, setAccountId] = useState<string>(() => searchParams.get('account_id') ?? '')
  const [startDate, setStartDate] = useState(() => searchParams.get('start_date') ?? defaultStartDate())
  const [endDate, setEndDate] = useState(() => searchParams.get('end_date') ?? defaultEndDate())
  const [projectId, setProjectId] = useState<string>(() => searchParams.get('project_id') ?? 'all')
  const [officeId, setOfficeId] = useState<string>(() => searchParams.get('office_id') ?? 'all')

  // Sync from URL when navigating with query params (e.g. from Chart of Accounts "View statement")
  useEffect(() => {
    const aid = searchParams.get('account_id')
    const start = searchParams.get('start_date')
    const end = searchParams.get('end_date')
    const pid = searchParams.get('project_id')
    const oid = searchParams.get('office_id')
    if (aid) setAccountId(aid)
    if (start) setStartDate(start)
    if (end) setEndDate(end)
    if (pid) setProjectId(pid)
    if (oid) setOfficeId(oid)
  }, [searchParams])

  const { data: treeData, isLoading: treeLoading } = useQuery({
    queryKey: ['chart-of-accounts-tree'],
    queryFn: () => getAccountsTree(),
  })

  const { data: projectsResponse } = useQuery({
    queryKey: ['projects-list-statement'],
    queryFn: () => getProjects({ per_page: 500, status: 'active', all_offices: true }),
    staleTime: 10 * 60 * 1000,
  })

  const projectsRaw = useMemo(() => {
    const list = normalizeProjectsResponse(projectsResponse)
    return [...list].sort((a, b) =>
      (a.project_code ?? '').localeCompare(b.project_code ?? '', undefined, { numeric: true, sensitivity: 'base' })
    )
  }, [projectsResponse])

  const projectsForSelect = useMemo(() => {
    if (officeId === 'all') return projectsRaw
    const oid = Number(officeId)
    return projectsRaw.filter((p) => p.office_id === oid)
  }, [projectsRaw, officeId])

  const selectedProject = useMemo(() => {
    if (projectId === 'all') return undefined
    return projectsRaw.find((p) => p.id === Number(projectId))
  }, [projectsRaw, projectId])

  const projectLabelById = useMemo(() => {
    const m = new Map<number, string>()
    for (const p of projectsRaw) {
      m.set(p.id, formatProjectLabel(p))
    }
    return m
  }, [projectsRaw])

  /** When office filter changes, clear project if it is not under that office. */
  useEffect(() => {
    if (projectId === 'all') return
    const allowed = projectsForSelect.some((p) => p.id === Number(projectId))
    if (!allowed) setProjectId('all')
  }, [projectsForSelect, projectId])

  const { data: officesList } = useQuery({
    queryKey: ['offices-list-statement'],
    queryFn: () => getOffices({ per_page: 200, is_active: true }),
    staleTime: 10 * 60 * 1000,
  })
  const offices = useMemo(() => (Array.isArray(officesList) ? officesList : []), [officesList])

  const selectedOffice = useMemo(() => {
    if (officeId === 'all') return undefined
    return offices.find((o) => o.id === Number(officeId))
  }, [offices, officeId])

  const scopeSummary = useMemo(() => {
    const parts: string[] = []
    if (selectedProject) parts.push(`Project: ${formatProjectLabel(selectedProject)}`)
    if (selectedOffice) {
      const oc = (selectedOffice.code ?? '').trim()
      parts.push(oc ? `Office: ${selectedOffice.name} (${oc})` : `Office: ${selectedOffice.name}`)
    }
    return parts.join(' · ')
  }, [selectedProject, selectedOffice])

  const showProjectColumn = projectId === 'all'

  const lineProjectLabel = (tx: Record<string, unknown>) => {
    const pid = tx.project_id as number | undefined | null
    if (pid == null || pid === 0) return '—'
    return projectLabelById.get(pid) ?? `#${pid}`
  }

  const accountsTreeRoot = useMemo(() => {
    if (treeData?.success && treeData?.data?.length) return treeData.data
    return EMPTY_ACCOUNTS_TREE
  }, [treeData])

  const postingAccounts = useMemo(() => {
    if (!treeData?.success || !treeData?.data) return []
    return flattenAccountsTree(treeData.data).filter((a: ChartOfAccount) => a.is_posting && a.is_active)
  }, [treeData])

  const postingsById = useMemo(() => {
    const m = new Map<number, ChartOfAccount>()
    for (const a of postingAccounts) {
      m.set(a.id, a)
    }
    return m
  }, [postingAccounts])

  const projectIdNum = projectId === 'all' ? undefined : Number(projectId)
  const officeIdNum = officeId === 'all' ? undefined : Number(officeId)

  const { data: glData, isLoading: glLoading, refetch } = useQuery({
    queryKey: ['general-ledger', accountId, startDate, endDate, projectIdNum, officeIdNum],
    queryFn: () =>
      getGeneralLedger({
        account_id: Number(accountId),
        start_date: startDate,
        end_date: endDate,
        project_id: projectIdNum,
        office_id: officeIdNum,
      }),
    enabled: !!accountId && !!startDate && !!endDate,
  })

  const report: GLReport | null = glData?.data ?? null
  const selectedAccountForStatement = accountId ? postingsById.get(Number(accountId)) : undefined
  const currency =
    report?.report_currency ??
    displayCurrencyForAccount(selectedAccountForStatement, organization?.default_currency ?? 'AFN')

  const handlePrint = () => {
    window.print()
  }

  const handleExportCSV = () => {
    if (!report?.transactions?.length) {
      toast({ title: 'No data', description: 'Generate a statement first.', variant: 'destructive' })
      return
    }
    const headers = showProjectColumn
      ? ['Date', 'Reference', 'Description', 'Project', 'Debit', 'Credit', 'Running Balance']
      : ['Date', 'Reference', 'Description', 'Debit', 'Credit', 'Running Balance']
    const rows = (report.transactions ?? []).map((tx: Record<string, unknown>) => {
      const je = (tx.journal_entry ?? tx) as Record<string, unknown>
      const pid = tx.project_id as number | undefined | null
      const projCell =
        pid != null && pid !== 0 ? (projectLabelById.get(pid) ?? String(pid)).replace(/"/g, '""') : ''
      const base = [
        formatDate(String(je.entry_date ?? tx.entry_date ?? '')),
        String(je.entry_number ?? tx.entry_number ?? ''),
        `"${String(je.description ?? tx.description ?? '').replace(/"/g, '""')}"`,
      ]
      if (showProjectColumn) base.push(`"${projCell}"`)
      base.push(
        String((tx.report_debit as number) > 0 ? (tx.report_debit as number) : ''),
        String((tx.report_credit as number) > 0 ? (tx.report_credit as number) : ''),
        String((tx.running_balance as number) ?? 0)
      )
      return base.join(',')
    })
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `account-statement-${report?.account?.code ?? 'account'}-${startDate}-${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Exported', description: 'Statement exported as CSV.' })
  }

  return (
    <ChartOfAccountsPageFrame title="Account statement" className="gap-3">
      <Card className="coa-ledger-card shrink-0 shadow-sm">
        <div className="coa-toolbar border-b border-border/80 px-3 py-1.5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Report parameters</p>
          <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2 min-w-[280px]">
            <Label htmlFor="account-statement-account">Account</Label>
            <div className="account-statement-account-search flex h-9 min-w-[280px] w-full max-w-[min(28rem,100%)] shrink-0 items-stretch overflow-hidden rounded-lg border border-neutral-200/90 bg-white shadow-sm dark:border-border dark:bg-slate-950">
              <div className="flex min-h-0 min-w-0 flex-1 items-stretch bg-white dark:bg-slate-950">
                <VoucherPostingAccountCombo
                  id="account-statement-account"
                  value={accountId ? Number(accountId) : 0}
                  onChange={(id) => setAccountId(id > 0 ? String(id) : '')}
                  accounts={postingAccounts}
                  accountsById={postingsById}
                  accountsTree={accountsTreeRoot}
                  allowClear
                  showSearchIcon
                  plainSearchBox
                  baseCurrency={organization?.default_currency ?? 'AFN'}
                  disabled={treeLoading || !canViewAccountStatement}
                  emptyLabel="Search Account"
                  inputClassName="text-sm font-sans leading-snug text-foreground placeholder:italic"
                  triggerClassName={cn('h-9 min-h-9 rounded-none py-0 shadow-none', accountId && 'font-medium')}
                />
              </div>
            </div>
          </div>
          <div className="space-y-2 min-w-[160px]">
            <Label>Office</Label>
            <Select value={officeId} onValueChange={setOfficeId} disabled={!canViewAccountStatement}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All offices" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All offices</SelectItem>
                {offices.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {(o.code ?? '').trim() ? `${o.name} (${o.code})` : o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 min-w-[220px] max-w-[min(22rem,100%)]">
            <Label>Project (scope)</Label>
            <Select value={projectId} onValueChange={setProjectId} disabled={!canViewAccountStatement}>
              <SelectTrigger className="h-9 [&>span]:min-w-0 [&>span]:truncate [&>span]:text-left">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Organization (all projects)</SelectItem>
                {projectsForSelect.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {formatProjectLabel(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>From date</Label>
            <DatePicker value={startDate} onChange={setStartDate} className="w-[160px] h-9" disabled={!canViewAccountStatement} />
          </div>
          <div className="space-y-2">
            <Label>To date</Label>
            <DatePicker value={endDate} onChange={setEndDate} minDate={startDate} className="w-[160px] h-9" disabled={!canViewAccountStatement} />
          </div>
          <Button onClick={() => refetch()} disabled={!canViewAccountStatement || !accountId || glLoading} className="h-9">
            {glLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            Generate
          </Button>
          </div>
        </div>
      </Card>

      {report && (
        <Card ref={reportRef} className="coa-ledger-card flex min-h-0 flex-1 flex-col overflow-hidden print:shadow-none print:border">
          <PrintableReportHeader
            title="Account Statement"
            subtitle={`${report.account?.code ?? ''} — ${report.account?.name ?? ''}${scopeSummary ? ` · ${scopeSummary}` : ''}`}
            period={`${formatDate(report.period?.start_date ?? '')} to ${formatDate(report.period?.end_date ?? '')} • ${currency}`}
            generatedAt={new Date().toLocaleString()}
          />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 print:pb-2">
            <div>
              <CardTitle className="text-lg">
                {report.account?.code} — {report.account?.name}
              </CardTitle>
              <CardDescription>
                {formatDate(report.period?.start_date ?? '')} to {formatDate(report.period?.end_date ?? '')} · {currency}
                {scopeSummary ? (
                  <span className="mt-1 block text-xs text-muted-foreground">{scopeSummary}</span>
                ) : null}
              </CardDescription>
            </div>
            <div className="flex gap-2 no-print">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col space-y-4 overflow-hidden">
            <div className="grid shrink-0 grid-cols-2 gap-4 rounded-lg bg-muted/40 p-4 sm:grid-cols-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Opening balance</p>
                <p className="font-mono font-semibold mt-0.5">{formatCurrency(report.opening_balance ?? 0, currency)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total debit</p>
                <p className="font-mono font-semibold mt-0.5">{formatCurrency(report.total_debit ?? 0, currency)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total credit</p>
                <p className="font-mono font-semibold mt-0.5">{formatCurrency(report.total_credit ?? 0, currency)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Closing balance</p>
                <p className="font-mono font-semibold mt-0.5">{formatCurrency(report.closing_balance ?? 0, currency)}</p>
              </div>
            </div>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <div className="voucher-sheet-grid min-h-0 flex-1 overflow-x-auto overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
                <div className="coa-ledger-table-frame w-full min-w-0">
                <table className="w-full text-sm">
                  <thead className="coa-ledger-thead sticky top-0 z-10">
                    <tr className="uppercase tracking-wider">
                      <th className="px-4 py-2 text-left font-semibold">Date</th>
                      <th className="px-4 py-2 text-left font-semibold">Reference</th>
                      <th className="px-4 py-2 text-left font-semibold">Description</th>
                      {showProjectColumn && (
                        <th className="px-4 py-2 text-left font-semibold">Project</th>
                      )}
                      <th className="px-4 py-2 text-right font-semibold">Debit</th>
                      <th className="px-4 py-2 text-right font-semibold">Credit</th>
                      <th className="px-4 py-2 text-right font-semibold">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.transactions ?? []).map((tx: Record<string, unknown>, idx: number) => {
                      const je = (tx.journal_entry ?? tx) as Record<string, unknown>
                      return (
                        <tr key={idx}>
                          <td className="px-4 py-2 whitespace-nowrap">{formatDate(String(je.entry_date ?? tx.entry_date ?? ''))}</td>
                          <td className="px-4 py-2 font-mono text-xs">{String(je.entry_number ?? tx.entry_number ?? '')}</td>
                          <td className="px-4 py-2 max-w-[200px] truncate" title={String(je.description ?? tx.description ?? '')}>
                            {String(je.description ?? tx.description ?? '')}
                          </td>
                          {showProjectColumn && (
                            <td
                              className="px-4 py-2 max-w-[200px] truncate text-xs text-muted-foreground"
                              title={lineProjectLabel(tx)}
                            >
                              {lineProjectLabel(tx)}
                            </td>
                          )}
                          <td className="px-4 py-2 text-right font-mono tabular-nums">
                            {(tx.report_debit as number) > 0 ? formatCurrency(tx.report_debit as number, currency) : '—'}
                          </td>
                          <td className="px-4 py-2 text-right font-mono tabular-nums">
                            {(tx.report_credit as number) > 0 ? formatCurrency(tx.report_credit as number, currency) : '—'}
                          </td>
                          <td className="px-4 py-2 text-right font-mono tabular-nums font-medium">
                            {formatCurrency((tx.running_balance as number) ?? 0, currency)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold">
                      <td className="px-4 py-2" colSpan={showProjectColumn ? 4 : 3}>Totals</td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums">{formatCurrency(report.total_debit ?? 0, currency)}</td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums">{formatCurrency(report.total_credit ?? 0, currency)}</td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums">{formatCurrency(report.closing_balance ?? 0, currency)}</td>
                    </tr>
                  </tfoot>
                </table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {accountId && !report && !glLoading && (
        <Card className="coa-ledger-card">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="font-medium text-muted-foreground">No transactions in the selected period</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try a different date range, account, office, or project scope.
            </p>
          </CardContent>
        </Card>
      )}

      {!accountId && (
        <Card className="coa-ledger-card border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="font-medium text-muted-foreground">Select an account to generate a statement</p>
            <p className="text-sm text-muted-foreground mt-1">Choose a posting account and date range above.</p>
          </CardContent>
        </Card>
      )}
    </ChartOfAccountsPageFrame>
  )
}

export default function AccountStatementPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[320px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <AccountStatementPageContent />
    </Suspense>
  )
}
