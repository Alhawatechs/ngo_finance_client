'use client'

import React, { useState, useEffect } from 'react'
import { Accessibility, Eye, Keyboard, MousePointer, Loader2 } from 'lucide-react'
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

const FONT_SIZE_OPTIONS = [
  { value: 'small', label: 'Small (90%)' },
  { value: 'default', label: 'Default (100%)' },
  { value: 'large', label: 'Large (110%)' },
  { value: 'xlarge', label: 'Extra Large (125%)' },
]

type AccessibilityForm = {
  highContrast: boolean
  reduceMotion: boolean
  largeFocusIndicator: boolean
  fontSize: 'small' | 'default' | 'large' | 'xlarge'
  screenReaderOptimized: boolean
  keyboardShortcutsEnabled: boolean
}

export function AccessibilitySettingsSection() {
  const { toast } = useToast()
  const { accessibilityPreferences, setAccessibilityPreferences } = useUserPreferencesStore()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<AccessibilityForm>({
    highContrast: false,
    reduceMotion: false,
    largeFocusIndicator: true,
    fontSize: 'default',
    screenReaderOptimized: false,
    keyboardShortcutsEnabled: true,
  })

  useEffect(() => {
    setForm({
      highContrast: accessibilityPreferences.highContrast,
      reduceMotion: accessibilityPreferences.reduceMotion,
      largeFocusIndicator: accessibilityPreferences.largeFocusIndicator,
      fontSize: accessibilityPreferences.fontSize,
      screenReaderOptimized: accessibilityPreferences.screenReaderOptimized,
      keyboardShortcutsEnabled: accessibilityPreferences.keyboardShortcutsEnabled,
    })
  }, [accessibilityPreferences])

  const handleSave = async () => {
    setSaving(true)
    setAccessibilityPreferences({
      highContrast: form.highContrast,
      reduceMotion: form.reduceMotion,
      largeFocusIndicator: form.largeFocusIndicator,
      fontSize: form.fontSize,
      screenReaderOptimized: form.screenReaderOptimized,
      keyboardShortcutsEnabled: form.keyboardShortcutsEnabled,
    })
    setSaving(false)
    toast({
      title: 'Saved',
      description: 'Accessibility settings updated. Changes apply immediately.',
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-slate-800 text-white hover:bg-slate-900 dark:bg-teal-700 dark:hover:bg-teal-600">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save accessibility
        </Button>
      </div>

      <Card className="border-slate-200/90 dark:border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-teal-700 dark:text-teal-400" />
            <CardTitle>Visual</CardTitle>
          </div>
          <CardDescription>Adjust visual presentation for better readability</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-slate-200/80 p-4 dark:border-slate-200">
            <div>
              <Label htmlFor="high_contrast" className="cursor-pointer font-medium">
                High contrast mode
              </Label>
              <p className="text-sm text-muted-foreground">Increase contrast for better visibility</p>
            </div>
            <Switch
              id="high_contrast"
              checked={form.highContrast}
              onCheckedChange={(v) => setForm((p) => ({ ...p, highContrast: v }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200/80 p-4 dark:border-slate-200">
            <div>
              <Label htmlFor="reduce_motion_acc" className="cursor-pointer font-medium">
                Reduce motion
              </Label>
              <p className="text-sm text-muted-foreground">Minimize animations and transitions</p>
            </div>
            <Switch
              id="reduce_motion_acc"
              checked={form.reduceMotion}
              onCheckedChange={(v) => setForm((p) => ({ ...p, reduceMotion: v }))}
            />
          </div>
          <div>
            <Label>Font size</Label>
            <Select value={form.fontSize} onValueChange={(v) => setForm((p) => ({ ...p, fontSize: v as AccessibilityForm['fontSize'] }))}>
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
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200/90 dark:border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MousePointer className="h-5 w-5 text-teal-700 dark:text-teal-400" />
            <CardTitle>Focus & navigation</CardTitle>
          </div>
          <CardDescription>Improve keyboard and focus visibility</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-slate-200/80 p-4 dark:border-slate-200">
            <div>
              <Label htmlFor="large_focus" className="cursor-pointer font-medium">
                Large focus indicator
              </Label>
              <p className="text-sm text-muted-foreground">Make focus rings more visible when tabbing</p>
            </div>
            <Switch
              id="large_focus"
              checked={form.largeFocusIndicator}
              onCheckedChange={(v) => setForm((p) => ({ ...p, largeFocusIndicator: v }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200/80 p-4 dark:border-slate-200">
            <div>
              <Label htmlFor="screen_reader" className="cursor-pointer font-medium">
                Screen reader optimized
              </Label>
              <p className="text-sm text-muted-foreground">Add ARIA labels and improve semantic structure</p>
            </div>
            <Switch
              id="screen_reader"
              checked={form.screenReaderOptimized}
              onCheckedChange={(v) => setForm((p) => ({ ...p, screenReaderOptimized: v }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200/90 dark:border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-teal-700 dark:text-teal-400" />
            <CardTitle>Keyboard shortcuts</CardTitle>
          </div>
          <CardDescription>Enable keyboard shortcuts for power users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-slate-200/80 p-4 dark:border-slate-200">
            <div>
              <Label htmlFor="keyboard_shortcuts" className="cursor-pointer font-medium">
                Enable keyboard shortcuts
              </Label>
              <p className="text-sm text-muted-foreground">
                Use ? to view shortcut list. Navigate faster with Ctrl+K search, etc.
              </p>
            </div>
            <Switch
              id="keyboard_shortcuts"
              checked={form.keyboardShortcutsEnabled}
              onCheckedChange={(v) => setForm((p) => ({ ...p, keyboardShortcutsEnabled: v }))}
            />
          </div>
          <div className="mt-4 rounded-lg bg-slate-50/80 p-4 text-sm dark:bg-slate-50/80">
            <p className="mb-2 font-medium">Common shortcuts</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>
                <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">?</kbd> — Show shortcuts
              </li>
              <li>
                <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">Ctrl+K</kbd> — Quick search
              </li>
              <li>
                <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">Esc</kbd> — Close modal
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
