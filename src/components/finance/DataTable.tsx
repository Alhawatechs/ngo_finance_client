'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface FinanceDataTableProps {
  children: React.ReactNode
  className?: string
  /** Merged onto the inner `<table>` (e.g. min-width, border-collapse). */
  tableClassName?: string
}

/**
 * Scroll wrapper + `<table>` so `FinanceDataTableHeader` (`<thead>`) is valid HTML
 * and hydration matches the server.
 */
export function FinanceDataTable({ children, className, tableClassName }: FinanceDataTableProps) {
  return (
    <div className={cn('rounded-lg border overflow-x-auto overflow-y-hidden', className)}>
      <table className={cn('w-full min-w-0 border-collapse caption-bottom text-sm', tableClassName)}>
        {children}
      </table>
    </div>
  )
}

export interface FinanceDataTableHeaderProps {
  children: React.ReactNode
  /** Applied to `<thead>` (e.g. coa-ledger-thead). When set, default row styling is minimal so theme thead can apply. */
  theadClassName?: string
  className?: string
}

export function FinanceDataTableHeader({ children, className, theadClassName }: FinanceDataTableHeaderProps) {
  return (
    <thead className={theadClassName}>
      <tr className={cn(!theadClassName && 'border-b bg-muted/40', className)}>
        {children}
      </tr>
    </thead>
  )
}

export interface FinanceDataTableThProps {
  children?: React.ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
  title?: string
}

export function FinanceDataTableTh({
  children,
  align = 'left',
  className,
  title,
}: FinanceDataTableThProps) {
  return (
    <th
      title={title}
      className={cn(
        'py-3 px-4 font-medium text-muted-foreground text-sm uppercase tracking-wider',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className
      )}
    >
      {children}
    </th>
  )
}

export interface FinanceDataTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode
  className?: string
}

export function FinanceDataTableRow({ children, className, ...props }: FinanceDataTableRowProps) {
  return (
    <tr
      className={cn(
        'border-b last:border-0 hover:bg-muted/25 transition-colors',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  )
}

export interface FinanceDataTableTdProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children?: React.ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
  title?: string
}

export function FinanceDataTableTd({
  children,
  align = 'left',
  className,
  title,
  ...rest
}: FinanceDataTableTdProps) {
  return (
    <td
      title={title}
      className={cn(
        'py-3 px-4 text-sm',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className
      )}
      {...rest}
    >
      {children}
    </td>
  )
}

export interface FinancePaginationProps {
  from: number
  to: number
  total: number
  label?: string
  onPrevious: () => void
  onNext: () => void
  previousDisabled?: boolean
  nextDisabled?: boolean
  className?: string
  /** Current 1-based page. When set with lastPage and onPageChange, shows page number buttons. */
  currentPage?: number
  /** Total number of pages. */
  lastPage?: number
  /** Called when user clicks a page number. */
  onPageChange?: (page: number) => void
  /** Current page size (e.g. 10). When set with onPageSizeChange, shows "Results per page" selector. */
  pageSize?: number
  /** Options for page size selector (e.g. [10, 20, 50, 100]). */
  pageSizeOptions?: number[]
  /** Called when user selects a new page size. Caller should set page to 1. */
  onPageSizeChange?: (size: number) => void
}

/** Build page numbers to show: first, ellipsis?, window around current, ellipsis?, last. */
function buildPageNumbers(current: number, last: number): (number | 'ellipsis')[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1)
  const result: (number | 'ellipsis')[] = [1]
  const windowStart = Math.max(2, current - 2)
  const windowEnd = Math.min(last - 1, current + 2)
  if (windowStart > 2) result.push('ellipsis')
  for (let p = windowStart; p <= windowEnd; p++) result.push(p)
  if (windowEnd < last - 1) result.push('ellipsis')
  if (last > 1) result.push(last)
  return result
}

/**
 * Pagination bar: row 1 = Prev + page numbers (with ellipsis) + Next; row 2 = Results per page.
 * Aligned with global design (primary for active page, slate neutrals, rounded controls).
 */
export function FinancePagination({
  from,
  to,
  total,
  label = 'items',
  onPrevious,
  onNext,
  previousDisabled,
  nextDisabled,
  className,
  currentPage = 1,
  lastPage = 1,
  onPageChange,
  pageSize,
  pageSizeOptions = [10, 20, 50, 100],
  onPageSizeChange,
}: FinancePaginationProps) {
  const showPageNumbers = lastPage > 1 && onPageChange != null
  const showPageSizeSelector = pageSize != null && onPageSizeChange != null
  const pageNumbers = showPageNumbers ? buildPageNumbers(currentPage, lastPage) : []

  const btnBase = 'inline-flex items-center justify-center min-w-[2rem] h-8 rounded-md text-sm font-medium transition-colors'
  const btnInactive = 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
  const btnChevron = 'border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/50 disabled:opacity-50 disabled:pointer-events-none'

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 pt-2.5 pb-2.5 border-t border-slate-200/80',
        className
      )}
    >
      {/* Previous + page numbers + Next */}
      <div className="flex flex-wrap items-center justify-center gap-1">
        <button
          type="button"
          onClick={onPrevious}
          disabled={previousDisabled}
          className={cn(btnBase, 'px-2.5', btnChevron)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {showPageNumbers && (
          <>
            {pageNumbers.map((p, i) =>
              p === 'ellipsis' ? (
                <span key={`ellipsis-${i}`} className="px-1.5 text-slate-400 text-sm" aria-hidden>
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={cn(
                    btnBase,
                    'px-2.5',
                    p === currentPage
                      ? 'bg-primary text-primary-foreground border border-primary hover:bg-primary/90'
                      : btnInactive
                  )}
                  aria-label={p === currentPage ? `Page ${p} (current)` : `Go to page ${p}`}
                  aria-current={p === currentPage ? 'page' : undefined}
                >
                  {p}
                </button>
              )
            )}
          </>
        )}
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className={cn(btnBase, 'px-2.5', btnChevron)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Results per page + Showing X–Y of Z (same row on desktop) */}
      {(showPageSizeSelector || total > 0) && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          {showPageSizeSelector && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 whitespace-nowrap">Results per page:</span>
              <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
                <SelectTrigger className="w-[64px] h-8 text-xs font-medium border-slate-200 bg-white rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <p className="text-xs text-slate-500 tabular-nums">
            Showing {from}–{to} of {total} {label}
          </p>
        </div>
      )}
    </div>
  )
}
