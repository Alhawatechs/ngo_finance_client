'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Wallet, Plus, Search, RefreshCw, FileText } from 'lucide-react'
import { getBudgets, Budget, getBudgetStatusLabel, getBudgetStatusColor, getBudgetTypeLabel } from '@/lib/api/budgets'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ActionMenu } from '@/components/ui/action-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FinanceModuleLinks } from '@/components/finance'

export default function BudgetPlanningPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [page, setPage] = useState(1)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['budgets-planning', page, searchQuery, statusFilter, typeFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, per_page: 25 }
      if (statusFilter !== 'all') params.status = statusFilter
      if (typeFilter !== 'all') params.budget_type = typeFilter
      return getBudgets(params)
    },
  })

  const budgets = (data?.data ?? []) as Budget[]
  const meta = data?.meta
  const filtered = searchQuery.trim()
    ? budgets.filter(
        (b) =>
          b.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.project?.project_code?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : budgets

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Budget planning</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create and manage operational and project budgets</p>
        </div>
        <Button asChild>
          <Link href="/projects/budget/add">
            <Plus className="h-4 w-4 mr-2" />
            Add new budget
          </Link>
        </Button>
      </div>
      <FinanceModuleLinks variant="inline" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Budgets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by budget name or project..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
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
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="operational">Operational</SelectItem>
                <SelectItem value="project">Project</SelectItem>
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
              No budgets found. Create a new budget to get started.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Budget</th>
                    <th className="text-left p-3 font-medium">Project</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-right p-3 font-medium">Total</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="w-20 p-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => (
                    <tr key={b.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <p className="font-medium">{b.name}</p>
                        <p className="text-xs text-muted-foreground">{b.fiscal_year ? `${formatDate(b.fiscal_year.start_date)} – ${formatDate(b.fiscal_year.end_date)}` : '—'}</p>
                      </td>
                      <td className="p-3">{b.project?.project_name ?? '—'}</td>
                      <td className="p-3">{getBudgetTypeLabel(b.budget_type)}</td>
                      <td className="p-3 text-right">{formatCurrency(b.total_budget ?? 0, b.currency ?? 'USD')}</td>
                      <td className="p-3">
                        <Badge variant="outline" className={getBudgetStatusColor(b.status)}>{getBudgetStatusLabel(b.status)}</Badge>
                      </td>
                      <td className="p-3">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/projects/budget/inquiry?id=${b.id}`}>View</Link>
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
    </div>
  )
}
