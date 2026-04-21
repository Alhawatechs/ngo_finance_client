'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ExternalLink, Check, Inbox, FileText, Wallet } from 'lucide-react'
import { getApprovalCenterItems, type ApprovalCenterItem } from '@/lib/api/approval-center'
import { useApprovalCenterCounts } from '@/hooks/useApprovalCenterCounts'
import { ApprovalWorkflowLegend } from '@/components/approval/ApprovalWorkflowLegend'
import { ApprovalWorkflowStrip } from '@/components/approval/ApprovalWorkflowStrip'
import { approveBudget } from '@/lib/api/budgets'
import { cn, formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { handleApiError } from '@/lib/api/client'
import {
  FinanceDataTable,
  FinanceDataTableHeader,
  FinanceDataTableTh,
  FinanceDataTableRow,
  FinanceDataTableTd,
  FinancePagination,
} from '@/components/finance/DataTable'

function typeLabel(t: ApprovalCenterItem['resource_type']): string {
  return t === 'voucher' ? 'Voucher' : 'Budget'
}

function TypeBadge({ type }: { type: ApprovalCenterItem['resource_type'] }) {
  const isVoucher = type === 'voucher'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold',
        isVoucher
          ? 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200'
          : 'border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200'
      )}
    >
      {isVoucher ? (
        <FileText className="h-3 w-3 opacity-80" aria-hidden />
      ) : (
        <Wallet className="h-3 w-3 opacity-80" aria-hidden />
      )}
      {typeLabel(type)}
    </span>
  )
}

function formatSubmittedAt(iso: string | null): { date: string; time: string } | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return {
    date: d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
  }
}

export type ApprovalCenterTypeFilter = 'all' | 'voucher' | 'budget'

type ApprovalCenterPanelProps = {
  type: ApprovalCenterTypeFilter
}

