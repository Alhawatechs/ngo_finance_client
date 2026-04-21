'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { CurrencySelect } from '@/components/ui/currency-select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, FileEdit, FileText, Plus, Upload, X, FileWarning } from 'lucide-react'
import { DocumentFileIcon } from '@/components/ui/document-file-icon'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useOfficeOptional } from '@/contexts/OfficeContext'
import { useOrganizationStore } from '@/stores/organizationStore'
import { useOrganizationSectors } from '@/hooks/useOrganizationSectors'
import { FinancePageHeader } from '@/components/finance/PageHeader'
import { createProject, updateProject, createGrant, getProject, getProjects, getGrants, uploadGrantDocument, ProjectFormData, Project, type GrantDocumentType } from '@/lib/api/projects'
import { getDonors } from '@/lib/api/donors'
import { getOffices } from '@/lib/api/offices'
import { DOC_UPLOAD_ACCEPT, validateDocumentUploadFile } from '@/lib/projects-constants'
import { ProjectsPageLayout } from '../ProjectsPageLayout'
import '../project-form-controls.css'

const CONTRACT_DOC_ACCEPT = DOC_UPLOAD_ACCEPT
const validateContractFile = validateDocumentUploadFile

function toYMD(v: unknown): string {
  if (v == null || v === '') return ''
  if (typeof v === 'string') return v.split('T')[0].trim()
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().split('T')[0]
  return ''
}

