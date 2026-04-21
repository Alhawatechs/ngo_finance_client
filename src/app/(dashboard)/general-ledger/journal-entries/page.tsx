'use client'

import React, { useState, useEffect, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  Plus,
  Search,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  RotateCcw,
  BookOpen,
  Clock,
  XCircle,
  FileSpreadsheet,
  Link2,
  Undo2,
  ExternalLink,
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { FinanceDataTable, FinanceDataTableHeader, FinanceDataTableTh, FinanceDataTableRow, FinanceDataTableTd } from '@/components/finance/DataTable'
import { NewVoucherFullscreenDialog } from '@/components/finance/NewVoucherFullscreenDialog'
import { useToast } from '@/components/ui/use-toast'
import {
  getVouchers,
  getVoucherStatusColor,
  getVoucherTypeLabel,
} from '@/lib/api/vouchers'
import type { Voucher } from '@/types'
import { getProjects } from '@/lib/api/projects'
import { getOffices } from '@/lib/api/offices'
import {
  getJournals,
  createJournal,
  updateJournal,
  deleteJournal,
  restoreJournal,
  forceDeleteJournal,
  getJournal,
  getJournalProvinces,
  Journal,
  journalToVoucherPrefill,
  CreateJournalInput,
  UpdateJournalInput,
  ProvinceOption,
} from '@/lib/api/journals'
import { useOrganizationStore } from '@/stores/organizationStore'
import { useHasPermission } from '@/stores/authStore'
import { matchProvinceCodeFromProject } from '@/lib/match-province-from-project'
import { getFunds } from '@/lib/api/funds'
import { useOrganizationActiveCurrencies, type CurrencyOption } from '@/hooks/useCurrencies'

/** Route for a single journal book (full page of entries for that book). */
function journalBookPath(id: number) {
  return `/general-ledger/journal-entries/${id}`
}

const statusIcons: Record<string, React.ReactNode> = {
  draft: <Clock className="h-4 w-4" />,
  submitted: <Clock className="h-4 w-4" />,
  pending_approval: <Clock className="h-4 w-4" />,
  approved: <CheckCircle className="h-4 w-4" />,
  posted: <CheckCircle className="h-4 w-4" />,
  rejected: <XCircle className="h-4 w-4" />,
  cancelled: <XCircle className="h-4 w-4" />,
}

function JournalEntriesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const organization = useOrganizationStore((s) => s.organization)
  const baseCurrency = organization?.default_currency ?? 'AFN'
  const {
    options: currencySelectOptions,
    defaultCurrency: currenciesHookDefault,
    isLoading: activeCurrenciesLoading,
    hasOrganizationCurrencies,
  } = useOrganizationActiveCurrencies()

  const projectIdFromUrl = searchParams.get('project_id')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterProjectId, setFilterProjectId] = useState<string>('all')
  const [filterJournalId, setFilterJournalId] = useState<string>('all')
  const [journalListSearch, setJournalListSearch] = useState('')
  const [journalListStatus, setJournalListStatus] = useState<string>('all')
  const [showDeletedJournals, setShowDeletedJournals] = useState(false)

  // Sync project_id from URL once (e.g. from Projects page link). Use primitive deps to avoid update loop.
  useEffect(() => {
    if (projectIdFromUrl && projectIdFromUrl !== filterProjectId) setFilterProjectId(projectIdFromUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when URL param changes
  }, [projectIdFromUrl])
  const [page, setPage] = useState(1)
  const [voucherDialogOpen, setVoucherDialogOpen] = useState(false)
  const [newJournalDialogOpen, setNewJournalDialogOpen] = useState(false)
  const [newJournalName, setNewJournalName] = useState('')
  const [newJournalCode, setNewJournalCode] = useState('')
  const [newJournalProjectId, setNewJournalProjectId] = useState<string>('')
  const [newJournalOfficeId, setNewJournalOfficeId] = useState<string>('')
  const [newJournalProvinceCode, setNewJournalProvinceCode] = useState<string>('')
  const [editJournalDialogOpen, setEditJournalDialogOpen] = useState(false)
  const [journalToEdit, setJournalToEdit] = useState<Journal | null>(null)
  const [editJournalName, setEditJournalName] = useState('')
  const [editJournalCode, setEditJournalCode] = useState('')
  const [editJournalProjectId, setEditJournalProjectId] = useState<string>('')
  const [editJournalOfficeId, setEditJournalOfficeId] = useState<string>('')
  const [editJournalProvinceCode, setEditJournalProvinceCode] = useState<string>('')
  const [editJournalIsActive, setEditJournalIsActive] = useState(true)
  const [newJournalLocationCode, setNewJournalLocationCode] = useState<string>('')
  const [newJournalFundId, setNewJournalFundId] = useState<string>('')
  const [newJournalCurrency, setNewJournalCurrency] = useState<string>('')
  const [newJournalExchangeRate, setNewJournalExchangeRate] = useState<string>('')
  const [newJournalVoucherType, setNewJournalVoucherType] = useState<string>('payment')
  const [newJournalPaymentMethod, setNewJournalPaymentMethod] = useState<string>('cash')
  const [newJournalDefaultPayee, setNewJournalDefaultPayee] = useState<string>('')
  const [newJournalDescTemplate, setNewJournalDescTemplate] = useState<string>('')
  const [editJournalLocationCode, setEditJournalLocationCode] = useState<string>('')
  const [editJournalFundId, setEditJournalFundId] = useState<string>('')
  const [editJournalCurrency, setEditJournalCurrency] = useState<string>('')
  const [editJournalExchangeRate, setEditJournalExchangeRate] = useState<string>('')
  const [editJournalVoucherType, setEditJournalVoucherType] = useState<string>('payment')
  const [editJournalPaymentMethod, setEditJournalPaymentMethod] = useState<string>('cash')
  const [editJournalDefaultPayee, setEditJournalDefaultPayee] = useState<string>('')
  const [editJournalDescTemplate, setEditJournalDescTemplate] = useState<string>('')
  const [deleteJournalDialogOpen, setDeleteJournalDialogOpen] = useState(false)
  const [journalToDelete, setJournalToDelete] = useState<Journal | null>(null)
  const [forceDeleteJournalDialogOpen, setForceDeleteJournalDialogOpen] = useState(false)
  const [journalToForceDelete, setJournalToForceDelete] = useState<Journal | null>(null)
  // Prefill edit journal form when opening Edit dialog
  useEffect(() => {
    if (editJournalDialogOpen && journalToEdit) {
      setEditJournalName(journalToEdit.name)
      setEditJournalCode(journalToEdit.code)
      setEditJournalProjectId(journalToEdit.project_id ? String(journalToEdit.project_id) : '')
      setEditJournalOfficeId(journalToEdit.office_id ? String(journalToEdit.office_id) : '')
      setEditJournalProvinceCode(journalToEdit.province_code ?? '')
      setEditJournalIsActive(journalToEdit.is_active)
      setEditJournalLocationCode(journalToEdit.location_code ?? '')
      setEditJournalFundId(journalToEdit.fund_id ? String(journalToEdit.fund_id) : '')
      setEditJournalCurrency(journalToEdit.currency ?? '')
      setEditJournalExchangeRate(
        journalToEdit.exchange_rate != null && journalToEdit.exchange_rate !== ''
          ? String(journalToEdit.exchange_rate)
          : ''
      )
      setEditJournalVoucherType(journalToEdit.voucher_type ?? 'payment')
      setEditJournalPaymentMethod(journalToEdit.payment_method ?? 'cash')
      setEditJournalDefaultPayee(journalToEdit.default_payee_name ?? '')
      setEditJournalDescTemplate(journalToEdit.voucher_description_template ?? '')
    }
  }, [editJournalDialogOpen, journalToEdit])

  const journalBookCurrencyDisabled = useMemo(
    () => !!newJournalProjectId && !activeCurrenciesLoading && !hasOrganizationCurrencies,
    [newJournalProjectId, activeCurrenciesLoading, hasOrganizationCurrencies]
  )

  /** Include current book currency if it is no longer in the org active list (so users can still see/save). */
  const editJournalCurrencyOptions = useMemo((): CurrencyOption[] => {
    const base = currencySelectOptions.map((o) => ({ ...o }))
    const cur = editJournalCurrency.trim().toUpperCase()
    if (cur && !base.some((o) => o.code === cur)) {
      base.unshift({ code: cur, name: `${cur} (current book)`, symbol: '' })
    }
    return base
  }, [currencySelectOptions, editJournalCurrency])

  /**
   * New book: if the project suggests a code that is not in the active list (e.g. deactivated), show it so the user can fix General Ledger → Currency.
   * When there are no org currencies at all, do not add a synthetic row — creation stays blocked until currencies are configured.
   */
  const newJournalCurrencyOptions = useMemo((): CurrencyOption[] => {
    const base = currencySelectOptions.map((o) => ({ ...o }))
    const cur = newJournalCurrency.trim().toUpperCase()
    if (hasOrganizationCurrencies && cur && !base.some((o) => o.code === cur)) {
      base.unshift({ code: cur, name: `${cur} (from project — activate under General Ledger → Currency if needed)`, symbol: '' })
    }
    return base
  }, [currencySelectOptions, newJournalCurrency, hasOrganizationCurrencies])

  const { toast } = useToast()
  const queryClient = useQueryClient()

  const canViewJournalBooks = useHasPermission('view-journal-books')
  const canCreateJournalBooks = useHasPermission('create-journal-books')
  const canEditJournalBooks = useHasPermission('edit-journal-books')
  const canDeleteJournalBooks = useHasPermission('delete-journal-books')
  const canForceDeleteJournalBooks = useHasPermission('delete-journal-books-permanently')
  const canLoadJournalBookOptions =
    canViewJournalBooks || canCreateJournalBooks || canEditJournalBooks

  // Project list for page (e.g. filter, title) — active projects only
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => getProjects({ per_page: 200, status: 'active' }),
    staleTime: 10 * 60 * 1000,
  })
  const projects = Array.isArray(projectsData) ? projectsData : (projectsData?.data ?? [])

  // All projects for Add/Edit Journal Book (no status filter — show every project)
  const { data: allProjectsData, isLoading: allProjectsLoading } = useQuery({
    queryKey: ['projects-list-all-journal'],
    queryFn: () => getProjects({ per_page: 300 }),
    enabled: newJournalDialogOpen || editJournalDialogOpen,
    staleTime: 10 * 60 * 1000,
  })
  const allProjectsForJournal: {
    id: number
    project_code: string
    project_name: string
    status?: string
    office_id?: number
    grant?: { grant_code?: string; donor?: { name?: string; code?: string; short_name?: string } }
    office?: { name?: string; province?: string; code?: string }
    location?: string | null
    locations?: string[] | null
    locations_list?: string[]
    currency?: string
  }[] = Array.isArray(allProjectsData) ? allProjectsData : (allProjectsData?.data ?? [])

  /** Edit dialog: full project list plus linked project if missing (e.g. inactive project). */
  const projectsForEditJournalBook = useMemo(() => {
    const list = [...allProjectsForJournal]
    if (journalToEdit?.project_id && journalToEdit.project) {
      const pid = journalToEdit.project_id
      if (pid && !list.some((p) => p.id === pid)) {
        list.unshift({
          id: journalToEdit.project.id,
          project_code: journalToEdit.project.project_code,
          project_name: journalToEdit.project.project_name,
        })
      }
    }
    return list
  }, [allProjectsForJournal, journalToEdit])

  // Offices for Journal Book location (main office vs sub office)
  const { data: officesData } = useQuery({
    queryKey: ['offices-list-journals'],
    queryFn: () => getOffices({ per_page: 200, is_active: true }),
    staleTime: 10 * 60 * 1000,
  })
  const officesList: { id: number; name: string; code: string; is_head_office?: boolean }[] = Array.isArray(officesData) ? officesData : []

  // Provinces for Add/Edit Journal Book (location for voucher number)
  const { data: provincesData } = useQuery({
    queryKey: ['journals-provinces'],
    queryFn: getJournalProvinces,
    enabled: canLoadJournalBookOptions && (newJournalDialogOpen || editJournalDialogOpen),
  })
  const provincesList: ProvinceOption[] = provincesData?.provinces ?? []
  const journalLocationOptions = provincesData?.locations ?? []

  const { data: fundsForJournalData } = useQuery({
    queryKey: ['funds-list-journal-books'],
    queryFn: () => getFunds({ per_page: 300, is_active: true }),
    enabled: canLoadJournalBookOptions && (newJournalDialogOpen || editJournalDialogOpen),
  })
  const fundsForJournal: { id: number; fund_code: string; fund_name: string }[] = fundsForJournalData?.data ?? []

  const filteredProvincesForNewJournal = useMemo(() => {
    if (!newJournalProjectId) return provincesList
    const selectedProj = allProjectsForJournal.find((p) => p.id === Number(newJournalProjectId))
    if (!selectedProj) return provincesList
    const locs = selectedProj.locations_list ?? selectedProj.locations ?? []
    if (locs.length === 0) return provincesList
    const filtered = provincesList.filter((pr) =>
      locs.some((loc: string) => loc && pr.name.toLowerCase() === loc.toLowerCase())
    )
    return filtered.length > 0 ? filtered : provincesList
  }, [newJournalProjectId, allProjectsForJournal, provincesList])

  const newJournalProvinceListUsedFallback = useMemo(() => {
    if (!newJournalProjectId) return false
    const selectedProj = allProjectsForJournal.find((p) => p.id === Number(newJournalProjectId))
    if (!selectedProj) return false
    const locs = selectedProj.locations_list ?? selectedProj.locations ?? []
    if (locs.length === 0) return false
    const filtered = provincesList.filter((pr) =>
      locs.some((loc: string) => loc && pr.name.toLowerCase() === loc.toLowerCase())
    )
    return filtered.length === 0 && provincesList.length > 0
  }, [newJournalProjectId, allProjectsForJournal, provincesList])

  /** Fill province when coding-block list loads after project was chosen, or when project/location data allows a match. */
  useEffect(() => {
    if (!newJournalDialogOpen || !newJournalProjectId || provincesList.length === 0) return
    const proj = allProjectsForJournal.find((p) => p.id === Number(newJournalProjectId))
    if (!proj) return
    const code = matchProvinceCodeFromProject(proj, provincesList)
    if (!code) return
    setNewJournalProvinceCode((prev) => (prev ? prev : code))
  }, [newJournalDialogOpen, newJournalProjectId, provincesList, allProjectsForJournal])

  // Journals (journal books) with search and status filter
  const { data: journalsData } = useQuery({
    queryKey: [
      'journals',
      {
        project_id: filterProjectId === 'all' ? undefined : Number(filterProjectId),
        search: journalListSearch.trim() || undefined,
        is_active: showDeletedJournals
          ? undefined
          : journalListStatus === 'all'
            ? undefined
            : journalListStatus === 'active',
        only_trashed: showDeletedJournals,
      },
    ],
    queryFn: () =>
      getJournals({
        per_page: 200,
        project_id: filterProjectId === 'all' ? undefined : Number(filterProjectId),
        search: journalListSearch.trim() || undefined,
        is_active: showDeletedJournals
          ? undefined
          : journalListStatus === 'all'
            ? undefined
            : journalListStatus === 'active',
        only_trashed: showDeletedJournals || undefined,
      }),
    enabled: canViewJournalBooks,
  })
  const journals: Journal[] = journalsData?.data ?? []
  const hasJournalListFilters =
    !!journalListSearch.trim() || journalListStatus !== 'all' || showDeletedJournals

  /** Full journal record for New voucher prefill (list query can omit the selected book). */
  const selectedJournalIdForVoucherPrefill = filterJournalId !== 'all' ? Number(filterJournalId) : 0
  const { data: selectedJournalForVoucherResponse } = useQuery({
    queryKey: ['journal', selectedJournalIdForVoucherPrefill],
    queryFn: () => getJournal(selectedJournalIdForVoucherPrefill),
    enabled: canViewJournalBooks && selectedJournalIdForVoucherPrefill > 0,
  })
  const selectedJournalForVoucher: Journal | null = selectedJournalForVoucherResponse ?? null

  /** Transaction vouchers in the selected project and/or journal book (NGO project expenditure). */
  const shouldListVouchers = filterJournalId !== 'all' || filterProjectId !== 'all'
  const projectIdNum = filterProjectId === 'all' ? undefined : Number(filterProjectId)
  const journalIdNum = filterJournalId === 'all' ? undefined : Number(filterJournalId)
  const { data: entriesData, isLoading, error, refetch } = useQuery({
    queryKey: [
      'vouchers',
      'journal-ledger-main',
      { page, status: filterStatus, voucher_type: filterType, project_id: projectIdNum, journal_id: journalIdNum, search: searchQuery },
    ],
    queryFn: () =>
      getVouchers({
        page,
        per_page: 25,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        voucher_type: filterType !== 'all' ? filterType : undefined,
        project_id: projectIdNum,
        journal_id: journalIdNum,
        search: searchQuery || undefined,
        sort_by: 'voucher_date',
        sort_dir: 'desc',
      }),
    enabled: shouldListVouchers && canViewJournalBooks,
  })

  const entries: Voucher[] = entriesData?.data || []
  const pagination = entriesData?.meta

  // Create journal (new journal book for a project)
  const createJournalMutation = useMutation({
    mutationFn: (data: CreateJournalInput) => createJournal(data),
    onSuccess: (res: { data: Journal }) => {
      queryClient.invalidateQueries({ queryKey: ['journals'] })
      setNewJournalDialogOpen(false)
      setNewJournalName('')
      setNewJournalCode('')
      setNewJournalProjectId('')
      setNewJournalOfficeId('')
      setNewJournalProvinceCode('')
      setNewJournalLocationCode('')
      setNewJournalFundId('')
      setNewJournalCurrency('')
      setNewJournalExchangeRate('')
      setNewJournalVoucherType('payment')
      setNewJournalPaymentMethod('cash')
      setNewJournalDefaultPayee('')
      setNewJournalDescTemplate('')
      setFilterJournalId(String(res.data.id))
      toast({
        title: 'Journal Created',
        description: `"${res.data.name}" is ready. You can add entries to it.`,
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create journal',
        variant: 'destructive',
      })
    },
  })

  // Update journal (edit journal book)
  const updateJournalMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateJournalInput }) => updateJournal(id, data),
    onSuccess: (_, { data }) => {
      queryClient.invalidateQueries({ queryKey: ['journals'] })
      setEditJournalDialogOpen(false)
      setJournalToEdit(null)
      toast({
        title: 'Journal Updated',
        description: 'The journal book has been updated successfully.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update journal',
        variant: 'destructive',
      })
    },
  })

  // Delete journal (journal book) — soft delete
  const deleteJournalMutation = useMutation({
    mutationFn: (id: number) => deleteJournal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journals'] })
      setDeleteJournalDialogOpen(false)
      setJournalToDelete(null)
      toast({
        title: 'Journal book removed',
        description: 'The journal book was moved to deleted. You can restore it from Deleted books if you have permission.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete journal',
        variant: 'destructive',
      })
    },
  })

  const restoreJournalMutation = useMutation({
    mutationFn: (id: number) => restoreJournal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journals'] })
      toast({
        title: 'Journal book restored',
        description: 'The journal book is active again.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to restore journal book',
        variant: 'destructive',
      })
    },
  })

  const forceDeleteJournalMutation = useMutation({
    mutationFn: (id: number) => forceDeleteJournal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journals'] })
      setForceDeleteJournalDialogOpen(false)
      setJournalToForceDelete(null)
      toast({
        title: 'Journal book permanently deleted',
        description: 'Linked entries were detached from this book.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to permanently delete journal book',
        variant: 'destructive',
      })
    },
  })

  const handleAddEntry = () => {
    setVoucherDialogOpen(true)
  }

  const handleOpenVoucher = (v: Voucher) => {
    router.push(`/vouchers/${v.id}/edit`)
  }

  const journalBookForVoucher =
    filterJournalId !== 'all' ? journals.find((j) => j.id === Number(filterJournalId)) : undefined
  const voucherContextSubtitle = journalBookForVoucher ? `Journal book: ${journalBookForVoucher.name}` : undefined
  const journalVoucherPrefill = useMemo(() => journalToVoucherPrefill(selectedJournalForVoucher), [selectedJournalForVoucher])

  const stats = {
    total: entries.length,
    draft: entries.filter((e: Voucher) => e.status === 'draft').length,
    posted: entries.filter((e: Voucher) => e.status === 'posted').length,
    pipeline: entries.filter((e: Voucher) =>
      ['submitted', 'pending_approval', 'approved'].includes(e.status)
    ).length,
  }

  if (shouldListVouchers && error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-4">Failed to load vouchers</p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const selectedProject = projects.find((p: { id: number; project_name?: string; project_code?: string }) => p.id === projectIdNum)
  const journalTitle = selectedProject
    ? `${selectedProject.project_name ?? selectedProject.project_code} — Journal`
    : 'Organization Journal'
  const journalDescription = selectedProject
    ? 'Journal books for this project. Record project expenditure as transaction vouchers (same as Finance → Vouchers), linked to the book when you pick it below.'
    : 'Add and list journal books for your organization\'s projects. Open a book to enter and edit vouchers for that project.'

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <h1 className="sr-only">{journalTitle}</h1>

      {!canViewJournalBooks ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            You do not have permission to view journal books. Ask an administrator to assign{' '}
            <span className="font-medium text-foreground">View Journal Books</span> (or a role that includes it).
          </CardContent>
        </Card>
      ) : (
      <Card className="coa-ledger-card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="coa-toolbar shrink-0 px-3 py-2 md:px-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold leading-tight text-foreground md:text-base">Journal books</h2>
              <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">{journalDescription}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {shouldListVouchers && (
                <>
                  <Button variant="secondary" size="sm" onClick={() => refetch()} disabled={isLoading}>
                    <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
                    Refresh
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/reports">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Trial balance
                    </Link>
                  </Button>
                  {canCreateJournalBooks && (
                    <Button variant="secondary" size="sm" onClick={() => setNewJournalDialogOpen(true)}>
                      <BookOpen className="h-4 w-4 mr-2" />
                      Add Journal Book
                    </Button>
                  )}
                </>
              )}
              {filterProjectId === 'all' && canCreateJournalBooks && (
                <Button size="sm" onClick={() => setNewJournalDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Journal Book
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="coa-toolbar shrink-0 border-t border-border/60 px-3 py-1.5 md:px-4">
          <div className="flex min-h-9 flex-wrap items-center gap-2">
            <p className="mr-1 hidden min-w-[7rem] shrink-0 text-[11px] text-muted-foreground sm:block">
              {hasJournalListFilters
                ? `${journals.length} result${journals.length !== 1 ? 's' : ''}`
                : `${journals.length} book${journals.length !== 1 ? 's' : ''}${filterProjectId === 'all' ? ' (organization)' : ''}`}
            </p>
            <div className="relative min-h-8 min-w-[200px] max-w-md flex-1 basis-[min(100%,12rem)]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search journal books by name or code…"
                value={journalListSearch}
                onChange={(e) => setJournalListSearch(e.target.value)}
                className="h-8 border-border/80 bg-background pl-8 text-xs"
              />
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Select
                value={journalListStatus}
                onValueChange={setJournalListStatus}
                disabled={showDeletedJournals}
              >
                <SelectTrigger className="h-8 w-[130px] shrink-0 border-border/80 bg-background text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              {canDeleteJournalBooks && (
                <div className="flex h-8 shrink-0 items-center gap-2 rounded-md border border-border/80 bg-muted/20 px-2">
                  <Switch
                    id="journal-books-deleted"
                    checked={showDeletedJournals}
                    onCheckedChange={(v) => {
                      setShowDeletedJournals(v)
                      if (v) setJournalListStatus('all')
                    }}
                  />
                  <label htmlFor="journal-books-deleted" className="cursor-pointer text-xs text-muted-foreground whitespace-nowrap">
                    Deleted books
                  </label>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 min-w-[5.5rem] shrink-0 px-2 text-xs"
                disabled={!hasJournalListFilters}
                onClick={() => {
                  setJournalListSearch('')
                  setJournalListStatus('all')
                  setShowDeletedJournals(false)
                }}
              >
                Clear filters
              </Button>
              <span className="min-w-[4.5rem] shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground sm:min-w-[5.5rem]">
                {journals.length} result{journals.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
          <div className="voucher-sheet-grid relative min-h-0 flex-1 overflow-x-auto overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
            <div className="coa-ledger-table-frame min-h-[min(22rem,45vh)] w-full min-w-0">
              <FinanceDataTable
                className="w-full min-w-0 overflow-visible rounded-none border-0 bg-transparent shadow-none"
                tableClassName="w-full min-w-[980px] border-collapse text-sm [&_tbody_td]:text-xs [&_thead_th]:text-xs [&_thead_th]:uppercase [&_thead_th]:tracking-wider"
              >
                  <FinanceDataTableHeader
                    theadClassName="coa-ledger-thead sticky top-0 z-10"
                    className="border-0 shadow-none"
                  >
                    <FinanceDataTableTh align="center" className="min-w-[40px] w-10 py-2 px-2 font-semibold">
                      No
                    </FinanceDataTableTh>
                    <FinanceDataTableTh className="min-w-[120px] py-2 px-2 text-left font-semibold">Project</FinanceDataTableTh>
                    <FinanceDataTableTh className="min-w-[140px] py-2 px-2 text-left font-semibold">Name</FinanceDataTableTh>
                    <FinanceDataTableTh className="min-w-[120px] py-2 px-2 text-left font-semibold">Location</FinanceDataTableTh>
                    <FinanceDataTableTh align="center" className="min-w-[64px] py-2 px-2 font-semibold" title="Book currency (Period Close & voucher defaults)">
                      Ccy
                    </FinanceDataTableTh>
                    <FinanceDataTableTh align="center" className="min-w-[80px] py-2 px-2 font-semibold">
                      Status
                    </FinanceDataTableTh>
                    <FinanceDataTableTh align="right" className="min-w-[100px] py-2 px-2 font-semibold">
                      Total Debit ({baseCurrency})
                    </FinanceDataTableTh>
                    <FinanceDataTableTh align="right" className="min-w-[100px] py-2 px-2 font-semibold">
                      Total Credit ({baseCurrency})
                    </FinanceDataTableTh>
                    <FinanceDataTableTh align="right" className="min-w-[100px] py-2 px-2 font-semibold">
                      Balance ({baseCurrency})
                    </FinanceDataTableTh>
                    <FinanceDataTableTh align="center" className="min-w-[52px] w-[52px] py-2 px-2 font-semibold">
                      Actions
                    </FinanceDataTableTh>
                  </FinanceDataTableHeader>
              <tbody>
                {journals.length === 0 && (
                  <tr>
                    <td colSpan={10} className="min-h-[min(18rem,38vh)] py-12 align-middle text-center">
                      <div className="mx-auto flex max-w-md flex-col items-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-none border border-border bg-muted/30 text-muted-foreground">
                          <BookOpen className="h-7 w-7" />
                        </div>
                        <p className="text-base font-semibold text-foreground">No journal books yet</p>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          Create a journal book for a project or for the organization (main office or sub office), then add entries to it.
                        </p>
                        {canCreateJournalBooks && (
                          <Button variant="outline" size="sm" className="mt-4" onClick={() => setNewJournalDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Journal Book
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                {journals.map((j: Journal, index: number) => (
                  <FinanceDataTableRow
                    key={j.id}
                    className={cn(
                      'group border-b transition-colors touch-manipulation',
                      'cursor-pointer hover:bg-muted/50 active:bg-muted/65',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/45',
                      '[&>td]:align-middle [&>td:not(:last-child)]:cursor-pointer [&>td:last-child]:cursor-default',
                      j.deleted_at && 'opacity-70 bg-muted/15'
                    )}
                    title="Open this journal book"
                    aria-label={`Open journal book: ${j.name}${j.project ? `, project ${j.project.project_name ?? j.project.project_code}` : ', organization-wide'}`}
                    tabIndex={0}
                    onClick={() => router.push(journalBookPath(j.id))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        router.push(journalBookPath(j.id))
                      }
                    }}
                  >
                    <FinanceDataTableTd align="center" className="py-1.5 px-2 tabular-nums text-xs text-muted-foreground">
                      {index + 1}
                    </FinanceDataTableTd>
                    <FinanceDataTableTd className="py-1.5 px-2 text-left text-foreground group-hover:text-foreground">
                      {j.project ? (j.project.project_name ?? j.project.project_code) : 'Organization'}
                    </FinanceDataTableTd>
                    <FinanceDataTableTd className="py-1.5 px-2 text-left font-medium text-foreground">
                      <Link
                        href={journalBookPath(j.id)}
                        prefetch
                        scroll
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                      >
                        {j.name}
                      </Link>
                    </FinanceDataTableTd>
                    <FinanceDataTableTd className="py-1.5 px-2 text-left text-muted-foreground group-hover:text-foreground/90">
                      {j.office ? `${j.office.name}${j.office.is_head_office ? ' (Head)' : ''}` : '—'}
                    </FinanceDataTableTd>
                    <FinanceDataTableTd align="center" className="py-1.5 px-2 font-mono text-xs tabular-nums text-foreground">
                      {j.currency?.trim() ? j.currency.trim().toUpperCase() : '—'}
                    </FinanceDataTableTd>
                    <FinanceDataTableTd align="center" className="py-1.5 px-2">
                      <Badge
                        variant={j.deleted_at ? 'destructive' : j.is_active ? 'default' : 'secondary'}
                        className="inline-flex min-w-[5.5rem] justify-center text-[10px] px-1.5 py-0 rounded-md pointer-events-none"
                      >
                        {j.deleted_at ? 'Deleted' : j.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </FinanceDataTableTd>
                    <FinanceDataTableTd align="right" className="py-1.5 px-2 font-mono text-xs tabular-nums text-foreground">
                      {formatCurrency(Number(j.total_debit ?? 0), baseCurrency)}
                    </FinanceDataTableTd>
                    <FinanceDataTableTd align="right" className="py-1.5 px-2 font-mono text-xs tabular-nums text-foreground">
                      {formatCurrency(Number(j.total_credit ?? 0), baseCurrency)}
                    </FinanceDataTableTd>
                    <FinanceDataTableTd align="right" className="py-1.5 px-2 font-mono text-xs font-medium tabular-nums text-foreground">
                      {formatCurrency(Math.abs(Number(j.balance ?? 0)), baseCurrency)}
                    </FinanceDataTableTd>
                    <FinanceDataTableTd
                      align="center"
                      className="py-1.5 px-2 relative z-[1]"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <ActionMenu
                        triggerClassName="h-8 w-8"
                        menuWidth={200}
                        items={[
                          {
                            label: 'Open journal book',
                            icon: <Eye className="h-4 w-4" />,
                            onClick: () => router.push(journalBookPath(j.id)),
                          },
                          {
                            label: 'Open in new tab',
                            icon: <ExternalLink className="h-4 w-4" />,
                            onClick: () => {
                              if (typeof window !== 'undefined') {
                                window.open(journalBookPath(j.id), '_blank', 'noopener,noreferrer')
                              }
                            },
                          },
                          ...(canEditJournalBooks && !j.deleted_at
                            ? [
                                {
                                  label: 'Edit journal',
                                  icon: <Edit className="h-4 w-4" />,
                                  onClick: () => {
                                    setJournalToEdit(j)
                                    setEditJournalDialogOpen(true)
                                  },
                                },
                              ]
                            : []),
                          ...(canDeleteJournalBooks && !j.deleted_at
                            ? [
                                {
                                  label: 'Delete journal',
                                  icon: <Trash2 className="h-4 w-4" />,
                                  onClick: () => {
                                    setJournalToDelete(j)
                                    setDeleteJournalDialogOpen(true)
                                  },
                                },
                              ]
                            : []),
                          ...(canDeleteJournalBooks && j.deleted_at
                            ? [
                                {
                                  label: 'Restore journal',
                                  icon: <Undo2 className="h-4 w-4" />,
                                  onClick: () => restoreJournalMutation.mutate(j.id),
                                },
                              ]
                            : []),
                          ...(canForceDeleteJournalBooks && j.deleted_at
                            ? [
                                {
                                  label: 'Delete permanently',
                                  icon: <Trash2 className="h-4 w-4" />,
                                  onClick: () => {
                                    setJournalToForceDelete(j)
                                    setForceDeleteJournalDialogOpen(true)
                                  },
                                },
                              ]
                            : []),
                        ]}
                      />
                    </FinanceDataTableTd>
                  </FinanceDataTableRow>
                ))}
              </tbody>
              </FinanceDataTable>
            </div>
          </div>
        </CardContent>

        {/* Summary Stats — when listing vouchers (project and/or journal selected) */}
        {shouldListVouchers && (
          <div className="grid grid-cols-2 gap-3 border-t border-border px-3 py-3 sm:grid-cols-4 md:px-4">
            <div className="flex items-center gap-3 rounded-none border border-border/80 bg-muted/20 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-primary/10">
                <BookOpen className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums">{pagination?.total || stats.total}</p>
                <p className="text-xs text-muted-foreground">Total vouchers</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-none border border-border/80 bg-muted/20 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-muted">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums">{stats.draft}</p>
                <p className="text-xs text-muted-foreground">Draft</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-none border border-border/80 bg-muted/20 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-green-500/10">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums">{stats.posted}</p>
                <p className="text-xs text-muted-foreground">Posted</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-none border border-border/80 bg-muted/20 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-destructive/10">
                <RotateCcw className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums">{stats.pipeline}</p>
                <p className="text-xs text-muted-foreground">In workflow</p>
              </div>
            </div>
          </div>
        )}

        {/* Transaction vouchers — when a project and/or journal book is selected */}
        {shouldListVouchers && (
          <div className="border-t border-border">
            <div className="coa-toolbar shrink-0 px-3 py-2 md:px-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold md:text-base">Transaction vouchers</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Project expenditure and other vouchers linked to the selected journal book or project. Create and edit use the same voucher form as Finance → Vouchers.
                  </p>
                </div>
                <Button
                  onClick={handleAddEntry}
                  size="sm"
                  disabled={filterJournalId === 'all'}
                  title={
                    filterJournalId === 'all'
                      ? 'Select a journal book above, then open the full New Voucher form (same as Vouchers → New voucher).'
                      : 'Opens the full transaction voucher form in a full-screen dialog.'
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New voucher
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Search by entry number, reference, description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 border-border/80 bg-background pl-9 text-xs"
                    />
                  </div>
                  <Select value={filterProjectId} onValueChange={(v) => { setFilterProjectId(v); setFilterJournalId('all'); setPage(1); }}>
                    <SelectTrigger className="h-8 w-[200px] border-border/80 bg-background text-xs">
                      <SelectValue placeholder="Project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All projects</SelectItem>
                      {projects.map((p: { id: number; project_code: string; project_name: string }) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.project_name || p.project_code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterJournalId} onValueChange={(v) => { setFilterJournalId(v); setPage(1); }}>
                    <SelectTrigger className="h-8 w-[200px] border-border/80 bg-background text-xs">
                      <SelectValue placeholder="Journal book" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All journals</SelectItem>
                      {journals.map((j) => (
                        <SelectItem key={j.id} value={String(j.id)}>
                          {j.name} {j.project ? `(${j.project.project_name || j.project.project_code})` : '(Org)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-8 w-[130px] border-border/80 bg-background text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="pending_approval">Pending approval</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="posted">Posted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="h-8 w-[150px] border-border/80 bg-background text-xs">
                      <SelectValue placeholder="Voucher type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All voucher types</SelectItem>
                      <SelectItem value="payment">Payment (expenditure)</SelectItem>
                      <SelectItem value="receipt">Receipt</SelectItem>
                      <SelectItem value="journal">Journal</SelectItem>
                      <SelectItem value="contra">Contra</SelectItem>
                    </SelectContent>
                  </Select>
                  {(searchQuery || filterStatus !== 'all' || filterType !== 'all' || filterProjectId !== 'all' || filterJournalId !== 'all') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setSearchQuery('')
                        setFilterStatus('all')
                        setFilterType('all')
                        setFilterProjectId('all')
                        setFilterJournalId('all')
                        setPage(1)
                      }}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="voucher-sheet-grid min-h-0 overflow-x-auto overflow-y-auto px-3 pb-3 md:px-4">
              <div className="coa-ledger-table-frame w-full min-w-0">
                <table className="w-full min-w-[900px] border-collapse text-sm">
                  <thead className="coa-ledger-thead sticky top-0 z-10">
                    <tr className="uppercase tracking-wider">
                      <th className="px-3 py-2 text-center text-xs font-semibold w-12">No</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold min-w-[80px]">ID</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold min-w-[100px]">Created by</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold min-w-[90px]">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold min-w-[100px]">Voucher #</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold min-w-[120px]">Payee</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold min-w-[90px]">Type</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold min-w-[100px]">Office</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold min-w-[80px]">Status</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold min-w-[90px]">Amount</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold w-20">Actions</th>
                    </tr>
                  </thead>
              <tbody>
                {isLoading && (
                  <>
                    {[...Array(5)].map((_, i) => (
                      <tr key={i} className="border-b">
                        <td className="px-4 py-3"><Skeleton className="h-4 w-6 mx-auto" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-8" /></td>
                      </tr>
                    ))}
                  </>
                )}
                {!isLoading && entries.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-5 text-center text-sm text-muted-foreground">
                      {filterJournalId === 'all'
                        ? 'Select a journal book (and optionally narrow by project), then click New voucher.'
                        : (
                            <>
                              No vouchers found for this filter.
                              <Button variant="link" size="sm" onClick={handleAddEntry} className="ml-2 h-auto p-0">
                                Create your first voucher
                              </Button>
                            </>
                          )}
                    </td>
                  </tr>
                )}
                {!isLoading && entries.map((v: Voucher, index: number) => {
                  const rowNo = ((pagination?.current_page ?? 1) - 1) * (pagination?.per_page ?? 25) + index + 1
                  const location = v.office?.name ?? v.office?.code ?? '—'
                  const lastModifiedBy = v.creator?.name ?? '—'
                  return (
                    <tr key={v.id}>
                      <td className="px-3 py-2 text-center text-xs tabular-nums text-muted-foreground">{rowNo}</td>
                      <td className="px-3 py-2 text-xs font-mono">{v.id}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{lastModifiedBy}</td>
                      <td className="px-3 py-2 text-xs">{formatDate(v.voucher_date)}</td>
                      <td className="px-3 py-2 text-xs font-mono">{v.voucher_number ?? '—'}</td>
                      <td className="px-3 py-2 text-xs font-medium max-w-[140px] truncate" title={v.payee_name ?? ''}>{v.payee_name ?? '—'}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-[10px]">
                          {getVoucherTypeLabel(v.voucher_type)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{location}</td>
                      <td className="px-3 py-2 text-center">
                        <Badge className={cn('mx-auto flex w-fit items-center justify-center gap-1 text-[10px]', getVoucherStatusColor(v.status))}>
                          {statusIcons[v.status] ?? statusIcons.draft}
                          {v.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
                        {formatCurrency(Number(v.total_amount ?? 0), v.currency)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <ActionMenu
                          triggerClassName="h-8 w-8"
                          menuWidth={180}
                          items={[
                            { label: 'Open voucher', icon: <ExternalLink className="h-4 w-4" />, onClick: () => handleOpenVoucher(v) },
                          ]}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {pagination && pagination.last_page > 1 && (
              <div className="flex items-center justify-between border-t border-border px-3 py-2 md:px-4">
                <p className="text-sm text-muted-foreground">
                  Showing {pagination.from} to {pagination.to} of {pagination.total} vouchers
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page === pagination.last_page}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
            </div>
        )}
      </Card>
      )}

      <NewVoucherFullscreenDialog
        open={voucherDialogOpen}
        onOpenChange={(open) => {
          setVoucherDialogOpen(open)
          if (!open) queryClient.invalidateQueries({ queryKey: ['vouchers'] })
        }}
        contextSubtitle={voucherContextSubtitle}
        journalPrefill={journalVoucherPrefill}
      />

      {/* Add Journal Book Dialog */}
      <Dialog open={newJournalDialogOpen} onOpenChange={(open) => { if (open !== newJournalDialogOpen) setNewJournalDialogOpen(open) }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Journal Book</DialogTitle>
            <DialogDescription>
              Pick a project or organization-level book. Choose the coding-block province (required); office defaults from the project when applicable. For project-linked books, set the <span className="font-medium text-foreground">book currency</span> — it drives{' '}
              <span className="font-medium text-foreground">General Ledger → Period close</span> totals and pre-fills vouchers opened from this book.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-journal-project">Project</Label>
              <Select
                value={newJournalProjectId || 'none'}
                onValueChange={(v) => {
                  const id = v === 'none' ? '' : v
                  setNewJournalProjectId(id)
                  if (id) {
                    const proj = allProjectsForJournal.find((p) => p.id === Number(id))
                    if (proj) {
                      setNewJournalName(proj.project_name ?? '')
                      setNewJournalCode((proj.project_code ?? '').replace(/\s+/g, '-'))
                      setNewJournalOfficeId(proj.office_id ? String(proj.office_id) : '')
                      const code =
                        provincesList.length > 0 ? matchProvinceCodeFromProject(proj, provincesList) : null
                      setNewJournalProvinceCode(code ?? '')
                      const ccy = (proj.currency ?? '').trim().toUpperCase()
                      if (ccy.length === 3 && /^[A-Z]{3}$/.test(ccy)) {
                        setNewJournalCurrency(ccy)
                      }
                    }
                  } else {
                    setNewJournalName('')
                    setNewJournalCode('')
                    setNewJournalOfficeId('')
                    setNewJournalProvinceCode('')
                    setNewJournalCurrency('')
                  }
                }}
                disabled={allProjectsLoading}
              >
                <SelectTrigger id="new-journal-project">
                  <SelectValue placeholder={allProjectsLoading ? 'Loading all projects…' : `Select a project (${allProjectsForJournal.length} projects)`} />
                </SelectTrigger>
                <SelectContent className="max-h-[280px]">
                  <SelectItem value="none">Organization (no project)</SelectItem>
                  {allProjectsForJournal.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      <span className="font-mono text-slate-600">{p.project_code}</span>
                      <span className="mx-1.5">—</span>
                      <span>{p.project_name || p.project_code}</span>
                      {p.status ? (
                        <span className="ml-1.5 text-xs text-muted-foreground capitalize">({p.status})</span>
                      ) : null}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                All projects are listed. Select one to fill journal name, code, and location automatically.
              </p>
            </div>
            {newJournalProjectId && (() => {
              const selectedProject = allProjectsForJournal.find((p) => p.id === Number(newJournalProjectId))
              if (!selectedProject) return null
              const donorName = selectedProject.grant?.donor
                ? (selectedProject.grant.donor.short_name || selectedProject.grant.donor.name || selectedProject.grant.donor.code || '—')
                : '—'
              const locationDisplay = selectedProject.office?.name || selectedProject.location || '—'
              return (
                <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Journal book details from project</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                    <span className="text-muted-foreground">Project name</span>
                    <span className="font-medium">{selectedProject.project_name ?? '—'}</span>
                    <span className="text-muted-foreground">Donor</span>
                    <span className="font-medium">{donorName}</span>
                    <span className="text-muted-foreground">Grant code</span>
                    <span className="font-mono font-medium">{selectedProject.grant?.grant_code ?? '—'}</span>
                    <span className="text-muted-foreground">Code</span>
                    <span className="font-mono font-medium">{selectedProject.project_code ?? '—'}</span>
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-medium">{locationDisplay}</span>
                  </div>
                </div>
              )
            })()}
            <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <Label htmlFor="new-journal-province" className="text-foreground">
                Province <span className="text-destructive">*</span>
              </Label>
              <Select
                value={newJournalProvinceCode || 'none'}
                onValueChange={(v) => setNewJournalProvinceCode(v === 'none' ? '' : v)}
              >
                <SelectTrigger id="new-journal-province" className="bg-background">
                  <SelectValue placeholder="Select province (voucher coding block)" />
                </SelectTrigger>
                <SelectContent className="max-h-[240px]">
                  <SelectItem value="none">Select province…</SelectItem>
                  {(newJournalProjectId ? filteredProvincesForNewJournal : provincesList).map((pr) => (
                    <SelectItem key={pr.code} value={pr.code}>
                      {pr.code} — {pr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {newJournalProjectId ? (
                newJournalProvinceListUsedFallback ? (
                  <p className="text-xs text-amber-700 dark:text-amber-500">
                    Project location names did not match any coding-block province; showing all provinces. Pick the one that applies for voucher numbers.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Required so voucher numbers and “New voucher” defaults match this journal book.
                  </p>
                )
              ) : (
                <p className="text-xs text-muted-foreground">
                  Required for organization-level books so “New voucher” can pre-fill province and office from this book.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-journal-name">Journal book name</Label>
              <Input
                id="new-journal-name"
                placeholder="e.g. UNICEF-HER-NUR Journal"
                value={newJournalName}
                onChange={(e) => setNewJournalName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-journal-code">Journal book code</Label>
              <Input
                id="new-journal-code"
                placeholder="e.g. HER-NUR"
                value={newJournalCode}
                onChange={(e) => setNewJournalCode(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-journal-office">Journal location / office (optional)</Label>
              <Select value={newJournalOfficeId || 'none'} onValueChange={(v) => setNewJournalOfficeId(v === 'none' ? '' : v)}>
                <SelectTrigger id="new-journal-office">
                  <SelectValue placeholder="Main office or sub office" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific office</SelectItem>
                  {officesList.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.name}{o.is_head_office ? ' (Head office)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                When a project is selected, this defaults to the project&apos;s office. You can change it to differentiate head vs sub office.
              </p>
            </div>
            <div className="space-y-3 rounded-lg border border-dashed pt-3 pb-3 px-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Voucher defaults (optional)</p>
              <p className="text-xs text-muted-foreground">
                When users record a voucher into this journal book, these values pre-fill the voucher header (same fields as on the voucher form).
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-journal-location-code">Coding-block location</Label>
                  <Select value={newJournalLocationCode || 'none'} onValueChange={(v) => setNewJournalLocationCode(v === 'none' ? '' : v)}>
                    <SelectTrigger id="new-journal-location-code">
                      <SelectValue placeholder="Not set (use project rules)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not set</SelectItem>
                      {journalLocationOptions.map((loc) => (
                        <SelectItem key={loc.code} value={loc.code}>
                          {loc.code} — {loc.name}
                        </SelectItem>
                      ))}
                      {journalLocationOptions.length === 0 ? (
                        <>
                          <SelectItem value="1">1 — Main office</SelectItem>
                          <SelectItem value="2">2 — Sub office</SelectItem>
                          <SelectItem value="3">3 — Sub office</SelectItem>
                        </>
                      ) : null}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-journal-fund">Default fund</Label>
                  <Select value={newJournalFundId || 'none'} onValueChange={(v) => setNewJournalFundId(v === 'none' ? '' : v)}>
                    <SelectTrigger id="new-journal-fund">
                      <SelectValue placeholder="Not set" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[240px]">
                      <SelectItem value="none">Not set</SelectItem>
                      {fundsForJournal.map((f) => (
                        <SelectItem key={f.id} value={String(f.id)}>
                          <span className="font-mono text-xs">{f.fund_code}</span> — {f.fund_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-journal-currency">
                    Book currency{' '}
                    {newJournalProjectId ? (
                      <span className="text-destructive">*</span>
                    ) : (
                      <span className="text-muted-foreground font-normal">(optional)</span>
                    )}
                  </Label>
                  <Select
                    value={newJournalCurrency || 'none'}
                    onValueChange={(v) => setNewJournalCurrency(v === 'none' ? '' : v)}
                    disabled={activeCurrenciesLoading || journalBookCurrencyDisabled}
                  >
                    <SelectTrigger id="new-journal-currency" className="bg-background">
                      <SelectValue
                        placeholder={
                          activeCurrenciesLoading
                            ? 'Loading currencies…'
                            : newJournalProjectId
                              ? 'Select currency (required for project books)'
                              : `Not set — org default ${currenciesHookDefault ?? baseCurrency}`
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-[240px]">
                      <SelectItem value="none">
                        {newJournalProjectId ? 'Select currency…' : `Not set (vouchers use org default ${baseCurrency})`}
                      </SelectItem>
                      {newJournalCurrencyOptions.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          <span className="font-mono">{c.code}</span> — {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!activeCurrenciesLoading && !hasOrganizationCurrencies && (
                    <p className="text-xs text-amber-800 dark:text-amber-200/90">
                      No active currencies in your organization. Add them in{' '}
                      <Link
                        href="/general-ledger/currency"
                        className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
                      >
                        General Ledger → Currency
                      </Link>{' '}
                      (mark as active) to choose a book currency for project-linked journals.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Only <span className="font-medium text-foreground/90">active</span> currencies from organization
                    setup are listed. Required when a project is selected; Period Close uses this for totals in that
                    currency.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-journal-exr">Exchange rate</Label>
                  <Input
                    id="new-journal-exr"
                    type="number"
                    step="any"
                    min={0}
                    placeholder="1"
                    value={newJournalExchangeRate}
                    onChange={(e) => setNewJournalExchangeRate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-journal-vtype">Voucher type</Label>
                  <Select value={newJournalVoucherType} onValueChange={setNewJournalVoucherType}>
                    <SelectTrigger id="new-journal-vtype">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="payment">Payment</SelectItem>
                      <SelectItem value="receipt">Receipt</SelectItem>
                      <SelectItem value="journal">Journal</SelectItem>
                      <SelectItem value="contra">Contra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-journal-pm">Payment method</Label>
                  <Select value={newJournalPaymentMethod} onValueChange={setNewJournalPaymentMethod}>
                    <SelectTrigger id="new-journal-pm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                      <SelectItem value="mobile_money">Mobile money</SelectItem>
                      <SelectItem value="msp">MSP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-journal-payee">Default payee</Label>
                <Input
                  id="new-journal-payee"
                  placeholder="Optional"
                  value={newJournalDefaultPayee}
                  onChange={(e) => setNewJournalDefaultPayee(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-journal-desc-template">Description template</Label>
                <Textarea
                  id="new-journal-desc-template"
                  rows={2}
                  placeholder="Optional text for the voucher description field"
                  value={newJournalDescTemplate}
                  onChange={(e) => setNewJournalDescTemplate(e.target.value)}
                  className="resize-y min-h-[60px]"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setNewJournalDialogOpen(false)
                setNewJournalProvinceCode('')
                setNewJournalLocationCode('')
                setNewJournalFundId('')
                setNewJournalCurrency('')
                setNewJournalExchangeRate('')
                setNewJournalVoucherType('payment')
                setNewJournalPaymentMethod('cash')
                setNewJournalDefaultPayee('')
                setNewJournalDescTemplate('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!newJournalName.trim() || !newJournalCode.trim()) {
                  toast({ title: 'Validation', description: 'Name and Code are required.', variant: 'destructive' })
                  return
                }
                if (!newJournalProvinceCode) {
                  toast({
                    title: 'Validation',
                    description: 'Select a province for this journal book (required for voucher coding and New voucher defaults).',
                    variant: 'destructive',
                  })
                  return
                }
                if (newJournalProjectId && !newJournalCurrency.trim()) {
                  toast({
                    title: 'Validation',
                    description:
                      'Select a book currency for project-linked journal books. It is required for Period Close and voucher defaults.',
                    variant: 'destructive',
                  })
                  return
                }
                const exrRaw = newJournalExchangeRate.trim()
                const exrParsed = exrRaw ? parseFloat(exrRaw) : null
                const exchangeRate =
                  exrParsed != null && !Number.isNaN(exrParsed) && exrParsed >= 0 ? exrParsed : null
                createJournalMutation.mutate({
                  name: newJournalName.trim(),
                  code: newJournalCode.trim().replace(/\s+/g, '-'),
                  project_id: newJournalProjectId ? Number(newJournalProjectId) : null,
                  office_id: newJournalOfficeId ? Number(newJournalOfficeId) : null,
                  province_code: newJournalProvinceCode || null,
                  location_code: newJournalLocationCode || null,
                  fund_id: newJournalFundId ? Number(newJournalFundId) : null,
                  currency: newJournalCurrency.trim() ? newJournalCurrency.trim().toUpperCase() : null,
                  exchange_rate: exchangeRate,
                  voucher_type: newJournalVoucherType || null,
                  payment_method: newJournalPaymentMethod || null,
                  default_payee_name: newJournalDefaultPayee.trim() || null,
                  voucher_description_template: newJournalDescTemplate.trim() || null,
                })
              }}
              disabled={
                createJournalMutation.isPending ||
                !newJournalName.trim() ||
                !newJournalCode.trim() ||
                !newJournalProvinceCode ||
                (!!newJournalProjectId && !newJournalCurrency.trim()) ||
                journalBookCurrencyDisabled
              }
            >
              {createJournalMutation.isPending ? 'Creating…' : 'Create Journal Book'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Journal Book Dialog */}
      <Dialog open={editJournalDialogOpen} onOpenChange={(open) => { if (open !== editJournalDialogOpen) { setEditJournalDialogOpen(open); if (!open) setJournalToEdit(null) } }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Journal Book</DialogTitle>
            <DialogDescription>
              Update name, project, location, or status. Book currency must stay set for project-linked books — it is used for{' '}
              <span className="font-medium text-foreground">Period close</span> totals and voucher defaults.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-journal-name">Name</Label>
              <Input
                id="edit-journal-name"
                placeholder="e.g. UNICEF-HER-NUR Journal"
                value={editJournalName}
                onChange={(e) => setEditJournalName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-journal-code">Code</Label>
              <Input
                id="edit-journal-code"
                placeholder="e.g. HER-NUR"
                value={editJournalCode}
                onChange={(e) => setEditJournalCode(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-journal-project">Project (optional)</Label>
              <Select
                value={editJournalProjectId || 'none'}
                onValueChange={(v) => {
                  const id = v === 'none' ? '' : v
                  setEditJournalProjectId(id)
                  if (!id) {
                    setEditJournalCurrency('')
                  } else {
                    const proj = projectsForEditJournalBook.find((p) => p.id === Number(id))
                    const ccy = (proj?.currency ?? '').trim().toUpperCase()
                    if (ccy.length === 3 && /^[A-Z]{3}$/.test(ccy)) {
                      setEditJournalCurrency(ccy)
                    }
                  }
                }}
              >
                <SelectTrigger id="edit-journal-project">
                  <SelectValue placeholder="Organization-wide or select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Organization (no project)</SelectItem>
                  {projectsForEditJournalBook.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      <span className="font-mono text-slate-600">{p.project_code}</span>
                      <span className="mx-1.5">—</span>
                      <span>{p.project_name || p.project_code}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-journal-office">Location (optional)</Label>
              <Select value={editJournalOfficeId || 'none'} onValueChange={(v) => setEditJournalOfficeId(v === 'none' ? '' : v)}>
                <SelectTrigger id="edit-journal-office">
                  <SelectValue placeholder="Main office or sub office" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific office</SelectItem>
                  {officesList.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.name}{o.is_head_office ? ' (Head office)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-journal-province">Province / location</Label>
              <Select value={editJournalProvinceCode || 'none'} onValueChange={(v) => setEditJournalProvinceCode(v === 'none' ? '' : v)}>
                <SelectTrigger id="edit-journal-province">
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent className="max-h-[240px]">
                  <SelectItem value="none">No province</SelectItem>
                  {provincesList.map((pr) => (
                    <SelectItem key={pr.code} value={pr.code}>
                      {pr.code} — {pr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3 rounded-lg border border-dashed pt-3 pb-3 px-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Voucher defaults (optional)</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-journal-location-code">Coding-block location</Label>
                  <Select value={editJournalLocationCode || 'none'} onValueChange={(v) => setEditJournalLocationCode(v === 'none' ? '' : v)}>
                    <SelectTrigger id="edit-journal-location-code">
                      <SelectValue placeholder="Not set" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not set</SelectItem>
                      {journalLocationOptions.map((loc) => (
                        <SelectItem key={loc.code} value={loc.code}>
                          {loc.code} — {loc.name}
                        </SelectItem>
                      ))}
                      {journalLocationOptions.length === 0 ? (
                        <>
                          <SelectItem value="1">1 — Main office</SelectItem>
                          <SelectItem value="2">2 — Sub office</SelectItem>
                          <SelectItem value="3">3 — Sub office</SelectItem>
                        </>
                      ) : null}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-journal-fund">Default fund</Label>
                  <Select value={editJournalFundId || 'none'} onValueChange={(v) => setEditJournalFundId(v === 'none' ? '' : v)}>
                    <SelectTrigger id="edit-journal-fund">
                      <SelectValue placeholder="Not set" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[240px]">
                      <SelectItem value="none">Not set</SelectItem>
                      {fundsForJournal.map((f) => (
                        <SelectItem key={f.id} value={String(f.id)}>
                          <span className="font-mono text-xs">{f.fund_code}</span> — {f.fund_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-journal-currency">
                    Book currency{' '}
                    {editJournalProjectId ? (
                      <span className="text-destructive">*</span>
                    ) : (
                      <span className="text-muted-foreground font-normal">(optional)</span>
                    )}
                  </Label>
                  <Select
                    value={editJournalCurrency || 'none'}
                    onValueChange={(v) => setEditJournalCurrency(v === 'none' ? '' : v)}
                    disabled={activeCurrenciesLoading}
                  >
                    <SelectTrigger id="edit-journal-currency" className="bg-background">
                      <SelectValue
                        placeholder={activeCurrenciesLoading ? 'Loading currencies…' : 'Select currency'}
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-[240px]">
                      <SelectItem value="none">
                        {editJournalProjectId ? 'Select currency…' : `Not set (org default ${baseCurrency})`}
                      </SelectItem>
                      {editJournalCurrencyOptions.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          <span className="font-mono">{c.code}</span> — {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!activeCurrenciesLoading && !hasOrganizationCurrencies && editJournalProjectId && (
                    <p className="text-xs text-amber-800 dark:text-amber-200/90">
                      Add active currencies under{' '}
                      <Link
                        href="/general-ledger/currency"
                        className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
                      >
                        General Ledger → Currency
                      </Link>
                      . The current book currency may still appear above if it is no longer active.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-journal-exr">Exchange rate</Label>
                  <Input
                    id="edit-journal-exr"
                    type="number"
                    step="any"
                    min={0}
                    placeholder="1"
                    value={editJournalExchangeRate}
                    onChange={(e) => setEditJournalExchangeRate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-journal-vtype">Voucher type</Label>
                  <Select value={editJournalVoucherType} onValueChange={setEditJournalVoucherType}>
                    <SelectTrigger id="edit-journal-vtype">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="payment">Payment</SelectItem>
                      <SelectItem value="receipt">Receipt</SelectItem>
                      <SelectItem value="journal">Journal</SelectItem>
                      <SelectItem value="contra">Contra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-journal-pm">Payment method</Label>
                  <Select value={editJournalPaymentMethod} onValueChange={setEditJournalPaymentMethod}>
                    <SelectTrigger id="edit-journal-pm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                      <SelectItem value="mobile_money">Mobile money</SelectItem>
                      <SelectItem value="msp">MSP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-journal-payee">Default payee</Label>
                <Input
                  id="edit-journal-payee"
                  placeholder="Optional"
                  value={editJournalDefaultPayee}
                  onChange={(e) => setEditJournalDefaultPayee(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-journal-desc-template">Description template</Label>
                <Textarea
                  id="edit-journal-desc-template"
                  rows={2}
                  placeholder="Optional text for the voucher description field"
                  value={editJournalDescTemplate}
                  onChange={(e) => setEditJournalDescTemplate(e.target.value)}
                  className="resize-y min-h-[60px]"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="edit-journal-active"
                checked={editJournalIsActive}
                onCheckedChange={setEditJournalIsActive}
              />
              <Label htmlFor="edit-journal-active" className="font-normal cursor-pointer">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => { setEditJournalDialogOpen(false); setJournalToEdit(null) }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!journalToEdit || !editJournalName.trim() || !editJournalCode.trim()) {
                  toast({ title: 'Validation', description: 'Name and Code are required.', variant: 'destructive' })
                  return
                }
                if (editJournalProjectId && !editJournalProvinceCode) {
                  toast({
                    title: 'Validation',
                    description: 'Select a province when this journal book is linked to a project (required for voucher numbers).',
                    variant: 'destructive',
                  })
                  return
                }
                if (editJournalProjectId && !editJournalCurrency.trim()) {
                  toast({
                    title: 'Validation',
                    description:
                      'Select a book currency when this journal is linked to a project (required for Period Close).',
                    variant: 'destructive',
                  })
                  return
                }
                const exrRaw = editJournalExchangeRate.trim()
                const exrParsed = exrRaw ? parseFloat(exrRaw) : null
                const exchangeRate =
                  exrParsed != null && !Number.isNaN(exrParsed) && exrParsed >= 0 ? exrParsed : null
                updateJournalMutation.mutate({
                  id: journalToEdit.id,
                  data: {
                    name: editJournalName.trim(),
                    code: editJournalCode.trim().replace(/\s+/g, '-'),
                    project_id: editJournalProjectId ? Number(editJournalProjectId) : null,
                    office_id: editJournalOfficeId ? Number(editJournalOfficeId) : null,
                    province_code: editJournalProvinceCode || null,
                    is_active: editJournalIsActive,
                    location_code: editJournalLocationCode || null,
                    fund_id: editJournalFundId ? Number(editJournalFundId) : null,
                    currency: editJournalCurrency.trim() ? editJournalCurrency.trim().toUpperCase() : null,
                    exchange_rate: exchangeRate,
                    voucher_type: editJournalVoucherType || null,
                    payment_method: editJournalPaymentMethod || null,
                    default_payee_name: editJournalDefaultPayee.trim() || null,
                    voucher_description_template: editJournalDescTemplate.trim() || null,
                  },
                })
              }}
              disabled={
                updateJournalMutation.isPending ||
                !editJournalName.trim() ||
                !editJournalCode.trim() ||
                (!!editJournalProjectId && !editJournalProvinceCode) ||
                (!!editJournalProjectId && !editJournalCurrency.trim())
              }
            >
              {updateJournalMutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Journal Confirmation */}
      <AlertDialog open={deleteJournalDialogOpen} onOpenChange={(open) => { if (open !== deleteJournalDialogOpen) { setDeleteJournalDialogOpen(open); if (!open) setJournalToDelete(null) } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete journal book?</AlertDialogTitle>
            <AlertDialogDescription>
              The journal book &quot;{journalToDelete?.name ?? journalToDelete?.code ?? 'this journal'}&quot; will be moved to deleted. Entries stay linked until you restore the book or permanently delete it (if you have that permission).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => journalToDelete && deleteJournalMutation.mutate(journalToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteJournalMutation.isPending}
            >
              {deleteJournalMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={forceDeleteJournalDialogOpen} onOpenChange={(open) => { if (open !== forceDeleteJournalDialogOpen) { setForceDeleteJournalDialogOpen(open); if (!open) setJournalToForceDelete(null) } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete journal book?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes &quot;{journalToForceDelete?.name ?? journalToForceDelete?.code ?? 'this journal'}&quot; forever. Linked journal entries will be detached from this book (they are not deleted).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => journalToForceDelete && forceDeleteJournalMutation.mutate(journalToForceDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={forceDeleteJournalMutation.isPending}
            >
              {forceDeleteJournalMutation.isPending ? 'Removing…' : 'Delete permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}

export default function JournalEntriesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <JournalEntriesPageContent />
    </Suspense>
  )
}
