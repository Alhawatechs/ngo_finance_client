'use client'

import React, { useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChartOfAccount } from '@/types'
import { ChartOfAccountFormData, getDefaultNormalBalance, suggestAccountCode } from '@/lib/api/chart-of-accounts'
import { CurrencySelect } from '@/components/ui/currency-select'
import { useOrganizationStore } from '@/stores/organizationStore'
import { useHasPermission } from '@/stores/authStore'
import { Loader2, Sparkles, Lock } from 'lucide-react'
import { cn, compareAccountCodes } from '@/lib/utils'
import { displayCurrencyForAccount } from '@/lib/account-display-currency'

/** Professional CoA layer names (4-level, direct GL linkage). */
const LAYER_LABELS: Record<number, string> = {
  1: 'Category',
  2: 'Subcategory',
  3: 'General Ledger',
  4: 'Account',
}

function getLayerLabel(level: number): string {
  return LAYER_LABELS[level] ?? `Layer ${level}`
}

function getParentLayerLabel(level: number): string {
  return level <= 0 ? '' : getLayerLabel(level)
}

const accountSchema = z
  .object({
    account_code: z.string().max(20), // Optional on create: empty triggers auto-generation for any layer
    account_name: z.string().min(1, 'Account name is required').max(255),
    account_type: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']),
    normal_balance: z.enum(['debit', 'credit']),
    currency_code: z.string().max(3).optional(),
    is_header: z.boolean().default(false),
    is_posting: z.boolean().default(true),
  is_bank_account: z.boolean().default(false),
  is_cash_account: z.boolean().default(false),
  fund_type: z.enum(['unrestricted', 'restricted', 'temporarily_restricted']).nullable().optional(),
  description: z.string().optional(),
  opening_balance: z.number().optional(),
  is_active: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.is_posting && (!data.currency_code || data.currency_code.trim() === '')) {
      ctx.addIssue({
        code: 'custom',
        message: 'Account currency is required for posting accounts.',
        path: ['currency_code'],
      })
    }
  })

type AccountFormValues = z.infer<typeof accountSchema>

interface AccountFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account?: ChartOfAccount | null
  parentAccount?: ChartOfAccount | null
  /** Flattened list of accounts that can be parents (level 1–4). When provided, Add Account shows a layer/parent selector. */
  accountsForParent?: ChartOfAccount[]
  /** Flattened list of all accounts (used to validate duplicate account codes). When provided, duplicate codes are blocked before submit. */
  allAccounts?: ChartOfAccount[]
  /** Base currency from Organization setup - used as default for new accounts. Pass from parent to ensure correct value. */
  baseCurrency?: string
  onSubmit: (data: ChartOfAccountFormData) => Promise<void>
  isLoading?: boolean
}

