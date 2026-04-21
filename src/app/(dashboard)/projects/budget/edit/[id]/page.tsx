'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Wallet, Plus, Trash2, Upload } from 'lucide-react'
import { getBudget, updateBudget, Budget, BudgetLine, parseBudgetExcel } from '@/lib/api/budgets'
import { BudgetFormatPreview } from '@/components/budget/BudgetFormatPreview'
import { getAccounts } from '@/lib/api/chart-of-accounts'
import { useToast } from '@/components/ui/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProjectsPageHeader } from '@/components/projects/PageHeader'

interface BudgetLineRow {
  account_id: number | null
  description: string
  q1_amount: number
  q2_amount: number
  q3_amount: number
  q4_amount: number
  format_attributes?: Record<string, unknown>
  sheet_key?: string | null
}

interface UnicefHerLineRow extends BudgetLineRow {
  section_code: string
  item_description: string
  cso_contribution: number
  unicef_contribution: number
  unit_type: string
  quantity: number
  unit_cost: number
  remark: string
}

interface UnfpaWhoLineRow extends BudgetLineRow {
  category_code: string
  budget_line_description: string
  unit_description: string
  quantity: number
  unit_cost: number
  duration_recurrence: string
  cost_pct: number
  budget_narrative: string
  remarks: string
  location: string
}

const emptyLine: BudgetLineRow = {
  account_id: null,
  description: '',
  q1_amount: 0,
  q2_amount: 0,
  q3_amount: 0,
  q4_amount: 0,
}

const UNICEF_SECTIONS = [
  '1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8',
  '2.1', '2.2', '2.3', '2.4', '3.1', '3.2', '3.3',
  '4.1', '4.2', '5.1', '5.2', '6.1', '6.2',
  'EEPM.1', 'EEPM.2', 'EEPM.3',
]

const WHO_CATEGORIES = [
  '1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8',
  '2.1', '2.2', '2.3', '2.4', '2.5', '3.1', '3.2', '3.3', '3.4', '3.5', '3.6',
  '4.1', '4.2', '5.1', '5.2', '5.3', '5.4', '5.5',
  '6.1', '6.2', '6.3', '6.4', '6.5', '6.6', '6.7',
  '7.1', '7.2', '7.3',
]

const emptyUnicefLine: UnicefHerLineRow = {
  ...emptyLine,
  section_code: '',
  item_description: '',
  cso_contribution: 0,
  unicef_contribution: 0,
  unit_type: '',
  quantity: 0,
  unit_cost: 0,
  remark: '',
}

const emptyUnfpaLine: UnfpaWhoLineRow = {
  ...emptyLine,
  category_code: '',
  budget_line_description: '',
  unit_description: '',
  quantity: 0,
  unit_cost: 0,
  duration_recurrence: '',
  cost_pct: 100,
  budget_narrative: '',
  remarks: '',
  location: '',
}

function lineToRow(l: BudgetLine & { format_attributes?: Record<string, unknown>; sheet_key?: string | null }): BudgetLineRow {
  return {
    account_id: l.account_id,
    description: l.description ?? '',
    q1_amount: l.q1_amount ?? 0,
    q2_amount: l.q2_amount ?? 0,
    q3_amount: l.q3_amount ?? 0,
    q4_amount: l.q4_amount ?? 0,
    format_attributes: l.format_attributes,
    sheet_key: l.sheet_key ?? null,
  }
}

function lineToUnicefRow(l: BudgetLine & { format_attributes?: Record<string, unknown>; sheet_key?: string | null }): UnicefHerLineRow {
  const fa = (l.format_attributes ?? {}) as Record<string, unknown>
  return {
    ...lineToRow(l),
    section_code: String(fa.section_code ?? ''),
    item_description: String(fa.item_description ?? l.description ?? ''),
    cso_contribution: Number(fa.cso_contribution ?? 0) || 0,
    unicef_contribution: Number(fa.unicef_contribution ?? 0) || 0,
    unit_type: String(fa.unit_type ?? ''),
    quantity: Number(fa.quantity ?? 0) || 0,
    unit_cost: Number(fa.unit_cost ?? 0) || 0,
    remark: String(fa.remark ?? ''),
  }
}

