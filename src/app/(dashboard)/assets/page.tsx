'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  Plus,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Search,
  Package,
  DollarSign,
  TrendingDown,
  AlertTriangle,
  Calculator,
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
import { useToast } from '@/components/ui/use-toast'
import { useOfficeOptional } from '@/contexts/OfficeContext'
import {
  getAssets,
  getAsset,
  createAsset,
  deleteAsset,
  calculateDepreciation,
  disposeAsset,
  getAssetStatusLabel,
  getAssetStatusColor,
  getDepreciationMethodLabel,
  calculateDepreciationPercent,
  FixedAsset,
  AssetFormData,
} from '@/lib/api/assets'

export default function AssetsPage() {
  const officeContext = useOfficeOptional()
  const defaultOfficeId = officeContext?.officeId ?? 1

  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [assetDialogOpen, setAssetDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewingAsset, setViewingAsset] = useState<any>(null)
  const [depreciateDialogOpen, setDepreciateDialogOpen] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<FixedAsset | null>(null)
  const [depreciateForm, setDepreciateForm] = useState({ depreciation_date: '', period: '' })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [assetToDelete, setAssetToDelete] = useState<FixedAsset | null>(null)

  const [assetForm, setAssetForm] = useState<AssetFormData>({
    office_id: defaultOfficeId,
    category_id: 1,
    name: '',
    acquisition_date: new Date().toISOString().split('T')[0],
    acquisition_cost: 0,
    currency: 'USD',
    useful_life_years: 5,
    salvage_value: 0,
    depreciation_method: 'straight_line',
  })

  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch assets
  const { data: assetsData, isLoading, refetch } = useQuery({
    queryKey: ['assets', { page, status: filterStatus, search: searchQuery }],
    queryFn: () => getAssets({
      page,
      per_page: 25,
      status: filterStatus !== 'all' ? filterStatus : undefined,
      search: searchQuery || undefined,
    }),
  })

  const assets: FixedAsset[] = assetsData?.data || []
  const pagination = assetsData?.meta

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      setAssetDialogOpen(false)
      toast({ title: 'Asset Created', description: 'The asset has been created successfully.' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to create asset', variant: 'destructive' })
    },
  })

  // Depreciate mutation
  const depreciateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { depreciation_date: string; period: string } }) =>
      calculateDepreciation(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      setDepreciateDialogOpen(false)
      toast({ title: 'Depreciation Recorded', description: `Depreciation of ${formatCurrency(data.data.depreciation_amount)} recorded.` })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to record depreciation', variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      setDeleteDialogOpen(false)
      setAssetToDelete(null)
      toast({ title: 'Asset Deleted', description: 'The asset has been deleted successfully.' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to delete asset', variant: 'destructive' })
    },
  })

  const handleView = async (asset: FixedAsset) => {
    try {
      const response = await getAsset(asset.id)
      setViewingAsset(response.data)
      setViewDialogOpen(true)
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load asset details', variant: 'destructive' })
    }
  }

  const handleDepreciate = (asset: FixedAsset) => {
    setSelectedAsset(asset)
    const now = new Date()
    setDepreciateForm({
      depreciation_date: now.toISOString().split('T')[0],
      period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    })
    setDepreciateDialogOpen(true)
  }

  // Stats
  const activeAssets = assets.filter(a => a.status === 'active')
  const totalCost = activeAssets.reduce((sum, a) => sum + a.acquisition_cost, 0)
  const totalBookValue = activeAssets.reduce((sum, a) => sum + a.current_value, 0)
  const totalDepreciation = activeAssets.reduce((sum, a) => sum + a.accumulated_depreciation, 0)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Fixed Assets</h1>
          <p className="text-muted-foreground">
            Manage fixed assets and track depreciation
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => refetch()}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => setAssetDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Asset
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pagination?.total || assets.length}</p>
              <p className="text-sm text-muted-foreground">Total Assets</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-emerald-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalCost)}</p>
              <p className="text-sm text-muted-foreground">Total Cost</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalBookValue)}</p>
              <p className="text-sm text-muted-foreground">Book Value</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalDepreciation)}</p>
              <p className="text-sm text-muted-foreground">Depreciation</p>
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
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="disposed">Disposed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Register</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">Asset</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Cost</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Book Value</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Depreciation</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-8" /></td>
                    </tr>
                  ))}
                </>
              )}
              {!isLoading && assets.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No assets found.
                  </td>
                </tr>
              )}
              {!isLoading && assets.map((asset) => {
                const depPercent = calculateDepreciationPercent(
                  asset.accumulated_depreciation,
                  asset.acquisition_cost,
                  asset.salvage_value
                )
                
                return (
                  <tr key={asset.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">{asset.asset_code}</p>
                        <p className="font-medium">{asset.name}</p>
                        {asset.serial_number && (
                          <p className="text-xs text-muted-foreground">S/N: {asset.serial_number}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{asset.category_name || '-'}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {asset.currency} {formatCurrency(asset.acquisition_cost)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {asset.currency} {formatCurrency(asset.current_value)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-24 mx-auto">
                        <Progress value={depPercent} className="h-2" />
                        <p className="text-xs text-center mt-1">{depPercent}%</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={getAssetStatusColor(asset.status)}>
                        {getAssetStatusLabel(asset.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ActionMenu
                        triggerClassName="h-8 w-8"
                        items={[
                          { label: 'View Details', icon: <Eye className="h-4 w-4" />, onClick: () => handleView(asset) },
                          ...(asset.status === 'active'
                            ? [{ label: 'Record Depreciation', icon: <Calculator className="h-4 w-4" />, onClick: () => handleDepreciate(asset) }]
                            : []),
                          { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: () => { setAssetToDelete(asset); setDeleteDialogOpen(true) }, destructive: true },
                        ]}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Depreciation Dialog */}
      <Dialog open={depreciateDialogOpen} onOpenChange={(open) => { if (open !== depreciateDialogOpen) setDepreciateDialogOpen(open) }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Record Depreciation</DialogTitle>
            <DialogDescription>
              Calculate and record depreciation for {selectedAsset?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label required>Depreciation Date</Label>
              <DatePicker
                value={depreciateForm.depreciation_date}
                onChange={(v) => setDepreciateForm({ ...depreciateForm, depreciation_date: v })}
              />
            </div>
            <div className="space-y-2">
              <Label required>Period</Label>
              <Input
                placeholder="YYYY-MM"
                value={depreciateForm.period}
                onChange={(e) => setDepreciateForm({ ...depreciateForm, period: e.target.value })}
              />
            </div>
            {selectedAsset && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p>Method: {getDepreciationMethodLabel(selectedAsset.depreciation_method)}</p>
                <p>Useful Life: {selectedAsset.useful_life_years} years</p>
                <p>Current Book Value: {formatCurrency(selectedAsset.current_value, selectedAsset.currency)}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDepreciateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedAsset && depreciateMutation.mutate({ id: selectedAsset.id, data: depreciateForm })}
              disabled={depreciateMutation.isPending || !depreciateForm.depreciation_date || !depreciateForm.period}
            >
              {depreciateMutation.isPending ? 'Recording...' : 'Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Asset Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={(open) => { if (open !== viewDialogOpen) setViewDialogOpen(open) }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Asset Details</DialogTitle>
            <DialogDescription>{viewingAsset?.asset?.asset_code}</DialogDescription>
          </DialogHeader>
          {viewingAsset && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{viewingAsset.asset.name}</h3>
                <Badge className={getAssetStatusColor(viewingAsset.asset.status)}>
                  {getAssetStatusLabel(viewingAsset.asset.status)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Serial Number</p>
                  <p className="font-medium">{viewingAsset.asset.serial_number || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Acquisition Date</p>
                  <p className="font-medium">{formatDate(viewingAsset.asset.acquisition_date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Location</p>
                  <p className="font-medium">{viewingAsset.asset.location || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Depreciation Method</p>
                  <p className="font-medium">{getDepreciationMethodLabel(viewingAsset.asset.depreciation_method)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Cost</p>
                  <p className="font-bold">{formatCurrency(viewingAsset.asset.acquisition_cost, viewingAsset.asset.currency)}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Depreciation</p>
                  <p className="font-bold text-red-600">{formatCurrency(viewingAsset.asset.accumulated_depreciation, viewingAsset.asset.currency)}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Book Value</p>
                  <p className="font-bold text-green-600">{formatCurrency(viewingAsset.asset.current_value, viewingAsset.asset.currency)}</p>
                </div>
              </div>

              {viewingAsset.depreciation_history?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Depreciation History</h4>
                  <div className="border rounded-lg divide-y max-h-32 overflow-y-auto">
                    {viewingAsset.depreciation_history.map((dep: any) => (
                      <div key={dep.id} className="p-2 flex items-center justify-between text-sm">
                        <span>{dep.period}</span>
                        <span className="font-mono">{formatCurrency(dep.amount, viewingAsset.asset.currency)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
            <AlertDialogTitle>Delete Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete asset <strong>{assetToDelete?.name}</strong> ({assetToDelete?.asset_code})?
              Only assets with no depreciation history can be deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => assetToDelete && deleteMutation.mutate(assetToDelete.id)}
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
