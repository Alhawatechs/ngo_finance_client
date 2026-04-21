'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ChartOfAccountsPageFrame } from '@/components/finance/ChartOfAccountsPageFrame'
import { useToast } from '@/components/ui/use-toast'
import { ADVANCE_TYPE_OPTIONS } from '@/lib/advances/constants'
import {
  Bell,
  BookOpen,
  Gauge,
  Link2,
  Save,
  Settings,
  Shield,
} from 'lucide-react'

export function AdvanceSettingsPage() {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  const [requireProjectForProjectType, setRequireProjectForProjectType] = useState(true)
  const [approvalAboveLimit, setApprovalAboveLimit] = useState(true)
  const [notifySettlementDue, setNotifySettlementDue] = useState(false)
  const [defaultLimit, setDefaultLimit] = useState('5000')
  const [approvalLimit, setApprovalLimit] = useState('10000')
  const [settlementReminderDays, setSettlementReminderDays] = useState('7')
  const [policyNotes, setPolicyNotes] = useState('')

  const [typeEnabled, setTypeEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ADVANCE_TYPE_OPTIONS.map((o) => [o.value, true]))
  )

  const toggleType = (value: string) => {
    setTypeEnabled((prev) => ({ ...prev, [value]: !prev[value] }))
  }

  const handleSave = () => {
    setSaving(true)
    window.setTimeout(() => {
      setSaving(false)
      toast({
        title: 'Settings saved locally',
        description: 'Advance configuration will sync to the server when the advances settings API is available.',
      })
    }, 400)
  }

  return (
    <ChartOfAccountsPageFrame title="Advance settings">
      <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Advance settings</h1>
            <p className="text-sm text-muted-foreground md:text-base">
              Defaults for staff advances: which types are offered, limits, and reminders. Values are stored in this
              browser until the settings endpoint is implemented.
            </p>
          </div>
          <Button type="button" onClick={handleSave} disabled={saving} className="gap-2 self-start">
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save settings'}
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border/80 shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Gauge className="h-5 w-5 text-primary" />
                Limits & approval
              </CardTitle>
              <CardDescription>
                Soft caps for this session. Tie-break with your finance manual and voucher approval matrix.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="default-limit">
                    Default per-advance limit <span className="font-normal text-muted-foreground">(reference)</span>
                  </Label>
                  <Input
                    id="default-limit"
                    inputMode="decimal"
                    value={defaultLimit}
                    onChange={(e) => setDefaultLimit(e.target.value)}
                    placeholder="5000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="approval-limit">Second-line approval above (same currency)</Label>
                  <Input
                    id="approval-limit"
                    inputMode="decimal"
                    value={approvalLimit}
                    onChange={(e) => setApprovalLimit(e.target.value)}
                    placeholder="10000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reminder-days">Settlement reminder (days before due)</Label>
                  <Input
                    id="reminder-days"
                    inputMode="numeric"
                    value={settlementReminderDays}
                    onChange={(e) => setSettlementReminderDays(e.target.value)}
                    placeholder="7"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Extra approval above limit</p>
                  <p className="text-xs text-muted-foreground">
                    Require manager or finance sign-off when amount exceeds the threshold.
                  </p>
                </div>
                <Switch checked={approvalAboveLimit} onCheckedChange={setApprovalAboveLimit} aria-label="Extra approval" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-5 w-5 text-primary" />
                Advance types
              </CardTitle>
              <CardDescription>Which advance categories staff can request in the register.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {ADVANCE_TYPE_OPTIONS.map((o) => (
                <div
                  key={o.value}
                  className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2.5"
                >
                  <span className="text-sm font-medium">{o.label}</span>
                  <Switch
                    checked={typeEnabled[o.value] ?? true}
                    onCheckedChange={() => toggleType(o.value)}
                    aria-label={`Enable ${o.label}`}
                  />
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 rounded-md border border-dashed px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">Project advances</p>
                  <p className="text-xs text-muted-foreground">Require a project code when type is Project.</p>
                </div>
                <Switch
                  checked={requireProjectForProjectType}
                  onCheckedChange={setRequireProjectForProjectType}
                  aria-label="Require project for project type"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-5 w-5 text-primary" />
                Notifications
              </CardTitle>
              <CardDescription>Optional nudges before expected settlement (when notifications are wired).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/15 p-4">
                <div>
                  <p className="text-sm font-medium">Remind before due date</p>
                  <p className="text-xs text-muted-foreground">Email or in-app digest for outstanding advances.</p>
                </div>
                <Switch checked={notifySettlementDue} onCheckedChange={setNotifySettlementDue} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-5 w-5 text-primary" />
                Policy & GL alignment
              </CardTitle>
              <CardDescription>
                Internal notes and links; employee advances typically map to balance-sheet advance accounts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="policy-notes">Organisation policy notes</Label>
                <Textarea
                  id="policy-notes"
                  rows={4}
                  value={policyNotes}
                  onChange={(e) => setPolicyNotes(e.target.value)}
                  placeholder="e.g. per diem caps, receipt rules, who approves project advances…"
                  className="resize-y min-h-[100px]"
                />
              </div>
              <div className="border-t border-border" role="separator" />
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button variant="outline" size="sm" className="justify-start gap-2" asChild>
                  <Link href="/general-ledger/accounts">
                    <BookOpen className="h-4 w-4 shrink-0" />
                    Chart of Accounts
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="justify-start gap-2" asChild>
                  <Link href="/vouchers">
                    <Link2 className="h-4 w-4 shrink-0" />
                    Vouchers
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="justify-start gap-2" asChild>
                  <Link href="/treasury/advances/advance-list">
                    Back to Advance list
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ChartOfAccountsPageFrame>
  )
}
