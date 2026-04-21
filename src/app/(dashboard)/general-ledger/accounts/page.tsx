'use client'

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCurrency } from '@/lib/utils'
import {
  Plus,
  Search,
  Download,
  ChevronDown,
  ChevronRight,
  Edit,
  FileText,
  BookOpen,
  Power,
  PowerOff,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Trash2,
  X,
  ChevronsDown,
  ChevronsUp,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { AccountFormDialog } from '@/components/finance/AccountFormDialog'
import { AccountStatementDialog } from '@/components/finance/AccountStatementDialog'
import { ChartOfAccountsExportDialog } from '@/components/finance/ChartOfAccountsExportDialog'
import { useToast } from '@/components/ui/use-toast'
import { useOrganizationStore } from '@/stores/organizationStore'
import { useHasPermission } from '@/stores/authStore'
import { useChartOfAccountsPermissions } from '@/hooks/useChartOfAccountsPermissions'
import { ChartOfAccount } from '@/types'
import {
  getAccountsTree,
  createAccount,
  updateAccount,
  deleteAccount,
  restoreAccount,
  forceDeleteAccount,
  activateAccount,
  deactivateAccount,
  flattenAccountsTree,
  exportChartOfAccounts,
  ChartOfAccountFormData,
} from '@/lib/api/chart-of-accounts'
import {
  DEFAULT_COA_EXPAND_MAX_DEPTH,
  getDefaultExpandedIds,
  getExpandableAccountIds,
} from '@/lib/chart-of-accounts-tree'
import type { ChartOfAccountExportColumnKey } from '@/lib/chart-of-accounts-export-columns'
import { displayCurrencyForAccount } from '@/lib/account-display-currency'

const accountTypeColors: Record<string, string> = {
  asset: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  liability: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  equity: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  revenue: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  expense: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
}

const TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
  { value: 'equity', label: 'Fund Balance' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'expense', label: 'Expense' },
]

