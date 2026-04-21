'use client'

import React, { useState, useEffect } from 'react'
import {
  Palette,
  Moon,
  Sun,
  Layout,
  SidebarOpen,
  Loader2,
  Type,
  Circle,
  Maximize2,
  Minimize2,
} from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { useUserPreferencesStore } from '@/stores/userPreferencesStore'

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System (follow device)', icon: Palette },
]

const DENSITY_OPTIONS = [
  { value: 'compact', label: 'Compact' },
  { value: 'default', label: 'Default' },
  { value: 'comfortable', label: 'Comfortable' },
]

const FONT_SIZE_OPTIONS = [
  { value: 'small', label: 'Small (90%)' },
  { value: 'default', label: 'Default (100%)' },
  { value: 'large', label: 'Large (110%)' },
  { value: 'xlarge', label: 'Extra Large (125%)' },
]

const ACCENT_COLORS = [
  { value: 'blue', label: 'Brand', class: 'bg-primary' },
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-600' },
  { value: 'violet', label: 'Violet', class: 'bg-violet-600' },
  { value: 'emerald', label: 'Emerald', class: 'bg-emerald-600' },
  { value: 'amber', label: 'Amber', class: 'bg-amber-600' },
]

type AppearanceForm = {
  theme: 'light' | 'dark' | 'system'
  density: 'compact' | 'default' | 'comfortable'
  sidebarDefaultOpen: boolean
  reduceMotion: boolean
  fontSize: 'small' | 'default' | 'large' | 'xlarge'
  accentColor: 'blue' | 'indigo' | 'violet' | 'emerald' | 'amber'
  highContrast: boolean
}

