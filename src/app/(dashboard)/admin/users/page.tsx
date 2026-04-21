'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Building,
  Shield,
  UserPlus,
  Loader2,
  ChevronRight,
  KeyRound,
  Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ActionMenu } from '@/components/ui/action-menu'
import { Switch } from '@/components/ui/switch'
import {
  FinancePageHeader,
  FinanceFilterBar,
  FinanceDataTable,
  FinanceDataTableHeader,
  FinanceDataTableTh,
  FinanceDataTableRow,
  FinanceDataTableTd,
  FinanceEmptyState,
} from '@/components/finance'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { useToast } from '@/components/ui/use-toast'
import { User } from '@/lib/api/auth'
import { getUsers, createUser, updateUser, deleteUser, activateUser, deactivateUser, CreateUserData, UpdateUserData } from '@/lib/api/users'
import { APPROVAL_LEVELS } from '@/lib/api/vouchers'
import { handleApiError } from '@/lib/api/client'
import { getRoles, Role } from '@/lib/api/roles'
import { getOffices, Office } from '@/lib/api/offices'
import { cn } from '@/lib/utils'

function AdminUsersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [offices, setOffices] = useState<Office[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [officeFilter, setOfficeFilter] = useState<string>('all')
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState<CreateUserData>({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    employee_id: '',
    phone: '',
    position: '',
    department: '',
    office_id: null as number | null,
    can_manage_all_offices: false,
    roles: [],
    approval_level: 1,
    status: 'active',
  })

  useEffect(() => {
    loadData()
  }, [officeFilter])

  const actionFromUrl = searchParams.get('action')

  // Check for action query param to open create dialog
  useEffect(() => {
    if (actionFromUrl === 'create' && !loading) {
      setIsCreateDialogOpen(true)
      router.replace('/admin/users')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- use primitive URL param to avoid update loop
  }, [actionFromUrl, loading])

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const filters: { office_id?: number; status?: string; search?: string } = {}
      if (officeFilter !== 'all') filters.office_id = parseInt(officeFilter, 10)
      if (statusFilter !== 'all') filters.status = statusFilter
      if (searchTerm.trim()) filters.search = searchTerm.trim()
      const [usersData, rolesData, officesData] = await Promise.all([
        getUsers(filters),
        getRoles(),
        getOffices(),
      ])
      setUsers(Array.isArray(usersData) ? usersData : [])
      setRoles(Array.isArray(rolesData) ? rolesData : [])
      setOffices(Array.isArray(officesData) ? officesData : [])
    } catch (error) {
      const message = handleApiError(error)
      toast({
        title: 'Error',
        description: message || 'Failed to load users',
        variant: 'destructive',
      })
    } finally {
      if (isRefresh) setRefreshing(false)
      else setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const handleCreateUser = async () => {
    try {
      setFormLoading(true)
      await createUser(formData)
      toast({
        title: 'Success',
        description: 'User created successfully',
      })
      setIsCreateDialogOpen(false)
      resetForm()
      loadData()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create user',
        variant: 'destructive',
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleUpdateUser = async () => {
    if (!selectedUser) return
    
    try {
      setFormLoading(true)
      const updateData: UpdateUserData = {
        name: formData.name,
        email: formData.email,
        employee_id: formData.employee_id,
        phone: formData.phone,
        position: formData.position,
        department: formData.department,
        office_id: formData.office_id,
        can_manage_all_offices: formData.can_manage_all_offices,
        roles: formData.roles,
        approval_level: formData.approval_level,
        status: formData.status,
      }
      
      if (formData.password) {
        updateData.password = formData.password
        updateData.password_confirmation = formData.password_confirmation
      }
      
      await updateUser(selectedUser.id, updateData)
      toast({
        title: 'Success',
        description: 'User updated successfully',
      })
      setIsEditDialogOpen(false)
      resetForm()
      loadData()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update user',
        variant: 'destructive',
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return
    
    try {
      await deleteUser(selectedUser.id)
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      })
      setIsDeleteDialogOpen(false)
      setSelectedUser(null)
      loadData()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete user',
        variant: 'destructive',
      })
    }
  }

  const handleToggleStatus = async (user: User) => {
    try {
      if (user.status === 'active') {
        await deactivateUser(user.id)
        toast({ title: 'User deactivated' })
      } else {
        await activateUser(user.id)
        toast({ title: 'User activated' })
      }
      loadData()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update user status',
        variant: 'destructive',
      })
    }
  }

  const openEditDialog = (user: User) => {
    setSelectedUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      password_confirmation: '',
      employee_id: user.employee_id || '',
      phone: user.phone || '',
      position: user.position || '',
      department: user.department || '',
      office_id: user.office?.id ?? user.office_id ?? null,
      can_manage_all_offices: user.can_manage_all_offices ?? false,
      roles: user.roles.map(r => r.id),
      approval_level: Math.min(Math.max(user.approval_level || 1, 1), 4),
      status: user.status,
    })
    setIsEditDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      password_confirmation: '',
      employee_id: '',
      phone: '',
      position: '',
      department: '',
      office_id: null,
      can_manage_all_offices: false,
      roles: [],
      approval_level: 1,
      status: 'active',
    })
    setSelectedUser(null)
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
      active: { variant: 'default', className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200' },
      inactive: { variant: 'secondary', className: 'bg-amber-50 text-amber-800 hover:bg-amber-50 border-amber-200' },
      suspended: { variant: 'destructive', className: 'bg-red-50 text-red-800 hover:bg-red-50 border-red-200' },
    }
    const { variant, className } = config[status] || { variant: 'outline' as const }
    return <Badge variant={variant} className={className}>{status}</Badge>
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading users...</p>
      </div>
    )
  }

  const activeCount = users.filter(u => u.status === 'active').length
  const inactiveCount = users.filter(u => u.status === 'inactive').length

  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="User Management"
        description="Manage system users, roles, and access permissions"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/roles" className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                Roles
                <ChevronRight className="h-3 w-3" />
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/departments" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Departments
                <ChevronRight className="h-3 w-3" />
              </Link>
            </Button>
            <Button variant="outline" onClick={() => router.push('/admin/users/invite')}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-semibold tabular-nums tracking-tight">{users.length}</p>
                <p className="text-sm text-muted-foreground font-medium">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                <UserCheck className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-semibold tabular-nums tracking-tight">{activeCount}</p>
                <p className="text-sm text-muted-foreground font-medium">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                <UserX className="h-6 w-6 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-semibold tabular-nums tracking-tight">{inactiveCount}</p>
                <p className="text-sm text-muted-foreground font-medium">Inactive</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Shield className="h-6 w-6 text-emerald-700" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-semibold tabular-nums tracking-tight">{roles.length}</p>
                <p className="text-sm text-muted-foreground font-medium">Roles</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="pt-6">
          <FinanceFilterBar
            searchPlaceholder="Search by name, email, or employee ID..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            onRefresh={() => loadData(true)}
            isRefreshing={refreshing}
          >
            <Select value={officeFilter} onValueChange={setOfficeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Office" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All offices</SelectItem>
                {offices.map((office) => (
                  <SelectItem key={office.id} value={office.id.toString()}>
                    {office.name} ({office.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </FinanceFilterBar>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-slate-200/80 shadow-sm overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50">
          <CardTitle className="text-base font-semibold">Users</CardTitle>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'} found
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {filteredUsers.length === 0 ? (
            <FinanceEmptyState
              icon={Users}
              title="No users found"
              description="Try adjusting your search or filters. You can also add a new user or invite someone to join."
              action={
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => router.push('/admin/users/invite')}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite User
                  </Button>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </div>
              }
            />
          ) : (
            <FinanceDataTable className="rounded-none border-0" tableClassName="w-full">
                <FinanceDataTableHeader className="bg-slate-100/95 border-b border-slate-200">
                  <FinanceDataTableTh className="min-w-[220px]">User</FinanceDataTableTh>
                  <FinanceDataTableTh className="min-w-[200px]">Contact</FinanceDataTableTh>
                  <FinanceDataTableTh className="min-w-[140px]">Roles</FinanceDataTableTh>
                  <FinanceDataTableTh className="min-w-[140px]">Office</FinanceDataTableTh>
                  <FinanceDataTableTh className="min-w-[100px]">Status</FinanceDataTableTh>
                  <FinanceDataTableTh align="right" className="min-w-[80px]">Actions</FinanceDataTableTh>
                </FinanceDataTableHeader>
                <tbody>
                  {filteredUsers.map((user) => (
                    <FinanceDataTableRow key={user.id} className="group">
                      <FinanceDataTableTd>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                            {user.initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.employee_id || '—'}</p>
                          </div>
                        </div>
                      </FinanceDataTableTd>
                      <FinanceDataTableTd>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3.5 w-3 shrink-0 text-muted-foreground" />
                            <span className="truncate">{user.email}</span>
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3 shrink-0" />
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </FinanceDataTableTd>
                      <FinanceDataTableTd>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.length > 0 ? (
                            user.roles.map((role) => (
                              <Badge
                                key={role.id}
                                variant={role.name === 'super-admin' ? 'default' : 'secondary'}
                                className={role.name === 'super-admin' ? 'text-xs font-medium bg-amber-500/90 hover:bg-amber-500 text-white border-0' : 'text-xs font-medium'}
                              >
                                {role.display_name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </FinanceDataTableTd>
                      <FinanceDataTableTd>
                        <div className="flex items-center gap-2 text-sm">
                          <Building className="h-3.5 w-3 shrink-0 text-muted-foreground" />
                          <span className="truncate">{user.office?.name || '—'}</span>
                        </div>
                      </FinanceDataTableTd>
                      <FinanceDataTableTd>{getStatusBadge(user.status)}</FinanceDataTableTd>
                      <FinanceDataTableTd align="right">
                        <ActionMenu
                          triggerClassName="h-8 w-8"
                          items={[
                            { label: 'Edit', icon: <Edit className="h-4 w-4" />, onClick: () => openEditDialog(user) },
                            { label: user.status === 'active' ? 'Deactivate' : 'Activate', icon: user.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />, onClick: () => handleToggleStatus(user) },
                            { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: () => { setSelectedUser(user); setIsDeleteDialogOpen(true); } },
                          ]}
                        />
                      </FinanceDataTableTd>
                    </FinanceDataTableRow>
                  ))}
                </tbody>
            </FinanceDataTable>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false)
          setIsEditDialogOpen(false)
          resetForm()
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditDialogOpen ? 'Edit User' : 'Create New User'}</DialogTitle>
            <DialogDescription>
              {isEditDialogOpen ? 'Update user information and permissions' : 'Add a new user to the system'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" required>Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" required>Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" required={!isEditDialogOpen}>Password {isEditDialogOpen ? '(leave blank to keep current)' : ''}</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password_confirmation">Confirm Password</Label>
                <Input
                  id="password_confirmation"
                  type="password"
                  value={formData.password_confirmation}
                  onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
                  placeholder="Confirm password"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employee_id">Employee ID</Label>
                <Input
                  id="employee_id"
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  placeholder="e.g., EMP-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="e.g., Finance Manager"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g., Finance"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="office_id">Office</Label>
              <Select
                value={formData.office_id == null ? 'none' : formData.office_id.toString()}
                onValueChange={(value) => setFormData({ ...formData, office_id: value === 'none' ? null : parseInt(value, 10) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select office" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No office (head office)</SelectItem>
                  {offices.map((office) => (
                    <SelectItem key={office.id} value={office.id.toString()}>
                      {office.name} ({office.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="can_manage_all_offices" className="font-medium cursor-pointer">
                  Can manage all offices
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">Central admin access across all offices</p>
              </div>
              <Switch
                id="can_manage_all_offices"
                checked={formData.can_manage_all_offices ?? false}
                onCheckedChange={(checked) => setFormData({ ...formData, can_manage_all_offices: checked })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="approval_level">Approval Level</Label>
                <Select
                  value={String(Math.min(Math.max(formData.approval_level ?? 1, 1), 4))}
                  onValueChange={(value) => setFormData({ ...formData, approval_level: parseInt(value, 10) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {APPROVAL_LEVELS.map((l) => (
                      <SelectItem key={l.level} value={String(l.level)}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'active' | 'inactive' | 'suspended') => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Roles</Label>
              <div className="grid grid-cols-2 gap-2 p-4 border rounded-lg max-h-48 overflow-y-auto">
                {roles.map((role) => (
                  <label key={role.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.roles.includes(role.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, roles: [...formData.roles, role.id] })
                        } else {
                          setFormData({ ...formData, roles: formData.roles.filter(id => id !== role.id) })
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{role.display_name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateDialogOpen(false)
              setIsEditDialogOpen(false)
              resetForm()
            }}>
              Cancel
            </Button>
            <Button 
              onClick={isEditDialogOpen ? handleUpdateUser : handleCreateUser}
              disabled={formLoading}
            >
              {formLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {formLoading ? 'Saving...' : isEditDialogOpen ? 'Update User' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => { if (open !== isDeleteDialogOpen) setIsDeleteDialogOpen(open) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedUser?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading users...</p>
      </div>
    }>
      <AdminUsersContent />
    </Suspense>
  )
}
