'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { CurrencySelect } from '@/components/ui/currency-select'
import {
  Plus,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Search,
  Users,
  DollarSign,
  Globe,
  Building2,
  Mail,
  Phone,
  FileText,
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
import { Donor } from '@/types'
import {
  getDonors,
  getDonor,
  createDonor,
  updateDonor,
  deleteDonor,
  getDonorTypeLabel,
  getDonorTypeColor,
  DonorFormData,
  COMMON_DONORS,
} from '@/lib/api/donors'
import { getBudgetFormatTemplates } from '@/lib/api/budgets'
import {
  FinancePageHeader,
  FinanceModuleCard,
  FinanceModuleLinks,
  FinanceFilterBar,
  FinanceEmptyState,
  FinancePagination,
} from '@/components/finance'

export default function DonorsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [donorDialogOpen, setDonorDialogOpen] = useState(false)
  const [editingDonor, setEditingDonor] = useState<Donor | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewingDonor, setViewingDonor] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [donorToDelete, setDonorToDelete] = useState<Donor | null>(null)

  const [donorForm, setDonorForm] = useState<DonorFormData>({
    code: '',
    name: '',
    short_name: '',
    donor_type: 'bilateral',
    reporting_currency: 'USD',
    email: '',
    phone: '',
    contact_person: '',
    address: '',
    country: '',
    website: '',
    reporting_frequency: 'Quarterly',
    default_budget_format_id: null,
  })

  const { toast } = useToast()
  const queryClient = useQueryClient()
  const router = useRouter()

  // Fetch budget format templates for donor default format selector
  const { data: formatsData } = useQuery({
    queryKey: ['budget-format-templates'],
    queryFn: () => getBudgetFormatTemplates(),
  })
  const formatTemplates = (formatsData ?? []) as { id: number; name: string; code: string }[]

  // Fetch donors
  const { data: donorsData, isLoading, refetch } = useQuery({
    queryKey: ['donors', { page, type: filterType, search: searchQuery }],
    queryFn: () => getDonors({
      page,
      per_page: 25,
      donor_type: filterType !== 'all' ? filterType : undefined,
      search: searchQuery || undefined,
    }),
  })

  const rawDonors = donorsData?.data ?? (Array.isArray(donorsData) ? donorsData : null)
  const donors: Donor[] = Array.isArray(rawDonors) ? rawDonors : []
  const pagination = donorsData?.meta

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createDonor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donors'] })
      queryClient.invalidateQueries({ queryKey: ['donors-list'] })
      setDonorDialogOpen(false)
      resetForm()
      toast({ title: 'Donor Created', description: 'The donor has been created successfully.' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to create donor', variant: 'destructive' })
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DonorFormData> }) => updateDonor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donors'] })
      queryClient.invalidateQueries({ queryKey: ['donors-list'] })
      setDonorDialogOpen(false)
      setEditingDonor(null)
      resetForm()
      toast({ title: 'Donor Updated', description: 'The donor has been updated successfully.' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to update donor', variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDonor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donors'] })
      queryClient.invalidateQueries({ queryKey: ['donors-list'] })
      setDeleteDialogOpen(false)
      setDonorToDelete(null)
      toast({ title: 'Donor Deleted', description: 'The donor has been deleted successfully.' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to delete donor', variant: 'destructive' })
    },
  })

  const resetForm = () => {
    setDonorForm({
      code: '',
      name: '',
      short_name: '',
      donor_type: 'bilateral',
      reporting_currency: 'USD',
      email: '',
      phone: '',
      contact_person: '',
      address: '',
      country: '',
      website: '',
      reporting_frequency: 'Quarterly',
      default_budget_format_id: null,
    })
  }

  const handleEdit = (donor: Donor) => {
    setEditingDonor(donor)
    setDonorForm({
      code: donor.code,
      name: donor.name,
      short_name: donor.short_name || '',
      donor_type: donor.donor_type,
      reporting_currency: donor.reporting_currency,
      email: donor.email || '',
      phone: donor.phone || '',
      contact_person: donor.contact_person || '',
      address: donor.address || '',
      country: donor.country || '',
      website: donor.website || '',
      reporting_frequency: donor.reporting_frequency || 'Quarterly',
      default_budget_format_id: donor.default_budget_format_id ?? null,
    })
    setDonorDialogOpen(true)
  }

  const handleView = async (donor: Donor) => {
    try {
      const response = await getDonor(donor.id)
      setViewingDonor(response.data)
      setViewDialogOpen(true)
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load donor details', variant: 'destructive' })
    }
  }

  const handleSave = () => {
    if (editingDonor) {
      updateMutation.mutate({ id: editingDonor.id, data: donorForm })
    } else {
      createMutation.mutate(donorForm)
    }
  }

  const handleSelectCommonDonor = (donorName: string) => {
    const common = COMMON_DONORS.find(d => d.name === donorName)
    if (common) {
      setDonorForm({
        ...donorForm,
        name: common.name,
        donor_type: common.type as any,
        country: common.country,
        code: common.name.replace(/\s+/g, '-').toUpperCase().substring(0, 10),
      })
    }
  }

  // Stats
  const activeCount = donors.filter(d => d.is_active).length

  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Donor register"
        description="Manage donor relationships and track contributions"
        actions={
          <>
            <Button variant="secondary" onClick={() => refetch()}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
            <Button onClick={() => { setEditingDonor(null); resetForm(); setDonorDialogOpen(true) }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Donor
            </Button>
          </>
        }
      />
      <FinanceModuleLinks variant="inline" />

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pagination?.total || donors.length}</p>
              <p className="text-sm text-muted-foreground">Total Donors</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Globe className="h-6 w-6 text-emerald-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">{donors.filter(d => d.donor_type === 'multilateral').length}</p>
              <p className="text-sm text-muted-foreground">Multilateral</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{donors.filter(d => d.donor_type === 'bilateral').length}</p>
              <p className="text-sm text-muted-foreground">Bilateral</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <FinanceModuleCard
        title="Donor register"
        subtitle="View and manage donors. Use search and filters to find specific records."
        icon={<Users className="h-5 w-5" />}
      >
        <FinanceFilterBar
          searchPlaceholder="Search donors..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={refetch}
          isRefreshing={isLoading}
        >
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Donor Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="bilateral">Bilateral</SelectItem>
              <SelectItem value="multilateral">Multilateral</SelectItem>
              <SelectItem value="foundation">Foundation</SelectItem>
              <SelectItem value="corporate">Corporate</SelectItem>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="government">Government</SelectItem>
            </SelectContent>
          </Select>
        </FinanceFilterBar>

        <div className="border rounded-md overflow-hidden">
          {!isLoading && donors.length === 0 ? (
            <FinanceEmptyState
              icon={Users}
              title="No donors found"
              description="Add your first donor to start tracking contributions."
              action={
                <Button onClick={() => { setEditingDonor(null); resetForm(); setDonorDialogOpen(true) }}>
                  Add your first donor
                </Button>
              }
            />
          ) : (
          <table className="w-full">
            <thead>
<tr className="border-b bg-muted/50 uppercase tracking-wider">
              <th className="px-4 py-3 text-left text-sm font-medium">Code</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Contact</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Country</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-8" /></td>
                    </tr>
                  ))}
                </>
              )}
              {!isLoading && donors.map((donor) => (
                <tr key={donor.id} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-sm">{donor.code}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{donor.name}</p>
                      {donor.short_name && (
                        <p className="text-sm text-muted-foreground">{donor.short_name}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={getDonorTypeColor(donor.donor_type)}>
                      {getDonorTypeLabel(donor.donor_type)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {donor.email && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {donor.email}
                      </div>
                    )}
                    {donor.phone && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {donor.phone}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">{donor.country || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={donor.is_active ? 'success' : 'secondary'}>
                      {donor.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ActionMenu
                      triggerClassName="h-8 w-8"
                      items={[
                        { label: 'View profile', icon: <Eye className="h-4 w-4" />, onClick: () => router.push(`/projects/donors/inquiry?id=${donor.id}`) },
                        { label: 'View grants', icon: <FileText className="h-4 w-4" />, onClick: () => router.push(`/projects/donors/grants?donor_id=${donor.id}`) },
                        { label: 'Edit', icon: <Edit className="h-4 w-4" />, onClick: () => handleEdit(donor) },
                        { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: () => { setDonorToDelete(donor); setDeleteDialogOpen(true) }, destructive: true },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}

          {pagination && pagination.last_page > 1 && (
            <FinancePagination
              from={pagination.from}
              to={pagination.to}
              total={pagination.total}
              label="donors"
              onPrevious={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(pagination.last_page, p + 1))}
              previousDisabled={page <= 1}
              nextDisabled={page >= pagination.last_page}
            />
          )}
        </div>
      </FinanceModuleCard>

      {/* Donor Form Dialog */}
      <Dialog
        open={donorDialogOpen}
        onOpenChange={(open) => {
          if (open !== donorDialogOpen) setDonorDialogOpen(open)
        }}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDonor ? 'Edit Donor' : 'Add Donor'}</DialogTitle>
            <DialogDescription>
              {editingDonor ? 'Update donor information' : 'Add a new donor to the system'}
            </DialogDescription>
          </DialogHeader>

          {!editingDonor && (
            <div className="space-y-2 mb-4">
              <Label>Quick Select Common Donor</Label>
              <Select onValueChange={handleSelectCommonDonor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a common donor" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_DONORS.map((d) => (
                    <SelectItem key={d.name} value={d.name}>
                      {d.name} ({getDonorTypeLabel(d.type)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label required>Code</Label>
                <Input
                  placeholder="e.g., UNICEF"
                  value={donorForm.code}
                  onChange={(e) => setDonorForm({ ...donorForm, code: e.target.value.toUpperCase() })}
                  disabled={!!editingDonor}
                />
              </div>
              <div className="space-y-2">
                <Label required>Type</Label>
                <Select
                  value={donorForm.donor_type}
                  onValueChange={(v) => setDonorForm({ ...donorForm, donor_type: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bilateral">Bilateral</SelectItem>
                    <SelectItem value="multilateral">Multilateral</SelectItem>
                    <SelectItem value="foundation">Foundation</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="government">Government</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label required>Full Name</Label>
                <Input
                  placeholder="United Nations Children's Fund"
                  value={donorForm.name}
                  onChange={(e) => setDonorForm({ ...donorForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Short Name</Label>
                <Input
                  placeholder="UNICEF"
                  value={donorForm.short_name || ''}
                  onChange={(e) => setDonorForm({ ...donorForm, short_name: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Country</Label>
                <Input
                  placeholder="Country"
                  value={donorForm.country || ''}
                  onChange={(e) => setDonorForm({ ...donorForm, country: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label required>Reporting Currency</Label>
                <CurrencySelect value={donorForm.reporting_currency || ''} onChange={(v) => setDonorForm({ ...donorForm, reporting_currency: v || 'USD' })} placeholder="Select currency" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input
                  placeholder="Primary contact"
                  value={donorForm.contact_person || ''}
                  onChange={(e) => setDonorForm({ ...donorForm, contact_person: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={donorForm.email || ''}
                  onChange={(e) => setDonorForm({ ...donorForm, email: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  placeholder="Phone number"
                  value={donorForm.phone || ''}
                  onChange={(e) => setDonorForm({ ...donorForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  type="url"
                  placeholder="https://www.example.org"
                  value={donorForm.website || ''}
                  onChange={(e) => setDonorForm({ ...donorForm, website: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Reporting Frequency</Label>
                <Select
                  value={donorForm.reporting_frequency || 'Quarterly'}
                  onValueChange={(v) => setDonorForm({ ...donorForm, reporting_frequency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                    <SelectItem value="Semi-annually">Semi-annually</SelectItem>
                    <SelectItem value="Annually">Annually</SelectItem>
                    <SelectItem value="Ad-hoc">Ad-hoc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Default Budget Format</Label>
                <Select
                  value={donorForm.default_budget_format_id?.toString() ?? 'none'}
                  onValueChange={(v) => setDonorForm({ ...donorForm, default_budget_format_id: v === 'none' ? null : parseInt(v, 10) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="— None —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {formatTemplates.map((f) => (
                      <SelectItem key={f.id} value={String(f.id)}>
                        {f.name} ({f.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Suggested format when creating budgets for projects under this donor&apos;s grants
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDonorDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending || !donorForm.name || !donorForm.code}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Donor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Donor Dialog */}
      <Dialog
        open={viewDialogOpen}
        onOpenChange={(open) => {
          if (open !== viewDialogOpen) setViewDialogOpen(open)
        }}
      >
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Donor Details</DialogTitle>
            <DialogDescription>{viewingDonor?.donor?.code}</DialogDescription>
          </DialogHeader>
          {viewingDonor && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Globe className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{viewingDonor.donor.name}</h3>
                  <Badge className={getDonorTypeColor(viewingDonor.donor.donor_type)}>
                    {getDonorTypeLabel(viewingDonor.donor.donor_type)}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Contact Person</p>
                  <p className="font-medium">{viewingDonor.donor.contact_person || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{viewingDonor.donor.email || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Country</p>
                  <p className="font-medium">{viewingDonor.donor.country || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reporting Currency</p>
                  <p className="font-medium">{viewingDonor.donor.reporting_currency}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Donations</p>
                  <p className="text-xl font-bold">{formatCurrency(viewingDonor.total_donations)}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Active Projects</p>
                  <p className="text-xl font-bold">{viewingDonor.active_projects_count}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Grants ({viewingDonor.grants?.length || 0})</h4>
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {viewingDonor.grants?.length === 0 && (
                    <p className="p-4 text-center text-muted-foreground">No grants</p>
                  )}
                  {viewingDonor.grants?.map((grant: any) => (
                    <div key={grant.id} className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{grant.grant_name}</p>
                        <p className="text-sm text-muted-foreground">{grant.grant_code}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{grant.status}</Badge>
                        <p className="text-sm">{formatCurrency(grant.total_amount)} {grant.currency}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (open !== deleteDialogOpen) setDeleteDialogOpen(open)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Donor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete donor <strong>{donorToDelete?.name}</strong> ({donorToDelete?.code})?
              This action cannot be undone. Donors with linked grants cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => donorToDelete && deleteMutation.mutate(donorToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
