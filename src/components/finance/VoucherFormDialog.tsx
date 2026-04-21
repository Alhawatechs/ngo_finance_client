'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useForm, useFieldArray, useWatch, type FieldErrors, type SubmitErrorHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertCircle, CheckCircle, Sparkles, MoreVertical, Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn, formatCurrency, formatCurrencyAmountOnly, getCurrencyIsoCode, amountToWords, formatAmountCell, parseAmountCell } from '@/lib/utils'
import { displayCurrencyForAccount } from '@/lib/account-display-currency'
import { CurrencySelect } from '@/components/ui/currency-select'
import { Voucher } from '@/types'
import { VoucherFormData, VoucherLineInput, validateVoucher, getCodingBlockOptions, getNextVoucherNumberPreview, checkVoucherNumberAvailable } from '@/lib/api/vouchers'
import { getApiErrorMessage } from '@/lib/api/errors'
import { getAccountsTree, flattenAccountsTree } from '@/lib/api/chart-of-accounts'
import type { JournalVoucherPrefill } from '@/lib/api/journals'
import { getFiscalYears, type FiscalYear } from '@/lib/api/fiscal'
import { matchProvinceCodeFromProject } from '@/lib/match-province-from-project'
import { getProjects } from '@/lib/api/projects'
import { getCostCenters, type CostCenter } from '@/lib/api/cost-centers'
import { useToast } from '@/components/ui/use-toast'
import { ChartOfAccount } from '@/types'
import { useOrganizationStore } from '@/stores/organizationStore'
import { useHasPermission } from '@/stores/authStore'
import { VoucherPostingAccountCombo } from '@/components/finance/VoucherPostingAccountCombo'
import { VoucherCostCenterCombo } from '@/components/finance/VoucherCostCenterCombo'

/** Default allocation rows — fills typical table area; paste or append for more. */
const DEFAULT_VOUCHER_LINES = 67

/** Prefer head office when auto-selecting office; otherwise first listed office. */
function getMainOfficeId(offices: Array<{ id: number; is_head_office?: boolean }>): number {
  const head = offices.find((o) => o.is_head_office === true)
  if (head) return head.id
  return offices[0]?.id ?? 0
}

function voucherTypeFromJournalPrefill(v: string | null | undefined): 'payment' | 'receipt' | 'journal' | 'contra' {
  const t = v?.trim().toLowerCase()
  if (t === 'receipt' || t === 'journal' || t === 'contra' || t === 'payment') return t
  return 'payment'
}

function paymentMethodFromJournalPrefill(v: string | null | undefined): 'cash' | 'check' | 'bank_transfer' | 'mobile_money' | 'msp' {
  const t = v?.trim().toLowerCase()
  if (t === 'check' || t === 'bank_transfer' || t === 'mobile_money' || t === 'msp' || t === 'cash') return t
  return 'cash'
}

/** Select value must match SelectItem: `${officeId}_${projectId}` when an office applies, else project id only. */
function projectRowSelectValue(
  p: { id: number; office_id?: number | null },
  selectedProjectId: number | null | undefined,
  officeIdFromForm: number | null | undefined
): string {
  const useFormOffice =
    selectedProjectId != null &&
    p.id === selectedProjectId &&
    officeIdFromForm != null &&
    officeIdFromForm > 0
      ? officeIdFromForm
      : null
  const fromProject = p.office_id != null && p.office_id > 0 ? p.office_id : null
  const effective = useFormOffice ?? fromProject
  return effective != null && effective > 0 ? `${effective}_${p.id}` : String(p.id)
}

/** Default column width %: ACCOUNT, PROJECT, DESCRIPTION, COST CENTER, AMOUNT, EXR, BASE EQ. Sum = 96. (Account column widened for typeahead.) */
const DEFAULT_COL_WIDTHS = [17, 9, 31, 14, 10, 6, 9] as const
/** Foreign transaction: slightly wider EXR + FOREIGN columns for readability. Sum = 96. */
const DEFAULT_COL_WIDTHS_FOREIGN = [15, 8, 28, 13, 10, 7, 15] as const
/** Single-currency layout (no EXR / base columns). Sum = 96. */
const DEFAULT_COL_WIDTHS_FIVE = [19, 10, 39, 16, 12] as const

function readSavedColWidths(): number[] {
  if (typeof window === 'undefined') return [...DEFAULT_COL_WIDTHS]
  try {
    const raw = localStorage.getItem('erp-voucher-table-col-widths')
    if (!raw) return [...DEFAULT_COL_WIDTHS]
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return [...DEFAULT_COL_WIDTHS]
    const nums = parsed.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n >= 5)
    /** Legacy 5-col saves: use new 7-col defaults (avoids invalid % after adding EXR + base columns). */
    if (nums.length === 5) {
      const sum = nums.reduce((a, b) => a + b, 0)
      if (Math.abs(sum - 96) > 1) return [...DEFAULT_COL_WIDTHS]
      return [...DEFAULT_COL_WIDTHS]
    }
    if (nums.length !== 7) return [...DEFAULT_COL_WIDTHS]
    const sum = nums.reduce((a, b) => a + b, 0)
    if (Math.abs(sum - 96) > 1) return [...DEFAULT_COL_WIDTHS]
    return nums
  } catch {
    return [...DEFAULT_COL_WIDTHS]
  }
}

/** Normalized ISO for GL account (validation + EXR column). */
function getAccountCurrencyIsoForValidation(accountId: number, postingAccounts: ChartOfAccount[], fallbackCurrency: string): string {
  const acc = postingAccounts.find((a) => a.id === accountId) as ChartOfAccount & { currency_code?: string }
  const code = acc?.currency_code?.trim()
  return getCurrencyIsoCode(code || fallbackCurrency)
}

/** Flatten cost center tree (project classes + sub-classes) for dropdown. */
function flattenCostCenterTree(nodes: CostCenter[] | undefined, depth = 0): { code: string; name: string; depth: number }[] {
  if (!nodes?.length) return []
  const out: { code: string; name: string; depth: number }[] = []
  for (const n of nodes) {
    out.push({ code: n.code, name: n.name, depth })
    out.push(...flattenCostCenterTree(n.children, depth + 1))
  }
  return out
}

function getDefaultVoucherLines(): Array<{ account_id: number; debit_amount: number; credit_amount: number; description: string; cost_center: string; project_account_code: string; line_type: 'debit' | 'credit' }> {
  const lines: Array<{ account_id: number; debit_amount: number; credit_amount: number; description: string; cost_center: string; project_account_code: string; line_type: 'debit' | 'credit' }> = []
  for (let i = 0; i < DEFAULT_VOUCHER_LINES; i++) {
    lines.push({
      account_id: 0,
      debit_amount: 0,
      credit_amount: 0,
      description: '',
      cost_center: '',
      project_account_code: '',
      line_type: 'credit',
    })
  }
  return lines
}

const lineSchema = z.object({
  account_id: z.number().min(0),
  fund_id: z.number().nullable().optional(),
  project_id: z.number().nullable().optional(),
  description: z.string().optional(),
  /** Allow negative amounts (e.g. tax deductions, reversals) in the Amount column. */
  debit_amount: z.number().finite(),
  credit_amount: z.number().finite(),
  cost_center: z.string().optional(),
  project_account_code: z.string().optional(),
  /** UI-only: QuickBooks-style one debit / many credits. Not sent to API. */
  line_type: z.enum(['debit', 'credit']).optional(),
})

/** True if line has any non-zero debit or credit (absolute). */
function lineHasNonZeroAmount(line: { debit_amount?: number; credit_amount?: number }): boolean {
  const d = Math.abs(line.debit_amount ?? 0)
  const c = Math.abs(line.credit_amount ?? 0)
  return d > 0.000001 || c > 0.000001
}

/** Amount entered but no GL account — cannot save until fixed. */
function hasOrphanLineAmounts(
  lines: Array<{ account_id?: number; debit_amount?: number; credit_amount?: number }>
): boolean {
  return lines.some((line) => (line.account_id ?? 0) <= 0 && lineHasNonZeroAmount(line))
}

function countOrphanLineAmounts(
  lines: Array<{ account_id?: number; debit_amount?: number; credit_amount?: number }>
): number {
  return lines.filter((line) => (line.account_id ?? 0) <= 0 && lineHasNonZeroAmount(line)).length
}

/** Calendar compare for YYYY-MM-DD (no TZ drift). */
function fiscalYearContainsDate(fy: FiscalYear, dateStr: string): boolean {
  const d = dateStr.trim().split('T')[0]
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false
  return d >= fy.start_date.split('T')[0] && d <= fy.end_date.split('T')[0]
}

function findFiscalYearForDate(years: FiscalYear[], dateStr: string): FiscalYear | null {
  if (!dateStr?.trim()) return null
  return years.find((y) => fiscalYearContainsDate(y, dateStr)) ?? null
}

/** Prefer open year containing today, then current flag, then most recent by start. */
function pickDefaultFiscalYear(years: FiscalYear[]): FiscalYear | null {
  if (!years.length) return null
  const open = years.filter((y) => y.status === 'open')
  const pool = open.length ? open : years
  const today = new Date().toISOString().split('T')[0]
  const containing = pool.find((y) => fiscalYearContainsDate(y, today))
  if (containing) return containing
  const cur = pool.find((y) => y.is_current)
  if (cur) return cur
  return [...pool].sort((a, b) => b.start_date.localeCompare(a.start_date))[0]
}

function suggestedDateInFiscalYear(fy: FiscalYear): string {
  const today = new Date().toISOString().split('T')[0]
  if (fiscalYearContainsDate(fy, today)) return today
  return fy.start_date.split('T')[0]
}

