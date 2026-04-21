'use client'

import React, { useState, useCallback } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { CurrencySelect } from '@/components/ui/currency-select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  Plus,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Search,
  FolderKanban,
  Calendar,
  Users,
  AlertTriangle,
  FileText,
  Receipt,
  BarChart3,
  Upload,
  FilePlus,
  X,
  FileWarning,
} from 'lucide-react'
import { ActionMenu } from '@/components/ui/action-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { useOfficeOptional } from '@/contexts/OfficeContext'
import { useOrganizationStore } from '@/stores/organizationStore'
import { useOrganizationSectors } from '@/hooks/useOrganizationSectors'
import { useAuthStore } from '@/stores/authStore'
import { ProjectsPageHeader } from '@/components/projects/PageHeader'
import {
  FinanceDataTable,
  FinanceDataTableHeader,
  FinanceDataTableTh,
  FinanceDataTableRow,
  FinanceDataTableTd,
  FinancePagination,
} from '@/components/finance/DataTable'
import {
  getProjects,
  getProject,
  getProjectsSummary,
  createProject,
  updateProject,
  deleteProject,
  getGrants,
  createGrant,
  updateGrant,
  uploadGrantDocument,
  downloadGrantDocument,
  getGrantDocuments,
  updateGrantDocument,
  deleteGrantDocument,
  getProjectDocuments,
  uploadProjectDocument,
  downloadProjectDocument,
  updateProjectDocument,
  deleteProjectDocument,
  getProjectStatusLabel,
  getProjectStatusColor,
  getGrantTypeLabel,
  calculateUtilization,
  calculateDaysRemaining,
  Project,
  ProjectFormData,
  Grant,
  GrantFormData,
  type GrantDocumentType,
} from '@/lib/api/projects'
import { getOffices } from '@/lib/api/offices'
import { getDonors } from '@/lib/api/donors'
import { exportProjectsToExcel, exportProjectsToPdf, exportProjectsToCsv, computeProjectsSummary } from '@/lib/projects-export'
import { DOC_UPLOAD_ACCEPT, DOC_UPLOAD_MAX_MB, validateDocumentUploadFile } from '@/lib/projects-constants'
import { ProjectsPageLayout } from './ProjectsPageLayout'
import { ProjectsPageBody } from './ProjectsPageBody'

