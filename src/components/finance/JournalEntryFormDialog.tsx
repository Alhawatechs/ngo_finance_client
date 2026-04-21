'use client'

import React, { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { displayCurrencyForAccount } from '@/lib/account-display-currency'
import { CurrencySelect } from '@/components/ui/currency-select'
import { JournalEntry, JournalEntryFormData, JournalEntryLineInput, validateJournalEntry } from '@/lib/api/journal-entries'
import { getAccountsTree, flattenAccountsTree } from '@/lib/api/chart-of-accounts'
import { getProjects } from '@/lib/api/projects'
import { ChartOfAccount } from '@/types'
import { useOrganizationStore } from '@/stores/organizationStore'

const lineSchema = z.object({
  account_id: z.number().min(1, 'Account is required'),
  fund_id: z.number().nullable().optional(),
  project_id: z.number().nullable().optional(),
  description: z.string().optional(),
  debit_amount: z.number().min(0),
  credit_amount: z.number().min(0),
  cost_center: z.string().optional(),
})

const journalEntrySchema = z.object({
  office_id: z.number().min(1, 'Office is required'),
  entry_date: z.string().min(1, 'Entry date is required'),
  entry_type: z.enum(['standard', 'adjusting', 'closing', 'reversing', 'recurring']),
  reference: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  currency: z.string().min(1, 'Currency is required'),
  exchange_rate: z.number().min(0.000001, 'Exchange rate must be positive'),
  lines: z.array(lineSchema).min(2, 'At least 2 lines are required'),
})

type JournalEntryFormValues = z.infer<typeof journalEntrySchema>

interface JournalEntryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry?: JournalEntry | null
  onSubmit: (data: JournalEntryFormData) => Promise<void>
  isLoading?: boolean
  offices: Array<{ id: number; name: string; code: string }>
}