export function AddAmendmentPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const officeContext = useOfficeOptional()
  const organization = useOrganizationStore((s) => s.organization)
  const { sectors: sectorOptions } = useOrganizationSectors()
  const projectListLabel = (organization?.short_name || organization?.name) ? `${organization.short_name || organization.name}'s Project List` : 'Project Portfolio'
  const defaultOfficeId = officeContext?.officeId ?? 1
  const searchParams = useSearchParams()
  const projectIdFromUrl = searchParams.get('project_id')

  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(() => {
    if (projectIdFromUrl) {
      const id = parseInt(projectIdFromUrl, 10)
      return Number.isNaN(id) ? null : id
    }
    return null
  })

  useEffect(() => {
    if (projectIdFromUrl) {
      const id = parseInt(projectIdFromUrl, 10)
      setSelectedProjectId(Number.isNaN(id) ? null : id)
    }
  }, [projectIdFromUrl])
  /** 'update' = record changes to the selected project; 'create' = create a new amended project (copy) */
  const [amendmentMode, setAmendmentMode] = useState<'update' | 'create'>('update')
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [contractFileTitle, setContractFileTitle] = useState('')
  const [contractFileDocType, setContractFileDocType] = useState<GrantDocumentType>('amendment')
  const [contractFileError, setContractFileError] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<{ file: File; title: string; documentType: GrantDocumentType }[]>([])
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const contractFileInputRef = useRef<HTMLInputElement>(null)
  const attachmentsInputRef = useRef<HTMLInputElement>(null)
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
  const [selectedDonorId, setSelectedDonorId] = useState<number>(0)
  const [projectLocationInput, setProjectLocationInput] = useState('')
  /** Budget breakdown for new amendment contract (create mode). When set, we create an amendment grant then project. */
  const [amendmentPartnerContribution, setAmendmentPartnerContribution] = useState<number>(0)
  const [amendmentSubPartner, setAmendmentSubPartner] = useState<number>(0)
  const [amendmentOurBudget, setAmendmentOurBudget] = useState<number>(0)

  const { data: projectsData, isLoading: loadingProjects } = useQuery({
    queryKey: ['projects-list-amendment'],
    queryFn: () => getProjects({ per_page: 200 }),
  })
  const { data: projectDetail, isLoading: loadingProject } = useQuery({
    queryKey: ['project', selectedProjectId],
    queryFn: () => getProject(selectedProjectId!),
    enabled: !!selectedProjectId,
  })
  const { data: donorsData } = useQuery({ queryKey: ['donors-list'], queryFn: () => getDonors({ per_page: 200 }), staleTime: 10 * 60 * 1000 })
  const { data: grantsData } = useQuery({ queryKey: ['grants-list'], queryFn: () => getGrants({ per_page: 200 }), staleTime: 10 * 60 * 1000 })
  const { data: officesData } = useQuery({ queryKey: ['offices-list'], queryFn: () => getOffices({ is_active: true }) })

  const rawProjects = projectsData?.data ?? (Array.isArray(projectsData) ? projectsData : [])
  const projects: Project[] = Array.isArray(rawProjects) ? rawProjects : []
  const payload = (projectDetail as { data?: { project?: Project } })?.data ?? projectDetail
  const sourceProject = (payload as { project?: Project })?.project ?? (payload as Project)
  const rawDonors = donorsData?.data ?? (Array.isArray(donorsData) ? donorsData : null)
  const donors: { id: number; name: string; code?: string }[] = Array.isArray(rawDonors) ? rawDonors : []
  const rawGrants = grantsData?.data ?? (Array.isArray(grantsData) ? grantsData : null)
  const allGrants: { id: number; grant_code: string; grant_name: string; donor_id: number; start_date: string; end_date: string; total_amount: number; currency: string }[] = Array.isArray(rawGrants) ? rawGrants : []
  const grantsFiltered = selectedDonorId > 0 ? allGrants.filter((g) => g.donor_id === selectedDonorId) : allGrants
  const offices: { id: number; name: string; code: string }[] = Array.isArray(officesData) ? officesData : []

  React.useEffect(() => {
    if (!sourceProject) return
    const g = sourceProject.grant
    const donorId = g?.donor?.id ?? (g as { donor_id?: number })?.donor_id ?? 0
    const locList = (sourceProject as { locations_list?: string[] }).locations_list ?? (sourceProject as { locations?: string[] }).locations ?? (sourceProject.location ? [sourceProject.location] : [])
    setSelectedDonorId(donorId)
    const isCreate = amendmentMode === 'create'
    setProjectForm({
      grant_id: sourceProject.grant_id ?? 0,
      office_id: sourceProject.office_id ?? defaultOfficeId,
      project_code: isCreate ? (sourceProject.project_code ?? '') + '-AM' : (sourceProject.project_code ?? ''),
      project_name: isCreate ? (sourceProject.project_name ?? '') + ' (Amendment)' : (sourceProject.project_name ?? ''),
      description: sourceProject.description ?? '',
      start_date: toYMD(sourceProject.start_date) || new Date().toISOString().split('T')[0],
      end_date: toYMD(sourceProject.end_date) ?? '',
      total_budget: sourceProject.total_budget ?? 0,
      currency: sourceProject.currency ?? 'USD',
      sector: sourceProject.sector ?? '',
      location: sourceProject.location ?? '',
      locations: locList,
      target_beneficiaries: (sourceProject as { target_beneficiaries?: number }).target_beneficiaries ?? undefined,
      status: sourceProject.status ?? 'draft',
    })
    if (amendmentMode === 'create' && sourceProject.grant) {
      const g = sourceProject.grant as { partner_contribution_amount?: number; sub_partner_allocation_amount?: number; total_amount?: number }
      const p = Number(g.partner_contribution_amount ?? 0)
      const s = Number(g.sub_partner_allocation_amount ?? 0)
      const t = Number(g.total_amount ?? 0)
      setAmendmentPartnerContribution(p)
      setAmendmentSubPartner(s)
      setAmendmentOurBudget(Math.max(0, t - p - s))
    } else {
      setAmendmentPartnerContribution(0)
      setAmendmentSubPartner(0)
      setAmendmentOurBudget(0)
    }
  }, [sourceProject, defaultOfficeId, amendmentMode])

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['projects-summary'] })
      toast({ title: 'Amendment created', description: 'The amended project has been created successfully.' })
      router.push('/projects')
    },
    onError: (error: unknown) => {
      setUploadProgress(null)
      const data = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data
      const message = data?.message || 'Failed to create amendment'
      const errors = data?.errors
      const detail = errors ? Object.values(errors).flat().join(' ') : message
      toast({ title: 'Error', description: detail, variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProjectFormData & { status: string }> }) => updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['projects-summary'] })
      queryClient.invalidateQueries({ queryKey: ['project', selectedProjectId] })
      toast({ title: 'Project updated', description: 'The project has been updated successfully.' })
      router.push('/projects')
    },
    onError: (error: unknown) => {
      setUploadProgress(null)
      const data = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data
      const message = data?.message || 'Failed to update project'
      const errors = data?.errors
      const detail = errors ? Object.values(errors).flat().join(' ') : message
      toast({ title: 'Error', description: detail, variant: 'destructive' })
    },
  })

  const handleSave = async () => {
    if (!projectForm.grant_id || !projectForm.office_id || !(projectForm.project_code ?? '').trim() || !(projectForm.project_name ?? '').trim()) {
      toast({ title: 'Validation', description: 'Contract, Office, Project code, and Project name are required.', variant: 'destructive' })
      return
    }
    if (!projectForm.start_date || !projectForm.end_date) {
      toast({ title: 'Validation', description: 'Start and end dates are required.', variant: 'destructive' })
      return
    }
    if (Number(projectForm.total_budget ?? 0) < 0) {
      toast({ title: 'Validation', description: 'Budget cannot be negative.', variant: 'destructive' })
      return
    }
    const grantId = projectForm.grant_id
    const filesToUpload: { file: File; title?: string; docType: GrantDocumentType }[] = []
    if (contractFile) filesToUpload.push({ file: contractFile, title: contractFileTitle || undefined, docType: contractFileDocType })
    attachments.forEach((a) => filesToUpload.push({ file: a.file, title: a.title || undefined, docType: a.documentType }))
    const amendmentTotal = amendmentPartnerContribution + amendmentSubPartner + amendmentOurBudget
    const createAmendmentGrant = amendmentMode === 'create' && selectedProjectId && sourceProject?.grant && amendmentTotal > 0

    let effectiveGrantId = grantId
    if (createAmendmentGrant && sourceProject?.grant) {
      const parentGrant = sourceProject.grant as { id: number; donor_id: number; grant_code: string; grant_name: string; grant_type?: string }
      const grantRes = await createGrant({
        parent_grant_id: parentGrant.id,
        donor_id: parentGrant.donor_id,
        grant_code: `${parentGrant.grant_code}-AM-${Date.now().toString(36).slice(-6)}`,
        grant_name: `${parentGrant.grant_name || 'Contract'} Amendment`,
        start_date: projectForm.start_date!,
        end_date: projectForm.end_date!,
        total_amount: amendmentTotal,
        currency: projectForm.currency!,
        grant_type: (parentGrant.grant_type as 'restricted' | 'unrestricted' | 'temporarily_restricted') || 'restricted',
        partner_contribution_amount: amendmentPartnerContribution,
        sub_partner_allocation_amount: amendmentSubPartner,
      })
      const newGrant = (grantRes as { data?: { id?: number } })?.data ?? grantRes
      effectiveGrantId = (newGrant as { id?: number }).id ?? grantId
      queryClient.invalidateQueries({ queryKey: ['grants-list'] })
    }

    const payload: ProjectFormData = {
      ...projectForm,
      grant_id: effectiveGrantId,
      total_budget: createAmendmentGrant ? amendmentTotal : (projectForm.total_budget ?? 0),
      locations: (projectForm.locations?.length ? projectForm.locations : undefined) ?? (projectForm.location ? [projectForm.location] : undefined),
      ...(amendmentMode === 'create' && selectedProjectId ? { parent_project_id: selectedProjectId } : {}),
    }
    try {
      if (filesToUpload.length > 0 && effectiveGrantId > 0) {
        setUploadProgress(0)
        for (let i = 0; i < filesToUpload.length; i++) {
          const { file, title, docType } = filesToUpload[i]
          await uploadGrantDocument(effectiveGrantId, file, title, (p) => setUploadProgress(Math.round((i / filesToUpload.length) * 100 + (p / filesToUpload.length))), docType)
        }
        setUploadProgress(null)
      }
      if (amendmentMode === 'update' && selectedProjectId) {
        await updateMutation.mutateAsync({ id: selectedProjectId, data: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
    } catch {
      setUploadProgress(null)
      // Mutation onError already shows toast
    }
  }

  const amendmentTotal = amendmentPartnerContribution + amendmentSubPartner + amendmentOurBudget
  const isSaving = createMutation.isPending || updateMutation.isPending || uploadProgress != null
  const canSave =
    !!projectForm.grant_id &&
    !!projectForm.office_id &&
    !!(projectForm.project_code ?? '').trim() &&
    !!(projectForm.project_name ?? '').trim() &&
    !!projectForm.start_date &&
    !!projectForm.end_date &&
    !!projectForm.currency &&
    (amendmentMode === 'update' ? Number(projectForm.total_budget ?? 0) >= 0 : (amendmentTotal > 0 || Number(projectForm.total_budget ?? 0) >= 0))

  return (
    <ProjectsPageLayout>
      <FinancePageHeader
        title="Project Amendment"
        description="Update an existing project or create a new amended project. Select a project, choose to update it or create a copy, then save."
        breadcrumbs={[
          { label: projectListLabel, href: '/projects' },
          { label: 'Project amendment' },
        ]}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to list
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="p-5">
          <div className="project-register-amendment-form space-y-5">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Step 1 — Select base project</p>
              {loadingProjects ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  value={selectedProjectId ? String(selectedProjectId) : ''}
                  onValueChange={(v) => setSelectedProjectId(v ? parseInt(v, 10) : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project to amend from..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">No projects found</div>
                    ) : (
                      projects.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.project_code} – {p.project_name} {p.grant?.grant_code ? `(${p.grant.grant_code})` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedProjectId && loadingProject && (
              <p className="text-sm text-muted-foreground">Loading project details…</p>
            )}

            {selectedProjectId && sourceProject && (
              <>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                    <FileEdit className="h-4 w-4" />
                    Step 2 — Review and edit
                  </p>
                  <div className="flex flex-wrap gap-4 mb-4 p-3 rounded-md bg-background/60 border border-border/40">
                    <Label className="sr-only">Amendment action</Label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="amendmentMode"
                        checked={amendmentMode === 'update'}
                        onChange={() => setAmendmentMode('update')}
                        className="rounded-full border-border text-primary focus:ring-0.5 focus:ring-primary"
                      />
                      <span className="text-sm font-medium">Update this project</span>
                      <span className="text-xs text-muted-foreground">Record changes to the selected project</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="amendmentMode"
                        checked={amendmentMode === 'create'}
                        onChange={() => setAmendmentMode('create')}
                        className="rounded-full border-border text-primary focus:ring-0.5 focus:ring-primary"
                      />
                      <span className="text-sm font-medium">Create new amended project</span>
                      <span className="text-xs text-muted-foreground">New project with amended details</span>
                    </label>
                  </div>
                  {((payload as { amendments?: Project[] }).amendments?.length ?? 0) > 0 && (
                    <div className="mb-4 p-3 rounded-md border border-border/50 bg-muted/30">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Existing amendments ({((payload as { amendments?: Project[] }).amendments?.length ?? 0)})</p>
                      <ul className="text-sm space-y-1">
                        {((payload as { amendments?: Project[] }).amendments ?? []).map((a) => (
                          <li key={a.id} className="flex items-center gap-2">
                            <span className="font-mono text-muted-foreground">{a.project_code}</span>
                            <span className="text-foreground">{a.project_name}</span>
                            {a.grant?.grant_code && <span className="text-muted-foreground">({a.grant.grant_code})</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mb-4 border-b border-border/60 pb-3">Funding & contract</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1.5 form-field-group">
                      <Label required>Donor</Label>
                      <Select
                        value={selectedDonorId > 0 ? String(selectedDonorId) : ''}
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
                          {donors.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">No donors available</div>
                          ) : (
                            donors.map((d) => (
                              <SelectItem key={d.id} value={String(d.id)}>{d.name} {d.code ? `(${d.code})` : ''}</SelectItem>
                            ))
                          )}
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
                          {grantsFiltered.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              {selectedDonorId > 0 ? 'No contracts for this donor' : 'Select donor first'}
                            </div>
                          ) : (
                            grantsFiltered.map((g) => (
                              <SelectItem key={g.id} value={String(g.id)}>{g.grant_code} – {g.grant_name}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-6 mb-2 border-b border-border/60 pb-2">Project details</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 form-field-group">
                      <Label>Sector</Label>
                      <Select value={projectForm.sector || ''} onValueChange={(v) => setProjectForm((f) => ({ ...f, sector: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select sector" /></SelectTrigger>
                        <SelectContent>
                          {sectorOptions.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 form-field-group">
                      <Label required>Project Name</Label>
                      <Input placeholder="e.g. Health Program Phase II" value={projectForm.project_name ?? ''} onChange={(e) => setProjectForm((f) => ({ ...f, project_name: e.target.value }))} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-1.5 form-field-group">
                      <Label required>Project Code</Label>
                      <Input placeholder="e.g. PRJ-001-AM" value={projectForm.project_code ?? ''} onChange={(e) => setProjectForm((f) => ({ ...f, project_code: e.target.value.toUpperCase() }))} />
                    </div>
                    <div className="space-y-1.5 form-field-group">
                      <Label required>Office</Label>
                      <Select
                        value={projectForm.office_id > 0 ? projectForm.office_id.toString() : ''}
                        onValueChange={(v) => setProjectForm((f) => ({ ...f, office_id: v ? parseInt(v, 10) : 0 }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select office" /></SelectTrigger>
                        <SelectContent>
                          {offices.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">No offices available</div>
                          ) : (
                            offices.map((o) => (
                              <SelectItem key={o.id} value={o.id.toString()}>{o.code} – {o.name}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5 mt-4">
                    <Label>Location</Label>
                    <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-background min-h-10">
                      {(projectForm.locations ?? []).map((loc, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-sm">
                          {loc}
                          <button type="button" onClick={() => setProjectForm((f) => ({ ...f, locations: (f.locations ?? []).filter((_, j) => j !== i) }))} className="hover:text-destructive rounded" aria-label="Remove location">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                      <input
                        className="flex-1 min-w-[120px] bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground"
                        placeholder="Add location (Enter or comma)"
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

                  <p className="text-xs text-muted-foreground mt-6 mb-2 border-b border-border/60 pb-2">Dates & budget</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="space-y-1.5 form-field-group">
                      <Label required>Start date</Label>
                      <DatePicker value={projectForm.start_date ?? ''} onChange={(v) => setProjectForm((f) => ({ ...f, start_date: v ?? '' }))} maxDate={projectForm.end_date || undefined} />
                    </div>
                    <div className="space-y-1.5 form-field-group">
                      <Label required>End date</Label>
                      <DatePicker value={projectForm.end_date ?? ''} onChange={(v) => setProjectForm((f) => ({ ...f, end_date: v ?? '' }))} minDate={projectForm.start_date || undefined} />
                    </div>
                  </div>

                  {amendmentMode === 'create' && (
                    <div className="mt-4 p-4 rounded-lg border border-border/60 bg-muted/20 space-y-3 form-field-group">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amendment contract budget (optional)</p>
                      <p className="text-xs text-muted-foreground form-help">Add partner contribution or sub-partner allocation to create a new amendment contract. Leave all zero to use the same contract.</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1.5 form-field-group">
                          <Label>Partner contribution</Label>
                          <Input type="number" min={0} step={0.01} placeholder="0.00" value={amendmentPartnerContribution === 0 ? '' : amendmentPartnerContribution} onChange={(e) => setAmendmentPartnerContribution(parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-1.5 form-field-group">
                          <Label>Sub-partner budget</Label>
                          <Input type="number" min={0} step={0.01} placeholder="0.00" value={amendmentSubPartner === 0 ? '' : amendmentSubPartner} onChange={(e) => setAmendmentSubPartner(parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-1.5 form-field-group">
                          <Label>Our budget</Label>
                          <Input type="number" min={0} step={0.01} placeholder="0.00" value={amendmentOurBudget === 0 ? '' : amendmentOurBudget} onChange={(e) => setAmendmentOurBudget(parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-1.5 form-field-group">
                          <Label>Total</Label>
                          <p className="text-lg font-semibold tabular-nums py-2">{((amendmentPartnerContribution || 0) + (amendmentSubPartner || 0) + (amendmentOurBudget || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {projectForm.currency ?? 'USD'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="space-y-1.5 form-field-group">
                      <Label required={amendmentMode !== 'create' || (amendmentPartnerContribution + amendmentSubPartner + amendmentOurBudget) === 0}>Budget</Label>
                      <Input type="number" min={0} step={0.01} placeholder="0.00" value={projectForm.total_budget === 0 ? '' : projectForm.total_budget ?? ''} onChange={(e) => setProjectForm((f) => ({ ...f, total_budget: parseFloat(e.target.value) || 0 }))} />
                      {amendmentMode === 'create' && (amendmentPartnerContribution + amendmentSubPartner + amendmentOurBudget) > 0 && <p className="text-xs text-muted-foreground form-help">Ignored when amendment contract budget is set above</p>}
                    </div>
                    <div className="space-y-1.5 form-field-group">
                      <Label required>Currency</Label>
                      <CurrencySelect value={projectForm.currency ?? 'USD'} onChange={(v) => setProjectForm((f) => ({ ...f, currency: v || 'USD' }))} placeholder="Select currency" />
                    </div>
                  </div>

                  <div className="space-y-1.5 mt-4">
                    <Label>Description</Label>
                    <Textarea placeholder="Objectives, activities, and expected outcomes" value={projectForm.description || ''} onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
                  </div>
                  <div className="space-y-1.5 mt-4">
                    <Label>Target beneficiaries</Label>
                    <Input type="number" min={0} placeholder="Estimated number" value={projectForm.target_beneficiaries ?? ''} onChange={(e) => setProjectForm((f) => ({ ...f, target_beneficiaries: e.target.value ? parseInt(e.target.value) : undefined }))} />
                  </div>
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Step 3 — Attachments (optional)
                  </p>
                  {(contractFile || attachments.length > 0) ? (
                    <div className="space-y-2">
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
                          <Input placeholder="Title" value={contractFileTitle} onChange={(e) => setContractFileTitle(e.target.value)} className="h-8 flex-1 min-w-[120px]" />
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setContractFile(null); setContractFileError(null); contractFileInputRef.current && (contractFileInputRef.current.value = '') }}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {attachments.map((a, i) => (
                        <div key={i} className="flex items-center gap-3 flex-wrap">
                          <DocumentFileIcon fileName={a.file.name} size="lg" />
                          <span className="text-sm truncate">{a.file.name}</span>
                          <Select value={a.documentType} onValueChange={(v) => setAttachments((prev) => prev.map((x, j) => (j === i ? { ...x, documentType: v as GrantDocumentType } : x)))}>
                            <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="contract">Contract</SelectItem>
                              <SelectItem value="amendment">Amendment</SelectItem>
                              <SelectItem value="budget">Budget</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input placeholder="Title" value={a.title} onChange={(e) => setAttachments((prev) => prev.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} className="h-8 flex-1 min-w-[120px]" />
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}>
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
                          const err = validateContractFile(file)
                          if (err) {
                            toast({ title: 'Invalid file', description: err, variant: 'destructive' })
                            return
                          }
                          setAttachments((prev) => [...prev, { file, title: file.name, documentType: 'amendment' }])
                          e.target.value = ''
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      role="button"
                      tabIndex={0}
                      className={`rounded-xl border-2 border-dashed p-6 transition-all cursor-pointer ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-muted/50'}`}
                      onClick={() => contractFileInputRef.current?.click()}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && contractFileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files?.[0]; if (!file) return; setContractFileError(validateContractFile(file) ?? null); setContractFile(validateContractFile(file) ? null : file) }}
                    >
                      <input ref={contractFileInputRef} type="file" accept={CONTRACT_DOC_ACCEPT} className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (!file) { setContractFile(null); setContractFileError(null); return }; setContractFileError(validateContractFile(file) ?? null); setContractFile(validateContractFile(file) ? null : file) }} />
                      <div className="flex flex-col items-center gap-2 py-2">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Drop file or click to browse (PDF, Word, Excel, ZIP)</span>
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
                      <p className="text-sm text-muted-foreground">Uploading documents…</p>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-border/60">
                  <Button onClick={handleSave} disabled={!canSave || isSaving}>
                    {isSaving
                      ? (uploadProgress != null ? 'Uploading…' : amendmentMode === 'update' ? 'Updating…' : 'Creating…')
                      : amendmentMode === 'update'
                        ? 'Update project'
                        : 'Create amended project'}
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/projects">Cancel</Link>
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </ProjectsPageLayout>
  )
}
