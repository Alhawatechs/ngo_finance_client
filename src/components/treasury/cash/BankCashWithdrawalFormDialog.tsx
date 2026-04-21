'use client'

import React, { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/ui/date-picker'
import { cn, formatCurrency } from '@/lib/utils'
import type { CashAccount } from '@/lib/api/cash'
import { useOrganizationStore } from '@/stores/organizationStore'

export interface WithdrawalFormExtra {
  bankName: string
  chequeNumber: string
  preparedBy: string
  checkedBy: string
  approvedBy: string
  cashTransfer: string
  cashCancelled: string
}

export const initialWithdrawalExtra = (): WithdrawalFormExtra => ({
  bankName: '',
  chequeNumber: '',
  preparedBy: '',
  checkedBy: '',
  approvedBy: '',
  cashTransfer: '',
  cashCancelled: '',
})

export function buildWithdrawalDescription(purpose: string, extra: WithdrawalFormExtra): string {
  let d = purpose.trim()
  const sigParts: string[] = []
  if (extra.preparedBy.trim()) sigParts.push(`Prepared by: ${extra.preparedBy.trim()}`)
  if (extra.checkedBy.trim()) sigParts.push(`Checked by: ${extra.checkedBy.trim()}`)
  if (extra.approvedBy.trim()) sigParts.push(`Approved by: ${extra.approvedBy.trim()}`)
  if (sigParts.length) d += `\n\n${sigParts.join(' | ')}`
  const cp: string[] = []
  if (extra.cashTransfer.trim()) cp.push(`Cash transfer: ${extra.cashTransfer.trim()}`)
  if (extra.cashCancelled.trim()) cp.push(`Cash cancelled: ${extra.cashCancelled.trim()}`)
  if (cp.length) d += `\n\nCash processing — ${cp.join('; ')}`
  return d
}

export function BankCashWithdrawalFormDialog({
  open,
  onOpenChange,
  selected,
  transactionDate,
  onTransactionDateChange,
  amount,
  onAmountChange,
  purpose,
  onPurposeChange,
  extra,
  onExtraChange,
  onSubmit,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  selected: CashAccount | undefined
  transactionDate: string
  onTransactionDateChange: (v: string) => void
  amount: number
  onAmountChange: (v: number) => void
  purpose: string
  onPurposeChange: (v: string) => void
  extra: WithdrawalFormExtra
  onExtraChange: (patch: Partial<WithdrawalFormExtra>) => void
  onSubmit: () => void
  isPending: boolean
}) {
  const organization = useOrganizationStore((s) => s.organization)
  const branding = useOrganizationStore((s) => s.branding)
  const orgName = organization?.name ?? 'Organization'
  const orgShort = organization?.short_name ?? branding?.short_name ?? ''

  const balanceBefore = Number(selected?.current_balance ?? 0)
  const amt = Number(amount) || 0
  const remaining = useMemo(() => Math.round((balanceBefore - amt) * 100) / 100, [balanceBefore, amt])
  const exceedsBalance = amt > balanceBefore
  const currency = selected?.currency ?? '—'

  const accountNumber =
    selected?.gl_account?.account_code != null
      ? `${selected.code} · ${selected.gl_account.account_code}`
      : selected?.code ?? '—'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex max-h-[92vh] max-w-4xl flex-col gap-0 overflow-hidden p-0',
          'border-border/90 shadow-xl sm:rounded-md'
        )}
      >
        <div className="border-b border-border bg-muted/20 px-5 py-4 md:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              {branding?.logo_url ? (
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-sm border border-border bg-white">
                  <img
                    src={branding.logo_url}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-border bg-primary/10 text-xs font-bold text-primary">
                  {orgShort.slice(0, 3).toUpperCase() || 'ORG'}
                </div>
              )}
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{orgName}</p>
                {orgShort ? (
                  <p className="text-xs text-muted-foreground">{orgShort}</p>
                ) : null}
              </div>
            </div>
            <DialogHeader className="sm:pt-0 sm:text-right">
              <DialogTitle className="text-base font-bold uppercase tracking-tight text-foreground md:text-lg">
                Bank cash withdrawal form
              </DialogTitle>
            </DialogHeader>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 md:px-6">
          <div className="space-y-4">
            <div className="grid gap-0 rounded-md border border-border text-sm md:grid-cols-2">
              <FormRow label="Date">
                <DatePicker value={transactionDate} onChange={onTransactionDateChange} />
              </FormRow>
              <FormRow label="Bank name">
                <Input
                  value={extra.bankName}
                  onChange={(e) => onExtraChange({ bankName: e.target.value })}
                  className="h-9 border-0 shadow-none focus-visible:ring-1"
                  placeholder=""
                />
              </FormRow>
              <FormRow label="Account name">
                <div className="flex min-h-9 items-center bg-muted/30 px-3 text-sm font-medium text-foreground">
                  {selected?.name ?? '—'}
                </div>
              </FormRow>
              <FormRow label="Account number">
                <div className="flex min-h-9 items-center bg-muted/30 px-3 font-mono text-xs text-foreground">
                  {accountNumber}
                </div>
              </FormRow>
              <FormRow label="Currency">
                <div className="flex min-h-9 items-center bg-muted/30 px-3 text-sm font-medium">{currency}</div>
              </FormRow>
              <FormRow label="Cheque number">
                <Input
                  value={extra.chequeNumber}
                  onChange={(e) => onExtraChange({ chequeNumber: e.target.value })}
                  className="h-9 border-0 shadow-none focus-visible:ring-1"
                  placeholder=""
                />
              </FormRow>
            </div>

            <div className="rounded-md border border-border">
              <div className="grid gap-0 md:grid-cols-3">
                <CalcCell
                  label="Balance before withdrawal"
                  value={formatCurrency(balanceBefore)}
                  sub={currency}
                />
                <CalcCell
                  label="Amount of this withdrawal"
                  highlight
                  value={
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      className="h-9 w-full min-w-0 border-0 bg-transparent text-right font-semibold tabular-nums shadow-none focus-visible:ring-1"
                      value={amt || ''}
                      onChange={(e) => onAmountChange(parseFloat(e.target.value) || 0)}
                    />
                  }
                />
                <CalcCell
                  label="Remaining balance after transaction"
                  value={
                    <span className={cn('font-semibold tabular-nums', exceedsBalance && 'text-destructive')}>
                      {formatCurrency(remaining)}
                    </span>
                  }
                  sub={currency}
                  warn={exceedsBalance}
                />
              </div>
              {exceedsBalance ? (
                <p className="border-t border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  Withdrawal amount cannot exceed the current balance.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-foreground">
                Purpose of cash withdrawal
              </Label>
              <Textarea
                rows={3}
                value={purpose}
                onChange={(e) => onPurposeChange(e.target.value)}
                className="min-h-[5rem] resize-y rounded-md border-border text-sm"
                placeholder=""
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Authorization</p>
              <div className="grid gap-3 md:grid-cols-3">
                <SignBlock
                  title="Prepared by"
                  subtitle="Cashier / Finance Officer"
                  value={extra.preparedBy}
                  onChange={(v) => onExtraChange({ preparedBy: v })}
                />
                <SignBlock
                  title="Checked by"
                  subtitle="Finance Manager / Officer"
                  value={extra.checkedBy}
                  onChange={(v) => onExtraChange({ checkedBy: v })}
                />
                <SignBlock
                  title="Approved by"
                  subtitle="Director General / Project Manager"
                  value={extra.approvedBy}
                  onChange={(v) => onExtraChange({ approvedBy: v })}
                />
              </div>
            </div>

            <div className="rounded-md border border-border bg-muted/15 p-3">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground">Cash processing status</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Date</Label>
                  <div className="rounded border border-border/80 bg-background px-2 py-1.5 text-sm">{transactionDate}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Cash withdrawn</Label>
                  <div className="rounded border border-border/80 bg-background px-2 py-1.5 text-right font-medium tabular-nums">
                    {formatCurrency(amt)}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Cash transfer</Label>
                  <Input
                    className="h-9"
                    value={extra.cashTransfer}
                    onChange={(e) => onExtraChange({ cashTransfer: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Cash cancelled</Label>
                  <Input
                    className="h-9"
                    value={extra.cashCancelled}
                    onChange={(e) => onExtraChange({ cashCancelled: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-3 border-t border-dashed border-border pt-3">
                <p className="text-[11px] text-muted-foreground">Signature and stamp (Cashier)</p>
                <div className="mt-2 h-14 rounded border border-dashed border-border/90 bg-background" />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border bg-muted/10 px-5 py-3 md:px-6">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              isPending ||
              !selected ||
              !purpose.trim() ||
              amt <= 0 ||
              exceedsBalance
            }
            onClick={onSubmit}
          >
            {isPending ? 'Saving…' : 'Record withdrawal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col border-b border-border sm:flex-row sm:items-stretch sm:border-b-0 [&:nth-child(odd)]:border-r [&:nth-child(odd)]:border-border">
      <div className="flex w-full shrink-0 items-center border-b border-border bg-muted/30 px-3 py-2 text-xs font-medium text-foreground sm:w-40 sm:border-b-0 md:w-44">
        {label}
      </div>
      <div className="min-w-0 flex-1 bg-background">{children}</div>
    </div>
  )
}

function CalcCell({
  label,
  value,
  sub,
  highlight,
  warn,
}: {
  label: string
  value: React.ReactNode
  sub?: string
  highlight?: boolean
  warn?: boolean
}) {
  return (
    <div
      className={cn(
        'border-b border-border p-3 md:border-b-0 md:border-r md:last:border-r-0',
        highlight && 'bg-primary/5',
        warn && 'bg-destructive/5'
      )}
    >
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className={cn('flex gap-1', highlight ? 'w-full items-stretch' : 'items-baseline justify-end')}>
        <div
          className={cn(
            'min-w-0 text-base tabular-nums text-foreground',
            highlight ? 'w-full' : 'flex-1 text-right'
          )}
        >
          {value}
        </div>
        {sub ? <span className="shrink-0 text-xs text-muted-foreground">{sub}</span> : null}
      </div>
    </div>
  )
}

function SignBlock({
  title,
  subtitle,
  value,
  onChange,
}: {
  title: string
  subtitle: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs font-semibold text-foreground">{title}</p>
      <p className="text-[10px] text-muted-foreground italic">{subtitle}</p>
      <Input
        className="mt-2 h-8 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder=""
      />
      <div className="mt-3 border-t border-dashed border-border pt-2">
        <div className="h-10 rounded-sm bg-muted/20" />
      </div>
    </div>
  )
}
