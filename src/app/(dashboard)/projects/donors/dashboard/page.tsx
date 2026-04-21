'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, DollarSign, FileText, TrendingUp, Building2, Globe } from 'lucide-react'
import { getDonorSummary } from '@/lib/api/donors'
import { getGrants } from '@/lib/api/projects'
import { formatCurrency } from '@/lib/utils'
import { getDonorTypeLabel } from '@/lib/api/donors'
import { ProjectsPageHeader } from '@/components/projects/PageHeader'
export default function DonorDashboardPage() {
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['donors-summary'],
    queryFn: getDonorSummary,
  })

  const { data: grantsData } = useQuery({
    queryKey: ['grants-expiring-dashboard'],
    queryFn: () => getGrants({ per_page: 10, expiring_within_days: 90 }),
  })

  const summary = summaryData?.data
  const grants = (grantsData?.data ?? []) as { id: number; grant_code: string; grant_name: string; end_date: string; total_amount: number; currency: string; donor?: { name: string; code: string } }[]

  return (
    <div className="space-y-6">
      <ProjectsPageHeader
        title="Donor Dashboard"
        description="Overview of donor relationships, commitments, and key metrics"
        breadcrumbs={[]}
      />

      {summaryLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" /> Total donors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{summary.total_donors ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">{summary.active_donors ?? 0} active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Active donors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{summary.active_donors ?? 0}</p>
            </CardContent>
          </Card>
          {summary.by_type && Object.keys(summary.by_type).length > 0 && (
            <>
              {Object.entries(summary.by_type).slice(0, 2).map(([type, v]) => {
                const val = v as { count?: number; active?: number }
                return (
                  <Card key={type}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Globe className="h-4 w-4" /> {getDonorTypeLabel(type)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-semibold">{val?.count ?? 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">{val?.active ?? 0} active</p>
                    </CardContent>
                  </Card>
                )
              })}
            </>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Contracts expiring soon (90 days)
            </CardTitle>
            <p className="text-sm text-muted-foreground">Grants ending in the next 90 days</p>
          </CardHeader>
          <CardContent>
            {!grantsData ? (
              <Skeleton className="h-32 w-full" />
            ) : grants.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contracts expiring soon.</p>
            ) : (
              <ul className="space-y-2">
                {grants.map((g) => (
                  <li key={g.id} className="flex justify-between items-center text-sm">
                    <div>
                      <p className="font-medium">{g.grant_name}</p>
                      <p className="text-xs text-muted-foreground">{g.donor?.name ?? '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(g.total_amount ?? 0, g.currency)}</p>
                      <p className="text-xs text-muted-foreground">Ends {g.end_date}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="outline" className="mt-4" size="sm" asChild>
              <Link href="/projects/donors/grants">View all grants</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Quick links
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/projects/donors">Donor register</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/projects/donors/inquiry">Donor inquiry</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/projects/donors/grants">Donor grants</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/projects/donors/donations">Donations</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/projects/donors/reports">Donor reports</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
