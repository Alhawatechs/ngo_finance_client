'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  ArrowLeft,
  Search,
  Plus,
  Edit,
  BookOpen,
  ExternalLink,
  Info,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ActionMenu } from '@/components/ui/action-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FinanceDataTable, FinanceDataTableHeader, FinanceDataTableTh, FinanceDataTableRow, FinanceDataTableTd } from '@/components/finance/DataTable'
import { NewVoucherFullscreenDialog } from '@/components/finance/NewVoucherFullscreenDialog'
import {
  getVouchers,
  getVoucherTypeLabel,
  getVoucherStatusColor,
} from '@/lib/api/vouchers'
import type { Voucher } from '@/types'
import { getJournal, Journal, journalToVoucherPrefill } from '@/lib/api/journals'
import { useHasPermission } from '@/stores/authStore'

export default function JournalDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const journalId = Number(params.journalId)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [voucherDialogOpen, setVoucherDialogOpen] = useState(false)
  const canViewJournalBooks = useHasPermission('view-journal-books')

  const { data: journalData, isLoading: journalLoading, error: journalError } = useQuery({
    queryKey: ['journal', journalId],
    queryFn: () => getJournal(journalId),
    enabled: canViewJournalBooks && Number.isInteger(journalId) && journalId > 0,
  })
  const journal: Journal | null = journalData ?? null

  const journalVoucherPrefill = useMemo(() => journalToVoucherPrefill(journal), [journal])

  const { data: vouchersData, isLoading: vouchersLoading } = useQuery({
    queryKey: [
      'vouchers',
      'journal-book',
      {
        journal_id: journalId,
        page,
        status: filterStatus,
        search: searchQuery,
      },
    ],
    queryFn: () =>
      getVouchers({
        journal_id: journalId,
        page,
        per_page: 50,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        search: searchQuery || undefined,
        sort_by: 'voucher_date',
        sort_dir: 'desc',
      }),
    enabled: canViewJournalBooks && Number.isInteger(journalId) && journalId > 0,
  })

  const vouchers: Voucher[] = vouchersData?.data ?? []
  const pagination = vouchersData?.meta

  if (!canViewJournalBooks) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/general-ledger/journal-entries">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Journal entries
          </Link>
        </Button>
        <Card className="coa-ledger-card border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            You do not have permission to open journal books. Ask an administrator to assign{' '}
            <span className="font-medium text-foreground">View Journal Books</span>.
          </CardContent>
        </Card>
      </div>
    )
  }

  if (journalError || (journalId && !journalLoading && !journal)) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/general-ledger/journal-entries">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Journal entries
          </Link>
        </Button>
        <Card className="coa-ledger-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            Journal not found or you don’t have access to it.
          </CardContent>
        </Card>
      </div>
    )
  }

  const journalName = journal?.name ?? journal?.code ?? 'Journal'
  const projectName = journal?.project ? (journal.project.project_name ?? journal.project.project_code) : 'Organization'

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" asChild>
            <Link href="/general-ledger/journal-entries" aria-label="Back to Journal entries">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Journal book
              </span>
              <h1 className="min-w-0 truncate text-base font-semibold tracking-tight text-foreground md:text-lg">
                {journalName}
              </h1>
              {journal?.currency?.trim() ? (
                <Badge
                  variant="secondary"
                  className="shrink-0 font-mono text-[10px] font-normal"
                  title="Book currency — used for Period Close totals and voucher defaults"
                >
                  {journal.currency.trim().toUpperCase()}
                </Badge>
              ) : null}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="truncate" title={projectName}>
                {projectName}
              </span>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex shrink-0 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      aria-label="About vouchers in this journal book"
                    >
                      <Info className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="start" className="max-w-xs text-left">
                    Project expenditure vouchers for this book. New entries use the same transaction voucher form as Finance →
                    Vouchers.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
        <Button
          onClick={() => setVoucherDialogOpen(true)}
          size="sm"
          className="shrink-0"
          title="Opens the full transaction voucher form (same as Vouchers → New voucher)."
        >
          <Plus className="h-4 w-4 mr-2" />
          New voucher
        </Button>
      </header>

      <Card className="coa-ledger-card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="coa-toolbar flex shrink-0 flex-wrap items-center justify-between gap-2 px-3 py-2 md:px-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <BookOpen className="h-4 w-4 text-primary" aria-hidden />
            Transactions (vouchers)
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by voucher #, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 border-border/80 bg-background pl-8 text-xs"
              />
            </div>
            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1) }}>
              <SelectTrigger className="h-8 w-[150px] border-border/80 bg-background text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="pending_approval">Pending approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="posted">Posted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
          <div className="voucher-sheet-grid min-h-0 flex-1 overflow-x-auto overflow-y-auto overscroll-contain">
            <div className="coa-ledger-table-frame w-full min-w-0">
              <FinanceDataTable
                className="w-full min-w-0 overflow-visible rounded-none border-0 bg-transparent shadow-none"
                tableClassName="w-full min-w-[880px] border-collapse text-sm [&_td]:text-xs"
              >
                  <FinanceDataTableHeader
                    theadClassName="coa-ledger-thead sticky top-0 z-10"
                    className="border-0 uppercase tracking-wider"
                  >
                    <FinanceDataTableTh className="w-12 py-2 text-center text-xs font-semibold">No</FinanceDataTableTh>
                    <FinanceDataTableTh className="min-w-[100px] py-2 text-xs font-semibold">Voucher #</FinanceDataTableTh>
                    <FinanceDataTableTh className="min-w-[100px] py-2 text-xs font-semibold">Last modified by</FinanceDataTableTh>
                    <FinanceDataTableTh className="min-w-[100px] py-2 text-xs font-semibold">Date</FinanceDataTableTh>
                    <FinanceDataTableTh className="min-w-[120px] py-2 text-xs font-semibold">Payee</FinanceDataTableTh>
                    <FinanceDataTableTh className="min-w-[160px] py-2 text-xs font-semibold">Description</FinanceDataTableTh>
                    <FinanceDataTableTh className="min-w-[100px] py-2 text-xs font-semibold">Type</FinanceDataTableTh>
                    <FinanceDataTableTh className="min-w-[80px] py-2 text-center text-xs font-semibold">Status</FinanceDataTableTh>
                    <FinanceDataTableTh className="min-w-[100px] py-2 text-right text-xs font-semibold">Amount</FinanceDataTableTh>
                    <FinanceDataTableTh className="w-20 py-2 text-center text-xs font-semibold">Actions</FinanceDataTableTh>
                  </FinanceDataTableHeader>
                <tbody>
                  {journalLoading || vouchersLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="border-b">
                        <td colSpan={10} className="py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : vouchers.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-muted-foreground">
                        No vouchers in this journal book yet. Click “New voucher” to record project expenditure in voucher format.
                      </td>
                    </tr>
                  ) : (
                    vouchers.map((v: Voucher, index: number) => {
                      const rowNo = ((pagination?.current_page ?? 1) - 1) * (pagination?.per_page ?? 50) + index + 1
                      const lastModifiedBy = v.creator?.name ?? '—'
                      const openVoucher = () => router.push(`/vouchers/${v.id}/edit`)
                      return (
                        <FinanceDataTableRow
                          key={v.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`Open voucher ${v.voucher_number ?? v.id}`}
                          className="cursor-pointer transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          onClick={openVoucher}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              openVoucher()
                            }
                          }}
                        >
                          <FinanceDataTableTd className="py-2 text-center text-xs tabular-nums text-muted-foreground">{rowNo}</FinanceDataTableTd>
                          <FinanceDataTableTd className="py-2 font-mono text-xs">{v.voucher_number ?? '—'}</FinanceDataTableTd>
                          <FinanceDataTableTd className="py-2 text-xs text-muted-foreground">{lastModifiedBy}</FinanceDataTableTd>
                          <FinanceDataTableTd className="py-2 text-xs">{formatDate(v.voucher_date)}</FinanceDataTableTd>
                          <FinanceDataTableTd className="max-w-[140px] truncate py-2 text-xs" title={v.payee_name ?? ''}>
                            {v.payee_name ?? '—'}
                          </FinanceDataTableTd>
                          <FinanceDataTableTd className="max-w-[200px] truncate py-2 text-xs" title={v.description}>{v.description}</FinanceDataTableTd>
                          <FinanceDataTableTd className="py-2 text-xs">
                            <Badge variant="outline" className="text-[10px]">{getVoucherTypeLabel(v.voucher_type)}</Badge>
                          </FinanceDataTableTd>
                          <FinanceDataTableTd className="py-2 text-center">
                            <Badge className={cn('text-[10px]', getVoucherStatusColor(v.status))}>{v.status}</Badge>
                          </FinanceDataTableTd>
                          <FinanceDataTableTd className="py-2 text-right font-mono text-xs tabular-nums">
                            {formatCurrency(Number(v.total_amount ?? 0), v.currency)}
                          </FinanceDataTableTd>
                          <FinanceDataTableTd
                            className="py-2 text-center"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          >
                            <ActionMenu
                              triggerClassName="h-8 w-8"
                              menuWidth={200}
                              items={[
                                {
                                  label: v.status === 'draft' ? 'Edit voucher' : 'Open voucher',
                                  icon: v.status === 'draft' ? <Edit className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />,
                                  onClick: openVoucher,
                                },
                              ]}
                            />
                          </FinanceDataTableTd>
                        </FinanceDataTableRow>
                      )
                    })
                  )}
                </tbody>
            </FinanceDataTable>
            </div>
          </div>
          {pagination && pagination.last_page > 1 && (
            <div className="flex items-center justify-between border-t border-border px-3 py-2 md:px-4">
              <p className="text-sm text-muted-foreground">
                Showing {pagination.from} to {pagination.to} of {pagination.total} vouchers
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === pagination.last_page}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <NewVoucherFullscreenDialog
        open={voucherDialogOpen}
        onOpenChange={(open) => {
          setVoucherDialogOpen(open)
          if (!open) {
            void queryClient.invalidateQueries({ queryKey: ['vouchers'] })
          }
        }}
        contextSubtitle={journal ? `Journal book: ${journal.name}` : undefined}
        journalPrefill={journalVoucherPrefill}
      />
    </div>
  )
}
