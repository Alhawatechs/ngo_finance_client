'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TrendingUp, RefreshCw, Wallet, FileCheck, Percent } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { getFunds, getFundTypeLabel, getFundTypeColor, Fund } from '@/lib/api/funds'
import { getGrants, Grant } from '@/lib/api/projects'

export default function UtilizationPage() {
  const [fundPage, setFundPage] = useState(1)
  const [grantPage, setGrantPage] = useState(1)
  const [fundTypeFilter, setFundTypeFilter] = useState<string>('')
  const [grantStatusFilter, setGrantStatusFilter] = useState<string>('')

  const { data: fundsData, isLoading: fundsLoading, refetch: refetchFunds } = useQuery({
    queryKey: ['funds', { page: fundPage, fund_type: fundTypeFilter }],
    queryFn: () => getFunds({
      page: fundPage,
      per_page: 20,
      fund_type: fundTypeFilter || undefined,
      is_active: true,
    }),
  })

  const { data: grantsData, isLoading: grantsLoading, refetch: refetchGrants } = useQuery({
    queryKey: ['grants-utilization', { page: grantPage, status: grantStatusFilter }],
    queryFn: () => getGrants({
      page: grantPage,
      per_page: 20,
      status: grantStatusFilter || undefined,
    }),
  })

  const funds: Fund[] = fundsData?.data ?? []
  const grants: Grant[] = grantsData?.data ?? []
  const fundsMeta = fundsData?.meta
  const grantsMeta = grantsData?.meta

  const fundUtilization = funds.map((f) => {
    const total = f.total_amount || 0
    const balance = f.current_balance ?? 0
    const utilized = total - balance
    const pct = total > 0 ? (utilized / total) * 100 : 0
    return { fund: f, total, balance, utilized, utilizationPct: pct }
  })

  const grantUtilization = grants.map((g) => {
    const total = g.total_amount || 0
    const disbursed = g.disbursed_amount ?? 0
    const spent = g.spent_amount ?? 0
    const disbursedPct = total > 0 ? (disbursed / total) * 100 : 0
    const spentPct = total > 0 ? (spent / total) * 100 : 0
    return {
      grant: g,
      total,
      disbursed,
      spent,
      disbursedPct,
      spentPct,
      pending: disbursed - spent,
    }
  })

  const totalFundUtilized = fundUtilization.reduce((s, u) => s + u.utilized, 0)
  const totalFundBalance = fundUtilization.reduce((s, u) => s + u.balance, 0)
  const totalGrantAmount = grantUtilization.reduce((s, u) => s + u.total, 0)
  const totalGrantDisbursed = grantUtilization.reduce((s, u) => s + u.disbursed, 0)
  const totalGrantSpent = grantUtilization.reduce((s, u) => s + u.spent, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Utilization</h1>
          <p className="text-muted-foreground">Track fund and grant utilization and burn rate</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { refetchFunds(); refetchGrants(); }}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fund balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {fundsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <span className="text-2xl font-bold">{formatCurrency(totalFundBalance)}</span>
            )}
            <p className="text-xs text-muted-foreground">Total current fund balance</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fund utilized</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {fundsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <span className="text-2xl font-bold">{formatCurrency(totalFundUtilized)}</span>
            )}
            <p className="text-xs text-muted-foreground">Total utilized from funds</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grants disbursed</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {grantsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <span className="text-2xl font-bold">{formatCurrency(totalGrantDisbursed)}</span>
            )}
            <p className="text-xs text-muted-foreground">of {formatCurrency(totalGrantAmount)} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grants spent</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {grantsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <span className="text-2xl font-bold">{formatCurrency(totalGrantSpent)}</span>
            )}
            <p className="text-xs text-muted-foreground">Spent from disbursed</p>
          </CardContent>
        </Card>
      </div>

      {/* Fund utilization table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Fund utilization
          </CardTitle>
          <CardDescription>Utilization by fund (total amount vs current balance)</CardDescription>
          <div className="flex flex-wrap gap-2 pt-2">
            <Select value={fundTypeFilter || '__all__'} onValueChange={(v) => { setFundTypeFilter(v === '__all__' ? '' : v); setFundPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Fund type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All types</SelectItem>
                <SelectItem value="restricted">Restricted</SelectItem>
                <SelectItem value="unrestricted">Unrestricted</SelectItem>
                <SelectItem value="temporarily_restricted">Temporarily restricted</SelectItem>
                <SelectItem value="endowment">Endowment</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {fundsLoading ? (
            <Skeleton className="h-64 w-full rounded-md" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b uppercase tracking-wider">
                      <th className="text-left py-2 font-medium">Fund</th>
                      <th className="text-left py-2 font-medium">Type</th>
                      <th className="text-right py-2 font-medium">Total</th>
                      <th className="text-right py-2 font-medium">Balance</th>
                      <th className="text-right py-2 font-medium">Utilized</th>
                      <th className="text-right py-2 font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fundUtilization.length === 0 ? (
                      <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No funds found</td></tr>
                    ) : (
                      fundUtilization.map(({ fund, total, balance, utilized, utilizationPct }) => (
                        <tr key={fund.id} className="border-b hover:bg-muted/50">
                          <td className="py-2">
                            <span className="font-medium">{fund.fund_code}</span>
                            <span className="text-muted-foreground ml-1">— {fund.fund_name}</span>
                          </td>
                          <td className="py-2">
                            <span className={`inline-flex rounded px-2 py-0.5 text-xs ${getFundTypeColor(fund.fund_type)}`}>
                              {getFundTypeLabel(fund.fund_type)}
                            </span>
                          </td>
                          <td className="py-2 text-right">{formatCurrency(total, fund.currency)}</td>
                          <td className="py-2 text-right">{formatCurrency(balance, fund.currency)}</td>
                          <td className="py-2 text-right">{formatCurrency(utilized, fund.currency)}</td>
                          <td className="py-2 text-right">
                            <span className={utilizationPct >= 80 ? 'text-amber-600' : ''}>{utilizationPct.toFixed(1)}%</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {fundsMeta && fundsMeta.last_page > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {fundsMeta.current_page} of {fundsMeta.last_page}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={fundsMeta.current_page <= 1} onClick={() => setFundPage((p) => p - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={fundsMeta.current_page >= fundsMeta.last_page} onClick={() => setFundPage((p) => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Grant utilization table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Grant utilization
          </CardTitle>
          <CardDescription>Disbursed and spent amounts by grant</CardDescription>
          <div className="flex flex-wrap gap-2 pt-2">
            <Select value={grantStatusFilter || '__all__'} onValueChange={(v) => { setGrantStatusFilter(v === '__all__' ? '' : v); setGrantPage(1); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {grantsLoading ? (
            <Skeleton className="h-64 w-full rounded-md" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b uppercase tracking-wider">
                      <th className="text-left py-2 font-medium">Grant</th>
                      <th className="text-right py-2 font-medium">Total</th>
                      <th className="text-right py-2 font-medium">Disbursed</th>
                      <th className="text-right py-2 font-medium">Spent</th>
                      <th className="text-right py-2 font-medium">Pending</th>
                      <th className="text-right py-2 font-medium">Disbursed %</th>
                      <th className="text-right py-2 font-medium">Spent %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grantUtilization.length === 0 ? (
                      <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No grants found</td></tr>
                    ) : (
                      grantUtilization.map(({ grant, total, disbursed, spent, pending, disbursedPct, spentPct }) => (
                        <tr key={grant.id} className="border-b hover:bg-muted/50">
                          <td className="py-2">
                            <span className="font-medium">{grant.grant_code}</span>
                            <span className="text-muted-foreground ml-1">— {grant.grant_name}</span>
                          </td>
                          <td className="py-2 text-right">{formatCurrency(total, grant.currency)}</td>
                          <td className="py-2 text-right">{formatCurrency(disbursed, grant.currency)}</td>
                          <td className="py-2 text-right">{formatCurrency(spent, grant.currency)}</td>
                          <td className="py-2 text-right">{formatCurrency(pending, grant.currency)}</td>
                          <td className="py-2 text-right">{disbursedPct.toFixed(1)}%</td>
                          <td className="py-2 text-right">{spentPct.toFixed(1)}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {grantsMeta && grantsMeta.last_page > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {grantsMeta.current_page} of {grantsMeta.last_page}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={grantsMeta.current_page <= 1} onClick={() => setGrantPage((p) => p - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={grantsMeta.current_page >= grantsMeta.last_page} onClick={() => setGrantPage((p) => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
