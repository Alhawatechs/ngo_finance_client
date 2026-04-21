'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  AlertTriangle,
  Building2,
  Mail,
  Phone,
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
import { FinanceModuleLinks } from '@/components/finance'
import {
  getVendors,
  getVendor,
  createVendor,
  updateVendor,
  deleteVendor,
  getVendorTypeLabel,
  getVendorTypeColor,
  getInvoiceStatusColor,
  getInvoiceStatusLabel,
  Vendor,
  VendorFormData,
  VendorInvoice,
} from '@/lib/api/vendors'

export default function VendorsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewingVendor, setViewingVendor] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null)

  const [vendorForm, setVendorForm] = useState<VendorFormData>({
    name: '',
    vendor_type: 'supplier',
    currency: 'USD',
    email: '',
    phone: '',
    contact_person: '',
    address: '',
    city: '',
    country: 'Afghanistan',
    bank_name: '',
    bank_account_number: '',
    payment_terms: 'Net 30',
  })

  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch vendors
  const { data: vendorsData, isLoading, refetch } = useQuery({
    queryKey: ['vendors', { page, type: filterType, search: searchQuery }],
    queryFn: () => getVendors({
      page,
      per_page: 25,
      vendor_type: filterType !== 'all' ? filterType : undefined,
      search: searchQuery || undefined,
    }),
  })

  const vendors: Vendor[] = vendorsData?.data || []
  const pagination = vendorsData?.meta

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      setVendorDialogOpen(false)
      resetForm()
      toast({ title: 'Vendor Created', description: 'The vendor has been created successfully.' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to create vendor', variant: 'destructive' })
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<VendorFormData> }) => updateVendor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      setVendorDialogOpen(false)
      setEditingVendor(null)
      resetForm()
      toast({ title: 'Vendor Updated', description: 'The vendor has been updated successfully.' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to update vendor', variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      setDeleteDialogOpen(false)
      setVendorToDelete(null)
      toast({ title: 'Vendor Deleted', description: 'The vendor has been deleted successfully.' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to delete vendor', variant: 'destructive' })
    },
  })

  const resetForm = () => {
    setVendorForm({
      name: '',
      vendor_type: 'supplier',
      currency: 'USD',
      email: '',
      phone: '',
      contact_person: '',
      address: '',
      city: '',
      country: 'Afghanistan',
      bank_name: '',
      bank_account_number: '',
      payment_terms: 'Net 30',
    })
  }

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor)
    setVendorForm({
      name: vendor.name,
      vendor_type: vendor.vendor_type,
      currency: vendor.currency,
      email: vendor.email || '',
      phone: vendor.phone || '',
      contact_person: vendor.contact_person || '',
      address: vendor.address || '',
      city: vendor.city || '',
      country: vendor.country || 'Afghanistan',
      bank_name: vendor.bank_name || '',
      bank_account_number: vendor.bank_account_number || '',
      payment_terms: vendor.payment_terms || 'Net 30',
      tax_id: vendor.tax_id || '',
      credit_limit: vendor.credit_limit || undefined,
      notes: vendor.notes || '',
    })
    setVendorDialogOpen(true)
  }

  const handleView = async (vendor: Vendor) => {
    try {
      const response = await getVendor(vendor.id)
      setViewingVendor(response.data)
      setViewDialogOpen(true)
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load vendor details', variant: 'destructive' })
    }
  }

  const handleSave = () => {
    if (editingVendor) {
      updateMutation.mutate({ id: editingVendor.id, data: vendorForm })
    } else {
      createMutation.mutate(vendorForm)
    }
  }

  // Stats
  const totalBalance = vendors.reduce((sum, v) => sum + v.current_balance, 0)
  const activeCount = vendors.filter(v => v.is_active).length

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Vendors</h1>
          <p className="text-muted-foreground">
            Manage vendors and suppliers for accounts payable
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => refetch()}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => { setEditingVendor(null); resetForm(); setVendorDialogOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Vendor
          </Button>
        </div>
      </div>
      <FinanceModuleLinks variant="inline" />

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pagination?.total || vendors.length}</p>
              <p className="text-sm text-muted-foreground">Total Vendors</p>
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
            <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p>
              <p className="text-sm text-muted-foreground">Total Payable</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">Overdue</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vendors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Vendor Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="supplier">Supplier</SelectItem>
                <SelectItem value="contractor">Contractor</SelectItem>
                <SelectItem value="consultant">Consultant</SelectItem>
                <SelectItem value="service_provider">Service Provider</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vendors Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">Code</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Contact</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Balance</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
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
              {!isLoading && vendors.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No vendors found.
                    <Button variant="link" onClick={() => { setEditingVendor(null); resetForm(); setVendorDialogOpen(true) }} className="ml-2">
                      Add your first vendor
                    </Button>
                  </td>
                </tr>
              )}
              {!isLoading && vendors.map((vendor) => (
                <tr key={vendor.id} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-sm">{vendor.vendor_code}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{vendor.name}</p>
                      {vendor.contact_person && (
                        <p className="text-sm text-muted-foreground">{vendor.contact_person}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={getVendorTypeColor(vendor.vendor_type)}>
                      {getVendorTypeLabel(vendor.vendor_type)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {vendor.email && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {vendor.email}
                      </div>
                    )}
                    {vendor.phone && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {vendor.phone}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {vendor.currency} {formatCurrency(vendor.current_balance)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={vendor.is_active ? 'success' : 'secondary'}>
                      {vendor.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ActionMenu
                      triggerClassName="h-8 w-8"
                      items={[
                        { label: 'View Details', icon: <Eye className="h-4 w-4" />, onClick: () => handleView(vendor) },
                        { label: 'Edit', icon: <Edit className="h-4 w-4" />, onClick: () => handleEdit(vendor) },
                        { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: () => { setVendorToDelete(vendor); setDeleteDialogOpen(true) }, destructive: true },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination && pagination.last_page > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {pagination.from} to {pagination.to} of {pagination.total} vendors
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
        </CardContent>
      </Card>

      {/* Vendor Form Dialog */}
      <Dialog open={vendorDialogOpen} onOpenChange={(open) => { if (open !== vendorDialogOpen) setVendorDialogOpen(open) }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
            <DialogDescription>
              {editingVendor ? 'Update vendor information' : 'Add a new vendor to the system'}
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="banking">Banking</TabsTrigger>
            </TabsList>
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label required>Name</Label>
                  <Input
                    placeholder="Vendor name"
                    value={vendorForm.name}
                    onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label required>Type</Label>
                  <Select
                    value={vendorForm.vendor_type}
                    onValueChange={(v) => setVendorForm({ ...vendorForm, vendor_type: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supplier">Supplier</SelectItem>
                      <SelectItem value="contractor">Contractor</SelectItem>
                      <SelectItem value="consultant">Consultant</SelectItem>
                      <SelectItem value="service_provider">Service Provider</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label required>Currency</Label>
                  <CurrencySelect value={vendorForm.currency || ''} onChange={(v) => setVendorForm({ ...vendorForm, currency: v || 'USD' })} placeholder="Select currency" />
                </div>
                <div className="space-y-2">
                  <Label>Tax ID</Label>
                  <Input
                    placeholder="Tax identification number"
                    value={vendorForm.tax_id || ''}
                    onChange={(e) => setVendorForm({ ...vendorForm, tax_id: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <Select
                    value={vendorForm.payment_terms || 'Net 30'}
                    onValueChange={(v) => setVendorForm({ ...vendorForm, payment_terms: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Immediate">Immediate</SelectItem>
                      <SelectItem value="Net 15">Net 15</SelectItem>
                      <SelectItem value="Net 30">Net 30</SelectItem>
                      <SelectItem value="Net 45">Net 45</SelectItem>
                      <SelectItem value="Net 60">Net 60</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Credit Limit</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={vendorForm.credit_limit || ''}
                    onChange={(e) => setVendorForm({ ...vendorForm, credit_limit: parseFloat(e.target.value) || undefined })}
                  />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="contact" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Person</Label>
                  <Input
                    placeholder="Primary contact name"
                    value={vendorForm.contact_person || ''}
                    onChange={(e) => setVendorForm({ ...vendorForm, contact_person: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={vendorForm.email || ''}
                    onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    placeholder="Phone number"
                    value={vendorForm.phone || ''}
                    onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mobile</Label>
                  <Input
                    placeholder="Mobile number"
                    value={vendorForm.mobile || ''}
                    onChange={(e) => setVendorForm({ ...vendorForm, mobile: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Textarea
                  placeholder="Street address"
                  value={vendorForm.address || ''}
                  onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    placeholder="City"
                    value={vendorForm.city || ''}
                    onChange={(e) => setVendorForm({ ...vendorForm, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input
                    placeholder="Country"
                    value={vendorForm.country || ''}
                    onChange={(e) => setVendorForm({ ...vendorForm, country: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="banking" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input
                  placeholder="Bank name"
                  value={vendorForm.bank_name || ''}
                  onChange={(e) => setVendorForm({ ...vendorForm, bank_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input
                    placeholder="Bank account number"
                    value={vendorForm.bank_account_number || ''}
                    onChange={(e) => setVendorForm({ ...vendorForm, bank_account_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <Input
                    placeholder="Account holder name"
                    value={vendorForm.bank_account_name || ''}
                    onChange={(e) => setVendorForm({ ...vendorForm, bank_account_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Additional notes..."
                  value={vendorForm.notes || ''}
                  onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setVendorDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending || !vendorForm.name}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Vendor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Vendor Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={(open) => { if (open !== viewDialogOpen) setViewDialogOpen(open) }}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Vendor Details</DialogTitle>
            <DialogDescription>{viewingVendor?.vendor?.vendor_code}</DialogDescription>
          </DialogHeader>
          {viewingVendor && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{viewingVendor.vendor.name}</h3>
                  <Badge className={getVendorTypeColor(viewingVendor.vendor.vendor_type)}>
                    {getVendorTypeLabel(viewingVendor.vendor.vendor_type)}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Contact Person</p>
                  <p className="font-medium">{viewingVendor.vendor.contact_person || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{viewingVendor.vendor.email || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium">{viewingVendor.vendor.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payment Terms</p>
                  <p className="font-medium">{viewingVendor.vendor.payment_terms || '-'}</p>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span>Outstanding Balance</span>
                  <span className="text-xl font-bold">
                    {viewingVendor.vendor.currency} {formatCurrency(viewingVendor.outstanding_balance)}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Recent Invoices</h4>
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {viewingVendor.recent_invoices?.length === 0 && (
                    <p className="p-4 text-center text-muted-foreground">No invoices</p>
                  )}
                  {viewingVendor.recent_invoices?.map((inv: VendorInvoice) => (
                    <div key={inv.id} className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-mono text-sm">{inv.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(inv.invoice_date)}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={getInvoiceStatusColor(inv.status)}>
                          {getInvoiceStatusLabel(inv.status)}
                        </Badge>
                        <p className="text-sm font-mono">{formatCurrency(inv.total_amount)}</p>
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (open !== deleteDialogOpen) setDeleteDialogOpen(open) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete vendor <strong>{vendorToDelete?.name}</strong> ({vendorToDelete?.vendor_code})?
              This action cannot be undone. Vendors with outstanding invoices cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => vendorToDelete && deleteMutation.mutate(vendorToDelete.id)}
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
