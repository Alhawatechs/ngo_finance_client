'use client'

import React, { useState, useEffect } from 'react'
import { Mail, Bell, AlertCircle, Loader2, Volume2, VolumeX, Moon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useOrganizationStore } from '@/stores/organizationStore'
import { useUserPreferencesStore, type DigestFrequency } from '@/stores/userPreferencesStore'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { NotificationInbox } from '@/components/notifications/NotificationInbox'

const DIGEST_OPTIONS: { value: DigestFrequency; label: string }[] = [
  { value: 'realtime', label: 'Realtime (as they happen)' },
  { value: 'hourly', label: 'Hourly digest' },
  { value: 'daily', label: 'Daily digest' },
  { value: 'weekly', label: 'Weekly digest' },
  { value: 'never', label: 'Never (disable digest)' },
]

export function NotificationsSettingsSection() {
  const { organization, isLoading, error, fetchOrganization, updateOrganization } = useOrganizationStore()
  const { notificationPreferences, setNotificationPreferences } = useUserPreferencesStore()
  const { toast } = useToast()
  const [settingsTab, setSettingsTab] = useState<'inbox' | 'preferences'>('inbox')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    enable_notifications: true,
    enable_email_alerts: true,
    digestFrequency: 'daily' as DigestFrequency,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    soundEnabled: true,
  })

  useEffect(() => {
    fetchOrganization()
  }, [fetchOrganization])

  useEffect(() => {
    if (organization) {
      setForm((p) => ({
        ...p,
        enable_notifications: organization.enable_notifications !== false,
        enable_email_alerts: organization.enable_email_alerts !== false,
      }))
    }
  }, [organization])

  useEffect(() => {
    setForm((p) => ({
      ...p,
      digestFrequency: notificationPreferences.digestFrequency,
      quietHoursEnabled: notificationPreferences.quietHoursEnabled,
      quietHoursStart: notificationPreferences.quietHoursStart,
      quietHoursEnd: notificationPreferences.quietHoursEnd,
      soundEnabled: notificationPreferences.soundEnabled,
    }))
  }, [notificationPreferences])

  const handleSave = async () => {
    setSaving(true)
    setNotificationPreferences({
      digestFrequency: form.digestFrequency,
      quietHoursEnabled: form.quietHoursEnabled,
      quietHoursStart: form.quietHoursStart,
      quietHoursEnd: form.quietHoursEnd,
      soundEnabled: form.soundEnabled,
    })
    let success = true
    if (organization) {
      success = await updateOrganization({
        ...organization,
        enable_notifications: form.enable_notifications,
        enable_email_alerts: form.enable_email_alerts,
      })
    }
    setSaving(false)
    if (success) {
      toast({ title: 'Saved', description: 'Notification settings updated successfully.' })
    } else {
      toast({ title: 'Error', description: 'Failed to save organization settings.', variant: 'destructive' })
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
    <Tabs value={settingsTab} onValueChange={(v) => setSettingsTab(v as 'inbox' | 'preferences')} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList className="bg-slate-100/80 dark:bg-slate-100/80">
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>
        {settingsTab === 'preferences' ? (
          <Button onClick={handleSave} disabled={saving} className="bg-slate-800 text-white hover:bg-slate-900 dark:bg-teal-700 dark:hover:bg-teal-600">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save notifications
          </Button>
        ) : null}
      </div>

      <TabsContent value="inbox" className="mt-0">
          <NotificationInbox />
        </TabsContent>

        <TabsContent value="preferences" className="mt-0 space-y-6">
          <Card className="border-slate-200/90 dark:border-slate-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-teal-700" />
                <CardTitle>In-app notifications</CardTitle>
              </div>
              <CardDescription>Show notifications in the application header and activity feed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white p-4 dark:border-slate-200">
                <div>
                  <Label htmlFor="enable_notifications" className="cursor-pointer font-medium">
                    Enable notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">Voucher approvals, fund requests, and system alerts</p>
                </div>
                <Switch
                  id="enable_notifications"
                  checked={form.enable_notifications}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, enable_notifications: v }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/90 dark:border-slate-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-teal-700" />
                <CardTitle>Email alerts</CardTitle>
              </div>
              <CardDescription>Send email notifications for critical events</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white p-4 dark:border-slate-200">
                <div>
                  <Label htmlFor="enable_email_alerts" className="cursor-pointer font-medium">
                    Enable email alerts
                  </Label>
                  <p className="text-sm text-muted-foreground">Approval requests, overdue items, and donor report reminders</p>
                </div>
                <Switch
                  id="enable_email_alerts"
                  checked={form.enable_email_alerts}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, enable_email_alerts: v }))}
                />
              </div>
              <div className="rounded-lg border border-amber-200/60 bg-amber-50/50 p-4 dark:border-amber-200/60 dark:bg-amber-50/50">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">SMTP configuration</p>
                    <p className="mt-0.5 text-xs text-amber-800/90">
                      Email delivery requires SMTP settings in System Configuration. Contact your administrator.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/90 dark:border-slate-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-teal-700" />
                <CardTitle>Digest frequency</CardTitle>
              </div>
              <CardDescription>How often to receive batched email notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <Label>Email digest</Label>
              <Select
                value={form.digestFrequency}
                onValueChange={(v) => setForm((p) => ({ ...p, digestFrequency: v as DigestFrequency }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIGEST_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-2 text-xs text-muted-foreground">
                Realtime sends each alert immediately. Digest options batch notifications.
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/90 dark:border-slate-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Moon className="h-5 w-5 text-teal-700" />
                <CardTitle>Quiet hours</CardTitle>
              </div>
              <CardDescription>Pause non-critical notifications during specified hours</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white p-4 dark:border-slate-200">
                <div>
                  <Label htmlFor="quiet_hours" className="cursor-pointer font-medium">
                    Enable quiet hours
                  </Label>
                  <p className="text-sm text-muted-foreground">Suppress notifications during sleep or focus time</p>
                </div>
                <Switch
                  id="quiet_hours"
                  checked={form.quietHoursEnabled}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, quietHoursEnabled: v }))}
                />
              </div>
              {form.quietHoursEnabled && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="quiet_start">Start time</Label>
                    <Input
                      id="quiet_start"
                      type="time"
                      value={form.quietHoursStart}
                      onChange={(e) => setForm((p) => ({ ...p, quietHoursStart: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="quiet_end">End time</Label>
                    <Input
                      id="quiet_end"
                      type="time"
                      value={form.quietHoursEnd}
                      onChange={(e) => setForm((p) => ({ ...p, quietHoursEnd: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200/90 dark:border-slate-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                {form.soundEnabled ? (
                  <Volume2 className="h-5 w-5 text-teal-700" />
                ) : (
                  <VolumeX className="h-5 w-5 text-muted-foreground" />
                )}
                <CardTitle>Sound</CardTitle>
              </div>
              <CardDescription>Play sound when new notifications arrive</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white p-4 dark:border-slate-200">
                <div>
                  <Label htmlFor="sound_enabled" className="cursor-pointer font-medium">
                    Enable notification sound
                  </Label>
                  <p className="text-sm text-muted-foreground">Audible alert for new in-app notifications</p>
                </div>
                <Switch
                  id="sound_enabled"
                  checked={form.soundEnabled}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, soundEnabled: v }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
    </Tabs>
  )
}