export function ApprovalCenterPanel({ type }: ApprovalCenterPanelProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchInput, setSearchInput] = useState('')
  const [deptInput, setDeptInput] = useState('')
  const [activeFilters, setActiveFilters] = useState({ search: '', department: '' })
  const [page, setPage] = useState(1)
  const [approvingId, setApprovingId] = useState<number | null>(null)

  const { data: listResponse, isLoading, isFetching } = useQuery({
    queryKey: ['approval-center', type, activeFilters.search, activeFilters.department, page],
    queryFn: () =>
      getApprovalCenterItems({
        type,
        search: activeFilters.search || undefined,
        department: activeFilters.department || undefined,
        page,
        per_page: 25,
      }),
  })

  const { data: countsPayload } = useApprovalCenterCounts()
  const workflowLegendDef =
    countsPayload?.workflow_definition ?? listResponse?.workflow_definition

  const items = listResponse?.data ?? []
  const meta = listResponse?.meta

  const approveMutation = useMutation({
    mutationFn: (id: number) => approveBudget(id),
    onMutate: (id) => setApprovingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-center'] })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      toast({ title: 'Approved', description: 'Budget approved successfully.' })
    },
    onError: (err: unknown) => {
      toast({ title: 'Error', description: handleApiError(err), variant: 'destructive' })
    },
    onSettled: () => setApprovingId(null),
  })

  const onFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setActiveFilters({
      search: searchInput.trim(),
      department: deptInput.trim(),
    })
    setPage(1)
  }

  const filterTitle =
    type === 'all' ? 'All pending items' : type === 'voucher' ? 'Voucher approvals' : 'Budget approvals'

  const showPagination = meta != null && meta.last_page > 1
  const from = meta?.from ?? 0
  const to = meta?.to ?? 0
  const total = meta?.total ?? 0

  return (
    <div className="space-y-4">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
          <p className="text-sm text-muted-foreground">
            Search by reference, payee, or title. Optionally narrow by submitter department.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onFilterSubmit} className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
            <div className="space-y-2 flex-1 min-w-[200px]">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Reference, payee, description…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-2 w-full md:w-48">
              <label className="text-sm font-medium">Department</label>
              <Input
                placeholder="Submitter department"
                value={deptInput}
                onChange={(e) => setDeptInput(e.target.value)}
                className="h-10"
              />
            </div>
            <Button type="submit" variant="secondary" className="h-10">
              Apply
            </Button>
          </form>
        </CardContent>
      </Card>

      <ApprovalWorkflowLegend definition={workflowLegendDef} />

      <Card className="border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base font-semibold tracking-tight">
            {filterTitle}
            {meta != null && (
              <Badge variant="secondary" className="font-medium tabular-nums">
                {meta.total} total
              </Badge>
            )}
            {isFetching && !isLoading && (
              <span className="text-xs font-normal text-muted-foreground animate-pulse">Updating…</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          {isLoading ? (
            <div className="p-4 space-y-0">
              <div className="rounded-lg border border-border/60 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 border-b bg-muted/40 px-4 py-3">
                  <Skeleton className="h-4 col-span-1" />
                  <Skeleton className="h-4 col-span-2" />
                  <Skeleton className="h-4 col-span-2" />
                  <Skeleton className="h-4 col-span-2" />
                  <Skeleton className="h-4 col-span-2" />
                  <Skeleton className="h-4 col-span-3" />
                </div>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex gap-4 border-b last:border-0 px-4 py-3.5">
                    <Skeleton className="h-5 w-20 shrink-0" />
                    <Skeleton className="h-5 w-24 shrink-0" />
                    <Skeleton className="h-5 flex-1 max-w-[200px]" />
                    <Skeleton className="h-5 w-28 shrink-0 ml-auto" />
                  </div>
                ))}
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/15 py-16 px-6 mx-4 my-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50 text-muted-foreground/70 mb-4">
                <Inbox className="h-7 w-7" strokeWidth={1.5} />
              </div>
              <p className="text-base font-medium text-foreground">No pending approvals</p>
              <p className="text-sm text-muted-foreground text-center max-w-sm mt-1.5">
                Try adjusting search or department filters, or check again later when new items are submitted.
              </p>
            </div>
          ) : (
            <>
              <div className="relative rounded-none sm:rounded-b-lg">
                <div className="max-h-[min(70vh,720px)] overflow-auto [scrollbar-gutter:stable]">
                  <FinanceDataTable
                    className="rounded-none border-0 shadow-none ring-0"
                    tableClassName="w-full min-w-[1100px] border-collapse text-sm"
                  >
                      <FinanceDataTableHeader
                        theadClassName="sticky top-0 z-[1]"
                        className="border-b border-border bg-muted/90 shadow-[0_1px_0_0_hsl(var(--border))] backdrop-blur supports-[backdrop-filter]:bg-muted/75"
                      >
                        <FinanceDataTableTh className="whitespace-nowrap pl-4">Type</FinanceDataTableTh>
                        <FinanceDataTableTh className="whitespace-nowrap">Reference</FinanceDataTableTh>
                        <FinanceDataTableTh className="min-w-[180px]">Title</FinanceDataTableTh>
                        <FinanceDataTableTh align="right" className="whitespace-nowrap">
                          Amount
                        </FinanceDataTableTh>
                        <FinanceDataTableTh className="min-w-[200px] max-w-[280px]">Approval</FinanceDataTableTh>
                        <FinanceDataTableTh className="whitespace-nowrap">Submitted</FinanceDataTableTh>
                        <FinanceDataTableTh className="whitespace-nowrap">Submitted by</FinanceDataTableTh>
                        <FinanceDataTableTh className="whitespace-nowrap">Department</FinanceDataTableTh>
                        <FinanceDataTableTh className="whitespace-nowrap">Office</FinanceDataTableTh>
                        <FinanceDataTableTh align="right" className="whitespace-nowrap pr-4">
                          Actions
                        </FinanceDataTableTh>
                      </FinanceDataTableHeader>
                      <tbody>
                        {items.map((row: ApprovalCenterItem, idx: number) => {
                          const submitted = formatSubmittedAt(row.submitted_at)
                          return (
                            <FinanceDataTableRow
                              key={`${row.resource_type}-${row.id}`}
                              className={cn(
                                'group border-b border-border/50 transition-colors',
                                idx % 2 === 0 ? 'bg-background' : 'bg-muted/[0.35]',
                                'hover:bg-primary/[0.04] dark:hover:bg-primary/10'
                              )}
                            >
                              <FinanceDataTableTd className="pl-4 align-middle">
                                <TypeBadge type={row.resource_type} />
                              </FinanceDataTableTd>
                              <FinanceDataTableTd className="align-middle">
                                <span className="font-mono text-xs font-medium text-foreground tabular-nums">
                                  {row.reference}
                                </span>
                              </FinanceDataTableTd>
                              <FinanceDataTableTd
                                className="align-middle max-w-[min(280px,28vw)]"
                                title={row.title}
                              >
                                <span className="line-clamp-2 text-foreground/95 leading-snug">{row.title}</span>
                                {row.subtitle ? (
                                  <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-1">
                                    {row.subtitle}
                                  </span>
                                ) : null}
                              </FinanceDataTableTd>
                              <FinanceDataTableTd align="right" className="align-middle">
                                <span className="font-semibold tabular-nums text-foreground">
                                  {formatCurrency(parseFloat(row.amount), row.currency)}
                                </span>
                              </FinanceDataTableTd>
                              <FinanceDataTableTd className="align-middle">
                                <ApprovalWorkflowStrip workflow={row.meta.workflow} />
                              </FinanceDataTableTd>
                              <FinanceDataTableTd className="align-middle">
                                {submitted ? (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-foreground whitespace-nowrap">{submitted.date}</span>
                                    <span className="text-xs text-muted-foreground tabular-nums">{submitted.time}</span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </FinanceDataTableTd>
                              <FinanceDataTableTd className="align-middle text-foreground">
                                {row.submitted_by?.name ?? '—'}
                              </FinanceDataTableTd>
                              <FinanceDataTableTd className="align-middle text-muted-foreground">
                                {row.department ?? '—'}
                              </FinanceDataTableTd>
                              <FinanceDataTableTd className="align-middle">{row.office?.name ?? '—'}</FinanceDataTableTd>
                              <FinanceDataTableTd align="right" className="align-middle pr-4">
                                <div className="flex justify-end gap-1.5 flex-wrap opacity-95 group-hover:opacity-100">
                                  <Button variant="outline" size="sm" className="h-8 shadow-sm" asChild>
                                    <Link href={row.deep_link}>
                                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                      Open
                                    </Link>
                                  </Button>
                                  {row.resource_type === 'budget' && row.actions.can_approve && (
                                    <Button
                                      size="sm"
                                      className="h-8 shadow-sm"
                                      disabled={approveMutation.isPending && approvingId === row.id}
                                      onClick={() => approveMutation.mutate(row.id)}
                                    >
                                      <Check className="h-3.5 w-3.5 mr-1" />
                                      Approve
                                    </Button>
                                  )}
                                </div>
                              </FinanceDataTableTd>
                            </FinanceDataTableRow>
                          )
                        })}
                      </tbody>
                  </FinanceDataTable>
                </div>
              </div>

              {showPagination && meta && (
                <div className="px-2 pb-2 pt-1 sm:px-4">
                  <FinancePagination
                    from={from}
                    to={to}
                    total={total}
                    label="items"
                    currentPage={meta.current_page}
                    lastPage={meta.last_page}
                    onPageChange={(p) => setPage(p)}
                    onPrevious={() => setPage((p) => Math.max(1, p - 1))}
                    onNext={() => setPage((p) => p + 1)}
                    previousDisabled={meta.current_page <= 1 || isFetching}
                    nextDisabled={meta.current_page >= meta.last_page || isFetching}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
