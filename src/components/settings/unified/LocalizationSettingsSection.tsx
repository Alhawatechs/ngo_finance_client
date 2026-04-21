'use client'

import React, { useState, useEffect } from 'react'
import { Globe, Calendar, Hash, Clock, Loader2, CalendarDays } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useOrganizationStore } from '@/stores/organizationStore'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

const DATE_FORMATS = [
  { value: 'Y-m-d', label: 'YYYY-MM-DD (2025-02-13)', example: '2025-02-13' },
  { value: 'd/m/Y', label: 'DD/MM/YYYY (13/02/2025)', example: '13/02/2025' },
  { value: 'm/d/Y', label: 'MM/DD/YYYY (02/13/2025)', example: '02/13/2025' },
  { value: 'd-m-Y', label: 'DD-MM-YYYY (13-02-2025)', example: '13-02-2025' },
  { value: 'd M Y', label: 'DD Mon YYYY (13 Feb 2025)', example: '13 Feb 2025' },
  { value: 'F j, Y', label: 'Month DD, YYYY (February 13, 2025)', example: 'February 13, 2025' },
]

const NUMBER_FORMATS = [
  { value: '1,234.56', label: '1,234.56 (US/UK)', thousands: ',', decimal: '.' },
  { value: '1.234,56', label: '1.234,56 (EU)', thousands: '.', decimal: ',' },
  { value: '1 234,56', label: '1 234,56 (Space)', thousands: ' ', decimal: ',' },
  { value: "1'234.56", label: "1'234.56 (Swiss)", thousands: "'", decimal: '.' },
]

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'Asia/Kabul', label: 'Asia/Kabul (Afghanistan)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (UAE)' },
  { value: 'Asia/Karachi', label: 'Asia/Karachi (Pakistan)' },
  { value: 'Asia/Tashkent', label: 'Asia/Tashkent (Uzbekistan)' },
  { value: 'Europe/London', label: 'Europe/London' },
  { value: 'America/New_York', label: 'America/New York' },
  { value: 'America/Los_Angeles', label: 'America/Los Angeles' },
]

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'fa', label: 'Persian (فارسی)' },
  { value: 'ps', label: 'Pashto (پښتو)' },
  { value: 'ar', label: 'Arabic (العربية)' },
]

const FIRST_DAY_OPTIONS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '6', label: 'Saturday' },
]

export function LocalizationSettingsSection() {
  const { organization, isLoading, error, fetchOrganization, updateOrganization } = useOrganizationStore()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    date_format: 'Y-m-d',
    number_format: '1,234.56',
    timezone: 'Asia/Kabul',
    language: 'en',
    first_day_of_week: '0',
  })

  useEffect(() => {
    fetchOrganization()
  }, [fetchOrganization])

  useEffect(() => {
    if (organization) {
      const org = organization as unknown as Record<string, unknown>
      setForm({
        date_format: organization.date_format ?? 'Y-m-d',
        number_format: organization.number_format ?? '1,234.56',
        timezone: organization.timezone ?? 'Asia/Kabul',
        language: organization.language ?? 'en',
        first_day_of_week: String(org.first_day_of_week ?? '0'),
      })
    }
  }, [organization])

  const handleSave = async () => {
    if (!organization) return
    setSaving(true)
    const success = await updateOrganization({
      ...organization,
      date_format: form.date_format,
      number_format: form.number_format,
      timezone: form.timezone,
      language: form.language,
      first_day_of_week: parseInt(form.first_day_of_week, 10),
    })
    setSaving(false)
    if (success) {
      toast({ title: 'Saved', description: 'Localization settings updated successfully.' })
    } else {
      toast({ title: 'Error', description: 'Failed to save settings.', variant: 'destructive' })
    }
  }

  if (isLoading && !organization) {
    return <Skeleton className="h-64 w-full rounded-xl" />
  }
  if (!organization) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-sm font-medium text-destructive">Failed to load organization settings.</p>
        {error && <p className="mt-1 text-xs text-muted-foreground">{error}</p>}
        <Button variant="outline" size="sm" className="mt-3" onClick={() => fetchOrganization({ force: true })}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-slate-800 text-white hover:bg-slate-900 dark:bg-teal-700 dark:hover:bg-teal-600">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save localization
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-slate-200/90 dark:border-slate-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-teal-700 dark:text-teal-400" />
              <CardTitle>Date format</CardTitle>
            </div>
            <CardDescription>How dates are displayed across the system</CardDescription>
          </CardHeader>
          <CardContent>
            <Label>Format</Label>
            <Select value={form.date_format} onValueChange={(v) => setForm((p) => ({ ...p, date_format: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMATS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-muted-foreground">
              Example: {DATE_FORMATS.find((f) => f.value === form.date_format)?.example ?? form.date_format}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 dark:border-slate-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Hash className="h-5 w-5 text-teal-700 dark:text-teal-400" />
              <CardTitle>Number format</CardTitle>
            </div>
            <CardDescription>Thousands separator and decimal point for amounts</CardDescription>
          </CardHeader>
          <CardContent>
            <Label>Format</Label>
            <Select value={form.number_format} onValueChange={(v) => setForm((p) => ({ ...p, number_format: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NUMBER_FORMATS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-muted-foreground">Example: 1,234,567.89</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 dark:border-slate-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-teal-700 dark:text-teal-400" />
              <CardTitle>Timezone</CardTitle>
            </div>
            <CardDescription>Default timezone for timestamps and reports</CardDescription>
          </CardHeader>
          <CardContent>
            <Label>Timezone</Label>
            <Select value={form.timezone} onValueChange={(v) => setForm((p) => ({ ...p, timezone: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 dark:border-slate-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-teal-700 dark:text-teal-400" />
              <CardTitle>Language</CardTitle>
            </div>
            <CardDescription>Interface language preference</CardDescription>
          </CardHeader>
          <CardContent>
            <Label>Language</Label>
            <Select value={form.language} onValueChange={(v) => setForm((p) => ({ ...p, language: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-muted-foreground">Full localization coming in a future release.</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 md:col-span-2 dark:border-slate-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-teal-700 dark:text-teal-400" />
              <CardTitle>First day of week</CardTitle>
            </div>
            <CardDescription>Start of week for calendars and date pickers</CardDescription>
          </CardHeader>
          <CardContent>
            <Label>First day</Label>
            <Select
              value={form.first_day_of_week}
              onValueChange={(v) => setForm((p) => ({ ...p, first_day_of_week: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIRST_DAY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-muted-foreground">
              Affects calendar views and weekly reports. Sunday (0), Monday (1), Saturday (6).
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
