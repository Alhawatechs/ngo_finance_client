'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { DatePicker } from '@/components/ui/date-picker'
import { CurrencySelect } from '@/components/ui/currency-select'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChartOfAccountsPageFrame } from '@/components/finance/ChartOfAccountsPageFrame'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'
import {
  ADVANCE_TYPE_OPTIONS,
  advanceStatusLabel,
  advanceTypeLabel,
  LocalAdvanceRow,
  nextDraftAdvanceNumber,
  AdvanceType,
} from '@/lib/advances/constants'
import {
  ClipboardList,
  Eraser,
  Inbox,
  Landmark,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Users,
  Wallet,
} from 'lucide-react'

function statusBadgeVariant(
  status: LocalAdvanceRow['status']
): React.ComponentProps<typeof Badge>['variant'] {
  switch (status) {
    case 'settled':
      return 'success'
    case 'cancelled':
      return 'destructive'
    case 'disbursed':
    case 'partially_settled':
      return 'info'
    case 'approved':
      return 'secondary'
    case 'pending':
      return 'warning'
    default:
      return 'outline'
  }
}

const todayStr = () => new Date().toISOString().split('T')[0]

export function AdvanceListPage() {
  const { toast } = useToast()
  const [advances, setAdvances] = useState<LocalAdvanceRow[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [listTab, setListTab] = useState<'all' | 'outstanding' | 'settled'>('all')

  const [addOpen, setAddOpen] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [clearTargetId, setClearTargetId] = useState<string>('')

  const [form, setForm] = useState({
    employee_name: '',
    advance_type: 'operational' as AdvanceType,
    purpose: '',
    amount: '',
    currency: 'USD',
    advance_date: todayStr(),
    expected_settlement_date: todayStr(),
  })

  const resetForm = () => {
    setForm({
      employee_name: '',
      advance_type: 'operational',
      purpose: '',
      amount: '',
      currency: 'USD',
      advance_date: todayStr(),
      expected_settlement_date: todayStr(),
    })
  }

  const filtered = useMemo(() => {
    let rows = advances
    const q = search.trim().toLowerCase()
    if (q) {
      rows = rows.filter(
        (r) =>
          r.advance_number.toLowerCase().includes(q) ||
          r.employee_name.toLowerCase().includes(q) ||
          r.purpose.toLowerCase().includes(q)
      )
    }
    if (statusFilter !== 'all') {
      rows = rows.filter((r) => r.status === statusFilter)
    }
    if (listTab === 'outstanding') {
      rows = rows.filter((r) => r.outstanding_amount > 0 && r.status !== 'cancelled')
    } else if (listTab === 'settled') {
      rows = rows.filter((r) => r.status === 'settled' || r.outstanding_amount <= 0)
    }
    return rows
  }, [advances, search, statusFilter, listTab])

  const stats = useMemo(() => {
    const active = advances.filter((r) => r.status !== 'cancelled')
    const withBal = active.filter((r) => r.outstanding_amount > 0)
    const totalOutstanding = withBal.reduce((s, r) => s + r.outstanding_amount, 0)
    const outstandingCurrencies = new Set(withBal.map((r) => r.currency.toUpperCase()))
    const openCount = withBal.length
    const settledCount = active.filter((r) => r.outstanding_amount <= 0 || r.status === 'settled').length
    return {
      totalOutstanding,
      outstandingCurrencies,
      openCount,
      settledCount,
      totalRows: advances.length,
    }
  }, [advances])

  const clearable = useMemo(
    () => advances.filter((r) => r.outstanding_amount > 0 && r.status !== 'cancelled'),
    [advances]
  )

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(form.amount.replace(/,/g, ''))
    if (!form.employee_name.trim() || !form.purpose.trim() || Number.isNaN(amount) || amount <= 0) {
      toast({
        variant: 'destructive',
        title: 'Check required fields',
        description: 'Enter employee, purpose, and a positive amount.',
      })
      return
    }

    setAdvances((prev) => {
      const num = nextDraftAdvanceNumber(prev)
      const row: LocalAdvanceRow = {
        id: `local-${Date.now()}`,
        advance_number: num,
        advance_type: form.advance_type,
        employee_name: form.employee_name.trim(),
        advance_date: form.advance_date,
        expected_settlement_date: form.expected_settlement_date,
        purpose: form.purpose.trim(),
        currency: form.currency,
        amount,
        settled_amount: 0,
        outstanding_amount: amount,
        status: 'disbursed',
      }
      return [...prev, row]
    })

    toast({
      title: 'Advance recorded',
      description: 'Saved in this session. Connect the advances API to persist to the server.',
    })
    setAddOpen(false)
    resetForm()
  }

  const handleClearConfirm = () => {
    const id = clearTargetId || clearable[0]?.id
    const target = advances.find((r) => r.id === id)
    if (!target) {
      toast({ variant: 'destructive', title: 'Select an advance', description: 'Choose an advance with a balance.' })
      return
    }

    setAdvances((prev) =>
      prev.map((r) =>
        r.id === target.id
          ? {
              ...r,
              settled_amount: r.amount,
              outstanding_amount: 0,
              status: 'settled' as const,
            }
          : r
      )
    )
    toast({
      title: 'Advance cleared',
      description: `${target.advance_number} marked settled for this session.`,
    })
    setClearOpen(false)
    setClearTargetId('')
  }

  const openClearDialog = () => {
    if (clearable.length === 0) {
      toast({
        title: 'Nothing to clear',
        description: 'Add an advance with an outstanding balance first, or use vouchers for formal settlement.',
      })
      return
    }
    setClearTargetId(clearable[0]?.id ?? '')
    setClearOpen(true)
  }

  return (
    <ChartOfAccountsPageFrame title="Advance list">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Advance list</h1>
            <p className="text-sm text-muted-foreground md:text-base">
              Track staff advances (travel, salary, operational). Records below are kept in this browser session until
              the advances API is connected; use{' '}
              <Link href="/vouchers" className="text-primary underline-offset-4 hover:underline">
                vouchers
              </Link>{' '}
              for posting to the ledger.
            </p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" asChild className="gap-1.5">
              <Link href="/treasury/advances/settings">
                <Settings2 className="h-4 w-4" />
                Settings
              </Link>
            </Button>
            <Button type="button" onClick={() => setAddOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Advance
            </Button>
            <Button type="button" variant="outline" onClick={openClearDialog} className="gap-1.5">
              <Eraser className="h-4 w-4" />
              Clear Advance
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/80 shadow-sm">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {stats.outstandingCurrencies.size > 1
                    ? 'Mixed'
                    : formatCurrency(
                        stats.totalOutstanding,
                        stats.outstandingCurrencies.size === 1
                          ? [...stats.outstandingCurrencies][0]
                          : 'USD'
                      )}
                </p>
                <p className="text-sm text-muted-foreground">Total outstanding</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/80 shadow-sm">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/40">
                <ClipboardList className="h-6 w-6 text-amber-700 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{stats.openCount}</p>
                <p className="text-sm text-muted-foreground">With balance</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/80 shadow-sm">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/40">
                <Landmark className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{stats.settledCount}</p>
                <p className="text-sm text-muted-foreground">Settled / cleared</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/80 shadow-sm">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/40">
                <Users className="h-6 w-6 text-emerald-800 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{stats.totalRows}</p>
                <p className="text-sm text-muted-foreground">In session list</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden border-border/80 shadow-sm">
          <CardHeader className="space-y-4 border-b bg-muted/20 pb-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Wallet className="h-5 w-5 text-primary" />
                  Advances register
                </CardTitle>
                <CardDescription className="mt-1 max-w-3xl">
                  Filter by tab and status; search matches number, employee, or purpose. Data resets on full page refresh
                  until the API is live.
                </CardDescription>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <Tabs
                value={listTab}
                onValueChange={(v) => setListTab(v as typeof listTab)}
                className="w-full lg:w-auto"
              >
                <TabsList className="grid w-full grid-cols-3 sm:inline-flex sm:w-auto">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
                  <TabsTrigger value="settled">Settled</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search number, employee, purpose…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                    aria-label="Search advances"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="disbursed">Disbursed</SelectItem>
                    <SelectItem value="partially_settled">Partially settled</SelectItem>
                    <SelectItem value="settled">Settled</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Advance #</th>
                    <th className="px-4 py-3 text-left font-medium">Employee</th>
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                    <th className="px-4 py-3 text-right font-medium">Outstanding</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-0">
                        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                            <Inbox className="h-7 w-7 text-muted-foreground" />
                          </div>
                          <div className="max-w-md space-y-1">
                            <p className="font-medium text-foreground">No rows match</p>
                            <p className="text-sm text-muted-foreground">
                              {advances.length === 0
                                ? 'Start with Add Advance to build a working list, or relax filters.'
                                : 'Try another tab, status, or search term.'}
                            </p>
                          </div>
                          <div className="flex flex-wrap justify-center gap-2 pt-2">
                            <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
                              <Plus className="mr-2 h-4 w-4" />
                              Add Advance
                            </Button>
                            <Button asChild variant="outline" size="sm">
                              <Link href="/vouchers">Open vouchers</Link>
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-border/60 transition-colors hover:bg-muted/30"
                      >
                        <td className="px-4 py-3 font-medium tabular-nums">{r.advance_number}</td>
                        <td className="px-4 py-3">{r.employee_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{advanceTypeLabel(r.advance_type)}</td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">{r.advance_date}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatCurrency(r.amount, r.currency)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">
                          {formatCurrency(r.outstanding_amount, r.currency)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusBadgeVariant(r.status)} className="font-normal">
                            {advanceStatusLabel(r.status)}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/10 px-4 py-3 text-xs text-muted-foreground">
              <span>
                Showing <strong className="text-foreground">{filtered.length}</strong> of{' '}
                <strong className="text-foreground">{advances.length}</strong> advances
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-muted-foreground"
                onClick={() => {
                  setSearch('')
                  setStatusFilter('all')
                  setListTab('all')
                  toast({ title: 'Filters reset' })
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reset filters
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open)
          if (open) resetForm()
        }}
      >
        <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add advance</DialogTitle>
            <DialogDescription>
              Capture a draft advance for this session. Required fields mirror the planned server model.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="adv-employee">Employee name</Label>
                <Input
                  id="adv-employee"
                  value={form.employee_name}
                  onChange={(e) => setForm((f) => ({ ...f, employee_name: e.target.value }))}
                  placeholder="As on payroll / staff register"
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label>Advance type</Label>
                <Select
                  value={form.advance_type}
                  onValueChange={(v) => setForm((f) => ({ ...f, advance_type: v as AdvanceType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ADVANCE_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adv-amount">Amount</Label>
                <Input
                  id="adv-amount"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <CurrencySelect
                  value={form.currency}
                  onChange={(v) => setForm((f) => ({ ...f, currency: v }))}
                  allowNone={false}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adv-date">Advance date</Label>
                <DatePicker
                  id="adv-date"
                  value={form.advance_date}
                  onChange={(v) => setForm((f) => ({ ...f, advance_date: v }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adv-expected">Expected settlement</Label>
                <DatePicker
                  id="adv-expected"
                  value={form.expected_settlement_date}
                  onChange={(v) => setForm((f) => ({ ...f, expected_settlement_date: v }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="adv-purpose">Purpose</Label>
                <Textarea
                  id="adv-purpose"
                  rows={3}
                  value={form.purpose}
                  onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
                  placeholder="Travel route, project activity, or policy reference"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save advance</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear advance (settle)</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-left text-sm text-muted-foreground">
                <p>
                  Marks the selected advance as fully settled for this session (outstanding to zero). For production,
                  this will post against vouchers and the employee advance GL.
                </p>
                {clearable.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-foreground">Advance</Label>
                    <Select value={clearTargetId} onValueChange={setClearTargetId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select advance" />
                      </SelectTrigger>
                      <SelectContent>
                        {clearable.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.advance_number} — {r.employee_name} ({formatCurrency(r.outstanding_amount, r.currency)}{' '}
                            out.)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearConfirm} className="bg-primary text-primary-foreground">
              Confirm settlement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ChartOfAccountsPageFrame>
  )
}
