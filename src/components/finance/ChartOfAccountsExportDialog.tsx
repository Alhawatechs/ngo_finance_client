'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Download, FileSpreadsheet, FileText, RefreshCw, Table2 } from 'lucide-react'
import {
  CHART_OF_ACCOUNTS_EXPORT_COLUMN_GROUPS,
  CHART_OF_ACCOUNTS_EXPORT_COLUMN_KEYS,
  CHART_OF_ACCOUNTS_EXPORT_COLUMN_META,
  type ChartOfAccountExportColumnKey,
  loadSavedExportColumns,
  saveExportColumns,
} from '@/lib/chart-of-accounts-export-columns'
import { cn } from '@/lib/utils'

function buildAllIncluded(): Record<ChartOfAccountExportColumnKey, boolean> {
  return Object.fromEntries(
    CHART_OF_ACCOUNTS_EXPORT_COLUMN_KEYS.map((k) => [k, true])
  ) as Record<ChartOfAccountExportColumnKey, boolean>
}

function applyColumnKeys(keys: ChartOfAccountExportColumnKey[]): Record<ChartOfAccountExportColumnKey, boolean> {
  const set = new Set(keys)
  return Object.fromEntries(
    CHART_OF_ACCOUNTS_EXPORT_COLUMN_KEYS.map((k) => [k, set.has(k)])
  ) as Record<ChartOfAccountExportColumnKey, boolean>
}

export interface ChartOfAccountsExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExport: (format: 'xlsx' | 'pdf' | 'csv', columns: ChartOfAccountExportColumnKey[]) => Promise<void>
  exportingFormat: 'xlsx' | 'pdf' | 'csv' | null
  /** Show note when deleted accounts are included in the export. */
  includeDeletedNote?: boolean
}

