'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, Search, RefreshCw, DollarSign, Eye } from 'lucide-react'
import { getPayrollRuns, PayrollRun, getPayrollStatusLabel, getPayrollStatusColor } from '@/lib/api/payroll'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function PayrollTrackingPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['payroll-runs-tracking', page, statusFilter],
    queryFn: () => getPayrollRuns({
      page,
      per_page: 25,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }),
  })

  const runs = (data?.data ?? []) as PayrollRun[]
  const pagination = data?.meta
  const filtered = searchQuery.trim()
    ? runs.filter(
        (r) =>
          r.run_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : runs

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Payroll tracking</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Monitor payroll runs and their status</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Payroll runs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by run number or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
              No payroll runs found. Create a new run in Payroll processing.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Run</th>
                    <th className="text-left p-3 font-medium">Period</th>
                    <th className="text-left p-3 font-medium">Pay date</th>
                    <th className="text-right p-3 font-medium">Employees</th>
                    <th className="text-right p-3 font-medium">Gross</th>
                    <th className="text-right p-3 font-medium">Net</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="w-20 p-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <p className="font-medium">{r.run_number}</p>
                        {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                      </td>
                      <td className="p-3">{formatDate(r.period_start)} – {formatDate(r.period_end)}</td>
                      <td className="p-3">{formatDate(r.pay_date)}</td>
                      <td className="p-3 text-right">{r.employee_count ?? 0}</td>
                      <td className="p-3 text-right">{formatCurrency(r.total_gross ?? 0)}</td>
                      <td className="p-3 text-right">{formatCurrency(r.total_net ?? 0)}</td>
                      <td className="p-3">
                        <Badge variant="outline" className={getPayrollStatusColor(r.status)}>
                          {getPayrollStatusLabel(r.status)}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/payroll?id=${r.id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Button variant="outline" asChild>
        <Link href="/payroll">Payroll processing</Link>
      </Button>
    </div>
  )
}
