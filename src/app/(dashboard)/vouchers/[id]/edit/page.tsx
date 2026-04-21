'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, FileText, Loader2, Trash2 } from 'lucide-react'
import { VoucherPendingApprovalPanel } from '@/components/vouchers/VoucherPendingApprovalPanel'
import { VoucherApprovalWorkflow } from '@/components/vouchers/VoucherApprovalWorkflow'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { getVoucher, updateVoucher, deleteVoucher, VoucherFormData } from '@/lib/api/vouchers'
import { getOffices } from '@/lib/api/offices'
import { Voucher } from '@/types'

export default function EditVoucherPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id ? String(params.id) : ''
  const voucherId = id ? parseInt(id, 10) : NaN
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)

  const { data: voucherData, isLoading: voucherLoading, error: voucherError } = useQuery({
    queryKey: ['voucher', voucherId],
    queryFn: () => getVoucher(voucherId),
    enabled: Number.isInteger(voucherId) && voucherId > 0,
  })
  const voucher = voucherData?.data as Voucher | undefined

  const { data: officesData } = useQuery({
    queryKey: ['offices-list'],
    queryFn: () => getOffices({ is_active: true }),
  })
  const offices = Array.isArray(officesData) ? officesData : []

  const updateMutation = useMutation({
    mutationFn: ({ id: vid, data }: { id: number; data: Partial<VoucherFormData> }) =>
      updateVoucher(vid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vouchers'] })
      queryClient.invalidateQueries({ queryKey: ['voucher', voucherId] })
      toast({
        title: 'Voucher updated',
        description: 'Changes have been saved.',
      })
      router.push('/vouchers')
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update transaction voucher',
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteVoucher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vouchers'] })
      toast({ title: 'Transaction voucher deleted', description: 'The voucher has been removed.' })
      router.push('/vouchers')
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete transaction voucher',
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = async (data: VoucherFormData) => {
    if (Number.isInteger(voucherId)) await updateMutation.mutateAsync({ id: voucherId, data })
  }

  const handleDelete = () => {
    if (Number.isInteger(voucherId)) deleteMutation.mutate(voucherId)
    setDeleteDialogOpen(false)
  }

  if (!Number.isInteger(voucherId) || voucherId < 1) {
    return (
      <div className="space-y-6">
        <p className="text-destructive">Invalid voucher ID.</p>
        <Button asChild><Link href="/vouchers">Back to vouchers</Link></Button>
      </div>
    )
  }

  if (voucherLoading || !voucher) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        {voucherLoading ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : voucherError ? (
          <div className="text-center">
            <p className="text-destructive mb-2">Voucher not found or you don&apos;t have access.</p>
            <Button asChild><Link href="/vouchers">Back to vouchers</Link></Button>
          </div>
        ) : null}
      </div>
    )
  }

  if (voucher.status === 'pending_approval') {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border shadow-sm">
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-3 py-2">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" asChild className="h-7 w-7 shrink-0">
                  <Link href="/vouchers" aria-label="Back to vouchers">
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </Link>
                </Button>
                <h1 className="text-base font-semibold tracking-tight">Review voucher</h1>
                <span className="font-mono text-xs text-muted-foreground">{voucher.voucher_number}</span>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
              <VoucherPendingApprovalPanel voucher={voucher} onCompleted={() => router.push('/vouchers')} />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (voucher.status !== 'draft') {
    const statusLabel = voucher.status.replace(/_/g, ' ')
    const showWorkflow =
      (voucher.required_approval_level ?? 0) > 0 &&
      ['posted', 'approved', 'rejected', 'cancelled', 'submitted'].includes(voucher.status)

    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border shadow-sm">
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-3 py-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <Button variant="ghost" size="icon" asChild className="h-7 w-7 shrink-0">
                  <Link href="/vouchers" aria-label="Back to vouchers">
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </Link>
                </Button>
                <h1 className="text-base font-semibold tracking-tight">View transaction voucher</h1>
                <span className="font-mono text-xs text-muted-foreground">{voucher.voucher_number}</span>
                <span className="rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                  {statusLabel}
                </span>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                <Link href="/vouchers">
                  <FileText className="mr-1 h-3.5 w-3.5" />
                  Voucher list
                </Link>
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <VoucherFormDialog
                open
                embedded
                readOnly
                voucher={voucher}
                offices={offices as { id: number; name: string; code: string }[]}
                onSubmit={async () => {}}
                isLoading={false}
                onCancel={() => router.push('/vouchers')}
              />
            </div>
            {showWorkflow ? (
              <div className="shrink-0 border-t border-border bg-muted/20 px-3 py-4 md:px-6">
                <h2 className="mb-3 text-sm font-semibold text-foreground">Approval workflow</h2>
                <VoucherApprovalWorkflow voucher={voucher} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border shadow-sm">
        <CardContent className="p-0 flex flex-col flex-1 min-h-0">
          {/* Integrated: toolbar + form in one page */}
          <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-border px-3 py-1.5">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" asChild className="h-7 w-7 shrink-0">
                <Link href="/vouchers" aria-label="Back to vouchers">
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <h1 className="text-base font-semibold tracking-tight">Edit transaction voucher</h1>
              <span className="text-xs text-muted-foreground font-mono">{voucher.voucher_number}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                <Link href="/vouchers">
                  <FileText className="h-3.5 w-3.5 mr-1" />
                  Voucher list
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={updateMutation.isPending}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete
              </Button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <VoucherFormDialog
              open
              embedded
              voucher={voucher}
              offices={offices as { id: number; name: string; code: string }[]}
              onSubmit={handleSubmit}
              isLoading={updateMutation.isPending}
              onSuccess={() => router.push('/vouchers')}
              onCancel={() => router.push('/vouchers')}
            />
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (open !== deleteDialogOpen) setDeleteDialogOpen(open) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete transaction voucher</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete voucher <strong>{voucher.voucher_number}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
