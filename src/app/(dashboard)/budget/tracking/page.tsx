'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FinanceModuleLinks } from '@/components/finance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, Search, RefreshCw } from 'lucide-react'
import { getBudgets, Budget, getBudgetStatusLabel } from '@/lib/api/budgets'
import { formatCurrency } from '@/lib/utils'

export default function BudgetTrackingPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['budgets-tracking', page, searchQuery],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, per_page: 25 }
      return getBudgets(params)
    },
  })

  const budgets = (data?.data ?? []) as Budget[]
  const filtered = searchQuery.trim()
    ? budgets.filter(
        (b) =>
          b.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.project?.project_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : budgets

  const utilizationPct = (b: Budget) => {
    const total = b.total_budget ?? 0
    if (total <= 0) return 0
    const spent = (b as { total_actual?: number }).total_actual ?? 0
    return Math.min(100, Math.round((spent / total) * 100))
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Budget tracking</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Monitor budget vs actual utilization</p>
      </div>
      <FinanceModuleLinks variant="inline" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            Budget vs actual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search budgets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
              No budgets found. Create budgets in Budget planning.
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((b) => {
                const pct = utilizationPct(b)
                return (
                  <div key={b.id} className="rounded-lg border p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{b.name}</p>
                        <p className="text-xs text-muted-foreground">{b.project?.project_name ?? '—'}</p>
                      </div>
                      <Badge variant="outline">{getBudgetStatusLabel(b.status)}</Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm mb-2">
                      <div>
                        <span className="text-muted-foreground">Budgeted</span>
                        <p className="font-medium">{formatCurrency(b.total_budget ?? 0, b.currency ?? 'USD')}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Actual</span>
                        <p className="font-medium">{formatCurrency((b as { total_actual?: number }).total_actual ?? 0, b.currency ?? 'USD')}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Variance</span>
                        <p className="font-medium">{formatCurrency((b.total_budget ?? 0) - ((b as { total_actual?: number }).total_actual ?? 0), b.currency ?? 'USD')}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Utilization</span>
                        <p className="font-medium">{pct}%</p>
                      </div>
                    </div>
                    <Progress value={pct} className="h-2" />
                    <Button variant="link" className="h-auto p-0 mt-2 text-xs" asChild>
                      <Link href={`/projects/budget/inquiry?id=${b.id}`}>View detail</Link>
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
