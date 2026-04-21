'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
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
import { Send, Plus, RefreshCw, Search, Eye } from 'lucide-react'
import { DatePicker } from '@/components/ui/date-picker'
import { CurrencySelect } from '@/components/ui/currency-select'
import { ActionMenu } from '@/components/ui/action-menu'
import { formatCurrency, formatDate, todayISO } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import {
  getFundRequests,
  createFundRequest,
  getFundRequest,
  getFundRequestTypeLabel,
  getFundRequestStatusColor,
  FundRequest,
  FundRequestFormData,
} from '@/lib/api/funds'
import { getGrants } from '@/lib/api/projects'

export default function FundRequestsPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewId, setViewId] = useState<number | null>(null)
  const [form, setForm] = useState<FundRequestFormData>({
    grant_id: 0,
    request_date: todayISO(),
    request_type: 'dct',
    description: '',
    currency: 'USD',
    requested_amount: 0,
  })

  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: requestsData, isLoading, refetch } = useQuery({
    queryKey: ['fund-requests', { page, status: statusFilter, from, to }],
    queryFn: () => getFundRequests({
      page,
      per_page: 15,
      status: statusFilter || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
  })

  const { data: grantsData } = useQuery({
    queryKey: ['grants-list'],
    queryFn: () => getGrants({ per_page: 200, status: 'active' }),
  })

  const { data: viewData } = useQuery({
    queryKey: ['fund-request', viewId],
    queryFn: () => getFundRequest(viewId!),
    enabled: viewId !== null,
  })

  const createMutation = useMutation({
    mutationFn: createFundRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fund-requests'] })
      setDialogOpen(false)
      resetForm()
      toast({ title: 'Fund request created', description: 'The request has been created successfully.' })
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to create request', variant: 'destructive' })
    },
  })

  const requests: FundRequest[] = requestsData?.data ?? []
  const meta = requestsData?.meta
  const grants = grantsData?.data ?? []
  const selectedRequest = viewData?.data

  const resetForm = () => {
    setForm({
      grant_id: 0,
      request_date: todayISO(),
      request_type: 'dct',
      description: '',
      currency: 'USD',
      requested_amount: 0,
    })
  }

  const handleSubmit = () => {
    if (!form.grant_id || !form.description || !form.requested_amount || form.requested_amount <= 0) {
      toast({ title: 'Validation', description: 'Please fill grant, description, and requested amount.', variant: 'destructive' })
      return
    }
    createMutation.mutate(form)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fund requests</h1>
          <p className="text-muted-foreground">Create and track fund requests (DCT, reimbursement, advance)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => { resetForm(); setDialogOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            New request
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request list</CardTitle>
          <CardDescription>Filter by status and date range</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter || '__all__'} onValueChange={(v) => setStatusFilter(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <DatePicker value={from} onChange={setFrom} placeholder="From" className="w-[140px]" inputClassName="h-9" maxDate={to || undefined} />
            <DatePicker value={to} onChange={setTo} placeholder="To" className="w-[140px]" inputClassName="h-9" minDate={from || undefined} />
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <Search className="h-4 w-4 mr-1" />
              Apply
            </Button>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-medium">Request #</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Grant</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-center w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="p-6"><Skeleton className="h-10 w-full" /></td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No fund requests found.</td></tr>
                ) : (
                  requests.map((req) => (
                    <tr key={req.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono">{req.request_number}</td>
                      <td className="px-4 py-3">{formatDate(req.request_date)}</td>
                      <td className="px-4 py-3">{req.grant?.grant_code ?? '—'} {req.grant?.grant_name ?? ''}</td>
                      <td className="px-4 py-3">{getFundRequestTypeLabel(req.request_type)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(req.requested_amount, req.currency)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getFundRequestStatusColor(req.status)}`}>
                          {req.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ActionMenu
                          triggerClassName="h-8 w-8"
                          items={[{ label: 'View details', icon: <Eye className="h-4 w-4" />, onClick: () => setViewId(req.id) }]}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {meta && meta.last_page > 1 && (
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Showing {meta.from} to {meta.to} of {meta.total}</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button variant="secondary" size="sm" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (open !== dialogOpen) setDialogOpen(open) }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>New fund request</DialogTitle>
            <DialogDescription>Request funds from a grant (DCT, reimbursement, or advance)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label required>Grant</Label>
              <Select
                value={form.grant_id ? String(form.grant_id) : '__none__'}
                onValueChange={(v) => setForm({ ...form, grant_id: v === '__none__' ? 0 : parseInt(v, 10) })}
              >
                <SelectTrigger><SelectValue placeholder="Select grant" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select grant</SelectItem>
                  {grants.map((g: any) => (
                    <SelectItem key={g.id} value={String(g.id)}>{g.grant_code} – {g.grant_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label required>Request date</Label>
                <DatePicker value={form.request_date} onChange={(v) => setForm({ ...form, request_date: v })} placeholder="Select date" />
              </div>
              <div className="space-y-2">
                <Label required>Type</Label>
                <Select value={form.request_type} onValueChange={(v: any) => setForm({ ...form, request_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dct">Direct Cash Transfer</SelectItem>
                    <SelectItem value="reimbursement">Reimbursement</SelectItem>
                    <SelectItem value="advance">Advance</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label required>Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.requested_amount || ''}
                  onChange={(e) => setForm({ ...form, requested_amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <CurrencySelect value={form.currency || ''} onChange={(v) => setForm({ ...form, currency: v || 'USD' })} placeholder="Currency" />
              </div>
            </div>
            <div className="space-y-2">
              <Label required>Description</Label>
              <Textarea
                placeholder="Purpose of the request..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Expected receipt date</Label>
              <DatePicker value={form.expected_receipt_date || ''} onChange={(v) => setForm({ ...form, expected_receipt_date: v || undefined })} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || !form.grant_id || !form.description || !form.requested_amount}>
              {createMutation.isPending ? 'Creating...' : 'Create request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={viewId !== null} onOpenChange={(open) => !open && setViewId(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Fund request details</DialogTitle>
            <DialogDescription>{selectedRequest?.request_number}</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Date</span>
                <span>{formatDate(selectedRequest.request_date)}</span>
                <span className="text-muted-foreground">Grant</span>
                <span>{selectedRequest.grant?.grant_code} – {selectedRequest.grant?.grant_name}</span>
                <span className="text-muted-foreground">Type</span>
                <span>{getFundRequestTypeLabel(selectedRequest.request_type)}</span>
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">{formatCurrency(selectedRequest.requested_amount, selectedRequest.currency)}</span>
                <span className="text-muted-foreground">Status</span>
                <span className={getFundRequestStatusColor(selectedRequest.status)}>{selectedRequest.status}</span>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Description</p>
                <p>{selectedRequest.description}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
