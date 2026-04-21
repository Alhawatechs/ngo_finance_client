'use client'
// @ts-nocheck - complex context typing
import React from 'react'
import Link from 'next/link'
import { useOrganizationStore } from '@/stores/organizationStore'
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
import { Plus, RefreshCw, Eye, Edit, Trash2, Search, FolderKanban, FileText, Receipt, BarChart3, Upload, FilePlus, FileEdit, X, FileWarning, AlertTriangle, Download, ChevronDown, FileSpreadsheet, FolderOpen, TrendingUp, Wallet, PieChart, CheckCircle, Paperclip, Calendar, Users, MapPin, Columns3 } from 'lucide-react'
import { ActionMenu } from '@/components/ui/action-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { ProjectsPageHeader } from '@/components/projects/PageHeader'
import { FinanceDataTable, FinanceDataTableHeader, FinanceDataTableTh, FinanceDataTableRow, FinanceDataTableTd, FinancePagination } from '@/components/finance/DataTable'
import { DocumentFileIcon } from '@/components/ui/document-file-icon'
import { getProjectStatusLabel, getProjectStatusColor, getGrantTypeLabel, calculateUtilization, type GrantDocumentType, GrantFormData } from '@/lib/api/projects'

/** Column id → display label for the column visibility dropdown */
const PROJECT_LIST_COLUMN_LABELS: Record<string, string> = {
  code: 'Code',
  grantCode: 'Grant Code',
  projectName: 'Project Name',
  donor: 'Donor',
  fundType: 'Fund Type',
  sector: 'Sector',
  location: 'Location',
  startDate: 'Start Date',
  endDate: 'End Date',
  currency: 'Currency',
  budget: 'Budget',
  spent: 'Spent',
  util: 'Util %',
  status: 'Status',
  attach: 'Attachments',
}

