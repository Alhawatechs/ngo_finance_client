'use client'

import { Progress } from '@/components/ui/progress'
import { cn, formatDate } from '@/lib/utils'
import { CheckCircle, XCircle } from 'lucide-react'
import { APPROVAL_LEVELS } from '@/lib/api/vouchers'
import type { Voucher } from '@/types'

export type VoucherApprovalWorkflowProps = {
  voucher: Voucher
}

export function VoucherApprovalWorkflow({ voucher }: VoucherApprovalWorkflowProps) {
  const currentLevel = voucher.current_approval_level || 0
  const requiredLevel = voucher.required_approval_level || 4
  const isFullyApproved = voucher.status === 'posted' || voucher.status === 'approved'
  const isTerminal =
    voucher.status === 'posted' || voucher.status === 'approved' || voucher.status === 'rejected' || voucher.status === 'cancelled'
  const progress =
    requiredLevel > 0
      ? isFullyApproved
        ? 100
        : (currentLevel / requiredLevel) * 100
      : 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Approval progress</span>
        <span className="font-medium">
          {isFullyApproved ? requiredLevel : currentLevel} of {requiredLevel} levels
        </span>
      </div>
      <Progress value={progress} className="h-2" />
      <div className="flex justify-between gap-1">
        {APPROVAL_LEVELS.slice(0, requiredLevel).map((level) => {
          const approval = voucher.approvals?.find((a) => a.approval_level === level.level)
          const isCompleted =
            approval?.action === 'approved' ||
            ((voucher.status === 'posted' || voucher.status === 'approved') &&
              !approval &&
              level.level <= currentLevel)
          const isRejected = approval?.action === 'rejected'
          const isPending =
            !isTerminal && currentLevel === level.level - 1 && voucher.status === 'pending_approval'

          return (
            <div
              key={level.level}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center text-xs',
                isCompleted && 'text-green-600',
                isRejected && 'text-red-600',
                isPending && 'text-yellow-600',
                !isCompleted && !isRejected && !isPending && 'text-muted-foreground'
              )}
            >
              <div
                className={cn(
                  'mb-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs',
                  isCompleted && 'bg-green-100',
                  isRejected && 'bg-red-100',
                  isPending && 'bg-yellow-100 ring-2 ring-yellow-400',
                  !isCompleted && !isRejected && !isPending && 'bg-gray-100'
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="h-3 w-3" />
                ) : isRejected ? (
                  <XCircle className="h-3 w-3" />
                ) : (
                  level.level
                )}
              </div>
              <span className="line-clamp-2 text-center leading-tight">{level.name}</span>
              {approval?.approver && (
                <span className="max-w-[72px] truncate text-[10px] text-muted-foreground">
                  {approval.approver.name}
                </span>
              )}
              {approval?.action_at && (approval?.action === 'approved' || approval?.action === 'rejected') ? (
                <span className="max-w-[80px] truncate text-[9px] text-muted-foreground/90">{formatDate(approval.action_at)}</span>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