export function JournalEntryFormDialog({
  open,
  onOpenChange,
  entry,
  onSubmit,
  isLoading = false,
  offices,
}: JournalEntryFormDialogProps) {
  const { organization } = useOrganizationStore()
  const baseCurrency = organization?.default_currency ?? 'AFN'
  const isEditing = !!entry
  const [balanceStatus, setBalanceStatus] = useState({ isValid: false, totalDebit: 0, totalCredit: 0, difference: 0 })

  // Fetch accounts for dropdown
  const { data: accountsData } = useQuery({
    queryKey: ['accounts-tree'],
    queryFn: () => getAccountsTree(),
    enabled: open,
  })
  const { data: projectsData } = useQuery({
    queryKey: ['projects-list-journal-form'],
    queryFn: () => getProjects({ per_page: 200, status: 'active' }),
    staleTime: 10 * 60 * 1000,
    enabled: open,
  })
  const projectsList: { id: number; project_code: string; project_name: string }[] = Array.isArray(projectsData) ? projectsData : (projectsData?.data ?? [])

  const postingAccounts = React.useMemo(() => {
    if (!accountsData?.data) return []
    const flat = flattenAccountsTree(accountsData.data)
    return flat.filter((acc: ChartOfAccount) => acc.is_posting && acc.is_active)
  }, [accountsData])

  const form = useForm<JournalEntryFormValues>({
    resolver: zodResolver(journalEntrySchema),
    defaultValues: {
      office_id: 0,
      entry_date: new Date().toISOString().split('T')[0],
      entry_type: 'standard',
      reference: '',
      description: '',
      currency: 'AFN',
      exchange_rate: 1,
      lines: [
        { account_id: 0, debit_amount: 0, credit_amount: 0, description: '' },
        { account_id: 0, debit_amount: 0, credit_amount: 0, description: '' },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  })

  const watchLines = form.watch('lines')

  // Update balance status when lines change
  useEffect(() => {
    const status = validateJournalEntry(watchLines)
    setBalanceStatus(status)
  }, [watchLines])

  // Reset form when dialog opens/closes or entry changes. Omit form from deps to avoid infinite loop (reset triggers re-render).
  useEffect(() => {
    if (!open) return
    if (entry) {
      form.reset({
        office_id: entry.office_id,
        entry_date: entry.entry_date,
        entry_type: entry.entry_type,
        reference: entry.reference || '',
        description: entry.description,
        currency: entry.currency,
        exchange_rate: entry.exchange_rate,
        lines: entry.lines?.map(line => ({
          account_id: line.account_id,
          fund_id: line.fund_id,
          project_id: line.project_id,
          description: line.description || '',
          debit_amount: line.debit_amount,
          credit_amount: line.credit_amount,
          cost_center: line.cost_center || '',
        })) || [
          { account_id: 0, debit_amount: 0, credit_amount: 0, description: '' },
          { account_id: 0, debit_amount: 0, credit_amount: 0, description: '' },
        ],
      })
    } else {
      const defaultCurrency = organization?.default_currency ?? 'AFN'
      form.reset({
        office_id: offices[0]?.id || 0,
        entry_date: new Date().toISOString().split('T')[0],
        entry_type: 'standard',
        reference: '',
        description: '',
        currency: defaultCurrency,
        exchange_rate: 1,
        lines: [
          { account_id: 0, debit_amount: 0, credit_amount: 0, description: '' },
          { account_id: 0, debit_amount: 0, credit_amount: 0, description: '' },
        ],
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form omitted to prevent reset loop
  }, [open, entry?.id, offices?.[0]?.id, organization?.default_currency])
  // When multi-currency is disabled, enforce base currency
  useEffect(() => {
    if (open && organization?.enable_multi_currency === false && !entry?.id) {
      const base = organization?.default_currency ?? 'AFN'
      form.setValue('currency', base)
    }
  }, [open, organization?.enable_multi_currency, organization?.default_currency, entry?.id, form])

  const handleSubmit = async (values: JournalEntryFormValues) => {
    if (!balanceStatus.isValid) {
      return
    }
    const data: JournalEntryFormData = {
      ...values,
      lines: values.lines.filter(line => line.account_id > 0 && (line.debit_amount > 0 || line.credit_amount > 0)),
    }
    await onSubmit(data)
  }

  const addLine = () => {
    append({ account_id: 0, debit_amount: 0, credit_amount: 0, description: '' })
  }

  const handleDebitChange = (index: number, value: number) => {
    form.setValue(`lines.${index}.debit_amount`, value)
    if (value > 0) {
      form.setValue(`lines.${index}.credit_amount`, 0)
    }
  }

  const handleCreditChange = (index: number, value: number) => {
    form.setValue(`lines.${index}.credit_amount`, value)
    if (value > 0) {
      form.setValue(`lines.${index}.debit_amount`, 0)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Journal Entry' : 'New Journal Entry'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Editing entry: ${entry?.entry_number}`
              : 'Create a new journal entry with double-entry bookkeeping. Save as draft to review and post later.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Header Fields */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="office_id" required>Office</Label>
              <Select
                value={form.watch('office_id')?.toString() || ''}
                onValueChange={(value) => form.setValue('office_id', parseInt(value))}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select office" />
                </SelectTrigger>
                <SelectContent>
                  {offices.map((office) => (
                    <SelectItem key={office.id} value={office.id.toString()}>
                      {office.name} ({office.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entry_date" required>Entry Date</Label>
              <DatePicker
                id="entry_date"
                value={form.watch('entry_date') || ''}
                onChange={(v) => form.setValue('entry_date', v)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="entry_type" required>Entry Type</Label>
              <Select
                value={form.watch('entry_type')}
                onValueChange={(value) => form.setValue('entry_type', value as any)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard Entry</SelectItem>
                  <SelectItem value="adjusting">Adjusting Entry</SelectItem>
                  <SelectItem value="closing">Closing Entry</SelectItem>
                  <SelectItem value="reversing">Reversing Entry</SelectItem>
                  <SelectItem value="recurring">Recurring Entry</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency" required>Currency</Label>
              {organization?.enable_multi_currency !== false ? (
                <CurrencySelect
                  value={form.watch('currency') || ''}
                  onChange={(v) => form.setValue('currency', v || (organization?.default_currency ?? 'AFN'))}
                  placeholder="Select currency"
                  disabled={isLoading}
                />
              ) : (
                <div className="flex h-9 items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-sm font-medium">
                  {organization?.default_currency ?? 'AFN'} (base currency — multi-currency disabled)
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="exchange_rate" required>Exchange Rate</Label>
              <Input
                id="exchange_rate"
                type="number"
                step="0.000001"
                {...form.register('exchange_rate', { valueAsNumber: true })}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Reference</Label>
              <Input
                id="reference"
                placeholder="Optional reference number"
                {...form.register('reference')}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" required>Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the purpose of this journal entry..."
              {...form.register('description')}
              disabled={isLoading}
              rows={2}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          {/* Journal Entry Lines */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Entry Lines</h3>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addLine}
                  disabled={isLoading}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Line
                </Button>
              </div>

              {/* Lines Header — xlsm-style columns (Journal.xlsm) */}
              <div className="grid grid-cols-12 gap-2 mb-2 text-xs font-medium text-muted-foreground px-2 uppercase tracking-wider">
                <div className="col-span-3">Account</div>
                <div className="col-span-2">Class</div>
                <div className="col-span-2">Description</div>
                <div className="col-span-1 text-right">Debit</div>
                <div className="col-span-1 text-right">Credit</div>
                <div className="col-span-1">Account Type</div>
                <div className="col-span-1"></div>
              </div>

              {/* Lines — xlsm-style: Account, Class, Description, Debit, Credit, Account Type */}
              <div className="space-y-2">
                {fields.map((field, index) => {
                  const accountId = form.watch(`lines.${index}.account_id`)
                  const projectId = form.watch(`lines.${index}.project_id`)
                  const selectedAccount = postingAccounts.find((a: ChartOfAccount) => a.id === accountId)
                  return (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-3">
                        <Select
                          value={accountId?.toString() || ''}
                          onValueChange={(value) => form.setValue(`lines.${index}.account_id`, parseInt(value))}
                          disabled={isLoading}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Account" />
                          </SelectTrigger>
                          <SelectContent>
                            {postingAccounts.map((account: ChartOfAccount) => {
                              const currency = displayCurrencyForAccount(account, baseCurrency)
                              return (
                                <SelectItem key={account.id} value={account.id.toString()}>
                                  <span className="font-mono text-xs mr-2">{account.account_code}</span>
                                  <span className="text-muted-foreground text-[10px] mr-1.5">({currency})</span>
                                  {account.account_name}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Select
                          value={projectId != null ? String(projectId) : 'none'}
                          onValueChange={(v) => form.setValue(`lines.${index}.project_id`, v === 'none' ? undefined : parseInt(v))}
                          disabled={isLoading}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Class" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">—</SelectItem>
                            {projectsList.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                {p.project_code} {p.project_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Input
                          className="h-9"
                          placeholder="Description"
                          {...form.register(`lines.${index}.description`)}
                          disabled={isLoading}
                        />
                      </div>
                      <div className="col-span-1">
                        <Input
                          className="h-9 text-right"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={form.watch(`lines.${index}.debit_amount`) || ''}
                          onChange={(e) => handleDebitChange(index, parseFloat(e.target.value) || 0)}
                          disabled={isLoading}
                        />
                      </div>
                      <div className="col-span-1">
                        <Input
                          className="h-9 text-right"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={form.watch(`lines.${index}.credit_amount`) || ''}
                          onChange={(e) => handleCreditChange(index, parseFloat(e.target.value) || 0)}
                          disabled={isLoading}
                        />
                      </div>
                      <div className="col-span-1 text-xs text-muted-foreground flex items-center">
                        {selectedAccount?.account_type ?? '—'}
                      </div>
                      <div className="col-span-2 text-center">
                        {fields.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => remove(index)}
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Totals */}
              <div className="grid grid-cols-12 gap-2 mt-4 pt-4 border-t">
                <div className="col-span-9 text-right font-medium">Totals:</div>
                <div className="col-span-1 text-right font-mono font-medium">
                  {formatCurrency(balanceStatus.totalDebit)}
                </div>
                <div className="col-span-1 text-right font-mono font-medium">
                  {formatCurrency(balanceStatus.totalCredit)}
                </div>
                <div className="col-span-1"></div>
              </div>

              {/* Balance Status */}
              <div className="mt-4 flex items-center justify-end gap-2">
                {balanceStatus.isValid ? (
                  <Badge variant="success" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Entry is balanced
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Out of balance by {formatCurrency(balanceStatus.difference)}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !balanceStatus.isValid}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update Entry' : 'Save as draft'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
