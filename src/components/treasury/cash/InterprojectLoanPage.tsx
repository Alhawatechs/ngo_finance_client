'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Coins, Plus, RefreshCw, Trash2 } from 'lucide-react'
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
import { ChartOfAccountsPageFrame } from '@/components/finance/ChartOfAccountsPageFrame'
import { CashManagementSubNav } from '@/components/treasury/cash/CashManagementSubNav'
import { CurrencySelect } from '@/components/ui/currency-select'
import { getProjects } from '@/lib/api/projects'
import type { Project } from '@/types'
import type { PaginatedResponse } from '@/lib/api/client'
import {
  getInterprojectCashLoans,
  createInterprojectCashLoan,
  deleteInterprojectCashLoan,
  InterprojectCashLoan,
  InterprojectCashLoanFormData,
} from '@/lib/api/interproject-cash-loans'
import {
  FinanceDataTable,
  FinanceDataTableHeader,
  FinanceDataTableTh,
  FinanceDataTableRow,
  FinanceDataTableTd,
} from '@/components/finance'

export function InterprojectLoanPage() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<InterprojectCashLoanFormData>({
    lender_project_id: 0,
    borrower_project_id: 0,
    effective_date: new Date().toISOString().split('T')[0],
    principal: 0,
    currency: 'USD',
    notes: '',
  })

  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: projectsPayload } = useQuery({
    queryKey: ['projects', 'loan-form'],
    queryFn: () => getProjects({ per_page: 500 }),
  })
  const projects: Project[] = (projectsPayload as { data?: Project[] } | undefined)?.data ?? []

  const { data: loansRes, isLoading, refetch } = useQuery({
    queryKey: ['interproject-cash-loans'],
    queryFn: () => getInterprojectCashLoans({ per_page: 100 }),
  })

  const loans = (loansRes as PaginatedResponse<InterprojectCashLoan> | undefined)?.data ?? []

  const createMut = useMutation({
    mutationFn: createInterprojectCashLoan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interproject-cash-loans'] })
      setOpen(false)
      setForm({
        lender_project_id: 0,
        borrower_project_id: 0,
        effective_date: new Date().toISOString().split('T')[0],
        principal: 0,
        currency: 'USD',
        notes: '',
      })
      toast({ title: 'Loan created' })
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } }
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed',
        variant: 'destructive',
      })
    },
  })

  const deleteMut = useMutation({
    mutationFn: deleteInterprojectCashLoan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interproject-cash-loans'] })
      toast({ title: 'Removed' })
    },
  })

  return (
    <ChartOfAccountsPageFrame title="Inter-project cash loans">
      <div className="flex flex-col gap-4">
        <CashManagementSubNav variant="strip" />
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Inter-project cash loans</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Track cash lent from one funded project to another. Settle through vouchers when the loan is repaid or
            cleared.
          </p>
        </div>

        <div className="coa-ledger-card flex flex-wrap items-center justify-between gap-3 p-3">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wider">Inter-project loan</span>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New loan
            </Button>
          </div>
        </div>

        <Card className="coa-ledger-card overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <Skeleton className="m-4 h-48" />
            ) : (
              <div className="max-h-[min(70vh,600px)] overflow-auto">
                <div className="coa-ledger-table-frame rounded-none border-0 shadow-none">
                  <FinanceDataTable className="min-w-0 rounded-none border-0 bg-transparent shadow-none">
                    <FinanceDataTableHeader
                      theadClassName="coa-ledger-thead sticky top-0 z-10"
                      className="[&_th]:!text-primary-foreground [&_th]:px-3 [&_th]:py-2 [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase"
                    >
                      <FinanceDataTableTh>Loan #</FinanceDataTableTh>
                      <FinanceDataTableTh>Effective</FinanceDataTableTh>
                      <FinanceDataTableTh>Lender project</FinanceDataTableTh>
                      <FinanceDataTableTh>Borrower project</FinanceDataTableTh>
                      <FinanceDataTableTh className="text-right">Principal</FinanceDataTableTh>
                      <FinanceDataTableTh>Status</FinanceDataTableTh>
                      <FinanceDataTableTh className="w-12" />
                    </FinanceDataTableHeader>
                    <tbody>
                      {loans.length === 0 && (
                        <FinanceDataTableRow className="coa-ledger-table-row">
                          <FinanceDataTableTd colSpan={7} className="py-8 text-center text-muted-foreground">
                            No inter-project loans yet.
                          </FinanceDataTableTd>
                        </FinanceDataTableRow>
                      )}
                      {loans.map((loan) => (
                        <FinanceDataTableRow key={loan.id} className="coa-ledger-table-row">
                          <FinanceDataTableTd className="font-mono text-xs">{loan.loan_number}</FinanceDataTableTd>
                          <FinanceDataTableTd>{formatDate(loan.effective_date)}</FinanceDataTableTd>
                          <FinanceDataTableTd>
                            <span className="line-clamp-2">
                              {loan.lender_project?.project_code} — {loan.lender_project?.project_name}
                            </span>
                          </FinanceDataTableTd>
                          <FinanceDataTableTd>
                            <span className="line-clamp-2">
                              {loan.borrower_project?.project_code} — {loan.borrower_project?.project_name}
                            </span>
                          </FinanceDataTableTd>
                          <FinanceDataTableTd className="text-right tabular-nums">
                            {loan.currency} {formatCurrency(loan.principal)}
                          </FinanceDataTableTd>
                          <FinanceDataTableTd>
                            <Badge
                              variant={
                                loan.status === 'active'
                                  ? 'default'
                                  : loan.status === 'cancelled'
                                    ? 'destructive'
                                    : loan.status === 'settled'
                                      ? 'outline'
                                      : 'secondary'
                              }
                            >
                              {loan.status}
                            </Badge>
                          </FinanceDataTableTd>
                          <FinanceDataTableTd>
                            {loan.status === 'draft' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => deleteMut.mutate(loan.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </FinanceDataTableTd>
                        </FinanceDataTableRow>
                      ))}
                    </tbody>
                  </FinanceDataTable>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New inter-project loan</DialogTitle>
              <DialogDescription className="sr-only">Create loan</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Lender project</Label>
                  <Select
                    value={form.lender_project_id ? String(form.lender_project_id) : ''}
                    onValueChange={(v) => setForm({ ...form, lender_project_id: parseInt(v, 10) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.project_code} — {p.project_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Borrower project</Label>
                  <Select
                    value={form.borrower_project_id ? String(form.borrower_project_id) : ''}
                    onValueChange={(v) => setForm({ ...form, borrower_project_id: parseInt(v, 10) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {projects
                        .filter((p) => p.id !== form.lender_project_id)
                        .map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.project_code} — {p.project_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Effective date</Label>
                  <DatePicker value={form.effective_date} onChange={(v) => setForm({ ...form, effective_date: v })} />
                </div>
                <div className="space-y-2">
                  <Label>Due date (optional)</Label>
                  <DatePicker
                    value={form.due_date || ''}
                    onChange={(v) => setForm({ ...form, due_date: v || undefined })}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Principal</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.principal || ''}
                    onChange={(e) => setForm({ ...form, principal: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <CurrencySelect
                    value={form.currency}
                    onChange={(v) => setForm({ ...form, currency: v || 'USD' })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea rows={3} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createMut.mutate(form)}
                disabled={
                  createMut.isPending ||
                  !form.lender_project_id ||
                  !form.borrower_project_id ||
                  form.lender_project_id === form.borrower_project_id ||
                  !form.principal
                }
              >
                {createMut.isPending ? 'Saving…' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ChartOfAccountsPageFrame>
  )
}
