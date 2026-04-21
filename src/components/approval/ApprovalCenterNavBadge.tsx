'use client'

import { cn } from '@/lib/utils'

function formatCount(n: number): string {
  if (n <= 0) return ''
  return n > 99 ? '99+' : String(n)
}

type ApprovalCenterNavBadgeProps = {
  /** Pending total from parent (e.g. Sidebar useApprovalCenterCounts) — no hooks here, avoids duplicate observers. */
  count: number
  collapsed?: boolean
}

/** Sidebar: pending total for Approval Center. */
export function ApprovalCenterNavBadge({ count, collapsed }: ApprovalCenterNavBadgeProps) {
  const label = formatCount(count)
  if (!label) return null

  if (collapsed) {
    return (
      <span
        className={cn(
          'absolute -right-0.5 -top-0.5 z-[1] flex min-h-[14px] min-w-[14px] items-center justify-center rounded-full px-[3px] text-[9px] font-bold leading-none text-white shadow-sm',
          'bg-amber-500 ring-2 ring-white'
        )}
        aria-label={`${count} pending approvals`}
      >
        {count > 99 ? '99+' : count}
      </span>
    )
  }

  return (
    <span
      className="ml-auto shrink-0 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white tabular-nums shadow-sm"
      aria-label={`${count} pending approvals`}
    >
      {label}
    </span>
  )
}
