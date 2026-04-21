'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Wallet, Plus, Trash2, Upload, FileSpreadsheet, Building2, Check } from 'lucide-react'
import Link from 'next/link'
import { createBudget, BudgetFormData, getBudgetFormatTemplates, getBudgetFormatTemplate, getSuggestedBudgetFormat, parseBudgetExcel } from '@/lib/api/budgets'
import { getFiscalYears } from '@/lib/api/fiscal'
import { getOffices } from '@/lib/api/offices'
import { getProjects } from '@/lib/api/projects'
import { getFunds } from '@/lib/api/funds'
import { getAccounts } from '@/lib/api/chart-of-accounts'
import { useToast } from '@/components/ui/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CurrencySelect } from '@/components/ui/currency-select'
import { Badge } from '@/components/ui/badge'
import { BudgetFormatPreview } from '@/components/budget/BudgetFormatPreview'
import { ProjectsPageHeader } from '@/components/projects/PageHeader'
import { cn } from '@/lib/utils'

interface BudgetLineRow {
  account_id: number | null
  description: string
  q1_amount: number
  q2_amount: number
  q3_amount: number
  q4_amount: number
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

const STRUCTURE_TYPE_LABELS: Record<string, string> = {
  account_based: 'Account based',
  donor_code_based: 'Donor code based',
  activity_based: 'Activity based',
  hybrid: 'Hybrid',
}

export default function AddBudgetPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [fiscalYearId, setFiscalYearId] = useState<number | null>(null)
  const [officeId, setOfficeId] = useState<number | null>(null)
  const [projectId, setProjectId] = useState<number | null>(null)
  const [fundId, setFundId] = useState<number | null>(null)
  const [formatTemplateId, setFormatTemplateId] = useState<number | null>(null)
  const [grantId, setGrantId] = useState<number | null>(null)
  const [budgetType, setBudgetType] = useState<BudgetFormData['budget_type']>('operational')
  const [currency, setCurrency] = useState('USD')
  const [description, setDescription] = useState('')
  const [lines, setLines] = useState<BudgetLineRow[]>([{ ...emptyLine }])
  const [unicefLines, setUnicefLines] = useState<UnicefHerLineRow[]>([{ ...emptyUnicefLine }])
  const [unfpaLines, setUnfpaLines] = useState<UnfpaWhoLineRow[]>([{ ...emptyUnfpaLine }])

  const { data: fyData } = useQuery({
    queryKey: ['fiscal-years'],
    queryFn: () => getFiscalYears({}),
  })
  const fiscalYears = Array.isArray(fyData) ? fyData : []

  const { data: officesData } = useQuery({
    queryKey: ['offices-list'],
    queryFn: () => getOffices(),
  })
  const offices = (Array.isArray(officesData) ? officesData : []) as { id: number; name: string; code: string }[]

