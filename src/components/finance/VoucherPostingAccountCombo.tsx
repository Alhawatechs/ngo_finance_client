'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Search, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn, getCurrencyIsoCode } from '@/lib/utils'
import { displayCurrencyForAccount } from '@/lib/account-display-currency'
import type { ChartOfAccount } from '@/types'

const ACCOUNT_TYPE_ORDER: ChartOfAccount['account_type'][] = [
  'asset',
  'liability',
  'equity',
  'revenue',
  'expense',
]

const ACCOUNT_TYPE_LABEL: Record<ChartOfAccount['account_type'], string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expenses',
}

const ACCOUNT_TYPE_BADGE: Record<ChartOfAccount['account_type'], string> = {
  asset: 'AST',
  liability: 'LIA',
  equity: 'EQY',
  revenue: 'REV',
  expense: 'EXP',
}

/** Full words in picker column (not abbreviated badges) */
const ACCOUNT_TYPE_DISPLAY: Record<ChartOfAccount['account_type'], string> = {
  asset: 'Asset',
  liability: 'Liability',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expense',
}

const STORAGE_KEY_SIZE = 'erp-voucher-account-picker-size'

/** Flat list: indent per tree level (px). Keep small so layers feel tight. */
const TREE_BASE_PAD_PX = 4
const TREE_INDENT_PER_LEVEL_PX = 8

function normalizeSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function sortAccountsForPicker(accounts: ChartOfAccount[]): ChartOfAccount[] {
  return [...accounts].sort((a, b) =>
    (a.account_code ?? '').localeCompare(b.account_code ?? '', undefined, { numeric: true, sensitivity: 'base' })
  )
}

/** Synthetic type buckets when no API tree is available */
function buildSyntheticTreeFromFlat(postingAccounts: ChartOfAccount[]): ChartOfAccount[] {
  const byType = new Map<ChartOfAccount['account_type'], ChartOfAccount[]>()
  for (const t of ACCOUNT_TYPE_ORDER) byType.set(t, [])
  for (const a of postingAccounts) {
    byType.get(a.account_type)?.push(a)
  }
  const roots: ChartOfAccount[] = []
  let fakeId = -1
  for (const t of ACCOUNT_TYPE_ORDER) {
    const list = sortAccountsForPicker(byType.get(t) ?? [])
    if (list.length === 0) continue
    roots.push({
      id: fakeId--,
      created_at: '',
      updated_at: '',
      organization_id: 0,
      account_code: '',
      account_name: ACCOUNT_TYPE_LABEL[t],
      account_type: t,
      normal_balance: 'debit',
      level: 0,
      is_header: true,
      is_posting: false,
      is_bank_account: false,
      is_cash_account: false,
      is_active: true,
      opening_balance: 0,
      children: list,
    } as unknown as ChartOfAccount)
  }
  return roots
}

