'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, DollarSign, Search } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { getDonors, getDonorDonations, getDonationStatusColor, getDonationTypeLabel, Donor } from '@/lib/api/donors'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function DonationsPage() {
  const searchParams = useSearchParams()
  const donorIdFromUrl = searchParams.get('donor_id')
  const [selectedDonorId, setSelectedDonorId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (donorIdFromUrl && donorIdFromUrl !== selectedDonorId) setSelectedDonorId(donorIdFromUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when URL param changes
  }, [donorIdFromUrl])

  const { data: donorsData } = useQuery({
    queryKey: ['donors-donations'],
    queryFn: () => getDonors({ per_page: 200, is_active: true }),
  })

  const { data: donationsData, isLoading } = useQuery({
    queryKey: ['donor-donations', selectedDonorId],
    queryFn: () => getDonorDonations(parseInt(selectedDonorId, 10), { per_page: 50 }),
    enabled: !!selectedDonorId,
  })

  const donors: Donor[] = donorsData?.data || []
  const donations = (donationsData?.data ?? []) as {
    id: number
    donation_number: string
    donation_date: string
    amount: number
    base_currency_amount?: number
    currency: string
    status: string
    donation_type?: string
    description: string
    grant?: { grant_code: string; grant_name: string }
  }[]

  const filteredDonations = searchQuery.trim()
    ? donations.filter(
        (d) =>
          d.donation_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : donations

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
            <DollarSign className="h-5 w-5" />
            Donations
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Select a donor to view and manage their donations. Use Donor inquiry for a full donor profile.
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
                  placeholder="Search donations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : filteredDonations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No donations found. Donations are recorded per donor; use Donor inquiry to see the full donor profile.
                </p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 uppercase tracking-wider">
                        <th className="text-left p-3 font-medium">Donation</th>
                        <th className="text-left p-3 font-medium">Date</th>
                        <th className="text-left p-3 font-medium">Type</th>
                        <th className="text-right p-3 font-medium">Amount</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Grant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDonations.map((d) => (
                        <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="p-3">
                            <span className="font-medium">{d.donation_number}</span>
                            {d.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]" title={d.description}>
                                {d.description}
                              </p>
                            )}
                          </td>
                          <td className="p-3">{formatDate(d.donation_date)}</td>
                          <td className="p-3">{getDonationTypeLabel(d.donation_type || 'cash')}</td>
                          <td className="p-3 text-right font-medium">
                            {formatCurrency(d.base_currency_amount ?? d.amount, d.currency)}
                          </td>
                          <td className="p-3">
                            <Badge variant="secondary" className={getDonationStatusColor(d.status)}>
                              {d.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {d.grant ? `${d.grant.grant_code} – ${d.grant.grant_name}` : '—'}
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
              Select a donor above to view their donations.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
