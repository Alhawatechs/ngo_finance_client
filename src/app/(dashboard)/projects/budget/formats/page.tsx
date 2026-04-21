'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FileSpreadsheet,
  FileUp,
  Plus,
  Search,
  Edit,
  Trash2,
  Building2,
  MoreVertical,
  Eye,
  ChevronDown,
  ChevronRight,
  Layers,
  Loader2,
  Settings2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ActionMenu } from '@/components/ui/action-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { useToast } from '@/components/ui/use-toast'
import {
  BudgetFormatTemplate,
  getBudgetFormatTemplates,
  deleteBudgetFormatTemplate,
} from '@/lib/api/budgets'
import { cn } from '@/lib/utils'
import { ProjectsPageHeader } from '@/components/projects/PageHeader'
import { ProjectsPageLayout } from '../../ProjectsPageLayout'
import { parseFormatSheets } from '@/components/budget/ColumnDefinitionEditor'
import { BudgetFormatPreview } from '@/components/budget/BudgetFormatPreview'

const STRUCTURE_TYPES = [
  { value: 'account_based', label: 'Account based' },
  { value: 'donor_code_based', label: 'Donor code based' },
  { value: 'activity_based', label: 'Activity based' },
  { value: 'hybrid', label: 'Hybrid' },
] as const

function getSheetCount(columnDefinition: Record<string, unknown> | null | undefined): number {
  const sheets = parseFormatSheets(columnDefinition ?? null)
  return sheets.length
}