export default function ProjectsPageContent() {
  const officeContext = useOfficeOptional()
  const organization = useOrganizationStore((s) => s.organization)
  const { sectors: sectorOptions } = useOrganizationSectors()
  const user = useAuthStore((s) => s.user)
  const projectExportTitle = (organization?.short_name || organization?.name) ? `${organization.short_name || organization.name}'s Project List` : 'Project Portfolio'
  const defaultOfficeId = officeContext?.officeId ?? 1

  const bodyCtxRef = React.useRef<Record<string, unknown> | null>(null)

  /** Column ids that can be shown/hidden by the user. No and Actions are always visible. */
  const PROJECT_LIST_VISIBLE_COLUMN_IDS = [
    'code', 'grantCode', 'projectName', 'donor', 'fundType', 'sector', 'location',
    'startDate', 'endDate', 'currency', 'budget', 'spent', 'util', 'status', 'attach',
  ] as const
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PROJECT_LIST_VISIBLE_COLUMN_IDS.map((id) => [id, true]))
  )

  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterSector, setFilterSector] = useState<string>('all')
  const [filterOfficeId, setFilterOfficeId] = useState<number>(0)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewingProject, setViewingProject] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [deleteConfirmCode, setDeleteConfirmCode] = useState('')

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
  const [contractMode, setContractMode] = useState<'existing' | 'new'>('existing')
  const [dialogMode, setDialogMode] = useState<'new-project' | 'amendment' | 'edit'>('new-project')
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
    contract_reference: '',
    contract_date: '',
    terms_conditions: '',
    grant_type: 'restricted',
    location: '',
    locations: [],
    document_type: '',
    donor_contribution_amount: undefined,
    partner_contribution_amount: undefined,
    partner_name: '',
    partner_details: '',
    sub_partner_allocation_amount: undefined,
    our_budget: undefined,
  })
  const [partnerForm, setPartnerForm] = useState<{
    abbr: string
    start_date: string
    end_date: string
    contract_type: string
    description: string
  }>({ abbr: '', start_date: '', end_date: '', contract_type: 'subgrant', description: '' })
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [contractFileTitle, setContractFileTitle] = useState('')
  const [contractFileError, setContractFileError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [newLocationInput, setNewLocationInput] = useState('')
  const [projectLocationInput, setProjectLocationInput] = useState('')
  const [contractFileDocType, setContractFileDocType] = useState<GrantDocumentType>('contract')
  const [attachments, setAttachments] = useState<{ file: File; title: string; documentType: GrantDocumentType }[]>([])
  const contractFileInputRef = React.useRef<HTMLInputElement>(null)
  const attachmentsInputRef = React.useRef<HTMLInputElement>(null)
  const editAttachmentInputRef = React.useRef<HTMLInputElement>(null)

  const [editGrantDocuments, setEditGrantDocuments] = useState<{ id: number; title: string; file_name: string; document_type?: string }[]>([])
  const [editAttachmentFile, setEditAttachmentFile] = useState<File | null>(null)
  const [editAttachmentTitle, setEditAttachmentTitle] = useState('')
  const [editAttachmentDocType, setEditAttachmentDocType] = useState<GrantDocumentType>('other')
  const [editDocForm, setEditDocForm] = useState<{ documentId: number; title: string; document_type: GrantDocumentType } | null>(null)
  const [attachmentToDelete, setAttachmentToDelete] = useState<number | null>(null)

  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [exportingFormat, setExportingFormat] = useState<'xlsx' | 'pdf' | 'csv' | null>(null)

  const handleExportProjects = useCallback(
    async (format: 'xlsx' | 'pdf' | 'csv') => {
      setExportingFormat(format)
      try {
        const res = await getProjects({
          per_page: 2000,
          status: filterStatus !== 'all' ? filterStatus : undefined,
          search: searchQuery || undefined,
          sector: filterSector !== 'all' ? filterSector : undefined,
          office_id: filterOfficeId > 0 ? filterOfficeId : undefined,
        })
        const list = (res as { data?: unknown[] })?.data ?? (Array.isArray(res) ? res : [])
        const projectsToExport = Array.isArray(list) ? list : []
        const dateStr = new Date().toISOString().split('T')[0]
        const label = format === 'xlsx' ? 'Excel' : format === 'pdf' ? 'PDF' : 'CSV'
        if (projectsToExport.length === 0) {
          toast({ title: 'No data', description: 'No projects to export.', variant: 'destructive' })
          return
        }
        const exportSummary = computeProjectsSummary(projectsToExport)
        const preparedBy = user?.name ?? ''
        if (format === 'xlsx') exportProjectsToExcel(projectsToExport, formatCurrency, `Projects_${dateStr}.xlsx`, exportSummary, preparedBy, projectExportTitle)
        else if (format === 'pdf') exportProjectsToPdf(projectsToExport, formatCurrency, `Projects_${dateStr}.pdf`, projectExportTitle, exportSummary, preparedBy)
        else exportProjectsToCsv(projectsToExport, formatCurrency, `Projects_${dateStr}.csv`, exportSummary, preparedBy)
        toast({ title: 'Export complete', description: `Projects exported as ${label}.` })
      } catch (e) {
        toast({ title: 'Export failed', description: (e as Error)?.message || 'Could not export projects.', variant: 'destructive' })
      } finally {
        setExportingFormat(null)
      }
    },
    [filterStatus, searchQuery, filterSector, filterOfficeId, toast, projectExportTitle, user?.name]
  )

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setPage(1)
  }, [searchQuery, filterStatus, filterSector, filterOfficeId])

  // Clear delete confirmation input when delete dialog opens
  React.useEffect(() => {
    if (projectToDelete) setDeleteConfirmCode('')
  }, [projectToDelete])

  // Fetch projects summary for dashboard cards (same filters as list)
  const summaryFilters = {
    status: filterStatus !== 'all' ? filterStatus : undefined,
    search: searchQuery || undefined,
    sector: filterSector !== 'all' ? filterSector : undefined,
    office_id: filterOfficeId > 0 ? filterOfficeId : undefined,
  }
  const { data: summaryData } = useQuery({
    queryKey: ['projects-summary', summaryFilters],
    queryFn: () => getProjectsSummary(summaryFilters),
  })
  const projectsSummary = (summaryData as { data?: Record<string, unknown> })?.data ?? summaryData ?? null

  // Fetch projects
  const { data: projectsData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['projects', { page, per_page: perPage, status: filterStatus, search: searchQuery, sector: filterSector, office_id: filterOfficeId }],
    queryFn: () => getProjects({
      page,
      per_page: perPage,
      status: filterStatus !== 'all' ? filterStatus : undefined,
      search: searchQuery || undefined,
      sector: filterSector !== 'all' ? filterSector : undefined,
      office_id: filterOfficeId > 0 ? filterOfficeId : undefined,
    }),
    placeholderData: keepPreviousData,
  })

  // Fetch grants for dropdown (all statuses so user can link to draft contracts too)
  const { data: grantsData } = useQuery({
    queryKey: ['grants-list'],
    queryFn: () => getGrants({ per_page: 200 }),
    staleTime: 10 * 60 * 1000,
  })

  // Fetch offices for Add project form
  const { data: officesData } = useQuery({
    queryKey: ['offices-list'],
    queryFn: () => getOffices({ per_page: 200, is_active: true }),
    staleTime: 10 * 60 * 1000,
  })

  // Fetch donors when Add Project dialog is open (for "Create new contract" mode)
  const { data: donorsData } = useQuery({
    queryKey: ['donors-list'],
    queryFn: () => getDonors({ per_page: 200 }),
    staleTime: 10 * 60 * 1000,
    enabled: projectDialogOpen,
  })
  const rawDonors = donorsData?.data ?? (Array.isArray(donorsData) ? donorsData : null)
  const donors: { id: number; name: string; code?: string; short_name?: string }[] = Array.isArray(rawDonors) ? (rawDonors as { id: number; name: string; code?: string; short_name?: string }[]) : []

  // Support both { data: [], meta } and direct array from API
  const rawData = projectsData?.data ?? (Array.isArray(projectsData) ? projectsData : null)
  const projects: Project[] = Array.isArray(rawData) ? rawData : []
  const pagination = projectsData?.meta ?? null
  const rawGrants = grantsData?.data ?? (Array.isArray(grantsData) ? grantsData : null)
  const allGrants: Grant[] = Array.isArray(rawGrants) ? rawGrants : []
  const grantsFilteredByDonor =
    selectedDonorId > 0
      ? allGrants.filter((g) => g.donor_id === selectedDonorId)
      : allGrants
  const grants = contractMode === 'existing' ? grantsFilteredByDonor : allGrants
  const effectiveDonorId = selectedDonorId || (projectForm.grant_id ? allGrants.find((g) => g.id === projectForm.grant_id)?.donor_id : 0) || 0
  const rawOffices = Array.isArray(officesData) ? officesData : null
  const offices: { id: number; name: string; code: string }[] = Array.isArray(rawOffices) ? rawOffices : []

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['projects-summary'] })
      queryClient.invalidateQueries({ queryKey: ['grants-list'] })
      setPage(1)
      setProjectDialogOpen(false)
      resetForm()
      toast({ title: 'Project Created', description: 'The project has been created successfully.' })
    },
    onError: (error: any) => {
      const data = error.response?.data
      const message = data?.message || 'Failed to create project'
      const errors = data?.errors
      const detail = errors ? Object.values(errors).flat().join(' ') : message
      toast({ title: 'Error', description: detail, variant: 'destructive' })
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProjectFormData & { status: string }> }) => updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['projects-summary'] })
      setProjectDialogOpen(false)
      setEditingProject(null)
      resetForm()
      toast({ title: 'Project Updated', description: 'The project has been updated successfully.' })
    },
    onError: (error: any) => {
      const data = error.response?.data
      const message = data?.message || 'Failed to update project'
      const errors = data?.errors
      const detail = errors ? Object.values(errors).flat().join(' ') : message
      toast({ title: 'Error', description: detail, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['projects-summary'] })
      setDeleteDialogOpen(false)
      setProjectToDelete(null)
      setDeleteConfirmCode('')
      toast({ title: 'Project Deleted', description: 'The project has been deleted successfully.' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to delete project', variant: 'destructive' })
    },
  })

  const resetForm = () => {
    const defaultOffice = offices.length > 0
      ? (offices.some((o) => o.id === defaultOfficeId) ? defaultOfficeId : offices[0].id)
      : defaultOfficeId
    const today = new Date().toISOString().split('T')[0]
    setProjectForm({
      grant_id: 0,
      office_id: defaultOffice,
      project_code: '',
      project_name: '',
      description: '',
      start_date: today,
      end_date: '',
      total_budget: 0,
      currency: 'USD',
      sector: '',
      location: '',
      locations: [],
      status: 'draft',
    })
    setContractMode('existing')
    setSelectedDonorId(0)
    setHasPartner(false)
    setNewContractForm({
      grant_code: '',
      grant_name: '',
      description: '',
      start_date: today,
      end_date: '',
      total_amount: 0,
      currency: 'USD',
      contract_reference: '',
      contract_date: '',
      terms_conditions: '',
      grant_type: 'restricted',
      location: '',
      locations: [],
      document_type: '',
      donor_contribution_amount: undefined,
      partner_contribution_amount: undefined,
      partner_name: '',
      partner_details: '',
      sub_partner_allocation_amount: undefined,
      our_budget: undefined,
    })
    setContractFile(null)
    setContractFileTitle('')
    setContractFileError(null)
    setUploadProgress(null)
    setNewLocationInput('')
    setProjectLocationInput('')
    setContractFileDocType('contract')
    setAttachments([])
    setPartnerForm({ abbr: '', start_date: '', end_date: '', contract_type: 'subgrant', description: '' })
    if (contractFileInputRef.current) contractFileInputRef.current.value = ''
    if (attachmentsInputRef.current) attachmentsInputRef.current.value = ''
  }

  const openAddProject = () => {
    setEditingProject(null)
    resetForm()
    setDialogMode('new-project')
    setContractMode('new')
    setProjectDialogOpen(true)
  }

  const openAddAmendment = () => {
    setEditingProject(null)
    resetForm()
    setDialogMode('amendment')
    setContractMode('existing')
    setProjectDialogOpen(true)
  }

  const toYMD = (v: unknown): string => {
    if (v == null || v === '') return ''
    if (typeof v === 'string') return v.split('T')[0].trim()
    if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().split('T')[0]
    return ''
  }

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    setDialogMode('edit')
    const locList = (project as { locations_list?: string[] }).locations_list ?? (project as { locations?: string[] }).locations ?? (project.location ? [project.location] : [])
    const startDate = toYMD(project.start_date) || new Date().toISOString().split('T')[0]
    const endDate = toYMD(project.end_date) || ''
    const grantType = (project as { grant?: { grant_type?: string } }).grant?.grant_type ?? 'restricted'
    setProjectForm({
      grant_id: project.grant_id,
      office_id: project.office_id ?? 0,
      project_code: project.project_code || '',
      project_name: project.project_name || '',
      description: project.description || '',
      start_date: startDate,
      end_date: endDate,
      total_budget: project.total_budget ?? 0,
      currency: project.currency || 'USD',
      sector: project.sector || '',
      location: project.location || '',
      locations: locList,
      target_beneficiaries: project.target_beneficiaries ?? undefined,
      status: project.status || 'draft',
      grant_type: grantType as 'restricted' | 'unrestricted' | 'temporarily_restricted',
    })
    setSelectedDonorId(project.grant?.donor?.id ?? (project.grant as { donor_id?: number })?.donor_id ?? 0)
    setContractMode('existing')
    setEditGrantDocuments((project as { documents?: { id: number; title: string; file_name: string; document_type?: string }[] })?.documents ?? [])
    setEditAttachmentFile(null)
    setEditAttachmentTitle('')
    setEditAttachmentDocType('other')
    setProjectDialogOpen(true)
  }

  const handleUploadEditAttachment = async () => {
    if (!editingProject?.id || !editAttachmentFile) return
    setUploadProgress(0)
    try {
      await uploadProjectDocument(
        editingProject.id,
        editAttachmentFile,
        editAttachmentTitle || editAttachmentFile.name,
        (p) => setUploadProgress(p),
        editAttachmentDocType
      )
      const res = await getProjectDocuments(editingProject.id)
      const list = (res as { data?: { id: number; title: string; file_name: string; document_type?: string }[] })?.data ?? (Array.isArray(res) ? res : [])
      setEditGrantDocuments(Array.isArray(list) ? list : [])
      setEditAttachmentFile(null)
      setEditAttachmentTitle('')
      setEditAttachmentDocType('other')
      if (editAttachmentInputRef.current) editAttachmentInputRef.current.value = ''
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast({ title: 'Attachment added', description: 'Document uploaded to this project.' })
    } catch (e) {
      toast({ title: 'Upload failed', description: (e as Error)?.message || 'Could not upload document.', variant: 'destructive' })
    } finally {
      setUploadProgress(null)
    }
  }

  const handleUpdateEditAttachment = async (documentId: number, data: { title?: string; document_type?: GrantDocumentType }) => {
    if (!editingProject?.id) return
    try {
      await updateProjectDocument(editingProject.id, documentId, data)
      const res = await getProjectDocuments(editingProject.id)
      const list = (res as { data?: { id: number; title: string; file_name: string; document_type?: string }[] })?.data ?? (Array.isArray(res) ? res : [])
      setEditGrantDocuments(Array.isArray(list) ? list : [])
      setEditDocForm(null)
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast({ title: 'Attachment updated', description: 'Document details saved.' })
    } catch (e) {
      toast({ title: 'Update failed', description: (e as Error)?.message || 'Could not update document.', variant: 'destructive' })
    }
  }

  const handleDeleteEditAttachment = async (documentId: number) => {
    if (!editingProject?.id) return
    try {
      await deleteProjectDocument(editingProject.id, documentId)
      const res = await getProjectDocuments(editingProject.id)
      const list = (res as { data?: { id: number; title: string; file_name: string; document_type?: string }[] })?.data ?? (Array.isArray(res) ? res : [])
      setEditGrantDocuments(Array.isArray(list) ? list : [])
      setEditDocForm((f) => (f?.documentId === documentId ? null : f))
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast({ title: 'Attachment deleted', description: 'Document removed from this project.' })
    } catch (e) {
      toast({ title: 'Delete failed', description: (e as Error)?.message || 'Could not delete document.', variant: 'destructive' })
    } finally {
      setAttachmentToDelete(null)
    }
  }

  const handleView = async (project: Project) => {
    try {
      const response = await getProject(project.id)
      const payload = (response as { data?: { project?: unknown } })?.data ?? response
      setViewingProject(payload)
      setViewDialogOpen(true)
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load project details', variant: 'destructive' })
    }
  }

  const CONTRACT_DOC_MAX_MB = DOC_UPLOAD_MAX_MB
  const CONTRACT_DOC_ACCEPT = DOC_UPLOAD_ACCEPT
  const PROJECT_ATTACHMENT_ACCEPT = DOC_UPLOAD_ACCEPT
  const validateContractFile = validateDocumentUploadFile
  const validateProjectAttachmentFile = validateDocumentUploadFile

  const handleSave = async () => {
    if (editingProject) {
      const grantType = (projectForm as { grant_type?: string }).grant_type
      if (grantType) {
        try {
          await updateGrant(editingProject.grant_id, { grant_type: grantType as GrantFormData['grant_type'] })
        } catch (err: unknown) {
          const msg = err && typeof err === 'object' && 'response' in err && (err as { response?: { data?: { message?: string } } }).response?.data?.message
          toast({ title: 'Error', description: (msg as string) || 'Failed to update fund type.', variant: 'destructive' })
          return
        }
      }
      updateMutation.mutate({ id: editingProject.id, data: projectForm })
      return
    }
    if (contractMode === 'new') {
      const cf = newContractForm
      const totalAmount = Number(cf.partner_contribution_amount ?? 0) + Number(cf.sub_partner_allocation_amount ?? 0) + Number(cf.our_budget ?? 0)
      if (!cf.donor_id || !cf.grant_code?.trim() || !cf.grant_name?.trim() || !cf.start_date || !cf.end_date || !(totalAmount >= 0) || !cf.currency) {
        toast({ title: 'Validation', description: 'Please fill required contract fields: Donor, Contract code, Name, Start/End date, budget components, Currency.', variant: 'destructive' })
        return
      }
      try {
        const grantPayload: GrantFormData = {
          donor_id: cf.donor_id ?? selectedDonorId,
          grant_code: cf.grant_code.trim(),
          grant_name: cf.grant_name.trim(),
          description: cf.description || undefined,
          start_date: cf.start_date,
          end_date: cf.end_date,
          total_amount: totalAmount,
          currency: cf.currency!,
          grant_type: (cf.grant_type as GrantFormData['grant_type']) ?? 'restricted',
          contract_reference: cf.contract_reference || undefined,
          contract_date: cf.contract_date || undefined,
          terms_conditions: cf.terms_conditions || undefined,
          locations: cf.locations?.length ? cf.locations : undefined,
          document_type: cf.document_type || undefined,
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
          toast({ title: 'Error', description: 'Contract was created but could not get ID to link project.', variant: 'destructive' })
          return
        }
        const filesToUpload: { file: File; title: string; docType: GrantDocumentType }[] = []
        if (contractFile) {
          filesToUpload.push({ file: contractFile, title: contractFileTitle.trim() || contractFile.name, docType: contractFileDocType })
        }
        attachments.forEach((a) => filesToUpload.push({ file: a.file, title: a.title || a.file.name, docType: a.documentType }))
        for (let i = 0; i < filesToUpload.length; i++) {
          const { file, title, docType } = filesToUpload[i]
          setUploadProgress(Math.round(((i + 0.5) / filesToUpload.length) * 100))
          try {
            await uploadGrantDocument(newGrantId, file, title || undefined, (p) => setUploadProgress(Math.round((i / filesToUpload.length) * 100 + (p / filesToUpload.length))), docType)
          } catch {
            toast({ title: 'Contract created', description: `Upload failed for ${file.name}. You can add it later from the contract.`, variant: 'destructive' })
          }
        }
        setUploadProgress(null)
        const projectPayload: ProjectFormData = {
          ...projectForm,
          grant_id: newGrantId,
          total_budget: totalAmount,
          locations: (projectForm.locations?.length ? projectForm.locations : undefined) ?? (projectForm.location ? [projectForm.location] : undefined),
        }
        createMutation.mutate(projectPayload)
      } catch (err: unknown) {
        const msg = err && typeof err === 'object' && 'response' in err && (err as { response?: { data?: { message?: string } } }).response?.data?.message
        toast({ title: 'Error', description: (msg as string) || 'Failed to create contract.', variant: 'destructive' })
      }
    } else {
      const payload: ProjectFormData = {
        ...projectForm,
        locations: (projectForm.locations?.length ? projectForm.locations : undefined) ?? (projectForm.location ? [projectForm.location] : undefined),
      }
      createMutation.mutate(payload)
    }
  }

  bodyCtxRef.current = {
    columnVisibility,
    setColumnVisibility,
    projectListVisibleColumnIds: PROJECT_LIST_VISIBLE_COLUMN_IDS,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    filterSector,
    setFilterSector,
    filterOfficeId,
    setFilterOfficeId,
    page,
    setPage,
    perPage,
    setPerPage,
    refetch,
    isLoading,
    isError,
    error,
    setEditingProject,
    resetForm,
    setProjectDialogOpen,
    projectDialogOpen,
    pagination,
    projects,
    createMutation,
    updateMutation,
    deleteMutation,
    projectForm,
    setProjectForm,
    editingProject,
    contractMode,
    setContractMode,
    dialogMode,
    setDialogMode,
    selectedDonorId,
    setSelectedDonorId,
    effectiveDonorId,
    donors,
    grantsFilteredByDonor,
    grants,
    handleView,
    handleEdit,
    setProjectToDelete,
    setDeleteDialogOpen,
    viewDialogOpen,
    setViewDialogOpen,
    viewingProject,
    deleteDialogOpen,
    projectToDelete,
    deleteConfirmCode,
    setDeleteConfirmCode,
    newContractForm,
    setNewContractForm,
    partnerForm,
    setPartnerForm,
    newLocationInput,
    setNewLocationInput,
    hasPartner,
    setHasPartner,
    contractFile,
    setContractFile,
    contractFileTitle,
    setContractFileTitle,
    contractFileError,
    setContractFileError,
    contractFileDocType,
    setContractFileDocType,
    attachments,
    setAttachments,
    contractFileInputRef,
    attachmentsInputRef,
    CONTRACT_DOC_MAX_MB,
    CONTRACT_DOC_ACCEPT,
    validateContractFile,
    PROJECT_ATTACHMENT_ACCEPT,
    validateProjectAttachmentFile,
    uploadProgress,
    isDragging,
    setIsDragging,
    projectLocationInput,
    setProjectLocationInput,
    offices,
    sectorOptions,
    allGrants,
    getProjectStatusLabel,
    getProjectStatusColor,
    getGrantTypeLabel,
    calculateUtilization,
    formatCurrency,
    formatDate,
    cn,
    handleSave,
    openAddProject,
    openAddAmendment,
    projectsSummary,
    handleExportProjects,
    exportingFormat,
    downloadGrantDocument,
    downloadProjectDocument,
    editGrantDocuments,
    setEditGrantDocuments,
    editAttachmentFile,
    setEditAttachmentFile,
    editAttachmentTitle,
    setEditAttachmentTitle,
    editAttachmentDocType,
    setEditAttachmentDocType,
    editAttachmentInputRef,
    handleUploadEditAttachment,
    editDocForm,
    setEditDocForm,
    handleUpdateEditAttachment,
    handleDeleteEditAttachment,
    attachmentToDelete,
    setAttachmentToDelete,
  }

  return <ProjectsPageLayout><ProjectsPageBody ctxRef={bodyCtxRef} /></ProjectsPageLayout>
}