  const { data: projectsData } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => getProjects({ per_page: 100 }),
  })
  const projects = (projectsData?.data ?? []) as { id: number; project_code: string; project_name: string }[]

  const { data: fundsData } = useQuery({
    queryKey: ['funds-list'],
    queryFn: () => getFunds({ per_page: 100 }),
  })
  const funds = (fundsData?.data ?? []) as { id: number; fund_code: string; fund_name: string }[]

  const { data: accountsData } = useQuery({
    queryKey: ['accounts-list'],
    queryFn: () => getAccounts({ per_page: 200, posting_only: true }),
  })
  const accounts = (accountsData?.data ?? []) as { id: number; account_code: string; account_name: string }[]

  const { data: formatsData } = useQuery({
    queryKey: ['budget-format-templates', 'with-donor'],
    queryFn: () => getBudgetFormatTemplates({ withDonor: true }),
  })
  const formatTemplates = (formatsData ?? []) as {
    id: number
    name: string
    code: string
    structure_type?: string
    donor?: { id: number; code: string; name: string } | null
  }[]

  const { data: suggestedData } = useQuery({
    queryKey: ['suggested-budget-format', projectId],
    queryFn: () => getSuggestedBudgetFormat(projectId!),
    enabled: !!projectId,
  })

  const { data: selectedFormatDetail } = useQuery({
    queryKey: ['budget-format-template', formatTemplateId],
    queryFn: () => getBudgetFormatTemplate(formatTemplateId!),
    enabled: !!formatTemplateId && formatTemplateId > 0,
  })
  const formatDetail = selectedFormatDetail

  React.useEffect(() => {
    if (suggestedData?.data?.suggested_format) {
      const fmt = suggestedData.data.suggested_format
      setFormatTemplateId(fmt.id)
      if (suggestedData.data.grant_id) setGrantId(suggestedData.data.grant_id)
    } else if (!projectId) {
      const legacy = formatTemplates.find((f) => f.code === 'legacy')
      if (legacy) setFormatTemplateId(legacy.id)
      setGrantId(null)
    }
  }, [suggestedData, projectId, formatTemplates])

  const selectedFormat = formatTemplates.find((f) => f.id === formatTemplateId)
  const selectedFormatCode = selectedFormat?.code ?? 'legacy'

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

  const buildSubmitLines = (): BudgetFormData['lines'] => {
    if (selectedFormatCode === 'unicef_her') {
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
          sheet_key: null,
          q1_amount: Number(l.q1_amount) || 0,
          q2_amount: Number(l.q2_amount) || 0,
          q3_amount: Number(l.q3_amount) || 0,
          q4_amount: Number(l.q4_amount) || 0,
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
    if (selectedFormatCode === 'unfpa_who') {
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
          sheet_key: null,
          q1_amount: qSplit ?? (Number(l.q1_amount) || 0),
          q2_amount: qSplit ?? (Number(l.q2_amount) || 0),
          q3_amount: qSplit ?? (Number(l.q3_amount) || 0),
          q4_amount: qSplit ?? (Number(l.q4_amount) || 0),
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
    const valid = lines.filter((l) => l.account_id != null && l.description.trim() && (l.q1_amount + l.q2_amount + l.q3_amount + l.q4_amount) > 0)
    return valid.map((l) => ({
      account_id: l.account_id!,
      description: l.description.trim(),
      sheet_key: null,
      q1_amount: Number(l.q1_amount) || 0,
      q2_amount: Number(l.q2_amount) || 0,
      q3_amount: Number(l.q3_amount) || 0,
      q4_amount: Number(l.q4_amount) || 0,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !fiscalYearId) {
      toast({ title: 'Validation', description: 'Please enter budget name and select fiscal year.', variant: 'destructive' })
      return
    }
    const submitLines = buildSubmitLines()
    if (submitLines.length === 0) {
      toast({ title: 'Validation', description: 'Add at least one budget line with account, description, and amounts.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await createBudget({
        name: name.trim(),
        fiscal_year_id: fiscalYearId,
        office_id: officeId ?? undefined,
        project_id: projectId ?? undefined,
        fund_id: fundId ?? undefined,
        budget_format_template_id: formatTemplateId ?? undefined,
        grant_id: grantId ?? undefined,
        budget_type: budgetType,
        currency,
        description: description.trim() || undefined,
        lines: submitLines,
      })
      toast({ title: 'Success', description: 'Budget saved as draft. You can edit and submit for approval from the budget list.' })
      router.push('/projects/budget')
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err && (err as { response?: { data?: { message?: string } } }).response?.data?.message
        ? (err as { response: { data: { message: string } } }).response.data.message
        : 'Failed to create budget.'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <ProjectsPageHeader
        title="Budget register"
        description="Create an operational or project budget. Save as draft to edit and submit for approval later."
        breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: 'Budget', href: '/projects/budget' }, { label: 'Register' }]}
        actions={
          <Link href="/projects/budget">
            <Button variant="outline">Back to list</Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5" />
              New Budget
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
              <div className="space-y-2">
                <Label htmlFor="fiscal_year" required>Fiscal year</Label>
                <Select value={fiscalYearId?.toString() ?? ''} onValueChange={(v) => setFiscalYearId(parseInt(v, 10))} required>
                  <SelectTrigger id="fiscal_year">
                    <SelectValue placeholder="Select fiscal year" />
                  </SelectTrigger>
                  <SelectContent>
                    {fiscalYears.map((fy: { id: number; name: string }) => (
                      <SelectItem key={fy.id} value={String(fy.id)}>{fy.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label required>Budget type</Label>
                <Select value={budgetType} onValueChange={(v) => setBudgetType(v as BudgetFormData['budget_type'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="departmental">Departmental</SelectItem>
                    <SelectItem value="consolidated">Consolidated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label required>Currency</Label>
                <CurrencySelect value={currency} onChange={setCurrency} placeholder="Currency" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Office</Label>
                <Select value={officeId?.toString() ?? 'none'} onValueChange={(v) => setOfficeId(v === 'none' ? null : parseInt(v, 10))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {offices.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={projectId?.toString() ?? 'none'} onValueChange={(v) => setProjectId(v === 'none' ? null : parseInt(v, 10))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.project_name} ({p.project_code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Budget template</Label>
              <p className="text-xs text-muted-foreground">
                Choose a format template for this budget. The template defines which columns and sheets you will fill in. A suggestion may appear when a project with a donor is selected.
              </p>
              <div className="space-y-4">
                {/* Legacy / No template option */}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setFormatTemplateId(null)}
                    className={cn(
                      'flex flex-col items-start rounded-lg border-2 p-4 text-left min-w-[180px] transition-all hover:border-primary/50 hover:bg-muted/30',
                      formatTemplateId == null
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-slate-200 bg-card dark:border-slate-700'
                    )}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      {formatTemplateId == null && <Check className="h-4 w-4 text-primary shrink-0" />}
                      Legacy
                    </span>
                    <span className="text-xs text-muted-foreground mt-0.5">No template — basic account + Q1–Q4</span>
                  </button>

                  {/* General templates */}
                  {(() => {
                    const general = formatTemplates.filter((f) => !f.donor)
                    if (general.length === 0) return null
                    return (
                      <div className="flex flex-wrap gap-3">
                        {general.map((f) => {
                          const isSuggested = suggestedData?.data?.suggested_format?.id === f.id
                          const selected = formatTemplateId === f.id
                          return (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => setFormatTemplateId(f.id)}
                              className={cn(
                                'flex flex-col items-start rounded-lg border-2 p-4 text-left min-w-[180px] transition-all hover:border-primary/50 hover:bg-muted/30',
                                selected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-slate-200 bg-card dark:border-slate-700'
                              )}
                            >
                              <span className="flex items-center gap-2 font-medium">
                                {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
                                <FileSpreadsheet className="h-4 w-4 text-slate-500 shrink-0" />
                                {f.name}
                              </span>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                <Badge variant="secondary" className="text-[10px] font-mono">{f.code}</Badge>
                                {isSuggested && (
                                  <Badge variant="default" className="text-[10px]">Suggested</Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground mt-1">
                                {STRUCTURE_TYPE_LABELS[f.structure_type ?? ''] ?? f.structure_type ?? '—'}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )
                  })()}

                  {/* By donor */}
                  {(() => {
                    const withDonor = formatTemplates.filter((f) => f.donor)
                    const donorIds = [...new Set(withDonor.map((f) => f.donor!.id))].sort((a, b) => {
                      const nameA = withDonor.find((f) => f.donor?.id === a)?.donor?.name ?? ''
                      const nameB = withDonor.find((f) => f.donor?.id === b)?.donor?.name ?? ''
                      return nameA.localeCompare(nameB)
                    })
                    return donorIds.map((donorId) => {
                      const donor = withDonor.find((f) => f.donor?.id === donorId)?.donor
                      const list = withDonor.filter((f) => f.donor?.id === donorId)
                      if (!donor || list.length === 0) return null
                      return (
                        <div key={donorId} className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                            <Building2 className="h-4 w-4 text-slate-500" />
                            {donor.name}
                            <Badge variant="outline" className="text-xs font-mono font-normal">{donor.code}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {list.map((f) => {
                              const isSuggested = suggestedData?.data?.suggested_format?.id === f.id
                              const selected = formatTemplateId === f.id
                              return (
                                <button
                                  key={f.id}
                                  type="button"
                                  onClick={() => setFormatTemplateId(f.id)}
                                  className={cn(
                                    'flex flex-col items-start rounded-lg border-2 p-4 text-left min-w-[180px] transition-all hover:border-primary/50 hover:bg-muted/30',
                                    selected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-slate-200 bg-card dark:border-slate-700'
                                  )}
                                >
                                  <span className="flex items-center gap-2 font-medium">
                                    {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
                                    <FileSpreadsheet className="h-4 w-4 text-slate-500 shrink-0" />
                                    {f.name}
                                  </span>
                                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                    <Badge variant="secondary" className="text-[10px] font-mono">{f.code}</Badge>
                                    {isSuggested && (
                                      <Badge variant="default" className="text-[10px]">Suggested</Badge>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground mt-1">
                                    {STRUCTURE_TYPE_LABELS[f.structure_type ?? ''] ?? f.structure_type ?? '—'}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>

              {formatDetail && (formatDetail as { column_definition?: Record<string, unknown> }).column_definition != null && (
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-900/30">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Format preview</p>
                  <BudgetFormatPreview
                    columnDefinition={(formatDetail as { column_definition?: Record<string, unknown> }).column_definition}
                    formatName={formatDetail.name}
                    formatCode={formatDetail.code}
                    structureType={(formatDetail as { structure_type?: string }).structure_type}
                    variant="full"
                    className="border-0 bg-background"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Fund (optional)</Label>
              <Select value={fundId?.toString() ?? 'none'} onValueChange={(v) => setFundId(v === 'none' ? null : parseInt(v, 10))}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {funds.map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>{f.fund_name} ({f.fund_code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label required>Budget lines</Label>
                <div className="flex items-center gap-2">
                  {(selectedFormatCode === 'unicef_her' || selectedFormatCode === 'unfpa_who') && (
                    <>
                      <input
                        id="budget-import-excel"
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          try {
                            const { rows } = await parseBudgetExcel(file, selectedFormatCode as 'unicef_her' | 'unfpa_who')
                            if (rows.length === 0) {
                              toast({ title: 'No data', description: 'No valid rows found in the file.', variant: 'destructive' })
                              return
                            }
                            if (selectedFormatCode === 'unicef_her') {
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
                            } else {
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
                            }
                            toast({ title: 'Imported', description: `${rows.length} rows imported from Excel.` })
                          } catch {
                            toast({ title: 'Import failed', description: 'Could not parse the Excel file.', variant: 'destructive' })
                          }
                          e.target.value = ''
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('budget-import-excel')?.click()}
                      >
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
                      selectedFormatCode === 'unicef_her' ? addUnicefLine : selectedFormatCode === 'unfpa_who' ? addUnfpaLine : addLine
                    }
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add line
                  </Button>
                </div>
              </div>

              {selectedFormatCode === 'unicef_her' && (
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
                            <Input
                              className="h-9"
                              placeholder="Item description"
                              value={line.item_description}
                              onChange={(e) => updateUnicefLine(i, 'item_description', e.target.value)}
                            />
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
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              className="h-9 text-right"
                              value={line.cso_contribution || ''}
                              onChange={(e) => updateUnicefLine(i, 'cso_contribution', parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              className="h-9 text-right"
                              value={line.unicef_contribution || ''}
                              onChange={(e) => updateUnicefLine(i, 'unicef_contribution', parseFloat(e.target.value) || 0)}
                            />
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

              {selectedFormatCode === 'unfpa_who' && (
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
                            <Input
                              className="h-9"
                              placeholder="Budget line description"
                              value={line.budget_line_description}
                              onChange={(e) => updateUnfpaLine(i, 'budget_line_description', e.target.value)}
                            />
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

              {(selectedFormatCode === 'legacy' || !['unicef_her', 'unfpa_who'].includes(selectedFormatCode)) && (
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
                {saving ? 'Saving...' : 'Save as draft'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/projects/budget">Cancel</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
