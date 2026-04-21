'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, HandIcon, Search } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { getDonors, getDonorPledges, Donor } from '@/lib/api/donors'
import { formatCurrency, formatDate } from '@/lib/utils'

const pledgeStatusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  partially_fulfilled: 'bg-emerald-100 text-emerald-800',
  fulfilled: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
  written_off: 'bg-orange-100 text-orange-700',
}

export default function PledgesPage() {
  const searchParams = useSearchParams()
  const donorIdFromUrl = searchParams.get('donor_id')
  const [selectedDonorId, setSelectedDonorId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (donorIdFromUrl && donorIdFromUrl !== selectedDonorId) setSelectedDonorId(donorIdFromUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when URL param changes
  }, [donorIdFromUrl])

  const { data: donorsData } = useQuery({
    queryKey: ['donors-pledges'],
    queryFn: () => getDonors({ per_page: 200, is_active: true }),
  })

  const { data: pledgesData, isLoading } = useQuery({
    queryKey: ['donor-pledges', selectedDonorId],
    queryFn: () => getDonorPledges(parseInt(selectedDonorId, 10), { per_page: 50 }),
    enabled: !!selectedDonorId,
  })

  const donors: Donor[] = donorsData?.data || []
  const pledges = (pledgesData?.data ?? []) as {
    id: number
    pledge_number: string
    pledge_date: string
    description: string
    currency: string
    pledged_amount: number
    received_amount: number
    outstanding_amount: number
    expected_fulfillment_date: string | null
    status: string
    grant?: { grant_code: string; grant_name: string }
  }[]

  const filteredPledges = searchQuery.trim()
    ? pledges.filter(
        (p) =>
          p.pledge_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : pledges

  const totalOutstanding = filteredPledges.reduce((sum, p) => sum + (p.outstanding_amount || 0), 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/projects/donors/dashboard"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Donor dashboard
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HandIcon className="h-5 w-5" />
            Pledges
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Select a donor to view their pledges and outstanding amounts. Use Donor inquiry for a full donor profile.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="min-w-[220px]">
              <Select value={selectedDonorId} onValueChange={setSelectedDonorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select donor" />
                </SelectTrigger>
                <SelectContent>
                  {donors.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedDonorId && (
              <Link
                href={`/projects/donors/inquiry?id=${selectedDonorId}`}
                className="text-sm text-primary hover:underline"
              >
                View donor profile →
              </Link>
            )}
          </div>

          {selectedDonorId && (
            <>
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pledges..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {filteredPledges.length > 0 && (
                <div className="p-4 rounded-lg bg-muted/50 text-sm">
                  <span className="text-muted-foreground">Total outstanding: </span>
                  <span className="font-semibold">{formatCurrency(totalOutstanding)}</span>
                </div>
              )}

              {isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : filteredPledges.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No pledges found for this donor.
                </p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 uppercase tracking-wider">
                        <th className="text-left p-3 font-medium">Pledge</th>
                        <th className="text-left p-3 font-medium">Date</th>
                        <th className="text-right p-3 font-medium">Pledged</th>
                        <th className="text-right p-3 font-medium">Received</th>
                        <th className="text-right p-3 font-medium">Outstanding</th>
                        <th className="text-left p-3 font-medium">Expected</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Grant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPledges.map((p) => (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="p-3">
                            <span className="font-medium">{p.pledge_number}</span>
                            {p.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]" title={p.description}>
                                {p.description}
                              </p>
                            )}
                          </td>
                          <td className="p-3">{formatDate(p.pledge_date)}</td>
                          <td className="p-3 text-right">{formatCurrency(p.pledged_amount, p.currency)}</td>
                          <td className="p-3 text-right">{formatCurrency(p.received_amount, p.currency)}</td>
                          <td className="p-3 text-right font-medium">{formatCurrency(p.outstanding_amount, p.currency)}</td>
                          <td className="p-3 text-muted-foreground">
                            {p.expected_fulfillment_date ? formatDate(p.expected_fulfillment_date) : '—'}
                          </td>
                          <td className="p-3">
                            <Badge variant="secondary" className={pledgeStatusColors[p.status] || 'bg-gray-100 text-gray-700'}>
                              {p.status.replace(/_/g, ' ')}
                            </Badge>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {p.grant ? `${p.grant.grant_code} – ${p.grant.grant_name}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {!selectedDonorId && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Select a donor above to view their pledges.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
