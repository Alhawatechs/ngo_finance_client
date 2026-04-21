'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  Star,
  DollarSign,
  ArrowRightLeft,
  Calculator,
  TrendingUp,
  Info,
  Lock,
  Search,
  Eye,
  X,
} from 'lucide-react'
import { ActionMenu } from '@/components/ui/action-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { Currency, ExchangeRate } from '@/types'
import {
  getCurrencies,
  createCurrency,
  updateCurrency,
  deleteCurrency,
  setDefaultCurrency,
  getExchangeRates,
  createExchangeRate,
  deleteExchangeRate,
  convertAmount,
  COMMON_CURRENCIES,
  CurrencyFormData,
  ExchangeRateFormData,
} from '@/lib/api/currencies'
import { useOrganizationStore } from '@/stores/organizationStore'
import { ChartOfAccountsPageFrame } from '@/components/finance/ChartOfAccountsPageFrame'
import {
  FinanceDataTable,
  FinanceDataTableHeader,
  FinanceDataTableTh,
  FinanceDataTableRow,
  FinanceDataTableTd,
} from '@/components/finance'

export default function CurrencyModuleClient() {
  const pathname = usePathname()
  const section = pathname?.endsWith('/exchange-rates')
    ? 'rates'
    : pathname?.endsWith('/converter')
      ? 'converter'
      : 'currencies'

  const { organization, updateOrganization } = useOrganizationStore()
  const baseCurrency = organization?.default_currency ?? 'AFN'
  const multiCurrencyEnabled = organization?.enable_multi_currency !== false

  const [currencySearchQuery, setCurrencySearchQuery] = useState('')
  const [ratesSearchQuery, setRatesSearchQuery] = useState('')
  const [addAnotherRate, setAddAnotherRate] = useState(false)
  const [currencyDialogOpen, setCurrencyDialogOpen] = useState(false)
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null)
  const [deleteCurrencyDialogOpen, setDeleteCurrencyDialogOpen] = useState(false)
  const [currencyToDelete, setCurrencyToDelete] = useState<Currency | null>(null)
  const [viewCurrencyDialogOpen, setViewCurrencyDialogOpen] = useState(false)
  const [viewingCurrency, setViewingCurrency] = useState<Currency | null>(null)
  const [rateDialogOpen, setRateDialogOpen] = useState(false)
  const [deleteRateDialogOpen, setDeleteRateDialogOpen] = useState(false)
  const [rateToDelete, setRateToDelete] = useState<ExchangeRate | null>(null)
  
  // Currency form state
  const [currencyForm, setCurrencyForm] = useState<CurrencyFormData>({
    code: '',
    name: '',
    symbol: '',
    decimal_places: 2,
    is_default: false,
    is_active: true,
  })
  
  // Exchange rate form state (initial defaults, updated when org loads)
  const [rateForm, setRateForm] = useState<ExchangeRateFormData>({
    from_currency: 'AFN',
    to_currency: 'USD',
    rate: 0,
    effective_date: new Date().toISOString().split('T')[0],
    source: '',
  })
  
  // Converter state
  const [convertFrom, setConvertFrom] = useState('AFN')
  const [convertTo, setConvertTo] = useState('USD')
  const [convertAmount, setConvertAmount] = useState('')
  const [conversionResult, setConversionResult] = useState<number | null>(null)
  const [conversionRate, setConversionRate] = useState<number | null>(null)

  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch currencies
  const { data: currenciesData, isLoading: currenciesLoading, refetch: refetchCurrencies } = useQuery({
    queryKey: ['currencies'],
    queryFn: () => getCurrencies(),
  })
  
  const currencies: Currency[] = currenciesData?.data || []

  // Fetch exchange rates
  const { data: ratesData, isLoading: ratesLoading, refetch: refetchRates } = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: () => getExchangeRates({ per_page: 100 }),
  })
  
  const rates: ExchangeRate[] = ratesData?.data || []

  // Create currency mutation
  const createCurrencyMutation = useMutation({
    mutationFn: createCurrency,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] })
      setCurrencyDialogOpen(false)
      resetCurrencyForm()
      toast({ title: 'Currency Created', description: 'Currency has been added successfully.' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to create currency', variant: 'destructive' })
    },
  })

  // Update currency mutation
  const updateCurrencyMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CurrencyFormData> }) => updateCurrency(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] })
      setCurrencyDialogOpen(false)
      setEditingCurrency(null)
      resetCurrencyForm()
      toast({ title: 'Currency Updated', description: 'Currency has been updated successfully.' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to update currency', variant: 'destructive' })
    },
  })

  // Delete currency mutation
  const deleteCurrencyMutation = useMutation({
    mutationFn: deleteCurrency,
    onSuccess: (data: { message?: string } | undefined) => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] })
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] })
      setDeleteCurrencyDialogOpen(false)
      setCurrencyToDelete(null)
      toast({ title: 'Currency Deleted', description: data?.message ?? 'Currency has been deleted.' })
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || error.message || 'Failed to delete currency'
      toast({ title: 'Cannot Delete Currency', description: msg, variant: 'destructive' })
    },
  })

  // Set default currency mutation
  const setDefaultMutation = useMutation({
    mutationFn: setDefaultCurrency,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] })
      toast({ title: 'Default Currency Updated', description: 'Default currency has been set.' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to set default currency', variant: 'destructive' })
    },
  })

  // Create exchange rate mutation
  const createRateMutation = useMutation({
    mutationFn: createExchangeRate,
    onSuccess: (data: { message?: string } | undefined) => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] })
      resetRateForm()
      toast({ title: 'Exchange Rate Saved', description: data?.message ?? 'Exchange rate has been saved.' })
      if (!addAnotherRate) setRateDialogOpen(false)
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to add exchange rate', variant: 'destructive' })
    },
  })

  // Delete exchange rate mutation
  const deleteRateMutation = useMutation({
    mutationFn: deleteExchangeRate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] })
      setDeleteRateDialogOpen(false)
      setRateToDelete(null)
      toast({ title: 'Exchange Rate Deleted', description: 'Exchange rate has been deleted.' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to delete exchange rate', variant: 'destructive' })
    },
  })

  const resetCurrencyForm = () => {
    setCurrencyForm({ code: '', name: '', symbol: '', decimal_places: 2, is_default: false, is_active: true })
  }

  const resetRateForm = () => {
    const other = currencies.find(c => c.code !== baseCurrency)?.code || (baseCurrency === 'AFN' ? 'USD' : 'AFN')
    setRateForm({
      from_currency: baseCurrency,
      to_currency: other,
      rate: 0,
      effective_date: new Date().toISOString().split('T')[0],
      source: '',
    })
  }

  const handleEditCurrency = (currency: Currency) => {
    setEditingCurrency(currency)
    setCurrencyForm({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      decimal_places: currency.decimal_places ?? 2,
      is_default: currency.is_default,
      is_active: currency.is_active !== false,
    })
    setCurrencyDialogOpen(true)
  }

  const handleSaveCurrency = () => {
    const { code, name, symbol, decimal_places } = currencyForm
    const dp = typeof decimal_places === 'number' ? decimal_places : parseInt(String(decimal_places), 10) || 2

    if (!code?.trim()) {
      toast({ title: 'Validation Error', description: 'Currency code is required (3 letters).', variant: 'destructive' })
      return
    }
    if (code.trim().length !== 3) {
      toast({ title: 'Validation Error', description: 'Currency code must be exactly 3 characters (e.g., USD, EUR).', variant: 'destructive' })
      return
    }
    if (!name?.trim()) {
      toast({ title: 'Validation Error', description: 'Currency name is required.', variant: 'destructive' })
      return
    }
    if (!symbol?.trim()) {
      toast({ title: 'Validation Error', description: 'Currency symbol is required.', variant: 'destructive' })
      return
    }
    if (dp < 0 || dp > 6) {
      toast({ title: 'Validation Error', description: 'Decimal places must be between 0 and 6.', variant: 'destructive' })
      return
    }
    if (!editingCurrency && currencies.some(c => c.code.toUpperCase() === code.trim().toUpperCase())) {
      toast({ title: 'Validation Error', description: `Currency ${code} already exists.`, variant: 'destructive' })
      return
    }

    if (editingCurrency) {
      updateCurrencyMutation.mutate({ id: editingCurrency.id, data: { name, symbol, decimal_places: dp, is_default: currencyForm.is_default, is_active: currencyForm.is_active } })
    } else {
      createCurrencyMutation.mutate({ code: code.trim().toUpperCase(), name: name.trim(), symbol: symbol.trim(), decimal_places: dp, is_default: currencyForm.is_default, is_active: currencyForm.is_active !== false })
    }
  }

  const handleSelectCommonCurrency = (code: string) => {
    const common = COMMON_CURRENCIES.find(c => c.code === code)
    if (common) {
      setCurrencyForm({
        ...currencyForm,
        code: common.code,
        name: common.name,
        symbol: common.symbol,
      })
    }
  }

  const handleConvert = async () => {
    if (!convertAmount || parseFloat(convertAmount) <= 0) return
    
    // Find the rate
    const rate = rates.find(r => r.from_currency === convertFrom && r.to_currency === convertTo)
    if (rate) {
      const result = parseFloat(convertAmount) * rate.rate
      setConversionResult(result)
      setConversionRate(rate.rate)
    } else {
      // Try reverse
      const reverseRate = rates.find(r => r.from_currency === convertTo && r.to_currency === convertFrom)
      if (reverseRate) {
        const result = parseFloat(convertAmount) / reverseRate.rate
        setConversionResult(result)
        setConversionRate(1 / reverseRate.rate)
      } else {
        toast({ title: 'No Rate Found', description: 'No exchange rate found for this currency pair', variant: 'destructive' })
      }
    }
  }

  return (
    <>
    <ChartOfAccountsPageFrame title="Currency module">
      <div className="flex min-h-0 flex-1 flex-col space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
          <p className="text-sm text-muted-foreground max-w-2xl">
            {multiCurrencyEnabled
              ? 'Manage active currencies, exchange rates, and conversions for vouchers, journal books, and period close.'
              : 'Single currency mode — only the organization base currency is used.'}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                refetchCurrencies()
                refetchRates()
              }}
              disabled={currenciesLoading || ratesLoading}
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', (currenciesLoading || ratesLoading) && 'animate-spin')} />
              Refresh
            </Button>
            {multiCurrencyEnabled && section === 'currencies' && (
              <Button
                size="sm"
                onClick={() => {
                  setEditingCurrency(null)
                  resetCurrencyForm()
                  setCurrencyDialogOpen(true)
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Currency
              </Button>
            )}
            {multiCurrencyEnabled && section === 'rates' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  resetRateForm()
                  setRateDialogOpen(true)
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Rate
              </Button>
            )}
          </div>
        </div>

        {section === 'currencies' && (
        <div className="space-y-4">
          {!multiCurrencyEnabled && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3">
              <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-900 dark:text-amber-100">Single currency mode</p>
                <p className="text-amber-800 dark:text-amber-200 mt-0.5">
                  Your organization uses only the base currency ({baseCurrency}). Enable multi-currency in <Link href="/admin/organization" className="underline font-medium">Organization Setup</Link> to add and manage additional currencies.
                </p>
              </div>
            </div>
          )}

          <Card className="coa-ledger-card flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="coa-toolbar shrink-0 px-3 py-1.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <div className="flex items-center gap-2 shrink-0">
                  <DollarSign className="h-4 w-4 text-primary" aria-hidden />
                  <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Active currencies</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {currenciesLoading ? '…' : `${currencies.length}`}
                  </span>
                </div>
                <div className="relative min-w-[min(100%,200px)] flex-1 max-w-md">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search currencies…"
                    value={currencySearchQuery}
                    onChange={(e) => setCurrencySearchQuery(e.target.value)}
                    className="h-8 border-border/80 bg-background pl-8 text-xs focus-visible:ring-0.5 focus-visible:ring-ring"
                  />
                  {currencySearchQuery ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0.5 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full"
                      onClick={() => setCurrencySearchQuery('')}
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
            <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
              <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto p-3">
                <div className="coa-ledger-table-frame">
                  <FinanceDataTable
                    className="min-w-0 rounded-none border-0 bg-transparent shadow-none"
                    tableClassName="w-full min-w-[720px] border-collapse text-xs"
                  >
                      <FinanceDataTableHeader
                        theadClassName="coa-ledger-thead sticky top-0 z-10"
                        className="[&_th]:!text-primary-foreground [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider"
                      >
                        <FinanceDataTableTh className="w-10 text-center">No</FinanceDataTableTh>
                        <FinanceDataTableTh>Currency</FinanceDataTableTh>
                        <FinanceDataTableTh className="text-center">Symbol</FinanceDataTableTh>
                        <FinanceDataTableTh className="text-center">Decimals</FinanceDataTableTh>
                        <FinanceDataTableTh className="text-center">Base</FinanceDataTableTh>
                        <FinanceDataTableTh className="text-center">Status</FinanceDataTableTh>
                        <FinanceDataTableTh className="text-center w-14">Actions</FinanceDataTableTh>
                      </FinanceDataTableHeader>
                <tbody>
                  {currenciesLoading && (
                    [...Array(5)].map((_, i) => (
                      <FinanceDataTableRow key={i}>
                        <FinanceDataTableTd className="text-center"><Skeleton className="h-3.5 w-5 mx-auto" /></FinanceDataTableTd>
                        <FinanceDataTableTd><Skeleton className="h-3.5 w-32" /></FinanceDataTableTd>
                        <FinanceDataTableTd className="text-center"><Skeleton className="h-3.5 w-8 mx-auto" /></FinanceDataTableTd>
                        <FinanceDataTableTd className="text-center"><Skeleton className="h-3.5 w-10 mx-auto" /></FinanceDataTableTd>
                        <FinanceDataTableTd className="text-center"><Skeleton className="h-3.5 w-12 mx-auto" /></FinanceDataTableTd>
                        <FinanceDataTableTd className="text-center"><Skeleton className="h-3.5 w-14 mx-auto" /></FinanceDataTableTd>
                        <FinanceDataTableTd className="text-center"><Skeleton className="h-3.5 w-8 mx-auto" /></FinanceDataTableTd>
                      </FinanceDataTableRow>
                    ))
                  )}
                  {!currenciesLoading && (() => {
                    const q = currencySearchQuery.trim().toLowerCase()
                    const filtered = q
                      ? currencies.filter(c => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.symbol.includes(q))
                      : currencies
                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} className="py-16 text-center">
                            <div className="flex flex-col items-center max-w-md mx-auto">
                              <div className="flex h-14 w-14 items-center justify-center rounded-md border border-border bg-muted/30 text-muted-foreground mb-4">
                                <DollarSign className="h-7 w-7" />
                              </div>
                              <p className="font-medium text-foreground">
                                {q ? 'No currencies match your search' : 'No currencies configured'}
                              </p>
                              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                                {q
                                  ? 'Try adjusting your search. Use code, name, or symbol.'
                                  : multiCurrencyEnabled ? 'Use Add Currency in the toolbar above.' : 'Enable multi-currency in Organization Setup to add currencies.'}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )
                    }
                    return filtered.map((currency, index) => {
                      const isOrgBase = currency.code === baseCurrency
                      const canSetDefault = multiCurrencyEnabled && !isOrgBase
                      const canDelete = !isOrgBase
                      const canEdit = true
                      return (
                        <FinanceDataTableRow
                          key={currency.id}
                          className={cn(isOrgBase && 'bg-primary/5', !multiCurrencyEnabled && !isOrgBase && 'opacity-60')}
                        >
                          <FinanceDataTableTd className="text-center tabular-nums text-muted-foreground">
                            {index + 1}
                          </FinanceDataTableTd>
                          <FinanceDataTableTd>
                            <span className="font-medium text-foreground">{currency.code}</span>
                            <span className="text-muted-foreground"> — </span>
                            <span className="text-foreground/90">{currency.name}</span>
                          </FinanceDataTableTd>
                          <FinanceDataTableTd className="text-center font-semibold">{currency.symbol}</FinanceDataTableTd>
                          <FinanceDataTableTd className="text-center tabular-nums text-muted-foreground">{currency.decimal_places}</FinanceDataTableTd>
                          <FinanceDataTableTd className="text-center">
                            {isOrgBase ? (
                              <Badge variant="success" className="text-[10px] font-medium">
                                <Star className="h-2.5 w-2.5 mr-1 inline" />
                                Yes
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">No</span>
                            )}
                          </FinanceDataTableTd>
                          <FinanceDataTableTd className="text-center">
                            <Badge variant={currency.is_active ? 'success' : 'secondary'} className="text-[10px]">
                              {currency.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </FinanceDataTableTd>
                          <FinanceDataTableTd className="text-center">
                            {[canEdit, canSetDefault, canDelete].some(Boolean) ? (
                              <ActionMenu
                                triggerClassName="h-8 w-8"
                                items={[
                                  { label: 'View', icon: <Eye className="h-4 w-4" />, onClick: () => { setViewingCurrency(currency); setViewCurrencyDialogOpen(true) } },
                                  ...(canEdit ? [{ label: 'Edit', icon: <Edit className="h-4 w-4" />, onClick: () => handleEditCurrency(currency) }] : []),
                                  ...(canSetDefault ? [{ label: 'Set as Default', icon: <Star className="h-4 w-4" />, onClick: async () => {
                                    setDefaultMutation.mutate(currency.id)
                                    await updateOrganization({ default_currency: currency.code })
                                  } }] : []),
                                  ...(canDelete ? [{ label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: () => { setCurrencyToDelete(currency); setDeleteCurrencyDialogOpen(true); }, destructive: true }] : []),
                                ]}
                              />
                            ) : (
                              <span className="text-xs text-slate-500" title="Set another currency as default first to delete this one">—</span>
                            )}
                          </FinanceDataTableTd>
                        </FinanceDataTableRow>
                      )
                    })
                  })()}
                </tbody>
            </FinanceDataTable>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        )}

        {section === 'rates' && (
        <div className="space-y-4">
          {!multiCurrencyEnabled && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3">
              <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Exchange rates apply only when multi-currency is enabled. Enable it in <Link href="/admin/organization" className="underline font-medium">Organization Setup</Link>.
              </p>
            </div>
          )}

          <Card className="coa-ledger-card flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="coa-toolbar shrink-0 px-3 py-1.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <div className="flex items-center gap-2 shrink-0">
                  <TrendingUp className="h-4 w-4 text-primary" aria-hidden />
                  <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Exchange rates</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {ratesLoading ? '…' : `${rates.length}`}
                  </span>
                </div>
                <div className="relative min-w-[min(100%,200px)] flex-1 max-w-md">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search pair or source…"
                    value={ratesSearchQuery}
                    onChange={(e) => setRatesSearchQuery(e.target.value)}
                    className="h-8 border-border/80 bg-background pl-8 text-xs focus-visible:ring-0.5 focus-visible:ring-ring"
                  />
                  {ratesSearchQuery ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0.5 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full"
                      onClick={() => setRatesSearchQuery('')}
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
            <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
              <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto p-3">
                <div className="coa-ledger-table-frame">
                  <FinanceDataTable
                    className="min-w-0 rounded-none border-0 bg-transparent shadow-none"
                    tableClassName="w-full min-w-[720px] border-collapse text-xs"
                  >
                      <FinanceDataTableHeader
                        theadClassName="coa-ledger-thead sticky top-0 z-10"
                        className="[&_th]:!text-primary-foreground [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider"
                      >
                        <FinanceDataTableTh className="w-10 text-center">No</FinanceDataTableTh>
                        <FinanceDataTableTh className="text-center">From</FinanceDataTableTh>
                        <FinanceDataTableTh className="text-center">To</FinanceDataTableTh>
                        <FinanceDataTableTh align="right">Rate</FinanceDataTableTh>
                        <FinanceDataTableTh>Effective</FinanceDataTableTh>
                        <FinanceDataTableTh>Source</FinanceDataTableTh>
                        <FinanceDataTableTh className="text-center w-14">Actions</FinanceDataTableTh>
                      </FinanceDataTableHeader>
                <tbody>
                  {ratesLoading && (
                    [...Array(5)].map((_, i) => (
                      <FinanceDataTableRow key={i}>
                        <FinanceDataTableTd className="text-center"><Skeleton className="h-3.5 w-5 mx-auto" /></FinanceDataTableTd>
                        <FinanceDataTableTd className="text-center"><Skeleton className="h-3.5 w-12 mx-auto" /></FinanceDataTableTd>
                        <FinanceDataTableTd className="text-center"><Skeleton className="h-3.5 w-12 mx-auto" /></FinanceDataTableTd>
                        <FinanceDataTableTd className="text-right"><Skeleton className="h-3.5 w-16" /></FinanceDataTableTd>
                        <FinanceDataTableTd><Skeleton className="h-3.5 w-20" /></FinanceDataTableTd>
                        <FinanceDataTableTd><Skeleton className="h-3.5 w-16" /></FinanceDataTableTd>
                        <FinanceDataTableTd className="text-center"><Skeleton className="h-3.5 w-8 mx-auto" /></FinanceDataTableTd>
                      </FinanceDataTableRow>
                    ))
                  )}
                  {!ratesLoading && (() => {
                    const q = ratesSearchQuery.trim().toLowerCase()
                    const filtered = q
                      ? rates.filter(r =>
                          r.from_currency.toLowerCase().includes(q) ||
                          r.to_currency.toLowerCase().includes(q) ||
                          (r.source?.toLowerCase().includes(q))
                        )
                      : rates
                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} className="py-16 text-center">
                            <div className="flex flex-col items-center max-w-md mx-auto">
                              <div className="flex h-14 w-14 items-center justify-center rounded-md border border-border bg-muted/30 text-muted-foreground mb-4">
                                <TrendingUp className="h-7 w-7" />
                              </div>
                              <p className="font-medium text-foreground">
                                {q ? 'No rates match your search' : 'No exchange rates'}
                              </p>
                              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                                {q ? 'Try adjusting your search.' : 'Use Add Rate in the toolbar above.'}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )
                    }
                    return filtered.map((rate, index) => (
                      <FinanceDataTableRow key={rate.id}>
                        <FinanceDataTableTd className="text-center tabular-nums text-muted-foreground">
                          {index + 1}
                        </FinanceDataTableTd>
                        <FinanceDataTableTd className="text-center font-mono font-semibold">{rate.from_currency}</FinanceDataTableTd>
                        <FinanceDataTableTd className="text-center font-mono font-semibold">{rate.to_currency}</FinanceDataTableTd>
                        <FinanceDataTableTd className="text-right font-mono tabular-nums">{Number(rate.rate ?? 0).toFixed(6)}</FinanceDataTableTd>
                        <FinanceDataTableTd className="text-muted-foreground">{formatDate(rate.effective_date)}</FinanceDataTableTd>
                        <FinanceDataTableTd className="text-muted-foreground">{rate.source || '—'}</FinanceDataTableTd>
                        <FinanceDataTableTd className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => { setRateToDelete(rate); setDeleteRateDialogOpen(true) }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </FinanceDataTableTd>
                      </FinanceDataTableRow>
                    ))
                  })()}
                </tbody>
            </FinanceDataTable>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        )}

        {section === 'converter' && (
        <div className="space-y-4">
          {!multiCurrencyEnabled && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3">
              <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Currency converter is used when you have multiple currencies. With single currency mode, all amounts are in {baseCurrency}. Enable multi-currency in <Link href="/admin/organization" className="underline font-medium">Organization Setup</Link> to use the converter.
              </p>
            </div>
          )}

          <Card className={cn('coa-ledger-card max-w-xl overflow-hidden', !multiCurrencyEnabled && 'opacity-75')}>
            <div className="coa-toolbar shrink-0 px-3 py-2">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-primary" aria-hidden />
                <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Currency converter</span>
                <span className="text-xs text-muted-foreground">Uses saved exchange rates</span>
              </div>
            </div>
            <CardContent className="space-y-6 p-4 md:p-6">
              {/* Amount input */}
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={convertAmount}
                  onChange={(e) => setConvertAmount(e.target.value)}
                  className="h-11 border-border text-lg font-semibold tabular-nums"
                />
              </div>
              {/* Currency pair with swap */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="flex-1 space-y-2">
                  <Label className="text-muted-foreground text-sm">From</Label>
                  <Select value={convertFrom} onValueChange={setConvertFrom}>
                    <SelectTrigger className="h-10 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code} — {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-center sm:flex-none pt-2 sm:pt-0">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-full border-slate-200 hover:bg-slate-100 hover:border-slate-300 shrink-0"
                    onClick={() => { setConvertFrom(convertTo); setConvertTo(convertFrom); setConversionResult(null) }}
                    title="Swap currencies"
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 space-y-2">
                  <Label className="text-muted-foreground text-sm">To</Label>
                  <Select value={convertTo} onValueChange={setConvertTo}>
                    <SelectTrigger className="h-10 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code} — {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={handleConvert}
                className="w-full h-11 rounded-lg font-medium bg-[#023e8a] hover:bg-[#0353a6]"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Convert
              </Button>
              {conversionResult !== null && (
                <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 text-center space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Result</p>
                  <p className="text-3xl font-bold tabular-nums text-slate-800">
                    {convertTo} {Number(conversionResult).toFixed(2)}
                  </p>
                  {conversionRate && (
                    <div className="text-sm text-slate-500 pt-2 border-t border-slate-100">
                      1 {convertFrom} = {Number(conversionRate).toFixed(6)} {convertTo}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        )}
      </div>
    </ChartOfAccountsPageFrame>

      {/* Currency Form Dialog */}
      <Dialog open={currencyDialogOpen} onOpenChange={(open) => {
        if (open !== currencyDialogOpen) {
          setCurrencyDialogOpen(open)
          if (!open) { setEditingCurrency(null); resetCurrencyForm() }
        }
      }}>
        <DialogContent className="max-w-md rounded-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCurrency ? 'Edit Currency' : 'Add Currency'}</DialogTitle>
            <DialogDescription>
              {editingCurrency ? 'Update currency details' : 'Add a new currency to your organization'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!editingCurrency && (
              <div className="space-y-2">
                <Label>Quick Select</Label>
                <Select onValueChange={handleSelectCommonCurrency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select common currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.symbol} {c.code} - {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code" required>Code</Label>
                <Input
                  id="code"
                  placeholder="USD"
                  value={currencyForm.code}
                  onChange={(e) => setCurrencyForm({ ...currencyForm, code: e.target.value.toUpperCase() })}
                  maxLength={3}
                  disabled={!!editingCurrency}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="symbol" required>Symbol</Label>
                <Input
                  id="symbol"
                  placeholder="$"
                  value={currencyForm.symbol}
                  onChange={(e) => setCurrencyForm({ ...currencyForm, symbol: e.target.value })}
                  maxLength={10}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name" required>Name</Label>
              <Input
                id="name"
                placeholder="US Dollar"
                value={currencyForm.name}
                onChange={(e) => setCurrencyForm({ ...currencyForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="decimal_places">Decimal Places</Label>
              <Input
                id="decimal_places"
                type="number"
                min={0}
                max={6}
                value={currencyForm.decimal_places}
                onChange={(e) => setCurrencyForm({ ...currencyForm, decimal_places: parseInt(e.target.value) || 2 })}
              />
              <p className="text-xs text-muted-foreground">Used for formatting amounts (0–6)</p>
            </div>
            {editingCurrency && (
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label htmlFor="is_active">Active</Label>
                  <p className="text-xs text-muted-foreground">Inactive currencies are hidden from selection but not deleted.</p>
                </div>
                <Switch
                  id="is_active"
                  checked={currencyForm.is_active !== false}
                  onCheckedChange={(checked) => setCurrencyForm({ ...currencyForm, is_active: checked })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCurrencyDialogOpen(false)} disabled={createCurrencyMutation.isPending || updateCurrencyMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveCurrency}
              disabled={createCurrencyMutation.isPending || updateCurrencyMutation.isPending}
            >
              {createCurrencyMutation.isPending || updateCurrencyMutation.isPending
                ? (editingCurrency ? 'Updating…' : 'Creating…')
                : (editingCurrency ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Currency Dialog */}
      <Dialog open={viewCurrencyDialogOpen} onOpenChange={(open) => { if (open !== viewCurrencyDialogOpen) { setViewCurrencyDialogOpen(open); if (!open) setViewingCurrency(null) } }}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewingCurrency && <span className="text-xl font-semibold">{viewingCurrency.symbol}</span>}
              Currency Details
            </DialogTitle>
            <DialogDescription>View currency information</DialogDescription>
          </DialogHeader>
          {viewingCurrency && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Code</p>
                  <p className="font-mono font-semibold">{viewingCurrency.code}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Symbol</p>
                  <p className="text-lg font-semibold">{viewingCurrency.symbol}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-medium text-muted-foreground">Name</p>
                  <p className="font-medium">{viewingCurrency.name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Decimal places</p>
                  <p className="tabular-nums">{viewingCurrency.decimal_places ?? 2}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Base currency</p>
                  <div>{viewingCurrency.code === baseCurrency ? <Badge variant="success">Yes</Badge> : 'No'}</div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Status</p>
                  <div><Badge variant={viewingCurrency.is_active ? 'success' : 'secondary'}>{viewingCurrency.is_active ? 'Active' : 'Inactive'}</Badge></div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setViewCurrencyDialogOpen(false)}>Close</Button>
                <Button onClick={() => { setViewCurrencyDialogOpen(false); handleEditCurrency(viewingCurrency) }}>Edit</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Exchange Rate Dialog */}
      <Dialog open={rateDialogOpen} onOpenChange={(open) => {
        if (open !== rateDialogOpen) {
          setRateDialogOpen(open)
          if (!open) { resetRateForm(); setAddAnotherRate(false) }
        }
      }}>
        <DialogContent className="max-w-md rounded-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Exchange Rate</DialogTitle>
            <DialogDescription>Add a new exchange rate between currencies. Existing rates for the same pair and date will be updated.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Currency pair with swap */}
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <Label required>From Currency</Label>
                <Select
                  value={rateForm.from_currency}
                  onValueChange={(v) => setRateForm({ ...rateForm, from_currency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 mb-0.5"
                title="Swap currencies"
                onClick={() => {
                  const newFrom = rateForm.to_currency
                  const newTo = rateForm.from_currency
                  const r = rateForm.rate && rateForm.rate > 0 ? 1 / rateForm.rate : 0
                  setRateForm({ ...rateForm, from_currency: newFrom, to_currency: newTo, rate: r })
                }}
              >
                <ArrowRightLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 space-y-2">
                <Label required>To Currency</Label>
                <Select
                  value={rateForm.to_currency}
                  onValueChange={(v) => setRateForm({ ...rateForm, to_currency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Use latest rate hint */}
            {(() => {
              const latest = rates
                .filter(r => r.from_currency === rateForm.from_currency && r.to_currency === rateForm.to_currency)
                .sort((a, b) => (b.effective_date > a.effective_date ? 1 : -1))[0]
              if (!latest || rateForm.from_currency === rateForm.to_currency) return null
              return (
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2">
                  <p className="text-sm text-slate-600">
                    Latest: 1 {latest.from_currency} = {Number(latest.rate ?? 0).toFixed(6)} {latest.to_currency}
                    <span className="text-slate-500 ml-1">({formatDate(latest.effective_date)})</span>
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setRateForm({ ...rateForm, rate: Number(latest.rate ?? 0), effective_date: latest.effective_date, source: latest.source || rateForm.source })}
                  >
                    Use this
                  </Button>
                </div>
              )
            })()}

            <div className="space-y-2">
              <Label htmlFor="rate" required>Rate</Label>
              <Input
                id="rate"
                type="number"
                step="0.000001"
                min="0.000001"
                placeholder="e.g. 0.0134"
                value={rateForm.rate || ''}
                onChange={(e) => setRateForm({ ...rateForm, rate: parseFloat(e.target.value) || 0 })}
                className="font-mono"
              />
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>1 {rateForm.from_currency} = {rateForm.rate ? Number(rateForm.rate).toFixed(6) : '?'} {rateForm.to_currency}</span>
                {rateForm.rate && Number(rateForm.rate) > 0 && (
                  <span>1 {rateForm.to_currency} = {(1 / Number(rateForm.rate)).toFixed(6)} {rateForm.from_currency}</span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="effective_date" required>Effective Date</Label>
              <DatePicker
                id="effective_date"
                value={rateForm.effective_date}
                onChange={(v) => setRateForm({ ...rateForm, effective_date: v })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate_source">Source</Label>
              <Input
                id="rate_source"
                placeholder="e.g., Central Bank, OANDA, Manual"
                value={rateForm.source}
                onChange={(e) => setRateForm({ ...rateForm, source: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="add_another" className="cursor-pointer">Add another after saving</Label>
                <p className="text-xs text-muted-foreground">Keep dialog open to add more rates</p>
              </div>
              <Switch
                id="add_another"
                checked={addAnotherRate}
                onCheckedChange={setAddAnotherRate}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRateDialogOpen(false)} disabled={createRateMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (rateForm.from_currency === rateForm.to_currency) {
                  toast({ title: 'Validation Error', description: 'From and To currency must be different.', variant: 'destructive' })
                  return
                }
                if (!rateForm.rate || parseFloat(String(rateForm.rate)) <= 0) {
                  toast({ title: 'Validation Error', description: 'Rate must be greater than 0.', variant: 'destructive' })
                  return
                }
                createRateMutation.mutate({ ...rateForm, rate: parseFloat(String(rateForm.rate)) })
              }}
              disabled={createRateMutation.isPending}
            >
              {createRateMutation.isPending ? 'Saving…' : 'Save Rate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Currency Dialog */}
      <AlertDialog open={deleteCurrencyDialogOpen} onOpenChange={(open) => { if (open !== deleteCurrencyDialogOpen) setDeleteCurrencyDialogOpen(open) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Currency</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {currencyToDelete?.code} — {currencyToDelete?.name}?
              {(() => {
                const affectedRates = currencyToDelete ? rates.filter(r => r.from_currency === currencyToDelete.code || r.to_currency === currencyToDelete.code).length : 0
                return affectedRates > 0
                  ? ` ${affectedRates} exchange rate${affectedRates !== 1 ? 's' : ''} involving this currency will also be removed.`
                  : ' This currency has no exchange rates.'
              })()} This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCurrencyMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => currencyToDelete && deleteCurrencyMutation.mutate(currencyToDelete.id)}
              disabled={deleteCurrencyMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCurrencyMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Rate Dialog */}
      <AlertDialog open={deleteRateDialogOpen} onOpenChange={(open) => { if (open !== deleteRateDialogOpen) setDeleteRateDialogOpen(open) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exchange Rate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this exchange rate?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rateToDelete && deleteRateMutation.mutate(rateToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
