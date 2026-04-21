'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { approveVoucher, rejectVoucher, getVoucherStatusColor, getVoucherTypeLabel } from '@/lib/api/vouchers'
import { getVoucherStepApprovalEligibility } from '@/lib/voucher-approval'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Voucher } from '@/types'
import { CheckCircle, XCircle, AlertTriangle, FileText } from 'lucide-react'
import { VoucherApprovalWorkflow } from '@/components/vouchers/VoucherApprovalWorkflow'

type VoucherPendingApprovalPanelProps = {
  voucher: Voucher
  /** Called after successful approve or reject (e.g. navigate away). */
  onCompleted?: () => void
}

export function VoucherPendingApprovalPanel({ voucher, onCompleted }: VoucherPendingApprovalPanelProps) {
  const authUser = useAuthStore((s) => s.user)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [approvalComments, setApprovalComments] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')

  const approveEligibility = getVoucherStepApprovalEligibility(authUser, voucher)
  const rejectEligibility = approveEligibility

  const approveMutation = useMutation({
    mutationFn: ({ id, comments }: { id: number; comments?: string }) => approveVoucher(id, { comments }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vouchers'] })
      queryClient.invalidateQueries({ queryKey: ['voucher', voucher.id] })
      queryClient.invalidateQueries({ queryKey: ['approval-center'] })
      queryClient.invalidateQueries({ queryKey: ['project-ledger'] })
      setApproveOpen(false)
      setApprovalComments('')
      toast({ title: 'Voucher approved', description: 'The voucher has been updated.' })
      onCompleted?.()
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast({
        title: 'Cannot approve',
        description: error.response?.data?.message || 'Failed to approve voucher',
        variant: 'destructive',
      })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => rejectVoucher(id, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vouchers'] })
      queryClient.invalidateQueries({ queryKey: ['voucher', voucher.id] })
      queryClient.invalidateQueries({ queryKey: ['approval-center'] })
      setRejectOpen(false)
      setRejectionReason('')
      toast({ title: 'Voucher rejected', description: 'The submitter can revise and resubmit.' })
      onCompleted?.()
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast({
        title: 'Cannot reject',
        description: error.response?.data?.message || 'Failed to reject voucher',
        variant: 'destructive',
      })
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={getVoucherStatusColor(voucher.status)}>{voucher.status.replace('_', ' ')}</Badge>
        <span className="text-sm text-muted-foreground">{getVoucherTypeLabel(voucher.voucher_type)}</span>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <p className="text-muted-foreground">Date</p>
          <p className="font-medium">{formatDate(voucher.voucher_date)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Amount</p>
          <p className="font-medium">
            {voucher.currency} {formatCurrency(voucher.total_amount, voucher.currency)}
          </p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-muted-foreground">Description</p>
          <p className="font-medium">{voucher.description || '—'}</p>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4">
        <VoucherApprovalWorkflow voucher={voucher} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!approveEligibility.canAct}
          title={!approveEligibility.canAct ? approveEligibility.blockReasons.join(' ') : undefined}
          onClick={() => setApproveOpen(true)}
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Approve
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={!rejectEligibility.canAct}
          title={!rejectEligibility.canAct ? rejectEligibility.blockReasons.join(' ') : undefined}
          onClick={() => setRejectOpen(true)}
        >
          <XCircle className="mr-2 h-4 w-4" />
          Reject
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/vouchers">
            <FileText className="mr-2 h-4 w-4" />
            Back to list
          </Link>
        </Button>
      </div>

      {!approveEligibility.canAct && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
          <p className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            You cannot sign this step with your current user
          </p>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs">
            {approveEligibility.blockReasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve voucher</DialogTitle>
            <DialogDescription>{voucher.voucher_number}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next signature</p>
              <p className="font-medium text-foreground">{approveEligibility.nextTitle}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Progress: {voucher.current_approval_level ?? 0} of {voucher.required_approval_level ?? 1} layer(s).
                Base (policy): {formatCurrency(voucher.base_currency_amount ?? 0, 'USD')}
              </p>
            </div>
            {!approveEligibility.canAct && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {approveEligibility.blockReasons.map((r, i) => (
                  <p key={i}>{r}</p>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="voucher-approve-comments">Comments (optional)</Label>
              <Textarea
                id="voucher-approve-comments"
                rows={3}
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                placeholder="Optional note for the audit trail…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setApproveOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => approveMutation.mutate({ id: voucher.id, comments: approvalComments || undefined })}
              disabled={approveMutation.isPending || !approveEligibility.canAct}
            >
              {approveMutation.isPending ? 'Approving…' : 'Confirm approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject voucher</DialogTitle>
            <DialogDescription>{voucher.voucher_number}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!rejectEligibility.canAct && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {rejectEligibility.blockReasons.map((r, i) => (
                  <p key={i}>{r}</p>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="voucher-reject-reason">Reason (required)</Label>
              <Textarea
                id="voucher-reject-reason"
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this voucher is returned…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectMutation.mutate({ id: voucher.id, reason: rejectionReason })}
              disabled={rejectMutation.isPending || !rejectionReason.trim() || !rejectEligibility.canAct}
            >
              {rejectMutation.isPending ? 'Rejecting…' : 'Confirm reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
