'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  CheckCircle2,
  BarChart3,
  Lock,
  Info,
  Save,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getApprovalWorkflow,
  updateApprovalWorkflow,
  type UpdateApprovalWorkflowData,
} from '@/lib/api/approval-workflow'

const defaultForm: UpdateApprovalWorkflowData & { default_currency?: string } = {
  enable_approval_workflow: true,
  approval_levels: 3,
  approval_limit_level1: 1000,
  approval_limit_level2: 10000,
  approval_limit_level3: 50000,
  require_dual_signature: true,
  dual_signature_threshold: 5000,
  allow_self_approval: false,
  auto_approve_below: 100,
  require_supporting_documents: true,
  default_currency: 'USD',
}

export default function ApprovalWorkflowPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<Record<string, unknown>>(defaultForm as Record<string, unknown>)
  const [baseCurrency, setBaseCurrency] = useState('USD')

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await getApprovalWorkflow()
      const d = res.data
      const data: Record<string, unknown> = {
        enable_approval_workflow: d.enable_approval_workflow,
        approval_levels: d.approval_levels,
        approval_limit_level1: d.approval_limit_level1,
        approval_limit_level2: d.approval_limit_level2,
        approval_limit_level3: d.approval_limit_level3,
        require_dual_signature: d.require_dual_signature,
        dual_signature_threshold: d.dual_signature_threshold,
        allow_self_approval: d.allow_self_approval,
        auto_approve_below: d.auto_approve_below,
        require_supporting_documents: d.require_supporting_documents,
        default_currency: res.base_currency,
      }
      setFormData(data)
      setBaseCurrency(res.base_currency)
    } catch (error) {
      console.error('Failed to load approval workflow:', error)
      toast.error('Failed to load approval workflow settings')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const payload: UpdateApprovalWorkflowData = {
        enable_approval_workflow: formData.enable_approval_workflow as boolean,
        approval_levels: Number(formData.approval_levels),
        approval_limit_level1: Number(formData.approval_limit_level1),
        approval_limit_level2: Number(formData.approval_limit_level2),
        approval_limit_level3: Number(formData.approval_limit_level3),
        require_dual_signature: formData.require_dual_signature as boolean,
        dual_signature_threshold: Number(formData.dual_signature_threshold),
        allow_self_approval: formData.allow_self_approval as boolean,
        auto_approve_below: Number(formData.auto_approve_below),
        require_supporting_documents: formData.require_supporting_documents as boolean,
      }
      await updateApprovalWorkflow(payload)
      toast.success('Approval workflow updated successfully')
      fetchData()
    } catch (error) {
      toast.error('Failed to save approval workflow')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Policy &amp; limits</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Multi-level approval for vouchers and journal entries. Set amount limits per level, dual-signature rules,
            and auto-approval thresholds. Amounts use your organization&apos;s base currency ({baseCurrency}).
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="gap-2" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            Refresh
          </Button>
          <Button size="sm" className="gap-2" onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4" />
            Save changes
          </Button>
        </div>
      </div>

      <div className="space-y-6">

        {/* Master switch */}
        <Card className="border-l-4 border-l-primary shadow-sm overflow-hidden">
          <CardHeader className="pb-4 pt-5 px-5">
            <div className="flex flex-row items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-emerald-200/50">
                  <CheckCircle2 className="h-6 w-6 text-emerald-700" />
                </span>
                <div>
                  <CardTitle className="text-base font-semibold text-foreground">Approval workflow</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Enable multi-level approval so transactions above defined limits require approval at each level before posting.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  name="enable_approval_workflow"
                  checked={!!formData.enable_approval_workflow}
                  onChange={handleInputChange}
                  className="sr-only peer"
                />
                <div className="w-12 h-7 bg-muted rounded-full peer peer-focus:outline-none peer-focus:ring-0.5 peer-focus:ring-ring peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:after:translate-x-5 after:border after:border-input" />
              </label>
            </div>
          </CardHeader>
        </Card>

        {!!formData.enable_approval_workflow && (
          <>
            {/* Approval levels & limits */}
            <Card className="border-l-4 border-l-emerald-600/80 shadow-sm">
              <CardHeader className="pb-3 pt-5 px-5">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/10">
                    <BarChart3 className="h-4 w-4 text-emerald-600" />
                  </span>
                  Approval levels & limits
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Maximum amount (in base currency) that each level can approve. Transactions above a level&apos;s limit escalate to the next.</p>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0">
                <div className="space-y-4">
                  <div className="max-w-xs">
                    <Label className="text-xs font-medium text-muted-foreground">Number of levels</Label>
                    <select
                      name="approval_levels"
                      value={String(formData.approval_levels ?? 3)}
                      onChange={handleInputChange}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1.5 focus-visible:outline-none focus-visible:ring-0.5 focus-visible:ring-ring"
                    >
                      <option value={1}>1 level</option>
                      <option value={2}>2 levels</option>
                      <option value={3}>3 levels</option>
                    </select>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
                    <div className="grid grid-cols-[auto_1fr_140px] gap-4 items-center px-4 py-3 text-xs font-medium text-muted-foreground border-b border-border bg-muted/30">
                      <span className="w-8">Level</span>
                      <span>Role / description</span>
                      <span>Limit ({baseCurrency})</span>
                    </div>
                    {[1, 2, 3].map((level) => (
                      Number(formData.approval_levels ?? 3) >= level && (
                        <div
                          key={level}
                          className="grid grid-cols-[auto_1fr_140px] gap-4 items-center px-4 py-3 border-b border-border last:border-0 bg-background/50 hover:bg-muted/20 transition-colors"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-emerald-800 text-sm font-semibold">
                            {level}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-foreground">Level {level} approval</p>
                            <p className="text-xs text-muted-foreground">
                              {level === 1 && 'Typically supervisors or team leads'}
                              {level === 2 && 'Typically department managers'}
                              {level === 3 && 'Typically directors or finance'}
                            </p>
                          </div>
                          <div>
                            <Input
                              type="number"
                              name={`approval_limit_level${level}`}
                              value={String(formData[`approval_limit_level${level}`] ?? '')}
                              onChange={handleInputChange}
                              className="h-9 text-sm"
                              min={0}
                              placeholder="0"
                            />
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Controls & thresholds */}
            <Card className="border-l-4 border-l-violet-600/80 shadow-sm">
              <CardHeader className="pb-3 pt-5 px-5">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600/10">
                    <Lock className="h-4 w-4 text-violet-600" />
                  </span>
                  Controls & thresholds
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Dual signature, supporting documents, auto-approval, and self-approval rules.</p>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/20 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        name="require_dual_signature"
                        checked={!!formData.require_dual_signature}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 rounded border-input"
                      />
                      <div>
                        <span className="text-sm font-medium text-foreground">Require dual signature</span>
                        <p className="text-xs text-muted-foreground mt-0.5">Two authorized signatories required for transactions above the threshold.</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/20 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        name="require_supporting_documents"
                        checked={!!formData.require_supporting_documents}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 rounded border-input"
                      />
                      <div>
                        <span className="text-sm font-medium text-foreground">Require supporting documents</span>
                        <p className="text-xs text-muted-foreground mt-0.5">Attachments mandatory before a transaction can be approved.</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/20 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        name="allow_self_approval"
                        checked={!!formData.allow_self_approval}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 rounded border-input"
                      />
                      <div>
                        <span className="text-sm font-medium text-foreground">Allow self-approval</span>
                        <p className="text-xs text-muted-foreground mt-0.5">Users may approve their own transactions within their limit (use with caution).</p>
                      </div>
                    </label>
                  </div>
                  <div className="space-y-5">
                    {!!formData.require_dual_signature && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Dual signature threshold ({baseCurrency})</Label>
                        <Input
                          type="number"
                          name="dual_signature_threshold"
                          value={String(formData.dual_signature_threshold ?? '')}
                          onChange={handleInputChange}
                          className="h-9"
                          min={0}
                        />
                        <p className="text-xs text-muted-foreground">Above this amount, two signatories are required.</p>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Auto-approve below ({baseCurrency})</Label>
                      <Input
                        type="number"
                        name="auto_approve_below"
                        value={String(formData.auto_approve_below ?? '')}
                        onChange={handleInputChange}
                        className="h-9"
                        min={0}
                      />
                      <p className="text-xs text-muted-foreground">Transactions below this amount skip the approval workflow.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground border-t border-border pt-4 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0" />
              Approval applies to vouchers and journal entries. Ensure approvers have the correct roles and limits in User Management.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