export function AccountFormDialog({
  open,
  onOpenChange,
  account,
  parentAccount,
  accountsForParent,
  allAccounts,
  baseCurrency: baseCurrencyProp,
  onSubmit,
  isLoading = false,
}: AccountFormDialogProps) {
  const { organization, fetchOrganization } = useOrganizationStore()
  const canEditAccountCode = useHasPermission('edit-chart-of-accounts-code')
  /** Base currency for new accounts: prefer prop from parent (ensures correct org value), else org store, else AFN. */
  const baseCurrency = baseCurrencyProp ?? organization?.default_currency ?? 'AFN'
  const isEditing = !!account
  const [suggestingCode, setSuggestingCode] = React.useState(false)
  /** Layer to add (1–4): Category, Subcategory, General Ledger, Account. */
  const [selectedLayer, setSelectedLayer] = React.useState<number>(1)
  /** Parent account id; only used when selectedLayer > 1. Parent must be at level selectedLayer - 1. */
  const [selectedParentId, setSelectedParentId] = React.useState<number | null>(null)

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      account_code: '',
      account_name: '',
      account_type: 'asset',
      normal_balance: 'debit',
      currency_code: baseCurrency,
      is_header: false,
      is_posting: true,
      is_bank_account: false,
      is_cash_account: false,
      fund_type: null,
      description: '',
      opening_balance: 0,
      is_active: true,
    },
  })

  const watchAccountType = form.watch('account_type')
  const watchIsHeader = form.watch('is_header')
  const watchIsPosting = form.watch('is_posting')

  /** Tree depth (1–4) for the row being created or edited. */
  const effectiveLevel = isEditing ? (account?.level ?? 1) : selectedLayer

  // Update normal balance when account type changes. Omit form to avoid update loop.
  useEffect(() => {
    if (!isEditing) {
      form.setValue('normal_balance', getDefaultNormalBalance(watchAccountType))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form omitted to prevent setValue loop
  }, [watchAccountType, isEditing])

  // Category (L1) is always a header; deepest level (L4) cannot be a header (no children allowed).
  useEffect(() => {
    if (!open) return
    if (effectiveLevel === 1) {
      form.setValue('is_header', true)
      form.setValue('is_posting', false)
    }
    if (effectiveLevel === 4) {
      form.setValue('is_header', false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form omitted to prevent setValue loop
  }, [open, effectiveLevel])

  // When dialog opens, ensure organization is loaded (needed for base currency)
  useEffect(() => {
    if (open && !organization) {
      fetchOrganization()
    }
  }, [open, organization, fetchOrganization])

  // Reset form when dialog opens/closes or account changes. baseCurrency in deps so form updates when org loads.
  useEffect(() => {
    if (!open) return
    if (account) {
      form.reset({
        account_code: account.account_code,
        account_name: account.account_name,
        account_type: account.account_type,
        normal_balance: account.normal_balance,
        currency_code: displayCurrencyForAccount(account, baseCurrency),
        is_header: account.is_header,
        is_posting: account.is_posting,
        is_bank_account: account.is_bank_account,
        is_cash_account: account.is_cash_account,
        fund_type: account.fund_type || null,
        description: account.description || '',
        opening_balance: account.opening_balance || 0,
        is_active: account.is_active,
      })
    } else if (parentAccount) {
      // Creating child account - inherit type from parent; default currency = org base currency per Organization setup
      // Default: L4 = posting leaf; L1–L3 = header (user may enable posting on L2/L3 for a leaf subcategory/GL without children).
      const childLevel = (parentAccount.level ?? 0) + 1
      const isPostingLevel = childLevel === 4
      form.reset({
        account_code: '',
        account_name: '',
        account_type: parentAccount.account_type,
        normal_balance: parentAccount.normal_balance,
        currency_code: baseCurrency,
        is_header: !isPostingLevel,
        is_posting: isPostingLevel,
        is_bank_account: false,
        is_cash_account: false,
        fund_type: parentAccount.fund_type || null,
        description: '',
        opening_balance: 0,
        is_active: true,
      })
    } else {
      // Top-level add: default layer 1 (Category) = header. L4 = posting.
      const defaultLayer: number = 1
      const isPostingLevel = defaultLayer === 4
      form.reset({
        account_code: '',
        account_name: '',
        account_type: 'asset',
        normal_balance: 'debit',
        currency_code: baseCurrency,
        is_header: !isPostingLevel,
        is_posting: isPostingLevel,
        is_bank_account: false,
        is_cash_account: false,
        fund_type: null,
        description: '',
        opening_balance: 0,
        is_active: true,
      })
    }
    // When creating, sync layer and parent (Category = L1, or child under selected parent)
    if (!account) {
      const layer = parentAccount ? (parentAccount.level ?? 0) + 1 : 1
      setSelectedLayer(layer)
      setSelectedParentId(parentAccount?.id ?? null)
    }
    // Auto-generate account code for new account based on chart structure
    if (!account) {
      const layer = parentAccount ? (parentAccount.level ?? 0) + 1 : 1
      const parentId = parentAccount?.id ?? null
      const needsParent = layer > 1 && !parentId
      if (!needsParent) {
        setSuggestingCode(true)
        suggestAccountCode(parentId)
          .then((code) => { if (code) form.setValue('account_code', code) })
          .finally(() => setSuggestingCode(false))
      } else {
        // Layer 2–4 but no parent yet: if only one parent exists, auto-select and suggest
        const parentLevel = layer - 1
        const single = (accountsForParent ?? []).filter((a) => (a.level ?? 0) === parentLevel)
        if (single.length === 1) {
          setSelectedParentId(single[0].id)
          form.setValue('account_type', single[0].account_type)
          form.setValue('normal_balance', single[0].normal_balance)
          setSuggestingCode(true)
          suggestAccountCode(single[0].id)
            .then((code) => { if (code) form.setValue('account_code', code) })
            .finally(() => setSuggestingCode(false))
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form omitted to prevent reset loop
  }, [open, account?.id, parentAccount?.id, baseCurrency])

  /** Effective parent for create: when adding as Category (L1) no parent; else parent at selectedLayer - 1. */
  const effectiveParentId =
    accountsForParent?.length
      ? (selectedLayer > 1 ? selectedParentId : null)
      : (parentAccount?.id ?? null)

  /** Only accounts at the parent level for the selected layer (so user does not see all accounts). */
  const parentsForSelectedLayer =
    accountsForParent?.filter((a) => (a.level ?? 0) === selectedLayer - 1) ?? []

  const handleSubmit = async (values: AccountFormValues) => {
    const code = values.account_code?.trim() ?? ''
    if (isEditing && !code) {
      form.setError('account_code', { type: 'manual', message: 'Account code is required.' })
      return
    }
    // Client-side duplicate check when we have the full account list
    if (code && allAccounts?.length) {
      const existingCodes = isEditing
        ? allAccounts.filter((a) => a.id !== account?.id).map((a) => (a.account_code ?? '').trim()).filter(Boolean)
        : allAccounts.map((a) => (a.account_code ?? '').trim()).filter(Boolean)
      const normalizedExisting = new Set(existingCodes.map((c) => c.toUpperCase()))
      if (normalizedExisting.has(code.toUpperCase())) {
        form.setError('account_code', {
          type: 'manual',
          message: 'This account code is already in use. Choose a unique code.',
        })
        return
      }
    }
    if (
      !isEditing &&
      Boolean(accountsForParent?.length) &&
      selectedLayer > 1 &&
      effectiveParentId == null
    ) {
      form.setError('account_code', {
        type: 'manual',
        message: 'Select a parent account before creating. The code is generated for that parent.',
      })
      return
    }

    const data: ChartOfAccountFormData = {
      ...values,
      account_code: code,
      account_name: values.account_name?.trim() || values.account_name || '',
      currency_code: values.is_posting
        ? (values.currency_code?.trim() || baseCurrency)
        : null,
      parent_id: isEditing ? (account?.parent_id ?? undefined) : effectiveParentId,
    }
    try {
      await onSubmit(data)
    } catch (err: unknown) {
      const ax = err as { response?: { status?: number; data?: { errors?: Record<string, string[]>; message?: string } } }
      if (ax.response?.status === 422) {
        if (ax.response?.data?.errors) {
          Object.entries(ax.response.data.errors).forEach(([field, messages]) => {
            const msg = Array.isArray(messages) ? messages[0] : String(messages)
            form.setError(field as keyof AccountFormValues, { type: 'server', message: msg })
          })
          return
        }
        if (ax.response?.data?.message) {
          form.setError('account_code', { type: 'server', message: ax.response.data.message })
          return
        }
      }
      throw err
    }
  }

  const handleGenerateCode = () => triggerCodeSuggestion(effectiveParentId)

  /** Trigger code suggestion for the given parent id. Used when context is ready. */
  const triggerCodeSuggestion = useCallback((parentId: number | null) => {
    setSuggestingCode(true)
    suggestAccountCode(parentId)
      .then((code) => { if (code) form.setValue('account_code', code) })
      .finally(() => setSuggestingCode(false))
  }, [form])

  const handleLayerChange = (value: string) => {
    const layer = Number(value) as 1 | 2 | 3 | 4
    setSelectedLayer(layer)
    if (layer === 1) {
      form.setValue('is_header', true)
      form.setValue('is_posting', false)
    } else if (layer === 4) {
      form.setValue('is_header', false)
      form.setValue('is_posting', true)
    } else {
      form.setValue('is_header', true)
      form.setValue('is_posting', false)
    }
    if (layer === 1) {
      setSelectedParentId(null)
      triggerCodeSuggestion(null)
      return
    }
    const parentLevel = layer - 1
    const candidates = (accountsForParent ?? []).filter((a) => (a.level ?? 0) === parentLevel)
    // Auto-select when exactly one parent exists
    if (candidates.length === 1) {
      const parent = candidates[0]
      setSelectedParentId(parent.id)
      form.setValue('account_type', parent.account_type)
      form.setValue('normal_balance', parent.normal_balance)
      if (parent.fund_type != null) form.setValue('fund_type', parent.fund_type)
      triggerCodeSuggestion(parent.id)
      return
    }
    const prev = selectedParentId
    const nextParent =
      prev && accountsForParent?.length
        ? accountsForParent.find((a) => a.id === prev && (a.level ?? 0) === parentLevel)
        : undefined
    const nextId = nextParent?.id ?? null
    setSelectedParentId(nextId)
    if (nextId == null) {
      form.setValue('account_code', '')
    } else {
      triggerCodeSuggestion(nextId)
    }
  }

  const handleParentChange = (value: string) => {
    const id = value === '' ? null : Number(value)
    setSelectedParentId(id)
    const parent = id && accountsForParent?.length ? accountsForParent.find((a) => a.id === id) : null
    if (parent) {
      form.setValue('account_type', parent.account_type)
      form.setValue('normal_balance', parent.normal_balance)
      if (parent.fund_type != null) form.setValue('fund_type', parent.fund_type)
    }
    triggerCodeSuggestion(id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden border-slate-200/80 bg-white p-0 text-slate-900 shadow-[0_25px_50px_-12px_rgba(2,62,138,0.18)] sm:max-w-[560px] dark:bg-white dark:text-slate-900 [&>button]:text-slate-500 [&>button]:hover:bg-slate-100 [&>button]:hover:text-slate-900">
        <div className="h-1 w-full shrink-0 bg-gradient-to-r from-[#023e8a] via-[#0077b6] to-[#90e0ef]" aria-hidden />
        <DialogHeader className="shrink-0 border-b border-slate-100/90 bg-gradient-to-b from-slate-50/90 to-white px-6 pb-4 pt-5">
          <DialogTitle className="pr-8 text-lg font-semibold tracking-tight text-slate-900">
            {isEditing ? 'Edit account' : 'New account'}
          </DialogTitle>
          {isEditing && account && (
            <DialogDescription className="font-mono text-sm text-slate-500">
              {account.account_code} · {account.account_name}
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/30">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-5">
              {!isEditing && (accountsForParent?.length || parentAccount) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Layer</Label>
                    <Select value={String(selectedLayer)} onValueChange={handleLayerChange} disabled={isLoading}>
                      <SelectTrigger className="h-10 rounded-md border-slate-200 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4].map((level) => (
                          <SelectItem key={level} value={String(level)}>
                            {getLayerLabel(level)} <span className="text-slate-400">(L{level})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedLayer > 1 && (
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        Under ({getParentLayerLabel(selectedLayer - 1)})
                      </Label>
                      <Select
                        value={effectiveParentId != null ? String(effectiveParentId) : ''}
                        onValueChange={handleParentChange}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="h-10 rounded-md border-slate-200 bg-white">
                          <SelectValue placeholder="Select parent" />
                        </SelectTrigger>
                        <SelectContent>
                          {parentsForSelectedLayer
                            .sort((a, b) => compareAccountCodes(a.account_code || '', b.account_code || ''))
                            .map((a) => (
                              <SelectItem key={a.id} value={String(a.id)}>
                                <span className="font-mono text-slate-500">{a.account_code}</span>
                                <span className="ml-2">{a.account_name}</span>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {parentsForSelectedLayer.length === 0 && (
                        <p className="text-[11px] text-amber-700/90">Create a {getParentLayerLabel(selectedLayer - 1)} first.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="account_code" className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Code {!canEditAccountCode && <Lock className="inline h-3 w-3 text-slate-300" aria-hidden />}
                    </Label>
                    {!isEditing && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-[#023e8a]"
                        title="Generate next code from chart structure"
                        onClick={handleGenerateCode}
                        disabled={isLoading || suggestingCode || (selectedLayer > 1 && effectiveParentId == null)}
                      >
                        {suggestingCode ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      </Button>
                    )}
                  </div>
                  <Input
                    id="account_code"
                    placeholder={
                      suggestingCode
                        ? '…'
                        : isEditing
                          ? 'Code'
                          : !canEditAccountCode
                            ? 'Auto-assigned'
                            : 'e.g. 11 or 11.1.1'
                    }
                    className="h-10 rounded-md border-slate-200 bg-white font-mono text-sm"
                    readOnly={!canEditAccountCode}
                    {...form.register('account_code')}
                    disabled={isLoading}
                  />
                  {form.formState.errors.account_code && (
                    <p className="text-xs text-destructive">{form.formState.errors.account_code.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="account_name" className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Name
                  </Label>
                  <Input
                    id="account_name"
                    placeholder="Account name"
                    className="h-10 rounded-md border-slate-200 bg-white"
                    {...form.register('account_name')}
                    disabled={isLoading}
                  />
                  {form.formState.errors.account_name && (
                    <p className="text-xs text-destructive">{form.formState.errors.account_name.message}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Type</Label>
                  <Select
                    value={form.watch('account_type')}
                    onValueChange={(value) => form.setValue('account_type', value as any)}
                    disabled={isLoading || (isEditing && !account?.is_header)}
                  >
                    <SelectTrigger className="h-10 rounded-md border-slate-200 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asset">Asset</SelectItem>
                      <SelectItem value="liability">Liability</SelectItem>
                      <SelectItem value="equity">Fund Balance</SelectItem>
                      <SelectItem value="revenue">Revenue</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Normal</Label>
                  <Select
                    value={form.watch('normal_balance')}
                    onValueChange={(value) => form.setValue('normal_balance', value as any)}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="h-10 rounded-md border-slate-200 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debit">Debit</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Fund</Label>
                  <Select
                    value={form.watch('fund_type') || 'none'}
                    onValueChange={(value) => form.setValue('fund_type', value === 'none' ? null : value as any)}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="h-10 rounded-md border-slate-200 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      <SelectItem value="unrestricted">Unrestricted</SelectItem>
                      <SelectItem value="restricted">Restricted</SelectItem>
                      <SelectItem value="temporarily_restricted">Temp. restricted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50/50 via-white to-slate-50/40 p-4 shadow-sm ring-1 ring-slate-100/60">
                <div className="grid gap-4 sm:grid-cols-2">
                  {watchIsPosting && (
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Currency</Label>
                      <CurrencySelect
                        value={form.watch('currency_code') || baseCurrency}
                        onChange={(value) => form.setValue('currency_code', value)}
                        placeholder="Currency"
                        disabled={isLoading}
                        allowNone={false}
                        triggerClassName="h-10 rounded-lg border-slate-200/90 bg-white shadow-sm"
                      />
                      {form.formState.errors.currency_code && (
                        <p className="text-xs text-destructive">{form.formState.errors.currency_code.message}</p>
                      )}
                    </div>
                  )}
                  <div className={cn('space-y-1.5', !watchIsPosting && 'sm:col-span-2')}>
                    <Label htmlFor="opening_balance" className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Opening balance
                    </Label>
                    <Input
                      id="opening_balance"
                      type="number"
                      step="0.01"
                      className="h-10 rounded-lg border-slate-200/90 bg-white shadow-sm"
                      {...form.register('opening_balance', { valueAsNumber: true })}
                      disabled={isLoading || form.watch('is_header')}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-sm ring-1 ring-slate-100/50">
                <div className="mb-3 space-y-1">
                  <p className="text-[13px] font-semibold tracking-tight text-slate-800">Behavior & notes</p>
                  <p className="text-xs leading-relaxed text-slate-500">
                    <span className="font-medium text-slate-600">Posting</span> accounts accept journal entries and use the currency below.
                    <span className="font-medium text-slate-600"> Header</span> accounts only organize children—turn posting on for a subcategory or GL row (L2–L3) when you want to book transactions there without adding another level.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {[
                    { id: 'is_header', label: 'Header', watch: 'is_header' as const },
                    { id: 'is_posting', label: 'Posting', watch: 'is_posting' as const },
                    { id: 'is_bank_account', label: 'Bank', watch: 'is_bank_account' as const },
                    { id: 'is_cash_account', label: 'Cash', watch: 'is_cash_account' as const },
                    { id: 'is_active', label: 'Active', watch: 'is_active' as const },
                  ].map(({ id, label, watch }) => {
                    /** L1 = category (always header). L4 = leaf layer (never header). Posting clears header via effect. */
                    const headerSwitchDisabled =
                      isLoading || effectiveLevel === 1 || effectiveLevel === 4 || watchIsPosting
                    /** L1 cannot post. Turning posting on clears header — do not require clearing header first. */
                    const postingSwitchDisabled = isLoading || effectiveLevel === 1
                    const bankCashDisabled = isLoading || !watchIsPosting
                    const switchDisabled =
                      watch === 'is_active'
                        ? isLoading
                        : watch === 'is_header'
                          ? headerSwitchDisabled
                          : watch === 'is_posting'
                            ? postingSwitchDisabled
                            : bankCashDisabled
                    const dimmed =
                      (watch === 'is_posting' && watchIsHeader) ||
                      (watch !== 'is_active' && watchIsHeader && watch !== 'is_header')
                    return (
                      <div
                        key={id}
                        className={cn(
                          'flex items-center justify-between rounded-xl border border-slate-100/90 bg-white px-3 py-2.5 shadow-sm',
                          dimmed ? 'opacity-50' : ''
                        )}
                      >
                        <Label htmlFor={id} className="cursor-pointer text-sm font-medium text-slate-800">
                          {label}
                        </Label>
                        <Switch
                          id={id}
                          checked={form.watch(watch)}
                          onCheckedChange={(checked) => {
                            if (watch === 'is_header') {
                              form.setValue('is_header', checked)
                              if (checked) form.setValue('is_posting', false)
                              return
                            }
                            if (watch === 'is_posting') {
                              form.setValue('is_posting', checked)
                              if (checked) form.setValue('is_header', false)
                              return
                            }
                            form.setValue(watch, checked)
                          }}
                          disabled={switchDisabled}
                        />
                      </div>
                    )
                  })}
                </div>
                <Textarea
                  id="description"
                  placeholder="Notes"
                  className="mt-3 min-h-[72px] resize-none rounded-xl border-slate-200/90 bg-white text-sm shadow-sm"
                  {...form.register('description')}
                  disabled={isLoading}
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Footer — sticky */}
          <DialogFooter className="shrink-0 gap-3 border-t border-slate-200/90 bg-gradient-to-t from-slate-50/50 to-white px-6 py-4 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="rounded-xl border-slate-300/90 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="min-w-[132px] rounded-xl bg-[#023e8a] font-semibold text-white shadow-md transition-colors hover:bg-[#022a5c]"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save changes' : 'Create account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
