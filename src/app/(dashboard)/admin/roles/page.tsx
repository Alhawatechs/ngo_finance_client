'use client'

import React, { useState, useEffect } from 'react'
import {
  Shield,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  Lock,
  Check,
  Key,
  Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { FinancePageHeader } from '@/components/finance'
import { handleApiError } from '@/lib/api/client'
import {
  Role,
  Permission,
  PermissionsResponse,
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  getPermissions,
  CreateRoleData,
  UpdateRoleData,
} from '@/lib/api/roles'
import { getOffices, Office } from '@/lib/api/offices'
import { useHasPermission } from '@/stores/authStore'
import { isRestrictedCoaRolePermission } from '@/lib/coa-role-permissions'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export default function AdminRolesPage() {
  const { toast } = useToast()
  
  const [roles, setRoles] = useState<Role[]>([])
  const [offices, setOffices] = useState<Office[]>([])
  const [permissions, setPermissions] = useState<PermissionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [officeFilter, setOfficeFilter] = useState<string>('all')
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState<CreateRoleData>({
    name: '',
    display_name: '',
    description: '',
    office_id: null as number | null,
    permissions: [],
  })

  /** Super Admin / Finance Director — delegate COA permissions to other roles */
  const canAssignCoaPermissions = useHasPermission('assign-chart-of-accounts-permissions')

  useEffect(() => {
    loadData()
  }, [officeFilter])

  const loadData = async () => {
    try {
      setLoading(true)
      const filters: { office_id?: number } = {}
      if (officeFilter !== 'all' && officeFilter !== 'org') {
        filters.office_id = parseInt(officeFilter, 10)
      }
      const [rolesData, permissionsData, officesData] = await Promise.all([
        getRoles(filters),
        getPermissions(),
        getOffices(),
      ])
      setRoles(Array.isArray(rolesData) ? rolesData : [])
      setPermissions(permissionsData)
      setOffices(Array.isArray(officesData) ? officesData : [])
    } catch (error) {
      const message = handleApiError(error)
      toast({
        title: 'Error',
        description: message || 'Failed to load roles',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredRoles = roles
    .filter(role =>
      role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (role.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    )
    .filter(role => {
      if (officeFilter === 'all') return true
      if (officeFilter === 'org') return role.office_id == null
      return role.office_id === parseInt(officeFilter, 10)
    })

  const handleCreateRole = async () => {
    try {
      setFormLoading(true)
      await createRole(formData)
      toast({
        title: 'Success',
        description: 'Role created successfully',
      })
      setIsCreateDialogOpen(false)
      resetForm()
      loadData()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create role',
        variant: 'destructive',
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleUpdateRole = async () => {
    if (!selectedRole) return
    
    try {
      setFormLoading(true)
      const updateData: UpdateRoleData = {
        name: formData.name,
        display_name: formData.display_name,
        description: formData.description,
        office_id: formData.office_id,
        permissions: formData.permissions,
      }
      
      await updateRole(selectedRole.id, updateData)
      toast({
        title: 'Success',
        description: 'Role updated successfully',
      })
      setIsEditDialogOpen(false)
      setIsPermissionsDialogOpen(false)
      resetForm()
      loadData()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update role',
        variant: 'destructive',
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteRole = async () => {
    if (!selectedRole) return
    
    try {
      await deleteRole(selectedRole.id)
      toast({
        title: 'Success',
        description: 'Role deleted successfully',
      })
      setIsDeleteDialogOpen(false)
      setSelectedRole(null)
      loadData()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete role',
        variant: 'destructive',
      })
    }
  }

  const openEditDialog = async (role: Role) => {
    try {
      const fullRole = await getRole(role.id)
      setSelectedRole(fullRole)
      setFormData({
        name: fullRole.name,
        display_name: fullRole.display_name,
        description: fullRole.description || '',
        office_id: fullRole.office_id ?? fullRole.office?.id ?? null,
        permissions: fullRole.permissions?.map(p => p.id) || [],
      })
      setIsEditDialogOpen(true)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load role details',
        variant: 'destructive',
      })
    }
  }

  const openPermissionsDialog = async (role: Role) => {
    try {
      const fullRole = await getRole(role.id)
      setSelectedRole(fullRole)
      setFormData({
        name: fullRole.name,
        display_name: fullRole.display_name,
        description: fullRole.description || '',
        office_id: fullRole.office_id ?? fullRole.office?.id ?? null,
        permissions: fullRole.permissions?.map(p => p.id) || [],
      })
      setIsPermissionsDialogOpen(true)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load role details',
        variant: 'destructive',
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      display_name: '',
      description: '',
      office_id: null,
      permissions: [],
    })
    setSelectedRole(null)
  }

  const togglePermission = (permissionId: number) => {
    if (formData.permissions?.includes(permissionId)) {
      setFormData({
        ...formData,
        permissions: formData.permissions.filter(id => id !== permissionId),
      })
    } else {
      setFormData({
        ...formData,
        permissions: [...(formData.permissions || []), permissionId],
      })
    }
  }

  const toggleModulePermissions = (modulePermissions: Permission[]) => {
    const moduleIds = modulePermissions.map(p => p.id)
    const assignableIds = modulePermissions
      .filter(p => !isRestrictedCoaRolePermission(p.name) || canAssignCoaPermissions)
      .map(p => p.id)
    const allSelected = assignableIds.every(id => formData.permissions?.includes(id))
    
    if (allSelected) {
      setFormData({
        ...formData,
        permissions: formData.permissions?.filter(id => !moduleIds.includes(id)) || [],
      })
    } else {
      const newPermissions = new Set([...(formData.permissions || []), ...assignableIds])
      setFormData({
        ...formData,
        permissions: Array.from(newPermissions),
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Role Management"
        description="Define roles and assign permissions to control access"
        actions={
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Key className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{roles.length}</p>
                <p className="text-sm text-muted-foreground">Total Roles</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <Lock className="h-6 w-6 text-emerald-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{permissions?.permissions.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total Permissions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{roles.filter(r => r.is_system).length}</p>
                <p className="text-sm text-muted-foreground">System Roles</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search roles..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={officeFilter} onValueChange={setOfficeFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Office" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All offices</SelectItem>
                <SelectItem value="org">Main office (org-level only)</SelectItem>
                {offices.map((office) => (
                  <SelectItem key={office.id} value={office.id.toString()}>
                    {office.name} ({office.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRoles.map((role) => (
          <Card key={role.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    role.is_system ? "bg-emerald-100" : "bg-primary/10"
                  )}>
                    <Key className={cn(
                      "h-5 w-5",
                      role.is_system ? "text-emerald-700" : "text-primary"
                    )} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{role.display_name}</CardTitle>
                    <p className="text-xs text-muted-foreground font-mono">{role.name}</p>
                  </div>
                </div>
                {!role.is_system && (
                  <ActionMenu
                    triggerClassName="h-8 w-8"
                    menuWidth={160}
                    items={[
                      { label: 'Edit', icon: <Edit className="h-4 w-4" />, onClick: () => openEditDialog(role) },
                      { label: 'Permissions', icon: <Lock className="h-4 w-4" />, onClick: () => openPermissionsDialog(role) },
                      { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: () => { setSelectedRole(role); setIsDeleteDialogOpen(true); } },
                    ]}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {role.description || 'No description'}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Building2 className="h-3 w-3" />
                <span>{role.office?.name ?? 'Main office (org-level)'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Lock className="h-3 w-3 text-muted-foreground" />
                    <span>{role.permissions_count || 0} permissions</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span>{role.users_count || 0} users</span>
                  </div>
                </div>
                {role.is_system && (
                  <Badge variant="secondary">System</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        
        {filteredRoles.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No roles found
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false)
          setIsEditDialogOpen(false)
          resetForm()
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEditDialogOpen ? 'Edit Role' : 'Create New Role'}</DialogTitle>
            <DialogDescription>
              {isEditDialogOpen ? 'Update role details and permissions' : 'Create a new role with specific permissions'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" required>Role Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  placeholder="e.g., finance-officer"
                />
                <p className="text-xs text-muted-foreground">Lowercase with hyphens, no spaces</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_name" required>Display Name</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="e.g., Finance Officer"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this role's purpose..."
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select
                value={formData.office_id == null ? 'org' : (formData.office_id?.toString() ?? 'org')}
                onValueChange={(value) => setFormData({
                  ...formData,
                  office_id: value === 'org' ? null : parseInt(value, 10),
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="org">Organization level (Main office)</SelectItem>
                  {offices.map((office) => (
                    <SelectItem key={office.id} value={office.id.toString()}>
                      Office: {office.name} ({office.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Organization-level roles apply to main office only. Office-level roles apply to that office.
              </p>
            </div>
            
            {isCreateDialogOpen && (
              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  {permissions?.modules.map((module) => (
                    <div key={module} className="border-b last:border-b-0">
                      <div className="flex items-center justify-between p-3 bg-muted/50">
                        <span className="font-medium capitalize">{module}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleModulePermissions(permissions.grouped[module])}
                        >
                          Select All
                        </Button>
                      </div>
                      <div className="p-3 grid grid-cols-2 gap-2">
                        <TooltipProvider>
                          {permissions.grouped[module]?.map((permission) => {
                            const disabled = isRestrictedCoaRolePermission(permission.name) && !canAssignCoaPermissions
                            return (
                              <Tooltip key={permission.id}>
                                <TooltipTrigger asChild>
                                  <label className={cn(
                                    "flex items-center gap-2",
                                    disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                                  )}>
                                    <input
                                      type="checkbox"
                                      checked={formData.permissions?.includes(permission.id) || false}
                                      onChange={() => !disabled && togglePermission(permission.id)}
                                      disabled={disabled}
                                      className="rounded"
                                    />
                                    <span className="text-sm">{permission.display_name}</span>
                                  </label>
                                </TooltipTrigger>
                                {disabled && (
                                  <TooltipContent>
                                    <p>Only Super Administrator or Finance Director can assign chart of accounts permissions</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            )
                          })}
                        </TooltipProvider>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
              onClick={isEditDialogOpen ? handleUpdateRole : handleCreateRole}
              disabled={formLoading}
            >
              {formLoading ? 'Saving...' : isEditDialogOpen ? 'Update Role' : 'Create Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={isPermissionsDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsPermissionsDialogOpen(false)
          resetForm()
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Manage Permissions - {selectedRole?.display_name}</DialogTitle>
            <DialogDescription>
              Select which permissions this role should have
            </DialogDescription>
          </DialogHeader>
          
          <div className="border rounded-lg max-h-[50vh] overflow-y-auto">
            {permissions?.modules.map((module) => (
              <div key={module} className="border-b last:border-b-0">
                <div className="flex items-center justify-between p-3 bg-muted/50 sticky top-0">
                  <span className="font-medium capitalize">{module}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleModulePermissions(permissions.grouped[module])}
                  >
                    {(permissions.grouped[module] || [])
                      .filter(p => !isRestrictedCoaRolePermission(p.name) || canAssignCoaPermissions)
                      .every(p => formData.permissions?.includes(p.id))
                      ? 'Deselect All' 
                      : 'Select All'}
                  </Button>
                </div>
                <div className="p-3 grid grid-cols-2 gap-3">
                  <TooltipProvider>
                    {permissions.grouped[module]?.map((permission) => {
                      const disabled = isRestrictedCoaRolePermission(permission.name) && !canAssignCoaPermissions
                      return (
                        <Tooltip key={permission.id}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "flex items-center justify-between p-3 border rounded-lg transition-colors",
                                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-muted/50",
                                formData.permissions?.includes(permission.id)
                                  ? "bg-primary/5 border-primary"
                                  : ""
                              )}
                              onClick={() => !disabled && togglePermission(permission.id)}
                            >
                              <div>
                                <p className="font-medium text-sm">{permission.display_name}</p>
                                <p className="text-xs text-muted-foreground font-mono">{permission.name}</p>
                              </div>
                              {formData.permissions?.includes(permission.id) && (
                                <Check className="h-5 w-5 text-primary" />
                              )}
                            </div>
                          </TooltipTrigger>
                          {disabled && (
                            <TooltipContent>
                              <p>Only Super Administrator or Finance Director can assign chart of accounts permissions</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      )
                    })}
                  </TooltipProvider>
                </div>
              </div>
            ))}
          </div>
          
          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-muted-foreground">
                {formData.permissions?.length || 0} permissions selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => {
                  setIsPermissionsDialogOpen(false)
                  resetForm()
                }}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateRole} disabled={formLoading}>
                  {formLoading ? 'Saving...' : 'Save Permissions'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => { if (open !== isDeleteDialogOpen) setIsDeleteDialogOpen(open) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role "{selectedRole?.display_name}"? 
              This action cannot be undone and will remove this role from all assigned users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRole} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
