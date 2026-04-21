'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Search, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type CostCenterPickerOption = { code: string; name: string; depth: number }

const STORAGE_KEY_SIZE = 'erp-voucher-cost-center-picker-size'

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

function optionBlob(o: CostCenterPickerOption): string {
  return [o.code, o.name].filter(Boolean).join(' ')
}

function readSavedSize(): { w: number; h: number } {
  if (typeof window === 'undefined') return { w: 420, h: 340 }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SIZE)
    if (!raw) return { w: 420, h: 340 }
    const p = JSON.parse(raw) as { w?: number; h?: number }
    const w = Number(p.w)
    const h = Number(p.h)
    if (Number.isFinite(w) && w >= 280 && w <= 900 && Number.isFinite(h) && h >= 180 && h <= 800) {
      return { w, h }
    }
  } catch {
    /* ignore */
  }
  return { w: 420, h: 340 }
}

export type VoucherCostCenterComboProps = {
  value: string
  onChange: (code: string) => void
  options: CostCenterPickerOption[]
  allowClear?: boolean
  disabled?: boolean
  id?: string
  emptyLabel?: string
  triggerClassName?: string
  onOpenChange?: (open: boolean) => void
}

export const VoucherCostCenterCombo = React.memo(function VoucherCostCenterCombo({
  value,
  onChange,
  options,
  allowClear = true,
  disabled,
  id,
  emptyLabel,
  triggerClassName,
  onOpenChange,
}: VoucherCostCenterComboProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [panelSize, setPanelSize] = React.useState(() => readSavedSize())
  const panelRef = React.useRef<HTMLDivElement>(null)
  const triggerInputRef = React.useRef<HTMLInputElement>(null)

  const byCode = React.useMemo(() => {
    const m = new Map<string, CostCenterPickerOption>()
    for (const o of options) m.set(o.code, o)
    return m
  }, [options])

  const selected = value.trim() ? byCode.get(value.trim()) : undefined

  const sortedOptions = React.useMemo(
    () =>
      [...options].sort((a, b) =>
        (a.code ?? '').localeCompare(b.code ?? '', undefined, { numeric: true, sensitivity: 'base' })
      ),
    [options]
  )

  const filteredOptions = React.useMemo(() => {
    const q = normalizeSearch(search)
    if (!q) return sortedOptions
    return sortedOptions.filter((o) => normalizeSearch(optionBlob(o)).includes(q))
  }, [sortedOptions, search])

  const quickMatches = React.useMemo(() => {
    const q = normalizeSearch(search)
    if (!q) return []
    return sortedOptions.filter((o) => normalizeSearch(optionBlob(o)).includes(q)).slice(0, 18)
  }, [sortedOptions, search])

  const selectedDisplay = React.useMemo(
    () => (selected ? `${selected.code} ${selected.name}`.trim() : ''),
    [selected]
  )

  const inputValue = open ? search : selectedDisplay

  const applyOpenChange = React.useCallback(
    (next: boolean) => {
      setOpen(next)
      onOpenChange?.(next)
      if (!next) setSearch('')
    },
    [onOpenChange]
  )

  const openPanelForUser = React.useCallback(() => {
    if (open) return
    applyOpenChange(true)
    setSearch(selected ? `${selected.code} ${selected.name}`.trim() : '')
  }, [applyOpenChange, selected, open])

  const selectCode = React.useCallback(
    (code: string) => {
      onChange(code)
      applyOpenChange(false)
      setSearch('')
    },
    [onChange, applyOpenChange]
  )

  const handleTriggerKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !open) {
        e.preventDefault()
        openPanelForUser()
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        applyOpenChange(false)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const q = search.trim()
        if (!q || quickMatches.length === 0) return
        const exact = quickMatches.find((o) => o.code.toLowerCase() === q.toLowerCase())
        const pick = exact ?? quickMatches[0]
        if (pick) selectCode(pick.code)
      }
    },
    [applyOpenChange, search, quickMatches, selectCode, open, openPanelForUser]
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
    onChange('')
    applyOpenChange(false)
  }

  const count = filteredOptions.length

  return (
    <Popover open={open} onOpenChange={applyOpenChange} modal>
      <PopoverTrigger asChild>
        <div
          className={cn(
            'group flex w-full min-w-0 items-center gap-0.5 px-2',
            'justify-between rounded-none border-0 bg-transparent text-left shadow-none',
            'hover:bg-muted/30 dark:hover:bg-muted/20',
            'focus-within:bg-white dark:focus-within:bg-slate-800',
            !selected && !open && 'text-muted-foreground',
            triggerClassName
          )}
        >
          <input
            ref={triggerInputRef}
            id={id}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            aria-label={emptyLabel || 'Cost center'}
            autoComplete="off"
            spellCheck={false}
            disabled={disabled}
            value={inputValue}
            placeholder={!selected && emptyLabel ? emptyLabel : undefined}
            title={selected ? `${selected.code} ${selected.name}` : undefined}
            onChange={(e) => {
              applyOpenChange(true)
              setSearch(e.target.value)
            }}
            onClick={openPanelForUser}
            onKeyDown={handleTriggerKeyDown}
            className={cn(
              'min-h-0 min-w-0 flex-1 cursor-text border-0 bg-transparent py-0 shadow-none outline-none',
              'text-[11px] leading-tight font-sans text-slate-800 dark:text-slate-200',
              emptyLabel ? 'placeholder:italic placeholder:text-muted-foreground/80' : undefined,
              'focus-visible:ring-0 focus-visible:ring-offset-0',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'truncate'
            )}
          />
          <span className="flex shrink-0 items-center gap-0.5">
            {allowClear && value.trim() !== '' && (
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
                title="Clear cost center"
                aria-label="Clear cost center"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <button
              type="button"
              tabIndex={-1}
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (open) {
                  applyOpenChange(false)
                } else {
                  setSearch(selected ? `${selected.code} ${selected.name}`.trim() : '')
                  applyOpenChange(true)
                  window.requestAnimationFrame(() => triggerInputRef.current?.focus())
                }
              }}
              aria-label={open ? 'Close cost center list' : 'Open cost center list'}
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
          'max-w-[min(100vw-0.5rem,720px)]'
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
            minWidth: 300,
            minHeight: 180,
            maxWidth: 'min(100vw - 1rem, 720px)',
            maxHeight: 'min(80vh, 720px)',
            resize: 'both',
          }}
        >
          {search.trim().length > 0 && quickMatches.length > 0 && (
            <div className="shrink-0 border-b border-border/60 px-2 pb-2 pt-2">
              <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Quick matches</p>
              <ul className="voucher-account-picker-scroll max-h-[min(11rem,32vh)] space-y-0 overflow-y-auto overflow-x-hidden rounded-md border border-border/50 bg-muted/20 p-0.5">
                {quickMatches.map((o) => {
                  const isSel = value === o.code
                  return (
                    <li key={o.code}>
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
                        onClick={() => selectCode(o.code)}
                      >
                        <Check
                          className={cn(
                            'h-3.5 w-3.5 shrink-0 text-primary transition-opacity duration-150',
                            isSel ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
                          )}
                          aria-hidden
                        />
                        <span className="shrink-0 font-mono font-semibold tabular-nums text-foreground">{o.code}</span>
                        <span className="min-w-0 flex-1 truncate text-foreground/95" title={o.name}>
                          {o.name}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-2 px-3 pb-2 pt-2">
            <span className="text-[10px] tabular-nums text-muted-foreground" title="Cost centers in view">
              {count}
            </span>
          </div>

          <div className="voucher-account-picker-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden pl-2 pr-3 pb-2 pt-0 sm:pr-3.5">
            {options.length === 0 ? (
              <div className="flex flex-col items-center gap-1 py-8 text-center">
                <Search className="h-5 w-5 text-muted-foreground/50" />
                <p className="text-xs font-medium text-foreground">No cost centers</p>
                <p className="px-3 text-[10px] text-muted-foreground">Select a project or add cost centers for this programme.</p>
              </div>
            ) : count === 0 ? (
              <div className="flex flex-col items-center gap-1 py-8 text-center">
                <Search className="h-5 w-5 text-muted-foreground/50" />
                <p className="text-xs font-medium text-foreground">No match</p>
                <p className="px-3 text-[10px] text-muted-foreground">Adjust search.</p>
              </div>
            ) : (
              <div role="listbox" className="space-y-0">
                {allowClear && (
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === ''}
                    className={cn(
                      'group flex w-full min-w-0 items-stretch gap-1.5 rounded-md border border-transparent py-1 pr-0 text-left text-[11px] transition-colors',
                      'hover:bg-muted/60',
                      value === '' && 'border-primary/25 bg-primary/[0.07]'
                    )}
                    onClick={() => selectCode('')}
                  >
                    <Check
                      className={cn(
                        'mt-0.5 h-3.5 w-3.5 shrink-0 text-primary transition-opacity duration-150',
                        value === '' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
                      )}
                      aria-hidden
                    />
                    <span className="text-muted-foreground italic">— None —</span>
                  </button>
                )}
                {filteredOptions.map((o) => {
                  const isSel = value === o.code
                  const pad = `${TREE_BASE_PAD_PX + o.depth * TREE_INDENT_PER_LEVEL_PX}px`
                  return (
                    <button
                      key={o.code}
                      type="button"
                      role="option"
                      aria-selected={isSel}
                      aria-label={`${o.code} ${o.name}`}
                      style={{ paddingLeft: pad }}
                      className={cn(
                        'group flex w-full min-w-0 items-stretch gap-1.5 rounded-md border border-transparent py-1 pr-0 text-left text-[11px] transition-colors',
                        'hover:bg-muted/60',
                        isSel && 'border-primary/25 bg-primary/[0.07]'
                      )}
                      onClick={() => selectCode(o.code)}
                    >
                      <Check
                        className={cn(
                          'mt-0.5 h-3.5 w-3.5 shrink-0 text-primary transition-opacity duration-150',
                          isSel ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
                        )}
                        aria-hidden
                      />
                      <div className="flex min-w-0 flex-1 items-baseline gap-x-[4.5px]">
                        <span className="shrink-0 font-mono font-semibold tabular-nums text-foreground">{o.code}</span>
                        <span className="min-w-0 truncate text-foreground/95" title={o.name}>
                          {o.name}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {allowClear && value.trim() !== '' && (
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
