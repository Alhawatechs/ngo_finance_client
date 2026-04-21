'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import {
  BudgetFormatTemplateFormData,
  getBudgetFormatTemplate,
  updateBudgetFormatTemplate,
  parseExcelToFormatSheets,
} from '@/lib/api/budgets'
import { getDonors } from '@/lib/api/donors'
import {
  buildColumnDefinitionFromSheets,
  createDefaultSheet,
  parseFormatSheets,
  type FormatSheet,
} from '@/components/budget/ColumnDefinitionEditor'
import { BudgetFormatSheetsEditor } from '@/components/budget/BudgetFormatSheetsEditor'
import { preloadUniverEditor } from '@/lib/preload-univer'
import { ProjectsPageHeader } from '@/components/projects/PageHeader'
import { ProjectsPageLayout } from '../../../../ProjectsPageLayout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, FileSpreadsheet, FileUp, Layers, Loader2, Plus } from 'lucide-react'

const STRUCTURE_TYPES = [
  { value: 'account_based', label: 'Account based' },
  { value: 'donor_code_based', label: 'Donor code based' },
  { value: 'activity_based', label: 'Activity based' },
  { value: 'hybrid', label: 'Hybrid' },
] as const

export default function EditBudgetFormatPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id != null ? Number(params.id) : NaN
  const { toast } = useToast()

  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [donors, setDonors] = useState<{ id: number; code: string; name: string }[]>([])
  const [formLoading, setFormLoading] = useState(false)

  const [formData, setFormData] = useState<BudgetFormatTemplateFormData>({
    name: '',
    code: '',
    donor_id: null,
    structure_type: 'account_based',
    column_definition: null,
    google_spreadsheet_id: null,
    is_active: true,
  })

  const [columnDefRaw, setColumnDefRaw] = useState('{}')
  const [formatSheets, setFormatSheets] = useState<FormatSheet[]>(() => [createDefaultSheet('0', 'Main')])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getDonors({ per_page: 200, is_active: true }).then((res) => {
      const data = res?.data ?? res
      setDonors(Array.isArray(data) ? data : [])
    })
  }, [])

  useEffect(() => {
    preloadUniverEditor()
  }, [])

  useEffect(() => {
    if (Number.isNaN(id) || id <= 0) {
      setLoadError('Invalid format ID')
      setLoadState('error')
      return
    }
    let cancelled = false
    setLoadState('loading')
    setLoadError(null)
    getBudgetFormatTemplate(id)
      .then((full) => {
        if (cancelled) return
        const def = (full as { column_definition?: Record<string, unknown> }).column_definition ?? null
        setFormData({
          name: (full as { name?: string }).name ?? '',
          code: (full as { code?: string }).code ?? '',
          donor_id: (full as { donor_id?: number | null }).donor_id ?? null,
          structure_type: ((full as { structure_type?: string }).structure_type ?? 'account_based') as BudgetFormatTemplateFormData['structure_type'],
          column_definition: def,
          google_spreadsheet_id: (full as { google_spreadsheet_id?: string | null }).google_spreadsheet_id ?? null,
          is_active: (full as { is_active?: boolean }).is_active ?? true,
        })
        const parsed = parseFormatSheets(def)
        setFormatSheets(parsed.length > 0 ? parsed : [createDefaultSheet('0', 'Main')])
        setColumnDefRaw(def ? JSON.stringify(def, null, 2) : '{}')
        setLoadState('ready')
      })
      .catch((err) => {
        if (cancelled) return
        const msg =
          err && typeof err === 'object' && 'response' in err && (err as { response?: { data?: { message?: string } } }).response?.data?.message
            ? (err as { response: { data: { message: string } } }).response.data.message
            : 'Failed to load format template'
        setLoadError(msg)
        setLoadState('error')
        toast({ title: 'Error', description: msg, variant: 'destructive' })
      })
    return () => {
      cancelled = true
    }
  }, [id, toast])

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const { sheets } = await parseExcelToFormatSheets(file)
      const nextSheets: FormatSheet[] = sheets.map((s) => ({
        key: s.key,
        name: s.name,
        columns: s.columns.map((c) => ({
          key: c.key,
          label: c.label,
          type: c.type,
          required: c.required ?? false,
          computed: c.computed ?? '',
        })),
        columnWidths: s.columnWidths,
        headerRowHeight: s.headerRowHeight,
        typeRowHeight: s.typeRowHeight,
        dataRowHeight: s.dataRowHeight,
        cellData: s.cellData,
        dataRowCount: s.dataRowCount,
        mergeRanges: s.mergeRanges,
        cellStyles: s.cellStyles,
      }))
      setFormatSheets(nextSheets.length > 0 ? nextSheets : [createDefaultSheet('0', 'Main')])
      toast({ title: 'Imported', description: `Loaded ${nextSheets.length} sheet(s) from Excel.` })
    } catch (err) {
      console.error('Excel import failed', err)
      toast({ title: 'Import failed', description: 'Could not parse the Excel file.', variant: 'destructive' })
    }
  }

  const handleAddSheet = () => {
    const idx = formatSheets.length
    setFormatSheets((prev) => [...prev, createDefaultSheet(String(idx), `Annex ${idx}`)])
    toast({ title: 'Sheet added', description: 'Switch to it in the spreadsheet tab.' })
  }

  const handleUpdate = async () => {
    if (Number.isNaN(id) || id <= 0) return
    try {
      setFormLoading(true)
      const existingDef = formData.column_definition ?? null
      const hasColumns = formatSheets.some((s) => s.columns.some((r) => r.key.trim() || r.label.trim()))
      const colDef = hasColumns
        ? buildColumnDefinitionFromSheets(formatSheets, formData.code, formData.name, formData.structure_type, existingDef)
        : columnDefRaw.trim()
          ? (() => {
              try {
                return JSON.parse(columnDefRaw) as Record<string, unknown>
              } catch {
                toast({ title: 'Invalid JSON', description: 'Column definition must be valid JSON', variant: 'destructive' })
                return null
              }
            })()
          : existingDef ?? null
      if (colDef === null && columnDefRaw.trim()) return
      await updateBudgetFormatTemplate(id, { ...formData, column_definition: colDef ?? undefined })
      toast({ title: 'Success', description: 'Budget format template updated' })
      router.push('/projects/budget/formats')
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err && (err as { response?: { data?: { message?: string } } }).response?.data?.message
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Failed to update template'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally {
      setFormLoading(false)
    }
  }

  if (loadState === 'loading') {
    return (
      <ProjectsPageLayout>
        <div className="flex flex-col items-center justify-center min-h-[320px] gap-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="animate-spin h-11 w-11 border-[3px] border-slate-200 border-t-[#023e8a] dark:border-t-sky-500 rounded-full" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Loading format template…</p>
        </div>
      </ProjectsPageLayout>
    )
  }

  if (loadState === 'error') {
    return (
      <ProjectsPageLayout>
        <div className="rounded-2xl border border-slate-200/80 bg-white px-6 py-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Edit Budget Format Template</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Update the template details and spreadsheet.</p>
        </div>
        <div className="mt-6 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/20 p-6 text-center">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">Could not load template</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{loadError}</p>
          <Link href="/projects/budget/formats">
            <Button variant="outline" size="sm" className="rounded-xl">
              Back to templates
            </Button>
          </Link>
        </div>
      </ProjectsPageLayout>
    )
  }

  return (
    <ProjectsPageLayout>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleImportExcel}
        aria-label="Import from Excel"
      />
      <div className="flex flex-col h-full min-h-0">
        <ProjectsPageHeader
          title="Edit Budget Format Template"
          description="Update template metadata and design. Changing the code may affect existing budgets."
          actions={
            <Link href="/projects/budget/formats">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to templates
              </Button>
            </Link>
          }
          breadcrumbs={[
            { label: 'Projects', href: '/projects' },
            { label: 'Budget', href: '/projects/budget' },
            { label: 'Format Templates', href: '/projects/budget/formats' },
            { label: formData.name || 'Edit' },
          ]}
        />

        <div className="flex-1 flex flex-col min-h-0 mt-4 gap-4">
          <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
            <div className="shrink-0 px-4 pt-3 pb-0 border-b border-slate-100 dark:border-slate-800">
              <TabsList className="w-full justify-start h-11 rounded-none border-b-0 bg-transparent p-0 gap-0">
                <TabsTrigger value="details" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-[#023e8a] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3">
                  <Layers className="h-4 w-4" />
                  Format details
                </TabsTrigger>
                <TabsTrigger value="spreadsheet" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-[#023e8a] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3">
                  <FileSpreadsheet className="h-4 w-4" />
                  Budget spreadsheet
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="details" className="flex-1 mt-0 p-5 min-h-0 overflow-auto">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Update name, code, structure type and optional donor. Use Import from Excel to replace or add sheets.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400" htmlFor="edit-name">
                    Name <span className="text-red-500 dark:text-red-400">*</span>
                  </Label>
                  <Input
                    id="edit-name"
                    placeholder="e.g. UNICEF HER"
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    className="h-9 text-sm"
                    aria-required="true"
                    disabled={formLoading}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400" htmlFor="edit-code">
                    Code <span className="text-red-500 dark:text-red-400">*</span>
                  </Label>
                  <Input
                    id="edit-code"
                    placeholder="e.g. unicef_her"
                    value={formData.code}
                    onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))}
                    className="h-9 text-sm font-mono"
                    aria-required="true"
                    disabled={formLoading}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Structure type</Label>
                  <Select
                    value={formData.structure_type}
                    onValueChange={(v) => setFormData((p) => ({ ...p, structure_type: v as BudgetFormatTemplateFormData['structure_type'] }))}
                    disabled={formLoading}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STRUCTURE_TYPES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Default donor (optional)</Label>
                  <Select
                    value={formData.donor_id?.toString() ?? 'none'}
                    onValueChange={(v) => setFormData((p) => ({ ...p, donor_id: v === 'none' ? null : parseInt(v, 10) }))}
                    disabled={formLoading}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="— None —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {donors.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.name} ({d.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={formLoading}
                >
                  <FileUp className="h-4 w-4" />
                  Import from Excel
                </Button>
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handleAddSheet} disabled={formLoading}>
                  <Plus className="h-4 w-4" />
                  Add sheet
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="spreadsheet" className="flex-1 mt-0 min-h-0 flex flex-col min-w-0 p-0 overflow-hidden bg-white dark:bg-slate-900 data-[state=active]:flex">
              <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Row 0 = headers. Row 1 = types (text, number, date, etc.). Switch sheets via the tabs at the bottom.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={formLoading}
                  >
                    <FileUp className="h-4 w-4" />
                    Import from Excel
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handleAddSheet} disabled={formLoading}>
                    <Plus className="h-4 w-4" />
                    Add sheet
                  </Button>
                </div>
              </div>
              <div className="univer-sheet-wrapper flex-1 flex flex-col w-full min-w-0">
                <BudgetFormatSheetsEditor
                  value={formatSheets}
                  onChange={setFormatSheets}
                  templateCode={formData.code}
                  templateName={formData.name}
                  disabled={formLoading}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="shrink-0 flex flex-wrap items-center justify-between gap-4 py-4 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="edit-active"
                  checked={formData.is_active}
                  onCheckedChange={(c) => setFormData((p) => ({ ...p, is_active: c }))}
                  disabled={formLoading}
                />
                <Label htmlFor="edit-active" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  Active template
                </Label>
              </div>
              <details className="text-sm">
                <summary className="cursor-pointer text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
                  Advanced (edit JSON)
                </summary>
                <div className="mt-2">
                  <Textarea
                    placeholder='{"columns": []}'
                    rows={3}
                    value={columnDefRaw}
                    onChange={(e) => setColumnDefRaw(e.target.value)}
                    className="font-mono text-xs rounded-md border-slate-200 dark:border-slate-700"
                    disabled={formLoading}
                  />
                </div>
              </details>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/projects/budget/formats">
                <Button type="button" variant="outline" size="sm" disabled={formLoading}>
                  Cancel
                </Button>
              </Link>
              <Button
                size="sm"
                onClick={handleUpdate}
                disabled={formLoading || !formData.name.trim() || !formData.code.trim()}
              >
                {formLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save changes'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ProjectsPageLayout>
  )
}
