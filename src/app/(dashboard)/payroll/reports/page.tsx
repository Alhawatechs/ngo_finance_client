'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart3, DollarSign, Users, TrendingUp } from 'lucide-react'
import { getPayrollRuns, PayrollRun } from '@/lib/api/payroll'
import { formatCurrency } from '@/lib/utils'

export default function PayrollReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['payroll-runs-reports'],
    queryFn: () => getPayrollRuns({ per_page: 100 }),
  })

  const runs = (data?.data ?? []) as PayrollRun[]
  const paid = runs.filter((r) => r.status === 'paid' || r.status === 'approved')
  const totalGross = runs.reduce((s, r) => s + (r.total_gross ?? 0), 0)
  const totalNet = runs.reduce((s, r) => s + (r.total_net ?? 0), 0)
  const totalDeductions = runs.reduce((s, r) => s + (r.total_deductions ?? 0), 0)
  const totalEmployees = runs.reduce((s, r) => s + (r.employee_count ?? 0), 0)
  const byStatus = runs.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Payroll reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Summary and analytics for payroll</p>
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
                <Users className="h-4 w-4" /> Total runs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{runs.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Total gross
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatCurrency(totalGross)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Total net paid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatCurrency(totalNet)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total deductions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatCurrency(totalDeductions)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" />
            By status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : Object.keys(byStatus).length === 0 ? (
            <p className="text-sm text-muted-foreground">No payroll data.</p>
          ) : (
            <ul className="space-y-2">
              {Object.entries(byStatus).map(([status, count]) => (
                <li key={status} className="flex justify-between items-center text-sm">
                  <span className="capitalize">{status}</span>
                  <span className="font-medium">{count} runs</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link href="/payroll">Payroll processing</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/payroll/tracking">Payroll tracking</Link>
        </Button>
      </div>
    </div>
  )
}
