'use client'

import React, { useCallback, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import {
  Download,
  Upload,
  ListOrdered,
  RefreshCw,
  ArrowRight,
  FileSpreadsheet,
  Table2,
  AlertCircle,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import {
  exportChartOfAccounts,
  getAccountsTree,
  flattenAccountsTree,
  importChartOfAccounts,
  type ChartOfAccountsImportResult,
} from '@/lib/api/chart-of-accounts'
import { COA_IMPORT_ALLOWED_EXTENSIONS_LABEL, validateCoaImportFile } from '@/lib/coa-import-file-validation'
import { COA_IMPORT_FORMAT_RULES, tipForRowErrorMessage } from '@/lib/coa-import-guidance'
import type { ChartOfAccountExportColumnKey } from '@/lib/chart-of-accounts-export-columns'
import {
  downloadCoaImportSampleCsv,
  downloadCoaImportSampleExcel,
} from '@/lib/coa-import-sample-workbook'
import Link from 'next/link'
import { ChartOfAccountsPageFrame } from '@/components/finance/ChartOfAccountsPageFrame'
import { ChartOfAccountsExportDialog } from '@/components/finance/ChartOfAccountsExportDialog'
import { useChartOfAccountsPermissions } from '@/hooks/useChartOfAccountsPermissions'
import { cn } from '@/lib/utils'

function CoaImportHelpBox({
  headline,
  detail,
  hint,
  actions,
  showRequirements,
}: {
  headline: string
  detail: string
  hint?: string
  actions?: string[]
  /** Show expandable “what the system expects” checklist */
  showRequirements?: boolean
}) {
  return (
    <div className="space-y-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-3 text-sm">
      <div>
        <p className="font-semibold text-destructive">{headline}</p>
        <p className="mt-1 text-foreground/90">{detail}</p>
        {hint ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
      </div>
      {actions && actions.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-foreground">How to fix</p>
          <ol className="mt-1.5 list-inside list-decimal space-y-1.5 text-xs leading-relaxed text-muted-foreground">
            {actions.map((a, i) => (
              <li key={i} className="pl-0.5">
                {a}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      {showRequirements ? (
        <details className="rounded border border-border/60 bg-background/80 px-2 py-1.5 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">What the system expects</summary>
          <ul className="mt-2 list-inside list-disc space-y-1.5 pl-0.5 leading-relaxed">
            {COA_IMPORT_FORMAT_RULES.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  )
}

export default function ImportExportPage() {
  const { canEditCoa, canImportCoa, canViewCoaModule } = useChartOfAccountsPermissions()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const importFileRef = useRef<HTMLInputElement>(null)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportingFormat, setExportingFormat] = useState<'xlsx' | 'pdf' | 'csv' | null>(null)
  const [includeDeletedInExport, setIncludeDeletedInExport] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [lastImportResult, setLastImportResult] = useState<ChartOfAccountsImportResult | null>(null)
  const [clientImportIssue, setClientImportIssue] = useState<{
    title: string
    detail: string
    actions?: string[]
  } | null>(null)
  const [validatingImportFile, setValidatingImportFile] = useState(false)

  const { data: treeData, isLoading } = useQuery({
    queryKey: ['chart-of-accounts-tree'],
    queryFn: () => getAccountsTree(),
  })

  const flatAccounts = useMemo(() => {
    if (!treeData?.success || !treeData?.data) return []
    return flattenAccountsTree(treeData.data)
  }, [treeData])

  const handleExportWithColumns = useCallback(
    async (format: 'xlsx' | 'pdf' | 'csv', columns: ChartOfAccountExportColumnKey[]) => {
      if (!canViewCoaModule) {
        toast({
          title: 'Permission required',
          description: 'You need access to the chart of accounts to export.',
          variant: 'destructive',
        })
        return
      }
      setExportingFormat(format)
      try {
        await exportChartOfAccounts(format, { withTrashed: includeDeletedInExport, columns })
        const label = format === 'xlsx' ? 'Excel' : format === 'pdf' ? 'PDF' : 'CSV'
        toast({
          title: 'Export complete',
          description: `Chart of accounts downloaded (${label})${includeDeletedInExport ? ', including deleted accounts.' : '.'}`,
        })
        setExportDialogOpen(false)
      } catch (e: unknown) {
        toast({
          title: 'Export failed',
          description: e instanceof Error && e.message ? e.message : 'Could not export. Try again.',
          variant: 'destructive',
        })
      } finally {
        setExportingFormat(null)
      }
    },
    [toast, canViewCoaModule, includeDeletedInExport]
  )

  const handleDownloadExcelSample = useCallback(() => {
    try {
      downloadCoaImportSampleExcel()
      toast({
        title: 'Workbook downloaded',
        description: 'Open the file: Sheet “Import guidelines” explains import; “Sample format” shows columns and examples.',
      })
    } catch {
      toast({
        title: 'Download failed',
        description: 'Could not build the sample file. Try again.',
        variant: 'destructive',
      })
    }
  }, [toast])

  const handleDownloadCsvSample = useCallback(() => {
    downloadCoaImportSampleCsv()
    toast({
      title: 'CSV downloaded',
      description: 'Same tabular data as the “Sample format” sheet — guidelines are only in the Excel workbook.',
    })
  }, [toast])

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setLastImportResult(null)
    setClientImportIssue(null)
    if (!f) {
      setImportFile(null)
      return
    }
    setImportFile(f)
    setValidatingImportFile(true)
    void validateCoaImportFile(f).then((v) => {
      setValidatingImportFile(false)
      if (!v.ok) {
        setClientImportIssue({ title: v.title, detail: v.detail, actions: v.actions })
      }
    })
  }

  const handleRunImport = useCallback(async () => {
    if (!importFile || !canImportCoa) return
    const pre = await validateCoaImportFile(importFile)
    if (!pre.ok) {
      setClientImportIssue({ title: pre.title, detail: pre.detail, actions: pre.actions })
      toast({ title: pre.title, description: pre.detail, variant: 'destructive' })
      return
    }
    setClientImportIssue(null)
    setImporting(true)
    setLastImportResult(null)
    try {
      const res = await importChartOfAccounts(importFile)
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Import failed')
      }
      setLastImportResult(res.data)
      await queryClient.invalidateQueries({ queryKey: ['chart-of-accounts-tree'] })
      const { imported, skipped, errors, diagnostics } = res.data
      const errCount = errors.length
      const blocked = diagnostics != null
      if (blocked) {
        toast({
          title: 'Import could not run',
          description: diagnostics.message,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Import finished',
          description:
            errCount > 0
              ? `Imported ${imported}, skipped ${skipped} (already in chart). ${errCount} row(s) reported issues — see below.`
              : `Imported ${imported}, skipped ${skipped} (codes already existed).`,
          variant: imported === 0 && errCount > 0 ? 'destructive' : 'default',
        })
      }
      if (!blocked && imported > 0) {
        setImportFile(null)
        if (importFileRef.current) importFileRef.current.value = ''
      }
    } catch (e: unknown) {
      const ax = axios.isAxiosError(e)
      const data = ax
        ? (e.response?.data as { message?: string; errors?: { file?: string[] } } | undefined)
        : undefined
      const fileErr = data?.errors?.file?.[0]
      const msg = data?.message || (e instanceof Error ? e.message : 'Could not import.')
      toast({
        title: 'Import failed',
        description: fileErr ? `${msg} ${fileErr}` : msg,
        variant: 'destructive',
      })
    } finally {
      setImporting(false)
    }
  }, [importFile, canImportCoa, queryClient, toast])

  return (
    <ChartOfAccountsPageFrame title="Import & Export" className="gap-3">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto [scrollbar-gutter:stable]">
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Use <span className="font-medium text-foreground">Export</span> to download your live chart. Use{' '}
          <span className="font-medium text-foreground">Import</span> to upload a prepared CSV or Excel (
          <strong className="font-medium text-foreground">Sample format</strong> sheet), or download the sample first.
        </p>

        <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-2 lg:items-start">
          {/* —— Export —— */}
          <section aria-labelledby="coa-section-export" className="flex min-h-0 flex-col gap-3">
            <h3 id="coa-section-export" className="sr-only">
              Export
            </h3>
            <Card className="coa-ledger-card border-border/80 shadow-sm lg:border-l-4 lg:border-l-primary/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/80 bg-muted/40">
                    <Download className="h-4 w-4 text-primary" aria-hidden />
                  </span>
                  Export
                </CardTitle>
                <CardDescription>
                  Download your organization&apos;s chart (Excel, PDF, or CSV) with the columns you choose.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-1.5 text-sm leading-relaxed text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-primary" aria-hidden>
                      •
                    </span>
                    <span>
                      Click <strong className="font-medium text-foreground">Export chart…</strong> to pick format and
                      columns; preferences are saved in this browser.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary" aria-hidden>
                      •
                    </span>
                    <span>
                      Excel and CSV are generated on the server; PDF is built in your browser.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary" aria-hidden>
                      •
                    </span>
                    <span>
                      Enable <strong className="font-medium text-foreground">Include deleted accounts</strong> if you
                      need soft-deleted rows in the file.
                    </span>
                  </li>
                </ul>

                {isLoading ? (
                  <Skeleton className="h-10 w-full max-w-md" />
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
                      <Switch
                        id="coa-export-include-deleted"
                        checked={includeDeletedInExport}
                        onCheckedChange={setIncludeDeletedInExport}
                        disabled={!canViewCoaModule || !!exportingFormat}
                        aria-label="Include deleted accounts in export"
                      />
                      <Label htmlFor="coa-export-include-deleted" className="cursor-pointer text-sm font-normal">
                        Include deleted accounts in export
                      </Label>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="gap-1.5"
                        disabled={!!exportingFormat || !canViewCoaModule}
                        onClick={() => setExportDialogOpen(true)}
                        aria-haspopup="dialog"
                      >
                        {exportingFormat ? (
                          <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <Download className="h-4 w-4" aria-hidden />
                        )}
                        Export chart…
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/general-ledger/accounts" className="gap-1.5">
                          Open account list
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      </Button>
                    </div>
                    <ChartOfAccountsExportDialog
                      open={exportDialogOpen}
                      onOpenChange={setExportDialogOpen}
                      onExport={handleExportWithColumns}
                      exportingFormat={exportingFormat}
                      includeDeletedNote={includeDeletedInExport}
                    />
                    <p
                      className={cn(
                        'rounded-md border border-transparent bg-muted/15 px-2 py-1.5 text-sm leading-relaxed text-muted-foreground',
                        flatAccounts.length === 0 && 'border-amber-200/80 bg-amber-50/80 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100'
                      )}
                    >
                      {flatAccounts.length > 0 ? (
                        <>
                          <span className="font-medium text-foreground tabular-nums">{flatAccounts.length}</span> accounts
                          in the current chart (including headers).
                        </>
                      ) : (
                        <>No accounts loaded yet — add accounts from Account list before exporting.</>
                      )}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </section>

          {/* —— Import —— */}
          <section aria-labelledby="coa-section-import" className="flex min-h-0 flex-col gap-3">
            <h3 id="coa-section-import" className="sr-only">
              Import
            </h3>
            <Card className="coa-ledger-card border-border/80 shadow-sm lg:border-l-4 lg:border-l-primary/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/80 bg-muted/40">
                    <Upload className="h-4 w-4 text-primary" aria-hidden />
                  </span>
                  Import
                </CardTitle>
                <CardDescription>
                  Upload a CSV or Excel file using the same columns as <strong className="text-foreground">Sample format</strong>.
                  Requires Edit Chart of Accounts and Edit Chart of Accounts Code.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-1.5 text-sm leading-relaxed text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-primary" aria-hidden>
                      •
                    </span>
                    <span>
                      Download the <strong className="font-medium text-foreground">Excel workbook</strong>:{' '}
                      <strong className="font-medium text-foreground">Import guidelines</strong> explains rules;{' '}
                      <strong className="font-medium text-foreground">Sample format</strong> is the table to fill and upload.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary" aria-hidden>
                      •
                    </span>
                    <span>
                      <strong className="font-medium text-foreground">CSV</strong> uses the same columns as Sample format (no guideline sheet).
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary" aria-hidden>
                      •
                    </span>
                    <span>
                      Existing codes are <strong className="font-medium text-foreground">skipped</strong> (not updated). Parents must exist in the file or already in your chart.
                    </span>
                  </li>
                </ul>

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button type="button" onClick={handleDownloadExcelSample} className="gap-2">
                    <Table2 className="h-4 w-4" aria-hidden />
                    Download import sample (Excel)
                  </Button>
                  <Button type="button" variant="outline" onClick={handleDownloadCsvSample} className="gap-2">
                    <FileSpreadsheet className="h-4 w-4" aria-hidden />
                    Download table only (CSV)
                  </Button>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Allowed types: {COA_IMPORT_ALLOWED_EXTENSIONS_LABEL}. Max size 10 MB. Excel: use tabs{' '}
                  <strong className="font-medium text-foreground">Import guidelines</strong> and{' '}
                  <strong className="font-medium text-foreground">Sample format</strong>.
                </p>

                <div className="space-y-2 rounded-lg border border-border/80 bg-background p-3">
                  <Label htmlFor="coa-import-upload" className="text-sm font-medium">
                    Upload file
                  </Label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      ref={importFileRef}
                      id="coa-import-upload"
                      type="file"
                      accept=".csv,.txt,.xlsx,.xls,.xlsm"
                      className="max-w-md cursor-pointer"
                      disabled={!canImportCoa || importing || validatingImportFile}
                      onChange={handleImportFileChange}
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={
                        !importFile ||
                        !canImportCoa ||
                        importing ||
                        validatingImportFile ||
                        !!clientImportIssue
                      }
                      onClick={() => void handleRunImport()}
                      className="gap-1.5 shrink-0"
                    >
                      {importing || validatingImportFile ? (
                        <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Upload className="h-4 w-4" aria-hidden />
                      )}
                      Run import
                    </Button>
                  </div>
                  {validatingImportFile ? (
                    <p className="text-xs text-muted-foreground">Checking file…</p>
                  ) : null}
                  {clientImportIssue ? (
                    <CoaImportHelpBox
                      headline={clientImportIssue.title}
                      detail={clientImportIssue.detail}
                      actions={clientImportIssue.actions}
                      showRequirements
                    />
                  ) : null}
                  {!canImportCoa ? (
                    <p className="text-xs text-muted-foreground">
                      You need <strong className="font-medium text-foreground">Edit Chart of Accounts</strong> and{' '}
                      <strong className="font-medium text-foreground">Edit Chart of Accounts Code</strong> to import. You can
                      still add accounts from{' '}
                      <Link href="/general-ledger/accounts" className="text-primary underline-offset-4 hover:underline">
                        Account list
                      </Link>
                      {canEditCoa ? '' : ' if an administrator grants access'}.
                    </p>
                  ) : importFile ? (
                    <p className="text-xs text-muted-foreground">Selected: {importFile.name}</p>
                  ) : null}
                </div>

                {lastImportResult ? (
                  <div
                    className={cn(
                      'rounded-lg border p-3 text-sm',
                      lastImportResult.diagnostics || lastImportResult.errors.length > 0
                        ? 'border-destructive/40 bg-destructive/5'
                        : 'border-border/80 bg-muted/20'
                    )}
                  >
                    {lastImportResult.diagnostics ? (
                      <CoaImportHelpBox
                        headline={lastImportResult.diagnostics.message}
                        detail={lastImportResult.diagnostics.hint}
                        actions={lastImportResult.diagnostics.actions}
                        showRequirements
                      />
                    ) : (
                      <>
                        <p className="font-medium text-foreground">
                          Last result: {lastImportResult.imported} imported, {lastImportResult.skipped} skipped
                        </p>
                        {lastImportResult.errors.length > 0 ? (
                          <ul className="mt-2 max-h-52 list-inside space-y-2 overflow-y-auto text-xs text-muted-foreground">
                            {lastImportResult.errors.slice(0, 25).map((err, i) => {
                              const tip = tipForRowErrorMessage(err.message)
                              return (
                                <li key={i} className="list-none">
                                  <span className="text-foreground">
                                    {err.row != null ? `Line ${err.row}` : 'File'}:{' '}
                                    {err.account_code ? `${err.account_code} — ` : ''}
                                    {err.message}
                                  </span>
                                  {tip ? (
                                    <p className="mt-0.5 pl-3 text-[11px] leading-snug text-muted-foreground border-l-2 border-primary/30">
                                      Tip: {tip}
                                    </p>
                                  ) : null}
                                </li>
                              )
                            })}
                            {lastImportResult.errors.length > 25 ? (
                              <li className="list-none text-[11px]">…and {lastImportResult.errors.length - 25} more</li>
                            ) : null}
                          </ul>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : null}

                <div className="rounded-lg border border-border/80 bg-muted/30 p-4">
                  <div className="flex items-start gap-3">
                    <ListOrdered className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-foreground">Quick steps</p>
                      <ol className="list-inside list-decimal space-y-1.5 text-muted-foreground">
                        <li>Download the sample or start from your own sheet with the same headers.</li>
                        <li>Fill <strong className="font-medium text-foreground">Sample format</strong> (Excel) or CSV rows.</li>
                        <li>Choose the file and click <strong className="font-medium text-foreground">Run import</strong>.</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-md border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <p>
                    L1–L3 rows are saved as <strong className="font-medium">headers</strong>; L4 (e.g. <code className="rounded bg-muted px-1">11.1.1</code>) as{' '}
                    <strong className="font-medium">posting</strong> accounts. Currency must match an active org currency for posting rows.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </ChartOfAccountsPageFrame>
  )
}
