'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Package, Search, RefreshCw, MapPin } from 'lucide-react'
import { getAssets, FixedAsset, getAssetStatusLabel, getAssetStatusColor } from '@/lib/api/assets'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function AssetsTrackingPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['assets-tracking', searchQuery, statusFilter],
    queryFn: () => getAssets({
      per_page: 100,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      search: searchQuery || undefined,
    }),
  })

  const assets = (data?.data ?? []) as FixedAsset[]
  const filtered = searchQuery.trim()
    ? assets.filter(
        (a) =>
          a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.asset_code?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : assets

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Asset tracking</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track fixed assets by location, status, and utilization
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5" />
            Asset inventory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-[140px]"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="disposed">Disposed</option>
            </select>
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
              No assets found. Add assets in the Asset register.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Asset</th>
                    <th className="text-left p-3 font-medium">Category</th>
                    <th className="text-left p-3 font-medium">Acquisition date</th>
                    <th className="text-right p-3 font-medium">Net book value</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="w-20 p-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <p className="font-medium">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{a.asset_code}</p>
                      </td>
                      <td className="p-3">{(a as { category_name?: string }).category_name ?? '—'}</td>
                      <td className="p-3">{a.acquisition_date ? formatDate(a.acquisition_date) : '—'}</td>
                      <td className="p-3 text-right">
                        {formatCurrency((a.acquisition_cost ?? 0) - (a.accumulated_depreciation ?? 0), a.currency ?? 'USD')}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={getAssetStatusColor(a.status)}>
                          {getAssetStatusLabel(a.status)}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href="/assets">View</Link>
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
        <Link href="/assets">Asset register</Link>
      </Button>
    </div>
  )
}
