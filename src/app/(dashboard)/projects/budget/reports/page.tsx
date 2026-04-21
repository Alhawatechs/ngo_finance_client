'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart3, Wallet, TrendingUp, FileText } from 'lucide-react'
import { getBudgetSummary, getBudgets, getBudgetTypeLabel } from '@/lib/api/budgets'
import { formatCurrency } from '@/lib/utils'
import { ProjectsPageHeader } from '@/components/projects/PageHeader'

interface SummaryData {
  total_budgets?: number
  approved_budgets?: number
  total_budgeted?: number
  total_actual?: number
  utilization_rate?: number
  by_type?: Record<string, { count?: number; total?: number }>
  by_status?: Record<string, number>
}

export default function BudgetReportsPage() {
  const { data: summaryData, isLoading } = useQuery({
    queryKey: ['budget-summary'],
    queryFn: getBudgetSummary,
  })

  const { data: budgetsData } = useQuery({
    queryKey: ['budgets-reports-list'],
    queryFn: () => getBudgets({ per_page: 100 }),
  })

  const summary = (summaryData?.data ?? summaryData) as SummaryData | undefined
  const budgets = (budgetsData?.data ?? []) as { budget_type?: string; total_budget?: number; total_amount?: number; total_actual?: number; status?: string }[]

  const totalBudgeted = summary?.total_budgeted ?? budgets.filter((b) => (b as { status?: string }).status === 'approved').reduce((s, b) => s + (b.total_budget ?? b.total_amount ?? 0), 0)
  const totalActual = summary?.total_actual ?? budgets.filter((b) => (b as { status?: string }).status === 'approved').reduce((s, b) => s + ((b as { total_actual?: number }).total_actual ?? 0), 0)
  const utilizationRate = summary?.utilization_rate ?? (totalBudgeted > 0 ? Math.round((totalActual / totalBudgeted) * 1000) / 10 : 0)

  const byType = summary?.by_type ?? budgets.reduce((acc, b) => {
    const t = b.budget_type ?? 'other'
    if (!acc[t]) acc[t] = { count: 0, total: 0 }
    acc[t].count! += 1
    acc[t].total! += b.total_budget ?? b.total_amount ?? 0
    return acc
  }, {} as Record<string, { count?: number; total?: number }>)

  return (
    <div className="space-y-6">
      <ProjectsPageHeader
        title="Budget Reports"
        description="Summary and analytics for budget performance"
        breadcrumbs={[]}
      />

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4" /> Total budgets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{summary?.total_budgets ?? budgets.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" /> Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{summary?.approved_budgets ?? budgets.filter((b) => b.status === 'approved').length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Total budgeted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatCurrency(totalBudgeted, 'USD')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total actual</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatCurrency(totalActual, 'USD')}</p>
              {totalBudgeted > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{utilizationRate}% utilization</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" />
            By budget type
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : Object.keys(byType).length === 0 ? (
            <p className="text-sm text-muted-foreground">No budget data.</p>
          ) : (
            <ul className="space-y-2">
              {Object.entries(byType).map(([type, v]) => (
                <li key={type} className="flex justify-between items-center text-sm">
                  <span>{getBudgetTypeLabel(type)}</span>
                  <span className="font-medium">
                    {(v.count ?? 0)} budgets · {formatCurrency(v.total ?? 0, 'USD')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link href="/projects/budget">Budget List</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/projects/budget/add">Budget register</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/projects/budget/amendments">Budget Amendments</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/budget/tracking">Budget tracking</Link>
        </Button>
      </div>
    </div>
  )
}
