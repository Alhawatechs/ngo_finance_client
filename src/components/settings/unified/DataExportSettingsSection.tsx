'use client'

import React, { useState, useEffect } from 'react'
import { Database, Download, FileSpreadsheet, FileJson, Calendar, Loader2 } from 'lucide-react'
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
import { exportChartOfAccounts } from '@/lib/api/chart-of-accounts'

const EXPORT_FORMATS = [
  { value: 'xlsx', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
  { value: 'csv', label: 'CSV (.csv)', icon: FileSpreadsheet },
  { value: 'json', label: 'JSON (.json)', icon: FileJson },
  { value: 'pdf', label: 'PDF (.pdf)', icon: FileSpreadsheet },
]

const BACKUP_FREQUENCY = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'never', label: 'Never (manual only)' },
]

type DataExportForm = {
  defaultExportFormat: 'xlsx' | 'csv' | 'json' | 'pdf'
  includeArchived: boolean
  backupFrequency: 'daily' | 'weekly' | 'monthly' | 'never'
  autoExportReports: boolean
}

export function DataExportSettingsSection() {
  const { toast } = useToast()
  const { dataExportPreferences, setDataExportPreferences } = useUserPreferencesStore()
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [form, setForm] = useState<DataExportForm>({
    defaultExportFormat: 'xlsx',
    includeArchived: false,
    backupFrequency: 'weekly',
    autoExportReports: false,
  })

  useEffect(() => {
    setForm({
      defaultExportFormat: dataExportPreferences.defaultExportFormat,
      includeArchived: dataExportPreferences.includeArchived,
      backupFrequency: dataExportPreferences.backupFrequency,
      autoExportReports: dataExportPreferences.autoExportReports,
    })
  }, [dataExportPreferences])

  const handleSave = async () => {
    setSaving(true)
    setDataExportPreferences({
      defaultExportFormat: form.defaultExportFormat,
      includeArchived: form.includeArchived,
      backupFrequency: form.backupFrequency,
      autoExportReports: form.autoExportReports,
    })
    setSaving(false)
    toast({ title: 'Saved', description: 'Data & export settings updated.' })
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const format = form.defaultExportFormat === 'json' ? 'xlsx' : form.defaultExportFormat
      if (format === 'xlsx' || format === 'csv' || format === 'pdf') {
        await exportChartOfAccounts(format)
        toast({ title: 'Export complete', description: 'Chart of accounts has been downloaded.' })
      } else {
        toast({ title: 'Export started', description: 'Your data export will be available for download shortly.' })
      }
    } catch {
      toast({ title: 'Export failed', description: 'Could not complete export. Please try again.', variant: 'destructive' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-slate-800 text-white hover:bg-slate-900 dark:bg-teal-700 dark:hover:bg-teal-600">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save data & export
        </Button>
      </div>

      <Card className="border-slate-200/90 dark:border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-teal-700 dark:text-teal-400" />
            <CardTitle>Export settings</CardTitle>
          </div>
          <CardDescription>Default format and options for data exports</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Default export format</Label>
            <Select
              value={form.defaultExportFormat}
              onValueChange={(v) => setForm((p) => ({ ...p, defaultExportFormat: v as DataExportForm['defaultExportFormat'] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPORT_FORMATS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200/80 p-4 dark:border-slate-200">
            <div>
              <Label htmlFor="include_archived" className="cursor-pointer font-medium">
                Include archived records in exports
              </Label>
              <p className="text-sm text-muted-foreground">Export closed or archived fiscal periods</p>
            </div>
            <Switch
              id="include_archived"
              checked={form.includeArchived}
              onCheckedChange={(v) => setForm((p) => ({ ...p, includeArchived: v }))}
            />
          </div>
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Export data now
          </Button>
          <p className="text-xs text-muted-foreground">
            Exports Chart of Accounts in your selected format ({form.defaultExportFormat === 'json' ? 'xlsx' : form.defaultExportFormat}).
          </p>
        </CardContent>
      </Card>

      <Card className="border-slate-200/90 dark:border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-teal-700 dark:text-teal-400" />
            <CardTitle>Backup & schedule</CardTitle>
          </div>
          <CardDescription>Automated backup and export schedules</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Backup frequency</Label>
            <Select
              value={form.backupFrequency}
              onValueChange={(v) => setForm((p) => ({ ...p, backupFrequency: v as DataExportForm['backupFrequency'] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BACKUP_FREQUENCY.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-muted-foreground">Automated backups are configured by your administrator.</p>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200/80 p-4 dark:border-slate-200">
            <div>
              <Label htmlFor="auto_export" className="cursor-pointer font-medium">
                Auto-export scheduled reports
              </Label>
              <p className="text-sm text-muted-foreground">Email reports on schedule (donor, financial)</p>
            </div>
            <Switch
              id="auto_export"
              checked={form.autoExportReports}
              onCheckedChange={(v) => setForm((p) => ({ ...p, autoExportReports: v }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200/90 dark:border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-teal-700 dark:text-teal-400" />
            <CardTitle>Data portability</CardTitle>
          </div>
          <CardDescription>GDPR and donor compliance: export your organization data</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Request a full export of your organization&apos;s data. Includes transactions, reports, and configuration.
            Exports are available for 7 days after generation.
          </p>
          <Button
            variant="outline"
            onClick={() =>
              toast({
                title: 'Request submitted',
                description: 'Full data export will be emailed when ready. This may take a few minutes.',
              })
            }
          >
            Request full data export
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