const NATURE_OPTIONS = [
  { value: 'all', label: 'All natures' },
  { value: 'debit', label: 'Debit' },
  { value: 'credit', label: 'Credit' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

/** Level labels for chart of accounts (4-level, direct GL linkage) */
const LEVEL_LABELS: Record<number, string> = {
  1: 'Category',
  2: 'Subcategory',
  3: 'General Ledger',
  4: 'Account',
}

function getLevelLabel(level: number | undefined | null): string {
  if (level == null) return '—'
  return LEVEL_LABELS[level] ?? `L${level}`
}

/** Balance cell: rolled_up_balance for all levels (L4→L1), else opening_balance for posting, else —. Currency: AFN by default; USD when account name contains (USD). */
function formatBalanceCell(account: ChartOfAccount, orgDefaultCurrency: string): React.ReactNode {
  const balance = account.rolled_up_balance != null
    ? Number(account.rolled_up_balance)
    : (!account.is_header && account.opening_balance != null ? Number(account.opening_balance) : null)
  if (balance === null) return '—'
  return formatCurrency(balance, displayCurrencyForAccount(account, orgDefaultCurrency))
}

/** Level badges — neutral / primary tints aligned with theme */
const LEVEL_COLORS: Record<number, string> = {
  1: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600',
  2: 'bg-emerald-50 text-emerald-950 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800',
  3: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/90 dark:text-slate-100 dark:border-slate-600',
  4: 'bg-primary/10 text-primary border-primary/25 dark:bg-primary/20 dark:text-foreground dark:border-primary/35',
}

/** Count accounts visible with current filters (same visibility logic as AccountNode). */
function countVisibleAccounts(accounts: ChartOfAccount[], filters: AccountListFilters, baseCurrency: string): number {
  const hasActiveFilters =
    !!filters.searchQuery.trim() ||
    filters.filterType !== 'all' ||
    filters.filterNature !== 'all' ||
    filters.filterStatus !== 'all'

  const walk = (list: ChartOfAccount[]): number => {
    let n = 0
    for (const acc of list) {
      if (!acc) continue
      const matches = accountMatchesFilters(acc, filters, baseCurrency)
      const hasChildren = Array.isArray(acc.children) && acc.children.length > 0
      const childCount = hasChildren ? walk(acc.children ?? []) : 0
      const visible = !hasActiveFilters || matches || childCount > 0
      if (visible) n += 1 + childCount
    }
    return n
  }
  return walk(accounts)
}

export interface AccountListFilters {
  searchQuery: string
  filterType: string
  filterNature: string
  filterStatus: string
}

/** Remove leading/trailing/double separators so the menu stays valid. */
function dedupeActionMenuSeparators(items: ActionMenuItem[]): ActionMenuItem[] {
  const out: ActionMenuItem[] = []
  for (const item of items) {
    if (item.type === 'separator') {
      if (out.length === 0) continue
      const last = out[out.length - 1]
      if (last.type === 'separator') continue
      out.push(item)
    } else {
      out.push(item)
    }
  }
  while (out.length > 0 && out[out.length - 1]!.type === 'separator') {
    out.pop()
  }
  return out
}

interface AccountNodeProps {
  account: ChartOfAccount
  depth?: number
  filters: AccountListFilters
  expandedIds: Set<number>
  baseCurrency: string
  canEditCoa?: boolean
  canDeleteTemporarily?: boolean
  canRestore?: boolean
  canForceDelete?: boolean
  toggleActivePending?: boolean
  onToggleExpand: (id: number) => void
  onEdit: (account: ChartOfAccount) => void
  onAddChild: (parent: ChartOfAccount) => void
  onDelete: (account: ChartOfAccount) => void
  onRestore?: (account: ChartOfAccount) => void
  onForceDelete?: (account: ChartOfAccount) => void
  onToggleActive: (account: ChartOfAccount) => void
  onViewStatement?: (account: ChartOfAccount) => void
}

function accountMatchesFilters(account: ChartOfAccount, filters: AccountListFilters, baseCurrency: string): boolean {
  const code = String(account.account_code ?? '')
  const name = String(account.account_name ?? '')
  const q = filters.searchQuery.trim().toLowerCase()
  const accCurrency = displayCurrencyForAccount(account, baseCurrency)
  const matchesSearch =
    !q ||
    code.toLowerCase().includes(q) ||
    name.toLowerCase().includes(q) ||
    (account.is_posting && q.length >= 2 && accCurrency.toLowerCase().includes(q))
  const matchesType = filters.filterType === 'all' || account.account_type === filters.filterType
  const matchesNature = filters.filterNature === 'all' || account.normal_balance === filters.filterNature
  const matchesStatus =
    filters.filterStatus === 'all' ||
    (filters.filterStatus === 'active' && account.is_active) ||
    (filters.filterStatus === 'inactive' && !account.is_active)
  return matchesSearch && matchesType && matchesNature && matchesStatus
}

function AccountNode({
  account,
  depth = 0,
  filters,
  expandedIds,
  baseCurrency,
  canEditCoa = false,
  canDeleteTemporarily = true,
  canRestore = true,
  canForceDelete = true,
  toggleActivePending = false,
  onToggleExpand,
  onEdit,
  onAddChild,
  onDelete,
  onRestore,
  onForceDelete,
  onToggleActive,
  onViewStatement,
}: AccountNodeProps) {
  const hasChildren = !!(account && Array.isArray(account.children) && account.children.length > 0)

  const hasMatchingChildren = useMemo(() => {
    if (!account || !hasChildren) return false
    const checkChildren = (children: ChartOfAccount[]): boolean => {
      return children.some((child) => {
        if (!child) return false
        if (accountMatchesFilters(child, filters, baseCurrency)) return true
        if (Array.isArray(child.children) && child.children.length > 0) {
          return checkChildren(child.children)
        }
        return false
      })
    }
    return checkChildren(Array.isArray(account.children) ? account.children : [])
  }, [account, filters, hasChildren, baseCurrency])

  if (!account) return null

  const isExpanded = expandedIds.has(account.id)

  const code = String(account.account_code ?? '')
  const name = String(account.account_name ?? '')

  const q = filters.searchQuery.trim().toLowerCase()
  const accCurrency = displayCurrencyForAccount(account, baseCurrency)
  const matchesSearch =
    !q ||
    code.toLowerCase().includes(q) ||
    name.toLowerCase().includes(q) ||
    (account.is_posting && q.length >= 2 && accCurrency.toLowerCase().includes(q))

  const matchesType = filters.filterType === 'all' || account.account_type === filters.filterType
  const matchesNature = filters.filterNature === 'all' || account.normal_balance === filters.filterNature
  const matchesStatus =
    filters.filterStatus === 'all' ||
    (filters.filterStatus === 'active' && account.is_active) ||
    (filters.filterStatus === 'inactive' && !account.is_active)

  const matchesAllFilters = matchesSearch && matchesType && matchesNature && matchesStatus

  const hasActiveFilters =
    !!filters.searchQuery.trim() ||
    filters.filterType !== 'all' ||
    filters.filterNature !== 'all' ||
    filters.filterStatus !== 'all'

  // If filtering and this account doesn't match and has no matching children, hide it
  if (hasActiveFilters && !matchesAllFilters && !hasMatchingChildren) {
    return null
  }

  const shouldExpand = isExpanded || (!!filters.searchQuery.trim() && hasMatchingChildren)

  return (
    <div>
      <div
        className={cn(
          'coa-ledger-table-row flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm transition-colors',
          depth > 0 && 'coa-ledger-table-row--child',
          !account.is_active && 'opacity-60',
          account.deleted_at && 'bg-muted/25 opacity-70 dark:bg-muted/20'
        )}
        style={{ paddingLeft: `${(depth * 24) + 12}px` }}
      >
        <div className="w-5 shrink-0 flex justify-center">
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand(account.id)
            }}
            className="p-0.5 hover:bg-muted rounded shrink-0 transition-colors"
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

        <div className="w-5 shrink-0 flex justify-center">
          {(account.is_header || hasChildren) ? (
            <BookOpen className="h-3.5 w-3.5 text-primary/90" />
          ) : (
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>

        <span className="font-mono text-xs w-16 shrink-0 text-center block">
          {code}
        </span>

        <span
          className={cn(
            "flex-1 text-xs min-w-0 truncate text-left",
            account.is_header && "font-medium",
            (account.is_posting && onViewStatement) && "cursor-pointer text-primary hover:underline hover:text-primary/90"
          )}
          role={(account.is_posting && onViewStatement) ? 'button' : undefined}
          tabIndex={(account.is_posting && onViewStatement) ? 0 : undefined}
          title={(account.is_posting && onViewStatement) ? 'Open account statement' : undefined}
          onClick={(account.is_posting && onViewStatement)
            ? (e) => { e.stopPropagation(); onViewStatement(account) }
            : undefined}
          onKeyDown={(account.is_posting && onViewStatement)
            ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onViewStatement(account) } }
            : undefined}
        >
          {name}
        </span>

        <span
          className={cn(
            'inline-flex items-center justify-center rounded px-2 py-0.5 text-[11px] font-medium w-24 shrink-0 border',
            LEVEL_COLORS[account.level ?? 0] ?? 'bg-muted text-muted-foreground border-transparent'
          )}
          title={getLevelLabel(account.level)}
        >
          {getLevelLabel(account.level)}
        </span>

        <div className="w-16 shrink-0 flex justify-center">
          <Badge className={cn("text-[11px] justify-center px-1.5", accountTypeColors[account.account_type])}>
            {account.account_type}
          </Badge>
        </div>

        <span className="text-xs capitalize text-muted-foreground w-14 shrink-0 text-center block">
          {account.normal_balance}
        </span>

        <span
          className="text-xs font-mono text-muted-foreground w-12 shrink-0 text-center block"
          title={account.is_posting ? 'Account currency' : 'Currency applies to posting accounts only'}
        >
          {account.is_posting ? displayCurrencyForAccount(account, baseCurrency) : '—'}
        </span>

        <span className="text-xs font-medium w-20 shrink-0 text-center tabular-nums block">
          {formatBalanceCell(account, baseCurrency)}
        </span>

        <div className="w-16 shrink-0 flex justify-center">
          <Badge
            variant={account.deleted_at ? 'destructive' : account.is_active ? 'success' : 'secondary'}
            className="text-[11px] justify-center px-1.5"
          >
            {account.deleted_at ? 'Deleted' : account.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        <div className="w-14 shrink-0 flex justify-center">
        {account.deleted_at ? (
          (() => {
            const deletedItems = dedupeActionMenuSeparators([
              ...(onRestore && canRestore
                ? [{ label: 'Restore account', icon: <RotateCcw className="h-4 w-4" />, onClick: () => onRestore!(account) } as ActionMenuItem]
                : []),
              ...(onRestore && canRestore && onForceDelete && canForceDelete ? [{ type: 'separator' as const } as ActionMenuItem] : []),
              ...(onForceDelete && canForceDelete
                ? [
                    {
                      label: 'Permanently delete',
                      icon: <Trash2 className="h-4 w-4" />,
                      onClick: () => onForceDelete!(account),
                      destructive: true,
                    } as ActionMenuItem,
                  ]
                : []),
            ])
            return deletedItems.length > 0 ? (
              <ActionMenu triggerClassName="h-7 w-7" menuWidth={240} triggerTitle="Deleted account options" items={deletedItems} />
            ) : (
              <span className="text-[11px] text-muted-foreground" title="No actions available">—</span>
            )
          })()
        ) : (
          (() => {
            const rowActionItems = dedupeActionMenuSeparators([
              ...(account.is_posting && onViewStatement
                ? [
                    {
                      label: 'Account statement',
                      icon: <FileText className="h-4 w-4" />,
                      onClick: () => onViewStatement(account),
                    } as ActionMenuItem,
                  ]
                : []),
              ...(canEditCoa
                ? [
                    ...(account.is_posting && onViewStatement
                      ? [{ type: 'separator' as const } as ActionMenuItem]
                      : []),
                    { label: 'Edit account', icon: <Edit className="h-4 w-4" />, onClick: () => onEdit(account) },
                    ...(account.level < 4
                      ? [
                          {
                            label: 'Add child account',
                            icon: <PlusCircle className="h-4 w-4" />,
                            onClick: () => onAddChild(account),
                          } as ActionMenuItem,
                        ]
                      : []),
                    {
                      label: account.is_active ? 'Deactivate' : 'Activate',
                      icon: account.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />,
                      onClick: () => onToggleActive(account),
                      disabled: toggleActivePending,
                      disabledReason: 'Updating status…',
                    },
                    ...(canDeleteTemporarily
                      ? [
                          {
                            label: 'Temporarily delete',
                            icon: <Trash2 className="h-4 w-4" />,
                            onClick: () => onDelete(account),
                            destructive: true,
                          } as ActionMenuItem,
                        ]
                      : []),
                  ]
                : []),
            ])
            return rowActionItems.length > 0 ? (
              <ActionMenu triggerClassName="h-7 w-7" menuWidth={240} triggerTitle="Account options" items={rowActionItems} />
            ) : (
              <span className="text-[11px] text-muted-foreground">—</span>
            )
          })()
        )}
        </div>
      </div>

      {shouldExpand && hasChildren && (
        <div>
          {account.children?.map((child) => (
            <AccountNode
              key={child.id}
              account={child}
              depth={depth + 1}
              filters={filters}
              expandedIds={expandedIds}
              baseCurrency={baseCurrency}
              canEditCoa={canEditCoa}
              canDeleteTemporarily={canDeleteTemporarily}
              canRestore={canRestore}
              canForceDelete={canForceDelete}
              toggleActivePending={toggleActivePending}
              onToggleExpand={onToggleExpand}
              onEdit={onEdit}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onRestore={onRestore}
              onForceDelete={onForceDelete}
              onToggleActive={onToggleActive}
              onViewStatement={onViewStatement}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Summary calculation helper
function calculateSummary(accounts: ChartOfAccount[] | undefined | null) {
  let totalAssets = 0
  let totalLiabilities = 0
  let totalRevenue = 0
  let totalExpenses = 0
  let accountCount = 0

  const processAccount = (account: ChartOfAccount | null | undefined) => {
    if (!account) return
    accountCount++
    // Only L4 posting accounts contribute to summary (use rolled_up_balance when present)
    if (account.is_posting) {
      const bal = account.rolled_up_balance != null
        ? Number(account.rolled_up_balance)
        : (account.opening_balance != null ? Number(account.opening_balance) : 0)
      switch (account.account_type) {
        case 'asset':
          totalAssets += bal
          break
        case 'liability':
          totalLiabilities += bal
          break
        case 'revenue':
          totalRevenue += bal
          break
        case 'expense':
          totalExpenses += bal
          break
      }
    }
    if (Array.isArray(account.children)) {
      account.children.forEach(processAccount)
    }
  }

  if (!Array.isArray(accounts)) return { totalAssets: 0, totalLiabilities: 0, netAssets: 0, totalRevenue: 0, totalExpenses: 0, accountCount: 0 }
  accounts.forEach(processAccount)

  return {
    totalAssets,
    totalLiabilities,
    netAssets: totalAssets - totalLiabilities,
    totalRevenue,
    totalExpenses,
    accountCount,
  }
}

/** Per-level and posting vs header counts for the full tree (not filter-scoped). */
function countTreeStructure(accounts: ChartOfAccount[]): {
  byLevel: Record<1 | 2 | 3 | 4, number>
  posting: number
  groups: number
} {
  const byLevel: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
  let posting = 0
  let groups = 0
  const walk = (list: ChartOfAccount[]) => {
    for (const a of list) {
      if (!a) continue
      const lv = Math.min(4, Math.max(1, Math.round(Number(a.level) || 1))) as 1 | 2 | 3 | 4
      byLevel[lv]++
      if (a.is_posting) posting++
      else groups++
      if (a.children?.length) walk(a.children)
    }
  }
  walk(accounts)
  return { byLevel, posting, groups }
}

/** Surface API / network message when the chart tree request fails (axios + Laravel JSON). */
function chartTreeQueryErrorMessage(error: unknown): string | undefined {
  if (error && typeof error === 'object') {
    const ax = error as {
      response?: { data?: { message?: string }; status?: number }
      message?: string
    }
    const msg = ax.response?.data?.message
    if (typeof msg === 'string' && msg.trim()) return msg.trim()
    if (ax.response?.status === 401) return 'Session expired or not signed in. Please log in again.'
    if (ax.response?.status === 403) return 'You do not have permission to view the chart of accounts.'
    if (ax.response?.status === 404) return 'Chart of accounts endpoint was not found. Check API configuration.'
    if (ax.response?.status && ax.response.status >= 500) {
      return 'Server error while loading accounts. If this continues, run database migrations on the server (e.g. php artisan migrate).'
    }
  }
  if (error instanceof Error && error.message) return error.message
  return undefined
}

export default function ChartOfAccountsPage() {
  const { canEditCoa, canDeleteCoa, canViewAccountStatement } = useChartOfAccountsPermissions()
  const canDeleteTemporarily = canDeleteCoa
  const canRestore = canDeleteCoa
  const canForceDelete = useHasPermission('delete-chart-of-accounts-permanently')
  const canViewStatement = canViewAccountStatement

  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterNature, setFilterNature] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showDeleted, setShowDeleted] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set())

  const filters: AccountListFilters = useMemo(
    () => ({
      searchQuery,
      filterType,
      filterNature,
      filterStatus,
    }),
    [searchQuery, filterType, filterNature, filterStatus]
  )

  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<ChartOfAccount | null>(null)
  const [parentAccount, setParentAccount] = useState<ChartOfAccount | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<ChartOfAccount | null>(null)
  const [forceDeleteDialogOpen, setForceDeleteDialogOpen] = useState(false)
  const [accountToForceDelete, setAccountToForceDelete] = useState<ChartOfAccount | null>(null)
  const [forceDeleteReason, setForceDeleteReason] = useState('')
  const [statementDialogOpen, setStatementDialogOpen] = useState(false)
  const [statementDialogAccount, setStatementDialogAccount] = useState<ChartOfAccount | null>(null)

  const { toast } = useToast()
  const queryClient = useQueryClient()
  const showDeletedRef = useRef(showDeleted)
  showDeletedRef.current = showDeleted
  const { organization, fetchOrganization } = useOrganizationStore()
  const baseCurrency = organization?.default_currency ?? 'AFN'

  // Ensure organization (and base currency) is loaded for Chart of Accounts
  useEffect(() => {
    fetchOrganization()
  }, [fetchOrganization])

  const { data: accountsData, isLoading, isFetching, error, dataUpdatedAt } = useQuery({
    queryKey: ['chart-of-accounts-tree', showDeleted],
    queryFn: () => getAccountsTree({ with_trashed: showDeleted }),
    // Always refetch on mount so Account list matches DB after seeding/sync (server cache is cleared by seeder).
    staleTime: 0,
    gcTime: 10 * 60_000,
  })

  /** Bypass server cache so Refresh always loads current data (see bypass_cache on API). */
  const handleRefreshAccounts = useCallback(async () => {
    await queryClient.fetchQuery({
      queryKey: ['chart-of-accounts-tree', showDeleted],
      queryFn: () => getAccountsTree({ with_trashed: showDeleted, bypass_cache: true }),
    })
  }, [queryClient, showDeleted])

  /** After soft/hard delete or restore, invalidate and refetch with bypass so the list matches DB (server tree cache is cleared). */
  const refetchCoaTreeAfterMutation = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['chart-of-accounts-tree'] })
    await queryClient.fetchQuery({
      queryKey: ['chart-of-accounts-tree', showDeletedRef.current],
      queryFn: () => getAccountsTree({ with_trashed: showDeletedRef.current, bypass_cache: true }),
    })
  }, [queryClient])

  const accounts = useMemo(() => {
    const data = accountsData?.data
    return Array.isArray(data) ? data : []
  }, [accountsData?.data])

  /** Open through subcategory (L1 + L2) whenever the tree loads or refetches — not on every render. */
  useEffect(() => {
    if (isLoading || accounts.length === 0) return
    setExpandedIds(getDefaultExpandedIds(accounts, DEFAULT_COA_EXPAND_MAX_DEPTH))
  }, [isLoading, accounts, dataUpdatedAt, showDeleted])

  const summary = useMemo(() => calculateSummary(accounts), [accounts])
  const treeStats = useMemo(() => countTreeStructure(accounts), [accounts])

  const accountsForParentFlat = useMemo(
    () => flattenAccountsTree(accounts).filter((a) => (a.level ?? 0) < 4),
    [accounts]
  )
  const allAccountsFlat = useMemo(() => flattenAccountsTree(accounts), [accounts])

  const visibleCount = useMemo(() => countVisibleAccounts(accounts, filters, baseCurrency), [accounts, filters, baseCurrency])
  const hasActiveFilters =
    !!searchQuery.trim() ||
    filterType !== 'all' ||
    filterNature !== 'all' ||
    filterStatus !== 'all' ||
    showDeleted

  const handleClearFilters = useCallback(() => {
    setSearchQuery('')
    setFilterType('all')
    setFilterNature('all')
    setFilterStatus('all')
    setShowDeleted(false)
  }, [])

  const handleToggleExpand = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const expandableIds = useMemo(() => getExpandableAccountIds(accounts), [accounts])
  const isTreeFullyExpanded = useMemo(() => {
    if (expandableIds.size === 0) return false
    for (const id of expandableIds) {
      if (!expandedIds.has(id)) return false
    }
    return true
  }, [expandableIds, expandedIds])

  const handleTreeExpandCollapseToggle = useCallback(() => {
    if (isTreeFullyExpanded) {
      setExpandedIds(new Set())
      toast({ title: 'Collapsed all', description: 'All account groups are now collapsed.' })
    } else {
      setExpandedIds(getExpandableAccountIds(accounts))
      toast({ title: 'Expanded all', description: 'All account groups are now expanded.' })
    }
  }, [accounts, isTreeFullyExpanded, toast])

  // Create account mutation
  const createMutation = useMutation({
    mutationFn: createAccount,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['chart-of-accounts-tree'] })
      setFormDialogOpen(false)
      setSelectedAccount(null)
      setParentAccount(null)
      toast({
        title: 'Account Created',
        description: 'The account has been created successfully.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create account',
        variant: 'destructive',
      })
    },
  })

  // Restore (temporarily deleted) mutation
  const restoreMutation = useMutation({
    mutationFn: restoreAccount,
    onSuccess: async () => {
      await refetchCoaTreeAfterMutation()
      toast({
        title: 'Account restored',
        description: 'The account has been restored and is visible again.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to restore account',
        variant: 'destructive',
      })
    },
  })

  // Force delete (permanent) mutation – for soft-deleted accounts only
  const forceDeleteMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => forceDeleteAccount(id, { reason }),
    onSuccess: async () => {
      await refetchCoaTreeAfterMutation()
      setForceDeleteDialogOpen(false)
      setAccountToForceDelete(null)
      setForceDeleteReason('')
      toast({
        title: 'Account permanently deleted',
        description: 'The account code can now be reused for a new account.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to permanently delete account',
        variant: 'destructive',
      })
    },
  })

  // Update account mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ChartOfAccountFormData> }) =>
      updateAccount(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['chart-of-accounts-tree'] })
      setFormDialogOpen(false)
      setSelectedAccount(null)
      toast({
        title: 'Account Updated',
        description: 'The account has been updated successfully.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update account',
        variant: 'destructive',
      })
    },
  })

  // Delete account mutation
  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      await refetchCoaTreeAfterMutation()
      setDeleteDialogOpen(false)
      setAccountToDelete(null)
      toast({
        title: 'Account Deleted',
        description: 'The account has been deleted successfully.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete account',
        variant: 'destructive',
      })
    },
  })

  // Activate/Deactivate mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async (account: ChartOfAccount) => {
      if (account.is_active) {
        return deactivateAccount(account.id)
      }
      return activateAccount(account.id)
    },
    onSuccess: async (_, account) => {
      await queryClient.invalidateQueries({ queryKey: ['chart-of-accounts-tree'] })
      toast({
        title: account.is_active ? 'Account Deactivated' : 'Account Activated',
        description: `The account has been ${account.is_active ? 'deactivated' : 'activated'} successfully.`,
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update account status',
        variant: 'destructive',
      })
    },
  })

  // Handlers
  const handleAddAccount = () => {
    setSelectedAccount(null)
    setParentAccount(null)
    setFormDialogOpen(true)
  }

  const handleEditAccount = (account: ChartOfAccount) => {
    setSelectedAccount(account)
    setParentAccount(null)
    setFormDialogOpen(true)
  }

  const handleAddChildAccount = (parent: ChartOfAccount) => {
    setSelectedAccount(null)
    setParentAccount(parent)
    setFormDialogOpen(true)
  }

  const handleDeleteAccount = (account: ChartOfAccount) => {
    setAccountToDelete(account)
    setDeleteDialogOpen(true)
  }

  const handleRestoreAccount = (account: ChartOfAccount) => {
    restoreMutation.mutate(account.id)
  }

  const handleForceDeleteAccount = (account: ChartOfAccount) => {
    setAccountToForceDelete(account)
    setForceDeleteReason('')
    setForceDeleteDialogOpen(true)
  }

  const confirmForceDelete = () => {
    if (accountToForceDelete) {
      forceDeleteMutation.mutate({ id: accountToForceDelete.id, reason: forceDeleteReason.trim() || undefined })
    }
  }

  const handleViewStatement = useCallback((account: ChartOfAccount) => {
    setStatementDialogAccount(account)
    setStatementDialogOpen(true)
  }, [])

  const confirmDelete = () => {
    if (accountToDelete) {
      deleteMutation.mutate(accountToDelete.id)
    }
  }

  const handleFormSubmit = async (data: ChartOfAccountFormData) => {
    if (selectedAccount) {
      await updateMutation.mutateAsync({ id: selectedAccount.id, data })
    } else {
      await createMutation.mutateAsync(data)
    }
  }

  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportingFormat, setExportingFormat] = useState<'xlsx' | 'pdf' | 'csv' | null>(null)
  const handleExportWithColumns = useCallback(
    async (format: 'xlsx' | 'pdf' | 'csv', columns: ChartOfAccountExportColumnKey[]) => {
      setExportingFormat(format)
      try {
        await exportChartOfAccounts(format, { withTrashed: showDeleted, columns })
        const label = format === 'xlsx' ? 'Excel' : format === 'pdf' ? 'PDF' : 'CSV'
        toast({
          title: 'Export complete',
          description: `Chart of accounts downloaded (${label})${showDeleted ? ', including deleted accounts.' : '.'}`,
        })
        setExportDialogOpen(false)
      } catch (e: unknown) {
        const description =
          e instanceof Error && e.message
            ? e.message
            : 'Could not export. Check your connection or try again.'
        toast({
          title: 'Export failed',
          description,
          variant: 'destructive',
        })
      } finally {
        setExportingFormat(null)
      }
    },
    [toast, showDeleted]
  )

  const isFormLoading = createMutation.isPending || updateMutation.isPending

  if (error) {
    const detail = chartTreeQueryErrorMessage(error)
    return (
      <div className="flex flex-col items-center justify-center min-h-[280px] px-4">
        <Card className="w-full max-w-md border-destructive/30 bg-destructive/5">
          <CardContent className="pt-8 pb-8 text-center">
            <p className="text-sm font-medium text-destructive">Unable to load chart of accounts</p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Check your connection and try again. If the problem continues, contact your administrator.
            </p>
            {detail ? (
              <p className="text-xs text-destructive/90 mt-3 rounded-md border border-destructive/20 bg-background/80 px-2 py-1.5 text-left font-mono break-words">
                {detail}
              </p>
            ) : null}
            <Button onClick={() => void handleRefreshAccounts()} className="mt-6" variant="secondary">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <h2 className="sr-only">Account list</h2>
      <Card className="coa-ledger-card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="coa-toolbar shrink-0 px-3 py-1.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <div className="relative min-w-[min(100%,200px)] flex-1 max-w-md">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={filterType !== 'all' ? `Search within ${TYPE_OPTIONS.find((o) => o.value === filterType)?.label ?? filterType}…` : 'Search by code, name, or currency…'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 border-border/80 bg-background pl-8 text-xs focus-visible:ring-0.5 focus-visible:ring-ring"
                />
                {searchQuery && (
                  <Button type="button" variant="ghost" size="icon" className="absolute right-0.5 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full" onClick={() => setSearchQuery('')} aria-label="Clear search">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-8 w-[118px] border-border/80 bg-background text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterNature} onValueChange={setFilterNature}>
                <SelectTrigger className="h-8 w-[108px] border-border/80 bg-background text-xs">
                  <SelectValue placeholder="Nature" />
                </SelectTrigger>
                <SelectContent>
                  {NATURE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 w-[108px] border-border/80 bg-background text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1.5">
                <Switch id="show-deleted" checked={showDeleted} onCheckedChange={setShowDeleted} />
                <Label htmlFor="show-deleted" className="cursor-pointer whitespace-nowrap text-[11px] text-muted-foreground" title="View and restore temporarily deleted accounts">
                  Deleted
                </Label>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-8 px-2 text-[11px] text-muted-foreground hover:text-foreground">
                  Clear filters
                </Button>
              )}
              <div className="ml-auto flex items-center gap-1">
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
                  {isTreeFullyExpanded ? (
                    <ChevronsUp className="h-4 w-4" aria-hidden />
                  ) : (
                    <ChevronsDown className="h-4 w-4" aria-hidden />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleRefreshAccounts()}
                  disabled={isFetching}
                  className="h-8 px-2"
                  aria-label="Refresh account list"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isLoading || accounts.length === 0 || exportingFormat !== null}
                  className="h-8 gap-1 px-2 text-xs"
                  onClick={() => setExportDialogOpen(true)}
                  aria-haspopup="dialog"
                >
                  {exportingFormat ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  <span>Export</span>
                </Button>
                <ChartOfAccountsExportDialog
                  open={exportDialogOpen}
                  onOpenChange={setExportDialogOpen}
                  onExport={handleExportWithColumns}
                  exportingFormat={exportingFormat}
                  includeDeletedNote={showDeleted}
                />
                {canEditCoa && (
                  <Button size="sm" onClick={handleAddAccount} className="h-8 gap-1 px-2.5 text-xs">
                    <Plus className="h-3.5 w-3.5" />
                    Add account
                  </Button>
                )}
              </div>
            </div>
        </div>
        <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
          <div
            className="voucher-sheet-grid relative min-h-0 flex-1 overflow-y-auto overflow-x-auto overscroll-contain"
            role="region"
            aria-label="Account tree"
          >
            <div className="coa-ledger-table-frame w-full min-w-0">
              {/* Table header - sticky, compact */}
              <div className="coa-ledger-thead sticky top-0 z-10 flex items-center gap-2 py-2 px-3 text-xs font-semibold uppercase tracking-wider">
                <div className="w-5 shrink-0 flex justify-center" />
                <div className="w-5 shrink-0 flex justify-center" />
                <span className="w-16 shrink-0 text-center">Code</span>
                <span className="flex-1 min-w-0 text-center">Account Name</span>
                <span className="w-24 shrink-0 text-center">Level</span>
                <span className="w-16 shrink-0 text-center">Type</span>
                <span className="w-14 shrink-0 text-center">Nature</span>
                <span className="w-12 shrink-0 text-center" title="Currency (posting accounts only; headers use —)">Curr</span>
                <span className="w-20 shrink-0 text-center" title={`Amounts use each row’s currency (AFN by default; USD when account name includes (USD))`}>Balance</span>
                <span className="w-16 shrink-0 text-center">Status</span>
                <span className="w-14 shrink-0 text-center">Actions</span>
              </div>
              
              {/* Loading state */}
              {isLoading && (
                <div className="p-4 space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              )}
              
              {/* Account nodes */}
              {!isLoading && accounts.length === 0 && (
                <div className="py-8 px-4 text-center text-sm text-muted-foreground">
                  <p>No accounts found.</p>
                  {canEditCoa && (
                    <Button variant="link" size="sm" onClick={handleAddAccount} className="mt-2">
                      Create your first account
                    </Button>
                  )}
                </div>
              )}

                {!isLoading && accounts.map((account) => (
                <AccountNode
                  key={account.id}
                  account={account}
                  filters={filters}
                  expandedIds={expandedIds}
                  baseCurrency={baseCurrency}
                  canEditCoa={canEditCoa}
                  canDeleteTemporarily={canDeleteTemporarily}
                  canRestore={canRestore}
                  canForceDelete={canForceDelete}
                  toggleActivePending={toggleActiveMutation.isPending}
                  onToggleExpand={handleToggleExpand}
                  onEdit={handleEditAccount}
                  onAddChild={handleAddChildAccount}
                  onDelete={handleDeleteAccount}
                  onRestore={handleRestoreAccount}
                  onForceDelete={handleForceDeleteAccount}
                  onToggleActive={(acc) => toggleActiveMutation.mutate(acc)}
                  onViewStatement={canViewStatement ? handleViewStatement : undefined}
                />
              ))}
            </div>
          </div>
          {!isLoading && accounts.length > 0 && (
            <footer
              className="shrink-0 border-t border-slate-200/90 bg-white px-3 py-1.5 text-xs dark:border-border dark:bg-slate-950"
              aria-label="Chart of accounts summary"
            >
              <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch lg:justify-between lg:gap-6">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                      Tree summary
                    </span>
                    <span className="hidden text-slate-300 dark:text-slate-600 sm:inline" aria-hidden>
                      ·
                    </span>
                    <span className="text-sm font-semibold tabular-nums tracking-tight text-slate-900 dark:text-slate-50">
                      {hasActiveFilters ? visibleCount : summary.accountCount}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {hasActiveFilters ? 'visible' : 'accounts in tree'}
                    </span>
                    {hasActiveFilters && (
                      <>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="tabular-nums font-medium text-slate-700 dark:text-slate-300">{summary.accountCount}</span>{' '}
                          total
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] tabular-nums text-emerald-900 ring-1 ring-emerald-200/90 dark:bg-emerald-950/40 dark:text-emerald-100 dark:ring-emerald-800/60">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-300">{treeStats.posting}</span>
                      <span className="text-emerald-700/90 dark:text-emerald-200/90">posting</span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-[11px] tabular-nums text-violet-900 ring-1 ring-violet-200/90 dark:bg-violet-950/40 dark:text-violet-100 dark:ring-violet-800/60">
                      <span className="font-semibold text-violet-700 dark:text-violet-300">{treeStats.groups}</span>
                      <span className="text-violet-700/90 dark:text-violet-200/90">groups</span>
                    </span>
                    <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800 ring-1 ring-sky-200/80 dark:bg-sky-950/50 dark:text-sky-200 dark:ring-sky-800/60">
                      Base {baseCurrency}
                    </span>
                  </div>
                  <div
                    className="flex flex-wrap items-center gap-x-0 gap-y-1 border-t border-slate-200/80 pt-1 dark:border-slate-700/80"
                    title="Accounts per hierarchy level"
                  >
                    {(
                      [
                        ['text-slate-700 dark:text-slate-200', 'text-slate-900 dark:text-slate-50'],
                        ['text-emerald-800 dark:text-emerald-300', 'text-emerald-950 dark:text-emerald-100'],
                        ['text-slate-600 dark:text-slate-300', 'text-slate-900 dark:text-slate-50'],
                        ['text-primary dark:text-primary', 'text-primary font-semibold dark:text-primary'],
                      ] as const
                    ).map(([labelCls, numCls], i) => {
                      const l = (i + 1) as 1 | 2 | 3 | 4
                      return (
                        <span key={l} className="inline-flex items-center">
                          {i > 0 && (
                            <span className="mx-2 hidden h-3 w-px bg-slate-200 dark:bg-slate-700 sm:inline-block" aria-hidden />
                          )}
                          <span className="inline-flex items-center gap-1.5 pr-2 sm:pr-0">
                            <span className={cn('inline-block h-1.5 w-1.5 shrink-0 rounded-sm ring-1 ring-black/5 dark:ring-white/10', LEVEL_COLORS[l])} aria-hidden />
                            <span className={cn('text-[10px] font-semibold', labelCls)}>{LEVEL_LABELS[l]}</span>
                            <span className={cn('min-w-[1.25rem] text-right text-[11px] tabular-nums', numCls)}>
                              {treeStats.byLevel[l]}
                            </span>
                          </span>
                        </span>
                      )
                    })}
                  </div>
                </div>

                <div className="min-w-0 border-t border-slate-200/80 pt-2 lg:w-[min(100%,28rem)] lg:border-l lg:border-slate-200/80 lg:border-t-0 lg:pl-5 lg:pt-0 dark:border-slate-700/80">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-600 dark:text-indigo-400">
                    Rolled-up balances
                  </p>
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:thin] sm:grid sm:grid-cols-5 sm:gap-2 sm:overflow-visible sm:pb-0">
                    {(
                      [
                        ['Assets', summary.totalAssets, 'bg-emerald-50 ring-emerald-200/80 dark:bg-emerald-950/35 dark:ring-emerald-800/50', 'text-emerald-800 dark:text-emerald-200', 'text-emerald-950 dark:text-emerald-50'],
                        ['Liabilities', summary.totalLiabilities, 'bg-rose-50 ring-rose-200/80 dark:bg-rose-950/35 dark:ring-rose-800/50', 'text-rose-800 dark:text-rose-200', 'text-rose-950 dark:text-rose-50'],
                        ['Net assets', summary.netAssets, 'bg-primary/10 ring-primary/25 dark:bg-primary/20 dark:ring-primary/25', 'text-primary dark:text-primary', 'text-primary font-semibold dark:text-primary'],
                        ['Revenue', summary.totalRevenue, 'bg-teal-50 ring-teal-200/80 dark:bg-teal-950/35 dark:ring-teal-800/50', 'text-teal-800 dark:text-teal-200', 'text-teal-950 dark:text-teal-50'],
                        ['Expenses', summary.totalExpenses, 'bg-amber-50 ring-amber-200/80 dark:bg-amber-950/35 dark:ring-amber-800/50', 'text-amber-800 dark:text-amber-200', 'text-amber-950 dark:text-amber-50'],
                      ] as const
                    ).map(([label, value, wrapCls, labelCls, valCls]) => (
                      <div
                        key={label}
                        className={cn(
                          'flex min-w-[4.75rem] shrink-0 flex-col rounded-md px-2 py-1 ring-1 sm:min-w-0',
                          wrapCls
                        )}
                      >
                        <span className={cn('text-[10px] font-semibold leading-none', labelCls)}>{label}</span>
                        <span className={cn('mt-0.5 font-mono text-[11px] leading-tight tabular-nums', valCls)}>
                          {formatCurrency(value, baseCurrency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </footer>
          )}
        </CardContent>
      </Card>

      {/* Account Form Dialog: Add in any layer via parent selector when accountsForParent is passed */}
      <AccountFormDialog
        open={formDialogOpen}
        onOpenChange={(open) => { if (open !== formDialogOpen) setFormDialogOpen(open) }}
        account={selectedAccount}
        parentAccount={parentAccount}
        baseCurrency={baseCurrency}
        accountsForParent={accountsForParentFlat}
        allAccounts={allAccountsFlat}
        onSubmit={handleFormSubmit}
        isLoading={isFormLoading}
      />

      {/* Account Statement Dialog (Layer 4 click / View Statement action) */}
      <AccountStatementDialog
        open={statementDialogOpen}
        onOpenChange={(open) => {
          setStatementDialogOpen(open)
          if (!open) setStatementDialogAccount(null)
        }}
        account={statementDialogAccount}
      />

      {/* Temporarily Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (open !== deleteDialogOpen) setDeleteDialogOpen(open) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Temporarily delete account</AlertDialogTitle>
            <AlertDialogDescription>
              Hide the account <strong>{accountToDelete?.account_code} - {accountToDelete?.account_name}</strong>?
              <br /><br />
              The account will be hidden from the list but can be <strong>restored</strong> later. Turn on &quot;Show deleted&quot; to see it and choose Restore.
              <br /><br />
              Accounts with transactions or child accounts cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Temporarily delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanently Delete Confirmation Dialog */}
      <AlertDialog open={forceDeleteDialogOpen} onOpenChange={(open) => { setForceDeleteDialogOpen(open); if (!open) { setAccountToForceDelete(null); setForceDeleteReason('') } }}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete account</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  You are about to <strong>permanently remove</strong> the chart of account:
                </p>
                <p className="font-medium text-foreground">
                  {accountToForceDelete?.account_code} — {accountToForceDelete?.account_name}
                </p>
                <p className="text-sm">
                  This action will erase the account from the database. The code <strong>{accountToForceDelete?.account_code}</strong> will be freed for reuse.
                </p>
                <p className="text-sm text-muted-foreground">
                  Not allowed for accounts with transaction history or child accounts.
                </p>
                <div className="space-y-2 pt-2">
                  <Label htmlFor="force-delete-reason" className="text-sm font-normal">
                    Reason for permanent deletion (optional, recorded for audit)
                  </Label>
                  <Textarea
                    id="force-delete-reason"
                    placeholder="e.g., Duplicate account created in error"
                    value={forceDeleteReason}
                    onChange={(e) => setForceDeleteReason(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmForceDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {forceDeleteMutation.isPending ? 'Deleting...' : 'Permanently delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
