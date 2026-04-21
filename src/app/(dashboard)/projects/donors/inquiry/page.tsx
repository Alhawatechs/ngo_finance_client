'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, ArrowLeft, FileText, DollarSign, Heart, ExternalLink, Wallet } from 'lucide-react'
import { getDonors, getDonor, getDonorGrants, getDonorDonations, getDonorPledges, getDonorTypeLabel, getDonorTypeColor, Donor } from '@/lib/api/donors'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function DonorInquiryPage() {
  const searchParams = useSearchParams()
  const viewId = searchParams.get('id') ? parseInt(searchParams.get('id')!, 10) : null
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['donors-inquiry', searchQuery, typeFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { per_page: 50 }
      if (searchQuery.trim()) params.search = searchQuery.trim()
      if (typeFilter !== 'all') params.donor_type = typeFilter
      return getDonors(params)
    },
  })

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['donor', viewId],
    queryFn: () => getDonor(viewId!),
    enabled: !!viewId,
  })

  const { data: donationsData } = useQuery({
    queryKey: ['donor-donations', viewId],
    queryFn: () => getDonorDonations(viewId!, { per_page: 50 }),
    enabled: !!viewId,
  })

  const { data: pledgesData } = useQuery({
    queryKey: ['donor-pledges', viewId],
    queryFn: () => getDonorPledges(viewId!, { per_page: 50 }),
    enabled: !!viewId,
  })

  const donors = (listData?.data ?? []) as Donor[]
  const donorDetail = detailData?.data as { donor?: Donor; grants?: unknown[]; total_donations?: number; active_projects_count?: number } | null
  const donor = donorDetail?.donor ?? null
  const grants = (donorDetail?.grants ?? []) as { id: number; grant_code: string; grant_name: string; total_amount: number; currency: string; status: string; start_date: string; end_date: string }[]
  const donations = (donationsData?.data ?? []) as { id: number; donation_number: string; donation_date: string; amount: number; currency: string; status: string; description: string }[]
  const pledges = (pledgesData?.data ?? []) as { id: number; pledge_number: string; pledge_date: string; pledged_amount: number; received_amount: number; outstanding_amount: number; currency: string; status: string; description: string; grant?: { grant_code: string; grant_name: string } }[]

  if (viewId && (detailLoading || donor)) {
    return (
      <div className="p-6 space-y-6">
        <Link href="/projects/donors" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to register
        </Link>
        {detailLoading ? (
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ) : donor ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Heart className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">{donor.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{donor.code}</p>
                  <Badge className={getDonorTypeColor(donor.donor_type)}>{getDonorTypeLabel(donor.donor_type)}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="grants">Grants ({grants.length})</TabsTrigger>
                  <TabsTrigger value="donations">Donations ({donations.length})</TabsTrigger>
                  <TabsTrigger value="pledges">Pledges ({pledges.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm text-muted-foreground">Total donations</p>
                      <p className="text-xl font-semibold">{formatCurrency(donorDetail?.total_donations ?? 0)}</p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm text-muted-foreground">Active projects</p>
                      <p className="text-xl font-semibold">{donorDetail?.active_projects_count ?? 0}</p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm text-muted-foreground">Grants</p>
                      <p className="text-xl font-semibold">{grants.length}</p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm text-muted-foreground">Reporting</p>
                      <p className="text-sm font-medium">{donor.reporting_currency} · {donor.reporting_frequency ?? '—'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Contact person</p>
                      <p className="font-medium">{donor.contact_person || '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium">{donor.email || '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Phone</p>
                      <p className="font-medium">{donor.phone || '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Country</p>
                      <p className="font-medium">{donor.country || '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Website</p>
                      <p className="font-medium">{donor.website ? <a href={donor.website} target="_blank" rel="noreferrer" className="text-primary underline">{donor.website}</a> : '—'}</p>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="grants" className="pt-4">
                  {grants.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No grants.</p>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50 uppercase tracking-wider">
                            <th className="text-left p-3 font-medium">Grant</th>
                            <th className="text-left p-3 font-medium">Period</th>
                            <th className="text-right p-3 font-medium">Amount</th>
                            <th className="text-left p-3 font-medium">Status</th>
                            <th className="w-24 p-3" />
                          </tr>
                        </thead>
                        <tbody>
                          {grants.map((g) => (
                            <tr key={g.id} className="border-b hover:bg-muted/30">
                              <td className="p-3">
                                <p className="font-medium">{g.grant_name}</p>
                                <p className="text-xs text-muted-foreground">{g.grant_code}</p>
                              </td>
                              <td className="p-3">{formatDate(g.start_date)} – {formatDate(g.end_date)}</td>
                              <td className="p-3 text-right">{formatCurrency(g.total_amount ?? 0, g.currency)}</td>
                              <td className="p-3"><Badge variant="outline">{g.status}</Badge></td>
                              <td className="p-3">
                                <Button variant="ghost" size="sm" asChild>
                                  <Link href={`/projects/grants?grant_id=${g.id}`}>
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </Link>
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <Button variant="outline" size="sm" className="mt-2" asChild>
                    <Link href={`/projects/donors/grants?donor_id=${donor.id}`}>View all grants</Link>
                  </Button>
                </TabsContent>
                <TabsContent value="donations" className="pt-4">
                  {donations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No donations recorded.</p>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50 uppercase tracking-wider">
                            <th className="text-left p-3 font-medium">Number</th>
                            <th className="text-left p-3 font-medium">Date</th>
                            <th className="text-left p-3 font-medium">Description</th>
                            <th className="text-right p-3 font-medium">Amount</th>
                            <th className="text-left p-3 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {donations.map((d) => (
                            <tr key={d.id} className="border-b hover:bg-muted/30">
                              <td className="p-3 font-mono">{d.donation_number}</td>
                              <td className="p-3">{formatDate(d.donation_date)}</td>
                              <td className="p-3">{d.description || '—'}</td>
                              <td className="p-3 text-right">{formatCurrency(d.amount ?? 0, d.currency)}</td>
                              <td className="p-3"><Badge variant="outline">{d.status}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="pledges" className="pt-4">
                  {pledges.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No pledges recorded.</p>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50 uppercase tracking-wider">
                            <th className="text-left p-3 font-medium">Pledge</th>
                            <th className="text-left p-3 font-medium">Date</th>
                            <th className="text-right p-3 font-medium">Pledged</th>
                            <th className="text-right p-3 font-medium">Outstanding</th>
                            <th className="text-left p-3 font-medium">Status</th>
                            <th className="text-left p-3 font-medium">Grant</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pledges.map((p) => (
                            <tr key={p.id} className="border-b hover:bg-muted/30">
                              <td className="p-3 font-mono">{p.pledge_number}</td>
                              <td className="p-3">{formatDate(p.pledge_date)}</td>
                              <td className="p-3 text-right">{formatCurrency(p.pledged_amount, p.currency)}</td>
                              <td className="p-3 text-right font-medium">{formatCurrency(p.outstanding_amount, p.currency)}</td>
                              <td className="p-3"><Badge variant="outline">{p.status.replace(/_/g, ' ')}</Badge></td>
                              <td className="p-3 text-muted-foreground">{p.grant ? `${p.grant.grant_code} – ${p.grant.grant_name}` : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/projects/donors/pledges?donor_id=${donor.id}`}>View all pledges</Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/projects/donor-funds">Donor funds</Link>
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ) : (
          <p className="text-muted-foreground">Donor not found.</p>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Donor register</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Search and view donor profiles, grants, donations</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Donors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Donor name, code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="bilateral">Bilateral</SelectItem>
                <SelectItem value="multilateral">Multilateral</SelectItem>
                <SelectItem value="foundation">Foundation</SelectItem>
                <SelectItem value="corporate">Corporate</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="government">Government</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {listLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : donors.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
              No donors found. Adjust search or add donors in the Donor register.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 uppercase tracking-wider">
                    <th className="text-left p-3 font-medium">Donor</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Country</th>
                    <th className="w-20 p-3" />
                  </tr>
                </thead>
                <tbody>
                  {donors.map((d) => (
                    <tr key={d.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <p className="font-medium">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.code}</p>
                      </td>
                      <td className="p-3"><Badge variant="outline" className={getDonorTypeColor(d.donor_type)}>{getDonorTypeLabel(d.donor_type)}</Badge></td>
                      <td className="p-3 text-muted-foreground">{d.country || '—'}</td>
                      <td className="p-3">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/projects/donors/inquiry?id=${d.id}`}>View</Link>
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
