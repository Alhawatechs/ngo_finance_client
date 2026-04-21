'use client'

import React, { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Zap, HardDrive, RefreshCw, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useUserPreferencesStore } from '@/stores/userPreferencesStore'

const PREFETCH_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'hover', label: 'On hover' },
  { value: 'visible', label: 'Visible links' },
  { value: 'aggressive', label: 'Aggressive (all links)' },
]

type PerformanceForm = {
  prefetchLinks: 'none' | 'hover' | 'visible' | 'aggressive'
  lazyLoadImages: boolean
  cacheReports: boolean
  virtualScrollTables: boolean
}

export function PerformanceSettingsSection() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { performancePreferences, setPerformancePreferences } = useUserPreferencesStore()
  const [saving, setSaving] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [form, setForm] = useState<PerformanceForm>({
    prefetchLinks: 'hover',
    lazyLoadImages: true,
    cacheReports: true,
    virtualScrollTables: true,
  })

  useEffect(() => {
    setForm({
      prefetchLinks: performancePreferences.prefetchLinks,
      lazyLoadImages: performancePreferences.lazyLoadImages,
      cacheReports: performancePreferences.cacheReports,
      virtualScrollTables: performancePreferences.virtualScrollTables,
    })
  }, [performancePreferences])

  const handleSave = async () => {
    setSaving(true)
    setPerformancePreferences({
      prefetchLinks: form.prefetchLinks,
      lazyLoadImages: form.lazyLoadImages,
      cacheReports: form.cacheReports,
      virtualScrollTables: form.virtualScrollTables,
    })
    setSaving(false)
    toast({ title: 'Saved', description: 'Performance settings updated.' })
  }

  const handleClearCache = async () => {
    setClearing(true)
    try {
      queryClient.clear()
      toast({ title: 'Cache cleared', description: 'React Query cache has been cleared. Data will refetch on next navigation.' })
    } catch {
      toast({ title: 'Error', description: 'Could not clear cache.', variant: 'destructive' })
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-slate-800 text-white hover:bg-slate-900 dark:bg-teal-700 dark:hover:bg-teal-600">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save performance
        </Button>
      </div>

      <Card className="border-slate-200/90 dark:border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-teal-700 dark:text-teal-400" />
            <CardTitle>Loading & prefetch</CardTitle>
          </div>
          <CardDescription>Control how the app loads and prefetches content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Link prefetching</Label>
            <Select
              value={form.prefetchLinks}
              onValueChange={(v) => setForm((p) => ({ ...p, prefetchLinks: v as PerformanceForm['prefetchLinks'] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PREFETCH_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-muted-foreground">
              Prefetch pages when links are visible or on hover for faster navigation.
            </p>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200/80 p-4 dark:border-slate-200">
            <div>
              <Label htmlFor="lazy_images" className="cursor-pointer font-medium">
                Lazy load images
              </Label>
              <p className="text-sm text-muted-foreground">Load images only when they enter the viewport</p>
            </div>
            <Switch
              id="lazy_images"
              checked={form.lazyLoadImages}
              onCheckedChange={(v) => setForm((p) => ({ ...p, lazyLoadImages: v }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200/90 dark:border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-teal-700 dark:text-teal-400" />
            <CardTitle>Cache & data</CardTitle>
          </div>
          <CardDescription>Cache reports and optimize large tables</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-slate-200/80 p-4 dark:border-slate-200">
            <div>
              <Label htmlFor="cache_reports" className="cursor-pointer font-medium">
                Cache reports
              </Label>
              <p className="text-sm text-muted-foreground">Store report results for faster repeat views</p>
            </div>
            <Switch
              id="cache_reports"
              checked={form.cacheReports}
              onCheckedChange={(v) => setForm((p) => ({ ...p, cacheReports: v }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200/80 p-4 dark:border-slate-200">
            <div>
              <Label htmlFor="virtual_scroll" className="cursor-pointer font-medium">
                Virtual scroll for large tables
              </Label>
              <p className="text-sm text-muted-foreground">Render only visible rows for better performance</p>
            </div>
            <Switch
              id="virtual_scroll"
              checked={form.virtualScrollTables}
              onCheckedChange={(v) => setForm((p) => ({ ...p, virtualScrollTables: v }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200/90 dark:border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-teal-700 dark:text-teal-400" />
            <CardTitle>Maintenance</CardTitle>
          </div>
          <CardDescription>Clear cached data if you experience issues</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleClearCache} disabled={clearing}>
            {clearing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Clear local cache
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Clears stored reports and session data. You may need to log in again.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
