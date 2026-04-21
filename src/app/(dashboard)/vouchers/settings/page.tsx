'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Hash, Printer, Save, Layers, Check, Plus, Trash2, Info } from 'lucide-react'
import { useOrganizationStore } from '@/stores/organizationStore'
import { toast } from 'sonner'
import {
  getCodingBlockConfig,
  updateCodingBlockConfig,
  type CodingBlockConfigResponse,
  type CodingBlockLocationConfig,
} from '@/lib/api/vouchers'

const voucherTypes = [
  { key: 'payment_voucher_prefix', label: 'Payment Voucher', prefix: 'PV' },
  { key: 'receipt_voucher_prefix', label: 'Receipt Voucher', prefix: 'RV' },
  { key: 'journal_voucher_prefix', label: 'Journal Voucher', prefix: 'JV' },
  { key: 'contra_voucher_prefix', label: 'Contra Voucher', prefix: 'CV' },
  { key: 'purchase_order_prefix', label: 'Purchase Order', prefix: 'PO' },
  { key: 'invoice_prefix', label: 'Invoice', prefix: 'INV' },
]

export default function VoucherSettingsPage() {
  const { organization, isLoading, fetchOrganization, updateOrganization } = useOrganizationStore()
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    voucher_number_format: 'PREFIX-YYYY-NNNN',
    voucher_number_reset: 'yearly',
    payment_voucher_prefix: 'PV',
    receipt_voucher_prefix: 'RV',
    journal_voucher_prefix: 'JV',
    contra_voucher_prefix: 'CV',
    purchase_order_prefix: 'PO',
    invoice_prefix: 'INV',
    voucher_print_copies: 2,
    show_amount_in_words: true,
    show_signature_lines: true,
    require_narration: true,
  } as Record<string, string | number | boolean>)

  const [codingBlockData, setCodingBlockData] = useState<CodingBlockConfigResponse | null>(null)
  const [codingBlockLoading, setCodingBlockLoading] = useState(true)
  const [codingBlockSaving, setCodingBlockSaving] = useState(false)
  const [customCodingBlock, setCustomCodingBlock] = useState<CodingBlockLocationConfig | null>(null)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [editingLocationCode, setEditingLocationCode] = useState<string | null>(null)
  const [applyMainToSubOffices, setApplyMainToSubOffices] = useState(false)

  useEffect(() => {
    fetchOrganization()
  }, [fetchOrganization])

  useEffect(() => {
    let cancelled = false
    getCodingBlockConfig()
      .then((res) => {
        if (!cancelled) setCodingBlockData(res.data)
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load coding block config')
      })
      .finally(() => {
        if (!cancelled) setCodingBlockLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (organization) {
      setForm((prev) => ({
        ...prev,
        voucher_number_format: organization.voucher_number_format ?? 'PREFIX-YYYY-NNNN',
        voucher_number_reset: organization.voucher_number_reset ?? 'yearly',
        payment_voucher_prefix: organization.payment_voucher_prefix ?? 'PV',
        receipt_voucher_prefix: organization.receipt_voucher_prefix ?? 'RV',
        journal_voucher_prefix: organization.journal_voucher_prefix ?? 'JV',
        contra_voucher_prefix: organization.contra_voucher_prefix ?? 'CV',
        purchase_order_prefix: organization.purchase_order_prefix ?? 'PO',
        invoice_prefix: organization.invoice_prefix ?? 'INV',
        voucher_print_copies: organization.voucher_print_copies ?? 2,
        show_amount_in_words: organization.show_amount_in_words ?? true,
        show_signature_lines: organization.show_signature_lines ?? true,
        require_narration: organization.require_narration ?? true,
      }))
    }
  }, [organization])

  const handleSave = async () => {
    if (!organization) return
    setIsSaving(true)
    const success = await updateOrganization({ ...organization, ...form })
    setIsSaving(false)
    if (success) {
      toast.success('Voucher settings saved')
    } else {
      toast.error('Failed to save voucher settings')
    }
  }

  const update = (key: string, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const defaultMonthCodes: Record<number, string> = { 1:'A',2:'B',3:'C',4:'D',5:'E',6:'F',7:'G',8:'H',9:'I',10:'J',11:'K',12:'L' }

  /** Get config for a location from current (by_location or legacy) or suggested. */
  const getConfigForLocationCode = (code: string): CodingBlockLocationConfig => {
    const suggested = codingBlockData?.suggested
    const current = codingBlockData?.current
    const locConfig = current?.by_location?.[code]
    if (locConfig && locConfig.provinces?.length && locConfig.locations?.length) {
      return {
        provinces: locConfig.provinces,
        locations: locConfig.locations,
        month_codes: (locConfig.month_codes ?? suggested?.month_codes ?? defaultMonthCodes) as Record<number, string>,
      }
    }
    if (current?.provinces?.length && current?.locations?.length) {
      return {
        provinces: current.provinces,
        locations: current.locations,
        month_codes: (current.month_codes ?? suggested?.month_codes ?? defaultMonthCodes) as Record<number, string>,
      }
    }
    return {
      provinces: [...(suggested?.provinces ?? [])],
      locations: [...(suggested?.locations ?? [])],
      month_codes: { ...defaultMonthCodes, ...(suggested?.month_codes ?? {}) },
    }
  }

  const handleUseSuggestedCodingBlock = async () => {
    setCodingBlockSaving(true)
    try {
      await updateCodingBlockConfig({ use_suggested: true })
      const res = await getCodingBlockConfig()
      setCodingBlockData(res.data)
      setCustomCodingBlock(null)
      setShowCustomForm(false)
      setEditingLocationCode(null)
      toast.success('Using suggested coding block for all locations')
    } catch {
      toast.error('Failed to update coding block')
    } finally {
      setCodingBlockSaving(false)
    }
  }

  const handleOpenCustomForm = (locationCode: string) => {
    const base = getConfigForLocationCode(locationCode)
    setCustomCodingBlock(base)
    setEditingLocationCode(locationCode)
    setApplyMainToSubOffices(false)
    setShowCustomForm(true)
  }

  const validateCustomCodingBlock = (): boolean => {
    if (!customCodingBlock) return false
    const validProvinces = customCodingBlock.provinces.filter((p) => p.name.trim() && p.code.trim())
    const validLocations = customCodingBlock.locations.filter((l) => l.name.trim() && l.code.trim())
    if (validProvinces.length === 0) {
      toast.error('Add at least one province (name and code)')
      return false
    }
    if (validLocations.length === 0) {
      toast.error('Add at least one location (name and code)')
      return false
    }
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    const missingMonth = months.find((m) => !(customCodingBlock.month_codes[m] ?? '').trim())
    if (missingMonth) {
      toast.error('Fill month code for all 12 months (Jan–Dec)')
      return false
    }
    return true
  }

  const handleSaveCustomCodingBlock = async () => {
    if (!customCodingBlock || !editingLocationCode) return
    if (!validateCustomCodingBlock()) return
    const validProvinces = customCodingBlock.provinces.filter((p) => p.name.trim() && p.code.trim())
    const validLocations = customCodingBlock.locations.filter((l) => l.name.trim() && l.code.trim())
    const monthCodes: Record<number, string> = {}
    for (let m = 1; m <= 12; m++) {
      monthCodes[m] = (customCodingBlock.month_codes[m] ?? '').trim() || 'A'
    }
    const formConfig: CodingBlockLocationConfig = {
      provinces: validProvinces,
      locations: validLocations,
      month_codes: monthCodes,
    }
    const locationOptions = codingBlockData?.location_options ?? [
      { code: '1', name: 'Main Office' },
      { code: '2', name: 'Sub-Office' },
      { code: '3', name: 'Health Facilities' },
    ]
    const byLocation: Record<string, CodingBlockLocationConfig> = {}
    for (const loc of locationOptions) {
      if (loc.code === editingLocationCode) {
        byLocation[loc.code] = formConfig
      } else if (editingLocationCode === '1' && applyMainToSubOffices) {
        byLocation[loc.code] = formConfig
      } else {
        byLocation[loc.code] = getConfigForLocationCode(loc.code)
      }
    }
    setCodingBlockSaving(true)
    try {
      await updateCodingBlockConfig({
        by_location: byLocation,
        apply_main_to_sub_offices: editingLocationCode === '1' && applyMainToSubOffices,
      })
      const res = await getCodingBlockConfig()
      setCodingBlockData(res.data)
      setShowCustomForm(false)
      setCustomCodingBlock(null)
      setEditingLocationCode(null)
      toast.success(applyMainToSubOffices ? 'Coding block saved; main office config applied to all sub offices.' : 'Coding block config saved.')
    } catch (e: unknown) {
      const raw = e && typeof e === 'object' && 'response' in e && (e as { response?: { data?: { message?: unknown } } }).response?.data?.message
      const msg = typeof raw === 'string' ? raw : 'Failed to save coding block config'
      toast.error(msg)
    } finally {
      setCodingBlockSaving(false)
    }
  }

  const updateCustomProvinces = (i: number, field: 'name' | 'code', value: string) => {
    if (!customCodingBlock) return
    const next = [...customCodingBlock.provinces]
    if (!next[i]) return
    next[i] = { ...next[i], [field]: value }
    setCustomCodingBlock({ ...customCodingBlock, provinces: next })
  }
  const addProvince = () => {
    if (!customCodingBlock) return
    setCustomCodingBlock({
      ...customCodingBlock,
      provinces: [...customCodingBlock.provinces, { name: '', code: '' }],
    })
  }
  const removeProvince = (i: number) => {
    if (!customCodingBlock) return
    setCustomCodingBlock({
      ...customCodingBlock,
      provinces: customCodingBlock.provinces.filter((_, idx) => idx !== i),
    })
  }
  const updateCustomLocations = (i: number, field: 'name' | 'code', value: string) => {
    if (!customCodingBlock) return
    const next = [...customCodingBlock.locations]
    if (!next[i]) return
    next[i] = { ...next[i], [field]: value }
    setCustomCodingBlock({ ...customCodingBlock, locations: next })
  }
  const addLocation = () => {
    if (!customCodingBlock) return
    setCustomCodingBlock({
      ...customCodingBlock,
      locations: [...customCodingBlock.locations, { name: '', code: '' }],
    })
  }
  const removeLocation = (i: number) => {
    if (!customCodingBlock) return
    setCustomCodingBlock({
      ...customCodingBlock,
      locations: customCodingBlock.locations.filter((_, idx) => idx !== i),
    })
  }
  const updateMonthCode = (month: number, value: string) => {
    if (!customCodingBlock) return
    setCustomCodingBlock({
      ...customCodingBlock,
      month_codes: { ...customCodingBlock.month_codes, [month]: value || 'A' },
    })
  }

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const locationOptions = codingBlockData?.location_options ?? [
    { code: '1', name: 'Main Office' },
    { code: '2', name: 'Sub-Office' },
    { code: '3', name: 'Health Facilities' },
  ]
  const isCustomForLocation = (code: string): boolean => {
    const current = codingBlockData?.current
    const loc = current?.by_location?.[code]
    if (loc?.provinces?.length && loc?.locations?.length) return true
    if (current?.provinces?.length && current?.locations?.length) return true
    return false
  }
  const isAnyCustom = locationOptions.some((loc) => isCustomForLocation(loc.code))

  if (isLoading && !organization) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  }

  const formatSpec = codingBlockData?.format_spec

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Voucher Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure how vouchers are numbered and printed. Create your own project voucher number system or use the suggested one; project vouchers use the Coding Block format per location, and all other vouchers use standard numbering.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
      </div>

      {/* Info: when each format applies */}
      <div className="flex gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20 p-4">
        <Info className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400 mt-0.5" />
        <div className="text-sm text-foreground">
          <p className="font-medium mb-1">How voucher numbers are assigned</p>
          <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
            <li><strong className="text-foreground">Project vouchers:</strong> When you select a Project, Province, and Location, the voucher number follows your <strong className="text-foreground">coding block</strong> (suggested or your own). The number differs by location—e.g. Main office Kabul 0A01A261A01 vs Sub-Office Kabul 0A01A262A01.</li>
            <li><strong className="text-foreground">Other vouchers:</strong> Use <strong className="text-foreground">Standard numbering</strong> (prefix + year + sequence or your chosen format).</li>
          </ul>
        </div>
      </div>

      {/* 1. Coding block for project vouchers – first and prominent */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4 text-muted-foreground" />
            Project voucher number system (coding block)
          </CardTitle>
          <CardDescription>
            You can use the suggested system below or create your own. The suggested format is optional—define your own provinces, locations, and month codes to build a custom voucher number system for each location. Voucher numbers are built from: Project code + Province + Month + Year + Location + Transaction sequence. Main office and sub offices have different location codes, so the same project and province produce different voucher numbers per location (e.g. Main office 0A01A261A01 vs Sub-Office 0A01A262A01).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {codingBlockLoading ? (
            <Skeleton className="h-24 w-full rounded-lg" />
          ) : (
            <>
              {formatSpec && (
                <div className="rounded-lg border bg-muted/40 p-4 font-mono text-sm">
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="text-muted-foreground">Pattern:</span>
                    <span className="text-foreground">{formatSpec.pattern}</span>
                    <span className="text-muted-foreground ml-2">Example:</span>
                    <span className="font-semibold text-foreground">{formatSpec.example}</span>
                  </div>
                </div>
              )}

              {/* Sample voucher numbers by location – professional list */}
              {codingBlockData?.sample_voucher_numbers && Object.keys(codingBlockData.sample_voucher_numbers).length > 0 && (
                <div>
                  <Label className="text-xs font-medium text-foreground mb-2 block">Sample voucher numbers by location</Label>
                  <p className="text-xs text-muted-foreground mb-3">Same project and province (e.g. Kabul 01), current month and year; only the location code changes. This is how voucher numbers will look for each office.</p>
                  <div className="rounded-md border overflow-hidden">
                    <div className="grid grid-cols-[1fr_80px_1fr] gap-3 p-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                      <span>Location</span>
                      <span>Code</span>
                      <span>Sample voucher number</span>
                    </div>
                    {locationOptions.map((loc) => (
                      <div
                        key={loc.code}
                        className="grid grid-cols-[1fr_80px_1fr] gap-3 p-3 items-center border-b last:border-b-0 bg-background"
                      >
                        <span className="font-medium text-foreground">{loc.name}</span>
                        <span className="font-mono text-muted-foreground">{loc.code}</span>
                        <span className="font-mono font-semibold text-foreground">
                          {codingBlockData.sample_voucher_numbers?.[loc.code] ?? '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={codingBlockSaving}
                  onClick={handleUseSuggestedCodingBlock}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Use suggested system for all locations
                </Button>
              </div>
              <div>
                <Label className="text-xs font-medium text-foreground mb-2 block">Your coding block configuration</Label>
                <p className="text-xs text-muted-foreground mb-3">Each location can use the suggested system or a custom one you define. Customize a location to create your own voucher number system (provinces, locations, month codes) for that office.</p>
                <div className="space-y-2">
                  {locationOptions.map((loc) => (
                    <div key={loc.code} className="flex flex-wrap items-center gap-2 rounded-md border p-3">
                      <span className="font-medium text-foreground min-w-[140px]">{loc.name} (code {loc.code})</span>
                      <span className="text-sm text-muted-foreground">
                        {isCustomForLocation(loc.code) ? 'Custom' : 'Suggested'}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={codingBlockSaving}
                        onClick={() => handleOpenCustomForm(loc.code)}
                      >
                        {isCustomForLocation(loc.code) ? 'Edit' : 'Customize'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {showCustomForm && customCodingBlock && editingLocationCode && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-5">
                  <p className="text-sm font-medium text-foreground">
                    Editing: {locationOptions.find((l) => l.code === editingLocationCode)?.name ?? `Location ${editingLocationCode}`}
                  </p>
                  {editingLocationCode === '1' && (
                    <label className="flex cursor-pointer items-center gap-3 rounded-md border p-3">
                      <input
                        type="checkbox"
                        checked={applyMainToSubOffices}
                        onChange={(e) => setApplyMainToSubOffices(e.target.checked)}
                        className="h-4 w-4 rounded border-input"
                      />
                      <span className="text-sm font-medium">Apply this coding block to all sub offices when saving</span>
                    </label>
                  )}
                  <div>
                    <Label className="text-xs font-medium text-foreground mb-2 block">Provinces (name + code)</Label>
                    <div className="border rounded-md overflow-hidden">
                      <div className="grid grid-cols-[1fr_80px_40px] gap-2 p-2 bg-muted/50 text-xs font-medium text-muted-foreground">
                        <span>Name</span>
                        <span>Code</span>
                        <span />
                      </div>
                      {customCodingBlock.provinces.map((p, i) => (
                        <div key={i} className="grid grid-cols-[1fr_80px_40px] gap-2 p-2 items-center border-t">
                          <Input
                            placeholder="Province name"
                            value={p.name}
                            onChange={(e) => updateCustomProvinces(i, 'name', e.target.value)}
                            className="h-9"
                          />
                          <Input
                            placeholder="01"
                            value={p.code}
                            onChange={(e) => updateCustomProvinces(i, 'code', e.target.value)}
                            className="w-20 font-mono h-9"
                          />
                          <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeProvince(i)} aria-label="Remove">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addProvince}>
                      <Plus className="h-4 w-4 mr-1" /> Add province
                    </Button>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-foreground mb-2 block">Locations (name + code)</Label>
                    <div className="border rounded-md overflow-hidden">
                      <div className="grid grid-cols-[1fr_80px_40px] gap-2 p-2 bg-muted/50 text-xs font-medium text-muted-foreground">
                        <span>Name</span>
                        <span>Code</span>
                        <span />
                      </div>
                      {customCodingBlock.locations.map((p, i) => (
                        <div key={i} className="grid grid-cols-[1fr_80px_40px] gap-2 p-2 items-center border-t">
                          <Input
                            placeholder="Location name"
                            value={p.name}
                            onChange={(e) => updateCustomLocations(i, 'name', e.target.value)}
                            className="h-9"
                          />
                          <Input
                            placeholder="1"
                            value={p.code}
                            onChange={(e) => updateCustomLocations(i, 'code', e.target.value)}
                            className="w-20 font-mono h-9"
                          />
                          <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeLocation(i)} aria-label="Remove">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addLocation}>
                      <Plus className="h-4 w-4 mr-1" /> Add location
                    </Button>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-foreground mb-2 block">Month codes (Jan–Dec)</Label>
                    <div className="flex flex-wrap gap-3">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                        <div key={m} className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground w-8">{monthNames[m - 1]}</span>
                          <Input
                            value={customCodingBlock.month_codes[m] ?? 'A'}
                            onChange={(e) => updateMonthCode(m, e.target.value)}
                            className="w-12 font-mono text-center h-9"
                            maxLength={2}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" disabled={codingBlockSaving} onClick={handleSaveCustomCodingBlock}>
                      <Save className="h-4 w-4 mr-1" />
                      Save coding block
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setShowCustomForm(false); setCustomCodingBlock(null); setEditingLocationCode(null) }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 2. Standard voucher numbering (non-project) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Hash className="h-4 w-4 text-muted-foreground" />
            Standard voucher numbering
          </CardTitle>
          <CardDescription>Format and prefixes for vouchers that are not linked to a project (no Coding Block).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Number format</Label>
              <Select
                value={String(form.voucher_number_format ?? '')}
                onValueChange={(v) => update('voucher_number_format', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PREFIX-YYYY-NNNN">PREFIX-YYYY-0001 (e.g. PV-2024-0001)</SelectItem>
                  <SelectItem value="PREFIX-NNNN">PREFIX-0001 (e.g. PV-0001)</SelectItem>
                  <SelectItem value="YYYY/PREFIX/NNNN">2024/PREFIX/0001</SelectItem>
                  <SelectItem value="NNNN">Sequential only (0001)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Number reset</Label>
              <Select
                value={String(form.voucher_number_reset ?? '')}
                onValueChange={(v) => update('voucher_number_reset', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never reset</SelectItem>
                  <SelectItem value="yearly">Reset every fiscal year</SelectItem>
                  <SelectItem value="monthly">Reset every month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium text-foreground mb-3">Document prefixes</p>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {voucherTypes.map((vt) => (
                <div key={vt.key} className="space-y-2">
                  <Label className="text-xs">{vt.label}</Label>
                  <Input
                    value={(form[vt.key as keyof typeof form] as string) ?? vt.prefix}
                    onChange={(e) => update(vt.key, e.target.value)}
                    maxLength={5}
                    className="font-mono"
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Print & display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Printer className="h-4 w-4 text-muted-foreground" />
            Print & display
          </CardTitle>
          <CardDescription>Print copies and voucher layout options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Default print copies</Label>
            <Select
              value={String(form.voucher_print_copies)}
              onValueChange={(v) => update('voucher_print_copies', parseInt(v, 10))}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 copy</SelectItem>
                <SelectItem value="2">2 copies (original + duplicate)</SelectItem>
                <SelectItem value="3">3 copies</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-3">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={!!form.show_amount_in_words}
                onChange={(e) => update('show_amount_in_words', e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-sm font-medium">Show amount in words on vouchers</span>
            </label>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={!!form.show_signature_lines}
                onChange={(e) => update('show_signature_lines', e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-sm font-medium">Show signature lines</span>
            </label>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={!!form.require_narration}
                onChange={(e) => update('require_narration', e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-sm font-medium">Require narration/description</span>
            </label>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
