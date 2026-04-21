'use client'

import React, { useState, useEffect } from 'react'
import {
  Grid3X3,
  Search,
  Check,
  X,
  Users,
  Key,
  Shield,
  Filter,
  RefreshCw,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/use-toast'
import { FinancePageHeader } from '@/components/finance'
import { getAccessMatrix, AccessMatrixData } from '@/lib/api/roles'
import { handleApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils'

export default function AdminAccessMatrixPage() {
  const { toast } = useToast()
  
  const [data, setData] = useState<AccessMatrixData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedModule, setSelectedModule] = useState<string>('all')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const matrixData = await getAccessMatrix()
      setData(matrixData)
    } catch (error) {
      const message = handleApiError(error)
      toast({
        title: 'Error',
        description: message || 'Failed to load access matrix',
        variant: 'destructive',
      })
    } finally {
      if (isRefresh) setRefreshing(false)
      else setLoading(false)
    }
  }

  // Filter permissions based on search and module
  const filteredPermissions = data?.permissions.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.display_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesModule = selectedModule === 'all' || p.module === selectedModule
    return matchesSearch && matchesModule
  }) || []

  // Group filtered permissions by module
  const groupedPermissions: Record<string, typeof filteredPermissions> = {}
  filteredPermissions.forEach(p => {
    if (!groupedPermissions[p.module]) {
      groupedPermissions[p.module] = []
    }
    groupedPermissions[p.module].push(p)
  })

  const modules = Object.keys(groupedPermissions).sort()

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
        title="Access Matrix"
        description="View role-permission mapping across the system. Audit-ready view for donor compliance and segregation of duties."
        actions={
          <Button variant="outline" size="sm" onClick={() => loadData(true)} disabled={refreshing}>
            <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
            Refresh
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
                <p className="text-2xl font-bold">{data?.roles.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total Roles</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <Shield className="h-6 w-6 text-emerald-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data?.permissions.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total Permissions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Grid3X3 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data?.modules.length || 0}</p>
                <p className="text-sm text-muted-foreground">Modules</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search permissions..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {data?.modules.map(module => (
                  <SelectItem key={module} value={module} className="capitalize">
                    {module}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center">
            <Check className="h-4 w-4 text-green-600" />
          </div>
          <span>Has Permission</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-muted rounded flex items-center justify-center">
            <X className="h-4 w-4 text-muted-foreground" />
          </div>
          <span>No Permission</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">System</Badge>
          <span>System Role (Cannot Edit)</span>
        </div>
      </div>

      {/* Access Matrix Table */}
      <Card>
        <CardHeader>
          <CardTitle>Role-Permission Matrix</CardTitle>
          <CardDescription>
            Showing {filteredPermissions.length} permissions across {data?.roles.length || 0} roles
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <TooltipProvider>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium sticky left-0 bg-muted/50 z-10 min-w-[200px]">
                      Permission
                    </th>
                    {data?.roles.map(role => (
                      <th key={role.id} className="text-center py-3 px-2 font-medium min-w-[100px]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex flex-col items-center gap-1 cursor-help">
                              <span className="text-xs truncate max-w-[90px]">{role.display_name}</span>
                              {role.is_system && (
                                <Badge variant="secondary" className="text-[10px] px-1 py-0">System</Badge>
                              )}
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {role.users_count}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">{role.display_name}</p>
                            <p className="text-xs text-muted-foreground">{role.description || 'No description'}</p>
                            <p className="text-xs mt-1">{role.permission_ids.length} permissions, {role.users_count} users</p>
                          </TooltipContent>
                        </Tooltip>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modules.map(module => (
                    <React.Fragment key={module}>
                      {/* Module Header Row */}
                      <tr className="bg-muted/30">
                        <td 
                          colSpan={(data?.roles.length || 0) + 1} 
                          className="py-2 px-4 font-semibold text-sm capitalize sticky left-0 bg-muted/30"
                        >
                          {module}
                        </td>
                      </tr>
                      {/* Permission Rows */}
                      {groupedPermissions[module].map(permission => (
                        <tr key={permission.id} className="border-b hover:bg-muted/20">
                          <td className="py-2 px-4 sticky left-0 bg-background z-10">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="cursor-help">
                                  <p className="text-sm font-medium truncate max-w-[180px]">
                                    {permission.display_name}
                                  </p>
                                  <p className="text-xs text-muted-foreground font-mono truncate max-w-[180px]">
                                    {permission.name}
                                  </p>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-medium">{permission.display_name}</p>
                                <p className="text-xs font-mono">{permission.name}</p>
                              </TooltipContent>
                            </Tooltip>
                          </td>
                          {data?.roles.map(role => {
                            const hasPermission = role.permission_ids.includes(permission.id)
                            return (
                              <td key={role.id} className="text-center py-2 px-2">
                                <div className={cn(
                                  "w-8 h-8 mx-auto rounded flex items-center justify-center transition-colors",
                                  hasPermission 
                                    ? "bg-green-100 text-green-600" 
                                    : "bg-muted text-muted-foreground"
                                )}>
                                  {hasPermission ? (
                                    <Check className="h-4 w-4" />
                                  ) : (
                                    <X className="h-4 w-4" />
                                  )}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </TooltipProvider>
          </div>
          
          {filteredPermissions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No permissions found matching your filters
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary by Role */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Summary by Role</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.roles.map(role => {
              const totalPermissions = data.permissions.length
              const rolePermissions = role.permission_ids.length
              const percentage = totalPermissions > 0 
                ? Math.round((rolePermissions / totalPermissions) * 100) 
                : 0
              
              return (
                <div key={role.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{role.display_name}</span>
                      {role.is_system && (
                        <Badge variant="secondary" className="text-xs">System</Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">{percentage}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mb-2">
                    <div 
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{rolePermissions} of {totalPermissions} permissions</span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {role.users_count} users
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
