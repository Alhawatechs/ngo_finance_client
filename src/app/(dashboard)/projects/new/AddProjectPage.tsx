'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { CurrencySelect } from '@/components/ui/currency-select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Upload, FileText, Plus, X, FileWarning } from 'lucide-react'
import { DocumentFileIcon } from '@/components/ui/document-file-icon'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useOfficeOptional } from '@/contexts/OfficeContext'
import { useOrganizationStore } from '@/stores/organizationStore'
import { useOrganizationSectors } from '@/hooks/useOrganizationSectors'
import { FinancePageHeader } from '@/components/finance/PageHeader'
import {
  createProject,
  createGrant,
  getGrants,
  uploadGrantDocument,
  ProjectFormData,
  GrantFormData,
  type GrantDocumentType,
} from '@/lib/api/projects'
import { getOffices } from '@/lib/api/offices'
import { getDonors } from '@/lib/api/donors'
import { DOC_UPLOAD_ACCEPT, validateDocumentUploadFile } from '@/lib/projects-constants'
import { ProjectsPageLayout } from '../ProjectsPageLayout'
import '../project-form-controls.css'

const CONTRACT_DOC_ACCEPT = DOC_UPLOAD_ACCEPT
const validateContractFile = validateDocumentUploadFile

/** Add Project page - standalone form with Save as draft and Save buttons */
export function AddProjectPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isRegisterRoute = pathname?.includes('/register')
  const isAmendmentMode = searchParams.get('mode') === 'amendment'
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const officeContext = useOfficeOptional()
  const organization = useOrganizationStore((s) => s.organization)
  const { sectors: sectorOptions } = useOrganizationSectors()
  const projectListLabel = (organization?.short_name || organization?.name) ? `${organization.short_name || organization.name}'s Project List` : 'Project Portfolio'
  const defaultOfficeId = officeContext?.officeId ?? 1

  const [projectForm, setProjectForm] = useState<ProjectFormData>({
    grant_id: 0,
    office_id: defaultOfficeId,
    project_code: '',
    project_name: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    total_budget: 0,
    currency: 'USD',
    sector: '',
    location: '',
    locations: [],
    status: 'draft',
  })
  const [contractMode, setContractMode] = useState<'new' | 'existing'>(isAmendmentMode ? 'existing' : 'new')
  useEffect(() => {
    setContractMode(isAmendmentMode ? 'existing' : 'new')
  }, [isAmendmentMode])
  useEffect(() => {
    if (isRegisterRoute) setContractMode('new')
  }, [isRegisterRoute])
  const [selectedDonorId, setSelectedDonorId] = useState<number>(0)
  const [hasPartner, setHasPartner] = useState(false)
  const [newContractForm, setNewContractForm] = useState<Partial<GrantFormData>>({
    grant_code: '',
    grant_name: '',
    description: '',
    start_date: '',
    end_date: '',
    total_amount: 0,
    currency: 'USD',
    grant_type: 'restricted',
    donor_contribution_amount: undefined,
    partner_contribution_amount: undefined,
    partner_name: '',
    partner_details: '',
    sub_partner_allocation_amount: undefined,
    our_budget: undefined,
  })
  const [partnerForm, setPartnerForm] = useState({
    abbr: '',
    start_date: '',
    end_date: '',
    contract_type: 'subgrant',
    description: '',
  })
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [contractFileTitle, setContractFileTitle] = useState('')
  const [contractFileError, setContractFileError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [projectLocationInput, setProjectLocationInput] = useState('')
  const [contractFileDocType, setContractFileDocType] = useState<GrantDocumentType>('contract')
  const [attachments, setAttachments] = useState<{ file: File; title: string; documentType: GrantDocumentType }[]>([])
  const contractFileInputRef = useRef<HTMLInputElement>(null)
  const attachmentsInputRef = useRef<HTMLInputElement>(null)

  const { data: donorsData } = useQuery({
    queryKey: ['donors-list'],
    queryFn: () => getDonors({ per_page: 200 }),
  })
  const { data: officesData } = useQuery({
    queryKey: ['offices-list'],
    queryFn: () => getOffices({ is_active: true }),
  })
  const { data: grantsData } = useQuery({
    queryKey: ['grants-list'],
    queryFn: () => getGrants({ per_page: 200 }),
    staleTime: 10 * 60 * 1000,
  })

  const rawDonors = donorsData?.data ?? (Array.isArray(donorsData) ? donorsData : null)
  const rawGrants = grantsData?.data ?? (Array.isArray(grantsData) ? grantsData : null)
  const allGrants: { id: number; grant_code: string; grant_name: string; donor_id: number; start_date: string; end_date: string; total_amount: number; currency: string }[] = Array.isArray(rawGrants) ? rawGrants : []
  const grantsFiltered = selectedDonorId > 0 ? allGrants.filter((g) => g.donor_id === selectedDonorId) : allGrants
  const donors: { id: number; name: string; code?: string }[] = Array.isArray(rawDonors) ? rawDonors : []
  const rawOffices = Array.isArray(officesData) ? officesData : null
  const offices: { id: number; name: string; code: string }[] = Array.isArray(rawOffices) ? rawOffices : []
  const defaultOffice = offices.length > 0 ? (offices.some((o) => o.id === defaultOfficeId) ? defaultOfficeId : offices[0].id) : defaultOfficeId

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['projects-summary'] })
      queryClient.invalidateQueries({ queryKey: ['grants-list'] })
      toast({ title: 'Project Created', description: 'The project has been saved and appears in the project portfolio.' })
      router.push('/projects')
    },
    onError: (error: any) => {
      const data = error.response?.data
      const message = data?.message || 'Failed to create project'
      const errors = data?.errors
      const detail = errors ? Object.values(errors).flat().join(' ') : message
      toast({ title: 'Error', description: detail, variant: 'destructive' })
    },
  })

  const performSave = async (asDraft: boolean) => {
    const cf = newContractForm
    const today = new Date().toISOString().split('T')[0]
    const nextYear = new Date()
    nextYear.setFullYear(nextYear.getFullYear() + 1)
    const endDefault = nextYear.toISOString().split('T')[0]

    const donorId = selectedDonorId || cf.donor_id
    const grantCode = (cf.grant_code ?? '').trim() || `DRAFT-${Date.now()}`
    const grantName = (cf.grant_name ?? '').trim() || projectForm.project_name || 'Draft Project'
    const startDate = cf.start_date || projectForm.start_date || today
    const endDate = cf.end_date || projectForm.end_date || endDefault
    const amount = contractMode === 'new'
      ? (Number(cf.partner_contribution_amount ?? 0) + Number(cf.sub_partner_allocation_amount ?? 0) + Number(cf.our_budget ?? 0))
      : Number(cf.total_amount ?? projectForm.total_budget ?? 0)
    const currency = cf.currency || projectForm.currency || 'USD'

    if (!asDraft) {
      if (!donorId || !(cf.grant_code ?? '').trim() || !(cf.grant_name ?? '').trim()) {
        toast({ title: 'Validation', description: 'Donor, Contract code, and Contract name are required.', variant: 'destructive' })
        return
      }
      if (!(cf.start_date || projectForm.start_date) || !(cf.end_date || projectForm.end_date)) {
        toast({ title: 'Validation', description: 'Start and end dates are required.', variant: 'destructive' })
        return
      }
      if (amount < 0) {
        toast({ title: 'Validation', description: 'Budget cannot be negative.', variant: 'destructive' })
        return
      }
      if (!projectForm.office_id || !(projectForm.project_code ?? '').trim() || !(projectForm.project_name ?? '').trim()) {
        toast({ title: 'Validation', description: 'Office, Project code, and Project name are required.', variant: 'destructive' })
        return
      }
    }

    // Draft: minimal required (donor or grant for existing, plus project fields)
    const draftValid = contractMode === 'existing'
      ? (projectForm.grant_id && (projectForm.project_name ?? '').trim() && (projectForm.project_code ?? '').trim() && projectForm.office_id)
      : (donorId && (projectForm.project_name ?? '').trim() && (projectForm.project_code ?? '').trim() && projectForm.office_id)
    if (asDraft && !draftValid) {
      toast({
        title: 'Validation',
        description: contractMode === 'existing' ? 'Contract, Project name, Project code, and Office are required to save as draft.' : 'Donor, Project name, Project code, and Office are required to save as draft.',
        variant: 'destructive',
      })
      return
    }

    // Link to existing contract
    if (contractMode === 'existing') {
      if (!projectForm.grant_id) {
        toast({ title: 'Validation', description: 'Please select an existing contract.', variant: 'destructive' })
        return
      }
      const selectedGrant = allGrants.find((g) => g.id === projectForm.grant_id)
      const startDate = projectForm.start_date || selectedGrant?.start_date || today
      const endDate = projectForm.end_date || selectedGrant?.end_date || endDefault
      const amount = Number(projectForm.total_budget ?? selectedGrant?.total_amount ?? 0)
      const currency = projectForm.currency || selectedGrant?.currency || 'USD'
      if (!asDraft && (!startDate || !endDate || amount < 0)) {
        toast({ title: 'Validation', description: 'Start/end dates and budget are required.', variant: 'destructive' })
        return
      }
      const projectPayload: ProjectFormData = {
        ...projectForm,
        status: asDraft ? 'draft' : 'planning',
        start_date: startDate,
        end_date: endDate,
        total_budget: Math.max(0, amount),
        currency,
        locations: (projectForm.locations?.length ? projectForm.locations : undefined) ?? (projectForm.location ? [projectForm.location] : undefined),
      }
      createMutation.mutate(projectPayload)
      return
    }

    try {
      const grantPayload: GrantFormData = {
        donor_id: donorId!,
        grant_code: grantCode,
        grant_name: grantName,
        description: cf.description || undefined,
        start_date: startDate,
        end_date: endDate,
        total_amount: Math.max(0, amount),
        currency,
        grant_type: (cf.grant_type as GrantFormData['grant_type']) ?? 'restricted',
        donor_contribution_amount: cf.donor_contribution_amount != null ? Number(cf.donor_contribution_amount) : undefined,
        partner_contribution_amount: cf.partner_contribution_amount != null ? Number(cf.partner_contribution_amount) : undefined,
        sub_partner_allocation_amount: hasPartner && cf.sub_partner_allocation_amount != null ? Number(cf.sub_partner_allocation_amount) : undefined,
        partner_name: hasPartner ? (cf.partner_name?.trim() || undefined) : undefined,
        partner_details: hasPartner
          ? (() => {
              const parts: string[] = []
              if (partnerForm.abbr?.trim()) parts.push(`Abbr: ${partnerForm.abbr.trim()}`)
              if (partnerForm.start_date || partnerForm.end_date) parts.push(`Period: ${partnerForm.start_date || '—'} to ${partnerForm.end_date || '—'}`)
              if (partnerForm.contract_type) parts.push(`Contract type: ${partnerForm.contract_type}`)
              if (partnerForm.description?.trim()) parts.push(partnerForm.description.trim())
              return parts.length ? parts.join('\n\n') : (cf.partner_details?.trim() || undefined)
            })()
          : undefined,
      }
      const grantRes = await createGrant(grantPayload)
      const newGrantId = (grantRes as { data?: { id?: number } })?.data?.id
      if (!newGrantId) {
        toast({ title: 'Error', description: 'Contract was created but could not get ID.', variant: 'destructive' })
        return
      }

      const filesToUpload: { file: File; title: string; docType: GrantDocumentType }[] = []
      if (contractFile) filesToUpload.push({ file: contractFile, title: contractFileTitle.trim() || contractFile.name, docType: contractFileDocType })
      attachments.forEach((a) => filesToUpload.push({ file: a.file, title: a.title || a.file.name, docType: a.documentType }))
      for (let i = 0; i < filesToUpload.length; i++) {
        const { file, title, docType } = filesToUpload[i]
        setUploadProgress(Math.round(((i + 0.5) / filesToUpload.length) * 100))
        try {
          await uploadGrantDocument(newGrantId, file, title || undefined, (p) => setUploadProgress(Math.round((i / filesToUpload.length) * 100 + (p / filesToUpload.length))), docType)
        } catch {
          toast({ title: 'Contract created', description: `Upload failed for ${file.name}. You can add it later.`, variant: 'destructive' })
        }
      }
      setUploadProgress(null)

      const projectPayload: ProjectFormData = {
        ...projectForm,
        grant_id: newGrantId,
        status: asDraft ? 'draft' : 'planning',
        start_date: startDate,
        end_date: endDate,
        total_budget: Math.max(0, amount),
        currency,
        locations: (projectForm.locations?.length ? projectForm.locations : undefined) ?? (projectForm.location ? [projectForm.location] : undefined),
      }
      createMutation.mutate(projectPayload)
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err && (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast({ title: 'Error', description: (msg as string) || 'Failed to create project.', variant: 'destructive' })
    }
  }

  const handleSaveAsDraft = () => performSave(true)
  const handleSave = () => performSave(false)

  const effectiveDonorId = selectedDonorId || newContractForm.donor_id || 0
  const isSaving = createMutation.isPending || uploadProgress != null

  const canSaveAsDraft = contractMode === 'existing'
    ? (projectForm.grant_id > 0 && (projectForm.project_name ?? '').trim() !== '' && (projectForm.project_code ?? '').trim() !== '' && projectForm.office_id > 0)
    : (effectiveDonorId > 0 && (projectForm.project_name ?? '').trim() !== '' && (projectForm.project_code ?? '').trim() !== '' && projectForm.office_id > 0)

  const newContractTotal = contractMode === 'new'
    ? (Number(newContractForm.partner_contribution_amount ?? 0) + Number(newContractForm.sub_partner_allocation_amount ?? 0) + Number(newContractForm.our_budget ?? 0))
    : 0
  const canSave = contractMode === 'existing'
    ? (canSaveAsDraft &&
        (projectForm.start_date || allGrants.find((g) => g.id === projectForm.grant_id)?.start_date) &&
        (projectForm.end_date || allGrants.find((g) => g.id === projectForm.grant_id)?.end_date) &&
        (Number(projectForm.total_budget ?? allGrants.find((g) => g.id === projectForm.grant_id)?.total_amount ?? 0) >= 0) &&
        (projectForm.currency || allGrants.find((g) => g.id === projectForm.grant_id)?.currency))
    : (canSaveAsDraft &&
        (newContractForm.grant_code ?? '').trim() !== '' &&
        (newContractForm.grant_name ?? '').trim() !== '' &&
        (newContractForm.start_date || projectForm.start_date) &&
        (newContractForm.end_date || projectForm.end_date) &&
        newContractTotal >= 0 &&
        (newContractForm.currency || projectForm.currency))

  return (
    <ProjectsPageLayout>
      <div className="space-y-6">
        <FinancePageHeader
          title={isRegisterRoute ? 'Project register' : (isAmendmentMode ? 'Add Amendment' : 'Add Project')}
          description={isRegisterRoute ? 'Register a new project.' : isAmendmentMode ? 'Link a new project to an existing donor contract.' : 'Add a new project.'}
          breadcrumbs={[
            { label: projectListLabel, href: '/projects' },
            { label: isRegisterRoute ? 'Project register' : (isAmendmentMode ? 'Add Amendment' : 'Add Project') },
          ]}
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link href="/projects">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {isRegisterRoute ? 'Back to list' : 'Back to portfolio'}
              </Link>
            </Button>
          }
        />

        <Card className="border-slate-200/80 shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-6">
            <div className="project-register-amendment-form space-y-5">
              {contractMode === 'existing' ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Existing contract</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 form-field-group">
                    <Label required>Donor</Label>
                    <Select
                      value={selectedDonorId ? String(selectedDonorId) : ''}
                      onValueChange={(v) => {
                        const id = v ? parseInt(v, 10) : 0
                        setSelectedDonorId(id)
                        setProjectForm((f) => ({ ...f, grant_id: 0 }))
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select donor" />
                      </SelectTrigger>
                      <SelectContent>
                        {donors.map((d) => (
                          <SelectItem key={d.id} value={String(d.id)}>{d.name} {d.code ? `(${d.code})` : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 form-field-group">
                    <Label required>Contract</Label>
                    <Select
                      value={projectForm.grant_id > 0 ? String(projectForm.grant_id) : ''}
                      onValueChange={(v) => {
                        const id = v ? parseInt(v, 10) : 0
                        const grant = allGrants.find((g) => g.id === id)
                        setProjectForm((f) => ({
                          ...f,
                          grant_id: id,
                          start_date: grant?.start_date || f.start_date,
                          end_date: grant?.end_date || f.end_date,
                          total_budget: grant?.total_amount ?? f.total_budget,
                          currency: grant?.currency || f.currency,
                        }))
                        if (grant) setSelectedDonorId(grant.donor_id)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select contract" />
                      </SelectTrigger>
                      <SelectContent>
                        {grantsFiltered.map((g) => (
                          <SelectItem key={g.id} value={String(g.id)}>{g.grant_code} – {g.grant_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  </div>
                </div>
              ) : (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Funding & contract</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 form-field-group">
                  <Label required>Donor</Label>
                    <Select
                      value={effectiveDonorId ? String(effectiveDonorId) : ''}
                      onValueChange={(v) => {
                        const id = v ? parseInt(v, 10) : 0
                        setSelectedDonorId(id)
                        setNewContractForm((f) => ({ ...f, donor_id: id }))
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select donor" />
                      </SelectTrigger>
                      <SelectContent>
                        {donors.map((d) => (
                          <SelectItem key={d.id} value={String(d.id)}>
                            {d.name} {d.code ? `(${d.code})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5 form-field-group">
                  <Label required>Grant Code</Label>
                  <Input
                    placeholder="Grant code"
                    value={newContractForm.grant_code ?? ''}
                    onChange={(e) => setNewContractForm((f) => ({ ...f, grant_code: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5 form-field-group">
                  <Label required>Grant Name</Label>
                  <Input
                    placeholder="Contract or project name"
                    value={newContractForm.grant_name ?? ''}
                    onChange={(e) => setNewContractForm((f) => ({ ...f, grant_name: e.target.value }))}
                  />
                </div>
              </div>
              </div>
              )}

              <div className="space-y-4 pt-5 border-t border-slate-200">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Project details</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 form-field-group">
                      <Label>Sector</Label>
                      <Select value={projectForm.sector || ''} onValueChange={(v) => setProjectForm((f) => ({ ...f, sector: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select sector" />
                        </SelectTrigger>
                        <SelectContent>
                          {sectorOptions.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 form-field-group">
                      <Label required>Project Name</Label>
                      <Input
                        placeholder="Contract or project name"
                        value={projectForm.project_name ?? ''}
                        onChange={(e) => setProjectForm((f) => ({ ...f, project_name: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5 form-field-group">
                    <Label required>Project Code</Label>
                    <Input
                      placeholder="e.g. PRJ-001"
                      value={projectForm.project_code ?? ''}
                      onChange={(e) => setProjectForm((f) => ({ ...f, project_code: e.target.value.toUpperCase() }))}
                    />
                  </div>
                  <div className="space-y-1.5 form-field-group">
                    <Label required>Office</Label>
                    <Select
                      value={projectForm.office_id > 0 ? projectForm.office_id.toString() : ''}
                      onValueChange={(v) => setProjectForm((f) => ({ ...f, office_id: v ? parseInt(v, 10) : 0 }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select office" />
                      </SelectTrigger>
                      <SelectContent>
                        {offices.map((o) => (
                          <SelectItem key={o.id} value={o.id.toString()}>
                            {o.code} – {o.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 form-field-group">
                    <Label>Location</Label>
                    <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-background min-h-10">
                      {(projectForm.locations ?? []).map((loc, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-sm">
                          {loc}
                          <button
                            type="button"
                            onClick={() => setProjectForm((f) => ({ ...f, locations: (f.locations ?? []).filter((_, j) => j !== i) }))}
                            className="hover:text-destructive rounded"
                            aria-label="Remove location"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                      <input
                        className="flex-1 min-w-[120px] bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground"
                        placeholder="Add location"
                        value={projectLocationInput}
                        onChange={(e) => setProjectLocationInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault()
                            const v = (e.key === ',' ? projectLocationInput.replace(/,/g, '') : projectLocationInput).trim()
                            if (v) {
                              setProjectForm((f) => ({ ...f, locations: [...(f.locations ?? []), v] }))
                              setProjectLocationInput('')
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

              <div className="space-y-4 pt-5 border-t border-slate-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Timeline & budget</p>
                {contractMode === 'new' && (
                  <div className="space-y-1.5 form-field-group">
                    <Label>Fund type</Label>
                    <Select
                      value={newContractForm.grant_type ?? 'restricted'}
                      onValueChange={(v) => setNewContractForm((f) => ({ ...f, grant_type: v as GrantFormData['grant_type'] }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select fund type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="restricted">Restricted</SelectItem>
                        <SelectItem value="unrestricted">Unrestricted</SelectItem>
                        <SelectItem value="temporarily_restricted">Temporarily Restricted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 form-field-group">
                      <Label required>Start date</Label>
                      <DatePicker
                        value={contractMode === 'new' ? (newContractForm.start_date || projectForm.start_date || '') : (projectForm.start_date || '')}
                        onChange={(v) => {
                          const date = v ?? ''
                          if (contractMode === 'new') setNewContractForm((f) => ({ ...f, start_date: date }))
                          setProjectForm((f) => ({ ...f, start_date: date }))
                        }}
                        maxDate={projectForm.end_date || newContractForm.end_date || undefined}
                      />
                    </div>
                    <div className="space-y-1.5 form-field-group">
                      <Label required>End date</Label>
                      <DatePicker
                        value={contractMode === 'new' ? (newContractForm.end_date || projectForm.end_date || '') : (projectForm.end_date || '')}
                        onChange={(v) => {
                          const date = v ?? ''
                          if (contractMode === 'new') setNewContractForm((f) => ({ ...f, end_date: date }))
                          setProjectForm((f) => ({ ...f, end_date: date }))
                        }}
                        minDate={projectForm.start_date || newContractForm.start_date || undefined}
                      />
                    </div>
                  </div>
                  {contractMode === 'new' && (
                  <div className="space-y-2 form-field-group">
                    <Label>Sub-partner (sub-recipient)</Label>
                    <p className="text-xs text-muted-foreground form-help">When your organization is the head partner and allocates a portion of the budget to a sub-partner.</p>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="hasPartner" checked={!hasPartner} onChange={() => setHasPartner(false)} className="rounded-full" />
                        <span className="text-sm">No</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="hasPartner" checked={hasPartner} onChange={() => setHasPartner(true)} className="rounded-full" />
                        <span className="text-sm">Yes</span>
                      </label>
                    </div>
                    {hasPartner && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-4 mt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="space-y-1.5 form-field-group">
                            <Label required className="text-xs">Partner name</Label>
                            <Input
                              placeholder="Partner name"
                              value={newContractForm.partner_name ?? ''}
                              onChange={(e) => setNewContractForm((f) => ({ ...f, partner_name: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1.5 form-field-group">
                            <Label className="text-xs">Abbreviation</Label>
                            <Input
                              placeholder="Abbr"
                              value={partnerForm.abbr}
                              onChange={(e) => setPartnerForm((f) => ({ ...f, abbr: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1.5 form-field-group">
                            <Label className="text-xs">Contract type</Label>
                            <Select value={partnerForm.contract_type} onValueChange={(v) => setPartnerForm((f) => ({ ...f, contract_type: v }))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="subgrant">Sub-grant</SelectItem>
                                <SelectItem value="mou">Memorandum of Understanding</SelectItem>
                                <SelectItem value="consortium">Consortium agreement</SelectItem>
                                <SelectItem value="teaming">Teaming agreement</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5 form-field-group">
                            <Label className="text-xs">Partner start date</Label>
                            <DatePicker value={partnerForm.start_date} onChange={(v) => setPartnerForm((f) => ({ ...f, start_date: v ?? '' }))} />
                          </div>
                          <div className="space-y-1.5 form-field-group">
                            <Label className="text-xs">Partner end date</Label>
                            <DatePicker value={partnerForm.end_date} onChange={(v) => setPartnerForm((f) => ({ ...f, end_date: v ?? '' }))} />
                          </div>
                        </div>
<div className="space-y-1.5 form-field-group">
                            <Label className="text-xs">Partner role & description</Label>
                            <Textarea
                              placeholder="Partner role"
                              rows={2}
                              value={partnerForm.description}
                              onChange={(e) => setPartnerForm((f) => ({ ...f, description: e.target.value }))}
                            />
                          </div>
                        </div>
                      )}
                  </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {contractMode === 'new' ? (
                      <>
                        <div className="space-y-1.5 form-field-group">
                          <Label>Partner contribution</Label>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            placeholder="0.00"
                            value={newContractForm.partner_contribution_amount ?? ''}
                            onChange={(e) => setNewContractForm((f) => ({ ...f, partner_contribution_amount: e.target.value ? parseFloat(e.target.value) : undefined }))}
                          />
                          <p className="text-xs text-muted-foreground form-help">Organization&apos;s contribution from its own sources (e.g. contingency).</p>
                        </div>
                        {hasPartner && (
                          <div className="space-y-1.5 form-field-group">
                            <Label>Sub-partner budget</Label>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              placeholder="0.00"
                              value={newContractForm.sub_partner_allocation_amount ?? ''}
                              onChange={(e) => setNewContractForm((f) => ({ ...f, sub_partner_allocation_amount: e.target.value ? parseFloat(e.target.value) : undefined }))}
                            />
                          </div>
                        )}
                        <div className="space-y-1.5 form-field-group">
                          <Label required>Our budget</Label>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            placeholder="0.00"
                            value={newContractForm.our_budget ?? ''}
                            onChange={(e) => setNewContractForm((f) => ({ ...f, our_budget: e.target.value ? parseFloat(e.target.value) : undefined }))}
                          />
                          <p className="text-xs text-muted-foreground form-help">Amount retained by your organization for direct implementation.</p>
                        </div>
                        <div className="space-y-1.5 form-field-group">
                          <Label>Total budget</Label>
                          <p className="text-lg font-semibold tabular-nums text-slate-800 py-2">
                            {(Number(newContractForm.partner_contribution_amount ?? 0) + Number(newContractForm.sub_partner_allocation_amount ?? 0) + Number(newContractForm.our_budget ?? 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                            {newContractForm.currency ?? projectForm.currency ?? 'USD'}
                          </p>
                          <p className="text-xs text-muted-foreground form-help">Partner contribution + Sub-partner budget + Our budget</p>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-1.5 form-field-group">
                        <Label required>Budget</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          placeholder="0.00"
                          value={projectForm.total_budget === 0 ? '' : projectForm.total_budget ?? ''}
                          onChange={(e) => setProjectForm((f) => ({ ...f, total_budget: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                    )}
                    <div className="space-y-1.5 form-field-group">
                      <Label required>Currency</Label>
                      <CurrencySelect
                        value={contractMode === 'new' ? (newContractForm.currency ?? projectForm.currency ?? 'USD') : (projectForm.currency ?? 'USD')}
                        onChange={(v) => {
                          const cur = v || 'USD'
                          if (contractMode === 'new') setNewContractForm((f) => ({ ...f, currency: cur }))
                          setProjectForm((f) => ({ ...f, currency: cur }))
                        }}
                        placeholder="Select currency"
                      />
                    </div>
                  </div>
                  {contractMode === 'new' && (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Formula: Sub-partner budget + Our budget + Partner contribution = Total budget</p>
                      {(() => {
                        const partnerContribution = Number(newContractForm.partner_contribution_amount ?? 0)
                        const subPartnerBudget = Number(newContractForm.sub_partner_allocation_amount ?? 0)
                        const ourBudget = Number(newContractForm.our_budget ?? 0)
                        const total = partnerContribution + subPartnerBudget + ourBudget
                        const cur = newContractForm.currency ?? projectForm.currency ?? 'USD'
                        const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <span className="text-slate-500">Partner contribution</span>
                              <p className="font-semibold text-slate-800 tabular-nums">{fmt(partnerContribution)} {cur}</p>
                            </div>
                            {hasPartner && (
                              <div>
                                <span className="text-slate-500">Sub-partner budget</span>
                                <p className="font-semibold text-slate-800 tabular-nums">{fmt(subPartnerBudget)} {cur}</p>
                              </div>
                            )}
                            <div>
                              <span className="text-slate-500">Our budget</span>
                              <p className="font-semibold text-slate-800 tabular-nums">{fmt(ourBudget)} {cur}</p>
                            </div>
                            <div>
                              <span className="text-slate-500">Total budget</span>
                              <p className="font-semibold text-slate-800 tabular-nums">{fmt(total)} {cur}</p>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>

              <div className="space-y-4 pt-5 border-t border-slate-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Description</p>
                <div className="space-y-1.5 form-field-group">
                  <Label>Project description</Label>
                    <Textarea
                      placeholder=""
                      value={projectForm.description || ''}
                      onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-1.5 form-field-group">
                    <Label>Target beneficiaries</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder=""
                      value={projectForm.target_beneficiaries ?? ''}
                      onChange={(e) => setProjectForm((f) => ({ ...f, target_beneficiaries: e.target.value ? parseInt(e.target.value) : undefined }))}
                    />
                  </div>
              </div>

              {contractMode === 'new' && (
              <div className="space-y-3 pt-5 border-t border-slate-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Documents</p>
                  {([contractFile].filter(Boolean).length > 0 || attachments.length > 0) ? (
                    <div className="space-y-2 form-field-group">
                      {contractFile && (
                        <div className="flex items-center gap-3 flex-wrap">
                          <DocumentFileIcon fileName={contractFile.name} size="lg" />
                          <span className="text-sm truncate">{contractFile.name}</span>
                          <Select value={contractFileDocType} onValueChange={(v) => setContractFileDocType(v as GrantDocumentType)}>
                            <SelectTrigger className="w-28 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="contract">Contract</SelectItem>
                              <SelectItem value="amendment">Amendment</SelectItem>
                              <SelectItem value="budget">Budget</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Title"
                            value={contractFileTitle}
                            onChange={(e) => setContractFileTitle(e.target.value)}
                            className="h-8 flex-1 min-w-[120px]"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setContractFile(null)
                              setContractFileError(null)
                              if (contractFileInputRef.current) contractFileInputRef.current.value = ''
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {attachments.map((a, i) => (
                        <div key={i} className="flex items-center gap-3 flex-wrap">
                          <DocumentFileIcon fileName={a.file.name} size="lg" />
                          <span className="text-sm truncate">{a.file.name}</span>
                          <Select
                            value={a.documentType}
                            onValueChange={(v) =>
                              setAttachments((prev) => prev.map((x, j) => (j === i ? { ...x, documentType: v as GrantDocumentType } : x)))
                            }
                          >
                            <SelectTrigger className="w-28 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="contract">Contract</SelectItem>
                              <SelectItem value="budget">Budget</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Title"
                            value={a.title}
                            onChange={(e) => setAttachments((prev) => prev.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                            className="h-8 flex-1 min-w-[120px]"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => attachmentsInputRef.current?.click()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add another file
                      </Button>
                      <input
                        ref={attachmentsInputRef}
                        type="file"
                        accept={CONTRACT_DOC_ACCEPT}
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          if (validateContractFile(file)) return
                          setAttachments((prev) => [...prev, { file, title: file.name, documentType: 'other' }])
                          e.target.value = ''
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      role="button"
                      tabIndex={0}
                      className={`rounded-xl border-2 border-dashed p-6 transition-all cursor-pointer ${
                        isDragging ? 'border-[#023e8a] bg-[#023e8a]/5' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                      }`}
                      onClick={() => contractFileInputRef.current?.click()}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && contractFileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault()
                        setIsDragging(true)
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault()
                        setIsDragging(false)
                        const file = e.dataTransfer.files?.[0]
                        if (!file) return
                        const err = validateContractFile(file)
                        setContractFileError(err ?? null)
                        setContractFile(err ? null : file)
                      }}
                    >
                      <input
                        ref={contractFileInputRef}
                        type="file"
                        accept={CONTRACT_DOC_ACCEPT}
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (!file) {
                            setContractFile(null)
                            setContractFileError(null)
                            return
                          }
                          setContractFileError(validateContractFile(file) ?? null)
                          setContractFile(validateContractFile(file) ? null : file)
                        }}
                      />
                      <div className="flex flex-col items-center gap-2 py-2">
                        <Upload className="h-6 w-6 text-slate-400" />
                        <span className="text-sm font-medium text-slate-600">Drop PDF, Word, Excel, or ZIP here, or click to browse</span>
                      </div>
                    </div>
                  )}
                  {contractFileError && (
                    <p className="text-sm text-destructive flex items-center gap-1.5">
                      <FileWarning className="h-4 w-4" />
                      {contractFileError}
                    </p>
                  )}
                  {uploadProgress != null && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Uploading…</p>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-6 mt-6 border-t border-slate-200">
                <Button variant="outline" asChild>
                  <Link href="/projects">Cancel</Link>
                </Button>
                <div className="flex-1" />
                <Button variant="secondary" onClick={handleSaveAsDraft} disabled={!canSaveAsDraft || isSaving}>
                  {isSaving ? 'Saving…' : 'Save as draft'}
                </Button>
                <Button onClick={handleSave} disabled={!canSave || isSaving}>
                  {isSaving ? 'Saving…' : 'Save project'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProjectsPageLayout>
  )
}