function accountSearchBlob(node: ChartOfAccount, baseCurrency: string): string {
  const cur = displayCurrencyForAccount(node, baseCurrency)
  const curIso = getCurrencyIsoCode(cur)
  const type = node.account_type
  return [
    node.account_code,
    node.account_name,
    curIso,
    ACCOUNT_TYPE_LABEL[type],
    ACCOUNT_TYPE_DISPLAY[type],
    ACCOUNT_TYPE_BADGE[type],
    String(node.id),
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * Returns a pruned tree. Branches with children are kept first so posting accounts
 * that also have sub-accounts (e.g. 21000 Personnel with detail lines) still show nested rows.
 */
function filterAccountTree(
  nodes: ChartOfAccount[] | undefined | null,
  searchRaw: string,
  typeScope: 'all' | ChartOfAccount['account_type'],
  baseCurrency: string
): ChartOfAccount[] {
  if (!nodes?.length) return []
  const q = normalizeSearch(searchRaw)
  const out: ChartOfAccount[] = []

  for (const node of nodes) {
    if (!node.is_active) continue
    const typeOk = typeScope === 'all' || node.account_type === typeScope
    const childList = node.children ? filterAccountTree(node.children, searchRaw, typeScope, baseCurrency) : []
    const blob = normalizeSearch(accountSearchBlob(node, baseCurrency))
    const selfSearch = !q || blob.includes(q)
    const hasChildren = (node.children?.length ?? 0) > 0

    if (hasChildren) {
      const childMatches = childList.length > 0
      const keepBranch = !q || selfSearch || childMatches
      if (!keepBranch) continue
      if (childMatches) {
        out.push({ ...node, children: childList })
        continue
      }
      if (selfSearch && typeOk) {
        out.push({ ...node, children: undefined })
      }
      continue
    }

    if (node.is_posting) {
      if (!typeOk) continue
      if (q && !selfSearch) continue
      out.push({ ...node, children: undefined })
      continue
    }

    if (q && selfSearch && typeOk) {
      out.push({ ...node, children: undefined })
    }
  }
  return out
}

function readSavedSize(): { w: number; h: number } {
  if (typeof window === 'undefined') return { w: 580, h: 400 }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SIZE)
    if (!raw) return { w: 580, h: 400 }
    const p = JSON.parse(raw) as { w?: number; h?: number }
    const w = Number(p.w)
    const h = Number(p.h)
    if (Number.isFinite(w) && w >= 360 && w <= 1200 && Number.isFinite(h) && h >= 200 && h <= 900) {
      return { w, h }
    }
  } catch {
    /* ignore */
  }
  return { w: 580, h: 400 }
}

export type VoucherPostingAccountComboProps = {
  value: number
  onChange: (accountId: number) => void
  accounts: ChartOfAccount[]
  accountsById: Map<number, ChartOfAccount>
  /** Full chart tree from API (with children). When omitted, a synthetic tree by account type is used. */
  accountsTree?: ChartOfAccount[]
  /** When false, hide clear control (e.g. required expense account). Default true. */
  allowClear?: boolean
  baseCurrency: string
  disabled?: boolean
  id?: string
  emptyLabel?: string
  /** Leading search icon (e.g. account statement toolbar). */
  showSearchIcon?: boolean
  /** Extra classes for the trigger input (e.g. text-sm for toolbar). */
  inputClassName?: string
  /**
   * White, borderless focus chrome — looks like a plain search field (Account Statement).
   * Suppresses hover tint and focus ring on the trigger and input.
   */
  plainSearchBox?: boolean
  /** Applied to the outer trigger row (input + controls). */
  triggerClassName?: string
  onOpenChange?: (open: boolean) => void
}

