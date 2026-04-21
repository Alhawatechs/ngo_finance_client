'use client'

import React, { useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Printer, FileDown, FileSpreadsheet } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { createVoucher, VoucherFormData } from '@/lib/api/vouchers'
import { getApiErrorMessage } from '@/lib/api/errors'
import type { JournalVoucherPrefill } from '@/lib/api/journals'
import { getOffices } from '@/lib/api/offices'

const VoucherFormDialog = dynamic(
  () => import('@/components/finance/VoucherFormDialog').then((m) => ({ default: m.VoucherFormDialog })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[280px] flex-1 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-6 w-6 shrink-0 animate-spin" aria-hidden />
        <span>Loading voucher form…</span>
      </div>
    ),
  }
)

export interface NewVoucherFullscreenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Optional line under the title (e.g. journal book name). */
  contextSubtitle?: string
  /** When opening from a project journal book, pre-select project, province, office and drive next voucher #. */
  journalPrefill?: JournalVoucherPrefill | null
}

/** Full-width dialog: one surface (toolbar + embedded form), no nested card. */
export function NewVoucherFullscreenDialog({
  open,
  onOpenChange,
  contextSubtitle,
  journalPrefill = null,
}: NewVoucherFullscreenDialogProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  /** Warm the heavy voucher form chunk as soon as the dialog opens (parallel with offices fetch). */
  useEffect(() => {
    if (!open) return
    void import('@/components/finance/VoucherFormDialog')
  }, [open])

  const { data: officesData, isLoading: officesLoading } = useQuery({
    queryKey: ['offices-list'],
    queryFn: () => getOffices({ is_active: true }),
    enabled: open,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: (prev) => prev,
  })
  const offices = Array.isArray(officesData) ? officesData : []

  /** Stable reference so VoucherFormDialog reset effect does not thrash on parent re-renders. */
  const journalPrefillStable = useMemo(
    () =>
      journalPrefill
        ? {
            journal_id: journalPrefill.journal_id,
            project_id: journalPrefill.project_id,
            province_code: journalPrefill.province_code,
            office_id: journalPrefill.office_id,
            location_code: journalPrefill.location_code,
            fund_id: journalPrefill.fund_id,
            currency: journalPrefill.currency,
            exchange_rate: journalPrefill.exchange_rate,
            voucher_type: journalPrefill.voucher_type,
            payment_method: journalPrefill.payment_method,
            default_payee_name: journalPrefill.default_payee_name,
            voucher_description_template: journalPrefill.voucher_description_template,
          }
        : null,
    [
      journalPrefill?.journal_id,
      journalPrefill?.project_id,
      journalPrefill?.office_id,
      journalPrefill?.province_code,
      journalPrefill?.location_code,
      journalPrefill?.fund_id,
      journalPrefill?.currency,
      journalPrefill?.exchange_rate,
      journalPrefill?.voucher_type,
      journalPrefill?.payment_method,
      journalPrefill?.default_payee_name,
      journalPrefill?.voucher_description_template,
    ]
  )

  const createMutation = useMutation({
    mutationFn: createVoucher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vouchers'] })
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
      queryClient.invalidateQueries({ queryKey: ['project-ledger'] })
      queryClient.invalidateQueries({ queryKey: ['journals'] })
    },
    onError: (error: unknown) => {
      const msg = getApiErrorMessage(error, 'Could not save the voucher. Please try again or contact support.')
      if (msg.toLowerCase().includes('already used') && msg.toLowerCase().includes('voucher')) {
        return
      }
      toast({
        title: 'Could not save voucher',
        description: msg,
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = async (data: VoucherFormData, saveAndNew?: boolean) => {
    await createMutation.mutateAsync(data)
    if (saveAndNew) {
      toast({
        title: 'Transaction voucher saved',
        description: 'Saved. You can enter another voucher.',
      })
    } else {
      toast({
        title: 'Transaction voucher saved',
        description: 'Saved. Submit from the voucher list when ready.',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex max-h-[min(92vh,100dvh)] w-full max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl sm:rounded-none',
          'translate-x-[-50%] translate-y-[-50%]'
        )}
        aria-describedby="new-voucher-dialog-desc"
      >
        <DialogTitle className="sr-only">New Voucher</DialogTitle>
        <DialogDescription id="new-voucher-dialog-desc" className="sr-only">
          Form to create a new transaction voucher. Same layout as General Ledger → Voucher list → New voucher.
        </DialogDescription>

        {open && officesLoading ? (
          <div className="flex min-h-[min(50vh,24rem)] flex-1 flex-col items-center justify-center gap-2 px-4 text-sm text-muted-foreground">
            <Loader2 className="h-8 w-8 shrink-0 animate-spin" aria-hidden />
            <span>Loading…</span>
          </div>
        ) : open ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex flex-shrink-0 flex-col gap-0.5 border-b border-border bg-muted/20 px-3 py-2 pr-10 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:pr-12 print:hidden">
              <div className="min-w-0">
                <h1 className="text-base font-semibold tracking-tight">New Voucher</h1>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Enter header details, then allocation lines. Save when balanced.
                  {contextSubtitle ? (
                    <>
                      {' '}
                      <span className="text-muted-foreground/90">· {contextSubtitle}</span>
                    </>
                  ) : null}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs" type="button" onClick={() => window.print()}>
                  <Printer className="mr-1 h-3.5 w-3.5" aria-hidden />
                  Print
                </Button>
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs" type="button" onClick={() => window.print()}>
                  <Printer className="mr-1 h-3.5 w-3.5" aria-hidden />
                  Preview
                </Button>
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs" type="button" onClick={() => window.print()}>
                  <FileDown className="mr-1 h-3.5 w-3.5" aria-hidden />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  type="button"
                  onClick={() =>
                    toast({
                      title: 'Export Excel',
                      description: 'Save the voucher first, then export from the voucher list.',
                    })
                  }
                >
                  <FileSpreadsheet className="mr-1 h-3.5 w-3.5" aria-hidden />
                  Excel
                </Button>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <VoucherFormDialog
                key={[
                  'jv',
                  journalPrefill?.journal_id ?? 'nj',
                  journalPrefill?.project_id ?? 'np',
                  journalPrefill?.office_id ?? 'no',
                  journalPrefill?.province_code ?? 'nv',
                  journalPrefill?.location_code ?? 'nl',
                  journalPrefill?.fund_id ?? 'nf',
                  journalPrefill?.currency ?? 'nc',
                  journalPrefill?.exchange_rate ?? 'ne',
                  journalPrefill?.voucher_type ?? 'nt',
                  journalPrefill?.payment_method ?? 'nm',
                  journalPrefill?.default_payee_name ?? 'npay',
                  journalPrefill?.voucher_description_template ?? 'nd',
                ].join('-')}
                open
                embedded
                voucher={null}
                journalPrefill={journalPrefillStable}
                offices={offices as { id: number; name: string; code: string }[]}
                onSubmit={handleSubmit}
                isLoading={createMutation.isPending}
                onSuccess={() => onOpenChange(false)}
                onCancel={() => onOpenChange(false)}
              />
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
