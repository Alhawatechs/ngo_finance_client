'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ClipboardCheck, ExternalLink, FileText, Wallet } from 'lucide-react'
import { getApprovalCenterCounts } from '@/lib/api/approval-center'
import { cn } from '@/lib/utils'

export default function ApprovalWorkflowQueuePage() {
  const { data: counts, isPending } = useQuery({
    queryKey: ['approval-center', 'counts'],
    queryFn: async () => {
      const res = await getApprovalCenterCounts()
      return res.data
    },
    staleTime: 30_000,
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Queue &amp; review</h2>
        <p className="text-sm text-muted-foreground mt-1">
          See how many vouchers and budgets are waiting, then open the Approval Center to review and approve in context.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {isPending ? (
          <>
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </>
        ) : (
          <>
            <Card className="border-l-4 border-l-primary shadow-sm">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">All pending</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={cn('text-3xl font-bold tabular-nums', (counts?.all ?? 0) > 0 ? 'text-amber-700' : 'text-muted-foreground')}>
                  {counts?.all ?? 0}
                </p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-primary/70 shadow-sm">
              <CardHeader className="pb-2 pt-4 flex flex-row items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-700" aria-hidden />
                <CardTitle className="text-sm font-medium text-muted-foreground">Vouchers</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums text-foreground">{counts?.voucher ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-600/70 shadow-sm">
              <CardHeader className="pb-2 pt-4 flex flex-row items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-600" aria-hidden />
                <CardTitle className="text-sm font-medium text-muted-foreground">Budgets</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums text-foreground">{counts?.budget ?? 0}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Approval Center</CardTitle>
          <CardDescription>
            Same inbox as on the main menu: filters, deep links to vouchers and budgets, and quick budget approve when
            permitted.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link href="/approvals">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Open Approval Center
            </Link>
          </Button>
          <Badge variant="secondary" className="font-normal">
            Main menu → Approval Center
          </Badge>
          <Button variant="outline" size="sm" asChild>
            <Link href="/vouchers">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Voucher list
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/projects/budget/inquiry">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Budget inquiry
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
