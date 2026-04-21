'use client'

import React, { useState, useEffect } from 'react'
import {
  Building,
  Building2,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  ChevronRight,
  FolderTree,
  UserCircle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import {
  FinancePageHeader,
  FinanceFilterBar,
} from '@/components/finance'
import {
  Department,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  CreateDepartmentData,
} from '@/lib/api/departments'
import { getOffices } from '@/lib/api/offices'
import { getUsers } from '@/lib/api/users'
import { User } from '@/lib/api/auth'
import { handleApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils'

export default function AdminDepartmentsPage() {
  const { toast } = useToast()
  
  const [departments, setDepartments] = useState<Department[]>([])
  const [offices, setOffices] = useState<{ id: number; name: string; code: string }[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState<CreateDepartmentData>({
    code: '',
    name: '',
    description: '',
    office_id: null,
    parent_id: null,
    manager_id: null,
    is_active: true,
    sort_order: 0,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [depts, officesData, usersData] = await Promise.all([
        getDepartments(),
        getOffices(),
        getUsers(),
      ])
      setDepartments(Array.isArray(depts) ? depts : [])
      setOffices(Array.isArray(officesData) ? officesData : [])
      setUsers(Array.isArray(usersData) ? usersData : [])
    } catch (error) {
      const message = handleApiError(error)
      toast({
        title: 'Error',
        description: message || 'Failed to load departments',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (dept.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  )

  // Build tree structure for display
  const buildTree = (depts: Department[], parentId: number | null = null): Department[] => {
    return depts
      .filter(d => d.parent_id === parentId)
      .map(d => ({
        ...d,
        children: buildTree(depts, d.id),
      }))
  }

  const departmentTree = buildTree(filteredDepartments)

  const handleCreateDepartment = async () => {
    try {
      setFormLoading(true)
      await createDepartment(formData)
      toast({
        title: 'Success',
        description: 'Department created successfully',
      })
      setIsCreateDialogOpen(false)
      resetForm()
      loadData()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create department',
        variant: 'destructive',
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleUpdateDepartment = async () => {
    if (!selectedDepartment) return
    
    try {
      setFormLoading(true)
      await updateDepartment(selectedDepartment.id, formData)
      toast({
        title: 'Success',
        description: 'Department updated successfully',
      })
      setIsEditDialogOpen(false)
      resetForm()
      loadData()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update department',
        variant: 'destructive',
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteDepartment = async () => {
    if (!selectedDepartment) return
    
    try {
      await deleteDepartment(selectedDepartment.id)
      toast({
        title: 'Success',
        description: 'Department deleted successfully',
      })
      setIsDeleteDialogOpen(false)
      setSelectedDepartment(null)
      loadData()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete department',
        variant: 'destructive',
      })
    }
  }

  const openEditDialog = (dept: Department) => {
    setSelectedDepartment(dept)
    setFormData({
      code: dept.code,
      name: dept.name,
      description: dept.description || '',
      office_id: dept.office_id ?? null,
      parent_id: dept.parent_id || null,
      manager_id: dept.manager_id || null,
      is_active: dept.is_active,
      sort_order: dept.sort_order,
    })
    setIsEditDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      office_id: null,
      parent_id: null,
      manager_id: null,
      is_active: true,
      sort_order: 0,
    })
    setSelectedDepartment(null)
  }

  // Recursive component for rendering department tree
  const DepartmentNode = ({ dept, level = 0 }: { dept: Department; level?: number }) => (
    <div>
      <div
        className={cn(
          "flex items-center justify-between py-3 px-4 hover:bg-muted/50 border-b",
          level > 0 && "bg-muted/20"
        )}
        style={{ paddingLeft: `${16 + level * 24}px` }}
      >
        <div className="flex items-center gap-3">
          {dept.children && dept.children.length > 0 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <div className="p-2 bg-primary/10 rounded">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{dept.name}</span>
              <Badge variant="outline" className="text-xs font-mono">{dept.code}</Badge>
              {!dept.is_active && (
                <Badge variant="secondary" className="text-xs">Inactive</Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {dept.office && (
                <span className="flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  {dept.office.name} ({dept.office.code})
                </span>
              )}
              {dept.manager && (
                <span className="flex items-center gap-1">
                  <UserCircle className="h-3 w-3" />
                  {dept.manager.name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {dept.users_count || 0} users
              </span>
            </div>
          </div>
        </div>
        <ActionMenu
          triggerClassName="h-8 w-8"
          menuWidth={180}
          items={[
            { label: 'Edit', icon: <Edit className="h-4 w-4" />, onClick: () => openEditDialog(dept) },
            { label: 'Add Sub-Department', icon: <Plus className="h-4 w-4" />, onClick: () => { setFormData(prev => ({ ...prev, parent_id: dept.id })); setIsCreateDialogOpen(true); } },
            { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: () => { setSelectedDepartment(dept); setIsDeleteDialogOpen(true); } },
          ]}
        />
      </div>
      {dept.children && dept.children.map(child => (
        <DepartmentNode key={child.id} dept={child} level={level + 1} />
      ))}
    </div>
  )

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
        title="Departments"
        description="Manage organizational departments and teams. Link managers and structure for reporting and approvals."
        actions={
          <Button onClick={() => {
            resetForm()
            setIsCreateDialogOpen(true)
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Department
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{departments.length}</p>
                <p className="text-sm text-muted-foreground">Total Departments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <FolderTree className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{departments.filter(d => !d.parent_id).length}</p>
                <p className="text-sm text-muted-foreground">Root Departments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <Users className="h-6 w-6 text-emerald-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{departments.reduce((acc, d) => acc + (d.users_count || 0), 0)}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="pt-6">
          <FinanceFilterBar
            searchPlaceholder="Search departments..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            onRefresh={() => loadData()}
          />
        </CardContent>
      </Card>

      {/* Departments Tree */}
      <Card>
        <CardHeader>
          <CardTitle>Department Structure</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {departmentTree.length > 0 ? (
            <div className="border-t">
              {departmentTree.map(dept => (
                <DepartmentNode key={dept.id} dept={dept} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm ? 'No departments found' : 'No departments yet. Create your first department.'}
            </div>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditDialogOpen ? 'Edit Department' : 'Create Department'}</DialogTitle>
            <DialogDescription>
              {isEditDialogOpen ? 'Update department information' : 'Add a new department to your organization'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code" required>Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., FIN"
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name" required>Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Finance"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this department..."
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="office">Regional Office</Label>
              <Select
                value={formData.office_id?.toString() || 'none'}
                onValueChange={(value) => setFormData({ 
                  ...formData, 
                  office_id: value === 'none' ? null : parseInt(value) 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select office (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Org-wide / Head Office</SelectItem>
                  {offices.map(office => (
                    <SelectItem key={office.id} value={office.id.toString()}>
                      {office.name} ({office.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Assign to a specific regional office or leave org-wide
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="parent">Parent Department</Label>
              <Select
                value={formData.parent_id?.toString() || 'none'}
                onValueChange={(value) => setFormData({ 
                  ...formData, 
                  parent_id: value === 'none' ? null : parseInt(value) 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Parent (Root Department)</SelectItem>
                  {departments
                    .filter(d => d.id !== selectedDepartment?.id)
                    .map(dept => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name} ({dept.code})
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="manager">Department Manager</Label>
              <Select
                value={formData.manager_id?.toString() || 'none'}
                onValueChange={(value) => setFormData({ 
                  ...formData, 
                  manager_id: value === 'none' ? null : parseInt(value) 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manager (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Manager</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Active Status</Label>
                <p className="text-sm text-muted-foreground">Enable or disable this department</p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
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
              onClick={isEditDialogOpen ? handleUpdateDepartment : handleCreateDepartment}
              disabled={formLoading || !formData.code || !formData.name}
            >
              {formLoading ? 'Saving...' : isEditDialogOpen ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => { if (open !== isDeleteDialogOpen) setIsDeleteDialogOpen(open) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedDepartment?.name}"? 
              This action cannot be undone. Make sure no users are assigned to this department.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDepartment} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
