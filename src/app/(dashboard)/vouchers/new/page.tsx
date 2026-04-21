'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Printer, FileDown, FileSpreadsheet } from 'lucide-react'

/** Code-split heavy voucher form — faster first paint on /vouchers/new */
const VoucherFormDialog = dynamic(
  () => import('@/components/finance/VoucherFormDialog').then((m) => ({ default: m.VoucherFormDialog })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 min-h-[280px] items-center justify-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-6 w-6 animate-spin shrink-0" aria-hidden />
        <span>Loading voucher form…</span>
      </div>
    ),
  }
)
import { useToast } from '@/components/ui/use-toast'
import { createVoucher, VoucherFormData } from '@/lib/api/vouchers'
import { getApiErrorMessage } from '@/lib/api/errors'
import { getOffices } from '@/lib/api/offices'

export default function NewVoucherPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: officesData, isLoading: officesLoading } = useQuery({
    queryKey: ['offices-list'],
    queryFn: () => getOffices({ is_active: true }),
  })
  const offices = Array.isArray(officesData) ? officesData : []

  const createMutation = useMutation({
    mutationFn: createVoucher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vouchers'] })
    },
    onError: (error: unknown) => {
      toast({
        title: 'Could not save voucher',
        description: getApiErrorMessage(error, 'Failed to create transaction voucher'),
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = async (data: VoucherFormData, saveAndNew?: boolean) => {
    await createMutation.mutateAsync(data)
    if (saveAndNew) {
      toast({ title: 'Transaction voucher saved', description: 'Saved. You can enter another voucher.' })
    } else {
      toast({ title: 'Transaction voucher saved', description: 'Saved. Submit from the voucher list when ready.' })
      router.push('/vouchers')
    }
  }

  if (officesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="-mx-6 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-3 sm:px-4">
      <Card className="flex-1 min-h-0 overflow-hidden rounded-none border shadow-sm flex flex-col bg-card/95 backdrop-blur-sm">
        <CardContent className="p-0 flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Toolbar — compact */}
          <div className="flex flex-shrink-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between border-b border-border bg-muted/20 px-3 py-2 sm:px-4 print:hidden">
            <div>
              <h1 className="text-base font-semibold tracking-tight">New Voucher</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">Enter header details, then allocation lines. Save when balanced.</p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5 mr-1" />
                Print
              </Button>
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5 mr-1" />
                Preview
              </Button>
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => window.print()}>
                <FileDown className="h-3.5 w-3.5 mr-1" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => toast({ title: 'Export Excel', description: 'Save the voucher first, then export from the voucher list.' })}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />
                Excel
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <VoucherFormDialog
            open
            embedded
            voucher={null}
            offices={offices as { id: number; name: string; code: string }[]}
            onSubmit={handleSubmit}
            isLoading={createMutation.isPending}
            onSuccess={() => router.push('/vouchers')}
            onCancel={() => router.push('/vouchers')}
          />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
