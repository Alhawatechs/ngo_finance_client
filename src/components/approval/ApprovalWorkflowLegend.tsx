'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ApprovalWorkflowDefinition } from '@/lib/api/approval-center'

type ApprovalWorkflowLegendProps = {
  definition: ApprovalWorkflowDefinition | undefined
}

export function ApprovalWorkflowLegend({ definition }: ApprovalWorkflowLegendProps) {
  if (!definition?.layers?.length) return null

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Finance approval ladder</CardTitle>
        <p className="text-sm text-muted-foreground">{definition.summary}</p>
      </CardHeader>
      <CardContent className="pt-0">
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {definition.layers.map((layer) => (
            <li
              key={layer.level}
              className="flex items-start gap-2 rounded-lg border border-border/70 bg-muted/10 px-3 py-2.5 text-sm"
            >
              <span className="font-mono text-xs font-bold tabular-nums text-primary">{layer.code}</span>
              <span className="leading-snug text-foreground">{layer.title}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