export function ChartOfAccountsExportDialog({
  open,
  onOpenChange,
  onExport,
  exportingFormat,
  includeDeletedNote,
}: ChartOfAccountsExportDialogProps) {
  const [included, setIncluded] = useState<Record<ChartOfAccountExportColumnKey, boolean>>(buildAllIncluded)

  useEffect(() => {
    if (!open) return
    const saved = loadSavedExportColumns()
    setIncluded(saved?.length ? applyColumnKeys(saved) : buildAllIncluded())
  }, [open])

  const toggle = useCallback((key: ChartOfAccountExportColumnKey) => {
    setIncluded((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      const count = CHART_OF_ACCOUNTS_EXPORT_COLUMN_KEYS.filter((k) => next[k]).length
      if (count === 0) {
        return prev
      }
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setIncluded(buildAllIncluded())
  }, [])

  const runExport = async (format: 'xlsx' | 'pdf' | 'csv') => {
    const cols = CHART_OF_ACCOUNTS_EXPORT_COLUMN_KEYS.filter((k) => included[k])
    if (cols.length === 0) return
    saveExportColumns(cols)
    await onExport(format, cols)
  }

  const busy = exportingFormat !== null
  const selectedCount = CHART_OF_ACCOUNTS_EXPORT_COLUMN_KEYS.filter((k) => included[k]).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden border-border/80 p-0 shadow-lg sm:max-w-2xl">
        <DialogHeader className="border-b border-border/60 bg-gradient-to-b from-muted/40 to-muted/10 px-6 py-5 pr-14 text-left">
          <div className="flex gap-4">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/80 shadow-sm"
              aria-hidden
            >
              <Table2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 space-y-1.5">
              <DialogTitle className="text-lg font-semibold tracking-tight">Export chart of accounts</DialogTitle>
              <DialogDescription className="text-[13px] leading-relaxed text-muted-foreground">
                Pick which columns appear in your download. Excel, PDF, and CSV use the same column order and labels.
                Your choices are remembered in this browser.
              </DialogDescription>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/50 pt-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Columns to export</p>
            <div className="ml-auto flex flex-wrap items-center gap-3 sm:ml-0">
              <button
                type="button"
                className="text-xs font-medium text-primary underline-offset-4 hover:underline disabled:pointer-events-none disabled:opacity-50"
                onClick={selectAll}
                disabled={busy}
              >
                Select all
              </button>
              <span className="text-xs tabular-nums text-muted-foreground">
                {selectedCount} of {CHART_OF_ACCOUNTS_EXPORT_COLUMN_KEYS.length} selected
              </span>
            </div>
          </div>
        </DialogHeader>

        <div
          className="max-h-[min(52vh,440px)] overflow-y-auto overflow-x-hidden px-6 py-4 [scrollbar-gutter:stable] [scrollbar-width:thin]"
        >
          <fieldset className="min-w-0 space-y-6 border-0 p-0">
            <legend className="sr-only">Choose export columns</legend>
            {CHART_OF_ACCOUNTS_EXPORT_COLUMN_GROUPS.map((group, gi) => (
              <div key={group.title}>
                <div className="mb-3 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">{group.title}</h3>
                  {group.hint ? (
                    <span className="text-[11px] text-muted-foreground sm:font-normal">{group.hint}</span>
                  ) : null}
                </div>
                <ul className="space-y-2">
                  {group.keys.map((key) => {
                    const on = included[key]
                    const meta = CHART_OF_ACCOUNTS_EXPORT_COLUMN_META[key]
                    const switchId = `coa-export-col-${key}`
                    return (
                      <li key={key}>
                        <div
                          className={cn(
                            'flex w-full items-start justify-between gap-4 rounded-xl border px-3.5 py-3.5 transition-colors',
                            on
                              ? 'border-primary/35 bg-primary/[0.06] shadow-sm'
                              : 'border-border/70 bg-card hover:bg-muted/25'
                          )}
                        >
                          <div className="min-w-0 flex-1 pt-0.5">
                            <Label
                              htmlFor={switchId}
                              className="cursor-pointer text-sm font-semibold leading-snug text-foreground"
                            >
                              {meta.label}
                            </Label>
                            <p className="mt-1.5 text-[12px] leading-snug text-muted-foreground">{meta.description}</p>
                          </div>
                          <Switch
                            id={switchId}
                            checked={on}
                            onCheckedChange={() => toggle(key)}
                            disabled={busy}
                            aria-label={on ? `${meta.label}, included in export` : `${meta.label}, excluded from export`}
                            className="mt-0.5 shrink-0"
                          />
                        </div>
                      </li>
                    )
                  })}
                </ul>
                {gi < CHART_OF_ACCOUNTS_EXPORT_COLUMN_GROUPS.length - 1 ? (
                  <div className="mt-6 h-px w-full bg-border/60" aria-hidden />
                ) : null}
              </div>
            ))}
          </fieldset>
          {includeDeletedNote ? (
            <p className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-[12px] leading-snug text-amber-950 dark:text-amber-100/90" role="note">
              Deleted accounts are included in this export.
            </p>
          ) : null}
        </div>

        <DialogFooter className="flex flex-col-reverse gap-3 border-t border-border/60 bg-muted/15 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="hidden text-[11px] leading-relaxed text-muted-foreground sm:block sm:max-w-[42%]">
            Columns export left to right. Very wide layouts may wrap in PDF.
          </p>
          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:justify-end sm:gap-2">
            <Button type="button" variant="ghost" size="sm" className="h-9 px-4" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 border-border/80"
                disabled={busy}
                onClick={() => void runExport('xlsx')}
              >
                {exportingFormat === 'xlsx' ? (
                  <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" aria-hidden />
                )}
                Excel
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 border-border/80"
                disabled={busy}
                onClick={() => void runExport('pdf')}
              >
                {exportingFormat === 'pdf' ? (
                  <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                )}
                PDF
              </Button>
              <Button type="button" size="sm" className="h-9 gap-1.5 shadow-sm" disabled={busy} onClick={() => void runExport('csv')}>
                {exportingFormat === 'csv' ? (
                  <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
                )}
                CSV
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
