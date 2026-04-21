'use client'

import { useQuery } from '@tanstack/react-query'
import { getApprovalCenterCounts, type ApprovalCenterCounts } from '@/lib/api/approval-center'

export function useApprovalCenterCounts() {
  return useQuery<ApprovalCenterCounts>({
    queryKey: ['approval-center', 'counts'],
    queryFn: async () => {
      const res = await getApprovalCenterCounts()
      return res.data
    },
    /** Sidebar badge: avoid refetch on every tab focus (global default); keep data fresh enough for approvals. */
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
