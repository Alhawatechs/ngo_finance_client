'use client'

import React, { useState, useEffect } from 'react'
import {
  Building,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  MapPin,
  Crown,
  Users,
  Landmark,
  Wallet,
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
} from '@/lib/api/offices'
import { handleApiError } from '@/lib/api/client'

export default function OfficesManagementPage() {
  const { toast } = useToast()
  const [offices, setOffices] = useState<Office[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
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
      })
      toast({ title: 'Success', description: 'Office created successfully' })
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
      toast({ title: 'Success', description: 'Office deleted successfully' })
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
      is_active: true,
    })
    setSelectedOffice(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Regional Offices</h1>
        <p className="text-muted-foreground">
          Manage regional offices and locations. One office can be set as head office.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Regional Offices</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search regional offices..."
                className="pl-9 w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true) }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Office
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading regional offices...</div>
          ) : filteredOffices.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No regional offices found.</div>
          ) : (
            <div className="space-y-1">
              {filteredOffices.map((office) => (
                <div
                  key={office.id}
                  className="flex items-center justify-between py-3 px-4 hover:bg-muted/50 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded">
                      <Building className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{office.name}</span>
                        <Badge variant="outline" className="text-xs font-mono">
                          {office.code}
                        </Badge>
                        {office.is_head_office && (
                          <Badge variant="secondary" className="text-xs">
                            <Crown className="h-3 w-3 mr-1" />
                            Head Office
                          </Badge>
                        )}
                        {!office.is_active && (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        {office.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {office.city}
                            {office.province && `, ${office.province}`}
                          </span>
                        )}
                        {(office.users_count ?? 0) > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {office.users_count} users
                          </span>
                        )}
                        {(office.bank_accounts_count ?? 0) > 0 && (
                          <span className="flex items-center gap-1">
                            <Landmark className="h-3 w-3" />
                            {office.bank_accounts_count} bank
                          </span>
                        )}
                        {(office.cash_accounts_count ?? 0) > 0 && (
                          <span className="flex items-center gap-1">
                            <Wallet className="h-3 w-3" />
                            {office.cash_accounts_count} cash
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ActionMenu
                    triggerClassName="h-8 w-8"
                    items={[
                      { label: 'Edit', icon: <Edit className="h-4 w-4" />, onClick: () => openEdit(office) },
                      ...(!office.is_head_office ? [{ label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: () => { setSelectedOffice(office); setIsDeleteDialogOpen(true); } }] : []),
                    ]}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { if (open !== isCreateDialogOpen) setIsCreateDialogOpen(open) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Office</DialogTitle>
            <DialogDescription>Create a new regional office for your organization.</DialogDescription>
          </DialogHeader>
          <OfficeForm formData={formData} setFormData={setFormData} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={formLoading}>
              {formLoading ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (open !== isEditDialogOpen) setIsEditDialogOpen(open) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Office</DialogTitle>
            <DialogDescription>Update regional office details.</DialogDescription>
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

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => { if (open !== isDeleteDialogOpen) setIsDeleteDialogOpen(open) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Office</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedOffice?.name}&quot;? This action cannot be
              undone. Head office cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function OfficeForm({
  formData,
  setFormData,
}: {
  formData: CreateOfficeData
  setFormData: React.Dispatch<React.SetStateAction<CreateOfficeData>>
}) {
  return (
    <div className="grid gap-4 py-4">
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
      <div className="flex items-center space-x-2">
        <Switch
          id="head"
          checked={formData.is_head_office}
          onCheckedChange={(v) => setFormData((p) => ({ ...p, is_head_office: v }))}
        />
        <Label htmlFor="head">Head office</Label>
      </div>
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
          <Label>Manager name</Label>
          <Input
            value={formData.manager_name || ''}
            onChange={(e) => setFormData((p) => ({ ...p, manager_name: e.target.value }))}
            placeholder="Office manager"
          />
        </div>
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
  )
}
