'use client'

import React, { useState, useEffect } from 'react'
import {
  Building,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Info,
  FileText,
  MapPin,
  Crown,
  Users,
  Landmark,
  Wallet,
  Briefcase,
  UserPlus,
  Phone,
  Mail,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import {
  Office,
  getOffices,
  createOffice,
  updateOffice,
  deleteOffice,
  CreateOfficeData,
  OfficeKeyStaff,
} from '@/lib/api/offices'
import { handleApiError } from '@/lib/api/client'

export default function OfficeSetupPage() {
  const { toast } = useToast()
  const [offices, setOffices] = useState<Office[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  const [formData, setFormData] = useState<CreateOfficeData>({
    name: '',
    code: '',
    is_head_office: false,
    address: '',
    city: '',
    province: '',
    phone: '',
    email: '',
    manager_name: '',
    description: '',
    key_staff: [],
    timezone: '',
    cost_center_prefix: '',
    operating_hours: '',
    is_active: true,
  })

  const loadOffices = async () => {
    try {
      setLoading(true)
      const data = await getOffices({ search: searchTerm || undefined })
      setOffices(data)
    } catch (error) {
      toast({
        title: 'Error',
        description: handleApiError(error),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOffices()
  }, [searchTerm])

  const filteredOffices = offices.filter(
    (o) =>
      o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.city?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  )

  const handleCreate = async () => {
    try {
      setFormLoading(true)
      await createOffice({
        ...formData,
        address: formData.address || undefined,
        province: formData.province || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        manager_name: formData.manager_name || undefined,
        description: formData.description || undefined,
        key_staff: (formData.key_staff ?? []).filter((s) => s?.name?.trim()),
        timezone: formData.timezone || undefined,
        cost_center_prefix: formData.cost_center_prefix || undefined,
        operating_hours: formData.operating_hours || undefined,
      })
      toast({ title: 'Success', description: 'Regional office added successfully' })
      setIsCreateDialogOpen(false)
      resetForm()
      loadOffices()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || handleApiError(error),
        variant: 'destructive',
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!selectedOffice) return
    try {
      setFormLoading(true)
      await updateOffice(selectedOffice.id, {
        ...formData,
        address: formData.address || undefined,
        province: formData.province || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        manager_name: formData.manager_name || undefined,
        description: formData.description || undefined,
        key_staff: (formData.key_staff ?? []).filter((s) => s?.name?.trim()),
        timezone: formData.timezone || undefined,
        cost_center_prefix: formData.cost_center_prefix || undefined,
        operating_hours: formData.operating_hours || undefined,
      })
      toast({ title: 'Success', description: 'Office updated successfully' })
      setIsEditDialogOpen(false)
      resetForm()
      loadOffices()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || handleApiError(error),
        variant: 'destructive',
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedOffice) return
    try {
      await deleteOffice(selectedOffice.id)
      toast({ title: 'Success', description: 'Office removed successfully' })
      setIsDeleteDialogOpen(false)
      setSelectedOffice(null)
      loadOffices()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || handleApiError(error),
        variant: 'destructive',
      })
    }
  }

  const openView = (office: Office) => {
    setSelectedOffice(office)
    setIsViewDialogOpen(true)
  }

  const openEdit = (office: Office) => {
    setSelectedOffice(office)
    setFormData({
      name: office.name,
      code: office.code,
      is_head_office: office.is_head_office,
      address: office.address || '',
      city: office.city,
      province: office.province || '',
      phone: office.phone || '',
      email: office.email || '',
      manager_name: office.manager_name || '',
      description: office.description || '',
      key_staff: office.key_staff ?? [],
      timezone: office.timezone || '',
      cost_center_prefix: office.cost_center_prefix || '',
      operating_hours: office.operating_hours || '',
      is_active: office.is_active,
    })
    setIsEditDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      is_head_office: false,
      address: '',
      city: '',
      province: '',
      phone: '',
      email: '',
      manager_name: '',
      description: '',
      key_staff: [],
      timezone: '',
      cost_center_prefix: '',
      operating_hours: '',
      is_active: true,
    })
    setSelectedOffice(null)
  }

  const hasHeadOffice = offices.some((o) => o.is_head_office)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Office Setup</h1>
        <p className="text-muted-foreground">
          Configure your organization&apos;s regional offices. Define the head office and all branch
          locations where your organization operates.
        </p>
      </div>

      {/* Setup Guidance */}
      <Card className="border-emerald-200 bg-emerald-50/30">
        <CardContent className="flex items-start gap-3 pt-6">
          <div className="rounded-full bg-emerald-100 p-2">
            <Info className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <h3 className="font-semibold text-emerald-950">Organization → Regional Offices Setup</h3>
            <p className="text-sm text-emerald-800/90 mt-1">
              Configure all sub-offices under your organization. Define the head office and each
              regional branch (e.g., Kabul, Mazar-i-Sharif, Herat, Kandahar). Assign key staff,
              departments, cost centers, timezone, and operating hours per office. This structure
              drives fund allocation, inter-office transfers, location-based reporting, and ERP
              integrations.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Regional Offices Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Regional Offices</CardTitle>
            <CardDescription>
              {offices.length} office{offices.length !== 1 ? 's' : ''} configured
              {!hasHeadOffice && offices.length > 0 && (
                <span className="text-amber-600 font-medium ml-2">— designate a head office</span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search offices..."
                className="pl-9 w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true) }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Regional Office
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading offices...</div>
          ) : filteredOffices.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <MapPin className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-2">No regional offices configured yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Add your organization&apos;s head office and regional branches to get started
              </p>
              <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true) }}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Office
              </Button>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left font-semibold px-4 py-3">Office</th>
                    <th className="text-left font-semibold px-4 py-3">Location</th>
                    <th className="text-left font-semibold px-4 py-3">Contact</th>
                    <th className="text-left font-semibold px-4 py-3">Manager</th>
                    <th className="text-left font-semibold px-4 py-3">Resources</th>
                    <th className="text-left font-semibold px-4 py-3 w-[1%]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOffices.map((office) => (
                    <tr
                      key={office.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-primary/10 rounded">
                            <Building className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{office.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Badge variant="outline" className="text-xs font-mono font-normal">
                                {office.code}
                              </Badge>
                              {office.is_head_office && (
                                <Badge variant="secondary" className="text-xs">
                                  <Crown className="h-3 w-3 mr-0.5" />
                                  Head
                                </Badge>
                              )}
                              {!office.is_active && (
                                <Badge variant="destructive" className="text-xs">Inactive</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {office.address && (
                          <div className="max-w-[180px] truncate" title={office.address}>
                            {office.address}
                          </div>
                        )}
                        {(office.city || office.province) ? (
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {[office.city, office.province].filter(Boolean).join(', ')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/70">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {office.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 shrink-0" />
                            {office.phone}
                          </div>
                        )}
                        {office.email && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[160px]" title={office.email}>
                              {office.email}
                            </span>
                          </div>
                        )}
                        {!office.phone && !office.email && (
                          <span className="text-muted-foreground/70">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {office.manager_name ? (
                          <span>{office.manager_name}</span>
                        ) : (
                          <span className="text-muted-foreground/70">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                          {(office.users_count ?? 0) > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {office.users_count}
                            </span>
                          )}
                          {(office.bank_accounts_count ?? 0) > 0 && (
                            <span className="flex items-center gap-1">
                              <Landmark className="h-3 w-3" />
                              {office.bank_accounts_count}
                            </span>
                          )}
                          {(office.cash_accounts_count ?? 0) > 0 && (
                            <span className="flex items-center gap-1">
                              <Wallet className="h-3 w-3" />
                              {office.cash_accounts_count}
                            </span>
                          )}
                          {(office.departments_count ?? 0) > 0 && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3 w-3" />
                              {office.departments_count}
                            </span>
                          )}
                          {(office.key_staff?.length ?? 0) > 0 && (
                            <span className="flex items-center gap-1">
                              <UserPlus className="h-3 w-3" />
                              {office.key_staff?.length}
                            </span>
                          )}
                          {!(office.users_count ?? 0) && !(office.bank_accounts_count ?? 0) &&
                            !(office.cash_accounts_count ?? 0) && !(office.departments_count ?? 0) &&
                            !(office.key_staff?.length ?? 0) && (
                            <span className="text-muted-foreground/70">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openView(office)}
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(office)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setSelectedOffice(office)
                              setIsDeleteDialogOpen(true)
                            }}
                            disabled={office.is_head_office}
                            title={office.is_head_office ? 'Head office cannot be removed' : 'Delete'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { if (open !== isCreateDialogOpen) setIsCreateDialogOpen(open) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Regional Office</DialogTitle>
            <DialogDescription>
              Add a regional office for your organization. Designate one office as head office.
            </DialogDescription>
          </DialogHeader>
          <OfficeForm formData={formData} setFormData={setFormData} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={formLoading}>
              {formLoading ? 'Adding...' : 'Add Office'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (open !== isEditDialogOpen) setIsEditDialogOpen(open) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Regional Office</DialogTitle>
            <DialogDescription>
              Update office details and location information.
            </DialogDescription>
          </DialogHeader>
          <OfficeForm formData={formData} setFormData={setFormData} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={formLoading}>
              {formLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Office Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={(open) => { if (open !== isViewDialogOpen) setIsViewDialogOpen(open) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              {selectedOffice?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedOffice?.code}
              {selectedOffice?.is_head_office && ' • Head Office'}
              {selectedOffice && !selectedOffice.is_active && ' • Inactive'}
            </DialogDescription>
          </DialogHeader>
          {selectedOffice && (
            <div className="grid gap-6 py-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Address</p>
                  <p className="text-sm">{selectedOffice.address || '—'}</p>
                  <p className="text-sm text-muted-foreground">
                    {[selectedOffice.city, selectedOffice.province].filter(Boolean).join(', ') || '—'}
                  </p>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</p>
                    <p className="text-sm flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {selectedOffice.phone || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</p>
                    <p className="text-sm flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {selectedOffice.email || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Manager</p>
                    <p className="text-sm">{selectedOffice.manager_name || '—'}</p>
                  </div>
                </div>
              </div>
              {selectedOffice.description && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</p>
                  <p className="text-sm text-muted-foreground">{selectedOffice.description}</p>
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                {selectedOffice.timezone && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Timezone</p>
                    <p className="text-sm flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {selectedOffice.timezone}
                    </p>
                  </div>
                )}
                {selectedOffice.operating_hours && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Operating hours</p>
                    <p className="text-sm">{selectedOffice.operating_hours}</p>
                  </div>
                )}
                {selectedOffice.cost_center_prefix && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cost center prefix</p>
                    <p className="text-sm font-mono">{selectedOffice.cost_center_prefix}</p>
                  </div>
                )}
              </div>
              {(selectedOffice.key_staff?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Key staff</p>
                  <ul className="text-sm space-y-1">
                    {selectedOffice.key_staff!.map((s, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <UserPlus className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{s.name}</span>
                        {s.role && <span className="text-muted-foreground">— {s.role}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex items-center gap-2 pt-2 border-t">
                <span className="text-xs text-muted-foreground">
                  Users: {selectedOffice.users_count ?? 0} • Bank: {selectedOffice.bank_accounts_count ?? 0} •
                  Cash: {selectedOffice.cash_accounts_count ?? 0} • Depts: {selectedOffice.departments_count ?? 0}
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setIsViewDialogOpen(false)
                if (selectedOffice) openEdit(selectedOffice)
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit office
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => { if (open !== isDeleteDialogOpen) setIsDeleteDialogOpen(open) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Office</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove &quot;{selectedOffice?.name}&quot; from your
              organization&apos;s office setup? This action cannot be undone. Head office cannot be
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

const COMMON_TIMEZONES = [
  { value: 'Asia/Kabul', label: 'Asia/Kabul (UTC+4:30)' },
  { value: 'Asia/Karachi', label: 'Asia/Karachi (UTC+5)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (UTC+4)' },
  { value: 'Asia/Tehran', label: 'Asia/Tehran (UTC+3:30)' },
  { value: 'Europe/London', label: 'Europe/London (UTC+0)' },
  { value: 'Europe/Brussels', label: 'Europe/Brussels (UTC+1)' },
  { value: 'America/New_York', label: 'America/New_York (UTC-5)' },
  { value: 'UTC', label: 'UTC' },
]

function OfficeForm({
  formData,
  setFormData,
}: {
  formData: CreateOfficeData
  setFormData: React.Dispatch<React.SetStateAction<CreateOfficeData>>
}) {
  const keyStaff = formData.key_staff ?? []

  const addKeyStaff = () => {
    setFormData((p) => ({
      ...p,
      key_staff: [...(p.key_staff ?? []), { name: '', role: '' }],
    }))
  }

  const updateKeyStaff = (index: number, field: keyof OfficeKeyStaff, value: string) => {
    setFormData((p) => ({
      ...p,
      key_staff: (p.key_staff ?? []).map((s, i) =>
        i === index ? { ...s, [field]: value } : s
      ),
    }))
  }

  const removeKeyStaff = (index: number) => {
    setFormData((p) => ({
      ...p,
      key_staff: (p.key_staff ?? []).filter((_, i) => i !== index),
    }))
  }

  return (
    <div className="grid gap-6 py-4">
      {/* Basic Info */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Building className="h-4 w-4" />
          Basic Information
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Kabul Head Office"
            />
          </div>
          <div className="space-y-2">
            <Label>Code</Label>
            <Input
              value={formData.code}
              onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
              placeholder="e.g. KBL"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="head"
              checked={formData.is_head_office}
              onCheckedChange={(v) => setFormData((p) => ({ ...p, is_head_office: v }))}
            />
            <Label htmlFor="head">Head office</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={formData.is_active}
              onCheckedChange={(v) => setFormData((p) => ({ ...p, is_active: v }))}
            />
            <Label htmlFor="active">Active</Label>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
            placeholder="Brief description of office role and responsibilities"
            className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0.5 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
            rows={2}
          />
        </div>
      </div>

      {/* Location & Contact */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Location & Contact
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 col-span-2">
            <Label>Address</Label>
            <Input
              value={formData.address || ''}
              onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
              placeholder="Street address"
            />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input
              value={formData.city}
              onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
              placeholder="City"
            />
          </div>
          <div className="space-y-2">
            <Label>Province</Label>
            <Input
              value={formData.province || ''}
              onChange={(e) => setFormData((p) => ({ ...p, province: e.target.value }))}
              placeholder="Province"
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={formData.phone || ''}
              onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
              placeholder="Phone"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
              placeholder="office@example.com"
            />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Office Manager</Label>
            <Input
              value={formData.manager_name || ''}
              onChange={(e) => setFormData((p) => ({ ...p, manager_name: e.target.value }))}
              placeholder="Full name of office manager"
            />
          </div>
        </div>
      </div>

      {/* ERP / Professional Settings */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          ERP & Operational Settings
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Timezone</Label>
            <select
              value={formData.timezone || ''}
              onChange={(e) => setFormData((p) => ({ ...p, timezone: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-0.5 focus-visible:ring-ring focus-visible:ring-offset-0"
            >
              <option value="">Select timezone</option>
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Operating Hours</Label>
            <Input
              value={formData.operating_hours || ''}
              onChange={(e) => setFormData((p) => ({ ...p, operating_hours: e.target.value }))}
              placeholder="e.g. 08:00-17:00"
            />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Cost Center Prefix</Label>
            <Input
              value={formData.cost_center_prefix || ''}
              onChange={(e) => setFormData((p) => ({ ...p, cost_center_prefix: e.target.value.toUpperCase() }))}
              placeholder="e.g. KBL, MZR for cost center coding"
            />
            <p className="text-xs text-muted-foreground">
              Prefix used for ERP cost center and project coding
            </p>
          </div>
        </div>
      </div>

      {/* Key Staff */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Key Staff
        </h4>
        <p className="text-xs text-muted-foreground">
          Finance officers, admin leads, or other key personnel at this office
        </p>
        {keyStaff.length === 0 ? (
          <Button type="button" variant="outline" size="sm" onClick={addKeyStaff}>
            <Plus className="h-4 w-4 mr-2" />
            Add Key Staff
          </Button>
        ) : (
          <div className="space-y-3">
            {keyStaff.map((staff, index) => (
              <div
                key={index}
                className="grid grid-cols-12 gap-2 items-start p-3 rounded-lg border bg-muted/30"
              >
                <Input
                  value={staff.name}
                  onChange={(e) => updateKeyStaff(index, 'name', e.target.value)}
                  placeholder="Name"
                  className="col-span-3"
                />
                <Input
                  value={staff.role || ''}
                  onChange={(e) => updateKeyStaff(index, 'role', e.target.value)}
                  placeholder="Role"
                  className="col-span-2"
                />
                <Input
                  type="email"
                  value={staff.email || ''}
                  onChange={(e) => updateKeyStaff(index, 'email', e.target.value)}
                  placeholder="Email"
                  className="col-span-2"
                />
                <Input
                  value={staff.phone || ''}
                  onChange={(e) => updateKeyStaff(index, 'phone', e.target.value)}
                  placeholder="Phone"
                  className="col-span-2"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="col-span-1 text-destructive hover:text-destructive"
                  onClick={() => removeKeyStaff(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addKeyStaff}>
              <Plus className="h-4 w-4 mr-2" />
              Add Another
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
