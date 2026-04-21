'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Wallet, Eye, Check, FileEdit } from 'lucide-react'
import {
  getBudgets,
  approveBudget,
  Budget,
  getBudgetTypeLabel,
  getBudgetTypeColor,
} from '@/lib/api/budgets'
import { formatCurrency } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectsPageHeader } from '@/components/projects/PageHeader'
import { ProjectsEmptyState } from '@/components/projects/EmptyState'
import { useToast } from '@/components/ui/use-toast'

export default function BudgetAmendmentsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [approvingId, setApprovingId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['budgets-pending-approvals'],
    queryFn: () => getBudgets({ status: 'pending_approval', per_page: 50 }),
  })

  const approveMutation = useMutation({
    mutationFn: (id: number) => approveBudget(id),
    onMutate: (id) => setApprovingId(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['budgets-pending-approvals'] })
      queryClient.invalidateQueries({ queryKey: ['budgets-inquiry'] })
      queryClient.invalidateQueries({ queryKey: ['approval-center'] })
      toast({ title: 'Approved', description: 'Budget amendment approved successfully.' })
    },
    onError: (err: unknown) => {
      const msg = err && typeof err === 'object' && 'response' in err && (err as { response?: { data?: { message?: string } } }).response?.data?.message
        ? (err as { response: { data: { message: string } } }).response.data.message
        : 'Failed to approve budget.'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    },
    onSettled: () => setApprovingId(null),
  })

  const budgets = (data?.data ?? []) as Budget[]

  return (
    <div className="space-y-6">
      <ProjectsPageHeader
        title="Budget Amendments"
        description="Review and approve budget amendments. Create revisions from approved budgets via Budget register."
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: 'Budget', href: '/projects/budget' },
          { label: 'Amendments' },
        ]}
        actions={
          <Link href="/projects/budget/inquiry">
            <Button variant="outline">
              <FileEdit className="h-4 w-4 mr-2" />
              Budget inquiry
            </Button>
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="h-5 w-5" />
            Pending approval ({budgets.length})
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Budget amendments submitted for approval. Approve to activate changes.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : budgets.length === 0 ? (
            <ProjectsEmptyState
              icon={Wallet}
              title="No pending amendments"
              description="All budget amendments have been approved. Create amendments by revising approved budgets from the Budget register."
              action={
                <div className="flex gap-2">
                  <Link href="/projects/budget/inquiry">
                    <Button variant="outline">Budget inquiry</Button>
                  </Link>
                  <Link href="/projects/budget">
                    <Button>Budget List</Button>
                  </Link>
                </div>
              }
            />
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 uppercase tracking-wider">
                    <th className="text-left p-3 font-medium">Budget name</th>
                    <th className="text-left p-3 font-medium">Fiscal year</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Project</th>
                    <th className="text-right p-3 font-medium">Total</th>
                    <th className="w-32 p-3" />
                  </tr>
                </thead>
                <tbody>
                  {budgets.map((b) => (
                    <tr key={b.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium text-gray-900 dark:text-gray-100">{b.name}</td>
                      <td className="p-3 text-muted-foreground">
                        {typeof b.fiscal_year === 'object' && b.fiscal_year?.name ? b.fiscal_year.name : '—'}
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary" className={getBudgetTypeColor(b.budget_type)}>
                          {getBudgetTypeLabel(b.budget_type)}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {b.project?.project_name ?? b.project?.project_code ?? '—'}
                      </td>
                      <td className="p-3 text-right font-medium">
                        {formatCurrency(
                          (b as Budget & { total_budget?: number }).total_budget ??
                            (b as Budget & { total_amount?: number }).total_amount ??
                            0,
                          b.currency
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/projects/budget/inquiry?id=${b.id}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate(b.id)}
                            disabled={approvingId === b.id}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            {approvingId === b.id ? 'Approving...' : 'Approve'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
