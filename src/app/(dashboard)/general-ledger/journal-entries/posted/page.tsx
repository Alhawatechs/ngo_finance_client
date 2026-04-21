'use client'

import React, { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { FinanceDataTable, FinanceDataTableHeader, FinanceDataTableTh, FinanceDataTableRow, FinanceDataTableTd } from '@/components/finance/DataTable'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getProjects } from '@/lib/api/projects'
import { getJournals } from '@/lib/api/journals'
import { exportJournalBookCsv, getProjectLedger } from '@/lib/api/journal-entries'
import { useHasPermission } from '@/stores/authStore'
import { FileSpreadsheet, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'

function formatAccountClass(accountType: string): string {
  if (!accountType) return 'Other'
  const t = accountType.replace(/_/g, ' ')
  return t.replace(/\b\w/g, (c) => c.toUpperCase())
}

function isVoucherSource(sourceType: string | null | undefined): boolean {
  if (!sourceType) return false
  return sourceType === 'App\\Models\\Voucher' || sourceType.endsWith('\\Voucher')
}

function PostedLedgerInner() {
  const searchParams = useSearchParams()
  const projectFromUrl = searchParams.get('project_id')
  const canViewJournalBooks = useHasPermission('view-journal-books')

  const [projectId, setProjectId] = useState<string>(projectFromUrl ?? '')
  const [journalId, setJournalId] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const q = searchParams.get('project_id')
    if (q) {
      setProjectId(q)
      setPage(1)
    }
  }, [searchParams])

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects-list-posted-ledger'],
    queryFn: () => getProjects({ per_page: 300, status: 'active', all_offices: true }),
    staleTime: 5 * 60 * 1000,
    enabled: canViewJournalBooks,
  })
  const projects: { id: number; project_code: string; project_name: string }[] = Array.isArray(projectsData)
    ? projectsData
    : ((projectsData as { data?: { id: number; project_code: string; project_name: string }[] })?.data ?? [])

  const selectedProjectIdNum = projectId ? Number(projectId) : 0

  const { data: journalsData } = useQuery({
    queryKey: ['journals-posted-ledger', selectedProjectIdNum],
    queryFn: () => getJournals({ per_page: 200, project_id: selectedProjectIdNum, is_active: true }),
    enabled: canViewJournalBooks && selectedProjectIdNum > 0,
    staleTime: 2 * 60 * 1000,
  })
  const journals: { id: number; name: string; code: string }[] =
    (journalsData as { data?: { id: number; name: string; code: string }[] } | undefined)?.data ?? []

  const ledgerQuery = useQuery({
    queryKey: [
      'project-ledger',
      selectedProjectIdNum,
      startDate,
      endDate,
      journalId,
      page,
    ],
    queryFn: () =>
      getProjectLedger({
        project_id: selectedProjectIdNum,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        journal_id: journalId !== 'all' ? Number(journalId) : undefined,
        page,
        per_page: 50,
      }),
    enabled: canViewJournalBooks && selectedProjectIdNum > 0,
  })

  const payload = ledgerQuery.data
  const accountSummary = payload?.data?.account_summary ?? []
  const lines = payload?.data?.lines ?? []
  const meta = payload?.meta
  const projectInfo = payload?.data?.project

  const summaryByClass = useMemo(() => {
    const m = new Map<string, typeof accountSummary>()
    for (const row of accountSummary) {
      const k = row.account_type || 'other'
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(row)
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [accountSummary])

  const exportCsv = () => {
    if (selectedProjectIdNum <= 0) return
    void exportJournalBookCsv({
      status: 'posted',
      project_id: selectedProjectIdNum,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      journal_id: journalId !== 'all' ? Number(journalId) : undefined,
    })
  }

  if (!canViewJournalBooks) {
    return (
      <Card className="coa-ledger-card border-dashed">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          You do not have permission to view journal books or posted ledger. Ask an administrator to assign{' '}
          <span className="font-medium text-foreground">View Journal Books</span>.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1 space-y-1.5">
          <Label htmlFor="posted-ledger-project">Project</Label>
          <Select
            value={projectId || undefined}
            onValueChange={(v) => {
              setProjectId(v)
              setJournalId('all')
              setPage(1)
            }}
            disabled={projectsLoading}
          >
            <SelectTrigger id="posted-ledger-project" className="h-9">
              <SelectValue placeholder={projectsLoading ? 'Loading projects…' : 'Select a project'} />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.project_code} — {p.project_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[200px] flex-1 space-y-1.5">
          <Label>Journal book (optional)</Label>
          <Select
            value={journalId}
            onValueChange={(v) => {
              setJournalId(v)
              setPage(1)
            }}
            disabled={!selectedProjectIdNum}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All books" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All journal books</SelectItem>
              {journals.map((j) => (
                <SelectItem key={j.id} value={String(j.id)}>
                  {j.code} — {j.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="posted-start">From</Label>
            <Input
              id="posted-start"
              type="date"
              className="h-9 w-[150px]"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="posted-end">To</Label>
            <Input
              id="posted-end"
              type="date"
              className="h-9 w-[150px]"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setPage(1)
              }}
            />
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 shrink-0"
          disabled={selectedProjectIdNum <= 0}
          onClick={() => exportCsv()}
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {!selectedProjectIdNum ? (
        <Card className="coa-ledger-card border-dashed">
          <CardContent className="py-14 text-center text-sm text-muted-foreground">
            Select a <span className="font-medium text-foreground">project</span> to view its posted ledger: amounts by
            account class and account, with transaction lines below.
          </CardContent>
        </Card>
      ) : (
        <>
          {projectInfo && (
            <p className="text-sm text-muted-foreground">
              Ledger for{' '}
              <span className="font-medium text-foreground">
                {projectInfo.project_code} — {projectInfo.project_name}
              </span>
            </p>
          )}

          <Card className="coa-ledger-card">
            <CardHeader className="py-3">
              <CardTitle className="text-base">By account class and account</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {ledgerQuery.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : summaryByClass.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No posted lines for this filter.</p>
              ) : (
                <Accordion type="multiple" className="w-full border border-border/80 rounded-md">
                  {summaryByClass.map(([accountType, rows]) => (
                    <AccordionItem key={accountType} value={accountType} className="border-b-0 px-3">
                      <AccordionTrigger className="py-2 text-sm font-semibold hover:no-underline">
                        {formatAccountClass(accountType)}
                      </AccordionTrigger>
                      <AccordionContent className="pb-3 pt-0">
                        <div className="coa-ledger-table-frame overflow-x-auto">
                          <table className="w-full min-w-[520px] border-collapse text-sm">
                            <thead>
                              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                <th className="px-3 py-2 font-medium">Account</th>
                                <th className="px-3 py-2 text-right font-medium">Debit</th>
                                <th className="px-3 py-2 text-right font-medium">Credit</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((r) => (
                                <tr key={r.account_id} className="border-b border-border/60">
                                  <td className="px-3 py-2 tabular-nums text-foreground">
                                    <span className="font-mono text-xs text-muted-foreground">{r.account_code}</span>{' '}
                                    {r.account_name}
                                  </td>
                                  <td className="px-3 py-2 text-right tabular-nums">
                                    {Number(r.total_debit) > 0 ? formatCurrency(Number(r.total_debit)) : '—'}
                                  </td>
                                  <td className="px-3 py-2 text-right tabular-nums">
                                    {Number(r.total_credit) > 0 ? formatCurrency(Number(r.total_credit)) : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>

          <Card className="coa-ledger-card flex min-h-0 flex-1 flex-col overflow-hidden">
            <CardHeader className="py-3">
              <CardTitle className="text-base">Posted transaction lines</CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
              <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
                <FinanceDataTable className="min-w-0" tableClassName="w-full min-w-[960px] border-collapse text-sm">
                    <FinanceDataTableHeader theadClassName="coa-ledger-thead sticky top-0 z-10">
                      <FinanceDataTableTh className="py-2 text-xs">Date</FinanceDataTableTh>
                      <FinanceDataTableTh className="py-2 text-xs">JE #</FinanceDataTableTh>
                      <FinanceDataTableTh className="py-2 text-xs">Journal book</FinanceDataTableTh>
                      <FinanceDataTableTh className="py-2 text-xs">Account</FinanceDataTableTh>
                      <FinanceDataTableTh className="py-2 text-xs">Description</FinanceDataTableTh>
                      <FinanceDataTableTh className="py-2 text-right text-xs">Debit</FinanceDataTableTh>
                      <FinanceDataTableTh className="py-2 text-right text-xs">Credit</FinanceDataTableTh>
                      <FinanceDataTableTh className="py-2 text-center text-xs">Source</FinanceDataTableTh>
                    </FinanceDataTableHeader>
                    <tbody>
                      {ledgerQuery.isLoading ? (
                        [...Array(6)].map((_, i) => (
                          <FinanceDataTableRow key={i}>
                            <FinanceDataTableTd colSpan={8} className="py-3">
                              <Skeleton className="h-4 w-full" />
                            </FinanceDataTableTd>
                          </FinanceDataTableRow>
                        ))
                      ) : lines.length === 0 ? (
                        <FinanceDataTableRow>
                          <FinanceDataTableTd colSpan={8} className="py-10 text-center text-muted-foreground">
                            No lines in this page.
                          </FinanceDataTableTd>
                        </FinanceDataTableRow>
                      ) : (
                        lines.map((line) => {
                          const je = line.journal_entry
                          const dt = je?.entry_date ? formatDate(je.entry_date) : '—'
                          const voucherId = je && isVoucherSource(je.source_type) ? je.source_id : null
                          return (
                            <FinanceDataTableRow key={line.id}>
                              <FinanceDataTableTd className="whitespace-nowrap text-xs">{dt}</FinanceDataTableTd>
                              <FinanceDataTableTd className="font-mono text-xs">{je?.entry_number ?? '—'}</FinanceDataTableTd>
                              <FinanceDataTableTd className="max-w-[140px] truncate text-xs">
                                {je?.journal ? `${je.journal.code} · ${je.journal.name}` : '—'}
                              </FinanceDataTableTd>
                              <FinanceDataTableTd className="max-w-[200px] text-xs">
                                {line.account ? (
                                  <>
                                    <span className="font-mono text-muted-foreground">{line.account.account_code}</span>{' '}
                                    {line.account.account_name}
                                  </>
                                ) : (
                                  '—'
                                )}
                              </FinanceDataTableTd>
                              <FinanceDataTableTd className="max-w-[220px] truncate text-xs text-muted-foreground">
                                {line.description || je?.description || '—'}
                              </FinanceDataTableTd>
                              <FinanceDataTableTd className="text-right text-xs tabular-nums">
                                {Number(line.debit_amount) > 0 ? formatCurrency(Number(line.debit_amount)) : '—'}
                              </FinanceDataTableTd>
                              <FinanceDataTableTd className="text-right text-xs tabular-nums">
                                {Number(line.credit_amount) > 0 ? formatCurrency(Number(line.credit_amount)) : '—'}
                              </FinanceDataTableTd>
                              <FinanceDataTableTd className="text-center">
                                {voucherId ? (
                                  <Link
                                    href={`/vouchers/${voucherId}/edit`}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                  >
                                    Voucher
                                    <ExternalLink className="h-3 w-3" />
                                  </Link>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </FinanceDataTableTd>
                            </FinanceDataTableRow>
                          )
                        })
                      )}
                    </tbody>
                </FinanceDataTable>
              </div>
              {meta && meta.last_page > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground">
                  <span>
                    Page {meta.current_page} of {meta.last_page} ({meta.total} lines)
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8"
                      disabled={meta.current_page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8"
                      disabled={meta.current_page >= meta.last_page}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

export default function PostedLedgerPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-3">
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <PostedLedgerInner />
    </Suspense>
  )
}