function lineToUnfpaRow(l: BudgetLine & { format_attributes?: Record<string, unknown>; sheet_key?: string | null }): UnfpaWhoLineRow {
  const fa = (l.format_attributes ?? {}) as Record<string, unknown>
  return {
    ...lineToRow(l),
    category_code: String(fa.category_code ?? ''),
    budget_line_description: String(fa.budget_line_description ?? l.description ?? ''),
    unit_description: String(fa.unit_description ?? ''),
    quantity: Number(fa.quantity ?? 0) || 0,
    unit_cost: Number(fa.unit_cost ?? 0) || 0,
    duration_recurrence: String(fa.duration_recurrence ?? ''),
    cost_pct: Number(fa.cost_pct ?? 100) || 100,
    budget_narrative: String(fa.budget_narrative ?? ''),
    remarks: String(fa.remarks ?? ''),
    location: String(fa.location ?? ''),
  }
}

export default function EditBudgetPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const id = typeof params?.id === 'string' ? parseInt(params.id, 10) : NaN
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [lines, setLines] = useState<BudgetLineRow[]>([{ ...emptyLine }])
  const [unicefLines, setUnicefLines] = useState<UnicefHerLineRow[]>([{ ...emptyUnicefLine }])
  const [unfpaLines, setUnfpaLines] = useState<UnfpaWhoLineRow[]>([{ ...emptyUnfpaLine }])
  const [initialized, setInitialized] = useState(false)

  const { data: budget, isLoading, error } = useQuery({
    queryKey: ['budget', id],
    queryFn: () => getBudget(id),
    enabled: Number.isInteger(id) && id > 0,
  })

  const { data: accountsData } = useQuery({
    queryKey: ['accounts-list'],
    queryFn: () => getAccounts({ per_page: 200, posting_only: true }),
  })
  const accounts = (accountsData?.data ?? []) as { id: number; account_code: string; account_name: string }[]

  const formatCode = (b: Budget | undefined) =>
    (b?.budget_format_template as { code?: string } | undefined)?.code ?? 'legacy'

  useEffect(() => {
    if (!budget || initialized) return
    const raw = budget as { data?: { budget?: Budget; lines?: BudgetLine[] }; budget?: Budget; lines?: BudgetLine[] }
    const b = raw?.data?.budget ?? (raw as Budget)
    const lineList = raw?.data?.lines ?? b?.lines ?? []
    const code = formatCode(b)
    setName(b.name ?? '')
    setDescription(b.description ?? '')
    if (lineList.length > 0) {
      if (code === 'unicef_her') {
        setUnicefLines(lineList.map(lineToUnicefRow))
      } else if (code === 'unfpa_who') {
        setUnfpaLines(lineList.map(lineToUnfpaRow))
      } else {
        setLines(lineList.map(lineToRow))
      }
    } else {
      if (code === 'unicef_her') setUnicefLines([{ ...emptyUnicefLine }])
      else if (code === 'unfpa_who') setUnfpaLines([{ ...emptyUnfpaLine }])
      else setLines([{ ...emptyLine }])
    }
    setInitialized(true)
  }, [budget, initialized])

  const addLine = () => setLines((prev) => [...prev, { ...emptyLine }])
  const removeLine = (index: number) => setLines((prev) => prev.filter((_, i) => i !== index))
  const updateLine = (index: number, field: keyof BudgetLineRow, value: number | string | null) => {
    setLines((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }
  const addUnicefLine = () => setUnicefLines((prev) => [...prev, { ...emptyUnicefLine }])
  const removeUnicefLine = (i: number) => setUnicefLines((prev) => prev.filter((_, j) => j !== i))
  const updateUnicefLine = (i: number, field: keyof UnicefHerLineRow, value: number | string | null) => {
    setUnicefLines((prev) => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      return next
    })
  }
  const addUnfpaLine = () => setUnfpaLines((prev) => [...prev, { ...emptyUnfpaLine }])
  const removeUnfpaLine = (i: number) => setUnfpaLines((prev) => prev.filter((_, j) => j !== i))
  const updateUnfpaLine = (i: number, field: keyof UnfpaWhoLineRow, value: number | string | null) => {
    setUnfpaLines((prev) => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      return next
    })
  }

  const buildSubmitLines = (): { account_id: number; description: string; q1_amount: number; q2_amount: number; q3_amount: number; q4_amount: number; format_attributes?: Record<string, unknown>; sheet_key?: string | null }[] => {
    const raw = budget as { data?: { budget?: Budget }; budget?: Budget }
    const b = raw?.data?.budget ?? (budget as Budget)
    const code = formatCode(b)
    if (code === 'unicef_her') {
      const valid = unicefLines.filter(
        (l) =>
          l.account_id != null &&
          (l.item_description.trim() || l.description.trim()) &&
          (l.cso_contribution + l.unicef_contribution + l.q1_amount + l.q2_amount + l.q3_amount + l.q4_amount) > 0
      )
      return valid.map((l) => {
        const desc = l.item_description.trim() || l.description.trim()
        return {
          account_id: l.account_id!,
          description: desc,
          q1_amount: Number(l.q1_amount) || 0,
          q2_amount: Number(l.q2_amount) || 0,
          q3_amount: Number(l.q3_amount) || 0,
          q4_amount: Number(l.q4_amount) || 0,
          sheet_key: l.sheet_key ?? null,
          format_attributes: {
            section_code: l.section_code,
            item_description: l.item_description,
            cso_contribution: Number(l.cso_contribution) || 0,
            unicef_contribution: Number(l.unicef_contribution) || 0,
            unit_type: l.unit_type,
            quantity: Number(l.quantity) || 0,
            unit_cost: Number(l.unit_cost) || 0,
            remark: l.remark,
          },
        }
      })
    }
    if (code === 'unfpa_who') {
      const valid = unfpaLines.filter(
        (l) =>
          l.account_id != null &&
          (l.budget_line_description.trim() || l.description.trim()) &&
          (Number(l.quantity) * Number(l.unit_cost) || l.q1_amount + l.q2_amount + l.q3_amount + l.q4_amount) > 0
      )
      return valid.map((l) => {
        const totalCost = (Number(l.quantity) || 0) * (Number(l.unit_cost) || 0) * ((Number(l.cost_pct) || 100) / 100)
        const qSum = (Number(l.q1_amount) || 0) + (Number(l.q2_amount) || 0) + (Number(l.q3_amount) || 0) + (Number(l.q4_amount) || 0)
        const qSplit = qSum > 0 ? undefined : totalCost / 4
        const desc = l.budget_line_description.trim() || l.description.trim()
        return {
          account_id: l.account_id!,
          description: desc,
          q1_amount: qSplit ?? (Number(l.q1_amount) || 0),
          q2_amount: qSplit ?? (Number(l.q2_amount) || 0),
          q3_amount: qSplit ?? (Number(l.q3_amount) || 0),
          q4_amount: qSplit ?? (Number(l.q4_amount) || 0),
          sheet_key: l.sheet_key ?? null,
          format_attributes: {
            category_code: l.category_code,
            budget_line_description: l.budget_line_description,
            unit_description: l.unit_description,
            quantity: Number(l.quantity) || 0,
            unit_cost: Number(l.unit_cost) || 0,
            duration_recurrence: l.duration_recurrence,
            cost_pct: Number(l.cost_pct) || 100,
            budget_narrative: l.budget_narrative,
            remarks: l.remarks,
            location: l.location,
          },
        }
      })
    }
    const valid = lines.filter(
      (l) => l.account_id != null && l.description.trim() && (l.q1_amount + l.q2_amount + l.q3_amount + l.q4_amount) > 0
    )
    return valid.map((l) => ({
      account_id: l.account_id!,
      description: l.description.trim(),
      q1_amount: Number(l.q1_amount) || 0,
      q2_amount: Number(l.q2_amount) || 0,
      q3_amount: Number(l.q3_amount) || 0,
      q4_amount: Number(l.q4_amount) || 0,
      sheet_key: l.sheet_key ?? null,
      ...(l.format_attributes && Object.keys(l.format_attributes).length > 0 ? { format_attributes: l.format_attributes } : {}),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!Number.isInteger(id) || id <= 0) return
    if (!name.trim()) {
      toast({ title: 'Validation', description: 'Please enter budget name.', variant: 'destructive' })
      return
    }
    const raw = budget as { data?: { budget?: Budget }; budget?: Budget }
    const b = raw?.data?.budget ?? (budget as Budget)
    if (b.status !== 'draft') {
      toast({ title: 'Not editable', description: 'Only draft budgets can be edited. Create a revision from an approved budget.', variant: 'destructive' })
      return
    }
    const submitLines = buildSubmitLines()
    if (submitLines.length === 0) {
      toast({ title: 'Validation', description: 'Add at least one budget line with account, description, and amounts.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await updateBudget(id, {
        name: name.trim(),
        description: description.trim() || undefined,
        lines: submitLines,
      })
      toast({ title: 'Success', description: 'Budget updated successfully.' })
      router.push('/projects/budget')
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err && (err as { response?: { data?: { message?: string } } }).response?.data?.message
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Failed to update budget.'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (error || (!isLoading && !budget)) {
    return (
      <div className="space-y-6">
        <ProjectsPageHeader title="Edit Budget" description="Budget not found" breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: 'Budget', href: '/projects/budget' }, { label: 'Edit' }]} actions={<Link href="/projects/budget"><Button variant="outline">Back to list</Button></Link>} />
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Budget not found or you do not have access.</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/projects/budget">Back to list</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const raw = budget as { data?: { budget?: Budget }; budget?: Budget } | undefined
  const b = raw?.data?.budget ?? (raw as Budget | undefined)
  const isDraft = b?.status === 'draft'

  return (
    <div className="space-y-6">
      <ProjectsPageHeader
        title="Edit Budget"
        description={isDraft ? 'Update draft budget details and lines' : 'Only draft budgets can be edited. Create a revision from an approved budget.'}
        breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: 'Budget', href: '/projects/budget' }, { label: 'Edit' }]}
        actions={
          <Link href="/projects/budget">
            <Button variant="outline">Back to list</Button>
          </Link>
        }
      />

      {isLoading || !initialized ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Loading budget...</p>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wallet className="h-5 w-5" />
                Edit Budget
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" required>Budget name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. FY 2024 Operational Budget"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                {b?.fiscal_year && (
                  <div className="space-y-2">
                    <Label>Fiscal year</Label>
                    <Input value={typeof b.fiscal_year === 'object' ? (b.fiscal_year as { name?: string }).name : ''} readOnly className="bg-muted" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the budget"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {b?.budget_format_template && (b.budget_format_template as { column_definition?: Record<string, unknown> }).column_definition != null && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Format in use</p>
                  <BudgetFormatPreview
                    columnDefinition={(b.budget_format_template as { column_definition?: Record<string, unknown> }).column_definition}
                    formatName={(b.budget_format_template as { name?: string }).name}
                    formatCode={(b.budget_format_template as { code?: string }).code}
                    structureType={(b.budget_format_template as { structure_type?: string }).structure_type}
                    variant="full"
                    className="border-0 bg-background"
                  />
                </div>
              )}

              {isDraft && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label required>Budget lines</Label>
                      <div className="flex items-center gap-2">
                        {formatCode(b) === 'unicef_her' && (
                          <>
                            <input
                              id="budget-edit-import-excel"
                              type="file"
                              accept=".xlsx,.xls"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                try {
                                  const { rows } = await parseBudgetExcel(file, 'unicef_her')
                                  if (rows.length === 0) {
                                    toast({ title: 'No data', description: 'No valid rows found in the file.', variant: 'destructive' })
                                    return
                                  }
                                  setUnicefLines(rows.map((r) => ({
                                    ...emptyUnicefLine,
                                    section_code: String(r.section_code ?? ''),
                                    item_description: String(r.item_description ?? ''),
                                    cso_contribution: Number(r.cso_contribution) || 0,
                                    unicef_contribution: Number(r.unicef_contribution) || 0,
                                    q1_amount: Number(r.q1_amount) || 0,
                                    q2_amount: Number(r.q2_amount) || 0,
                                    q3_amount: Number(r.q3_amount) || 0,
                                    q4_amount: Number(r.q4_amount) || 0,
                                    remark: String(r.remark ?? ''),
                                    description: String(r.item_description ?? ''),
                                  })))
                                  toast({ title: 'Imported', description: `${rows.length} rows imported from Excel.` })
                                } catch {
                                  toast({ title: 'Import failed', description: 'Could not parse the Excel file.', variant: 'destructive' })
                                }
                                e.target.value = ''
                              }}
                            />
                            <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('budget-edit-import-excel')?.click()}>
                              <Upload className="h-4 w-4 mr-1" />
                              Import from Excel
                            </Button>
                          </>
                        )}
                        {formatCode(b) === 'unfpa_who' && (
                          <>
                            <input
                              id="budget-edit-import-unfpa"
                              type="file"
                              accept=".xlsx,.xls"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                try {
                                  const { rows } = await parseBudgetExcel(file, 'unfpa_who')
                                  if (rows.length === 0) {
                                    toast({ title: 'No data', description: 'No valid rows found in the file.', variant: 'destructive' })
                                    return
                                  }
                                  setUnfpaLines(rows.map((r) => ({
                                    ...emptyUnfpaLine,
                                    category_code: String(r.category_code ?? ''),
                                    budget_line_description: String(r.budget_line_description ?? ''),
                                    quantity: Number(r.quantity) || 0,
                                    unit_cost: Number(r.unit_cost) || 0,
                                    cost_pct: Number(r.cost_pct) ?? 100,
                                    q1_amount: Number(r.q1_amount) || 0,
                                    q2_amount: Number(r.q2_amount) || 0,
                                    q3_amount: Number(r.q3_amount) || 0,
                                    q4_amount: Number(r.q4_amount) || 0,
                                    duration_recurrence: String(r.duration_recurrence ?? ''),
                                    remarks: String(r.remarks ?? ''),
                                    description: String(r.budget_line_description ?? ''),
                                  })))
                                  toast({ title: 'Imported', description: `${rows.length} rows imported from Excel.` })
                                } catch {
                                  toast({ title: 'Import failed', description: 'Could not parse the Excel file.', variant: 'destructive' })
                                }
                                e.target.value = ''
                              }}
                            />
                            <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('budget-edit-import-unfpa')?.click()}>
                              <Upload className="h-4 w-4 mr-1" />
                              Import from Excel
                            </Button>
                          </>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={
                            formatCode(b) === 'unicef_her'
                              ? addUnicefLine
                              : formatCode(b) === 'unfpa_who'
                                ? addUnfpaLine
                                : addLine
                          }
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add line
                        </Button>
                      </div>
                    </div>

                    {formatCode(b) === 'unicef_her' && (
                      <div className="rounded-md border overflow-x-auto">
                        <table className="w-full text-sm min-w-[900px]">
                          <thead>
                            <tr className="border-b bg-muted/50 uppercase tracking-wider">
                              <th className="text-left p-2 font-medium w-20">Section</th>
                              <th className="text-left p-2 font-medium">Item description</th>
                              <th className="text-left p-2 font-medium w-28">Account</th>
                              <th className="text-right p-2 font-medium w-24">CSO</th>
                              <th className="text-right p-2 font-medium w-24">UNICEF</th>
                              <th className="text-right p-2 font-medium w-20">Q1</th>
                              <th className="text-right p-2 font-medium w-20">Q2</th>
                              <th className="text-right p-2 font-medium w-20">Q3</th>
                              <th className="text-right p-2 font-medium w-20">Q4</th>
                              <th className="w-10 p-2" />
                            </tr>
                          </thead>
                          <tbody>
                            {unicefLines.map((line, i) => (
                              <tr key={i} className="border-b">
                                <td className="p-2">
                                  <Select value={line.section_code} onValueChange={(v) => updateUnicefLine(i, 'section_code', v)}>
                                    <SelectTrigger className="h-9">
                                      <SelectValue placeholder="-" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {UNICEF_SECTIONS.map((s) => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="p-2">
                                  <Input className="h-9" placeholder="Item description" value={line.item_description} onChange={(e) => updateUnicefLine(i, 'item_description', e.target.value)} />
                                </td>
                                <td className="p-2">
                                  <Select value={line.account_id?.toString() ?? ''} onValueChange={(v) => updateUnicefLine(i, 'account_id', v ? parseInt(v, 10) : null)}>
                                    <SelectTrigger className="h-9">
                                      <SelectValue placeholder="Account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {accounts.map((a) => (
                                        <SelectItem key={a.id} value={String(a.id)}>{a.account_code}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="p-2">
                                  <Input type="number" min={0} step={0.01} className="h-9 text-right" value={line.cso_contribution || ''} onChange={(e) => updateUnicefLine(i, 'cso_contribution', parseFloat(e.target.value) || 0)} />
                                </td>
                                <td className="p-2">
                                  <Input type="number" min={0} step={0.01} className="h-9 text-right" value={line.unicef_contribution || ''} onChange={(e) => updateUnicefLine(i, 'unicef_contribution', parseFloat(e.target.value) || 0)} />
                                </td>
                                <td className="p-2">
                                  <Input type="number" min={0} step={0.01} className="h-9 text-right w-20" value={line.q1_amount || ''} onChange={(e) => updateUnicefLine(i, 'q1_amount', parseFloat(e.target.value) || 0)} />
                                </td>
                                <td className="p-2">
                                  <Input type="number" min={0} step={0.01} className="h-9 text-right w-20" value={line.q2_amount || ''} onChange={(e) => updateUnicefLine(i, 'q2_amount', parseFloat(e.target.value) || 0)} />
                                </td>
                                <td className="p-2">
                                  <Input type="number" min={0} step={0.01} className="h-9 text-right w-20" value={line.q3_amount || ''} onChange={(e) => updateUnicefLine(i, 'q3_amount', parseFloat(e.target.value) || 0)} />
                                </td>
                                <td className="p-2">
                                  <Input type="number" min={0} step={0.01} className="h-9 text-right w-20" value={line.q4_amount || ''} onChange={(e) => updateUnicefLine(i, 'q4_amount', parseFloat(e.target.value) || 0)} />
                                </td>
                                <td className="p-2">
                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeUnicefLine(i)} disabled={unicefLines.length <= 1}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {formatCode(b) === 'unfpa_who' && (
                      <div className="rounded-md border overflow-x-auto">
                        <table className="w-full text-sm min-w-[950px]">
                          <thead>
                            <tr className="border-b bg-muted/50 uppercase tracking-wider">
                              <th className="text-left p-2 font-medium w-16">Code</th>
                              <th className="text-left p-2 font-medium">Budget line description</th>
                              <th className="text-left p-2 font-medium w-28">Account</th>
                              <th className="text-right p-2 font-medium w-16">Qty</th>
                              <th className="text-right p-2 font-medium w-20">Unit cost</th>
                              <th className="text-right p-2 font-medium w-16">%</th>
                              <th className="text-right p-2 font-medium w-20">Q1</th>
                              <th className="text-right p-2 font-medium w-20">Q2</th>
                              <th className="text-right p-2 font-medium w-20">Q3</th>
                              <th className="text-right p-2 font-medium w-20">Q4</th>
                              <th className="w-10 p-2" />
                            </tr>
                          </thead>
                          <tbody>
                            {unfpaLines.map((line, i) => (
                              <tr key={i} className="border-b">
                                <td className="p-2">
                                  <Select value={line.category_code} onValueChange={(v) => updateUnfpaLine(i, 'category_code', v)}>
                                    <SelectTrigger className="h-9">
                                      <SelectValue placeholder="-" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {WHO_CATEGORIES.map((c) => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="p-2">
                                  <Input className="h-9" placeholder="Budget line description" value={line.budget_line_description} onChange={(e) => updateUnfpaLine(i, 'budget_line_description', e.target.value)} />
                                </td>
                                <td className="p-2">
                                  <Select value={line.account_id?.toString() ?? ''} onValueChange={(v) => updateUnfpaLine(i, 'account_id', v ? parseInt(v, 10) : null)}>
                                    <SelectTrigger className="h-9">
                                      <SelectValue placeholder="Account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {accounts.map((a) => (
                                        <SelectItem key={a.id} value={String(a.id)}>{a.account_code}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="p-2">
                                  <Input type="number" min={0} step={0.01} className="h-9 text-right" value={line.quantity || ''} onChange={(e) => updateUnfpaLine(i, 'quantity', parseFloat(e.target.value) || 0)} />
                                </td>
                                <td className="p-2">
                                  <Input type="number" min={0} step={0.01} className="h-9 text-right" value={line.unit_cost || ''} onChange={(e) => updateUnfpaLine(i, 'unit_cost', parseFloat(e.target.value) || 0)} />
                                </td>
                                <td className="p-2">
                                  <Input type="number" min={0} max={100} step={0.01} className="h-9 text-right w-14" value={line.cost_pct ?? 100} onChange={(e) => updateUnfpaLine(i, 'cost_pct', parseFloat(e.target.value) || 100)} />
                                </td>
                                <td className="p-2">
                                  <Input type="number" min={0} step={0.01} className="h-9 text-right w-20" value={line.q1_amount || ''} onChange={(e) => updateUnfpaLine(i, 'q1_amount', parseFloat(e.target.value) || 0)} />
                                </td>
                                <td className="p-2">
                                  <Input type="number" min={0} step={0.01} className="h-9 text-right w-20" value={line.q2_amount || ''} onChange={(e) => updateUnfpaLine(i, 'q2_amount', parseFloat(e.target.value) || 0)} />
                                </td>
                                <td className="p-2">
                                  <Input type="number" min={0} step={0.01} className="h-9 text-right w-20" value={line.q3_amount || ''} onChange={(e) => updateUnfpaLine(i, 'q3_amount', parseFloat(e.target.value) || 0)} />
                                </td>
                                <td className="p-2">
                                  <Input type="number" min={0} step={0.01} className="h-9 text-right w-20" value={line.q4_amount || ''} onChange={(e) => updateUnfpaLine(i, 'q4_amount', parseFloat(e.target.value) || 0)} />
                                </td>
                                <td className="p-2">
                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeUnfpaLine(i)} disabled={unfpaLines.length <= 1}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {(formatCode(b) === 'legacy' || !['unicef_her', 'unfpa_who'].includes(formatCode(b))) && (
                      <div className="rounded-md border overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50 uppercase tracking-wider">
                              <th className="text-left p-2 font-medium">Account</th>
                              <th className="text-left p-2 font-medium">Description</th>
                              <th className="text-right p-2 font-medium w-24">Q1</th>
                              <th className="text-right p-2 font-medium w-24">Q2</th>
                              <th className="text-right p-2 font-medium w-24">Q3</th>
                              <th className="text-right p-2 font-medium w-24">Q4</th>
                              <th className="w-10 p-2" />
                            </tr>
                          </thead>
                          <tbody>
                            {lines.map((line, index) => (
                              <tr key={index} className="border-b">
                                <td className="p-2">
                                  <Select value={line.account_id?.toString() ?? ''} onValueChange={(v) => updateLine(index, 'account_id', v ? parseInt(v, 10) : null)}>
                                    <SelectTrigger className="h-9">
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {accounts.map((a) => (
                                        <SelectItem key={a.id} value={String(a.id)}>{a.account_code} – {a.account_name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="p-2">
                                  <Input className="h-9" placeholder="Description" value={line.description} onChange={(e) => updateLine(index, 'description', e.target.value)} />
                                </td>
                                <td className="p-2">
                                  <Input type="number" min={0} step={0.01} className="h-9 text-right" value={line.q1_amount || ''} onChange={(e) => updateLine(index, 'q1_amount', parseFloat(e.target.value) || 0)} />
                                </td>
                                <td className="p-2">
                                  <Input type="number" min={0} step={0.01} className="h-9 text-right" value={line.q2_amount || ''} onChange={(e) => updateLine(index, 'q2_amount', parseFloat(e.target.value) || 0)} />
                                </td>
                                <td className="p-2">
                                  <Input type="number" min={0} step={0.01} className="h-9 text-right" value={line.q3_amount || ''} onChange={(e) => updateLine(index, 'q3_amount', parseFloat(e.target.value) || 0)} />
                                </td>
                                <td className="p-2">
                                  <Input type="number" min={0} step={0.01} className="h-9 text-right" value={line.q4_amount || ''} onChange={(e) => updateLine(index, 'q4_amount', parseFloat(e.target.value) || 0)} />
                                </td>
                                <td className="p-2">
                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeLine(index)} disabled={lines.length <= 1}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button type="submit" disabled={saving}>
                      {saving ? 'Saving...' : 'Save changes'}
                    </Button>
                    <Button type="button" variant="outline" asChild>
                      <Link href="/projects/budget">Cancel</Link>
                    </Button>
                    <Button type="button" variant="outline" asChild>
                      <Link href={`/projects/budget/inquiry?id=${id}`}>View details</Link>
                    </Button>
                  </div>
                </>
              )}

              {!isDraft && b && (
                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" asChild>
                    <Link href={`/projects/budget/inquiry?id=${id}`}>View details</Link>
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href="/projects/budget">Back to list</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  )
}