export function AppearanceSettingsSection() {
  const { toast } = useToast()
  const { appearancePreferences, setAppearancePreferences } = useUserPreferencesStore()
  const [fullscreenActive, setFullscreenActive] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<AppearanceForm>({
    theme: 'light',
    density: 'default',
    sidebarDefaultOpen: true,
    reduceMotion: false,
    fontSize: 'default',
    accentColor: 'blue',
    highContrast: false,
  })

  useEffect(() => {
    setForm({
      theme: appearancePreferences.theme,
      density: appearancePreferences.density,
      sidebarDefaultOpen: appearancePreferences.sidebarDefaultOpen,
      reduceMotion: appearancePreferences.reduceMotion,
      fontSize: appearancePreferences.fontSize,
      accentColor: appearancePreferences.accentColor,
      highContrast: appearancePreferences.highContrast,
    })
  }, [appearancePreferences])

  useEffect(() => {
    const sync = () => setFullscreenActive(!!document.fullscreenElement)
    sync()
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.().catch(() => {})
    } else {
      void document.exitFullscreen?.().catch(() => {})
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setAppearancePreferences({
      theme: form.theme,
      density: form.density,
      sidebarDefaultOpen: form.sidebarDefaultOpen,
      reduceMotion: form.reduceMotion,
      fontSize: form.fontSize,
      accentColor: form.accentColor,
      highContrast: form.highContrast,
    })
    setSaving(false)
    toast({
      title: 'Saved',
      description: 'Appearance settings updated. Changes apply immediately.',
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button onClick={handleSave} disabled={saving} className="bg-slate-800 text-white hover:bg-slate-900 dark:bg-teal-700 dark:hover:bg-teal-600">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save appearance
        </Button>
      </div>

      <Card className="border-slate-200/90 dark:border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-teal-700 dark:text-teal-400" />
            <CardTitle>Theme</CardTitle>
          </div>
          <CardDescription>Choose the color scheme for the application</CardDescription>
        </CardHeader>
        <CardContent>
          <Label>Theme</Label>
          <Select value={form.theme} onValueChange={(v) => setForm((p) => ({ ...p, theme: v as AppearanceForm['theme'] }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {THEME_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  <span className="flex items-center gap-2">
                    <o.icon className="h-4 w-4" />
                    {o.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-2 text-xs text-muted-foreground">
            Light, dark, and system themes apply across the app. Save to persist your choice.
          </p>
        </CardContent>
      </Card>

      <Card className="border-slate-200/90 dark:border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            {fullscreenActive ? (
              <Minimize2 className="h-5 w-5 text-teal-700 dark:text-teal-400" />
            ) : (
              <Maximize2 className="h-5 w-5 text-teal-700 dark:text-teal-400" />
            )}
            <CardTitle>Display</CardTitle>
          </div>
          <CardDescription>Use the full screen for focused work (browser fullscreen)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-slate-200/80 p-4 dark:border-slate-200">
            <div>
              <Label htmlFor="fullscreen_toggle" className="cursor-pointer font-medium">
                Fullscreen mode
              </Label>
              <p className="text-sm text-muted-foreground">
                {fullscreenActive ? 'Press Esc or toggle off to exit' : 'Expand the app to fill your display'}
              </p>
            </div>
            <Switch id="fullscreen_toggle" checked={fullscreenActive} onCheckedChange={() => toggleFullscreen()} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200/90 dark:border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Circle className="h-5 w-5 text-teal-700 dark:text-teal-400" />
            <CardTitle>Accent color</CardTitle>
          </div>
          <CardDescription>Primary color for buttons, links, and highlights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {ACCENT_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setForm((p) => ({ ...p, accentColor: c.value as AppearanceForm['accentColor'] }))}
                className={cn(
                  'flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors',
                  form.accentColor === c.value
                    ? 'border-teal-600 bg-teal-50 dark:border-teal-600 dark:bg-teal-50'
                    : 'border-transparent hover:bg-muted/50'
                )}
              >
                <span className={cn('h-4 w-4 rounded-full', c.class)} />
                {c.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200/90 dark:border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Type className="h-5 w-5 text-teal-700 dark:text-teal-400" />
            <CardTitle>Font size</CardTitle>
          </div>
          <CardDescription>Base font size for the interface</CardDescription>
        </CardHeader>
        <CardContent>
          <Label>Font size</Label>
          <Select value={form.fontSize} onValueChange={(v) => setForm((p) => ({ ...p, fontSize: v as AppearanceForm['fontSize'] }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_SIZE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-slate-200/90 dark:border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layout className="h-5 w-5 text-teal-700 dark:text-teal-400" />
            <CardTitle>Layout density</CardTitle>
          </div>
          <CardDescription>Control spacing and density of tables and lists</CardDescription>
        </CardHeader>
        <CardContent>
          <Label>Density</Label>
          <Select value={form.density} onValueChange={(v) => setForm((p) => ({ ...p, density: v as AppearanceForm['density'] }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DENSITY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-slate-200/90 dark:border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <SidebarOpen className="h-5 w-5 text-teal-700 dark:text-teal-400" />
            <CardTitle>Sidebar</CardTitle>
          </div>
          <CardDescription>Default sidebar state when opening the application</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-slate-200/80 p-4 dark:border-slate-200">
            <div>
              <Label htmlFor="sidebar_default" className="cursor-pointer font-medium">
                Sidebar expanded by default
              </Label>
              <p className="text-sm text-muted-foreground">Show full sidebar when the app loads</p>
            </div>
            <Switch
              id="sidebar_default"
              checked={form.sidebarDefaultOpen}
              onCheckedChange={(v) => setForm((p) => ({ ...p, sidebarDefaultOpen: v }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200/90 dark:border-slate-200">
        <CardHeader>
          <CardTitle>Motion</CardTitle>
          <CardDescription>Reduce motion and improve accessibility</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-slate-200/80 p-4 dark:border-slate-200">
            <div>
              <Label htmlFor="reduce_motion_app" className="cursor-pointer font-medium">
                Reduce motion
              </Label>
              <p className="text-sm text-muted-foreground">Minimize animations and transitions</p>
            </div>
            <Switch
              id="reduce_motion_app"
              checked={form.reduceMotion}
              onCheckedChange={(v) => setForm((p) => ({ ...p, reduceMotion: v }))}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
