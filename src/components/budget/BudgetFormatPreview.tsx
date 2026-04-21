'use client'

import React from 'react'
import { parseFormatSheets } from '@/components/budget/ColumnDefinitionEditor'
import { Badge } from '@/components/ui/badge'
import { FileSpreadsheet, Layers, Table2, Asterisk, Calculator, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const COLUMN_TYPE_LABELS: Record<string, string> = {
  text: 'Text',
  textarea: 'Long text',
  number: 'Number',
  currency: 'Currency',
  account_picker: 'Account',
  select: 'Dropdown',
}

function getTypeLabel(type: string): string {
  return COLUMN_TYPE_LABELS[type] ?? type
}

function getTypeBadgeVariant(type: string): 'secondary' | 'outline' | 'default' {
  if (type === 'currency' || type === 'number') return 'secondary'
  if (type === 'account_picker') return 'default'
  return 'outline'
}

export interface BudgetFormatPreviewProps {
  /** column_definition from format template (may have columns or sheets) */
  columnDefinition: Record<string, unknown> | null | undefined
  /** Format name for header */
  formatName?: string
  /** Format code for badge */
  formatCode?: string
  /** Structure type label */
  structureType?: string
  /** Donor when format is donor-specific */
  donor?: { id: number; code: string; name: string }
  /** Compact: single line summary. Full: sheets + column table. Inline: column pills */
  variant?: 'compact' | 'full' | 'inline'
  /** Show column keys (field names) in full view */
  showColumnKeys?: boolean
  className?: string
}

/** Renders a preview of a budget format (sheets and columns) from column_definition */
export function BudgetFormatPreview({
  columnDefinition,
  formatName,
  formatCode,
  structureType,
  donor,
  variant = 'full',
  showColumnKeys = false,
  className,
}: BudgetFormatPreviewProps) {
  const sheets = parseFormatSheets(columnDefinition ?? null)
  const hasMultipleSheets = sheets.length > 1

  if (sheets.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center',
          'dark:border-slate-700 dark:bg-slate-900/30',
          className
        )}
        role="status"
        aria-label="No columns defined"
      >
        <Table2 className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" aria-hidden />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No columns defined</p>
        <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">Add columns in the format template to define the budget structure.</p>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div
        className={cn('flex flex-wrap items-center gap-2 text-xs', className)}
        role="status"
        aria-label={`Format structure: ${sheets.map((s) => `${s.name} ${s.columns.length} columns`).join(', ')}`}
      >
        {hasMultipleSheets && <Layers className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />}
        {sheets.map((sheet, idx) => (
          <span
            key={sheet.key ?? idx}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
          >
            <span className="truncate max-w-[120px]" title={sheet.name}>{sheet.name}</span>
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-semibold">
              {sheet.columns.length}
            </Badge>
          </span>
        ))}
      </div>
    )
  }

  if (variant === 'inline') {
    const firstSheet = sheets[0]
    const labels = firstSheet.columns.map((c) => c.label || c.key).filter(Boolean)
    return (
      <div className={cn('flex flex-wrap items-center gap-1.5 text-xs', className)} role="list" aria-label="Column labels">
        {labels.slice(0, 8).map((l, i) => (
          <span
            key={i}
            className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            {l}
          </span>
        ))}
        {labels.length > 8 && (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
            +{labels.length - 8} more
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900',
        className
      )}
      role="article"
      aria-label={formatName ? `Format preview: ${formatName}` : 'Format structure preview'}
    >
      {(formatName || formatCode || structureType || donor) && (
        <header className="rounded-t-xl border-b border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/80 px-5 py-4 dark:border-slate-700 dark:from-slate-800/80 dark:to-slate-900/80">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#023e8a]/10 text-[#023e8a] dark:bg-[#023e8a]/20 dark:text-sky-400 shadow-sm">
              <FileSpreadsheet className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {formatName && (
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                  {formatName}
                </h3>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {formatCode && (
                  <Badge variant="secondary" className="font-mono text-xs rounded-md">
                    {formatCode}
                  </Badge>
                )}
                {structureType && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {structureType}
                  </span>
                )}
                {donor && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#023e8a]/20 bg-[#023e8a]/5 px-2.5 py-1 text-xs font-medium text-[#023e8a] dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-400">
                    <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {donor.name} ({donor.code})
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>
      )}

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {sheets.map((sheet, sheetIdx) => (
          <section
            key={sheet.key ?? sheetIdx}
            className={cn(
              'px-5 py-4',
              hasMultipleSheets && 'bg-slate-50/30 dark:bg-slate-900/30'
            )}
            aria-labelledby={hasMultipleSheets ? `sheet-${sheetIdx}` : undefined}
          >
            {hasMultipleSheets && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#023e8a]/10 dark:bg-[#023e8a]/20">
                  <Layers className="h-4 w-4 text-[#023e8a] dark:text-sky-400" aria-hidden />
                </div>
                <h4
                  id={`sheet-${sheetIdx}`}
                  className="text-sm font-semibold text-slate-800 dark:text-slate-200"
                >
                  {sheet.name}
                </h4>
                <Badge variant="outline" className="ml-auto text-xs rounded-md">
                  {sheet.columns.length} column{sheet.columns.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            )}

            {sheet.columns.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-4 py-3 text-sm italic text-slate-500 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-400">
                No columns in this sheet.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/30">
                <table className="w-full min-w-[360px] text-sm" role="table">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                      <th className="w-10 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        #
                      </th>
                      {sheet.columns.map((col, i) => (
                        <th
                          key={i}
                          className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap"
                          scope="col"
                          title={col.key}
                        >
                          <span className="flex items-center gap-1.5">
                            {col.label || col.key || '—'}
                            {col.required && (
                              <span title="Required" aria-label="Required">
                                <Asterisk className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              </span>
                            )}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    <tr className="bg-slate-50/50 dark:bg-slate-800/20">
                      <td className="px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">Type</td>
                      {sheet.columns.map((col, i) => (
                        <td key={i} className="px-4 py-2.5">
                          <Badge variant={getTypeBadgeVariant(col.type)} className="text-[10px] font-medium rounded-md">
                            {getTypeLabel(col.type)}
                          </Badge>
                        </td>
                      ))}
                    </tr>
                    {sheet.columns.some((c) => c.computed?.trim()) && (
                      <tr className="bg-slate-50/30 dark:bg-slate-800/10">
                        <td className="px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">Formula</td>
                        {sheet.columns.map((col, i) => (
                          <td key={i} className="px-4 py-2.5">
                            {col.computed?.trim() ? (
                              <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs font-mono text-slate-600 dark:bg-slate-700 dark:text-slate-300" title="Computed">
                                <Calculator className="h-3 w-3 text-slate-400 shrink-0" aria-hidden />
                                <span className="truncate max-w-[200px]">{col.computed}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    )}
                    {showColumnKeys && (
                      <tr className="bg-slate-50/50 dark:bg-slate-900/20">
                        <td className="px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">Key</td>
                        {sheet.columns.map((col, i) => (
                          <td key={i} className="px-4 py-2.5 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                            {col.key || '—'}
                          </td>
                        ))}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
