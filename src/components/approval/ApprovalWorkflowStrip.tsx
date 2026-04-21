'use client'

import { cn } from '@/lib/utils'
import type { ApprovalItemWorkflow } from '@/lib/api/approval-center'

type ApprovalWorkflowStripProps = {
  workflow: ApprovalItemWorkflow | undefined
}

export function ApprovalWorkflowStrip({ workflow }: ApprovalWorkflowStripProps) {
  if (!workflow?.steps?.length) {
    return <span className="text-muted-foreground">—</span>
  }

  const current = workflow.steps.find((s) => s.state === 'current')

  return (
    <div className="flex flex-col gap-1 min-w-[200px] max-w-[280px]" role="group" aria-label="Approval progress">
      <div className="flex flex-wrap items-center gap-0.5">
        {workflow.steps.map((step, i) => (
          <span key={step.level} className="inline-flex items-center">
            {i > 0 ? (
              <span className="text-muted-foreground/50 px-0.5 text-[10px] select-none" aria-hidden>
                →
              </span>
            ) : null}
            <span
              title={`${step.code}: ${step.title}`}
              className={cn(
                'inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums border',
                step.state === 'completed' &&
                  'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200',
                step.state === 'current' &&
                  'border-amber-400 bg-amber-50 text-amber-950 ring-1 ring-amber-400/60 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-100',
                step.state === 'upcoming' && 'border-border bg-muted/40 text-muted-foreground'
              )}
            >
              {step.code}
            </span>
          </span>
        ))}
      </div>
      {workflow.resource_type === 'voucher' && current ? (
        <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
          Next: <span className="font-medium text-foreground/90">{current.title}</span>
        </p>
      ) : null}
      {workflow.resource_type === 'budget' ? (
        <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">{workflow.summary}</p>
      ) : null}
    </div>
  )
}
