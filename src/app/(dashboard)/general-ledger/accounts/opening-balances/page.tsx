'use client'

import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCurrency } from '@/lib/utils'
import { Save, Wallet, Search, X, ChevronDown, ChevronRight, BookOpen, FileText, ChevronsDown, ChevronsUp, Lock } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { getAccountsTree, flattenAccountsTree, updateAccount } from '@/lib/api/chart-of-accounts'
import { ChartOfAccount } from '@/types'
import { useOrganizationStore } from '@/stores/organizationStore'
import { useCurrencies } from '@/hooks/useCurrencies'
import { ChartOfAccountsPageFrame } from '@/components/finance/ChartOfAccountsPageFrame'
import { useChartOfAccountsPermissions } from '@/hooks/useChartOfAccountsPermissions'
import {
  DEFAULT_COA_EXPAND_MAX_DEPTH,
  getDefaultExpandedIds,
  getExpandableAccountIds,
} from '@/lib/chart-of-accounts-tree'
import { displayCurrencyForAccount } from '@/lib/account-display-currency'

const TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
  { value: 'equity', label: 'Fund Balance' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'expense', label: 'Expense' },
]

const typeColors: Record<string, string> = {
  asset: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  liability: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  equity: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  revenue: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  expense: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
}

export interface OpeningFilters {
  searchQuery: string
  filterType: string
  filterCurrency: string
}

function openingPostingMatchesFilters(account: ChartOfAccount, filters: OpeningFilters, defaultCurrency: string): boolean {
  const q = filters.searchQuery.trim().toLowerCase()
  const code = String(account.account_code ?? '')
  const name = String(account.account_name ?? '')
  const accCurrency = displayCurrencyForAccount(account, defaultCurrency)
  const matchesSearch = !q || code.toLowerCase().includes(q) || name.toLowerCase().includes(q)
  const matchesType = filters.filterType === 'all' || account.account_type === filters.filterType
  const matchesCurrency = filters.filterCurrency === 'all' || accCurrency === filters.filterCurrency
  return matchesSearch && matchesType && matchesCurrency
}

function openingNodeMatchesSelf(account: ChartOfAccount, filters: OpeningFilters, defaultCurrency: string): boolean {
  const q = filters.searchQuery.trim().toLowerCase()
  const code = String(account.account_code ?? '')
  const name = String(account.account_name ?? '')
  const accCurrency = displayCurrencyForAccount(account, defaultCurrency)
  const matchesSearch = !q || code.toLowerCase().includes(q) || name.toLowerCase().includes(q)
  const matchesType = filters.filterType === 'all' || account.account_type === filters.filterType
  if (filters.filterCurrency !== 'all') {
    if (account.is_posting) {
      return matchesSearch && matchesType && accCurrency === filters.filterCurrency
    }
    return matchesSearch && matchesType
  }
  return matchesSearch && matchesType
}

function hasMatchingDescendantInTree(account: ChartOfAccount, filters: OpeningFilters, defaultCurrency: string): boolean {
  for (const child of account.children ?? []) {
    if (openingNodeMatchesSelf(child, filters, defaultCurrency)) return true
    if (hasMatchingDescendantInTree(child, filters, defaultCurrency)) return true
  }
  return false
}

interface OpeningBalanceNodeProps {
  account: ChartOfAccount
  depth?: number
  filters: OpeningFilters
  expandedIds: Set<number>
  defaultCurrency: string
  canEditOpeningBalances: boolean
  editingId: number | null
  editBalance: string
  editDate: string
  setEditBalance: (v: string) => void
  setEditDate: (v: string) => void
  onToggleExpand: (id: number) => void
  onStartEdit: (acc: ChartOfAccount) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  updatePending: boolean
}