function createVoucherSchema(baseCurrency: string, postingAccounts: ChartOfAccount[]) {
  return z
    .object({
      office_id: z.number().min(1, 'Office is required'),
      /** Account to debit (expenditure). Table amounts are credits. Use 0 when entering classic debit/credit lines only. */
      expenditure_account_id: z.number().min(0),
      project_id: z.number().nullable().optional(),
      fund_id: z.number().nullable().optional(),
      province_code: z.string().nullable().optional(),
      location_code: z.string().nullable().optional(),
      /** Empty = server auto-generates (matches API). */
      voucher_number: z.string().max(100),
      voucher_type: z.enum(['payment', 'receipt', 'journal', 'contra']),
      voucher_date: z.string().min(1, 'Date is required'),
      /** Optional on server; leave blank when not applicable. */
      payee_name: z.string().max(255),
      description: z.string().min(1, 'Description is required'),
      currency: z.string().min(1, 'Currency is required'),
      exchange_rate: z.number().min(0.000001).optional(),
      payment_method: z.enum(['cash', 'check', 'bank_transfer', 'mobile_money', 'msp']).optional(),
      check_number: z.string().optional(),
      bank_reference: z.string().optional(),
      /** Tax amount (NGO). Net = Gross - Tax. */
      tax_amount: z.number().min(0).optional(),
      lines: z.array(lineSchema).min(2, 'At least 2 lines are required'),
    })
    .superRefine((data, ctx) => {
      if (hasOrphanLineAmounts(data.lines)) {
        const n = countOrphanLineAmounts(data.lines)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            n === 1
              ? 'One row has an amount but no account. Select an account or clear the amount.'
              : `${n} rows have amounts but no account. Select an account or clear those amounts.`,
          path: ['lines'],
        })
        return
      }
      const expenditureId = data.expenditure_account_id ?? 0
      const creditLines = data.lines.filter((l) => l.account_id > 0 && (l.credit_amount ?? 0) !== 0)
      if (creditLines.length > 0 && expenditureId <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select the expenditure account to debit (above).',
          path: ['expenditure_account_id'],
        })
        return
      }
      if (expenditureId > 0) {
        if (creditLines.length < 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Add at least one allocation line (account + amount).',
            path: ['lines'],
          })
          return
        }
        const totalCredit = creditLines.reduce((s, l) => s + (l.credit_amount || 0), 0)
        if (totalCredit <= 0) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Total amount must be greater than zero.', path: ['lines'] })
          return
        }
        const debitIso = getAccountCurrencyIsoForValidation(expenditureId, postingAccounts, baseCurrency)
        const orgBaseIso = getCurrencyIsoCode(baseCurrency)
        const rate = data.exchange_rate
        const rateOk = rate != null && rate >= 0.000001
        /** Expense in non-base currency (e.g. USD) — rate required for base ↔ foreign conversion on lines. */
        const debitForeignVsOrgBase = debitIso !== orgBaseIso
        if (debitForeignVsOrgBase && creditLines.length > 0 && !rateOk) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Exchange rate is required when the expense account uses a currency (${debitIso}) other than the organization base (${orgBaseIso}).`,
            path: ['exchange_rate'],
          })
          return
        }
        for (const line of creditLines) {
          const lineIso = getAccountCurrencyIsoForValidation(line.account_id, postingAccounts, baseCurrency)
          if (lineIso !== debitIso && !rateOk) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Exchange rate is required when the expense account (${debitIso}) and a credit line account (${lineIso}) use different currencies.`,
              path: ['exchange_rate'],
            })
            return
          }
        }
        return
      }
      const validLines = data.lines.filter(
        (l) => l.account_id > 0 && ((l.debit_amount ?? 0) !== 0 || (l.credit_amount ?? 0) !== 0)
      )
      if (validLines.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select expenditure account and add at least one allocation line with account and amount.',
          path: ['lines'],
        })
        return
      }
      const totalDebit = validLines.reduce((s, l) => s + (l.debit_amount || 0), 0)
      const totalCredit = validLines.reduce((s, l) => s + (l.credit_amount || 0), 0)
      if (Math.abs(totalDebit - totalCredit) >= 0.01) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Totals must balance. Debit ${totalDebit.toFixed(2)} ≠ Credit ${totalCredit.toFixed(2)}.`,
          path: ['lines'],
        })
      }
      // Exchange rate required when currency differs from base currency
      const currency = (data.currency ?? '').trim().toUpperCase()
      const base = (baseCurrency ?? 'AFN').trim().toUpperCase()
      if (currency && base && currency !== base) {
        const rate = data.exchange_rate
        if (rate == null || rate < 0.000001) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Exchange rate is required when currency differs from base currency.',
            path: ['exchange_rate'],
          })
        }
      }
    })
}

type VoucherFormValues = z.infer<ReturnType<typeof createVoucherSchema>>
type LineItem = VoucherFormValues['lines'][number]

/** Isolates re-renders: only this component re-renders when lines change (debounced). */
function VoucherAmountValue({
  form,
  currency,
  baseCurrency,
  exchangeRate,
  isForeignTxn,
  amountOnly = false,
}: {
  form: ReturnType<typeof useForm<VoucherFormValues>>
  currency: string
  baseCurrency: string
  exchangeRate: number
  /** When true, lines store foreign; total shown in header is base (sum × rate). */
  isForeignTxn: boolean
  /** When true, show digits only (no ؋, $, etc.); pair with ISO badge elsewhere. */
  amountOnly?: boolean
}) {
  const lines = useWatch({ control: form.control, name: 'lines', defaultValue: form.getValues('lines') })
  const [totalForeign, setTotalForeign] = React.useState(0)
  React.useEffect(() => {
    const t = setTimeout(() => {
      const l = lines ?? form.getValues('lines')
      setTotalForeign((l ?? []).reduce((s, x) => s + (x.credit_amount || 0), 0))
    }, 100)
    return () => clearTimeout(t)
  }, [lines, form])
  const r = Number(exchangeRate)
  const totalBase = Number.isFinite(r) && r > 0 ? totalForeign * r : 0
  if (isForeignTxn) {
    return (
      <span>{amountOnly ? formatCurrencyAmountOnly(totalBase, baseCurrency) : formatCurrency(totalBase, baseCurrency)}</span>
    )
  }
  return (
    <span>{amountOnly ? formatCurrencyAmountOnly(totalForeign, currency) : formatCurrency(totalForeign, currency)}</span>
  )
}

function VoucherAmountWords({ form, currency }: { form: ReturnType<typeof useForm<VoucherFormValues>>; currency: string }) {
  const lines = useWatch({ control: form.control, name: 'lines', defaultValue: form.getValues('lines') })
  const [words, setWords] = React.useState('—')
  React.useEffect(() => {
    const t = setTimeout(() => {
      const l = lines ?? form.getValues('lines')
      const total = (l ?? []).reduce((s, x) => s + (x.credit_amount || 0), 0)
      const code = (currency || 'AFN').trim().toUpperCase() || 'AFN'
      setWords(total !== 0 ? `${amountToWords(total, 2)} ${code} Only` : '—')
    }, 100)
    return () => clearTimeout(t)
  }, [lines, form, currency])
  return <span className="truncate block">{words}</span>
}

/** Isolates re-renders: only this component re-renders when lines change (debounced). Renders totals, balance badge, and footer buttons. */
const VoucherLinesSummary = React.memo(function VoucherLinesSummary(props: {
  form: ReturnType<typeof useForm<VoucherFormValues>>
  currency: string
  baseCurrencyCode: string
  /** False when mixed GL currencies or foreign txn currency requires a rate but rate is missing/invalid. */
  crossCurrencyRateSatisfied: boolean
  /** When true, show base-equivalent summary line (matches EXR/base columns). */
  showCrossCurrencyColumns: boolean
  /** Foreign transaction currency vs org base — summary and totals use base-first display. */
  isForeignTxn: boolean
  embedded: boolean
  isLoading: boolean
  isEditing: boolean
  /** When true, voucher is display-only (no save/clear; controls disabled). */
  readOnly?: boolean
  offices: Array<{ id: number; name: string; code: string; is_head_office?: boolean }>
  onCancel?: () => void
  onOpenChange?: (open: boolean) => void
  handleSubmit: (values: VoucherFormValues) => void | Promise<void>
  onSubmitInvalid: SubmitErrorHandler<VoucherFormValues>
  saveAndNewRef: React.MutableRefObject<boolean>
  getDefaultVoucherLines: () => VoucherFormValues['lines']
  /** Exchange rate controls + formula — rendered above footer actions, below balance totals. */
  exchangeRateFooterPanel?: React.ReactNode
}) {
  const {
    form,
    currency,
    baseCurrencyCode,
    crossCurrencyRateSatisfied,
    showCrossCurrencyColumns,
    isForeignTxn,
    embedded,
    isLoading,
    isEditing,
    readOnly = false,
    offices,
    onCancel,
    onOpenChange,
    handleSubmit,
    onSubmitInvalid,
    saveAndNewRef,
    getDefaultVoucherLines,
    exchangeRateFooterPanel,
  } = props
  const lines = useWatch({ control: form.control, name: 'lines', defaultValue: form.getValues('lines') })
  const expenditureId = useWatch({ control: form.control, name: 'expenditure_account_id', defaultValue: form.getValues('expenditure_account_id') }) ?? 0
  const exchangeRateWatch = useWatch({ control: form.control, name: 'exchange_rate', defaultValue: form.getValues('exchange_rate') }) ?? 1
  const [state, setState] = React.useState(() => {
    const l = form.getValues('lines') ?? []
    const expId = form.getValues('expenditure_account_id') ?? 0
    const hasOrphanAmounts = hasOrphanLineAmounts(l)
    const creditLines = l.filter((x) => x.account_id > 0 && (x.credit_amount ?? 0) !== 0)
    const linesToValidate = expId > 0 && creditLines.length > 0
      ? [{ account_id: expId, debit_amount: creditLines.reduce((s, x) => s + (x.credit_amount || 0), 0), credit_amount: 0 }, ...creditLines.map(x => ({ account_id: x.account_id, debit_amount: 0, credit_amount: x.credit_amount ?? 0 }))]
      : l
    const balance = validateVoucher(linesToValidate)
    const validCount = expId > 0 ? creditLines.length : l.filter((x) => x.account_id > 0 && ((x.debit_amount ?? 0) !== 0 || (x.credit_amount ?? 0) !== 0)).length
    return { balance, validCount, hasOrphanAmounts }
  })
  React.useEffect(() => {
    const t = setTimeout(() => {
      const l = lines ?? form.getValues('lines') ?? []
      const expId = expenditureId ?? form.getValues('expenditure_account_id') ?? 0
      const hasOrphanAmounts = hasOrphanLineAmounts(l)
      const creditLines = l.filter((x) => x.account_id > 0 && (x.credit_amount ?? 0) !== 0)
      const linesToValidate = expId > 0 && creditLines.length > 0
        ? [{ account_id: expId, debit_amount: creditLines.reduce((s, x) => s + (x.credit_amount || 0), 0), credit_amount: 0 }, ...creditLines.map(x => ({ account_id: x.account_id, debit_amount: 0, credit_amount: x.credit_amount ?? 0 }))]
        : l
      const balance = validateVoucher(linesToValidate)
      const validCount = expId > 0 ? creditLines.length : l.filter((x) => x.account_id > 0 && ((x.debit_amount ?? 0) !== 0 || (x.credit_amount ?? 0) !== 0)).length
      setState({ balance, validCount, hasOrphanAmounts })
    }, 100)
    return () => clearTimeout(t)
  }, [lines, expenditureId, form])
  const { balance: balanceStatus, validCount: validLinesCount, hasOrphanAmounts } = state
  const canSubmit =
    crossCurrencyRateSatisfied &&
    !hasOrphanAmounts &&
    balanceStatus.isValid &&
    (expenditureId > 0 ? validLinesCount >= 1 : validLinesCount >= 2)
  const grossAmount = balanceStatus.totalCredit
  const padX = embedded ? 'px-2 sm:px-3' : 'px-4'
  const iso = getCurrencyIsoCode(currency)
  const baseIsoSummary = getCurrencyIsoCode(baseCurrencyCode)
  const rSummary = Number(exchangeRateWatch)
  const totalBaseEquiv = Number.isFinite(rSummary) && rSummary > 0 ? grossAmount * rSummary : 0
  return (
    <>
      {/* Single footer “whitespace” block below the table: totals, optional exchange controls, validation, badges */}
      <div
        className={cn(
          'shrink-0 border-t-2 border-slate-300/70 dark:border-slate-600/50 bg-white dark:bg-slate-900 py-1.5',
          padX
        )}
      >
        <div className="flex flex-col items-end gap-0.5 text-[11px] font-medium">
          {isForeignTxn ? (
            <>
              <div className="flex items-center justify-end gap-2">
                <span className="font-medium text-muted-foreground">Total ({baseIsoSummary}):</span>
                <span className="font-mono font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                  {formatCurrencyAmountOnly(totalBaseEquiv, baseCurrencyCode)}
                </span>
              </div>
              <div className="flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
                <span>Total ({iso}):</span>
                <span className="font-mono font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                  {formatCurrencyAmountOnly(grossAmount, currency)}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-end gap-2">
                <span className="font-medium text-muted-foreground">
                  Amount ({iso}):
                </span>
                <span className="font-mono font-semibold tabular-nums text-slate-800 dark:text-slate-200">{formatCurrency(grossAmount, currency)}</span>
              </div>
              {showCrossCurrencyColumns && (
                <div className="flex items-center justify-end gap-2 text-[10px]">
                  <span className="font-medium text-muted-foreground">Base equivalent ({baseIsoSummary}) — Debit = Credit:</span>
                  <span className="font-mono font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                    {formatCurrencyAmountOnly(totalBaseEquiv, baseCurrencyCode)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {exchangeRateFooterPanel ? (
          <div className="mt-2 pt-2 border-t border-border/40 w-full min-w-0">{exchangeRateFooterPanel}</div>
        ) : null}

        <div className="mt-2 flex flex-col items-end gap-0.5">
          {hasOrphanAmounts && (
            <p className="text-[10px] text-amber-800 dark:text-amber-200 text-right max-w-md">
              {countOrphanLineAmounts(lines ?? []) === 1
                ? 'One row has an amount but no account. Select an account in the Account column or clear the amount.'
                : `${countOrphanLineAmounts(lines ?? [])} rows have amounts without an account. Fix each row before saving.`}
            </p>
          )}
          {!crossCurrencyRateSatisfied && (
            <p className="text-[10px] text-amber-800 dark:text-amber-200 text-right max-w-md">
              Set a valid exchange rate. It is required when the expense account and a credit line use different currencies, or when transaction currency differs from base ({baseIsoSummary}).
            </p>
          )}
          {!canSubmit && !hasOrphanAmounts && crossCurrencyRateSatisfied && (expenditureId > 0 ? validLinesCount < 1 : validLinesCount < 2) && (
            <p className="text-[10px] text-muted-foreground">{expenditureId > 0 ? 'Select expense account and at least one allocation line.' : 'Enter at least one debit and one credit line.'}</p>
          )}
          <div className="flex items-center justify-end gap-1.5">
            {hasOrphanAmounts ? (
              <Badge variant="warning" className="flex items-center gap-1 text-[10px] py-0 px-1">
                <AlertCircle className="h-2.5 w-2.5" />
                Incomplete rows
              </Badge>
            ) : balanceStatus.isValid ? (
              <Badge variant="success" className="flex items-center gap-1 text-[10px] py-0 px-1">
                <CheckCircle className="h-2.5 w-2.5" />
                Balanced
              </Badge>
            ) : (
              <Badge variant="destructive" className="flex items-center gap-1 text-[10px] py-0 px-1">
                <AlertCircle className="h-2.5 w-2.5" />
                Out of balance {formatCurrency(balanceStatus.difference, currency)}
              </Badge>
            )}
          </div>
        </div>
      </div>
      {embedded && !readOnly ? (
        <div className={cn('shrink-0 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-white dark:bg-slate-900 py-1.5', padX)}>
          <div className="flex gap-1.5">
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs rounded-none" onClick={() => { form.reset({ office_id: getMainOfficeId(offices), project_id: undefined, fund_id: undefined, province_code: undefined, location_code: undefined, expenditure_account_id: 0, voucher_number: '', voucher_type: form.getValues('voucher_type'), voucher_date: new Date().toISOString().split('T')[0], payee_name: '', description: '', currency: form.getValues('currency'), exchange_rate: 1, payment_method: 'cash', tax_amount: 0, lines: getDefaultVoucherLines() }) }} disabled={isLoading}>Clear</Button>
            <Button type="button" variant="secondary" size="sm" className="h-7 text-xs rounded-none" disabled={isLoading || !canSubmit} onClick={() => { saveAndNewRef.current = true; form.handleSubmit(handleSubmit, onSubmitInvalid)(); }}>{isLoading && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}Save &amp; New</Button>
            <Button type="submit" id="voucher-submit-btn" size="sm" className="h-7 text-xs rounded-none" disabled={isLoading || !canSubmit} onClick={() => { saveAndNewRef.current = false }}>{isLoading && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}Save voucher</Button>
          </div>
        </div>
      ) : !embedded && !readOnly ? (
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange?.(false)} disabled={isLoading}>Cancel</Button>
          <Button type="submit" disabled={isLoading || !canSubmit}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{isEditing ? 'Update voucher' : 'Save voucher'}</Button>
        </DialogFooter>
      ) : null}
    </>
  )
})

type CostCenterOption = { code: string; name: string; depth: number }

/** Per-row selection: when row is in selection range, { minC, maxC }; else null. Same reference for same bounds to avoid re-renders. */
type SelectionForRow = { minC: number; maxC: number } | null

type VoucherTableRowProps = {
  index: number
  fieldId: string
  form: ReturnType<typeof useForm<VoucherFormValues>>
  selectionForRow: SelectionForRow
  postingAccounts: ChartOfAccount[]
  /** Chart of accounts tree (same API as accounts-tree query) for hierarchical picker. */
  accountsTree: ChartOfAccount[]
  /** O(1) lookup for row account currency — avoids .find per cell. */
  postingsById: Map<number, ChartOfAccount>
  costCenterOptions: CostCenterOption[]
  isLoading: boolean
  baseCurrency: string
  /** Stored rate: base per 1 unit of transaction currency (matches API). */
  exchangeRate: number
  /** Display: foreign units per 1 base (1 base = X foreign). */
  foreignPerBaseDisplay: number
  debitCurrencyIso: string
  isForeignTxn: boolean
  /** Show EXR + base columns (foreign txn currency or mixed GL account currencies). */
  showCrossCurrencyColumns: boolean
  /** Voucher transaction currency code (for foreign column label / format). */
  transactionCurrency: string
}

/** Convert base display amount → stored foreign credit (API: base = foreign × rate). */
function baseAmountToStoredForeign(base: number, rateBasePerForeign: number): number {
  const r = Number(rateBasePerForeign)
  if (!Number.isFinite(r) || r <= 0) return 0
  const foreign = base / r
  return Math.round(foreign * 100) / 100
}

/** Amount cell: no initial amount (empty when 0); display decimal 2 with comma (e.g. 34,000.00).
 *  When `entryBaseCurrency` is true (foreign txn voucher), user edits **organization base**; we store foreign in `credit_amount`. */
const AmountCellInput = React.memo(function AmountCellInput({
  index,
  line,
  form,
  disabled,
  exchangeRate,
  entryBaseCurrency,
}: {
  index: number
  line: LineItem | undefined
  form: ReturnType<typeof useForm<VoucherFormValues>>
  disabled: boolean
  /** Stored rate: base per 1 unit of transaction (foreign) currency. */
  exchangeRate: number
  /** If true, Amount column is base ISO; stored line amount is foreign. */
  entryBaseCurrency: boolean
}) {
  const cred = line?.credit_amount ?? 0
  const r = Number(exchangeRate)
  const baseDisplay = Number.isFinite(r) && r > 0 ? cred * r : 0
  const rawForUi = entryBaseCurrency ? baseDisplay : cred
  const [focused, setFocused] = React.useState(false)
  const [editValue, setEditValue] = React.useState('')
  React.useEffect(() => {
    if (focused) setEditValue(rawForUi !== 0 ? String(rawForUi) : '')
  }, [rawForUi, focused])
  const displayValue = focused ? editValue : formatAmountCell(rawForUi)
  const applyFormat = useCallback(
    (value: string) => {
      const num = parseAmountCell(value)
      const stored = entryBaseCurrency ? baseAmountToStoredForeign(num, r) : num
      form.setValue(`lines.${index}.credit_amount`, stored, { shouldValidate: false })
      form.setValue(`lines.${index}.debit_amount`, 0, { shouldValidate: false })
      setEditValue(formatAmountCell(entryBaseCurrency ? num : stored))
    },
    [form, index, entryBaseCurrency, r]
  )
  return (
    <Input
      className="voucher-cell-input h-6 min-h-6 rounded-none border-0 bg-transparent shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-transparent dark:focus-visible:bg-transparent text-right w-full font-sans tabular-nums text-xs leading-snug px-2 py-0.5 text-slate-800 dark:text-slate-200 font-normal"
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={(e) => {
        const v = e.target.value
        setEditValue(v)
        const num = parseAmountCell(v)
        const stored = entryBaseCurrency ? baseAmountToStoredForeign(num, r) : num
        form.setValue(`lines.${index}.credit_amount`, stored, { shouldValidate: false })
        form.setValue(`lines.${index}.debit_amount`, 0, { shouldValidate: false })
      }}
      onPaste={(e) => {
        const pasted = (e.clipboardData?.getData('text/plain') ?? '').trim()
        if (!pasted) return
        e.preventDefault()
        applyFormat(pasted)
      }}
      onFocus={(e) => {
        setFocused(true)
        setEditValue(rawForUi !== 0 ? String(rawForUi) : '')
        e.target.select()
      }}
      onBlur={() => {
        const num = parseAmountCell(editValue)
        const stored = entryBaseCurrency ? baseAmountToStoredForeign(num, r) : num
        form.setValue(`lines.${index}.credit_amount`, stored, { shouldValidate: false })
        form.setValue(`lines.${index}.debit_amount`, 0, { shouldValidate: false })
        setFocused(false)
        setEditValue('')
      }}
      disabled={disabled}
    />
  )
}, (prev, next) => {
  return (
    prev.index === next.index &&
    prev.disabled === next.disabled &&
    prev.exchangeRate === next.exchangeRate &&
    prev.entryBaseCurrency === next.entryBaseCurrency &&
    prev.form === next.form &&
    (prev.line?.credit_amount ?? 0) === (next.line?.credit_amount ?? 0) &&
    (prev.line?.debit_amount ?? 0) === (next.line?.debit_amount ?? 0) &&
    (prev.line?.account_id ?? 0) === (next.line?.account_id ?? 0)
  )
})

function voucherTableRowPropsAreEqual(prev: VoucherTableRowProps, next: VoucherTableRowProps): boolean {
  return (
    prev.fieldId === next.fieldId &&
    prev.index === next.index &&
    prev.form === next.form &&
    prev.selectionForRow === next.selectionForRow &&
    prev.postingAccounts === next.postingAccounts &&
    prev.accountsTree === next.accountsTree &&
    prev.postingsById === next.postingsById &&
    prev.costCenterOptions === next.costCenterOptions &&
    prev.isLoading === next.isLoading &&
    prev.baseCurrency === next.baseCurrency &&
    prev.exchangeRate === next.exchangeRate &&
    prev.foreignPerBaseDisplay === next.foreignPerBaseDisplay &&
    prev.debitCurrencyIso === next.debitCurrencyIso &&
    prev.isForeignTxn === next.isForeignTxn &&
    prev.showCrossCurrencyColumns === next.showCrossCurrencyColumns &&
    prev.transactionCurrency === next.transactionCurrency
  )
}

const VoucherTableRow = React.memo(function VoucherTableRow({
  index,
  fieldId,
  form,
  selectionForRow,
  postingAccounts,
  accountsTree,
  postingsById,
  costCenterOptions,
  isLoading,
  baseCurrency,
  exchangeRate,
  foreignPerBaseDisplay,
  debitCurrencyIso,
  isForeignTxn,
  showCrossCurrencyColumns,
  transactionCurrency,
}: VoucherTableRowProps) {
  /** Portaled pickers remove focus from the row; keep row highlight until closed. */
  const [accountPickerOpen, setAccountPickerOpen] = React.useState(false)
  const [costCenterOpen, setCostCenterOpen] = React.useState(false)
  const line = useWatch({ control: form.control, name: `lines.${index}` as const }) as LineItem | undefined
  const accountId = line?.account_id ?? 0
  const costCenterCode = line?.cost_center ?? ''
  const isSel = (c: number) =>
    selectionForRow != null && c >= selectionForRow.minC && c <= selectionForRow.maxC
  const cellBorder = 'border-r-[0.3px] border-slate-200 dark:border-slate-700'
  const selStyle =
    (showCrossCurrencyColumns
      ? isSel(0) || isSel(1) || isSel(2) || isSel(3) || isSel(4) || isSel(5) || isSel(6)
      : isSel(0) || isSel(1) || isSel(2) || isSel(3) || isSel(4))
      ? 'voucher-sheet-row-selected'
      : ''
  const lineAcc = (accountId > 0 ? postingsById.get(accountId) : undefined) as
    | (ChartOfAccount & { currency_code?: string })
    | undefined
  const lineCurrencyIso = getCurrencyIsoCode(displayCurrencyForAccount(lineAcc, baseCurrency))
  const cred = line?.credit_amount ?? 0
  const showExrCol =
    accountId > 0 && cred !== 0 && (lineCurrencyIso !== debitCurrencyIso || isForeignTxn)
  const r = Number(exchangeRate)
  const lineBaseEquiv = Number.isFinite(r) && r > 0 ? cred * r : 0
  /** Foreign txn: col 4 = base (editable), col 6 = foreign (stored). Mixed GL only: col 4 = txn, col 6 = base. */
  const amountEntryBase = isForeignTxn && showCrossCurrencyColumns
  /** EXR: same voucher rate for all rows in foreign-debit mode; per-row only for mixed GL without foreign txn. */
  const exrCellText =
    isForeignTxn && showCrossCurrencyColumns
      ? Number.isFinite(foreignPerBaseDisplay) && foreignPerBaseDisplay > 0
        ? foreignPerBaseDisplay.toFixed(6)
        : ''
      : showExrCol && Number.isFinite(foreignPerBaseDisplay) && foreignPerBaseDisplay > 0
        ? foreignPerBaseDisplay.toFixed(6)
        : ''
  const foreignCellText = amountEntryBase
    ? Math.abs(cred) > 0.000001
      ? formatCurrencyAmountOnly(cred, transactionCurrency)
      : ''
    : Math.abs(lineBaseEquiv) > 0.000001
      ? formatCurrencyAmountOnly(lineBaseEquiv, baseCurrency)
      : ''
  const rowPortalActive = accountPickerOpen || costCenterOpen
  return (
    <tr
      data-row-index={index}
      className={cn('group', selStyle, rowPortalActive && 'voucher-sheet-row-active')}
      title="Allocation line (credit)"
    >
      <td className={cn('voucher-sheet-account-cell h-6 p-0 align-middle', cellBorder, isSel(0) && 'bg-white dark:bg-slate-800')} data-col-index={0}>
        <VoucherPostingAccountCombo
          value={accountId}
          onChange={(id) => form.setValue(`lines.${index}.account_id`, id, { shouldValidate: false })}
          accounts={postingAccounts}
          accountsById={postingsById}
          accountsTree={accountsTree}
          baseCurrency={baseCurrency}
          disabled={isLoading}
          onOpenChange={setAccountPickerOpen}
          triggerClassName="voucher-account-trigger h-6 min-h-6 border-0 rounded-none bg-transparent shadow-none outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-transparent dark:focus-visible:bg-transparent text-xs leading-snug hover:bg-transparent"
        />
      </td>
      <td className={cn('h-6 p-0 align-middle', cellBorder, isSel(1) && 'bg-white dark:bg-slate-800')} data-col-index={1}>
        <Input
          className="voucher-cell-input h-6 min-h-6 rounded-none border-0 bg-transparent shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-transparent dark:focus-visible:bg-transparent w-full text-xs leading-snug font-normal font-sans px-2 py-0.5 placeholder:text-slate-400"
          placeholder=""
          {...form.register(`lines.${index}.project_account_code`)}
          disabled={isLoading}
        />
      </td>
      <td className={cn('h-6 p-0 align-middle', cellBorder, isSel(2) && 'bg-white dark:bg-slate-800')} data-col-index={2}>
        <Input
          className="voucher-cell-input h-6 min-h-6 rounded-none border-0 bg-transparent shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-transparent dark:focus-visible:bg-transparent w-full text-xs leading-snug font-normal font-sans px-2 py-0.5 placeholder:text-slate-400"
          placeholder=""
          {...form.register(`lines.${index}.description`)}
          disabled={isLoading}
        />
      </td>
      <td className={cn('voucher-sheet-cost-cell h-6 p-0 align-middle', cellBorder, isSel(3) && 'bg-white dark:bg-slate-800')} data-col-index={3}>
        <VoucherCostCenterCombo
          value={costCenterCode}
          onChange={(code) => form.setValue(`lines.${index}.cost_center`, code, { shouldValidate: false })}
          options={costCenterOptions}
          disabled={isLoading}
          onOpenChange={setCostCenterOpen}
          triggerClassName="voucher-account-trigger h-6 min-h-6 border-0 rounded-none bg-transparent shadow-none outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-transparent dark:focus-visible:bg-transparent text-xs leading-snug font-mono w-full px-2 py-0.5 min-w-0 text-slate-800 dark:text-slate-200 hover:bg-transparent"
        />
      </td>
      <td
        className={cn(
          'voucher-sheet-amount-cell h-6 p-0 align-middle text-right border-r-[0.3px] border-slate-200 dark:border-slate-700',
          isSel(4) && 'bg-white dark:bg-slate-800'
        )}
        data-col-index={4}
      >
        <AmountCellInput
          index={index}
          line={line}
          form={form}
          disabled={isLoading}
          exchangeRate={exchangeRate}
          entryBaseCurrency={amountEntryBase}
        />
      </td>
      {showCrossCurrencyColumns && (
        <>
          <td
            className={cn(
              'h-6 p-0 align-middle text-right border-r-[0.3px] border-slate-200 dark:border-slate-700 tabular-nums text-[10px] px-1.5 py-0.5 text-muted-foreground',
              isSel(5) && 'bg-white dark:bg-slate-800'
            )}
            data-col-index={5}
            title="Foreign units per 1 unit of base (1 base = X foreign); same as voucher exchange block."
          >
            {exrCellText}
          </td>
          <td
            className={cn(
              'h-6 p-0 align-middle text-right border-r-[0.3px] border-slate-200 dark:border-slate-700 tabular-nums text-[10px] px-1.5 py-0.5 font-medium text-slate-800 dark:text-slate-200',
              isSel(6) && 'bg-white dark:bg-slate-800'
            )}
            data-col-index={6}
            title={
              amountEntryBase
                ? `Transaction (foreign) amount = base ÷ rate; stored for posting in ${getCurrencyIsoCode(transactionCurrency)}`
                : `Base equivalent (${getCurrencyIsoCode(baseCurrency)}) = foreign × rate`
            }
          >
            {foreignCellText}
          </td>
        </>
      )}
    </tr>
  )
}, voucherTableRowPropsAreEqual)

interface VoucherFormDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  voucher?: Voucher | null
  /** Second arg: when true, parent should not navigate (save and stay for new entry). */
  onSubmit: (data: VoucherFormData, saveAndNew?: boolean) => Promise<void>
  isLoading?: boolean
  offices: Array<{ id: number; name: string; code: string; is_head_office?: boolean }>
  /** When true, render as full-page form (no Dialog). Use in /vouchers/new and /vouchers/[id]/edit. */
  embedded?: boolean
  /** Called after successful submit when embedded and not saveAndNew (e.g. redirect). */
  onSuccess?: () => void
  /** Called when user cancels/goes back when embedded. */
  onCancel?: () => void
  /** When creating from a project journal book: prefill project, province, office; next voucher # follows coding block. */
  journalPrefill?: JournalVoucherPrefill | null
  /** Embedded view-only (e.g. posted voucher): same layout, no edits or save actions. */
  readOnly?: boolean
}

export function VoucherFormDialog({
  open = true,
  onOpenChange,
  voucher,
  onSubmit,
  isLoading = false,
  offices,
  embedded = false,
  onSuccess,
  onCancel,
  journalPrefill = null,
  readOnly = false,
}: VoucherFormDialogProps) {
  const isEditing = !!voucher
  const [colWidths, setColWidths] = useState<number[]>(readSavedColWidths)
  useEffect(() => {
    try {
      localStorage.setItem('erp-voucher-table-col-widths', JSON.stringify(colWidths))
    } catch {
      /* ignore */
    }
  }, [colWidths])
  const resizingRef = useRef<{ colIndex: number; startX: number; startWidth: number } | null>(null)
  const saveAndNewRef = React.useRef(false)
  const voucherTableRef = React.useRef<HTMLDivElement>(null)
  type SheetSelection = { startRow: number; startCol: number; endRow: number; endCol: number }
  const [sheetSelection, setSheetSelection] = useState<SheetSelection | null>(null)
  const selectingRef = useRef(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [pasteHint, setPasteHint] = useState(false)
  const [isCheckingVoucherNumber, setIsCheckingVoucherNumber] = useState(false)
  /** After journal prefill reset, sync allocation lines + office once projects list is loaded. */
  /** Reset when dialog closes so journal prefill can re-apply on next open. */
  const journalPrefillApplyRef = useRef(false)
  /** Once per open: align transaction date with a defined fiscal year (fixes journal book New voucher). */
  const fiscalDateInitRef = useRef(false)
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const mousedownCellRef = useRef<{ rowIndex: number; colIndex: number } | null>(null)
  const selectionBoundsRef = useRef<{ minR: number; maxR: number; minC: number; maxC: number } | null>(null)
  const selectionRafRef = useRef<number | null>(null)
  const pendingSelectionRef = useRef<{ rowIndex: number; colIndex: number } | null>(null)

  const handleResizeStart = useCallback((colIndex: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    resizingRef.current = { colIndex, startX: e.clientX, startWidth: colWidths[colIndex] }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [colWidths])

  useEffect(() => {
    const minPercent = 5
    const onMove = (e: MouseEvent) => {
      if (resizingRef.current == null) return
      const delta = e.clientX - resizingRef.current.startX
      const tableEl = voucherTableRef.current?.querySelector('table')
      const tableWidth = tableEl?.offsetWidth ?? 800
      const dataWidth = tableWidth - 36
      if (dataWidth <= 0) return
      const deltaPercent = (delta / dataWidth) * 96
      setColWidths((prev) => {
        const ref = resizingRef.current
        if (!ref) return prev
        const i = ref.colIndex
        const next = [...prev]
        const newWi = ref.startWidth + deltaPercent
        if (i < prev.length - 1) {
          const maxWi = prev[i] + prev[i + 1] - minPercent
          const clampedWi = Math.max(minPercent, Math.min(newWi, maxWi))
          next[i] = Math.round(clampedWi * 10) / 10
          next[i + 1] = Math.round((prev[i] + prev[i + 1] - clampedWi) * 10) / 10
        } else {
          const maxWi = prev[i - 1] + prev[i] - minPercent
          const clampedWi = Math.max(minPercent, Math.min(newWi, maxWi))
          next[i] = Math.round(clampedWi * 10) / 10
          next[i - 1] = Math.round((prev[i - 1] + prev[i] - clampedWi) * 10) / 10
        }
        return next
      })
    }
    const onUp = () => {
      resizingRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [])
  const organization = useOrganizationStore((s) => s.organization)
  const canEditVoucherNumber = useHasPermission('edit-voucher-number')
  const voucherNumberLockedFromJournal = !isEditing && !!journalPrefill && !canEditVoucherNumber
  const { toast } = useToast()
  const onSubmitInvalid = useCallback(
    (errors: FieldErrors<VoucherFormValues>) => {
      const linesMsg = errors.lines?.message
      if (linesMsg) {
        toast({ title: 'Cannot save voucher', description: String(linesMsg), variant: 'destructive' })
        return
      }
      const officeMsg = errors.office_id?.message
      if (officeMsg) {
        toast({ title: 'Cannot save voucher', description: String(officeMsg), variant: 'destructive' })
        return
      }
      const projMsg = errors.project_id?.message
      if (projMsg) {
        toast({ title: 'Cannot save voucher', description: String(projMsg), variant: 'destructive' })
        return
      }
      const fundMsg = errors.fund_id?.message
      if (fundMsg) {
        toast({ title: 'Cannot save voucher', description: String(fundMsg), variant: 'destructive' })
        return
      }
      const vnMsg = errors.voucher_number?.message
      if (vnMsg) {
        toast({ title: 'Cannot save voucher', description: String(vnMsg), variant: 'destructive' })
        return
      }
      const payeeMsg = errors.payee_name?.message
      if (payeeMsg) {
        toast({ title: 'Cannot save voucher', description: String(payeeMsg), variant: 'destructive' })
        return
      }
      const expMsg = errors.expenditure_account_id?.message
      if (expMsg) {
        toast({ title: 'Cannot save voucher', description: String(expMsg), variant: 'destructive' })
        return
      }
      const exrMsg = errors.exchange_rate?.message
      if (exrMsg) {
        toast({ title: 'Cannot save voucher', description: String(exrMsg), variant: 'destructive' })
        return
      }
      const descMsg = errors.description?.message
      if (descMsg) {
        toast({ title: 'Cannot save voucher', description: String(descMsg), variant: 'destructive' })
        return
      }
      const dateMsg = errors.voucher_date?.message
      if (dateMsg) {
        toast({ title: 'Cannot save voucher', description: String(dateMsg), variant: 'destructive' })
        return
      }
      toast({
        title: 'Cannot save voucher',
        description: 'Check required fields (office, description, balanced lines) and try again.',
        variant: 'destructive',
      })
    },
    [toast]
  )

  // Fetch accounts for dropdown
  const { data: accountsData } = useQuery({
    queryKey: ['accounts-tree'],
    queryFn: () => getAccountsTree(),
    enabled: open || embedded,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const { data: codingBlockData } = useQuery({
    queryKey: ['coding-block-options'],
    queryFn: () => getCodingBlockOptions(),
    enabled: open || embedded,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  })

  const { data: fiscalYearsRaw } = useQuery({
    queryKey: ['fiscal-years', 'voucher-form'],
    queryFn: () => getFiscalYears(),
    enabled: open || embedded,
    staleTime: 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const fiscalYears = React.useMemo(() => {
    const list = Array.isArray(fiscalYearsRaw) ? fiscalYearsRaw : []
    return [...list].sort((a, b) => b.start_date.localeCompare(a.start_date))
  }, [fiscalYearsRaw])

  const codingBlock = codingBlockData?.data
  const provinces = codingBlock?.provinces ?? []
  const locations = codingBlock?.locations ?? []
  const codingBlockFormat = codingBlock?.format ?? null

  /** Stable empty ref for memo (avoid new [] each render). */
  const accountsTreeEmptyRef = React.useRef<ChartOfAccount[]>([])
  const accountsTreeRoot = accountsData?.data ?? accountsTreeEmptyRef.current

  const postingAccounts = React.useMemo(() => {
    if (!accountsData?.data) return []
    const flat = flattenAccountsTree(accountsData.data)
    return flat.filter((acc: ChartOfAccount) => acc.is_posting && acc.is_active)
  }, [accountsData])

  const postingsById = React.useMemo(() => {
    const m = new Map<number, ChartOfAccount>()
    for (const a of postingAccounts) {
      m.set(a.id, a)
    }
    return m
  }, [postingAccounts])

  const voucherSchema = React.useMemo(
    () => createVoucherSchema(organization?.default_currency ?? 'AFN', postingAccounts),
    [organization?.default_currency, postingAccounts]
  )

  const form = useForm<VoucherFormValues>({
    resolver: zodResolver(voucherSchema),
    defaultValues: {
      office_id: 0,
      expenditure_account_id: 0,
      project_id: undefined,
      fund_id: undefined,
      province_code: undefined,
      location_code: undefined,
      voucher_number: '',
      voucher_type: 'payment',
      voucher_date: new Date().toISOString().split('T')[0],
      payee_name: '',
      description: '',
      currency: 'AFN',
      exchange_rate: 1,
      payment_method: 'cash',
      tax_amount: 0,
      lines: getDefaultVoucherLines(),
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  })

  const getSelectionBounds = useCallback((): { minR: number; maxR: number; minC: number; maxC: number } | null => {
    if (!sheetSelection) return null
    const { startRow, startCol, endRow, endCol } = sheetSelection
    return {
      minR: Math.min(startRow, endRow),
      maxR: Math.max(startRow, endRow),
      minC: Math.min(startCol, endCol),
      maxC: Math.max(startCol, endCol),
    }
  }, [sheetSelection])

  const isCellSelected = useCallback((r: number, c: number) => {
    const b = getSelectionBounds()
    if (!b) return false
    return r >= b.minR && r <= b.maxR && c >= b.minC && c <= b.maxC
  }, [getSelectionBounds])

  const doPasteFromText = useCallback((text: string, overrides?: { rowIndex?: number; colIndex?: number; clipRows?: number | null; clipCols?: number | null }) => {
    const t = text.trim()
    if (!t) return
    const lines = t.split(/\r?\n/).filter((line) => line.length > 0 || line === '')
    if (lines.length === 0) return
    const bounds = getSelectionBounds()
    const rowIndex = overrides?.rowIndex ?? (bounds ? bounds.minR : 0)
    const colIndex = overrides?.colIndex ?? (bounds ? bounds.minC : 0)
    const clipRows = overrides && 'clipRows' in overrides ? overrides.clipRows ?? null : (bounds ? bounds.maxR - bounds.minR + 1 : null)
    const clipCols = overrides && 'clipCols' in overrides ? overrides.clipCols ?? null : (bounds ? bounds.maxC - bounds.minC + 1 : null)
    const fieldKeys = ['account_id', 'project_account_code', 'description', 'cost_center', 'credit_amount'] as const
    const maxPasteRows = clipRows != null ? Math.min(lines.length, clipRows) : lines.length
    let r = rowIndex
    let rowCount = fields.length
    for (let lineIdx = 0; lineIdx < maxPasteRows; lineIdx++) {
      while (r >= rowCount) {
        const projectId = form.getValues('project_id') ?? undefined
        append({ account_id: 0, debit_amount: 0, credit_amount: 0, description: form.getValues('description') || '', cost_center: '', project_account_code: '', line_type: 'credit', project_id: projectId })
        rowCount++
      }
      const cells = lines[lineIdx].split(/\t/)
      const maxPasteCols = clipCols != null ? Math.min(cells.length, clipCols) : cells.length
      for (let cellIdx = 0; cellIdx < maxPasteCols; cellIdx++) {
        const col = colIndex + cellIdx
        if (col > 4) break
        const cellVal = (cells[cellIdx] ?? '').trim()
        if (col === 0) {
          const acc = postingAccounts.find((a: ChartOfAccount) => (a.account_code ?? '').toLowerCase() === String(cellVal).toLowerCase())
          if (acc) form.setValue(`lines.${r}.account_id`, acc.id, { shouldValidate: false })
        } else if (col >= 1 && col <= 4) {
          const key = fieldKeys[col]
          if (key === 'credit_amount') {
            const num = parseAmountCell(String(cellVal))
            form.setValue(`lines.${r}.credit_amount`, num, { shouldValidate: false })
            form.setValue(`lines.${r}.debit_amount`, 0, { shouldValidate: false })
          } else {
            form.setValue(`lines.${r}.${key}` as any, String(cellVal), { shouldValidate: false })
          }
        }
      }
      r++
    }
    const finalR = Math.min(r, rowCount - 1)
    const finalC = colIndex
    setTimeout(() => {
      const targetRow = voucherTableRef.current?.querySelector(`tbody tr[data-row-index="${finalR}"]`)
      const targetCell = targetRow?.querySelector(`td[data-col-index="${finalC}"]`)
      const focusable = targetCell?.querySelector<HTMLInputElement | HTMLButtonElement>('input, [role="combobox"]')
      if (focusable) (focusable as HTMLElement).focus()
    }, 0)
  }, [getSelectionBounds, form, fields.length, append, postingAccounts])

  const handleSheetPaste = useCallback((e: React.ClipboardEvent) => {
    const target = e.target as HTMLElement
    if (!voucherTableRef.current?.contains(target)) return
    const text = e.clipboardData.getData('text/plain').trim()
    if (!text) return
    const lines = text.split(/\r?\n/).filter((line) => line.length > 0 || line === '')
    const hasMultipleCells = lines.length > 1 || (lines[0]?.includes('\t') ?? false)
    const bounds = getSelectionBounds()
    let rowIndex: number
    let colIndex: number
    if (bounds) {
      rowIndex = bounds.minR
      colIndex = bounds.minC
    } else if (target.matches('input, [role="combobox"]')) {
      const row = target.closest('tr[data-row-index]')
      if (!row) return
      rowIndex = parseInt(row.getAttribute('data-row-index') ?? '0', 10)
      const colCell = target.closest('td[data-col-index]')
      colIndex = colCell != null ? parseInt(colCell.getAttribute('data-col-index') ?? '0', 10) : 0
    } else {
      rowIndex = 0
      colIndex = 0
    }
    if (!hasMultipleCells) {
      if (colIndex < 0 || colIndex > 4) return
      e.preventDefault()
      const val = String(lines[0] ?? '').trim()
      const fieldKeys = ['account_id', 'project_account_code', 'description', 'cost_center', 'credit_amount'] as const
      const key = fieldKeys[colIndex]
      if (colIndex === 0) {
        const acc = postingAccounts.find((a: ChartOfAccount) => (a.account_code ?? '').toLowerCase() === val.toLowerCase())
        if (acc) form.setValue(`lines.${rowIndex}.account_id`, acc.id, { shouldValidate: false })
      } else if (key === 'credit_amount') {
        const num = parseAmountCell(val)
        form.setValue(`lines.${rowIndex}.credit_amount`, num, { shouldValidate: false })
        form.setValue(`lines.${rowIndex}.debit_amount`, 0, { shouldValidate: false })
      } else {
        form.setValue(`lines.${rowIndex}.${key}` as any, val, { shouldValidate: false })
      }
      return
    }
    const clipRows = bounds ? bounds.maxR - bounds.minR + 1 : null
    const clipCols = bounds ? bounds.maxC - bounds.minC + 1 : null
    e.preventDefault()
    doPasteFromText(text, { rowIndex, colIndex, clipRows, clipCols })
  }, [getSelectionBounds, doPasteFromText, form, postingAccounts])

  const watched = useWatch({
    control: form.control,
    name: [
      'voucher_type',
      'payment_method',
      'project_id',
      'voucher_date',
      'province_code',
      'location_code',
      'office_id',
      'expenditure_account_id',
      'currency',
    ],
  })
  const watchVoucherType = watched?.[0] ?? 'payment'
  const watchPaymentMethod = watched?.[1] ?? 'cash'
  const watchProjectId = watched?.[2]
  const watchVoucherDate = watched?.[3]
  const watchProvinceCode = watched?.[4]
  const watchLocationCode = watched?.[5]
  const watchOfficeId = watched?.[6]
  const watchExpenditureId = (watched?.[7] as number | undefined) ?? 0
  const currency = ((watched?.[8] as string) || '').trim() || 'AFN'

  const fiscalYearForDate = React.useMemo(
    () =>
      watchVoucherDate && fiscalYears.length > 0 ? findFiscalYearForDate(fiscalYears, watchVoucherDate) : null,
    [fiscalYears, watchVoucherDate]
  )
  /** Span of all defined fiscal years — date picker can move across FYs; FY label updates from the chosen date. */
  const fiscalYearsCalendarBounds = React.useMemo(() => {
    if (!fiscalYears.length) return { min: undefined as string | undefined, max: undefined as string | undefined }
    let min = fiscalYears[0].start_date.split('T')[0]
    let max = fiscalYears[0].end_date.split('T')[0]
    for (const y of fiscalYears) {
      const s = y.start_date.split('T')[0]
      const e = y.end_date.split('T')[0]
      if (s < min) min = s
      if (e > max) max = e
    }
    return { min, max }
  }, [fiscalYears])
  const dateOutsideFiscalRange = Boolean(fiscalYears.length > 0 && watchVoucherDate && !fiscalYearForDate)

  const watchLines = useWatch({ control: form.control, name: 'lines', defaultValue: form.getValues('lines') })
  const watchExchangeRate = useWatch({ control: form.control, name: 'exchange_rate', defaultValue: 1 }) ?? 1
  const baseCurrencyCode = organization?.default_currency ?? 'AFN'
  const baseIso = getCurrencyIsoCode(baseCurrencyCode)
  /** Raw currency code on the selected expense (debit) account — drives foreign mode without relying on the Currency field alone. */
  const expenditureAccountCurrencyCode = React.useMemo(() => {
    const acc = postingAccounts.find((a) => a.id === watchExpenditureId)
    return ((acc as ChartOfAccount & { currency_code?: string })?.currency_code ?? '').trim() || baseCurrencyCode
  }, [watchExpenditureId, postingAccounts, baseCurrencyCode])
  const expenditureAccountCurrencyIso = React.useMemo(
    () => getCurrencyIsoCode(expenditureAccountCurrencyCode),
    [expenditureAccountCurrencyCode]
  )
  const debitIsForeignVsBase =
    watchExpenditureId > 0 &&
    organization?.enable_multi_currency !== false &&
    expenditureAccountCurrencyCode.toUpperCase() !== baseCurrencyCode.trim().toUpperCase()
  const foreignIso = React.useMemo(() => {
    if (debitIsForeignVsBase && watchExpenditureId > 0) {
      return getCurrencyIsoCode(expenditureAccountCurrencyCode)
    }
    return getCurrencyIsoCode(currency)
  }, [debitIsForeignVsBase, watchExpenditureId, expenditureAccountCurrencyCode, currency])
  const isForeignTxn =
    (currency.trim().toUpperCase() !== baseCurrencyCode.trim().toUpperCase() && organization?.enable_multi_currency !== false) ||
    debitIsForeignVsBase

  /** When expense account is non-base, voucher currency follows the debit account (no separate Currency picker needed). */
  useEffect(() => {
    if (organization?.enable_multi_currency === false) return
    if (watchExpenditureId <= 0) return
    const acc = postingAccounts.find((a) => a.id === watchExpenditureId)
    const code = ((acc as ChartOfAccount & { currency_code?: string })?.currency_code ?? '').trim() || baseCurrencyCode
    const cur = (form.getValues('currency') || baseCurrencyCode).trim()
    if (code.toUpperCase() !== baseCurrencyCode.trim().toUpperCase()) {
      if (cur.toUpperCase() !== code.toUpperCase()) {
        form.setValue('currency', code, { shouldValidate: true, shouldDirty: true })
      }
    } else if (cur.toUpperCase() !== baseCurrencyCode.trim().toUpperCase()) {
      form.setValue('currency', baseCurrencyCode, { shouldValidate: true, shouldDirty: true })
    }
  }, [watchExpenditureId, postingAccounts, baseCurrencyCode, organization?.enable_multi_currency, form])

  const totalCreditForeign = React.useMemo(() => {
    const l = watchLines ?? []
    return (Array.isArray(l) ? l : []).reduce((s, x) => s + (x.credit_amount ?? 0), 0)
  }, [watchLines])

  const creditLinesForValidation = React.useMemo(() => {
    const l = watchLines ?? []
    return (Array.isArray(l) ? l : []).filter((x) => x.account_id > 0 && (x.credit_amount ?? 0) !== 0)
  }, [watchLines])

  /** Expense (debit) account currency differs from a credit allocation account → voucher exchange rate required. */
  const exchangeRateRequiredForMixedAccounts = React.useMemo(() => {
    if (watchExpenditureId <= 0 || creditLinesForValidation.length === 0) return false
    const debitIso = getAccountCurrencyIsoForValidation(watchExpenditureId, postingAccounts, baseCurrencyCode)
    return creditLinesForValidation.some(
      (line) => getAccountCurrencyIsoForValidation(line.account_id, postingAccounts, baseCurrencyCode) !== debitIso
    )
  }, [watchExpenditureId, creditLinesForValidation, postingAccounts, baseCurrencyCode])

  const headerRateOk = Number(watchExchangeRate) >= 0.000001
  const needsHeaderRate = exchangeRateRequiredForMixedAccounts || isForeignTxn
  const crossCurrencyRateSatisfied = !needsHeaderRate || headerRateOk
  /** EXR + base columns only when foreign txn or mixed GL currencies — keeps single-currency layout clean. */
  const showCrossCurrencyColumns = needsHeaderRate

  const effectiveColWidths = React.useMemo(() => {
    if (showCrossCurrencyColumns) {
      if (colWidths.length >= 7) return colWidths
      return isForeignTxn ? [...DEFAULT_COL_WIDTHS_FOREIGN] : [...DEFAULT_COL_WIDTHS]
    }
    const five = colWidths.slice(0, 5)
    const sum = five.reduce((a, b) => a + b, 0)
    if (sum < 1) return [...DEFAULT_COL_WIDTHS_FIVE]
    return five.map((w) => Math.round(((w * 96) / sum) * 10) / 10)
  }, [showCrossCurrencyColumns, isForeignTxn, colWidths])

  /** Last column index in the sheet (0-based) for selection / keyboard. */
  const maxDataColIndex = showCrossCurrencyColumns ? 6 : 4

  const allocationTableHeaderItems = React.useMemo(() => {
    const amountLabel =
      showCrossCurrencyColumns && isForeignTxn ? `AMOUNT (${baseIso})` : 'AMOUNT (±)'
    const row: Array<string | { label: string; required: boolean }> = [
      'ACCOUNT',
      'PROJECT CODE',
      'DESCRIPTION',
      { label: 'COST CENTER', required: !!organization?.cost_center_mandatory },
      amountLabel,
    ]
    if (showCrossCurrencyColumns) {
      row.push('EXR', isForeignTxn ? `FOREIGN (${foreignIso})` : `BASE (${baseIso})`)
    }
    return row
  }, [organization?.cost_center_mandatory, showCrossCurrencyColumns, baseIso, isForeignTxn, foreignIso])

  useEffect(() => {
    if (showCrossCurrencyColumns) return
    setSheetSelection((prev) => {
      if (!prev) return null
      const nc = (c: number) => Math.min(c, 4)
      const sc = nc(prev.startCol)
      const ec = nc(prev.endCol)
      if (sc === prev.startCol && ec === prev.endCol) return prev
      return { ...prev, startCol: sc, endCol: ec }
    })
  }, [showCrossCurrencyColumns])

  /** Backend: base_currency_amount = transaction_total × exchange_rate (rate = base per 1 unit of transaction currency). */
  const baseEquivFromRate = React.useMemo(() => {
    const r = Number(watchExchangeRate)
    if (!Number.isFinite(r) || r <= 0) return 0
    return totalCreditForeign * r
  }, [totalCreditForeign, watchExchangeRate])

  /** User-facing: 1 base = X foreign → stored rate = 1/X (base per foreign). */
  const foreignPerBaseDisplay = React.useMemo(() => {
    const r = Number(watchExchangeRate)
    if (!Number.isFinite(r) || r <= 0) return 1
    return 1 / r
  }, [watchExchangeRate])

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects-list-voucher-all'],
    queryFn: () => getProjects({ per_page: 500, status: 'active', all_offices: true }),
    enabled: open || embedded,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: (prev) => prev,
  })

  const { data: costCentersData } = useQuery({
    queryKey: ['cost-centers-tree-voucher', watchProjectId],
    queryFn: () => getCostCenters({ tree: true, project_id: watchProjectId! }),
    enabled: (open || embedded) && watchProjectId != null,
    staleTime: 2 * 60 * 1000,
  })

  const costCenterOptions = React.useMemo(() => {
    if (watchProjectId == null) return []
    const tree = (costCentersData as { data?: CostCenter[] })?.data ?? []
    return flattenCostCenterTree(Array.isArray(tree) ? tree : [])
  }, [costCentersData, watchProjectId])

  const projects = React.useMemo(() => {
    const raw = Array.isArray(projectsData) ? projectsData : (projectsData as { data?: unknown[] })?.data ?? []
    const list = Array.isArray(raw) ? raw : []
    return [...list].sort((a: { project_name?: string }, b: { project_name?: string }) =>
      (a.project_name ?? '').localeCompare(b.project_name ?? '', undefined, { sensitivity: 'base' })
    )
  }, [projectsData])

  useEffect(() => {
    if (!open) journalPrefillApplyRef.current = false
  }, [open])

  /** If the journal book has no stored province, infer coding-block province from the project (same rules as journal book setup). */
  useEffect(() => {
    if (isEditing) return
    if (!open) return
    if (!journalPrefill?.project_id) return
    const cur = form.getValues('province_code')?.trim()
    if (cur) return
    if (!provinces.length) return
    const proj = projects.find((x: { id: number }) => x.id === journalPrefill.project_id) as
      | {
          id: number
          location?: string | null
          locations?: string[] | null
          locations_list?: string[]
          office?: { name?: string; province?: string; code?: string }
        }
      | undefined
    if (!proj) return
    const code = matchProvinceCodeFromProject(proj, provinces)
    if (code) form.setValue('province_code', code, { shouldValidate: false })
  }, [isEditing, open, journalPrefill?.project_id, provinces, projects, form])

  /**
   * Office/Location options:
   * - With a project: only the office registered for that project (predefined at registration).
   * - No project: no office options (select a project first). Editing a legacy voucher without project shows that office only.
   */
  const officesForProject = React.useMemo(() => {
    if (watchProjectId != null) {
      const p = projects.find((x: { id: number }) => x.id === watchProjectId) as
        | { id: number; office_id?: number; office?: { id: number; name: string } }
        | undefined
      const out: { id: number; name: string; code: string }[] = []
      const oid = p?.office_id
      if (oid != null && oid > 0) {
        const match = offices.filter((o) => o.id === oid)
        if (match.length > 0) out.push(...match)
        else if (p?.office?.id === oid) {
          out.push({ id: oid, name: p.office.name, code: '' })
        }
      }
      const woid = watchOfficeId != null && watchOfficeId > 0 ? watchOfficeId : null
      if (woid != null && !out.some((o) => o.id === woid)) {
        const extra = offices.find((o) => o.id === woid)
        if (extra) out.push(extra)
      }
      return out
    }
    if (isEditing && voucher) {
      if (voucher.office_id) {
        return offices.filter((o) => o.id === voucher.office_id)
      }
      return offices
    }
    /** New voucher, no project yet: show all offices so Main Office can be pre-selected. */
    return offices
  }, [watchProjectId, watchOfficeId, projects, offices, isEditing, voucher])

  /** Must match SelectItem `value` (office_id_projectId or project id only). */
  const projectSelectValue = React.useMemo(() => {
    if (watchProjectId == null) return '__none__'
    const proj = projects.find((p: { id: number }) => p.id === watchProjectId) as
      | { id: number; office_id?: number | null }
      | undefined
    if (!proj) return String(watchProjectId)
    return projectRowSelectValue(proj, watchProjectId, watchOfficeId)
  }, [watchProjectId, watchOfficeId, projects])

  const handleProjectChange = useCallback((value: string) => {
    if (value === '__none__') {
      form.setValue('project_id', undefined)
      form.setValue('office_id', getMainOfficeId(offices), { shouldValidate: false })
      form.getValues('lines').forEach((_, i) => form.setValue(`lines.${i}.project_id`, undefined, { shouldValidate: false }))
      return
    }
    const parts = value.split('_')
    const officeId = parts.length >= 2 ? parseInt(parts[0], 10) : undefined
    const projectId = parts.length >= 2 ? parseInt(parts[1], 10) : parseInt(value, 10)
    if (Number.isNaN(projectId)) return
    if (officeId !== undefined && !Number.isNaN(officeId)) {
      form.setValue('office_id', officeId)
    } else {
      const proj = projects.find((p: { id: number; office_id?: number }) => p.id === projectId)
      if (proj?.office_id != null) form.setValue('office_id', proj.office_id)
    }
    form.setValue('project_id', projectId)
    const costCenterCode = (projects.find((p: { id: number; cost_center?: { code: string } }) => p.id === projectId) as { cost_center?: { code: string } } | undefined)?.cost_center?.code ?? ''
    form.getValues('lines').forEach((_, i) => {
      form.setValue(`lines.${i}.project_id`, projectId, { shouldValidate: false })
      if (costCenterCode) form.setValue(`lines.${i}.cost_center`, costCenterCode, { shouldValidate: false })
    })
  }, [form, projects, offices])

  /** New voucher: default Office/Location to main (head) office when list loads or office still unset. */
  useEffect(() => {
    if (isEditing) return
    if (!open) return
    if (offices.length === 0) return
    const jpOid = journalPrefill?.office_id
    if (jpOid != null && jpOid > 0) return
    const mainId = getMainOfficeId(offices)
    if (!mainId) return
    const cur = form.getValues('office_id')
    if (cur === 0 || cur === undefined || cur === null) {
      form.setValue('office_id', mainId, { shouldValidate: true, shouldDirty: false })
    }
  }, [isEditing, open, offices, journalPrefill?.office_id, form])

  /** After projects load, apply journal book the same way as choosing Programme/Project (keeps Radix Select value in sync). */
  useEffect(() => {
    if (isEditing) return
    if (!open) return
    const jpPid = journalPrefill?.project_id
    if (!jpPid || jpPid <= 0) return
    if (projects.length === 0) return
    if (journalPrefillApplyRef.current) return
    const p = projects.find((x: { id: number }) => x.id === jpPid) as
      | { id: number; office_id?: number | null }
      | undefined
    if (!p) return
    journalPrefillApplyRef.current = true
    const jpOid = journalPrefill?.office_id
    const oid =
      jpOid != null && jpOid > 0
        ? jpOid
        : p.office_id != null && p.office_id > 0
          ? p.office_id
          : 0
    const composite = oid > 0 ? `${oid}_${p.id}` : String(p.id)
    queueMicrotask(() => handleProjectChange(composite))
  }, [isEditing, open, journalPrefill?.project_id, journalPrefill?.office_id, projects, handleProjectChange])

  const handleVoucherNumberBlur = useCallback(async () => {
    const num = form.getValues('voucher_number')?.trim() ?? ''
    const officeId = form.getValues('office_id')
    if (!num || !officeId) {
      if (!num) form.clearErrors('voucher_number')
      return
    }
    setIsCheckingVoucherNumber(true)
    try {
      const { data } = await checkVoucherNumberAvailable({
        voucher_number: num,
        office_id: officeId,
        exclude_id: voucher?.id ?? undefined,
      })
      if (!data.available) {
        form.setError('voucher_number', { type: 'manual', message: 'This voucher number is already used. Please choose a unique number.' })
      } else {
        form.clearErrors('voucher_number')
      }
    } catch {
      // Network error: don't set field error; submit will validate
    } finally {
      setIsCheckingVoucherNumber(false)
    }
  }, [form, voucher?.id])

  /**
   * Next-number preview:
   * - With a project: API uses coding block (project code + province/month/year/location + sequence) — requires date + office.
   * - Without project: org-level sequence (not coding block format).
   * When project is mandatory, skip org-level preview so voucher no. always follows the selected project's coding block.
   */
  const previewBase = (open || embedded) && !isEditing
  const codingBlockPreviewReady =
    watchProjectId != null &&
    Boolean(watchVoucherDate?.trim()) &&
    (watchOfficeId ?? 0) > 0
  /** Org-level next number (no coding block) only when project is not required */
  const orgLevelPreviewAllowed = !organization?.project_mandatory && watchProjectId == null
  const canPreviewNumber =
    previewBase && (codingBlockPreviewReady || orgLevelPreviewAllowed)

  const { data: previewData, isFetching: isPreviewLoading } = useQuery({
    queryKey: ['voucher-next-preview', watchProjectId, watchVoucherDate, watchOfficeId, watchVoucherType],
    queryFn: () =>
      getNextVoucherNumberPreview({
        project_id: watchProjectId ?? undefined,
        voucher_date: watchVoucherDate || undefined,
        office_id: watchOfficeId && watchOfficeId > 0 ? watchOfficeId : undefined,
        voucher_type: watchVoucherType || 'payment',
      }),
    enabled: canPreviewNumber,
  })
  const nextVoucherNumberPreview = previewData?.data?.next_voucher_number ?? null

  /** When programme/project changes, clear voucher no. so the next preview (coding block for that project) replaces it */
  const prevProjectIdForVoucherRef = React.useRef<number | undefined | null>(null)
  useEffect(() => {
    if (isEditing) return
    if (prevProjectIdForVoucherRef.current === null) {
      prevProjectIdForVoucherRef.current = watchProjectId
      return
    }
    if (prevProjectIdForVoucherRef.current !== watchProjectId) {
      prevProjectIdForVoucherRef.current = watchProjectId
      form.setValue('voucher_number', '', { shouldValidate: false })
    }
  }, [watchProjectId, isEditing, form])

  /**
   * Auto-fill voucher number from server preview (coding block when project is selected).
   */
  useEffect(() => {
    if (isEditing || !nextVoucherNumberPreview) return
    if (!open) return
    form.setValue('voucher_number', nextVoucherNumberPreview, { shouldValidate: false })
  }, [nextVoucherNumberPreview, isEditing, open, form])

  useEffect(() => {
    const b = getSelectionBounds()
    selectionBoundsRef.current = b
  }, [sheetSelection, getSelectionBounds])

  useEffect(() => {
    return () => {
      if (selectionRafRef.current != null) cancelAnimationFrame(selectionRafRef.current)
    }
  }, [])

  useEffect(() => {
    const onUp = () => {
      const wasSelecting = selectingRef.current
      selectingRef.current = false
      if (wasSelecting && mousedownCellRef.current && voucherTableRef.current) {
        const sel = selectionBoundsRef.current
        if (sel && sel.minR === sel.maxR && sel.minC === sel.maxC && sel.minR === mousedownCellRef.current.rowIndex && sel.minC === mousedownCellRef.current.colIndex) {
          const tr = voucherTableRef.current.querySelector(`tbody tr[data-row-index="${mousedownCellRef.current.rowIndex}"]`)
          const td = tr?.querySelector(`td[data-col-index="${mousedownCellRef.current.colIndex}"]`)
          const focusable = td?.querySelector<HTMLInputElement | HTMLButtonElement>('input, [role="combobox"]')
          if (focusable) {
            (focusable as HTMLElement).focus()
            if (focusable instanceof HTMLInputElement && mousedownCellRef.current.colIndex === 4) focusable.select()
          }
        }
        mousedownCellRef.current = null
      }
    }
    window.addEventListener('mouseup', onUp)
    return () => window.removeEventListener('mouseup', onUp)
  }, [])

  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    const onMouseDown = (e: MouseEvent) => {
      if (contextMenuRef.current?.contains(e.target as Node)) return
      close()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('mousedown', onMouseDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('mousedown', onMouseDown, true)
    }
  }, [contextMenu])

  const handleSheetCellMouseDown = useCallback((e: React.MouseEvent) => {
    const td = (e.target as HTMLElement).closest('td[data-col-index]')
    if (!td) return
    const tr = td.closest('tr[data-row-index]')
    if (!tr) return
    const colIndex = parseInt(td.getAttribute('data-col-index') ?? '', 10)
    if (colIndex > maxDataColIndex) return
    const rowIndex = parseInt(tr.getAttribute('data-row-index') ?? '', 10)
    mousedownCellRef.current = { rowIndex, colIndex }
    selectionBoundsRef.current = { minR: rowIndex, maxR: rowIndex, minC: colIndex, maxC: colIndex }
    setSheetSelection({ startRow: rowIndex, startCol: colIndex, endRow: rowIndex, endCol: colIndex })
    selectingRef.current = true
  }, [maxDataColIndex])

  const handleSheetCellMouseEnter = useCallback((e: React.MouseEvent) => {
    const td = (e.target as HTMLElement).closest('td[data-col-index]')
    if (!td) return
    const tr = td.closest('tr[data-row-index]')
    if (!tr) return
    const colIndex = parseInt(td.getAttribute('data-col-index') ?? '', 10)
    if (colIndex > maxDataColIndex) return
    const rowIndex = parseInt(tr.getAttribute('data-row-index') ?? '', 10)
    if (!selectingRef.current) return
    pendingSelectionRef.current = { rowIndex, colIndex }
    if (selectionRafRef.current == null) {
      selectionRafRef.current = requestAnimationFrame(() => {
        selectionRafRef.current = null
        const pending = pendingSelectionRef.current
        if (pending == null) return
        setSheetSelection((prev) => {
          if (!prev) return null
          const next = { ...prev, endRow: pending.rowIndex, endCol: pending.colIndex }
          selectionBoundsRef.current = {
            minR: Math.min(next.startRow, next.endRow),
            maxR: Math.max(next.startRow, next.endRow),
            minC: Math.min(next.startCol, next.endCol),
            maxC: Math.max(next.startCol, next.endCol),
          }
          return next
        })
      })
    }
  }, [maxDataColIndex])

  const handleSheetContextMenu = useCallback((e: React.MouseEvent) => {
    const td = (e.target as HTMLElement).closest('td[data-col-index]')
    if (td) {
      const tr = td.closest('tr[data-row-index]')
      const colIndex = parseInt(td.getAttribute('data-col-index') ?? '', 10)
      if (tr && colIndex <= maxDataColIndex) {
        const rowIndex = parseInt(tr.getAttribute('data-row-index') ?? '', 10)
        setSheetSelection({ startRow: rowIndex, startCol: colIndex, endRow: rowIndex, endCol: colIndex })
      }
    }
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [maxDataColIndex])

  // Reset form when dialog opens/closes or voucher changes. Omit form from deps to avoid infinite loop.
  useEffect(() => {
    if (!open) return
    if (voucher) {
      const debitLine = voucher.lines?.find((l: { debit_amount?: number }) => (l.debit_amount ?? 0) !== 0)
      const creditOnlyLines = voucher.lines?.filter((l: { credit_amount?: number }) => (l.credit_amount ?? 0) !== 0) ?? []
      const linesForForm = creditOnlyLines.length > 0 ? creditOnlyLines : (voucher.lines ?? [])
      form.reset({
        office_id: voucher.office_id,
        expenditure_account_id: debitLine ? (debitLine as { account_id: number }).account_id : 0,
        project_id: voucher.project_id || undefined,
        fund_id: voucher.fund_id || undefined,
        province_code: (voucher as { province_code?: string }).province_code || undefined,
        location_code: (voucher as { location_code?: string }).location_code || undefined,
        voucher_number: voucher.voucher_number || '',
        voucher_type: voucher.voucher_type,
        voucher_date: voucher.voucher_date,
        payee_name: voucher.payee_name || '',
        description: voucher.description,
        currency: voucher.currency,
        exchange_rate: voucher.exchange_rate,
        payment_method: voucher.payment_method || 'cash',
        check_number: voucher.check_number || '',
        bank_reference: voucher.bank_reference || '',
        tax_amount: (voucher as { tax_amount?: number }).tax_amount ?? 0,
        lines: linesForForm.map((line: { account_id: number; fund_id?: number; project_id?: number; description?: string; debit_amount?: number; credit_amount?: number; cost_center?: string; project_account_code?: string }) => ({
          account_id: line.account_id,
          fund_id: line.fund_id,
          project_id: line.project_id,
          description: line.description || '',
          debit_amount: 0,
          credit_amount: line.credit_amount ?? 0,
          cost_center: (line as { cost_center?: string }).cost_center || '',
          project_account_code: (line as { project_account_code?: string }).project_account_code || '',
          line_type: 'credit' as const,
        })) || [
          { account_id: 0, debit_amount: 0, credit_amount: 0, description: '', cost_center: '', project_account_code: '', line_type: 'credit' as const },
          { account_id: 0, debit_amount: 0, credit_amount: 0, description: '', cost_center: '', project_account_code: '', line_type: 'credit' as const },
        ],
      })
    } else {
      const defaultCurrency = organization?.default_currency ?? 'AFN'
      const jp = journalPrefill
      const prefOffice = jp?.office_id != null && jp.office_id > 0 ? jp.office_id : 0
      const prefProject = jp?.project_id != null && jp.project_id > 0 ? jp.project_id : undefined
      const prefProvince = jp?.province_code?.trim() ? jp.province_code.trim() : undefined
      const prefCurrency = jp?.currency?.trim() ? jp.currency.trim().toUpperCase() : defaultCurrency
      const prefExr = jp?.exchange_rate != null && jp.exchange_rate > 0 ? jp.exchange_rate : 1
      const prefDesc = jp?.voucher_description_template?.trim() ? jp.voucher_description_template.trim() : ''
      form.reset({
        office_id: prefOffice,
        project_id: prefProject,
        fund_id: jp?.fund_id != null && jp.fund_id > 0 ? jp.fund_id : undefined,
        province_code: prefProvince,
        location_code: jp?.location_code ?? undefined,
        expenditure_account_id: 0,
        voucher_number: '',
        voucher_type: voucherTypeFromJournalPrefill(jp?.voucher_type),
        voucher_date: new Date().toISOString().split('T')[0],
        payee_name: jp?.default_payee_name?.trim() ?? '',
        description: prefDesc,
        currency: prefCurrency,
        exchange_rate: prefExr,
        payment_method: paymentMethodFromJournalPrefill(jp?.payment_method),
        tax_amount: 0,
        lines: getDefaultVoucherLines(),
      })
      journalPrefillApplyRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form omitted to prevent reset loop
    // Do NOT depend on organization?.default_currency: when org hydrates later it would reset the whole form and clear project/office.
    // Primitive deps only — `journalPrefill` object identity changes every parent render if not memoized.
  }, [
    open,
    embedded,
    voucher?.id,
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
  ])
  // When multi-currency is disabled, enforce base currency
  useEffect(() => {
    if (open && organization?.enable_multi_currency === false && !voucher?.id) {
      const base = organization?.default_currency ?? 'AFN'
      form.setValue('currency', base)
    }
  }, [open, organization?.enable_multi_currency, organization?.default_currency, voucher?.id, form])

  // Focus the allocation grid (not the account combobox) so the first view stays clean — no open dropdown.
  useEffect(() => {
    if (!open) return
    if (voucher) return
    if (readOnly) return
    const t = setTimeout(() => {
      voucherTableRef.current?.focus()
    }, 100)
    return () => clearTimeout(t)
  }, [open, embedded, voucher?.id, readOnly])

  useEffect(() => {
    if (!open && !embedded) {
      fiscalDateInitRef.current = false
    }
  }, [open, embedded])

  /** New voucher only: once fiscal years load, move transaction date into a valid year (coding block + posting). */
  useEffect(() => {
    if (isEditing) return
    if (!(open || embedded)) return
    if (!fiscalYears.length) return
    if (fiscalDateInitRef.current) return
    const d = form.getValues('voucher_date')
    if (!findFiscalYearForDate(fiscalYears, d || '')) {
      const fy = pickDefaultFiscalYear(fiscalYears)
      if (fy) {
        form.setValue('voucher_date', suggestedDateInFiscalYear(fy), { shouldValidate: true })
      }
    }
    fiscalDateInitRef.current = true
  }, [isEditing, open, embedded, fiscalYears, form])

  const handleSubmit = async (values: VoucherFormValues) => {
    if (readOnly) return
    form.clearErrors('root')
    const expenditureId = values.expenditure_account_id ?? 0
    const creditOnlyLines = values.lines.filter(line => line.account_id > 0 && (line.credit_amount ?? 0) !== 0)
    const linesToValidate = expenditureId > 0 && creditOnlyLines.length > 0
      ? [
          { account_id: expenditureId, debit_amount: creditOnlyLines.reduce((s, l) => s + (l.credit_amount || 0), 0), credit_amount: 0 },
          ...creditOnlyLines.map(l => ({ account_id: l.account_id, debit_amount: 0, credit_amount: l.credit_amount ?? 0 })),
        ]
      : values.lines
    const validation = validateVoucher(linesToValidate)
    if (!validation.isValid) {
      form.setError('lines', { type: 'manual', message: `Totals must balance. Debit ${validation.totalDebit.toFixed(2)} ≠ Credit ${validation.totalCredit.toFixed(2)}.` })
      return
    }
    if (fiscalYears.length > 0 && values.voucher_date) {
      const fy = findFiscalYearForDate(fiscalYears, values.voucher_date)
      if (!fy) {
        form.setError('voucher_date', {
          type: 'manual',
          message:
            'Transaction date must fall within a defined fiscal year. Adjust the date to match a period created under General Ledger → Fiscal years.',
        })
        return
      }
    }
    // Organization-based validation for mandatory fields
    if (organization?.project_mandatory && !values.project_id) {
      form.setError('project_id', { type: 'manual', message: 'Project is required by organization settings.' })
      return
    }
    if (organization?.cost_center_mandatory) {
      const linesToSubmit = values.lines.filter(line => line.account_id > 0 && ((line.debit_amount ?? 0) !== 0 || (line.credit_amount ?? 0) !== 0))
      const missingCostCenter = linesToSubmit.some((line, i) => !line.cost_center?.trim())
      if (missingCostCenter) {
        form.setError('lines', { type: 'manual', message: 'Cost center is required on all lines by organization settings.' })
        return
      }
    }
    let linesForApi: Array<{ account_id: number; debit_amount: number; credit_amount: number; description?: string; project_id?: number; fund_id?: number; cost_center?: string; project_account_code?: string }>
    if (expenditureId > 0 && creditOnlyLines.length > 0) {
      const totalCredit = creditOnlyLines.reduce((s, l) => s + (l.credit_amount || 0), 0)
      /** Backend validates every line when cost_center is mandatory; mirror first allocation line. */
      const debitCostCenter =
        creditOnlyLines.map((l) => l.cost_center?.trim()).find((c) => !!c) ?? ''
      const debitProjectAccount =
        creditOnlyLines.map((l) => l.project_account_code?.trim()).find((c) => !!c) ?? ''
      const debitLine = {
        account_id: expenditureId,
        fund_id: values.fund_id ?? undefined,
        project_id: values.project_id ?? undefined,
        description: values.description,
        debit_amount: totalCredit,
        credit_amount: 0,
        cost_center: debitCostCenter,
        project_account_code: debitProjectAccount,
      }
      linesForApi = [
        debitLine,
        ...creditOnlyLines.map(({ line_type: _lt, fund_id, ...line }) => ({
          ...line,
          fund_id: fund_id ?? undefined,
          debit_amount: 0,
          description: line.description || values.description,
          project_id: line.project_id ?? values.project_id ?? undefined,
        })),
      ]
    } else {
      const filteredLines = values.lines.filter(line => line.account_id > 0 && ((line.debit_amount ?? 0) !== 0 || (line.credit_amount ?? 0) !== 0))
      linesForApi = filteredLines.map(({ line_type: _lt, fund_id, ...line }) => ({
        ...line,
        fund_id: fund_id ?? undefined,
        description: line.description || values.description,
        project_id: line.project_id ?? values.project_id ?? undefined,
      }))
    }
    const voucherNumberTrimmed = values.voucher_number?.trim() || undefined
    const { expenditure_account_id: _exp, ...restValues } = values
    const data: VoucherFormData = {
      ...restValues,
      currency: (values.currency || 'AFN').trim().toUpperCase(),
      province_code: values.province_code || undefined,
      location_code: values.location_code || undefined,
      voucher_number: voucherNumberTrimmed ?? undefined,
      payee_name: values.payee_name?.trim() || undefined,
      lines: linesForApi,
      ...(!isEditing &&
        journalPrefill?.journal_id != null &&
        journalPrefill.journal_id > 0 && { journal_id: journalPrefill.journal_id }),
    }
    const saveAndNew = embedded && saveAndNewRef.current
    try {
      await onSubmit(data, saveAndNew ? true : undefined)
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, '')
      if (msg.toLowerCase().includes('voucher number') && msg.toLowerCase().includes('already used')) {
        form.setError('voucher_number', { type: 'manual', message: 'This voucher number is already used. Please choose a unique number.' })
      } else if (msg) {
        form.setError('root', { type: 'manual', message: msg })
      }
      throw err
    }
    if (embedded && saveAndNew) {
      const jp = journalPrefill
      const prefOffice = jp?.office_id != null && jp.office_id > 0 ? jp.office_id : 0
      const officeIdAfterSave = prefOffice > 0 ? prefOffice : getMainOfficeId(offices)
      const prefProject = jp?.project_id != null && jp.project_id > 0 ? jp.project_id : undefined
      const prefProvince = jp?.province_code?.trim() ? jp.province_code.trim() : undefined
      const defaultCurrency = organization?.default_currency ?? 'AFN'
      const prefCurrency = jp?.currency?.trim() ? jp.currency.trim().toUpperCase() : defaultCurrency
      const prefExr = jp?.exchange_rate != null && jp.exchange_rate > 0 ? jp.exchange_rate : 1
      const prefDesc = jp?.voucher_description_template?.trim() ? jp.voucher_description_template.trim() : ''
      journalPrefillApplyRef.current = false
      fiscalDateInitRef.current = false
      form.reset({
        office_id: officeIdAfterSave,
        project_id: prefProject,
        fund_id: jp?.fund_id != null && jp.fund_id > 0 ? jp.fund_id : undefined,
        province_code: prefProvince,
        location_code: jp?.location_code ?? undefined,
        expenditure_account_id: 0,
        voucher_number: '',
        voucher_type: voucherTypeFromJournalPrefill(jp?.voucher_type),
        voucher_date: new Date().toISOString().split('T')[0],
        payee_name: jp?.default_payee_name?.trim() ?? '',
        description: prefDesc,
        currency: prefCurrency,
        exchange_rate: prefExr,
        payment_method: paymentMethodFromJournalPrefill(jp?.payment_method),
        tax_amount: 0,
        lines: getDefaultVoucherLines(),
      })
      saveAndNewRef.current = false
    } else if (embedded) onSuccess?.()
    else onOpenChange?.(false)
  }

  const addLine = (asCredit = true) => {
    const projectId = form.getValues('project_id') ?? undefined
    append({
      account_id: 0,
      debit_amount: 0,
      credit_amount: 0,
      description: form.getValues('description') || '',
      cost_center: '',
      project_account_code: '',
      line_type: asCredit ? 'credit' : 'debit',
      project_id: projectId,
    })
  }

  const getCellValueForCopy = useCallback(
    (r: number, c: number): string => {
      const lines = form.getValues('lines')
      const line = lines[r]
      if (!line) return ''
      const baseCur = organization?.default_currency ?? 'AFN'
      const exr = Number(form.getValues('exchange_rate') ?? 1)
      const foreignPer = Number.isFinite(exr) && exr > 0 ? 1 / exr : 1
      const expId = form.getValues('expenditure_account_id') ?? 0
      const debitIso = getAccountCurrencyIsoForValidation(expId, postingAccounts, baseCur)
      const curr = (form.getValues('currency') || 'AFN').trim()
      const isForeign =
        curr.toUpperCase() !== baseCur.trim().toUpperCase() && organization?.enable_multi_currency !== false
      if (c === 0) {
        const acc = postingAccounts.find((a: ChartOfAccount) => a.id === line.account_id)
        return acc ? (acc.account_code ?? '') : ''
      }
      if (c === 1) return String(line.project_account_code ?? '')
      if (c === 2) return String(line.description ?? '')
      if (c === 3) return String(line.cost_center ?? '')
      if (c === 4) {
        const cred = line.credit_amount ?? 0
        const rate = Number(form.getValues('exchange_rate') ?? 1)
        if (isForeignTxn && showCrossCurrencyColumns) {
          const base = Number.isFinite(rate) && rate > 0 ? cred * rate : 0
          return formatAmountCell(base)
        }
        return formatAmountCell(cred)
      }
      if (!showCrossCurrencyColumns && (c === 5 || c === 6)) return ''
      if (c === 5) {
        if (isForeignTxn && showCrossCurrencyColumns) {
          const r = Number(form.getValues('exchange_rate') ?? 1)
          const fp = Number.isFinite(r) && r > 0 ? 1 / r : 0
          return fp > 0 ? fp.toFixed(6) : ''
        }
        const accountId = line.account_id ?? 0
        const cred = line.credit_amount ?? 0
        if (cred === 0 || accountId <= 0) return ''
        const lineIso = getAccountCurrencyIsoForValidation(accountId, postingAccounts, baseCur)
        const show = lineIso !== debitIso || isForeign
        return show && Number.isFinite(foreignPer) && foreignPer > 0 ? foreignPer.toFixed(6) : ''
      }
      if (c === 6) {
        const cred = line.credit_amount ?? 0
        const rate = Number(form.getValues('exchange_rate') ?? 1)
        if (isForeignTxn && showCrossCurrencyColumns) {
          return Math.abs(cred) > 0.000001 ? formatCurrencyAmountOnly(cred, curr) : ''
        }
        const baseExch = Number.isFinite(rate) && rate > 0 ? cred * rate : 0
        return Math.abs(baseExch) > 0.000001 ? formatCurrencyAmountOnly(baseExch, baseCur) : ''
      }
      return ''
    },
    [form, postingAccounts, organization?.default_currency, organization?.enable_multi_currency, showCrossCurrencyColumns, isForeignTxn]
  )

  const getCopyText = useCallback((): string => {
    const bounds = getSelectionBounds()
    if (!bounds) return ''
    const lines = form.getValues('lines')
    const rows: string[] = []
    for (let r = bounds.minR; r <= bounds.maxR && r < lines.length; r++) {
      const cells: string[] = []
      for (let c = bounds.minC; c <= bounds.maxC; c++) {
        cells.push(getCellValueForCopy(r, c))
      }
      rows.push(cells.join('\t'))
    }
    return rows.join('\r\n')
  }, [getSelectionBounds, getCellValueForCopy, form])

  const handleSheetCopy = useCallback((e: React.ClipboardEvent) => {
    const text = getCopyText()
    if (!text) return
    e.preventDefault()
    e.clipboardData.setData('text/plain', text)
  }, [getCopyText])

  const handleSheetCut = useCallback((e: React.ClipboardEvent) => {
    const text = getCopyText()
    if (text) {
      e.preventDefault()
      e.clipboardData.setData('text/plain', text)
    }
    const bounds = getSelectionBounds()
    if (!bounds) return
    const fieldKeys = ['project_account_code', 'description', 'cost_center', 'credit_amount'] as const
    for (let r = bounds.minR; r <= bounds.maxR; r++) {
      for (let c = bounds.minC; c <= bounds.maxC; c++) {
        if (c === 0) form.setValue(`lines.${r}.account_id`, 0, { shouldValidate: false })
        else if (c >= 1 && c <= 4) {
          const key = fieldKeys[c - 1]
          if (key === 'credit_amount') {
            form.setValue(`lines.${r}.credit_amount`, 0, { shouldValidate: false })
            form.setValue(`lines.${r}.debit_amount`, 0, { shouldValidate: false })
          } else form.setValue(`lines.${r}.${key}` as any, '', { shouldValidate: false })
        }
      }
    }
  }, [getCopyText, getSelectionBounds, form])

  const clearSelectionCells = useCallback(() => {
    const bounds = getSelectionBounds()
    if (!bounds) return
    const fieldKeys = ['project_account_code', 'description', 'cost_center', 'credit_amount'] as const
    for (let r = bounds.minR; r <= bounds.maxR; r++) {
      for (let c = bounds.minC; c <= bounds.maxC; c++) {
        if (c === 0) form.setValue(`lines.${r}.account_id`, 0, { shouldValidate: false })
        else if (c >= 1 && c <= 4) {
          const key = fieldKeys[c - 1]
          if (key === 'credit_amount') {
            form.setValue(`lines.${r}.credit_amount`, 0, { shouldValidate: false })
            form.setValue(`lines.${r}.debit_amount`, 0, { shouldValidate: false })
          } else form.setValue(`lines.${r}.${key}` as any, '', { shouldValidate: false })
        }
      }
    }
  }, [getSelectionBounds, form])

  const selectionBounds = React.useMemo(() => getSelectionBounds(), [sheetSelection])
  /** Per-row selection with stable refs so only rows whose selection state changes re-render */
  const selectionForRowsRef = useRef<Record<string, { minC: number; maxC: number }>>({})
  const selectionForRows = React.useMemo((): SelectionForRow[] => {
    const b = getSelectionBounds()
    const len = fields.length
    if (!b) return Array(len).fill(null)
    const out: SelectionForRow[] = []
    const key = `${b.minC},${b.maxC}`
    if (!selectionForRowsRef.current[key]) selectionForRowsRef.current[key] = { minC: b.minC, maxC: b.maxC }
    const slice = selectionForRowsRef.current[key]
    for (let i = 0; i < len; i++) {
      out.push(i >= b.minR && i <= b.maxR ? slice : null)
    }
    return out
  }, [sheetSelection, fields.length, getSelectionBounds])

  /** Injected inside the white footer block below the table (not a separate strip). */
  const exchangeRateFooterPanel = React.useMemo(() => {
    if (!needsHeaderRate) return null
    return (
      <div className="w-full" aria-label="Exchange rate and base equivalent">
        {isForeignTxn ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between gap-x-4">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 min-w-0">
              <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                Exchange rate (1 {baseIso}) =
              </span>
              <div className="flex h-7 items-stretch overflow-hidden rounded-none border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900">
                <Input
                  id="exchange_rate_foreign_per_base"
                  type="number"
                  step="0.000001"
                  min={0.000001}
                  disabled={isLoading}
                  value={Number.isFinite(foreignPerBaseDisplay) ? foreignPerBaseDisplay : 1}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value)
                    if (!Number.isFinite(v) || v <= 0) return
                    form.setValue('exchange_rate', 1 / v, { shouldValidate: true, shouldDirty: true })
                  }}
                  className="voucher-form-input h-7 w-[7.5rem] min-w-0 rounded-none border-0 bg-white px-2 py-0 text-xs font-mono tabular-nums dark:bg-slate-900"
                  aria-label={`How many ${foreignIso} equal one ${baseIso}`}
                />
                <span
                  className="flex min-w-[2.75rem] shrink-0 items-center justify-center border-l border-[#172554] bg-[#1E3A8A] px-2 text-[10px] font-bold uppercase tracking-wide text-white"
                  title={`Transaction currency: ${foreignIso}`}
                >
                  {foreignIso}
                </span>
              </div>
              {form.formState.errors.exchange_rate && (
                <p className="text-[10px] text-destructive w-full sm:w-auto">{form.formState.errors.exchange_rate.message}</p>
              )}
            </div>
            <div className="flex flex-col items-start sm:items-end gap-0.5 text-[11px] min-w-0">
              <span className="font-medium text-foreground tabular-nums">
                Exchanged amount ({baseIso}):{' '}
                <span className="font-mono font-semibold">{formatCurrency(baseEquivFromRate, baseCurrencyCode)}</span>
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums break-all text-left sm:text-right max-w-full">
                {formatCurrencyAmountOnly(totalCreditForeign, currency)} ({foreignIso}) ×{' '}
                {Number.isFinite(Number(watchExchangeRate)) ? Number(watchExchangeRate).toFixed(6) : '—'} ({baseIso} per {foreignIso}) ={' '}
                {formatCurrencyAmountOnly(baseEquivFromRate, baseCurrencyCode)} ({baseIso})
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between gap-x-4">
            <div className="flex flex-col gap-1.5 min-w-0 sm:max-w-[22rem]">
              <p className="text-[10px] text-muted-foreground leading-snug">
                Expense and credit accounts use different currencies. Set the rate so base amounts balance.
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">Exchange rate (1 {baseIso}) =</span>
                <div className="flex h-7 items-stretch overflow-hidden rounded-none border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900">
                  <Input
                    id="exchange_rate_mixed_accounts"
                    type="number"
                    step="0.000001"
                    min={0.000001}
                    disabled={isLoading}
                    value={Number.isFinite(foreignPerBaseDisplay) ? foreignPerBaseDisplay : 1}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value)
                      if (!Number.isFinite(v) || v <= 0) return
                      form.setValue('exchange_rate', 1 / v, { shouldValidate: true, shouldDirty: true })
                    }}
                    className="voucher-form-input h-7 w-[7.5rem] min-w-0 rounded-none border-0 bg-white px-2 py-0 text-xs font-mono tabular-nums dark:bg-slate-900"
                    aria-label={`Units of ${foreignIso} per one ${baseIso}`}
                  />
                  <span
                    className="flex min-w-[2.75rem] shrink-0 items-center justify-center border-l border-[#172554] bg-[#1E3A8A] px-2 text-[10px] font-bold uppercase tracking-wide text-white"
                    title={`Transaction currency: ${foreignIso}`}
                  >
                    {foreignIso}
                  </span>
                </div>
                {form.formState.errors.exchange_rate && (
                  <p className="text-[10px] text-destructive w-full">{form.formState.errors.exchange_rate.message}</p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-0.5 text-[11px] min-w-0">
              <span className="font-medium text-foreground tabular-nums">
                Base equivalent ({baseIso}):{' '}
                <span className="font-mono font-semibold">{formatCurrency(baseEquivFromRate, baseCurrencyCode)}</span>
              </span>
            </div>
          </div>
        )}
      </div>
    )
  }, [
    needsHeaderRate,
    isForeignTxn,
    baseIso,
    foreignIso,
    isLoading,
    foreignPerBaseDisplay,
    baseEquivFromRate,
    baseCurrencyCode,
    totalCreditForeign,
    currency,
    watchExchangeRate,
    form.formState.errors.exchange_rate?.message,
  ])

  /** Compact shared label height so controls align on one baseline (reduces vertical “jitter”). */
  const voucherLabelBlock = 'flex min-h-[2rem] flex-col justify-end gap-0'

  const formContent = (
    <form
      id="voucher-form"
      onSubmit={readOnly ? (e) => e.preventDefault() : form.handleSubmit(handleSubmit, onSubmitInvalid)}
      className={cn(
        'flex flex-col',
        embedded ? 'h-full min-h-0 flex-1 overflow-hidden' : 'min-h-[400px]'
      )}
    >
      <fieldset
        disabled={readOnly}
        className={cn(
          /* `fieldset` as a flex/grid parent breaks nested layout in Chromium (header row can collapse to 0px).
             `display: contents` skips the fieldset box so header + lines grid are direct flex children of <form>. */
          'contents m-0 min-w-0 border-0 p-0',
          readOnly && 'opacity-100 [&_*]:[transition:none]'
        )}
      >
          {/* Transaction details — compact, white field interiors; focused = clear selected state, no blue circle */}
          <div
            className={cn(
              'voucher-form-controls border-b border-border bg-white dark:bg-slate-900/20 py-1 shrink-0',
              embedded ? 'px-2 sm:px-3' : 'px-4'
            )}
          >
            <TooltipProvider delayDuration={200}>
            <div className="voucher-form-controls-row flex flex-wrap items-start gap-x-2 gap-y-1">
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className={voucherLabelBlock}>
                  <Label className="text-[11px] font-medium leading-tight text-muted-foreground" required={!!organization?.project_mandatory}>Programme / Project</Label>
                </div>
                <Select value={projectSelectValue} onValueChange={handleProjectChange} disabled={isLoading}>
                  <SelectTrigger className="h-7 w-[210px] bg-white dark:bg-slate-900 text-xs rounded-none border-border py-0 focus:ring-0.5 focus:ring-ring focus:ring-offset-0 focus-visible:ring-0.5 focus-visible:ring-ring"><SelectValue placeholder={projectsLoading ? 'Loading…' : 'Select programme'} /></SelectTrigger>
                  <SelectContent className="max-h-[min(20rem,70vh)] min-w-[260px] max-w-[400px]">
                    <SelectItem value="__none__">None</SelectItem>
                    {projectsLoading ? (
                      <div className="py-4 text-center text-xs text-muted-foreground">Loading projects…</div>
                    ) : (
                      projects.map((p: { id: number; office_id?: number; project_code: string; project_name: string }) => {
                        const value = projectRowSelectValue(p, watchProjectId, watchOfficeId)
                        return (
                          <SelectItem key={value} value={value}>
                            {p.project_name || p.project_code || `Project ${p.id}`}
                            {p.project_code && p.project_name && p.project_name !== p.project_code ? ` (${p.project_code})` : ''}
                          </SelectItem>
                        )
                      })
                    )}
                  </SelectContent>
                </Select>
                <div className="min-h-[1rem]">
                  {form.formState.errors.project_id && (
                    <p className="text-[11px] leading-tight text-destructive">{form.formState.errors.project_id.message}</p>
                  )}
                </div>
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className={voucherLabelBlock}>
                  <Label
                    className="text-[11px] font-semibold leading-tight tracking-wide text-muted-foreground"
                    htmlFor="expenditure_account_id"
                    required
                  >
                    Expense account (debit)
                  </Label>
                </div>
                <div className="voucher-expense-account-field flex h-7 min-w-[16.5rem] w-[min(22rem,100%)] shrink-0 items-stretch overflow-hidden rounded-none border border-border bg-white shadow-sm dark:bg-slate-900">
                  <div className="flex h-7 min-h-0 min-w-0 flex-1 bg-white dark:bg-slate-900">
                    <VoucherPostingAccountCombo
                      id="expenditure_account_id"
                      value={watchExpenditureId}
                      onChange={(id) => form.setValue('expenditure_account_id', id, { shouldValidate: true })}
                      accounts={postingAccounts}
                      accountsById={postingsById}
                      accountsTree={accountsTreeRoot}
                      allowClear={false}
                      baseCurrency={organization?.default_currency ?? 'AFN'}
                      disabled={isLoading}
                      emptyLabel="Select expense account"
                      triggerClassName={cn(
                        'h-7 min-h-0 rounded-none border-0 bg-transparent px-2.5 py-0 text-xs shadow-none',
                        'hover:bg-white dark:hover:bg-slate-900',
                        'focus-within:bg-transparent dark:focus-within:bg-transparent',
                        'focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0',
                        'outline-none focus-within:outline-none focus-within:ring-0',
                        watchExpenditureId > 0 && 'font-medium text-slate-900 dark:text-slate-50'
                      )}
                    />
                  </div>
                  <span
                    className="flex min-w-[3rem] shrink-0 grow-0 items-center justify-center self-stretch border-l border-[#172554] bg-[#1E3A8A] px-2 text-[10px] font-bold uppercase tracking-wide text-white dark:border-[#172554] dark:bg-[#1E3A8A]"
                    title={`Account currency: ${expenditureAccountCurrencyIso}`}
                  >
                    {expenditureAccountCurrencyIso}
                  </span>
                </div>
                <div className="min-h-[1rem]">
                  {form.formState.errors.expenditure_account_id && (
                    <p className="text-[10px] leading-tight text-destructive">{form.formState.errors.expenditure_account_id.message}</p>
                  )}
                </div>
              </div>
              <div className="flex w-max max-w-[10rem] shrink-0 flex-col gap-0.5">
                <div className={voucherLabelBlock}>
                  <div className="flex min-w-0 items-center gap-0.5">
                    <Label className="text-[11px] font-medium leading-tight text-muted-foreground">Office / Location</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label="Office defaults to the project main office unless you choose another."
                        >
                          <Info className="h-3 w-3" aria-hidden />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" align="start" className="max-w-xs text-left text-xs">
                        Default: main office — change if needed.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                <Select
                  value={
                    officesForProject.some((o) => o.id === watchOfficeId)
                      ? String(watchOfficeId)
                      : ''
                  }
                  onValueChange={(v) => form.setValue('office_id', parseInt(v, 10))}
                  disabled={isLoading || officesForProject.length === 0}
                >
                  <SelectTrigger
                    className={cn(
                      'h-7 min-h-[1.75rem] min-w-[6rem] max-w-[10rem] w-full justify-start gap-1.5 px-2 py-0 text-xs leading-none rounded-none border-border',
                      'focus:ring-0.5 focus:ring-ring focus:ring-offset-0 focus-visible:ring-0.5 focus-visible:ring-ring',
                      '[&>span]:min-w-0 [&>span]:truncate [&>span]:text-left [&>span]:leading-none',
                      officesForProject.length === 0 && 'opacity-70'
                    )}
                  >
                    <SelectValue
                      placeholder={
                        officesForProject.length === 0
                          ? 'No office'
                          : 'Office'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {officesForProject.map((o) => (
                      <SelectItem key={o.id} value={o.id.toString()}>
                        {o.code ? `${o.name} (${o.code})` : o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex min-w-[10rem] max-w-[14rem] shrink-0 flex-col gap-0.5">
                <div className={voucherLabelBlock}>
                  <div className="flex min-h-[1.5rem] items-center justify-between gap-2 min-w-0">
                    <Label htmlFor="voucher_number" className="text-[11px] font-medium leading-tight text-muted-foreground shrink-0" required>Voucher No.</Label>
                  {/* Fixed slot: same size when preview loads or when editing — avoids row jump */}
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center"
                    aria-hidden={!isEditing && !(nextVoucherNumberPreview || isPreviewLoading)}
                  >
                    {!isEditing && (nextVoucherNumberPreview || isPreviewLoading) ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 rounded-none text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-50"
                        disabled={isLoading || isPreviewLoading || !nextVoucherNumberPreview || voucherNumberLockedFromJournal}
                        title={
                          voucherNumberLockedFromJournal
                            ? 'Voucher number is fixed from the journal book (override requires permission)'
                            : nextVoucherNumberPreview
                              ? 'Use suggested number'
                              : 'Loading suggested…'
                        }
                        aria-label="Use suggested voucher number"
                        onClick={() => {
                          if (nextVoucherNumberPreview) {
                            form.setValue('voucher_number', nextVoucherNumberPreview, { shouldValidate: true })
                            form.clearErrors('voucher_number')
                          }
                        }}
                      >
                        {isPreviewLoading ? (
                          <Loader2 className="h-3 w-3 opacity-60" aria-hidden />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                      </Button>
                    ) : null}
                  </div>
                </div>
                </div>
                <div className="min-w-0">
                  <Input
                    id="voucher_number"
                    {...form.register('voucher_number')}
                    onBlur={handleVoucherNumberBlur}
                    placeholder={
                      !isEditing
                        ? isPreviewLoading
                          ? '…'
                          : nextVoucherNumberPreview || (codingBlockFormat?.example ?? codingBlockFormat?.pattern ?? 'Auto')
                        : undefined
                    }
                    disabled={isLoading || isCheckingVoucherNumber}
                    readOnly={voucherNumberLockedFromJournal}
                    className={cn(
                      'voucher-form-input h-7 font-mono text-xs font-medium min-w-[7rem] w-full rounded-none bg-white dark:bg-slate-900 border border-input focus:border-slate-500 focus:bg-slate-50/80 dark:focus:bg-slate-800/80 focus-visible:ring-0.5 focus-visible:ring-ring focus-visible:ring-offset-0 focus:outline-none',
                      form.formState.errors.voucher_number && 'border-destructive',
                      voucherNumberLockedFromJournal && 'bg-muted/40 cursor-not-allowed'
                    )}
                    title={
                      voucherNumberLockedFromJournal
                        ? 'Suggested from the journal book. Users with “Edit voucher number” permission may override.'
                        : 'Unique number for this voucher. Leave empty to auto-generate.'
                    }
                    aria-invalid={!!form.formState.errors.voucher_number}
                    aria-describedby={form.formState.errors.voucher_number ? 'voucher_number_error' : 'voucher_number_hint'}
                  />
                </div>
                <div className="min-h-[1rem]">
                  {isCheckingVoucherNumber && (
                    <span className="text-[10px] text-muted-foreground">Checking…</span>
                  )}
                  {form.formState.errors.voucher_number && (
                    <p id="voucher_number_error" className="text-[10px] leading-tight text-destructive">
                      {form.formState.errors.voucher_number.message}
                    </p>
                  )}
                </div>
                {!form.formState.errors.voucher_number && !isCheckingVoucherNumber && (
                  <p id="voucher_number_hint" className="text-[10px] text-muted-foreground sr-only">Leave empty to auto-generate.</p>
                )}
              </div>
              <div className="flex min-w-0 max-w-[min(28rem,100%)] shrink-0 flex-col gap-0.5">
                <div className={voucherLabelBlock}>
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Label htmlFor="voucher_date" className="text-[11px] font-medium leading-tight text-muted-foreground" required>
                      Transaction date
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex shrink-0 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          aria-label="About fiscal year"
                        >
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[20rem] text-xs leading-snug">
                        Fiscal year is determined automatically from the transaction date, using the fiscal years and periods defined under General Ledger → Fiscal years.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <DatePicker
                    id="voucher_date"
                    value={watchVoucherDate || ''}
                    onChange={(v) => form.setValue('voucher_date', v, { shouldValidate: true })}
                    disabled={isLoading}
                    minDate={fiscalYearsCalendarBounds.min}
                    maxDate={fiscalYearsCalendarBounds.max}
                    className="voucher-date-picker h-7 min-h-[1.75rem] max-h-[1.75rem] w-[11rem] min-w-[11rem] shrink-0 rounded-none bg-white dark:bg-slate-900 border-border"
                    inputClassName="focus-visible:ring-0 focus-visible:ring-offset-0 text-xs"
                  />
                  <div
                    className={cn(
                      'inline-flex h-7 min-h-[1.75rem] max-h-[1.75rem] min-w-0 flex-1 items-center gap-1.5 rounded-none border border-border bg-muted/30 px-2 text-left text-[11px] shadow-sm dark:bg-slate-900/80',
                      dateOutsideFiscalRange && 'border-amber-500/50 bg-amber-50/60 dark:bg-amber-950/25'
                    )}
                    title={
                      fiscalYearForDate
                        ? `${fiscalYearForDate.name} (${fiscalYearForDate.start_date.slice(0, 4)}–${fiscalYearForDate.end_date.slice(0, 4)})`
                        : 'Set under General Ledger → Fiscal years'
                    }
                  >
                    <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">FY</span>
                    <span className="min-w-0 flex-1 truncate font-medium tabular-nums text-foreground">
                      {fiscalYears.length === 0
                        ? 'Loading…'
                        : fiscalYearForDate
                          ? fiscalYearForDate.name
                          : watchVoucherDate?.trim()
                            ? 'No matching FY'
                            : '—'}
                    </span>
                  </div>
                </div>
                <div className="min-h-[1rem]">
                  {dateOutsideFiscalRange && (
                    <p className="text-[10px] leading-tight text-amber-800 dark:text-amber-200">
                      This date does not fall in any fiscal year. Adjust the date or add a fiscal year under General Ledger.
                    </p>
                  )}
                  {form.formState.errors.voucher_date && (
                    <p className="text-[10px] leading-tight text-destructive">{form.formState.errors.voucher_date.message}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className={voucherLabelBlock}>
                  <Label className="text-[11px] font-medium leading-tight text-muted-foreground">Transaction type</Label>
                </div>
                <Select value={watchVoucherType} onValueChange={(v) => form.setValue('voucher_type', v as any)} disabled={isLoading || isEditing}>
                  <SelectTrigger className="h-7 w-[104px] bg-white dark:bg-slate-900 text-xs rounded-none border-border py-0 leading-none focus:ring-0.5 focus:ring-ring focus:ring-offset-0 focus-visible:ring-0.5 focus-visible:ring-ring"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payment">Payment</SelectItem>
                    <SelectItem value="receipt">Receipt</SelectItem>
                    <SelectItem value="journal">Journal</SelectItem>
                    <SelectItem value="contra">Contra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex w-max max-w-[11rem] shrink-0 flex-col gap-0.5">
                <div className={voucherLabelBlock}>
                  <Label className="text-[11px] font-medium leading-tight text-muted-foreground">Currency</Label>
                </div>
                {organization?.enable_multi_currency !== false ? (
                  debitIsForeignVsBase ? (
                    <div
                      className="inline-flex h-7 min-h-[1.75rem] min-w-[4.5rem] max-w-[11rem] w-max items-center gap-1.5 rounded-none border border-input bg-muted/40 dark:bg-slate-950/50 px-2 text-xs"
                      title="Transaction currency matches the expense (debit) account. Change the expense account to use a different currency."
                    >
                      <span className="font-semibold tabular-nums text-foreground">{foreignIso}</span>
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wide shrink-0">(debit acct)</span>
                    </div>
                  ) : (
                    <CurrencySelect
                      value={currency || ''}
                      onChange={(v) => form.setValue('currency', v || (organization?.default_currency ?? 'AFN'))}
                      placeholder=""
                      disabled={isLoading}
                      triggerClassName={cn(
                        'h-7 min-h-[1.75rem] min-w-[4.5rem] max-w-[9.45rem] w-max justify-start gap-1.5 px-2 py-0 text-xs leading-none rounded-none overflow-hidden bg-white dark:bg-slate-900',
                        'focus:ring-0.5 focus:ring-ring focus:ring-offset-0 focus-visible:ring-0.5 focus-visible:ring-ring',
                        '[&>span]:min-w-0 [&>span]:truncate [&>span]:text-left'
                      )}
                    />
                  )
                ) : (
                  <div className="inline-flex h-7 min-h-[1.75rem] min-w-[4.5rem] max-w-[9.45rem] w-max items-center rounded-none border border-input bg-white dark:bg-slate-900 px-2 text-xs">
                    {organization?.default_currency ?? 'AFN'}
                  </div>
                )}
              </div>
              {(watchVoucherType === 'payment' || watchVoucherType === 'receipt') && (
                <div className="flex shrink-0 flex-col gap-0.5">
                  <div className={voucherLabelBlock}>
                    <Label className="text-[11px] font-medium leading-tight text-muted-foreground">Payment method</Label>
                  </div>
                  <Select value={watchPaymentMethod || 'cash'} onValueChange={(v) => form.setValue('payment_method', v as any)} disabled={isLoading}>
                    <SelectTrigger className="h-7 w-[96px] bg-white dark:bg-slate-900 text-xs rounded-none border-border py-0 leading-none focus:ring-0.5 focus:ring-ring focus:ring-offset-0 focus-visible:ring-0.5 focus-visible:ring-ring"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="bank_transfer">Transfer</SelectItem>
                      <SelectItem value="mobile_money">Mobile</SelectItem>
                      <SelectItem value="msp">MSP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex flex-col gap-0.5">
                <div className={voucherLabelBlock}>
                  <Label className="text-[11px] font-medium leading-tight text-muted-foreground" required>Payee / Beneficiary</Label>
                </div>
                <Input placeholder="Name of payee or beneficiary" {...form.register('payee_name')} disabled={isLoading} className="voucher-form-input h-7 w-[11.5rem] bg-white dark:bg-slate-900 text-xs rounded-none border border-input focus:border-slate-500 focus:bg-slate-50/80 dark:focus:bg-slate-800/80 focus-visible:ring-0.5 focus-visible:ring-ring focus-visible:ring-offset-0 focus:outline-none" />
              </div>
              <div className="flex min-w-[min(100%,18rem)] flex-1 flex-col gap-0.5 basis-[min(100%,28rem)] max-w-[32rem]">
                <div className={voucherLabelBlock}>
                  <Label htmlFor="description" className="text-[11px] font-medium leading-tight text-muted-foreground" required>Purpose / Description</Label>
                </div>
                <Input
                  id="description"
                  placeholder="Purpose of transaction (for donor/audit)"
                  {...form.register('description')}
                  disabled={isLoading}
                  className="voucher-form-input h-7 w-full min-w-[16rem] bg-white dark:bg-slate-900 text-xs rounded-none border border-input focus:border-slate-500 focus:bg-slate-50/80 dark:focus:bg-slate-800/80 focus-visible:ring-0.5 focus-visible:ring-ring focus-visible:ring-offset-0 focus:outline-none"
                />
                <div className="min-h-[1rem]">
                  {form.formState.errors.description && (
                    <p className="text-[10px] leading-tight text-destructive">{form.formState.errors.description.message}</p>
                  )}
                </div>
              </div>
              <div className="flex w-[13.5rem] shrink-0 flex-col gap-0.5">
                <div className={voucherLabelBlock}>
                  <Label className="text-[11px] font-medium leading-tight text-muted-foreground">
                    {isForeignTxn ? 'Total (base)' : 'Total amount'}
                  </Label>
                </div>
                <div className="flex h-7 min-h-[1.75rem] w-full min-w-0 items-stretch overflow-hidden rounded-none border border-border bg-white text-xs font-mono font-semibold tabular-nums text-slate-800 dark:bg-slate-900 dark:text-slate-200">
                  <span className="flex min-w-0 flex-1 items-center truncate bg-white px-2 dark:bg-slate-900">
                    <VoucherAmountValue
                      form={form}
                      currency={currency}
                      baseCurrency={baseCurrencyCode}
                      exchangeRate={Number(watchExchangeRate)}
                      isForeignTxn={isForeignTxn}
                      amountOnly
                    />
                  </span>
                  <span
                    className="flex min-w-[3rem] shrink-0 grow-0 items-center justify-center self-stretch border-l border-[#172554] bg-[#1E3A8A] px-2.5 text-[10px] font-bold uppercase tracking-wide text-white dark:border-[#172554] dark:bg-[#1E3A8A]"
                    title={isForeignTxn ? `Organization base: ${getCurrencyIsoCode(baseCurrencyCode)}` : `Currency: ${getCurrencyIsoCode(currency)}`}
                  >
                    {isForeignTxn ? getCurrencyIsoCode(baseCurrencyCode) : getCurrencyIsoCode(currency)}
                  </span>
                </div>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className={voucherLabelBlock}>
                  <Label className="text-[11px] font-medium leading-tight text-muted-foreground">Amount in words</Label>
                </div>
                <div className="flex h-7 min-h-[1.75rem] w-full min-w-0 items-center rounded-none border border-input bg-muted/30 dark:bg-slate-950/40 px-1.5 text-[10px] leading-snug italic text-muted-foreground truncate">
                  <VoucherAmountWords form={form} currency={currency} />
                </div>
              </div>
            </div>
            <div className="voucher-form-controls-row mt-1 flex flex-wrap items-start gap-x-2 gap-y-1 border-t border-border/60 pt-1">
              {watchPaymentMethod === 'check' && (
                <div className="flex flex-col gap-0.5">
                  <div className={voucherLabelBlock}>
                    <Label className="text-[11px] font-medium leading-tight text-muted-foreground">Check no.</Label>
                  </div>
                  <Input id="check_number" placeholder="#" {...form.register('check_number')} disabled={isLoading} className="voucher-form-input h-7 w-16 bg-white dark:bg-slate-900 text-xs rounded-none border border-input focus:border-slate-500 focus:bg-slate-50/80 dark:focus:bg-slate-800/80 focus-visible:ring-0.5 focus-visible:ring-ring focus-visible:ring-offset-0 focus:outline-none" />
                </div>
              )}
              {((watchPaymentMethod === 'bank_transfer') || (watchPaymentMethod === 'check') || (watchPaymentMethod === 'msp')) && (
                <div className="flex flex-col gap-0.5">
                  <div className={voucherLabelBlock}>
                    <Label className="text-[11px] font-medium leading-tight text-muted-foreground">Ref</Label>
                  </div>
                  <Input id="bank_reference" placeholder="Ref" {...form.register('bank_reference')} disabled={isLoading} className="voucher-form-input h-7 w-20 bg-white dark:bg-slate-900 text-xs rounded-none border border-input focus:border-slate-500 focus:bg-slate-50/80 dark:focus:bg-slate-800/80 focus-visible:ring-0.5 focus-visible:ring-ring focus-visible:ring-offset-0 focus:outline-none" />
                </div>
              )}
            </div>
            </TooltipProvider>
          </div>

          {/* Table — fills remaining space, scrolls internally */}
          <div className="flex flex-col flex-1 min-h-0 border-t border-border w-full bg-background overflow-hidden">
            {pasteHint && (
              <div
                className={cn(
                  'shrink-0 py-0.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200/60 dark:border-amber-800/40',
                  embedded ? 'px-2 sm:px-3' : 'px-4'
                )}
              >
                <p className="text-[10px] text-amber-700 dark:text-amber-400">Use Ctrl+V to paste.</p>
              </div>
            )}
            {showCrossCurrencyColumns && isForeignTxn && (
              <div
                className={cn(
                  'shrink-0 py-1.5 border-b border-border bg-slate-50/95 dark:bg-slate-900/70',
                  embedded ? 'px-2 sm:px-3' : 'px-4'
                )}
                role="note"
              >
                <p className="text-[10px] leading-snug text-muted-foreground">
                  <span className="font-semibold text-foreground/90">Foreign transaction — </span>
                  Amount column is <span className="font-mono font-medium text-foreground">{baseIso}</span> (organization base).{' '}
                  <span className="font-mono">EXR</span> shows foreign units per 1 {baseIso} (same as the voucher rate).{' '}
                  <span className="font-mono">FOREIGN</span> is the line amount in{' '}
                  <span className="font-mono font-medium text-foreground">{foreignIso}</span>.
                </p>
              </div>
            )}
            <div
                ref={voucherTableRef}
                className={cn(
                  'flex-1 min-h-0 overflow-y-auto overflow-x-hidden voucher-sheet-grid bg-white dark:bg-slate-900 w-full outline-none cursor-cell',
                  showCrossCurrencyColumns && isForeignTxn && 'voucher-sheet-foreign-mode'
                )}
                tabIndex={0}
                onFocus={(e) => {
                  if (e.target === voucherTableRef.current && !sheetSelection) {
                    setSheetSelection({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 })
                    selectionBoundsRef.current = { minR: 0, maxR: 0, minC: 0, maxC: 0 }
                  }
                }}
                onPaste={handleSheetPaste}
                onCopy={handleSheetCopy}
                onCut={handleSheetCut}
                onContextMenu={handleSheetContextMenu}
                onKeyDown={(e) => {
                  const target = e.target as HTMLElement
                  const row = target.closest('tr[data-row-index]')
                  if (!voucherTableRef.current) return
                  const isCellInput = target.matches('input, [role="combobox"]')
                  const bounds = getSelectionBounds()
                  const rowIndex = row ? parseInt(row.getAttribute('data-row-index') ?? '', 10) : (bounds?.minR ?? 0)
                  const colCell = target.closest('td[data-col-index]')
                  const colIndex = colCell != null ? parseInt(colCell.getAttribute('data-col-index') ?? '', 10) : (bounds?.minC ?? 0)
                  const effectiveRow = isCellInput ? rowIndex : (bounds?.minR ?? 0)
                  const effectiveCol = isCellInput ? colIndex : (bounds?.minC ?? 0)
                  const maxRow = fields.length - 1
                  /** Selection / arrows: EXR + base columns only when cross-currency. */
                  const maxCol = maxDataColIndex
                  /** Tab only moves between editable cells (account … amount). */
                  const maxFocusCol = 4

                  const moveFocus = (r: number, c: number) => {
                    if (c > maxFocusCol) {
                      voucherTableRef.current?.focus()
                      return
                    }
                    const targetRow = voucherTableRef.current?.querySelector(`tbody tr[data-row-index="${r}"]`)
                    const targetCell = targetRow?.querySelector(`td[data-col-index="${c}"]`)
                    const focusable = targetCell?.querySelector<HTMLInputElement | HTMLButtonElement>('input, [role="combobox"], button')
                    if (focusable) {
                      (focusable as HTMLElement).focus()
                      if (focusable instanceof HTMLInputElement && c === 4) focusable.select()
                    }
                  }

                  const updateSelection = (r: number, c: number, extend: boolean) => {
                    if (extend && sheetSelection) {
                      setSheetSelection((prev) => (prev ? { ...prev, endRow: r, endCol: c } : { startRow: r, startCol: c, endRow: r, endCol: c }))
                    } else {
                      setSheetSelection({ startRow: r, startCol: c, endRow: r, endCol: c })
                    }
                  }

                  if (e.key === 'Escape') {
                    if (isCellInput) {
                      e.preventDefault()
                      ;(target as HTMLInputElement).blur()
                    }
                    setSheetSelection(null)
                    return
                  }

                  if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                    let text = getCopyText()
                    if (!text && colIndex >= 0 && colIndex <= maxCol) text = getCellValueForCopy(rowIndex, colIndex)
                    if (text) {
                      e.preventDefault()
                      void navigator.clipboard.writeText(text)
                    }
                    return
                  }
                  if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
                    let text = getCopyText()
                    if (!text && colIndex >= 0 && colIndex <= maxCol) text = getCellValueForCopy(rowIndex, colIndex)
                    if (text) {
                      e.preventDefault()
                      void navigator.clipboard.writeText(text)
                      if (getSelectionBounds()) clearSelectionCells()
                      else if (colIndex === 0) form.setValue(`lines.${rowIndex}.account_id`, 0, { shouldValidate: false })
                      else if (colIndex === 4) {
                        form.setValue(`lines.${rowIndex}.credit_amount`, 0, { shouldValidate: false })
                        form.setValue(`lines.${rowIndex}.debit_amount`, 0, { shouldValidate: false })
                      }
                      else {
                        const keys = ['project_account_code', 'description', 'cost_center'] as const
                        form.setValue(`lines.${rowIndex}.${keys[colIndex - 1]}` as Parameters<typeof form.setValue>[0], '', { shouldValidate: false })
                      }
                    }
                    return
                  }
                  if (e.key === 'Delete' || e.key === 'Backspace') {
                    if (isCellInput) return
                    const bounds = getSelectionBounds()
                    if (bounds) {
                      e.preventDefault()
                      clearSelectionCells()
                    } else if (colIndex >= 0 && colIndex <= 4) {
                      e.preventDefault()
                      if (colIndex === 0) form.setValue(`lines.${rowIndex}.account_id`, 0, { shouldValidate: false })
                      else if (colIndex === 4) {
                        form.setValue(`lines.${rowIndex}.credit_amount`, 0, { shouldValidate: false })
                        form.setValue(`lines.${rowIndex}.debit_amount`, 0, { shouldValidate: false })
                      } else {
                        const keys = ['project_account_code', 'description', 'cost_center'] as const
                        form.setValue(`lines.${rowIndex}.${keys[colIndex - 1]}` as any, '', { shouldValidate: false })
                      }
                    }
                    return
                  }

                  if (e.key === 'Enter' || e.key === 'F2') {
                    if (!isCellInput) {
                      e.preventDefault()
                      moveFocus(effectiveRow, effectiveCol)
                      updateSelection(effectiveRow, effectiveCol, false)
                      return
                    }
                    if (e.key === 'F2') return
                    e.preventDefault()
                    if (rowIndex < maxRow) {
                      moveFocus(rowIndex + 1, colIndex)
                      updateSelection(rowIndex + 1, colIndex, false)
                    } else {
                      addLine(true)
                      requestAnimationFrame(() => {
                        moveFocus(maxRow + 1, colIndex)
                        updateSelection(maxRow + 1, colIndex, false)
                      })
                    }
                    return
                  }

                  if (e.key === 'Tab' && isCellInput) {
                    e.preventDefault()
                    if (e.shiftKey) {
                      if (colIndex > 0) {
                        moveFocus(rowIndex, colIndex - 1)
                        updateSelection(rowIndex, colIndex - 1, false)
                      } else if (rowIndex > 0) {
                        moveFocus(rowIndex - 1, maxFocusCol)
                        updateSelection(rowIndex - 1, maxFocusCol, false)
                      }
                    } else {
                      if (colIndex < maxFocusCol) {
                        moveFocus(rowIndex, colIndex + 1)
                        updateSelection(rowIndex, colIndex + 1, false)
                      } else if (rowIndex < maxRow) {
                        moveFocus(rowIndex + 1, 0)
                        updateSelection(rowIndex + 1, 0, false)
                      } else {
                        addLine(true)
                        requestAnimationFrame(() => {
                          moveFocus(rowIndex + 1, 0)
                          updateSelection(rowIndex + 1, 0, false)
                        })
                      }
                    }
                    return
                  }

                  if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    const baseRow = isCellInput ? rowIndex : effectiveRow
                    const baseCol = isCellInput ? colIndex : effectiveCol
                    let newRow = baseRow
                    let newCol = baseCol
                    if (e.key === 'ArrowDown') {
                      if (baseRow >= maxRow) {
                        e.preventDefault()
                        addLine(true)
                        requestAnimationFrame(() => {
                          moveFocus(maxRow + 1, baseCol)
                          updateSelection(maxRow + 1, baseCol, false)
                        })
                        return
                      }
                      newRow = baseRow + 1
                    } else if (e.key === 'ArrowUp') newRow = Math.max(0, baseRow - 1)
                    else if (e.key === 'ArrowLeft') newCol = Math.max(0, baseCol - 1)
                    else if (e.key === 'ArrowRight') newCol = Math.min(maxCol, baseCol + 1)
                    e.preventDefault()
                    if (e.shiftKey) {
                      updateSelection(newRow, newCol, true)
                      if (isCellInput) moveFocus(newRow, newCol)
                    } else {
                      setSheetSelection({ startRow: newRow, startCol: newCol, endRow: newRow, endCol: newCol })
                      if (isCellInput) moveFocus(newRow, newCol)
                    }
                    return
                  }
                }}
              >
                <table
                  className="voucher-lines-table border-collapse text-sm w-full"
                  style={{
                    tableLayout: 'fixed',
                  }}
                >
                  <colgroup>
                    {effectiveColWidths.map((w, i) => (
                      <col key={i} style={{ width: `${w}%` }} />
                    ))}
                  </colgroup>
                  <thead className="sticky top-0 z-10 select-none cursor-default border-b-[0.3px] border-white/25 backdrop-blur-[2px] shadow-sm">
                    <tr>
                      {allocationTableHeaderItems.map((item, i) => {
                            const label = typeof item === 'string' ? item : item.label
                            const showRequired = typeof item === 'object' && item.required
                            return (
                        <th
                          key={i}
                          className={cn(
                            'group relative text-[10px] font-semibold uppercase tracking-wide text-white h-6 px-3 py-1 text-left',
                            i === 0 ? 'pl-4' : 'pl-3'
                          )}
                          style={{ width: `${effectiveColWidths[i] ?? 12}%` }}
                        >
                          <span className="truncate block leading-snug">
                            {label}
                            {showRequired && <span className="text-amber-200 ml-0.5 font-semibold" aria-hidden>*</span>}
                          </span>
                          {i < effectiveColWidths.length - 1 && (
                            <div
                              role="separator"
                              aria-orientation="vertical"
                              aria-label="Resize column"
                              className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-3 h-full flex items-center justify-center cursor-col-resize z-30"
                              onMouseDown={(e) => handleResizeStart(i, e)}
                            >
                              <MoreVertical className="h-3.5 w-3.5 text-white/65 pointer-events-none" strokeWidth={2.5} />
                            </div>
                          )}
                        </th>
                            )
                          })}
                    </tr>
                  </thead>
                  <tbody className="cursor-cell" onMouseDown={handleSheetCellMouseDown} onMouseEnter={handleSheetCellMouseEnter}>
                    {fields.map((field, index) => (
                      <VoucherTableRow
                        key={field.id}
                        fieldId={field.id}
                        index={index}
                        form={form}
                        selectionForRow={selectionForRows[index] ?? null}
                        postingAccounts={postingAccounts}
                        accountsTree={accountsTreeRoot}
                        postingsById={postingsById}
                        costCenterOptions={costCenterOptions}
                        isLoading={isLoading}
                        baseCurrency={organization?.default_currency ?? 'AFN'}
                        exchangeRate={Number(watchExchangeRate)}
                        foreignPerBaseDisplay={foreignPerBaseDisplay}
                        debitCurrencyIso={expenditureAccountCurrencyIso}
                        isForeignTxn={isForeignTxn}
                        showCrossCurrencyColumns={showCrossCurrencyColumns}
                        transactionCurrency={debitIsForeignVsBase ? expenditureAccountCurrencyCode : currency}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {contextMenu && (
                <div
                  ref={contextMenuRef}
                  className="fixed z-[100] min-w-[160px] rounded-none border border-border bg-popover text-popover-foreground shadow-md py-1"
                  style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                    onClick={() => {
                      const text = getCopyText()
                      if (text) void navigator.clipboard.writeText(text)
                      setContextMenu(null)
                    }}
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                    onClick={() => {
                      const text = getCopyText()
                      if (text) {
                        void navigator.clipboard.writeText(text)
                        clearSelectionCells()
                      }
                      setContextMenu(null)
                    }}
                  >
                    Cut
                  </button>
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                    onClick={async () => {
                      setContextMenu(null)
                      try {
                        const text = await navigator.clipboard.readText()
                        doPasteFromText(text)
                      } catch {
                        setPasteHint(true)
                        setTimeout(() => setPasteHint(false), 3000)
                      }
                    }}
                  >
                    Paste
                  </button>
                  <div className="my-1 h-px bg-border" />
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground text-destructive"
                    onClick={() => {
                      clearSelectionCells()
                      setContextMenu(null)
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
              {form.formState.errors.lines?.message && (
                <p className="text-xs text-destructive px-2 pt-1 font-medium">{form.formState.errors.lines.message}</p>
              )}
              {form.formState.errors.root?.message && (
                <p
                  role="alert"
                  className="mx-2 mt-1 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-2 text-xs text-destructive"
                >
                  {String(form.formState.errors.root.message)}
                </p>
              )}

              <VoucherLinesSummary
                form={form}
                currency={currency}
                baseCurrencyCode={baseCurrencyCode}
                crossCurrencyRateSatisfied={crossCurrencyRateSatisfied}
                showCrossCurrencyColumns={showCrossCurrencyColumns}
                isForeignTxn={isForeignTxn}
                embedded={embedded}
                isLoading={isLoading}
                isEditing={isEditing}
                offices={offices}
                onCancel={onCancel}
                onOpenChange={onOpenChange}
                handleSubmit={handleSubmit}
                onSubmitInvalid={onSubmitInvalid}
                saveAndNewRef={saveAndNewRef}
                getDefaultVoucherLines={getDefaultVoucherLines}
                exchangeRateFooterPanel={exchangeRateFooterPanel}
                readOnly={readOnly}
              />
          </div>
      </fieldset>
        </form>
  )

  if (embedded) {
    return <>{formContent}</>
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange ?? (() => {})}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto sm:rounded-none">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit transaction voucher' : 'New Voucher'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Editing voucher: ${voucher?.voucher_number}`
              : 'NGO transaction voucher. Select programme and expense account; enter payee, date, and allocation lines. Debit = expenditure; credits = allocations. Totals must balance (accrual basis).'}
          </DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  )
}
