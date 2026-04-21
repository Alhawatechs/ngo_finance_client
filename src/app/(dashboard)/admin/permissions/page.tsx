'use client'

import React, { useState, useEffect } from 'react'
import {
  Lock,
  Search,
  Shield,
  Check,
  Key,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { FinancePageHeader } from '@/components/finance'
import { Permission, PermissionsResponse, getPermissions } from '@/lib/api/roles'

export default function AdminPermissionsPage() {
  const { toast } = useToast()
  
  const [permissions, setPermissions] = useState<PermissionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedModule, setSelectedModule] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await getPermissions()
      setPermissions(data)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load permissions',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredModules = permissions?.modules.filter(module => {
    if (selectedModule && module !== selectedModule) return false
    
    const modulePermissions = permissions.grouped[module] || []
    return modulePermissions.some(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.display_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }) || []

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
        title="Permission Sets"
        description="View all system permissions organized by module. Essential for donor compliance and segregation of duties."
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Lock className="h-6 w-6 text-primary" />
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
              <div className="p-3 bg-emerald-100 rounded-lg">
                <Key className="h-6 w-6 text-emerald-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{permissions?.modules.length || 0}</p>
                <p className="text-sm text-muted-foreground">Modules</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{filteredModules.length}</p>
                <p className="text-sm text-muted-foreground">Visible Modules</p>
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
            <div className="flex gap-2 flex-wrap">
              <Badge
                variant={selectedModule === null ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedModule(null)}
              >
                All Modules
              </Badge>
              {permissions?.modules.map((module) => (
                <Badge
                  key={module}
                  variant={selectedModule === module ? 'default' : 'outline'}
                  className="cursor-pointer capitalize"
                  onClick={() => setSelectedModule(module === selectedModule ? null : module)}
                >
                  {module}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions by Module */}
      <div className="space-y-4">
        {filteredModules.map((module) => {
          const modulePermissions = (permissions?.grouped[module] || []).filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.display_name.toLowerCase().includes(searchTerm.toLowerCase())
          )
          
          if (modulePermissions.length === 0) return null

          return (
            <Card key={module}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="capitalize">{module}</CardTitle>
                    <CardDescription>{modulePermissions.length} permissions</CardDescription>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {module}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {modulePermissions.map((permission) => (
                    <div
                      key={permission.id}
                      className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30"
                    >
                      <div className="p-2 bg-primary/10 rounded">
                        <Lock className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{permission.display_name}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">{permission.name}</p>
                        {permission.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{permission.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
        
        {filteredModules.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No permissions found
          </div>
        )}
      </div>
    </div>
  )
}
