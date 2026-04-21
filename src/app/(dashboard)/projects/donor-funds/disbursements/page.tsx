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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { ArrowDownToLine, Plus, RefreshCw, DollarSign } from 'lucide-react'
import { DatePicker } from '@/components/ui/date-picker'
import { ActionMenu } from '@/components/ui/action-menu'
import { formatCurrency, formatDate, todayISO } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { getGrants, recordDisbursement, Grant } from '@/lib/api/projects'

export default function DisbursementsPage() {
  const [page, setPage] = useState(1)
  const [disburseGrant, setDisburseGrant] = useState<Grant | null>(null)
  const [amount, setAmount] = useState<string>('')
  const [disbursementDate, setDisbursementDate] = useState(todayISO)
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')

  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: grantsData, isLoading, refetch } = useQuery({
    queryKey: ['grants', { page }],
    queryFn: () => getGrants({ page, per_page: 20 }),
  })

  const recordMutation = useMutation({
    mutationFn: ({ grantId, data }: { grantId: number; data: { amount: number; disbursement_date: string; reference?: string; notes?: string } }) =>
      recordDisbursement(grantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grants'] })
      setDisburseGrant(null)
      setAmount('')
      setReference('')
      setNotes('')
      toast({ title: 'Disbursement recorded', description: 'The disbursement has been recorded successfully.' })
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to record disbursement', variant: 'destructive' })
    },
  })

  const grants: Grant[] = grantsData?.data ?? []
  const meta = grantsData?.meta

  const handleRecord = () => {
    if (!disburseGrant) return
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) {
      toast({ title: 'Validation', description: 'Enter a valid amount.', variant: 'destructive' })
      return
    }
    recordMutation.mutate({
      grantId: disburseGrant.id,
      data: {
        amount: amt,
        disbursement_date: disbursementDate,
        reference: reference || undefined,
        notes: notes || undefined,
      },
    })
  }

  const totalDisbursed = grants.reduce((s, g) => s + (g.disbursed_amount ?? 0), 0)
  const totalGrantAmount = grants.reduce((s, g) => s + g.total_amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Disbursements</h1>
          <p className="text-muted-foreground">Record and view disbursements from grants</p>
        </div>
        <Button variant="secondary" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalGrantAmount)}</p>
              <p className="text-sm text-muted-foreground">Total grant value</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
              <ArrowDownToLine className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalDisbursed)}</p>
              <p className="text-sm text-muted-foreground">Total disbursed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalGrantAmount - totalDisbursed)}</p>
              <p className="text-sm text-muted-foreground">Pending disbursement</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grants and disbursements</CardTitle>
          <CardDescription>Record disbursements against grants. Click action to record a new disbursement.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-medium">Grant</th>
                  <th className="px-4 py-3 text-left font-medium">Donor</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-right font-medium">Disbursed</th>
                  <th className="px-4 py-3 text-right font-medium">Remaining</th>
                  <th className="px-4 py-3 text-center w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="p-6"><Skeleton className="h-10 w-full" /></td></tr>
                ) : grants.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No grants found.</td></tr>
                ) : (
                  grants.map((g) => {
                    const disbursed = g.disbursed_amount ?? 0
                    const remaining = g.total_amount - disbursed
                    return (
                      <tr key={g.id} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <span className="font-mono">{g.grant_code}</span>
                          <span className="ml-2">{g.grant_name}</span>
                        </td>
                        <td className="px-4 py-3">{g.donor?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(g.total_amount, g.currency)}</td>
                        <td className="px-4 py-3 text-right text-green-600">{formatCurrency(disbursed, g.currency)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(remaining, g.currency)}</td>
                        <td className="px-4 py-3 text-center">
                          <ActionMenu
                            triggerClassName="h-8 w-8"
                            items={[
                              {
                                label: 'Record disbursement',
                                icon: <Plus className="h-4 w-4" />,
                                onClick: () => {
                                  setDisburseGrant(g)
                                  setAmount('')
                                  setDisbursementDate(todayISO())
                                  setReference('')
                                  setNotes('')
                                },
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          {meta && meta.last_page > 1 && (
            <div className="flex justify-between mt-4">
              <p className="text-sm text-muted-foreground">Page {meta.current_page} of {meta.last_page}</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button variant="secondary" size="sm" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={disburseGrant !== null} onOpenChange={(open) => !open && setDisburseGrant(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Record disbursement</DialogTitle>
            <DialogDescription>
              {disburseGrant && `${disburseGrant.grant_code} – ${disburseGrant.grant_name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label required>Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label required>Disbursement date</Label>
              <DatePicker value={disbursementDate} onChange={setDisbursementDate} placeholder="Select date" />
            </div>
            <div className="space-y-2">
              <Label>Reference</Label>
              <Input placeholder="Optional reference" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Optional notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDisburseGrant(null)}>Cancel</Button>
            <Button onClick={handleRecord} disabled={recordMutation.isPending || !amount || parseFloat(amount) <= 0}>
              {recordMutation.isPending ? 'Recording...' : 'Record disbursement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