export default function BudgetFormatsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [formats, setFormats] = useState<(BudgetFormatTemplate & { donor?: { id: number; code: string; name: string } })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewFormat, setPreviewFormat] = useState<(BudgetFormatTemplate & { donor?: { id: number; code: string; name: string } }) | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<(BudgetFormatTemplate & { donor?: { id: number; code: string; name: string } }) | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const [loadError, setLoadError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      setLoadError(null)
      const formatsRes = await getBudgetFormatTemplates({ includeInactive: true, withDonor: true })
      const fmtData = formatsRes ?? []
      setFormats(Array.isArray(fmtData) ? fmtData : [])
    } catch (error) {
      const msg = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : null
      setLoadError(msg || 'Failed to load budget format templates. Check your connection and try again.')
      toast({ title: 'Error', description: msg || 'Failed to load budget format templates', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const filteredFormats = formats.filter(
    (f) =>
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.donor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (f.donor?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  )

  // Group templates by donor: donor_id -> formats (null/undefined = "General")
  const byDonor = filteredFormats.reduce(
    (acc, fmt) => {
      const key = fmt.donor_id ?? 'general'
      if (!acc[key]) acc[key] = { donor: fmt.donor ?? null, formats: [] }
      acc[key].formats.push(fmt)
      return acc
    },
    {} as Record<string | number, { donor: { id: number; code: string; name: string } | null; formats: (BudgetFormatTemplate & { donor?: { id: number; code: string; name: string } })[] }>
  )

  // Order: General first, then donors by name (use donors list order for consistency)
  const donorKeys = Object.keys(byDonor).filter((k) => k !== 'general')
  const generalFormats = byDonor.general?.formats ?? []
  const sortedDonorKeys = donorKeys.sort((a, b) => {
    const nameA = byDonor[a]?.donor?.name ?? ''
    const nameB = byDonor[b]?.donor?.name ?? ''
    return nameA.localeCompare(nameB)
  })

  const handleDelete = async () => {
    if (!selectedFormat) return
    try {
      await deleteBudgetFormatTemplate(selectedFormat.id)
      toast({ title: 'Success', description: 'Budget format template deleted' })
      setIsDeleteDialogOpen(false)
      setSelectedFormat(null)
      loadData()
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err && (err as { response?: { data?: { message?: string } } }).response?.data?.message
        ? (err as { response: { data: { message: string } } }).response.data.message
        : 'Failed to delete template'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <ProjectsPageLayout>
        <div className="flex flex-col items-center justify-center min-h-[320px] gap-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="animate-spin h-11 w-11 border-[3px] border-slate-200 border-t-[#023e8a] dark:border-t-sky-500 rounded-full" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Loading format templates…</p>
        </div>
      </ProjectsPageLayout>
    )
  }

  if (loadError) {
    return (
      <ProjectsPageLayout>
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white px-6 py-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Budget Format Templates</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Manage templates for project and donor budgets.</p>
          </div>
          <Card className="overflow-hidden rounded-2xl border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/20">
            <CardContent className="flex flex-col items-center justify-center py-14 text-center">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">Could not load templates</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 max-w-md">{loadError}</p>
              <Button onClick={loadData} variant="outline" className="rounded-xl">Try again</Button>
            </CardContent>
          </Card>
        </div>
      </ProjectsPageLayout>
    )
  }

  return (
    <ProjectsPageLayout>
      <div className="space-y-8">
        {/* Page header */}
        <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 px-6 py-6 shadow-sm dark:border-slate-700/80 dark:from-slate-900 dark:to-slate-800/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Budget Format Templates
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-xl">
                Define and manage templates (Legacy, UNICEF HER, UNFPA WHO, etc.) for project and donor budgets.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link href="/projects/budget">
                <Button variant="outline" size="sm" className="gap-2 border-slate-300 dark:border-slate-600">
                  Back to Budget List
                </Button>
              </Link>
              <Link href="/projects/budget/formats/new">
                <Button size="sm" className="gap-2 bg-[#023e8a] hover:bg-[#023e8a]/90 shadow-sm">
                  <Plus className="h-4 w-4" />
                  Add Format
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Toolbar: search + result count */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder="Search by name, code, or donor…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 rounded-xl border-slate-200 bg-white shadow-sm transition focus:ring-0.5 focus:ring-ring dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          {filteredFormats.length > 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
              <span className="font-medium text-slate-700 dark:text-slate-300">{filteredFormats.length}</span>
              {' '}template{filteredFormats.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Intro */}
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
          Templates define the structure of budget lines (columns and sheets). Link a template to a donor and set it as default in the Donor register for automatic suggestions when creating budgets.
        </p>

        {filteredFormats.length === 0 ? (
          <Card className="overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 shadow-none">
            <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
              {searchTerm && formats.length > 0 ? (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200/80 dark:bg-slate-700/50 mb-4">
                    <Search className="h-7 w-7 text-slate-500 dark:text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1">No templates match your search</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">Try a different term or clear the search box.</p>
                </>
              ) : (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#023e8a]/10 dark:bg-[#023e8a]/20 mb-4">
                    <FileSpreadsheet className="h-7 w-7 text-[#023e8a] dark:text-sky-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1">No budget format templates yet</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
                    Create a template to define columns and sheets for project and donor budgets.
                  </p>
                  <Link href="/projects/budget/formats/new">
                    <Button size="sm" className="gap-2 rounded-xl bg-[#023e8a] hover:bg-[#023e8a]/90 shadow-sm">
                      <Plus className="h-4 w-4" />
                      Create your first format
                    </Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-10">
            {/* General */}
            {generalFormats.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                    <FileSpreadsheet className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">General</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {generalFormats.length} template{generalFormats.length !== 1 ? 's' : ''} · No donor linked
                    </p>
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {generalFormats.map((fmt) => {
                    const def = (fmt as { column_definition?: Record<string, unknown> }).column_definition
                    const sheetCount = getSheetCount(def ?? null)
                    const openTemplate = () => { setPreviewFormat(fmt); setIsPreviewOpen(true) }
                    return (
                      <Card
                        key={fmt.id}
                        className={cn(
                          'group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300 hover:ring-2 hover:ring-[#023e8a]/10 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 dark:hover:ring-sky-500/10 cursor-pointer',
                          !fmt.is_active && 'opacity-80'
                        )}
                        onClick={openTemplate}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTemplate() } }}
                        aria-label={`Open ${fmt.name} format template`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#023e8a]/10 dark:bg-[#023e8a]/20">
                                <FileSpreadsheet className="h-5 w-5 text-[#023e8a] dark:text-sky-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <CardTitle className="text-base font-semibold leading-tight truncate text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                  {fmt.name}
                                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
                                </CardTitle>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                  <Badge variant="secondary" className="text-xs font-mono rounded-md">
                                    {fmt.code}
                                  </Badge>
                                  {sheetCount > 0 && (
                                    <Badge variant="outline" className="text-xs rounded-md text-slate-500 dark:text-slate-400">
                                      {sheetCount} sheet{sheetCount !== 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                  {!fmt.is_active && (
                                    <Badge variant="outline" className="text-xs rounded-md text-amber-700 border-amber-200 bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:bg-amber-950/40">
                                      Inactive
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                              <ActionMenu
                                triggerClassName="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                menuWidth={160}
                                items={[
                                  { label: 'Open / Preview', icon: <Eye className="h-4 w-4" />, onClick: () => { setPreviewFormat(fmt); setIsPreviewOpen(true) } },
                                  { label: 'Edit', icon: <Edit className="h-4 w-4" />, onClick: () => router.push(`/projects/budget/formats/${fmt.id}/edit`) },
                                  { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: () => { setSelectedFormat(fmt); setIsDeleteDialogOpen(true) } },
                                ]}
                              />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3" onClick={openTemplate}>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {STRUCTURE_TYPES.find((s) => s.value === fmt.structure_type)?.label ?? fmt.structure_type}
                          </p>
                          <BudgetFormatPreview
                            columnDefinition={def}
                            variant="compact"
                          />
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </section>
            )}

            {/* By donor */}
            {sortedDonorKeys.map((key) => {
              const group = byDonor[key]
              if (!group || group.formats.length === 0) return null
              const donor = group.donor
              return (
                <section key={key}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#023e8a]/10 dark:bg-[#023e8a]/20">
                      <Building2 className="h-5 w-5 text-[#023e8a] dark:text-sky-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {donor?.name ?? 'Other'}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {donor?.code && <span className="font-mono">{donor.code}</span>}
                        {donor?.code && ' · '}
                        {group.formats.length} format{group.formats.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {group.formats.map((fmt) => {
                      const def = (fmt as { column_definition?: Record<string, unknown> }).column_definition
                      const sheetCount = getSheetCount(def ?? null)
                      const openTemplate = () => { setPreviewFormat(fmt); setIsPreviewOpen(true) }
                      return (
                        <Card
                          key={fmt.id}
                          className={cn(
                            'group overflow-hidden rounded-xl border-l-4 border-l-[#023e8a] dark:border-l-sky-500 border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300 hover:ring-2 hover:ring-[#023e8a]/10 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 dark:hover:ring-sky-500/10 cursor-pointer',
                            !fmt.is_active && 'opacity-80'
                          )}
                          onClick={openTemplate}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTemplate() } }}
                          aria-label={`Open ${fmt.name} format template`}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-3 min-w-0 flex-1">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#023e8a]/10 dark:bg-[#023e8a]/20">
                                  <FileSpreadsheet className="h-5 w-5 text-[#023e8a] dark:text-sky-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <CardTitle className="text-base font-semibold leading-tight truncate text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                    {fmt.name}
                                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
                                  </CardTitle>
                                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                    <Badge variant="secondary" className="text-xs font-mono rounded-md">
                                      {fmt.code}
                                    </Badge>
                                    {sheetCount > 0 && (
                                      <Badge variant="outline" className="text-xs rounded-md text-slate-500 dark:text-slate-400">
                                        {sheetCount} sheet{sheetCount !== 1 ? 's' : ''}
                                      </Badge>
                                    )}
                                    {!fmt.is_active && (
                                      <Badge variant="outline" className="text-xs rounded-md text-amber-700 border-amber-200 bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:bg-amber-950/40">
                                        Inactive
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                                <ActionMenu
                                  triggerClassName="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                  menuWidth={160}
                                  items={[
                                    { label: 'Open / Preview', icon: <Eye className="h-4 w-4" />, onClick: () => { setPreviewFormat(fmt); setIsPreviewOpen(true) } },
                                    { label: 'Edit', icon: <Edit className="h-4 w-4" />, onClick: () => router.push(`/projects/budget/formats/${fmt.id}/edit`) },
                                    { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: () => { setSelectedFormat(fmt); setIsDeleteDialogOpen(true) } },
                                  ]}
                                />
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0 space-y-3" onClick={openTemplate}>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {STRUCTURE_TYPES.find((s) => s.value === fmt.structure_type)?.label ?? fmt.structure_type}
                            </p>
                            {donor && (
                              <div className="flex items-center gap-1.5 text-xs font-medium text-[#023e8a] dark:text-sky-400">
                                <Building2 className="h-3.5 w-3.5 shrink-0" />
                                {donor.name} ({donor.code})
                              </div>
                            )}
                            <BudgetFormatPreview
                              columnDefinition={def}
                              variant="compact"
                            />
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete format template?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{selectedFormat?.name}&quot;? This cannot be undone.
                Formats used by budgets cannot be deleted; deactivate instead.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Format Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border-slate-200/80 dark:border-slate-700 shadow-xl p-0 gap-0 overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
              <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Format preview
              </DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                Structure of the budget format: sheets and columns that will appear when using this template.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
              {previewFormat && (
                <BudgetFormatPreview
                  columnDefinition={(previewFormat as { column_definition?: Record<string, unknown> }).column_definition}
                  formatName={previewFormat.name}
                  formatCode={previewFormat.code}
                  structureType={STRUCTURE_TYPES.find((s) => s.value === previewFormat.structure_type)?.label ?? previewFormat.structure_type}
                  donor={previewFormat.donor}
                  variant="full"
                />
              )}
            </div>
            {previewFormat && (
              <DialogFooter className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 shrink-0 flex-row justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => setIsPreviewOpen(false)}
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  className="rounded-lg bg-[#023e8a] hover:bg-[#023e8a]/90"
                  onClick={() => {
                    setIsPreviewOpen(false)
                    router.push(`/projects/budget/formats/${previewFormat.id}/edit`)
                  }}
                >
                  <Edit className="h-4 w-4 mr-1.5" />
                  Edit format
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ProjectsPageLayout>
  )
}
