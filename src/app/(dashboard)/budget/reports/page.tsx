'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart3, Wallet, TrendingUp, FileText } from 'lucide-react'
import { getBudgets, Budget } from '@/lib/api/budgets'
import { formatCurrency } from '@/lib/utils'

export default function BudgetReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['budgets-reports'],
    queryFn: () => getBudgets({ per_page: 100 }),
  })

  const budgets = (data?.data ?? []) as Budget[]
  const approved = budgets.filter((b) => b.status === 'approved')
  const totalBudgeted = approved.reduce((s, b) => s + (b.total_budget ?? 0), 0)
  const totalActual = approved.reduce((s, b) => s + ((b as { total_actual?: number }).total_actual ?? 0), 0)
  const byType = budgets.reduce((acc, b) => {
    const t = b.budget_type ?? 'other'
    if (!acc[t]) acc[t] = { count: 0, budgeted: 0, actual: 0 }
    acc[t].count++
    acc[t].budgeted += b.total_budget ?? 0
    acc[t].actual += (b as { total_actual?: number }).total_actual ?? 0
    return acc
  }, {} as Record<string, { count: number; budgeted: number; actual: number }>)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Budget reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Summary and analytics for budget performance</p>
      </div>

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
              <p className="text-2xl font-semibold">{budgets.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" /> Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{approved.length}</p>
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
                  <span className="capitalize">{type}</span>
                  <span className="font-medium">
                    {v.count} budgets · {formatCurrency(v.budgeted, 'USD')} budgeted · {formatCurrency(v.actual, 'USD')} actual
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link href="/budget/planning">Budget planning</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/budget/tracking">Budget tracking</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/projects/budget/add">Add budget</Link>
        </Button>
      </div>
    </div>
  )
}
