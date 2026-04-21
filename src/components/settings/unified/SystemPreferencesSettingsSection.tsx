'use client'

import React, { useState, useEffect } from 'react'
import { Lock, Clock, Shield, Database, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useOrganizationStore } from '@/stores/organizationStore'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const SESSION_TIMEOUT_OPTIONS = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '120', label: '2 hours' },
  { value: '480', label: '8 hours' },
  { value: '0', label: 'Never (until browser close)' },
]

export function SystemPreferencesSettingsSection() {
  const { organization, isLoading, error, fetchOrganization, updateOrganization } = useOrganizationStore()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    session_timeout: 60,
    require_password_change: 90,
    enable_two_factor: false,
    data_retention_years: 7,
  })

  useEffect(() => {
    fetchOrganization()
  }, [fetchOrganization])

  useEffect(() => {
    if (organization) {
      setForm({
        session_timeout: organization.session_timeout ?? 60,
        require_password_change: organization.require_password_change ?? 90,
        enable_two_factor: organization.enable_two_factor === true,
        data_retention_years: organization.data_retention_years ?? 7,
      })
    }
  }, [organization])

  const handleSave = async () => {
    if (!organization) return
    setSaving(true)
    const success = await updateOrganization({
      ...organization,
      session_timeout: form.session_timeout,
      require_password_change: form.require_password_change,
      enable_two_factor: form.enable_two_factor,
      data_retention_years: form.data_retention_years,
    })
    setSaving(false)
    if (success) {
      toast({ title: 'Saved', description: 'System preferences updated successfully.' })
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
          Save system preferences
        </Button>
      </div>

      <Card className="border-slate-200/90 dark:border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-teal-700 dark:text-teal-400" />
            <CardTitle>Session settings</CardTitle>
          </div>
          <CardDescription>Control how long users stay logged in before automatic logout</CardDescription>
        </CardHeader>
        <CardContent>
          <Label>Session timeout (minutes)</Label>
          <Select
            value={String(form.session_timeout)}
            onValueChange={(v) => setForm((p) => ({ ...p, session_timeout: parseInt(v, 10) }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SESSION_TIMEOUT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-2 text-xs text-muted-foreground">0 = session lasts until browser is closed</p>
        </CardContent>
      </Card>

      <Card className="border-slate-200/90 dark:border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-teal-700 dark:text-teal-400" />
            <CardTitle>Password policy</CardTitle>
          </div>
          <CardDescription>Require users to change password periodically</CardDescription>
        </CardHeader>
        <CardContent>
          <Label>Password change interval (days)</Label>
          <Input
            type="number"
            min={0}
            max={365}
            value={form.require_password_change}
            onChange={(e) => setForm((p) => ({ ...p, require_password_change: parseInt(e.target.value, 10) || 0 }))}
          />
          <p className="mt-2 text-xs text-muted-foreground">0 = no forced password change</p>
        </CardContent>
      </Card>

      <Card className="border-slate-200/90 dark:border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-teal-700 dark:text-teal-400" />
            <CardTitle>Two-factor authentication</CardTitle>
          </div>
          <CardDescription>Add an extra layer of security for sensitive roles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-slate-200/80 p-4 dark:border-slate-200">
            <div>
              <Label htmlFor="enable_two_factor" className="cursor-pointer font-medium">
                Enable 2FA
              </Label>
              <p className="text-sm text-muted-foreground">Require TOTP or SMS for high-privilege users</p>
            </div>
            <Switch
              id="enable_two_factor"
              checked={form.enable_two_factor}
              onCheckedChange={(v) => setForm((p) => ({ ...p, enable_two_factor: v }))}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Full 2FA implementation coming in a future release.</p>
        </CardContent>
      </Card>

      <Card className="border-slate-200/90 dark:border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-teal-700 dark:text-teal-400" />
            <CardTitle>Data retention</CardTitle>
          </div>
          <CardDescription>How long to keep archived and audit data (donor compliance)</CardDescription>
        </CardHeader>
        <CardContent>
          <Label>Retention period (years)</Label>
          <Input
            type="number"
            min={1}
            max={30}
            value={form.data_retention_years}
            onChange={(e) => setForm((p) => ({ ...p, data_retention_years: parseInt(e.target.value, 10) || 7 }))}
          />
          <p className="mt-2 text-xs text-muted-foreground">Recommended: 7+ years for donor and audit compliance</p>
        </CardContent>
      </Card>
    </div>
  )
}