function OpeningBalanceNode({
  account,
  depth = 0,
  filters,
  expandedIds,
  defaultCurrency,
  canEditOpeningBalances,
  editingId,
  editBalance,
  editDate,
  setEditBalance,
  setEditDate,
  onToggleExpand,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  updatePending,
}: OpeningBalanceNodeProps) {
  const hasChildren = !!(account.children && account.children.length > 0)

  const hasMatchingChildren = useMemo(() => {
    if (!hasChildren) return false
    return hasMatchingDescendantInTree(account, filters, defaultCurrency)
  }, [account, filters, defaultCurrency, hasChildren])

  if (!account) return null

  const hasActiveFilters =
    !!filters.searchQuery.trim() || filters.filterType !== 'all' || filters.filterCurrency !== 'all'

  const matchesSelf = openingNodeMatchesSelf(account, filters, defaultCurrency)

  if (hasActiveFilters && !matchesSelf && !hasMatchingChildren) {
    return null
  }

  const isExpanded = expandedIds.has(account.id)
  const shouldExpand = isExpanded || (!!filters.searchQuery.trim() && hasMatchingChildren)

  const code = String(account.account_code ?? '')
  const name = String(account.account_name ?? '')
  const accCurrency = displayCurrencyForAccount(account, defaultCurrency)

  return (
    <div>
      <div
        className={cn(
          'coa-ledger-table-row flex items-center gap-2 py-1 pl-3 pr-3 text-sm transition-colors',
          depth > 0 && 'coa-ledger-table-row--child'
        )}
        style={{ paddingLeft: `${(depth * 24) + 12}px` }}
      >
        <div className="flex w-5 shrink-0 justify-center">
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggleExpand(account.id)
              }}
              className="shrink-0 rounded p-0.5 transition-colors hover:bg-muted"
              aria-label={shouldExpand ? 'Collapse' : 'Expand'}
            >
              {shouldExpand ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          ) : null}
        </div>

        <div className="flex w-5 shrink-0 justify-center">
          {account.is_header || hasChildren ? (
            <BookOpen className="h-3.5 w-3.5 text-primary/90" />
          ) : (
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>

        <span className="block w-16 shrink-0 text-left font-mono text-xs">{code}</span>

        <span className={cn('min-w-0 flex-1 truncate text-left text-xs', account.is_header && 'font-medium')}>{name}</span>

        <div className="w-[7.5rem] shrink-0 text-left">
          <span className={cn('inline-flex rounded px-2 py-0.5 text-xs font-medium', typeColors[account.account_type] ?? 'bg-muted')}>
            {account.account_type}
          </span>
        </div>

        <span className="block w-16 shrink-0 text-left font-mono text-xs text-muted-foreground">
          {account.is_posting ? accCurrency : '—'}
        </span>

        <div className="w-28 shrink-0 text-right tabular-nums">
          {account.is_posting ? (
            editingId === account.id ? (
              <Input
                type="number"
                step="0.01"
                value={editBalance}
                onChange={(e) => setEditBalance(e.target.value)}
                className="h-8 max-w-[7rem] text-right tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            ) : (
              <span className="font-mono">{formatCurrency(account.opening_balance ?? 0, accCurrency)}</span>
            )
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>

        <div className="w-[9.5rem] min-w-[9.5rem] shrink-0">
          {account.is_posting ? (
            editingId === account.id ? (
              <DatePicker
                value={editDate}
                onChange={setEditDate}
                className="h-8 w-full max-w-[9.5rem] text-sm"
                inputClassName="text-xs"
              />
            ) : (
              <span className="text-muted-foreground">
                {(account as ChartOfAccount & { opening_balance_date?: string }).opening_balance_date ?? '—'}
              </span>
            )
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>

        <div className="relative z-[1] flex w-[11rem] min-w-[11rem] shrink-0 items-center justify-start pointer-events-auto">
          {account.is_posting ? (
            editingId === account.id ? (
              <div
                role="group"
                aria-label="Save or cancel"
                className="inline-flex h-8 shrink-0 overflow-hidden rounded-md border border-border bg-background shadow-sm"
              >
                <Button
                  type="button"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSaveEdit()
                  }}
                  disabled={updatePending}
                  className="h-8 shrink-0 gap-1 rounded-none border-0 px-2.5 text-xs font-medium shadow-none"
                >
                  <Save className="h-3.5 w-3.5" aria-hidden />
                  Save
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCancelEdit()
                  }}
                  className="h-8 shrink-0 rounded-none border-0 border-l border-border/80 px-2.5 text-xs text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                >
                  Cancel
                </Button>
              </div>
            ) : canEditOpeningBalances ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  onStartEdit(account)
                }}
                className="h-8 px-2.5 text-xs"
              >
                Edit
              </Button>
            ) : (
              <span className="text-[11px] text-muted-foreground">—</span>
            )
          ) : (
            <span className="text-[11px] text-muted-foreground">—</span>
          )}
        </div>
      </div>

      {shouldExpand && hasChildren && (
        <div>
          {account.children?.map((child) => (
            <OpeningBalanceNode
              key={child.id}
              account={child}
              depth={depth + 1}
              filters={filters}
              expandedIds={expandedIds}
              defaultCurrency={defaultCurrency}
              canEditOpeningBalances={canEditOpeningBalances}
              editingId={editingId}
              editBalance={editBalance}
              editDate={editDate}
              setEditBalance={setEditBalance}
              setEditDate={setEditDate}
              onToggleExpand={onToggleExpand}
              onStartEdit={onStartEdit}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              updatePending={updatePending}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function OpeningBalancesPage() {
  const { canViewOpeningBalances, canEditOpeningBalances } = useChartOfAccountsPermissions()
  const { organization } = useOrganizationStore()
  const defaultCurrency = organization?.default_currency ?? 'AFN'
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editBalance, setEditBalance] = useState<string>('')
  const [editDate, setEditDate] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterCurrency, setFilterCurrency] = useState<string>('all')
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set())
  const { options: currencyOptions } = useCurrencies()

  const filters: OpeningFilters = useMemo(
    () => ({
      searchQuery,
      filterType,
      filterCurrency,
    }),
    [searchQuery, filterType, filterCurrency]
  )

  const { data: treeData, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['chart-of-accounts-tree'],
    queryFn: () => getAccountsTree(),
  })

  const accounts = useMemo(() => {
    const data = treeData?.data
    return Array.isArray(data) ? data : []
  }, [treeData?.data])

  useEffect(() => {
    if (isLoading || accounts.length === 0) return
    setExpandedIds(getDefaultExpandedIds(accounts, DEFAULT_COA_EXPAND_MAX_DEPTH))
  }, [isLoading, accounts, dataUpdatedAt])

  const flatAccounts = useMemo(() => {
    if (!treeData?.success || !treeData?.data) return []
    return flattenAccountsTree(treeData.data).filter((a) => a.is_posting)
  }, [treeData])

  const filteredPostingCount = useMemo(
    () => flatAccounts.filter((a) => openingPostingMatchesFilters(a, filters, defaultCurrency)).length,
    [flatAccounts, filters, defaultCurrency]
  )

  const summaryByType = useMemo(() => {
    const map: Record<string, number> = {}
    flatAccounts.forEach((a) => {
      const type = a.account_type ?? 'other'
      map[type] = (map[type] ?? 0) + (a.opening_balance ?? 0)
    })
    return map
  }, [flatAccounts])

  const expandableIds = useMemo(() => getExpandableAccountIds(accounts), [accounts])

  const isTreeFullyExpanded = useMemo(() => {
    if (expandableIds.size === 0) return false
    for (const id of expandableIds) {
      if (!expandedIds.has(id)) return false
    }
    return true
  }, [expandableIds, expandedIds])

  const handleToggleExpand = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleTreeExpandCollapseToggle = useCallback(() => {
    if (isTreeFullyExpanded) {
      setExpandedIds(new Set())
      toast({ title: 'Collapsed all', description: 'All account groups are now collapsed.' })
    } else {
      setExpandedIds(getExpandableAccountIds(accounts))
      toast({ title: 'Expanded all', description: 'All account groups are now expanded.' })
    }
  }, [accounts, isTreeFullyExpanded, toast])

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { opening_balance?: number; opening_balance_date?: string } }) =>
      updateAccount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts-tree'] })
      setEditingId(null)
      toast({ title: 'Saved', description: 'Opening balance updated.' })
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    },
  })

  const startEdit = (acc: ChartOfAccount) => {
    setEditingId(acc.id)
    setEditBalance(String(acc.opening_balance ?? 0))
    setEditDate((acc as ChartOfAccount & { opening_balance_date?: string }).opening_balance_date ?? new Date().toISOString().split('T')[0])
  }

  const saveEdit = () => {
    if (editingId == null) return
    const num = parseFloat(editBalance)
    if (Number.isNaN(num)) {
      toast({ title: 'Invalid amount', variant: 'destructive' })
      return
    }
    updateMutation.mutate({
      id: editingId,
      data: { opening_balance: num, opening_balance_date: editDate || undefined },
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const hasVisibleRows = useMemo(() => {
    if (accounts.length === 0) return false
    const hasActiveFilters =
      !!filters.searchQuery.trim() || filters.filterType !== 'all' || filters.filterCurrency !== 'all'
    if (!hasActiveFilters) return true
    return accounts.some(
      (a) =>
        openingNodeMatchesSelf(a, filters, defaultCurrency) ||
        hasMatchingDescendantInTree(a, filters, defaultCurrency)
    )
  }, [accounts, filters, defaultCurrency])

  if (!canViewOpeningBalances) {
    return (
      <ChartOfAccountsPageFrame title="Opening balances">
        <Card className="coa-ledger-card border-dashed">
          <CardContent className="py-14 text-center">
            <Lock className="mx-auto h-10 w-10 text-muted-foreground/60" aria-hidden />
            <p className="mt-4 font-medium text-foreground">Opening balances access required</p>
            <p className="mt-2 max-w-md mx-auto text-sm text-muted-foreground">
              You need the <span className="font-mono text-xs">view-opening-balances</span> permission. Super Administrators and
              Finance Directors have it by default; they can assign it to other roles (users with{' '}
              <span className="font-medium">Assign Chart of Accounts Permissions</span>).
            </p>
          </CardContent>
        </Card>
      </ChartOfAccountsPageFrame>
    )
  }

  return (
    <ChartOfAccountsPageFrame title="Opening balances" className="gap-3">
      {!isLoading && flatAccounts.length > 0 && (
        <div className="grid shrink-0 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {TYPE_OPTIONS.filter((t) => t.value !== 'all').map((opt) => (
            <Card key={opt.value} className="border-border/80 shadow-sm">
              <CardContent className="px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{opt.label}</p>
                <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-foreground">
                  {formatCurrency(summaryByType[opt.value] ?? 0, defaultCurrency ?? 'AFN')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="coa-ledger-card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="coa-toolbar shrink-0 border-b border-border/80 px-3 py-1.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <div className="relative min-w-[min(100%,200px)] max-w-md flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by code or name…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 border-border/80 bg-background pl-8 text-xs"
              />
              {searchQuery && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0.5 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-8 w-[130px] border-border/80 bg-background text-xs">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterCurrency} onValueChange={setFilterCurrency}>
              <SelectTrigger className="h-8 w-[108px] border-border/80 bg-background text-xs">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All currencies</SelectItem>
                {currencyOptions.map((opt) => (
                  <SelectItem key={opt.code} value={opt.code}>
                    {opt.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleTreeExpandCollapseToggle}
              disabled={isLoading || accounts.length === 0 || expandableIds.size === 0}
              className="h-8 w-8 shrink-0 rounded-md border border-border/80 bg-background text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground disabled:opacity-50"
              aria-label={isTreeFullyExpanded ? 'Collapse all account groups' : 'Expand all account groups'}
              title={isTreeFullyExpanded ? 'Collapse all' : 'Expand all'}
            >
              {isTreeFullyExpanded ? <ChevronsUp className="h-4 w-4" aria-hidden /> : <ChevronsDown className="h-4 w-4" aria-hidden />}
            </Button>
          </div>
        </div>
        <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
          {isLoading && (
            <div className="space-y-2 p-3">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}

          {!isLoading && flatAccounts.length === 0 && (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <Wallet className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
              <p className="font-medium text-muted-foreground">No posting accounts found</p>
              <p className="mt-1 text-sm text-muted-foreground">Add accounts from the Account List or run the CoA seeder.</p>
            </div>
          )}

          {!isLoading && flatAccounts.length > 0 && !hasVisibleRows && (
            <div className="rounded-lg border border-dashed py-8 text-center">
              <p className="font-medium text-muted-foreground">No accounts match your filters</p>
              <p className="mt-1 text-sm text-muted-foreground">Try a different search or type filter.</p>
            </div>
          )}

          {!isLoading && flatAccounts.length > 0 && hasVisibleRows && (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <div
                className="voucher-sheet-grid relative min-h-0 flex-1 overflow-y-auto overflow-x-auto overscroll-contain [scrollbar-gutter:stable]"
                role="region"
                aria-label="Opening balances by account"
              >
                <div className="coa-ledger-table-frame w-full min-w-0">
                  <div className="coa-ledger-thead sticky top-0 z-20 flex min-w-[820px] items-center gap-2 border-b border-primary/20 bg-card px-3 py-1.5 text-[10px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground pointer-events-none">
                    <div className="w-5 shrink-0" />
                    <div className="w-5 shrink-0" />
                    <span className="w-16 shrink-0 text-left">Code</span>
                    <span className="min-w-0 flex-1 text-left">Account name</span>
                    <span className="w-[7.5rem] shrink-0 text-left">Type</span>
                    <span className="w-16 shrink-0 text-left">Currency</span>
                    <span className="w-28 shrink-0 text-right tabular-nums">Opening balance</span>
                    <span className="w-[9.5rem] min-w-[9.5rem] shrink-0 text-left">As-of date</span>
                    <span className="w-[11rem] min-w-[11rem] shrink-0 text-left">Action</span>
                  </div>
                  <div className="min-w-[820px]">
                  {accounts.map((account) => (
                    <OpeningBalanceNode
                      key={account.id}
                      account={account}
                      filters={filters}
                      expandedIds={expandedIds}
                      defaultCurrency={defaultCurrency}
                      canEditOpeningBalances={canEditOpeningBalances}
                      editingId={editingId}
                      editBalance={editBalance}
                      editDate={editDate}
                      setEditBalance={setEditBalance}
                      setEditDate={setEditDate}
                      onToggleExpand={handleToggleExpand}
                      onStartEdit={startEdit}
                      onSaveEdit={saveEdit}
                      onCancelEdit={cancelEdit}
                      updatePending={updateMutation.isPending}
                    />
                  ))}
                  </div>
                </div>
              </div>
              <div className="shrink-0 border-t border-border bg-white px-3 py-1.5 text-[11px] text-muted-foreground dark:bg-slate-950">
                Showing {filteredPostingCount} of {flatAccounts.length} posting accounts
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </ChartOfAccountsPageFrame>
  )
}