export const VoucherPostingAccountCombo = React.memo(function VoucherPostingAccountCombo({
  value,
  onChange,
  accounts,
  accountsById,
  accountsTree,
  allowClear = true,
  baseCurrency,
  disabled,
  id,
  emptyLabel,
  showSearchIcon = false,
  inputClassName,
  plainSearchBox = false,
  triggerClassName,
  onOpenChange,
}: VoucherPostingAccountComboProps) {
  const [open, setOpen] = React.useState(false)
  const [typeScope, setTypeScope] = React.useState<'all' | ChartOfAccount['account_type']>('all')
  /** Filter query: typed in the cell input; drives tree + quick matches when the panel is open. */
  const [search, setSearch] = React.useState('')
  const [panelSize, setPanelSize] = React.useState(() => readSavedSize())
  const panelRef = React.useRef<HTMLDivElement>(null)
  const triggerInputRef = React.useRef<HTMLInputElement>(null)

  const selected = value > 0 ? accountsById.get(value) : undefined
  const curCode = selected ? displayCurrencyForAccount(selected, baseCurrency) : baseCurrency
  const iso = getCurrencyIsoCode(curCode)

  const treeSource = React.useMemo(() => {
    if (accountsTree && accountsTree.length > 0) return accountsTree
    return buildSyntheticTreeFromFlat(accounts)
  }, [accountsTree, accounts])

  const filteredTree = React.useMemo(
    () => filterAccountTree(treeSource, search, typeScope, baseCurrency),
    [treeSource, search, typeScope, baseCurrency]
  )

  const postingCount = React.useMemo(() => {
    let n = 0
    const walk = (nodes: ChartOfAccount[]) => {
      for (const node of nodes) {
        if (node.is_posting) n++
        if (node.children?.length) walk(node.children)
      }
    }
    walk(filteredTree)
    return n
  }, [filteredTree])

  /** Flat posting accounts matching the current query (for quick pick + Enter). */
  const quickMatches = React.useMemo(() => {
    const q = normalizeSearch(search)
    if (!q) return []
    const list = accounts.filter((a) => {
      if (!a.is_active || !a.is_posting) return false
      return normalizeSearch(accountSearchBlob(a, baseCurrency)).includes(q)
    })
    return sortAccountsForPicker(list).slice(0, 18)
  }, [accounts, search, baseCurrency])

  const selectedDisplay = React.useMemo(
    () => (selected ? `${selected.account_code ?? ''} ${selected.account_name ?? ''}`.trim() : ''),
    [selected]
  )

  /** When panel closed: show selected account; when open: show live filter text. */
  const inputValue = open ? search : selectedDisplay

  const applyOpenChange = React.useCallback(
    (next: boolean) => {
      setOpen(next)
      onOpenChange?.(next)
      if (!next) {
        setSearch('')
        setTypeScope('all')
      }
    },
    [onOpenChange]
  )

  /** Open list on explicit action only — not on focus (avoids popover on page load / tab focus). */
  const openPanelForUser = React.useCallback(() => {
    if (open) return
    applyOpenChange(true)
    setSearch(selected ? `${selected.account_code ?? ''} ${selected.account_name ?? ''}`.trim() : '')
  }, [applyOpenChange, selected, open])

  const selectAccountId = React.useCallback(
    (id: number) => {
      onChange(id)
      applyOpenChange(false)
      setSearch('')
    },
    [onChange, applyOpenChange]
  )

  const handleTriggerKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        applyOpenChange(false)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const q = search.trim()
        if (!q || quickMatches.length === 0) return
        const exact = quickMatches.find((a) => (a.account_code ?? '').toLowerCase() === q.toLowerCase())
        const pick = exact ?? quickMatches[0]
        if (pick) selectAccountId(pick.id)
      }
    },
    [applyOpenChange, search, quickMatches, selectAccountId, open, openPanelForUser]
  )

  React.useEffect(() => {
    if (!open || !panelRef.current) return
    const el = panelRef.current
    const ro = new ResizeObserver(() => {
      const w = el.offsetWidth
      const h = el.offsetHeight
      if (w < 200 || h < 160) return
      setPanelSize({ w, h })
      try {
        localStorage.setItem(STORAGE_KEY_SIZE, JSON.stringify({ w, h }))
      } catch {
        /* ignore */
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [open])

  const clearSelection = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    onChange(0)
    applyOpenChange(false)
  }

  /** Code + name | type + currency: 4.5px between left/right blocks; 3px between type and currency */
  const renderPostingCells = (account: ChartOfAccount) => {
    const cur = displayCurrencyForAccount(account, baseCurrency)
    const curIso = getCurrencyIsoCode(cur)
    const type = account.account_type
    return (
      <div className="flex min-w-0 flex-1 items-center gap-x-[4.5px] text-[11px] leading-snug">
        <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
          <span className="shrink-0 font-mono font-semibold tabular-nums text-foreground">{account.account_code ?? '—'}</span>
          <span className="min-w-0 truncate text-foreground/95" title={account.account_name ?? undefined}>
            {account.account_name ?? '—'}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-x-[3px]">
          <span className="w-[6.25rem] shrink-0 whitespace-nowrap text-right text-muted-foreground sm:w-[6.75rem]">
            {ACCOUNT_TYPE_DISPLAY[type]}
          </span>
          <span className="min-w-[2.75rem] shrink-0 pr-3 text-right font-medium tabular-nums text-muted-foreground sm:min-w-[3rem] sm:pr-4">
            {curIso}
          </span>
        </div>
      </div>
    )
  }

  const renderPostingRow = (account: ChartOfAccount, depth: number) => {
    const type = account.account_type
    const isSelected = value === account.id
    const cur = displayCurrencyForAccount(account, baseCurrency)
    const curIso = getCurrencyIsoCode(cur)
    const ariaLabel = `${account.account_code ?? ''} ${account.account_name ?? ''} ${ACCOUNT_TYPE_DISPLAY[type]} ${curIso}`

    return (
      <button
        type="button"
        role="option"
        aria-selected={isSelected}
        aria-label={ariaLabel}
        style={{ paddingLeft: `${TREE_BASE_PAD_PX + depth * TREE_INDENT_PER_LEVEL_PX}px` }}
        className={cn(
          'group flex w-full min-w-0 items-stretch gap-1.5 border border-transparent py-1 pr-0 text-left',
          'rounded-md transition-colors hover:bg-muted/60',
          isSelected && 'border-primary/25 bg-primary/[0.07]'
        )}
        onClick={() => selectAccountId(account.id)}
      >
        <Check
          className={cn(
            'mt-0.5 h-3.5 w-3.5 shrink-0 text-primary transition-opacity duration-150',
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
          )}
          aria-hidden
        />
        {renderPostingCells(account)}
      </button>
    )
  }

  /** Folder row: show account code + name (category / subcategory / GL headers) */
  const renderFolderLabel = (node: ChartOfAccount) => {
    const code = (node.account_code ?? '').trim()
    const name = (node.account_name ?? '').trim()
    return (
      <div className="flex min-w-0 items-baseline gap-1.5 py-0.5 text-[11px] font-medium leading-snug text-foreground/90">
        {code ? <span className="shrink-0 font-mono font-semibold tabular-nums">{code}</span> : null}
        <span className="min-w-0 truncate" title={name || undefined}>
          {name || '—'}
        </span>
      </div>
    )
  }

  const rowPad = (depth: number) => `${TREE_BASE_PAD_PX + depth * TREE_INDENT_PER_LEVEL_PX}px`

  const renderTreeNodes = (nodes: ChartOfAccount[], depth: number): React.ReactNode => {
    return nodes.map((node) => {
      const hasKids = (node.children?.length ?? 0) > 0
      if (hasKids) {
        return (
          <div key={node.id} className="min-w-0">
            <div className="w-full min-w-0 pr-1" style={{ paddingLeft: rowPad(depth) }}>
              {node.is_posting ? (
                <button
                  type="button"
                  role="option"
                  aria-selected={value === node.id}
                  aria-label={`${node.account_code ?? ''} ${node.account_name ?? ''}`}
                  className={cn(
                    'group flex w-full min-w-0 items-stretch gap-1.5 rounded-md border border-transparent py-1 pr-0 text-left transition-colors',
                    'hover:bg-muted/60',
                    value === node.id && 'border-primary/25 bg-primary/[0.07]'
                  )}
                  onClick={() => selectAccountId(node.id)}
                >
                  <Check
                    className={cn(
                      'mt-0.5 h-3.5 w-3.5 shrink-0 text-primary transition-opacity duration-150',
                      value === node.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
                    )}
                    aria-hidden
                  />
                  {renderPostingCells(node)}
                </button>
              ) : (
                <div className="min-w-0 rounded-md py-0.5 text-left">{renderFolderLabel(node)}</div>
              )}
            </div>
            <div className="min-w-0">{renderTreeNodes(node.children ?? [], depth + 1)}</div>
          </div>
        )
      }

      if (node.is_posting) {
        return <React.Fragment key={node.id}>{renderPostingRow(node, depth)}</React.Fragment>
      }
      return null
    })
  }

  return (
    <Popover open={open} onOpenChange={applyOpenChange} modal>
      <PopoverTrigger asChild>
        <div
          className={cn(
            'group flex w-full min-w-0 items-center',
            showSearchIcon ? 'gap-2 px-2.5' : 'gap-0.5 px-2',
            'justify-between rounded-none border-0 text-left shadow-none',
            plainSearchBox
              ? [
                  'bg-white hover:bg-white focus-within:bg-white',
                  'dark:bg-slate-950 dark:hover:bg-slate-950 dark:focus-within:bg-slate-950',
                  'outline-none focus:outline-none focus-visible:outline-none',
                  'ring-0 ring-offset-0 focus:ring-0 focus-within:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0',
                  'data-[state=open]:ring-0 data-[state=open]:outline-none data-[state=open]:shadow-none',
                ]
              : [
                  'bg-transparent',
                  'outline-none focus:outline-none focus-visible:outline-none',
                  'ring-0 ring-offset-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0',
                  'data-[state=open]:ring-0 data-[state=open]:outline-none',
                  'hover:bg-muted/30 dark:hover:bg-muted/20',
                  'focus-within:bg-white dark:focus-within:bg-slate-800',
                ],
            !selected && !open && 'text-muted-foreground',
            triggerClassName
          )}
        >
          {showSearchIcon && (
            <Search
              className="pointer-events-none h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
          )}
          <input
            ref={triggerInputRef}
            id={id}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            aria-label={emptyLabel || 'Account'}
            autoComplete="off"
            spellCheck={false}
            disabled={disabled}
            value={inputValue}
            placeholder={!selected && emptyLabel ? emptyLabel : undefined}
            title={selected ? `${selected.account_code} ${selected.account_name} (${iso})` : undefined}
            onChange={(e) => {
              applyOpenChange(true)
              setSearch(e.target.value)
            }}
            onClick={openPanelForUser}
            onKeyDown={handleTriggerKeyDown}
            className={cn(
              'min-h-0 min-w-0 flex-1 cursor-text border-0 bg-transparent py-0 shadow-none',
              'outline-none focus:outline-none focus-visible:outline-none',
              'ring-0 ring-offset-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0',
              plainSearchBox && 'focus:shadow-none focus-visible:shadow-none',
              inputClassName ??
                'text-[11px] leading-tight font-sans text-slate-800 dark:text-slate-200',
              emptyLabel
                ? showSearchIcon
                  ? 'placeholder:text-muted-foreground'
                  : 'placeholder:italic placeholder:text-muted-foreground/80'
                : undefined,
              'disabled:cursor-not-allowed disabled:opacity-50',
              'truncate'
            )}
          />
          <span className="flex shrink-0 items-center gap-0.5">
            {allowClear && value > 0 && (
              <span
                role="button"
                tabIndex={0}
                className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  clearSelection()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.stopPropagation()
                    clearSelection()
                  }
                }}
                title="Clear account"
                aria-label="Clear account"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <button
              type="button"
              tabIndex={-1}
              className={cn(
                'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground outline-none hover:bg-muted hover:text-foreground',
                plainSearchBox
                  ? 'focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none'
                  : 'focus-visible:ring-0 focus-visible:ring-offset-0'
              )}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (open) {
                  applyOpenChange(false)
                } else {
                  setSearch(selected ? `${selected.account_code ?? ''} ${selected.account_name ?? ''}`.trim() : '')
                  applyOpenChange(true)
                  window.requestAnimationFrame(() => triggerInputRef.current?.focus())
                }
              }}
              aria-label={open ? 'Close account list' : 'Open account list'}
            >
              <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/60" aria-hidden />
            </button>
          </span>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          'p-0 z-[200] overflow-visible border border-border/80 shadow-lg rounded-xl',
          'bg-popover text-popover-foreground',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'max-w-[min(100vw-0.5rem,900px)]'
        )}
        align="start"
        side="bottom"
        sideOffset={4}
        collisionPadding={12}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div
          ref={panelRef}
          className="flex flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white dark:border-slate-600/80 dark:bg-slate-950"
          style={{
            width: panelSize.w,
            height: panelSize.h,
            minWidth: 400,
            minHeight: 200,
            maxWidth: 'min(100vw - 1rem, 900px)',
            maxHeight: 'min(85vh, 900px)',
            resize: 'both',
          }}
        >
          {search.trim().length > 0 && quickMatches.length > 0 && (
            <div className="shrink-0 border-b border-border/60 px-2 pb-2 pt-2">
              <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Quick matches</p>
              <ul className="voucher-account-picker-scroll max-h-[min(11rem,32vh)] space-y-0 overflow-y-auto overflow-x-hidden rounded-md border border-border/50 bg-muted/20 p-0.5">
                {quickMatches.map((a) => {
                  const cur = displayCurrencyForAccount(a, baseCurrency)
                  const curIso = getCurrencyIsoCode(cur)
                  const isSel = value === a.id
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSel}
                        className={cn(
                          'group flex w-full min-w-0 items-center gap-1.5 rounded py-1 pl-1.5 pr-0 text-left text-[11px] transition-colors',
                          'hover:bg-muted/80',
                          isSel && 'bg-primary/10 ring-1 ring-primary/25'
                        )}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectAccountId(a.id)}
                      >
                        <Check
                          className={cn(
                            'h-3.5 w-3.5 shrink-0 text-primary transition-opacity duration-150',
                            isSel ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
                          )}
                          aria-hidden
                        />
                        <span className="shrink-0 font-mono font-semibold tabular-nums text-foreground">{a.account_code}</span>
                        <span className="min-w-0 flex-1 truncate text-foreground/95" title={a.account_name ?? undefined}>
                          {a.account_name}
                        </span>
                        <span className="shrink-0 pr-3 tabular-nums text-[10px] text-muted-foreground sm:pr-4">{curIso}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Category filters */}
          <div className="flex shrink-0 flex-wrap items-center gap-x-1 gap-y-1 px-3 pb-2 pt-2">
            {(
              [
                { key: 'all' as const, label: 'All' },
                ...ACCOUNT_TYPE_ORDER.map((t) => ({ key: t, label: ACCOUNT_TYPE_LABEL[t] })),
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                aria-pressed={typeScope === key}
                onClick={() => setTypeScope(key)}
                className={cn(
                  'rounded-md border px-2 py-0.5 text-[10px] font-medium leading-tight transition-colors',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                  typeScope === key
                    ? 'border-[#1e3a8a] bg-[#1e3a8a] text-white dark:border-primary dark:bg-primary'
                    : 'border-transparent bg-slate-100/90 text-muted-foreground hover:bg-muted hover:text-foreground dark:bg-slate-800/80'
                )}
              >
                {label}
              </button>
            ))}
            <span className="ml-auto shrink-0 text-[10px] tabular-nums text-muted-foreground" title="Posting accounts in view">
              {postingCount}
            </span>
          </div>

          {/* Tree list — voucher-style scrollbar */}
          <div className="voucher-account-picker-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2 pt-0">
            {postingCount === 0 ? (
              <div className="flex flex-col items-center gap-1 py-8 text-center">
                <Search className="h-5 w-5 text-muted-foreground/50" />
                <p className="text-xs font-medium text-foreground">No match</p>
                <p className="px-3 text-[10px] text-muted-foreground">Adjust search or category.</p>
              </div>
            ) : (
              <div role="listbox" className="space-y-0">
                {renderTreeNodes(filteredTree, 0)}
              </div>
            )}
          </div>

          {allowClear && value > 0 && (
            <div className="shrink-0 border-t border-border/60 px-3 py-2">
              <Button type="button" variant="outline" size="sm" className="h-7 w-full text-xs" onClick={() => clearSelection()}>
                Clear selection
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
})