export function ProjectsPageBodyInner({ c }: { c: Record<string, any> }) {
  const organization = useOrganizationStore((s) => s.organization)
  const orgAbbr = organization?.short_name || organization?.name
  const projectListLabel = orgAbbr ? `${orgAbbr}'s Project List` : 'Project List'
  const columnVisibility = c.columnVisibility ?? {}
  const setColumnVisibility = c.setColumnVisibility
  const visible = (id: string) => columnVisibility[id] !== false
  const columnIds = (c.projectListVisibleColumnIds ?? Object.keys(PROJECT_LIST_COLUMN_LABELS)) as string[]
  return (
    <div className="contents">
      <ProjectsPageHeader
        title={projectListLabel}
        description="Search and filter projects. View details and export reports."
        breadcrumbs={[
          { label: projectListLabel, href: '/projects' },
          { label: 'Project list' },
        ]}
      />

      {/* Portfolio summary — compact bar at top */}
      {c.projectsSummary && (
        <section className="mb-4 rounded-lg border border-slate-200/70 bg-slate-50/50 px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm" aria-label="Portfolio summary">
          <Link href="/projects/reports" className="text-slate-500 font-medium pr-1 hover:text-slate-800 hover:underline">Summary</Link>
          <span className="text-slate-300 select-none" aria-hidden>|</span>
          <span className="tabular-nums font-semibold text-slate-800">{c.projectsSummary.total_projects ?? 0}</span>
          <span className="text-slate-500">projects</span>
          <span className="text-slate-300 select-none" aria-hidden>·</span>
          <span className="tabular-nums font-semibold text-emerald-700">{c.projectsSummary.active_projects ?? 0}</span>
          <span className="text-slate-500">active</span>
          <span className="text-slate-300 select-none" aria-hidden>·</span>
          <span className="text-slate-500">Budget</span>
          {Array.isArray(c.projectsSummary.by_currency) && c.projectsSummary.by_currency.length > 1 ? (
            <span className="flex flex-wrap gap-x-2 tabular-nums font-semibold text-slate-800">
              {c.projectsSummary.by_currency.map((row: { currency: string; total_budget: number }) => (
                <span key={row.currency}>{c.formatCurrency?.(row.total_budget ?? 0, row.currency) ?? `${row.currency} ${Number(row.total_budget ?? 0).toLocaleString()}`}</span>
              ))}
            </span>
          ) : (
            <span className="tabular-nums font-semibold text-slate-800">
              {c.projectsSummary.total_budget != null ? (c.formatCurrency?.(c.projectsSummary.total_budget, (Array.isArray(c.projectsSummary.by_currency) && c.projectsSummary.by_currency[0]?.currency) || 'USD') ?? '—') : '—'}
            </span>
          )}
          <span className="text-slate-300 select-none" aria-hidden>·</span>
          <span className="text-slate-500">Spent</span>
          {Array.isArray(c.projectsSummary.by_currency) && c.projectsSummary.by_currency.length > 1 ? (
            <span className="flex flex-wrap gap-x-2 tabular-nums font-semibold text-amber-800">
              {c.projectsSummary.by_currency.map((row: { currency: string; total_spent: number }) => (
                <span key={row.currency}>{c.formatCurrency?.(row.total_spent ?? 0, row.currency) ?? `${row.currency} ${Number(row.total_spent ?? 0).toLocaleString()}`}</span>
              ))}
            </span>
          ) : (
            <span className="tabular-nums font-semibold text-amber-800">
              {c.projectsSummary.total_spent != null ? (c.formatCurrency?.(c.projectsSummary.total_spent, (Array.isArray(c.projectsSummary.by_currency) && c.projectsSummary.by_currency[0]?.currency) || 'USD') ?? '—') : '—'}
            </span>
          )}
          <span className="text-slate-300 select-none" aria-hidden>·</span>
          <span className="text-slate-500">Util</span>
          <span className="tabular-nums font-semibold text-slate-800">{c.projectsSummary.utilization_rate != null ? `${c.projectsSummary.utilization_rate}%` : '—'}</span>
        </section>
      )}

      <Card className="border border-slate-200/80 shadow-sm overflow-hidden rounded-xl bg-white">
        {/* List header: title + actions */}
        <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50/80 to-white px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#023e8a] to-[#0353a6] text-white shadow-lg shadow-[#023e8a]/20">
                <FolderOpen className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800 tracking-tight">Project list</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {c.isError ? 'Could not load' : c.pagination ? `${c.pagination.total} project${c.pagination.total !== 1 ? 's' : ''}` : 'Loading…'}
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={!!(c.exportingFormat ?? null)} className="border-slate-200 bg-white hover:bg-slate-50 hover:border-[#023e8a]/30 shadow-sm">
                    {c.exportingFormat ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                    {c.exportingFormat ? 'Exporting…' : 'Export'}
                    <ChevronDown className="h-3.5 w-3.5 ml-0.5 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => c.handleExportProjects?.('xlsx')} disabled={!!(c.exportingFormat ?? null)}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => c.handleExportProjects?.('pdf')} disabled={!!(c.exportingFormat ?? null)}>
                    <FileText className="h-4 w-4 mr-2" />
                    PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => c.handleExportProjects?.('csv')} disabled={!!(c.exportingFormat ?? null)}>
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" asChild className="border-slate-200 bg-white hover:bg-slate-50 hover:border-[#023e8a]/30 shadow-sm">
                <Link href="/reports">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Reports
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Search & filter toolbar */}
        <div className="border-b border-slate-100 bg-slate-50/40 px-6 py-3.5">
          <div className="flex flex-wrap gap-2.5 items-center">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Search projects…"
                value={c.searchQuery ?? ''}
                onChange={(e) => c.setSearchQuery?.(e.target.value)}
                className="pl-9 h-9 text-sm border-slate-200 bg-white rounded-lg focus-visible:ring-0.5 focus-visible:ring-ring focus-visible:border-[#023e8a]/30 placeholder:text-slate-400"
              />
            </div>
            <Select value={c.filterStatus ?? 'all'} onValueChange={(v) => c.setFilterStatus?.(v)}>
              <SelectTrigger className="w-[135px] h-9 text-sm border-slate-200 bg-white rounded-lg">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_hold">On hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={c.filterSector ?? 'all'} onValueChange={(v) => c.setFilterSector?.(v)}>
              <SelectTrigger className="w-[135px] h-9 text-sm border-slate-200 bg-white rounded-lg">
                <SelectValue placeholder="Sector" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sectors</SelectItem>
                {(c.sectorOptions ?? []).map((s: string) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={c.filterOfficeId ? String(c.filterOfficeId) : 'all'} onValueChange={(v) => c.setFilterOfficeId?.(v === 'all' ? 0 : parseInt(v, 10))}>
              <SelectTrigger className="w-[145px] h-9 text-sm border-slate-200 bg-white rounded-lg">
                <SelectValue placeholder="Office" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All offices</SelectItem>
                {(c.offices ?? []).map((o: { id: number; code: string; name: string }) => (
                  <SelectItem key={o.id} value={String(o.id)}>{o.code} – {o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-2 border-slate-200 bg-white rounded-lg px-3 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm">
                  <Columns3 className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium">Columns</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-lg border-slate-200 shadow-lg bg-white p-1">
                <DropdownMenuLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 py-1.5">
                  Show / hide columns
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1" />
                {columnIds.map((id) => (
                  <DropdownMenuCheckboxItem
                    key={id}
                    checked={columnVisibility[id] !== false}
                    onCheckedChange={(checked) => setColumnVisibility?.((prev: Record<string, boolean>) => ({ ...prev, [id]: checked }))}
                    className="text-sm text-slate-700 cursor-pointer rounded-md py-2 pl-8 pr-2"
                  >
                    {PROJECT_LIST_COLUMN_LABELS[id] ?? id}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem
                  className="text-xs text-slate-500 cursor-pointer rounded-md py-2"
                  onSelect={(e) => { e.preventDefault(); setColumnVisibility?.(() => Object.fromEntries(columnIds.map((id) => [id, true]))); }}
                >
                  Show all
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {((c.searchQuery ?? '') || (c.filterStatus !== 'all' && c.filterStatus) || (c.filterSector !== 'all' && c.filterSector) || (c.filterOfficeId ?? 0) > 0) && (
              <Button variant="ghost" size="sm" className="h-9 text-slate-500 hover:text-slate-800 hover:bg-slate-200/50" onClick={() => { c.setSearchQuery?.(''); c.setFilterStatus?.('all'); c.setFilterSector?.('all'); c.setFilterOfficeId?.(0); c.setPage?.(1); }}>
                Clear filters
              </Button>
            )}
            {(c.searchQuery || c.filterStatus !== 'all' || (c.filterSector ?? 'all') !== 'all' || (c.filterOfficeId ?? 0) > 0) && c.pagination && (
              <span className="text-xs text-slate-500 ml-auto font-medium tabular-nums">
                {c.pagination.total} result{c.pagination.total !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <CardContent className="p-0">
          {c.isError && (
            <div className="p-12 text-center border-b bg-muted/20">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mx-auto mb-4">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <p className="text-base font-semibold text-foreground">Failed to load projects</p>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                {(c.error as any)?.response?.data?.message || (c.error as Error)?.message || 'Please try again.'}
              </p>
              <Button variant="outline" size="sm" className="mt-4 border-[#979dac]/40" onClick={() => c.refetch?.()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          )}
          <FinanceDataTable
            className="rounded-lg border border-slate-200 bg-white shadow-sm w-full min-w-0 overflow-x-scroll overflow-y-hidden"
            tableClassName="w-full min-w-max projects-portfolio-table border-collapse [&_thead_th]:text-xs [&_thead_th]:tracking-wide [&_tbody_td]:!text-xs [&_tbody_td]:text-slate-800 [&_tbody_tr]:border-b [&_tbody_tr]:border-slate-100 [&_tbody_tr:hover]:bg-slate-50/70 [&_td]:border-r [&_td]:border-slate-100 [&_td:last-child]:border-r-0 [&_th]:border-r [&_th]:border-slate-200 [&_th:last-child]:border-r-0 [&_th]:py-2 [&_th]:px-2 [&_td]:py-1.5 [&_td]:px-2"
          >
            {(() => {
              const visibleColumnCount = columnIds.filter((id: string) => visible(id)).length
              const totalTableColumns = 2 + visibleColumnCount
              return (
            <>
              <FinanceDataTableHeader className="!bg-slate-100/95 !border-0 sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.06)] border-b border-slate-200">
                <FinanceDataTableTh className="min-w-[40px] w-10 py-2 px-2 text-xs font-semibold text-slate-800 text-center sticky left-0 z-20 bg-slate-100/95 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">No</FinanceDataTableTh>
                {visible('code') && <FinanceDataTableTh className="min-w-[80px] py-2 px-2 text-xs font-semibold text-slate-800 text-center">Code</FinanceDataTableTh>}
                {visible('grantCode') && <FinanceDataTableTh className="min-w-[90px] py-2 px-2 text-xs font-semibold text-slate-800 text-center">Grant Code</FinanceDataTableTh>}
                {visible('projectName') && <FinanceDataTableTh className="min-w-[140px] py-2 px-2 text-xs font-semibold text-slate-800 text-left">Project Name</FinanceDataTableTh>}
                {visible('donor') && <FinanceDataTableTh className="min-w-[100px] py-2 px-2 text-xs font-semibold text-slate-800 text-center">Donor</FinanceDataTableTh>}
                {visible('fundType') && <FinanceDataTableTh className="min-w-[100px] py-2 px-2 text-xs font-semibold text-slate-800 text-center">Fund Type</FinanceDataTableTh>}
                {visible('sector') && <FinanceDataTableTh className="min-w-[72px] py-2 px-2 text-xs font-semibold text-slate-800 text-center">Sector</FinanceDataTableTh>}
                {visible('location') && <FinanceDataTableTh className="min-w-[80px] py-2 px-2 text-xs font-semibold text-slate-800 text-center">Location</FinanceDataTableTh>}
                {visible('startDate') && <FinanceDataTableTh className="min-w-[78px] py-2 px-2 text-xs font-semibold text-slate-800 text-center">Start Date</FinanceDataTableTh>}
                {visible('endDate') && <FinanceDataTableTh className="min-w-[78px] py-2 px-2 text-xs font-semibold text-slate-800 text-center">End Date</FinanceDataTableTh>}
                {visible('currency') && <FinanceDataTableTh className="min-w-[64px] py-2 px-2 text-xs font-semibold text-slate-800 text-center">Currency</FinanceDataTableTh>}
                {visible('budget') && <FinanceDataTableTh className="min-w-[76px] py-2 px-2 text-xs font-semibold text-slate-800 text-center">Budget</FinanceDataTableTh>}
                {visible('spent') && <FinanceDataTableTh className="min-w-[68px] py-2 px-2 text-xs font-semibold text-slate-800 text-center">Spent</FinanceDataTableTh>}
                {visible('util') && <FinanceDataTableTh className="min-w-[70px] py-2 px-2 text-xs font-semibold text-slate-800 text-center">Util %</FinanceDataTableTh>}
                {visible('status') && <FinanceDataTableTh className="min-w-[82px] py-2 px-2 text-xs font-semibold text-slate-800 text-center">Status</FinanceDataTableTh>}
                {visible('attach') && <FinanceDataTableTh className="min-w-[52px] w-12 py-2 px-2 text-xs font-semibold text-slate-800 text-center" title="Attachments">Attach.</FinanceDataTableTh>}
                <FinanceDataTableTh align="center" className="min-w-[52px] w-[52px] py-2 px-2 text-xs font-semibold text-slate-800 sticky right-0 z-20 bg-slate-100/95 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.06)]">Actions</FinanceDataTableTh>
              </FinanceDataTableHeader>
              <tbody>
                {c.isLoading && (
                  [...Array(10)].map((_: unknown, i: number) => (
                    <FinanceDataTableRow key={i} className="bg-white border-slate-100">
                      <FinanceDataTableTd className="py-1.5 px-2 text-center sticky left-0 z-10 bg-white shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]"><Skeleton className="h-3.5 w-5 mx-auto" /></FinanceDataTableTd>
                      {visible('code') && <FinanceDataTableTd className="py-1.5 px-2 text-center"><Skeleton className="h-3.5 w-14 mx-auto" /></FinanceDataTableTd>}
                      {visible('grantCode') && <FinanceDataTableTd className="py-1.5 px-2 text-center"><Skeleton className="h-3.5 w-16 mx-auto" /></FinanceDataTableTd>}
                      {visible('projectName') && <FinanceDataTableTd className="py-1.5 px-2 text-center"><Skeleton className="h-3.5 w-28 mx-auto" /></FinanceDataTableTd>}
                      {visible('donor') && <FinanceDataTableTd className="py-1.5 px-2 text-center"><Skeleton className="h-3.5 w-20 mx-auto" /></FinanceDataTableTd>}
                      {visible('fundType') && <FinanceDataTableTd className="py-1.5 px-2 text-center"><Skeleton className="h-3.5 w-20 mx-auto" /></FinanceDataTableTd>}
                      {visible('sector') && <FinanceDataTableTd className="py-1.5 px-2 text-center"><Skeleton className="h-3.5 w-12 mx-auto" /></FinanceDataTableTd>}
                      {visible('location') && <FinanceDataTableTd className="py-1.5 px-2 text-center"><Skeleton className="h-3.5 w-12 mx-auto" /></FinanceDataTableTd>}
                      {visible('startDate') && <FinanceDataTableTd className="py-1.5 px-2 text-center"><Skeleton className="h-3.5 w-16 mx-auto" /></FinanceDataTableTd>}
                      {visible('endDate') && <FinanceDataTableTd className="py-1.5 px-2 text-center"><Skeleton className="h-3.5 w-16 mx-auto" /></FinanceDataTableTd>}
                      {visible('currency') && <FinanceDataTableTd className="py-1.5 px-2 text-center"><Skeleton className="h-3.5 w-8 mx-auto" /></FinanceDataTableTd>}
                      {visible('budget') && <FinanceDataTableTd className="py-1.5 px-2 text-center"><Skeleton className="h-3.5 w-12 mx-auto" /></FinanceDataTableTd>}
                      {visible('spent') && <FinanceDataTableTd className="py-1.5 px-2 text-center"><Skeleton className="h-3.5 w-10 mx-auto" /></FinanceDataTableTd>}
                      {visible('util') && <FinanceDataTableTd className="py-1.5 px-2 text-center"><Skeleton className="h-3.5 w-8 mx-auto" /></FinanceDataTableTd>}
                      {visible('status') && <FinanceDataTableTd className="py-1.5 px-2 text-center"><Skeleton className="h-3.5 w-14 mx-auto" /></FinanceDataTableTd>}
                      {visible('attach') && <FinanceDataTableTd className="py-1.5 px-2 text-center"><Skeleton className="h-3.5 w-12 mx-auto" /></FinanceDataTableTd>}
                      <FinanceDataTableTd className="py-1.5 px-2 text-center sticky right-0 z-10 bg-white shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.06)]"><Skeleton className="h-3.5 w-16 mx-auto" /></FinanceDataTableTd>
                    </FinanceDataTableRow>
                  ))
                )}
                {!c.isLoading && !c.isError && (c.projects ?? []).length === 0 && (
                  <tr className="border-b border-slate-100 bg-white">
                    <td colSpan={totalTableColumns} className="py-20 text-center">
                      <div className="flex flex-col items-center max-w-md mx-auto">
                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 text-slate-400 ring-1 ring-slate-200/60 mb-5">
                          <FolderKanban className="h-10 w-10" />
                        </div>
                        <p className="font-semibold text-slate-800 text-lg">No projects found</p>
                        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                          {c.searchQuery || c.filterStatus !== 'all' || (c.filterSector ?? 'all') !== 'all' || (c.filterOfficeId ?? 0) > 0
                            ? 'Try adjusting your search or filters. Use Project register or Project amendment from the sidebar to add projects.'
                            : 'No projects in the portfolio yet. Use Project register or Project amendment from the sidebar to add projects.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
                {!c.isLoading && (c.projects ?? []).map((project: any, index: number) => {
                  const utilization = c.calculateUtilization(project.spent_amount, project.total_budget)
                  const utilNum = Number(utilization) || 0
                  const rowNo = (c.pagination?.from ?? 1) + index
                  const fundType = project.grant?.grant_type
                  return (
                    <FinanceDataTableRow key={`project-${project.id}`} className="bg-white transition-colors border-slate-100 group">
                      <FinanceDataTableTd className="py-1.5 px-2 text-slate-600 tabular-nums text-center text-xs sticky left-0 z-10 bg-white group-hover:bg-slate-50/70 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">{rowNo}</FinanceDataTableTd>
                      {visible('code') && (
                        <FinanceDataTableTd className="py-1.5 px-2 text-center">
                          <span className="font-mono text-slate-800 text-xs">{project.project_code}</span>
                        </FinanceDataTableTd>
                      )}
                      {visible('grantCode') && (
                        <FinanceDataTableTd className="py-1.5 px-2 text-center">
                          <span className="font-mono text-slate-800 text-xs">{project.grant?.grant_code ?? '—'}</span>
                        </FinanceDataTableTd>
                      )}
                      {visible('projectName') && (
                        <FinanceDataTableTd className="py-1.5 px-2 text-left">
                          <span className="font-medium text-slate-800">{project.project_name}</span>
                        </FinanceDataTableTd>
                      )}
                      {visible('donor') && (
                        <FinanceDataTableTd className="py-1.5 px-2 text-center">
                          <span className="text-slate-600">{project.grant?.donor ? (project.grant.donor.short_name || project.grant.donor.name || project.grant.donor.code) : '—'}</span>
                        </FinanceDataTableTd>
                      )}
                      {visible('fundType') && (
                        <FinanceDataTableTd className="py-1.5 px-2 text-center text-slate-600">{fundType ? c.getGrantTypeLabel(fundType) : '—'}</FinanceDataTableTd>
                      )}
                      {visible('sector') && (
                        <FinanceDataTableTd className="py-1.5 px-2 text-center text-slate-600">{project.sector || '—'}</FinanceDataTableTd>
                      )}
                      {visible('location') && (
                        <FinanceDataTableTd className="py-1.5 px-2 text-slate-600 min-w-[100px] max-w-[220px]">
                          {(() => {
                            const locationsList = (project.locations_list ?? project.locations ?? (project.location ? [project.location] : [])) as string[]
                            const locations = Array.isArray(locationsList) ? locationsList.filter(Boolean) : (project.location ? [project.location] : [])
                            if (locations.length === 0) return <span className="text-center block">—</span>
                            return (
                              <span className="text-left block text-xs leading-relaxed break-words">
                                {locations.join(', ')}
                              </span>
                            )
                          })()}
                        </FinanceDataTableTd>
                      )}
                      {visible('startDate') && (
                        <FinanceDataTableTd className="py-1.5 px-2 text-center">
                          <span className="text-slate-600 tabular-nums">{c.formatDate(project.start_date)}</span>
                        </FinanceDataTableTd>
                      )}
                      {visible('endDate') && (
                        <FinanceDataTableTd className="py-1.5 px-2 text-center">
                          <span className="text-slate-600 tabular-nums">{c.formatDate(project.end_date)}</span>
                        </FinanceDataTableTd>
                      )}
                      {visible('currency') && (
                        <FinanceDataTableTd className="py-1.5 px-2 text-center">
                          <span className="font-mono text-slate-600 text-xs">{project.currency || project.grant?.currency || '—'}</span>
                        </FinanceDataTableTd>
                      )}
                      {visible('budget') && (
                        <FinanceDataTableTd className="py-1.5 px-2 text-center font-mono tabular-nums text-slate-700">
                          {c.formatCurrency(project.total_budget ?? 0, project.currency || project.grant?.currency || 'USD')}
                        </FinanceDataTableTd>
                      )}
                      {visible('spent') && (
                        <FinanceDataTableTd className="py-1.5 px-2 text-center font-mono tabular-nums text-slate-700">
                          {c.formatCurrency(project.spent_amount ?? 0, project.currency || project.grant?.currency || 'USD')}
                        </FinanceDataTableTd>
                      )}
                      {visible('util') && (
                        <FinanceDataTableTd className="py-1.5 px-2 text-center">
                          <div className="flex items-center gap-1.5 justify-center">
                            <div className="w-10 h-1 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                              <div
                                className={c.cn(
                                  'h-full rounded-full transition-all',
                                  utilNum > 100 ? 'bg-red-500' : utilNum > 90 ? 'bg-amber-500' : 'bg-emerald-500'
                                )}
                                style={{ width: `${Math.min(utilNum, 100)}%` }}
                              />
                            </div>
                            <span className={c.cn(
                              'tabular-nums text-slate-700 min-w-[2.25rem] text-center text-xs',
                              utilNum > 90 && 'text-amber-600 font-semibold',
                              utilNum > 100 && 'text-red-600 font-semibold'
                            )}>
                              {utilization}%
                            </span>
                          </div>
                        </FinanceDataTableTd>
                      )}
                      {visible('status') && (
                        <FinanceDataTableTd className="py-1.5 px-2 text-center">
                          <Badge className={c.cn('text-[10px] px-1.5 py-0 rounded-md', c.getProjectStatusColor(project.status))}>
                            {c.getProjectStatusLabel(project.status)}
                          </Badge>
                        </FinanceDataTableTd>
                      )}
                      {visible('attach') && (
                      <FinanceDataTableTd className="py-1.5 px-2 text-center w-12">
                        {(() => {
                          const grantDocs = (project.grant?.documents ?? []) as { id: number; file_name: string; title?: string }[]
                          const projectDocs = (project.documents ?? []) as { id: number; file_name: string; title?: string }[]
                          const totalAttach = grantDocs.length + projectDocs.length
                          if (totalAttach === 0) return <span className="text-slate-400 text-xs">—</span>
                          return (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 min-w-0 gap-0.5 px-1.5 text-xs text-slate-600 hover:text-[#023e8a] hover:bg-slate-100"
                                  title={`${totalAttach} attachment(s) – click to download`}
                                >
                                  <Paperclip className="h-3.5 w-3.5 shrink-0" />
                                  <span className="tabular-nums">{totalAttach}</span>
                                  <ChevronDown className="h-3 w-3 shrink-0 opacity-70" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="center" className="min-w-[220px] max-w-[320px]">
                                {grantDocs.map((doc: { id: number; file_name: string; title?: string }) => (
                                  <DropdownMenuItem
                                    key={`g-${doc.id}`}
                                    onSelect={(e) => {
                                      e.preventDefault()
                                      project.grant_id && c.downloadGrantDocument?.(project.grant_id, doc.id, doc.file_name || doc.title)
                                    }}
                                    className="flex cursor-pointer items-center gap-2 py-2"
                                  >
                                    <DocumentFileIcon fileName={doc.file_name || doc.title || ''} size="md" />
                                    <span className="truncate flex-1" title={doc.title || doc.file_name}>
                                      {doc.title || doc.file_name}
                                    </span>
                                    <Download className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                  </DropdownMenuItem>
                                ))}
                                {projectDocs.map((doc: { id: number; file_name: string; title?: string }) => (
                                  <DropdownMenuItem
                                    key={`p-${doc.id}`}
                                    onSelect={(e) => {
                                      e.preventDefault()
                                      c.downloadProjectDocument?.(project.id, doc.id, doc.file_name || doc.title)
                                    }}
                                    className="flex cursor-pointer items-center gap-2 py-2"
                                  >
                                    <DocumentFileIcon fileName={doc.file_name || doc.title || ''} size="md" />
                                    <span className="truncate flex-1" title={doc.title || doc.file_name}>
                                      {doc.title || doc.file_name}
                                    </span>
                                    <Download className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )
                        })()}
                      </FinanceDataTableTd>
                      )}
                      <FinanceDataTableTd align="center" className="py-1.5 px-2 sticky right-0 z-10 bg-white group-hover:bg-slate-50/70 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                        <ActionMenu
                          triggerClassName="h-7 w-7 rounded hover:bg-muted inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                          menuWidth={160}
                          items={[
                            { label: 'View details', icon: <Eye className="h-3.5 w-3.5" />, onClick: () => c.handleView(project) },
                            { label: 'Edit', icon: <Edit className="h-3.5 w-3.5" />, onClick: () => c.handleEdit(project) },
                            { label: 'Amend', icon: <FileEdit className="h-3.5 w-3.5" />, href: `/projects/amendment?project_id=${project.id}` },
                            {
                              label: 'Delete',
                              icon: <Trash2 className="h-3.5 w-3.5" />,
                              onClick: () => { c.setProjectToDelete(project); c.setDeleteDialogOpen(true) },
                              destructive: true,
                              disabled: !(['draft', 'planning', 'cancelled'].includes(project.status) && (Number(project.spent_amount) ?? 0) === 0 && (Number(project.committed_amount) ?? 0) === 0),
                              disabledReason: !['draft', 'planning', 'cancelled'].includes(project.status)
                                ? 'Only draft, planning or cancelled projects can be deleted.'
                                : ((Number(project.spent_amount) ?? 0) > 0 || (Number(project.committed_amount) ?? 0) > 0)
                                  ? 'Projects with spending or commitments cannot be deleted.'
                                  : undefined,
                            },
                          ]}
                        />
                      </FinanceDataTableTd>
                    </FinanceDataTableRow>
                  )
                })}
              </tbody>
            </>
              )
            })()}
          </FinanceDataTable>
          {c.pagination && c.pagination.total > 0 && (
            <FinancePagination
              from={c.pagination.from}
              to={c.pagination.to}
              total={c.pagination.total}
              label="projects"
              onPrevious={() => c.setPage((p: number) => Math.max(1, p - 1))}
              onNext={() => c.setPage((p: number) => p + 1)}
              previousDisabled={c.page === 1}
              nextDisabled={c.page === c.pagination.last_page}
              currentPage={c.page}
              lastPage={Number(c.pagination.last_page) || 1}
              onPageChange={(p: number) => c.setPage?.(p)}
              pageSize={c.perPage ?? 10}
              pageSizeOptions={[10, 20, 50, 100]}
              onPageSizeChange={(size: number) => {
                c.setPerPage?.(size)
                c.setPage?.(1)
              }}
              className="px-4 py-2.5 border-t border-slate-200/80 bg-slate-50/40"
            />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={c.projectDialogOpen}
        onOpenChange={(open) => {
          if (open !== c.projectDialogOpen) c.setProjectDialogOpen(open)
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 rounded-xl shadow-xl border-border/50">
          <DialogHeader className="px-6 pt-6 pb-5 border-b bg-muted/30 shrink-0">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {c.dialogMode === 'amendment' ? <FileEdit className="h-5 w-5" /> : c.editingProject ? <Edit className="h-5 w-5" /> : <FilePlus className="h-5 w-5" />}
              </span>
              {c.editingProject ? 'Edit Project' : c.dialogMode === 'amendment' ? 'Add Amendment' : 'Add Project'}
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-sm leading-relaxed">
              {c.editingProject
                ? 'Update project details, budget, and classification.'
                : c.dialogMode === 'amendment'
                  ? 'Link a new project to an existing donor contract. Select the donor and contract, then enter project details.'
                  : 'Register a new project. Each project corresponds to a donor contract—enter all information below.'}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 overflow-y-auto flex-1 space-y-6">
            {/* Section: Funding */}
            <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Funding & contract</p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label required>Donor name / Funding source</Label>
                  <Select
                    value={c.effectiveDonorId ? String(c.effectiveDonorId) : ''}
                    onValueChange={(v) => {
                      const id = v ? parseInt(v, 10) : 0
                      c.setSelectedDonorId(id)
                      if (c.dialogMode === 'new-project') c.setNewContractForm((f: any) => ({ ...f, donor_id: id }))
                      if (c.dialogMode === 'amendment' || c.editingProject) c.setProjectForm((prev: any) => ({ ...prev, grant_id: 0 }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select donor / funding source" />
                    </SelectTrigger>
                    <SelectContent>
                      {(c.donors || []).map((d: any) => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.name} {d.code ? `(${d.code})` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
              {(c.dialogMode === 'amendment' || c.editingProject) && (
                <div className="space-y-2">
                  <Label required>Grant / Contract</Label>
                  <Select
                    value={Number(c.projectForm?.grant_id) > 0 ? c.projectForm.grant_id.toString() : ''}
                    onValueChange={(v) => {
                      const id = v ? parseInt(v, 10) : 0
                      c.setProjectForm((prev: any) => ({ ...prev, grant_id: id }))
                      const g = (c.grants || []).find((x: any) => x.id === id)
                      if (g) c.setSelectedDonorId(g.donor_id)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select existing contract" />
                    </SelectTrigger>
                    <SelectContent>
                      {(c.grantsFilteredByDonor || []).map((grant: any) => (
                        <SelectItem key={grant.id} value={grant.id.toString()}>
                          {grant.grant_code} – {grant.grant_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
                </div>
              </div>
            </div>

            {/* Section: Project details */}
            <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project details</p>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sector</Label>
                    <Select value={c.projectForm?.sector || ''} onValueChange={(v) => c.setProjectForm({ ...c.projectForm, sector: v })}>
                      <SelectTrigger><SelectValue placeholder="Select sector" /></SelectTrigger>
                      <SelectContent>
                        {(c.sectorOptions ?? []).map((s: string) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label required>Project Name</Label>
                    <Input placeholder="e.g. Health Program Phase II" value={c.projectForm?.project_name ?? ''} onChange={(e) => c.setProjectForm({ ...c.projectForm, project_name: e.target.value })} />
                  </div>
                </div>

            {/* 4. Project / Grant Code + 5. Project Code (for vouchers) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project / Grant Code</Label>
                <Input
                  placeholder={c.dialogMode === 'new-project' ? 'e.g. GRANT-2024-001' : 'From contract'}
                  value={c.dialogMode === 'new-project' ? (c.newContractForm?.grant_code ?? '') : (Number(c.projectForm?.grant_id) > 0 ? ((c.allGrants || []).find((g: any) => g.id === c.projectForm.grant_id)?.grant_code ?? '') : '')}
                  readOnly={!!(c.dialogMode === 'amendment' || c.editingProject)}
                  className={c.dialogMode === 'amendment' || c.editingProject ? 'bg-muted' : ''}
                  onChange={c.dialogMode === 'new-project' ? (e: React.ChangeEvent<HTMLInputElement>) => c.setNewContractForm((f: any) => ({ ...f, grant_code: e.target.value })) : () => {}}
                />
              </div>
              <div className="space-y-2">
                <Label required>Project Code</Label>
                <Input placeholder="e.g. PRJ-001 (for project vouchers)" value={c.projectForm?.project_code ?? ''} onChange={(e) => c.setProjectForm({ ...c.projectForm, project_code: e.target.value.toUpperCase() })} />
              </div>
            </div>
            {c.dialogMode === 'new-project' && (
              <div className="space-y-2">
                <Label required>Contract / Grant Name</Label>
                <Input placeholder="e.g. Health Program Phase II" value={c.newContractForm?.grant_name ?? ''} onChange={(e) => c.setNewContractForm((f: any) => ({ ...f, grant_name: e.target.value }))} />
              </div>
            )}

            {/* Office - required by backend, kept for project assignment */}
            <div className="space-y-2">
              <Label required>Office</Label>
              <Select
                value={Number(c.projectForm?.office_id) > 0 ? c.projectForm.office_id.toString() : ''}
                onValueChange={(v) => c.setProjectForm((prev: any) => ({ ...prev, office_id: v ? parseInt(v, 10) : 0 }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select office" />
                </SelectTrigger>
                <SelectContent>
                  {(c.offices || []).map((office: any) => (
                    <SelectItem key={office.id} value={office.id.toString()}>
                      {office.code} – {office.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 6. Location (one or many) */}
            <div className="space-y-2">
              <Label>Location</Label>
              <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-background min-h-10">
                {(c.projectForm?.locations ?? []).map((loc: string, i: number) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-sm">
                    {loc}
                    <button type="button" onClick={() => c.setProjectForm((f: any) => ({ ...f, locations: (f.locations ?? []).filter((_: any, j: number) => j !== i) }))} className="hover:text-destructive rounded" aria-label="Remove location">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
                <input
                  className="flex-1 min-w-[120px] bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground"
                  placeholder="Add location (Enter or comma)"
                  value={c.projectLocationInput ?? ''}
                  onChange={(e) => c.setProjectLocationInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      const v = (e.key === ',' ? (c.projectLocationInput ?? '').replace(/,/g, '') : (c.projectLocationInput ?? '')).trim()
                      if (v) {
                        c.setProjectForm((f: any) => ({ ...f, locations: [...(f.locations ?? []), v] }))
                        c.setProjectLocationInput('')
                      }
                    }
                  }}
                />
              </div>
            </div>
              </div>
            </div>

            {/* Section: Timeline & budget */}
            <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timeline & budget</p>
              <div className="space-y-4">
            {/* 7. Fund type */}
            <div className="space-y-2">
              <Label>Fund type</Label>
              {c.dialogMode === 'new-project' ? (
                <Select
                  value={c.newContractForm?.grant_type ?? 'restricted'}
                  onValueChange={(v) => c.setNewContractForm((f: any) => ({ ...f, grant_type: v as GrantFormData['grant_type'] }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fund type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restricted">Restricted</SelectItem>
                    <SelectItem value="unrestricted">Unrestricted</SelectItem>
                    <SelectItem value="temporarily_restricted">Temporarily Restricted</SelectItem>
                  </SelectContent>
                </Select>
              ) : c.editingProject ? (
                <Select
                  value={(c.projectForm as { grant_type?: string })?.grant_type ?? 'restricted'}
                  onValueChange={(v) => c.setProjectForm((prev: any) => ({ ...prev, grant_type: v as GrantFormData['grant_type'] }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fund type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restricted">Restricted</SelectItem>
                    <SelectItem value="unrestricted">Unrestricted</SelectItem>
                    <SelectItem value="temporarily_restricted">Temporarily Restricted</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground py-2">From linked contract</p>
              )}
            </div>

            {/* 8. Start date | 9. End date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label required>Start date</Label>
                <DatePicker
                  value={(c.dialogMode === 'new-project' ? c.newContractForm?.start_date : null) ?? c.projectForm?.start_date ?? ''}
                  onChange={(v) => {
                    const date = v ?? ''
                    if (c.dialogMode === 'new-project') c.setNewContractForm((f: any) => ({ ...f, start_date: date }))
                    c.setProjectForm({ ...c.projectForm, start_date: date })
                  }}
                  maxDate={c.projectForm?.end_date || c.newContractForm?.end_date || undefined}
                />
              </div>
              <div className="space-y-2">
                <Label required>End date</Label>
                <DatePicker
                  value={(c.dialogMode === 'new-project' ? c.newContractForm?.end_date : null) ?? c.projectForm?.end_date ?? ''}
                  onChange={(v) => {
                    const date = v ?? ''
                    if (c.dialogMode === 'new-project') c.setNewContractForm((f: any) => ({ ...f, end_date: date }))
                    c.setProjectForm({ ...c.projectForm, end_date: date })
                  }}
                  minDate={c.projectForm?.start_date || c.newContractForm?.start_date || undefined}
                />
              </div>
            </div>

            {/* 10. Sub-partner (sub-recipient) - org is head partner */}
            <div className="space-y-3">
              <Label>Sub-partner (sub-recipient)</Label>
              <p className="text-xs text-muted-foreground">When your organization is the head partner and allocates a portion of the budget to a sub-partner.</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="hasPartner" checked={!c.hasPartner} onChange={() => c.setHasPartner(false)} className="rounded-full" />
                  <span className="text-sm">No</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="hasPartner" checked={c.hasPartner} onChange={() => c.setHasPartner(true)} className="rounded-full" />
                  <span className="text-sm">Yes</span>
                </label>
              </div>
              {c.hasPartner && (
                <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4 mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label required className="text-xs">Partner name</Label>
                      <Input placeholder="Full legal name" value={c.newContractForm?.partner_name ?? ''} onChange={(e) => c.setNewContractForm((f: any) => ({ ...f, partner_name: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Abbreviation</Label>
                      <Input placeholder="e.g. WVI, IRC" value={c.partnerForm?.abbr ?? ''} onChange={(e) => c.setPartnerForm?.((f: any) => ({ ...f, abbr: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Contract type</Label>
                      <Select value={c.partnerForm?.contract_type ?? 'subgrant'} onValueChange={(v) => c.setPartnerForm?.((f: any) => ({ ...f, contract_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="subgrant">Sub-grant</SelectItem>
                          <SelectItem value="mou">Memorandum of Understanding</SelectItem>
                          <SelectItem value="consortium">Consortium agreement</SelectItem>
                          <SelectItem value="teaming">Teaming agreement</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Partner start date</Label>
                      <DatePicker value={c.partnerForm?.start_date ?? ''} onChange={(v) => c.setPartnerForm?.((f: any) => ({ ...f, start_date: v ?? '' }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Partner end date</Label>
                      <DatePicker value={c.partnerForm?.end_date ?? ''} onChange={(v) => c.setPartnerForm?.((f: any) => ({ ...f, end_date: v ?? '' }))} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Partner role & description</Label>
                    <Textarea placeholder="Describe partner responsibilities, scope, and deliverables..." rows={2} value={c.partnerForm?.description ?? ''} onChange={(e) => c.setPartnerForm?.((f: any) => ({ ...f, description: e.target.value }))} />
                  </div>
                  </div>
              )}
            </div>

            {/* 11. Budget: Partner contribution + Sub-partner budget + Our budget = Total */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {c.dialogMode === 'new-project' ? (
                <>
                  <div className="space-y-2">
                    <Label>Partner contribution</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      value={c.newContractForm?.partner_contribution_amount ?? ''}
                      onChange={(e) => c.setNewContractForm((f: any) => ({ ...f, partner_contribution_amount: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    />
                    <p className="text-xs text-muted-foreground">Organization&apos;s contribution from its own sources.</p>
                  </div>
                  {c.hasPartner && (
                    <div className="space-y-2">
                      <Label>Sub-partner budget</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="0.00"
                        value={c.newContractForm?.sub_partner_allocation_amount ?? ''}
                        onChange={(e) => c.setNewContractForm((f: any) => ({ ...f, sub_partner_allocation_amount: e.target.value ? parseFloat(e.target.value) : undefined }))}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label required>Our budget</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      value={c.newContractForm?.our_budget ?? ''}
                      onChange={(e) => c.setNewContractForm((f: any) => ({ ...f, our_budget: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    />
                    <p className="text-xs text-muted-foreground">Amount retained for direct implementation.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Total budget</Label>
                    <p className="text-lg font-semibold tabular-nums text-slate-800 py-2">
                      {(Number(c.newContractForm?.partner_contribution_amount ?? 0) + Number(c.newContractForm?.sub_partner_allocation_amount ?? 0) + Number(c.newContractForm?.our_budget ?? 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                      {c.newContractForm?.currency ?? c.projectForm?.currency ?? 'USD'}
                    </p>
                    <p className="text-xs text-muted-foreground">Sub-partner budget + Our budget + Partner contribution</p>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label required>Budget</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    value={c.projectForm?.total_budget === 0 ? '' : c.projectForm?.total_budget ?? ''}
                    onChange={(e) => c.setProjectForm({ ...c.projectForm, total_budget: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label required>Currency</Label>
                <CurrencySelect
                  value={c.dialogMode === 'new-project' ? (c.newContractForm?.currency ?? 'USD') : (c.projectForm?.currency ?? 'USD')}
                  onChange={(v) => {
                    const cur = v || 'USD'
                    if (c.dialogMode === 'new-project') c.setNewContractForm((f: any) => ({ ...f, currency: cur }))
                    c.setProjectForm({ ...c.projectForm, currency: cur })
                  }}
                  placeholder="Select currency"
                />
              </div>
            </div>
            {c.dialogMode === 'new-project' && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Formula: Sub-partner budget + Our budget + Partner contribution = Total budget</p>
                {(() => {
                  const partnerContribution = Number(c.newContractForm?.partner_contribution_amount ?? 0)
                  const subPartnerBudget = Number(c.newContractForm?.sub_partner_allocation_amount ?? 0)
                  const ourBudget = Number(c.newContractForm?.our_budget ?? 0)
                  const total = partnerContribution + subPartnerBudget + ourBudget
                  const cur = c.newContractForm?.currency ?? c.projectForm?.currency ?? 'USD'
                  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-slate-500">Partner contribution</span>
                        <p className="font-semibold text-slate-800 tabular-nums">{fmt(partnerContribution)} {cur}</p>
                      </div>
                      {c.hasPartner && (
                        <div>
                          <span className="text-slate-500">Sub-partner budget</span>
                          <p className="font-semibold text-slate-800 tabular-nums">{fmt(subPartnerBudget)} {cur}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-500">Our budget</span>
                        <p className="font-semibold text-slate-800 tabular-nums">{fmt(ourBudget)} {cur}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Total budget</span>
                        <p className="font-semibold text-slate-800 tabular-nums">{fmt(total)} {cur}</p>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
              </div>
            </div>

            {/* Section: Description */}
            <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description & beneficiaries</p>
              <div className="space-y-4">
            {/* 14. Project Description */}
            <div className="space-y-2">
              <Label>Project Description</Label>
              <Textarea placeholder="Objectives, activities, and expected outcomes" value={c.projectForm?.description || ''} onChange={(e) => c.setProjectForm({ ...c.projectForm, description: e.target.value })} rows={3} />
            </div>

            {/* 15. Target Beneficiaries */}
            <div className="space-y-2">
              <Label>Target Beneficiaries</Label>
              <Input type="number" min={0} placeholder="Estimated number" value={c.projectForm?.target_beneficiaries ?? ''} onChange={(e) => c.setProjectForm({ ...c.projectForm, target_beneficiaries: e.target.value ? parseInt(e.target.value) : undefined })} />
            </div>

            {/* Status - for edit mode */}
            {(c.editingProject || c.dialogMode === 'edit') && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={c.projectForm?.status || 'draft'} onValueChange={(v) => c.setProjectForm({ ...c.projectForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
              </div>
            </div>

            {/* Section: Supporting documents */}
            {c.dialogMode === 'new-project' && (
              <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Supporting documents</p>
                <div className="space-y-3">
                {([c.contractFile].filter(Boolean).length > 0 || (c.attachments || []).length > 0) ? (
                  <div className="space-y-2">
                    {c.contractFile && (
                      <div className="flex items-center gap-3 flex-wrap">
                        <DocumentFileIcon fileName={c.contractFile.name} size="lg" />
                        <span className="text-sm truncate">{c.contractFile.name}</span>
                        <Select value={c.contractFileDocType} onValueChange={(v) => c.setContractFileDocType(v as GrantDocumentType)}>
                          <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="contract">Contract</SelectItem>
                            <SelectItem value="amendment">Amendment</SelectItem>
                            <SelectItem value="budget">Budget</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input placeholder="Title" value={c.contractFileTitle} onChange={(e) => c.setContractFileTitle(e.target.value)} className="h-8 flex-1 min-w-[120px]" />
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => { c.setContractFile(null); c.setContractFileError?.(null); if (c.contractFileInputRef?.current) c.contractFileInputRef.current.value = '' }}><X className="h-4 w-4" /></Button>
                      </div>
                    )}
                    {(c.attachments || []).map((a: any, i: number) => {
                      const handleAttachmentTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                        c.setAttachments((prev: any[]) => prev.map((x: any, j: number) => j === i ? { ...x, title: e.target.value } : x))
                      }
                      return (
                        <div key={i} className="flex items-center gap-3 flex-wrap">
                          <DocumentFileIcon fileName={a.file.name} size="lg" />
                          <span className="text-sm truncate">{a.file.name}</span>
                          <Select value={a.documentType} onValueChange={(v) => c.setAttachments((prev: any[]) => prev.map((x, j) => j === i ? { ...x, documentType: v as GrantDocumentType } : x))}>
                            <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="contract">Contract</SelectItem>
                              <SelectItem value="budget">Budget</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input placeholder="Title" value={a.title} onChange={handleAttachmentTitleChange} className="h-8 flex-1 min-w-[120px]" />
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => c.setAttachments((prev: any[]) => prev.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                        </div>
                      )
                    })}
                    <Button type="button" variant="outline" size="sm" onClick={() => c.attachmentsInputRef?.current?.click()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add another file
                    </Button>
                    <input ref={c.attachmentsInputRef} type="file" accept={c.CONTRACT_DOC_ACCEPT} className="sr-only" onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      if (c.validateContractFile?.(file)) return
                      c.setAttachments((prev: any[]) => [...prev, { file, title: file.name, documentType: 'other' }])
                      e.target.value = ''
                    }} />
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    className={c.cn(
                      'rounded-lg border-2 border-dashed p-6 transition-all cursor-pointer',
                      c.isDragging && 'border-primary bg-primary/5',
                      !c.isDragging && 'border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-muted/30'
                    )}
                    onClick={() => c.contractFileInputRef?.current?.click()}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && c.contractFileInputRef?.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); c.setIsDragging?.(true) }}
                    onDragLeave={() => c.setIsDragging?.(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      c.setIsDragging?.(false)
                      const file = e.dataTransfer.files?.[0]
                      if (!file) return
                      const err = c.validateContractFile?.(file)
                      c.setContractFileError?.(err ?? null)
                      c.setContractFile(err ? null : file)
                    }}
                  >
                    <input
                      ref={c.contractFileInputRef}
                      type="file"
                      accept={c.CONTRACT_DOC_ACCEPT}
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) { c.setContractFile(null); c.setContractFileError?.(null); return }
                        c.setContractFileError?.(c.validateContractFile?.(file) ?? null)
                        c.setContractFile(c.validateContractFile?.(file) ? null : file)
                      }}
                    />
                    <div className="flex flex-col items-center gap-2 py-2">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm font-medium">Drop PDF, Word, Excel, or ZIP here, or click to browse</span>
                    </div>
                  </div>
                )}
                {c.contractFileError && (
                  <p className="text-sm text-destructive flex items-center gap-1.5"><FileWarning className="h-4 w-4" />{c.contractFileError}</p>
                )}
                {c.uploadProgress != null && <div className="space-y-1"><p className="text-sm text-muted-foreground">Uploading…</p><Progress value={c.uploadProgress} className="h-2" /></div>}
                </div>
              </div>
            )}

            {/* Section: Attachments when editing project (project-specific, not shared by grant) */}
            {c.editingProject && (
              <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Attachments</p>
                <div className="space-y-3">
                  {((c.editGrantDocuments ?? c.editingProject?.documents) ?? []).length > 0 ? (
                    <ul className="space-y-2">
                      {(c.editGrantDocuments ?? c.editingProject?.documents ?? []).map((doc: { id: number; file_name: string; title?: string; document_type?: string }) => (
                        <li key={doc.id} className="rounded-md border border-border/40 bg-background px-3 py-2">
                          {c.editDocForm?.documentId === doc.id ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <Input
                                placeholder="Title"
                                value={c.editDocForm.title ?? ''}
                                onChange={(e) => c.setEditDocForm?.((f: typeof c.editDocForm) => (f ? { ...f, title: e.target.value } : null))}
                                className="h-8 flex-1 min-w-[140px]"
                              />
                              <Select
                                value={c.editDocForm.document_type ?? 'other'}
                                onValueChange={(v) => c.setEditDocForm?.((f: typeof c.editDocForm) => (f ? { ...f, document_type: v as GrantDocumentType } : null))}
                              >
                                <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="contract">Contract</SelectItem>
                                  <SelectItem value="amendment">Amendment</SelectItem>
                                  <SelectItem value="budget">Budget</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button type="button" size="sm" onClick={() => c.handleUpdateEditAttachment?.(doc.id, { title: c.editDocForm?.title, document_type: c.editDocForm?.document_type })}>
                                Save
                              </Button>
                              <Button type="button" variant="ghost" size="sm" onClick={() => c.setEditDocForm?.(null)}>Cancel</Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 flex-wrap">
                              <DocumentFileIcon fileName={doc.file_name || doc.title || ''} size="md" />
                              <span className="text-sm truncate flex-1 min-w-0">{doc.title || doc.file_name}</span>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7"
                                  onClick={() => c.downloadProjectDocument?.(c.editingProject?.id, doc.id, doc.file_name || doc.title)}
                                  title="Download"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7"
                                  onClick={() => c.setEditDocForm?.({ documentId: doc.id, title: doc.title || doc.file_name || '', document_type: (doc.document_type as GrantDocumentType) || 'other' })}
                                  title="Edit"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => c.setAttachmentToDelete?.(doc.id)}
                                  title="Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No attachments for this project yet.</p>
                  )}
                  {c.editAttachmentFile ? (
                    <div className="flex items-center gap-3 flex-wrap rounded-md border border-primary/30 bg-background px-3 py-2">
                      <DocumentFileIcon fileName={c.editAttachmentFile.name} size="md" />
                      <span className="text-sm truncate">{c.editAttachmentFile.name}</span>
                      <Select value={c.editAttachmentDocType} onValueChange={(v) => c.setEditAttachmentDocType?.(v as GrantDocumentType)}>
                        <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="amendment">Amendment</SelectItem>
                          <SelectItem value="budget">Budget</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input placeholder="Title" value={c.editAttachmentTitle ?? ''} onChange={(e) => c.setEditAttachmentTitle?.(e.target.value)} className="h-8 flex-1 min-w-[120px]" />
                      <Button type="button" size="sm" onClick={() => c.handleUploadEditAttachment?.()} disabled={c.uploadProgress != null}>
                        {c.uploadProgress != null ? `${c.uploadProgress}%` : 'Upload'}
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => { c.setEditAttachmentFile?.(null); c.setEditAttachmentTitle?.(''); if (c.editAttachmentInputRef?.current) c.editAttachmentInputRef.current.value = '' }}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                  {c.uploadProgress != null && <Progress value={c.uploadProgress} className="h-2" />}
                  <Button type="button" variant="outline" size="sm" onClick={() => c.editAttachmentInputRef?.current?.click()} disabled={!!c.editAttachmentFile}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add file
                  </Button>
                  <input
                    ref={c.editAttachmentInputRef}
                    type="file"
                    accept={c.PROJECT_ATTACHMENT_ACCEPT ?? c.CONTRACT_DOC_ACCEPT}
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const err = c.validateProjectAttachmentFile?.(file) ?? c.validateContractFile?.(file)
                      if (err) return
                      c.setEditAttachmentFile?.(file)
                      c.setEditAttachmentTitle?.(file.name)
                      c.setEditAttachmentDocType?.('other')
                      e.target.value = ''
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-muted/20 shrink-0 gap-3">
            <Button variant="secondary" onClick={() => c.setProjectDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={c.handleSave}
              disabled={
                c.createMutation?.isPending ||
                c.updateMutation?.isPending ||
                (c.uploadProgress != null) ||
                (c.editingProject
                  ? !c.projectForm?.grant_id ||
                    !c.projectForm?.office_id ||
                    !(c.projectForm?.project_code ?? '').trim() ||
                    !(c.projectForm?.project_name ?? '').trim() ||
                    !c.projectForm?.start_date ||
                    !c.projectForm?.end_date ||
                    (Number(c.projectForm?.total_budget ?? 0) < 0) ||
                    !c.projectForm?.currency
                  : (c.dialogMode === 'amendment' && !c.projectForm?.grant_id) ||
                    (c.dialogMode === 'new-project' && (
                      !c.effectiveDonorId ||
                      !(c.newContractForm?.grant_code ?? '').trim() ||
                      !(c.newContractForm?.grant_name ?? '').trim() ||
                      !(c.newContractForm?.start_date || c.projectForm?.start_date) ||
                      !(c.newContractForm?.end_date || c.projectForm?.end_date) ||
                      (Number(c.newContractForm?.total_amount ?? c.projectForm?.total_budget ?? 0) < 0) ||
                      !(c.newContractForm?.currency || c.projectForm?.currency)
                    )) ||
                    !c.projectForm?.office_id ||
                    !(c.projectForm?.project_code ?? '').trim() ||
                    !(c.projectForm?.project_name ?? '').trim() ||
                    !c.projectForm?.start_date ||
                    !c.projectForm?.end_date ||
                    (Number(c.projectForm?.total_budget ?? 0) < 0) ||
                    !c.projectForm?.currency)
              }
            >
              {c.createMutation?.isPending || c.updateMutation?.isPending ? 'Saving…' : c.editingProject ? 'Update Project' : c.dialogMode === 'amendment' ? 'Add Amendment' : 'Add Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={c.viewDialogOpen}
        onOpenChange={(open) => {
          if (open !== c.viewDialogOpen) c.setViewDialogOpen(open)
        }}
      >
        <DialogContent className="sm:max-w-[740px] max-h-[90vh] overflow-y-auto p-0 gap-0">
          <DialogTitle asChild>
            <span className="sr-only">
              {c.viewingProject?.project?.project_name ? `Project details: ${c.viewingProject.project.project_name}` : 'Project details'}
            </span>
          </DialogTitle>
          <DialogDescription asChild>
            <span className="sr-only">View project overview, budget, and quick links.</span>
          </DialogDescription>
          {!c.viewingProject && (
            <div className="px-6 py-12 text-center text-slate-500 text-sm">No project data to display.</div>
          )}
          {c.viewingProject && (
            <>
              {/* Hero header */}
              <div className="shrink-0 border-b border-slate-200/90 bg-gradient-to-b from-slate-50 to-white px-6 py-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    {c.viewingProject.project.project_code && (
                      <span className="inline-block font-mono text-xs font-medium text-slate-500 bg-slate-100/90 text-slate-700 px-2.5 py-1 rounded-md mb-2">
                        {c.viewingProject.project.project_code}
                      </span>
                    )}
                    <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                      {c.viewingProject.project.project_name}
                    </h2>
                    <p className="text-sm text-slate-500 mt-0.5">Project overview and financial summary</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={c.getProjectStatusColor(c.viewingProject.project.status)}>
                      {c.getProjectStatusLabel(c.viewingProject.project.status)}
                    </Badge>
                    {c.viewingProject.project.grant && (
                      <Badge variant="outline" className="font-normal text-slate-600 border-slate-200">
                        {c.viewingProject.project.grant.grant_code}
                      </Badge>
                    )}
                    {c.viewingProject.project.sector && (
                      <Badge variant="secondary" className="font-normal text-slate-600">{c.viewingProject.project.sector}</Badge>
                    )}
                    {c.viewingProject.project.grant?.grant_type && (
                      <Badge variant="outline" className="font-normal text-slate-600 border-slate-200">
                        {c.getGrantTypeLabel(c.viewingProject.project.grant.grant_type)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                {/* Details: two-column definition list */}
                <section className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                    <Users className="h-4 w-4 text-slate-500" />
                    <h3 className="text-sm font-semibold text-slate-800">Project details</h3>
                  </div>
                  <div className="p-4">
                    <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
                      <div>
                        <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">Donor</dt>
                        <dd className="mt-1 font-medium text-slate-900">{c.viewingProject.project.grant?.donor ? (c.viewingProject.project.grant.donor.short_name || c.viewingProject.project.grant.donor.name || '—') : '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">Office</dt>
                        <dd className="mt-1 font-medium text-slate-900">{c.viewingProject.project.office?.name || '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">Project manager</dt>
                        <dd className="mt-1 font-medium text-slate-900">{c.viewingProject.project.manager?.name || '—'}</dd>
                      </div>
                      <div className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">Start – End</dt>
                          <dd className="mt-1 font-medium text-slate-900">{c.formatDate(c.viewingProject.project.start_date)} – {c.formatDate(c.viewingProject.project.end_date)}</dd>
                        </div>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">Currency</dt>
                        <dd className="mt-1 font-mono font-medium text-slate-900">{c.viewingProject.project.currency || c.viewingProject.project.grant?.currency || '—'}</dd>
                      </div>
                      {c.viewingProject.project.target_beneficiaries != null && c.viewingProject.project.target_beneficiaries !== '' && (
                        <div>
                          <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">Target beneficiaries</dt>
                          <dd className="mt-1 font-medium text-slate-900">{Number(c.viewingProject.project.target_beneficiaries).toLocaleString()}</dd>
                        </div>
                      )}
                    </dl>
                    {(c.viewingProject.project.locations_list?.length ?? (c.viewingProject.project.locations?.length ?? 0)) > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" /> Locations
                        </dt>
                        <dd className="mt-1.5 text-sm font-medium text-slate-800 leading-snug">
                          {(c.viewingProject.project.locations_list ?? c.viewingProject.project.locations ?? []).join(', ')}
                        </dd>
                      </div>
                    )}
                  </div>
                </section>

                {/* Budget: KPI cards + progress */}
                <section className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                    <Wallet className="h-4 w-4 text-slate-500" />
                    <h3 className="text-sm font-semibold text-slate-800">Budget & utilization</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-600 font-medium">Utilization</span>
                        <span className="font-semibold tabular-nums text-slate-900">{c.viewingProject.budget_utilization}%</span>
                      </div>
                      <Progress value={c.viewingProject.budget_utilization} className="h-2.5" />
                    </div>
                    {(() => {
                      const projCur = c.viewingProject.project.currency || c.viewingProject.project.grant?.currency || 'USD'
                      return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4 text-center">
                        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Budget</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">{c.formatCurrency(c.viewingProject.project.total_budget ?? 0, projCur)}</p>
                      </div>
                      <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4 text-center">
                        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Spent</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">{c.formatCurrency(c.viewingProject.project.spent_amount ?? 0, projCur)}</p>
                      </div>
                      <div className="rounded-lg border border-amber-100 bg-amber-50/60 p-4 text-center">
                        <p className="text-[11px] font-medium text-amber-700/80 uppercase tracking-wider">Committed</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">{c.formatCurrency(c.viewingProject.project.committed_amount ?? 0, projCur)}</p>
                      </div>
                      <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-4 text-center">
                        <p className="text-[11px] font-medium text-emerald-700/80 uppercase tracking-wider">Available</p>
                        <p className="mt-1 text-sm font-semibold text-emerald-800 tabular-nums">{c.formatCurrency(c.viewingProject.available_budget ?? 0, projCur)}</p>
                      </div>
                    </div>
                      )
                    })()}
                  </div>
                </section>

                {(c.viewingProject.amendments?.length ?? 0) > 0 && (
                  <section className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                      <FileEdit className="h-4 w-4 text-slate-500" />
                      <h3 className="text-sm font-semibold text-slate-800">Amendments ({c.viewingProject.amendments.length})</h3>
                    </div>
                    <ul className="divide-y divide-slate-100 p-4 space-y-2">
                      {c.viewingProject.amendments.map((a: { id: number; project_code: string; project_name: string; grant?: { grant_code?: string }; status?: string }) => (
                        <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                          <span className="font-mono text-slate-600">{a.project_code}</span>
                          <span className="text-slate-800 flex-1 truncate">{a.project_name}</span>
                          {a.grant?.grant_code && <span className="text-slate-500 text-xs">({a.grant.grant_code})</span>}
                          <Badge variant="secondary" className="text-xs font-normal">{c.getProjectStatusLabel?.(a.status) ?? a.status}</Badge>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {c.viewingProject.project.description && (
                  <section className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                      <FileText className="h-4 w-4 text-slate-500" />
                      <h3 className="text-sm font-semibold text-slate-800">Description</h3>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-slate-700 leading-relaxed">{c.viewingProject.project.description}</p>
                    </div>
                  </section>
                )}

                {/* Recent transactions */}
                {c.viewingProject.recent_transactions?.length > 0 && (
                  <section className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                      <Receipt className="h-4 w-4 text-slate-500" />
                      <h3 className="text-sm font-semibold text-slate-800">Recent transactions</h3>
                    </div>
                    <div className="overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Entry · Date</th>
                            <th className="text-right py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {c.viewingProject.recent_transactions.slice(0, 5).map((tx: { id?: number; journal_entry?: { entry_number?: string; entry_date?: string; description?: string }; journalEntry?: { entry_number?: string; entry_date?: string; description?: string }; amount?: number }) => {
                            const je = tx.journal_entry ?? tx.journalEntry
                            return (
                              <tr key={tx.id ?? (je?.entry_number ?? '') + String(tx.amount)} className="hover:bg-slate-50/50">
                                <td className="py-2.5 px-4 text-slate-700">
                                  <span className="font-mono text-slate-600">{je?.entry_number ?? '—'}</span>
                                  {je?.entry_date && <span className="text-slate-400 mx-1.5">·</span>}
                                  <span>{je?.entry_date ? c.formatDate(je.entry_date) : ''}</span>
                                  {je?.description && <span className="text-slate-500 block truncate max-w-[240px] mt-0.5">{je.description}</span>}
                                </td>
                                <td className="py-2.5 px-4 text-right font-mono font-medium text-slate-900 tabular-nums">{c.formatCurrency(tx.amount ?? 0, c.viewingProject.project.currency || c.viewingProject.project.grant?.currency || 'USD')}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                      <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/30">
                        <Link href={`/general-ledger/journal-entries/posted?project_id=${c.viewingProject.project.id}`} className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1" onClick={() => c.setViewDialogOpen(false)}>
                          View all in Journal
                          <ChevronDown className="h-3.5 w-3.5 rotate-[-90deg]" />
                        </Link>
                      </div>
                    </div>
                  </section>
                )}

                {/* Attachments: contract (grant) documents + project documents */}
                {((c.viewingProject.project.grant?.documents?.length ?? 0) > 0 || (c.viewingProject.project.documents?.length ?? 0) > 0) && (
                  <section className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                      <Paperclip className="h-4 w-4 text-slate-500" />
                      <h3 className="text-sm font-semibold text-slate-800">Attachments</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {(c.viewingProject.project.grant?.documents ?? []).length > 0 && (
                        <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Contract documents</p>
                        </div>
                      )}
                      <ul className="divide-y divide-slate-100">
                        {(c.viewingProject.project.grant?.documents ?? []).map((doc: { id: number; file_name: string; title?: string }) => (
                          <li key={`g-${doc.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50/50 transition-colors">
                            <span className="flex items-center gap-3 min-w-0">
                              <DocumentFileIcon fileName={doc.file_name || doc.title || ''} size="sm" />
                              <span className="text-sm font-medium text-slate-800 truncate" title={doc.title || doc.file_name}>{doc.title || doc.file_name}</span>
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 shrink-0 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                              onClick={() => c.viewingProject?.project?.grant_id && c.downloadGrantDocument?.(c.viewingProject.project.grant_id, doc.id, doc.file_name || doc.title)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                      {(c.viewingProject.project.documents ?? []).length > 0 && (
                        <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Project attachments</p>
                        </div>
                      )}
                      <ul className="divide-y divide-slate-100">
                        {(c.viewingProject.project.documents ?? []).map((doc: { id: number; file_name: string; title?: string }) => (
                          <li key={`p-${doc.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50/50 transition-colors">
                            <span className="flex items-center gap-3 min-w-0">
                              <DocumentFileIcon fileName={doc.file_name || doc.title || ''} size="sm" />
                              <span className="text-sm font-medium text-slate-800 truncate" title={doc.title || doc.file_name}>{doc.title || doc.file_name}</span>
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 shrink-0 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                              onClick={() => c.downloadProjectDocument?.(c.viewingProject.project.id, doc.id, doc.file_name || doc.title)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                )}

                {/* Quick links */}
                <section className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                    <BarChart3 className="h-4 w-4 text-slate-500" />
                    <h3 className="text-sm font-semibold text-slate-800">Quick links</h3>
                  </div>
                  <div className="p-4 flex flex-wrap gap-2">
                    <Link href="/projects/budget" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors" onClick={() => c.setViewDialogOpen(false)}>
                      <PieChart className="h-4 w-4 text-slate-500" />
                      Budget
                    </Link>
                    <Link href={`/general-ledger/journal-entries/posted?project_id=${c.viewingProject.project.id}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors" onClick={() => c.setViewDialogOpen(false)}>
                      <FileText className="h-4 w-4 text-slate-500" />
                      Journal
                    </Link>
                    <Link href={`/vouchers?project_id=${c.viewingProject.project.id}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors" onClick={() => c.setViewDialogOpen(false)}>
                      <Receipt className="h-4 w-4 text-slate-500" />
                      Vouchers
                    </Link>
                    <Link href={`/reports?project_id=${c.viewingProject.project.id}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors" onClick={() => c.setViewDialogOpen(false)}>
                      <BarChart3 className="h-4 w-4 text-slate-500" />
                      Reports
                    </Link>
                  </div>
                </section>
              </div>

              {/* Footer */}
              <div className="shrink-0 border-t border-slate-200 bg-slate-50/50 px-6 py-4 flex flex-wrap items-center justify-end gap-2">
                <Button variant="outline" onClick={() => c.setViewDialogOpen(false)} className="min-w-[80px]">
                  Close
                </Button>
                <Button variant="outline" className="min-w-[100px]" asChild>
                  <Link href={`/projects/amendment?project_id=${c.viewingProject.project.id}`} onClick={() => c.setViewDialogOpen(false)}>
                    <FileEdit className="h-4 w-4 mr-2" />
                    Amend
                  </Link>
                </Button>
                <Button
                  className="min-w-[100px]"
                  onClick={() => {
                    if (c.viewingProject?.project) {
                      c.handleEdit?.(c.viewingProject.project)
                      c.setViewDialogOpen(false)
                    }
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={c.deleteDialogOpen}
        onOpenChange={(open) => {
          if (open !== c.deleteDialogOpen) c.setDeleteDialogOpen(open)
          if (!open) c.setDeleteConfirmCode?.('')
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete project <strong>{c.projectToDelete?.project_name}</strong> ({c.projectToDelete?.project_code})?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {c.projectToDelete && (
            <>
              <div className="rounded-md border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs space-y-1">
                <p className="font-medium text-slate-700">Summary</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-slate-600">
                  <span>Status</span>
                  <span>{c.getProjectStatusLabel?.(c.projectToDelete.status)}</span>
                  <span>Budget</span>
                  <span>{c.formatCurrency?.(c.projectToDelete.total_budget ?? 0, c.projectToDelete.currency || c.projectToDelete.grant?.currency || 'USD')}</span>
                  <span>Spent</span>
                  <span>{c.formatCurrency?.(c.projectToDelete.spent_amount ?? 0, c.projectToDelete.currency || c.projectToDelete.grant?.currency || 'USD')}</span>
                  <span>Committed</span>
                  <span>{c.formatCurrency?.(c.projectToDelete.committed_amount ?? 0, c.projectToDelete.currency || c.projectToDelete.grant?.currency || 'USD')}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Only draft, planning or cancelled projects with zero spent/committed can be deleted.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="delete-confirm-code" className="text-xs font-medium text-foreground">
                  Type <strong>{c.projectToDelete?.project_code}</strong> to confirm
                </Label>
                <Input
                  id="delete-confirm-code"
                  value={c.deleteConfirmCode ?? ''}
                  onChange={(e) => c.setDeleteConfirmCode?.(e.target.value)}
                  placeholder="Project code"
                  className="font-mono h-9"
                  autoComplete="off"
                />
              </div>
            </>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => c.setDeleteConfirmCode?.('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => c.projectToDelete && c.deleteMutation?.mutate(c.projectToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={
                c.deleteMutation?.isPending ||
                (c.projectToDelete?.project_code?.trim().toUpperCase() !== (c.deleteConfirmCode ?? '').trim().toUpperCase())
              }
            >
              {c.deleteMutation?.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={c.attachmentToDelete != null}
        onOpenChange={(open) => {
          if (!open) c.setAttachmentToDelete?.(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove attachment</AlertDialogTitle>
            <AlertDialogDescription>
              Remove this attachment from this project? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => c.attachmentToDelete != null && c.handleDeleteEditAttachment?.(c.attachmentToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

