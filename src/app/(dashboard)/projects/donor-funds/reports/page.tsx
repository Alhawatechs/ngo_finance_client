'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart3, RefreshCw, Wallet, PieChart, Layers } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { getFundSummary, getFundBalances, getFundTypeLabel, getFundTypeColor } from '@/lib/api/funds'

export default function FundReportsPage() {
  const { data: summaryData, isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['fund-summary'],
    queryFn: getFundSummary,
  })

  const { data: balancesData, isLoading: balancesLoading, refetch: refetchBalances } = useQuery({
    queryKey: ['fund-balances'],
    queryFn: getFundBalances,
  })

  const refetch = () => {
    refetchSummary()
    refetchBalances()
  }

  const summary = summaryData?.data
  const balances = balancesData?.data

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fund reports</h1>
          <p className="text-muted-foreground">Donor fund reports by fund type, balance, and summary</p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total funds</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <span className="text-2xl font-bold">{summary?.total_funds ?? 0}</span>
            )}
            <p className="text-xs text-muted-foreground">{summary?.active_funds ?? 0} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <span className="text-2xl font-bold">{formatCurrency(summary?.total_balance ?? 0)}</span>
            )}
            <p className="text-xs text-muted-foreground">Current balance across all funds</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Restricted</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <span className="text-2xl font-bold">{formatCurrency(summary?.restricted?.balance ?? 0)}</span>
                <p className="text-xs text-muted-foreground">{summary?.restricted?.count ?? 0} funds</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unrestricted</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <span className="text-2xl font-bold">{formatCurrency(summary?.unrestricted?.balance ?? 0)}</span>
                <p className="text-xs text-muted-foreground">{summary?.unrestricted?.count ?? 0} funds</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* By type (from summary) */}
      <Card>
        <CardHeader>
          <CardTitle>Summary by type</CardTitle>
          <CardDescription>Balance and count by fund type</CardDescription>
        </CardHeader>
        <CardContent>
          {summaryLoading ? (
            <Skeleton className="h-32 w-full rounded-md" />
          ) : summary ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium text-muted-foreground">Restricted</p>
                <p className="text-xl font-bold mt-1">{formatCurrency(summary.restricted?.balance ?? 0)}</p>
                <p className="text-xs text-muted-foreground">{summary.restricted?.count ?? 0} funds</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium text-muted-foreground">Unrestricted</p>
                <p className="text-xl font-bold mt-1">{formatCurrency(summary.unrestricted?.balance ?? 0)}</p>
                <p className="text-xs text-muted-foreground">{summary.unrestricted?.count ?? 0} funds</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium text-muted-foreground">Temporarily restricted</p>
                <p className="text-xl font-bold mt-1">{formatCurrency(summary.temporarily_restricted?.balance ?? 0)}</p>
                <p className="text-xs text-muted-foreground">{summary.temporarily_restricted?.count ?? 0} funds</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Balances table (by_type from balances API) */}
      <Card>
        <CardHeader>
          <CardTitle>Balances by type</CardTitle>
          <CardDescription>Active funds: total amount and current balance by fund type</CardDescription>
        </CardHeader>
        <CardContent>
          {balancesLoading ? (
            <Skeleton className="h-40 w-full rounded-md" />
          ) : balances?.by_type ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b uppercase tracking-wider">
                    <th className="text-left py-2 font-medium">Fund type</th>
                    <th className="text-right py-2 font-medium">Count</th>
                    <th className="text-right py-2 font-medium">Total amount</th>
                    <th className="text-right py-2 font-medium">Current balance</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.entries(balances.by_type) as [string, { count: number; total_amount: number; current_balance: number }][]).map(([type, row]) => (
                    <tr key={type} className="border-b hover:bg-muted/50">
                      <td className="py-2">
                        <span className={`inline-flex rounded px-2 py-0.5 text-xs ${getFundTypeColor(type)}`}>
                          {getFundTypeLabel(type)}
                        </span>
                      </td>
                      <td className="py-2 text-right">{row.count}</td>
                      <td className="py-2 text-right">{formatCurrency(row.total_amount)}</td>
                      <td className="py-2 text-right">{formatCurrency(row.current_balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground py-4">No balance data available.</p>
          )}
        </CardContent>
      </Card>

      {/* Totals from balances API */}
      {balances && (
        <Card>
          <CardHeader>
            <CardTitle>Overall totals</CardTitle>
            <CardDescription>From active funds only</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium text-muted-foreground">Total funds</p>
                <p className="text-2xl font-bold">{balances.total_funds ?? 0}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium text-muted-foreground">Total amount</p>
                <p className="text-2xl font-bold">{formatCurrency(balances.total_amount ?? 0)}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium text-muted-foreground">Total balance</p>
                <p className="text-2xl font-bold">{formatCurrency(balances.total_balance ?? 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
