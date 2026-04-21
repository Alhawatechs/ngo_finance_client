'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, Trash2, ChevronUp, ChevronDown, Table2, Calculator, Rows3 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ColumnDefRow {
  key: string
  label: string
  type: string
  required?: boolean
  computed?: string
}

/** Merge range (0-based). Used by Excel import and Univer. */
export interface MergeRange {
  startRow: number
  startColumn: number
  endRow: number
  endColumn: number
}

/** One sheet/annex in a multi-sheet budget format */
export interface FormatSheet {
  key: string
  name: string
  columns: ColumnDefRow[]
  /** Column index -> width in px (from Excel or user resize) */
  columnWidths?: Record<number, number>
  headerRowHeight?: number
  typeRowHeight?: number
  dataRowHeight?: number
  /** Data cell values: key "dataRowIdx,colIdx" (from Excel import or user input) */
  cellData?: Record<string, string>
  /** Number of data rows to show (from Excel row count or default) */
  dataRowCount?: number
  /** Merged cell ranges from Excel import (preserved in Univer) */
  mergeRanges?: MergeRange[]
  /** Cell styles from Excel: key "row,col" -> Univer style object (font, fill, alignment, border) */
  cellStyles?: Record<string, Record<string, unknown>>
}

/** Default grid size for new budget format templates */
export const DEFAULT_TEMPLATE_COLUMNS = 100
export const DEFAULT_TEMPLATE_ROWS = 100

/** Excel-style column letter from 0-based index: 0→A, 1→B, ..., 99→CV */
function columnLetterForIndex(index: number): string {
  let s = ''
  let n = index
  do {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return s
}

/** Create a predefined set of empty columns for a new sheet (e.g. 100 columns) */
export function createDefaultColumns(count: number = DEFAULT_TEMPLATE_COLUMNS): ColumnDefRow[] {
  return Array.from({ length: count }, (_, i) => ({
    key: columnLetterForIndex(i),
    label: '',
    type: 'text',
    required: false,
    computed: '',
  }))
}

/** Create a new sheet with the default column grid (100 columns) */
export function createDefaultSheet(key: string, name: string): FormatSheet {
  return {
    key,
    name,
    columns: createDefaultColumns(DEFAULT_TEMPLATE_COLUMNS),
  }
}

const COLUMN_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'account_picker', label: 'Account' },
  { value: 'select', label: 'Dropdown (select)' },
] as const

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'column'
}

interface ColumnDefinitionEditorProps {
  value: ColumnDefRow[]
  onChange: (value: ColumnDefRow[]) => void
  templateCode?: string
  templateName?: string
  disabled?: boolean
}

export function ColumnDefinitionEditor({
  value,
  onChange,
  templateCode,
  templateName,
  disabled,
}: ColumnDefinitionEditorProps) {
  const addRow = () => {
    const next = [...value, { key: '', label: '', type: 'text', required: false, computed: '' }]
    onChange(next)
  }

  const removeRow = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const moveRow = (index: number, dir: -1 | 1) => {
    const to = index + dir
    if (to < 0 || to >= value.length) return
    const next = [...value]
    ;[next[index], next[to]] = [next[to], next[index]]
    onChange(next)
  }

  const updateRow = (index: number, field: keyof ColumnDefRow, fieldValue: string | boolean) => {
    const next = value.map((row, i) => {
      if (i !== index) return row
      const updated = { ...row, [field]: fieldValue }
      if (field === 'label' && !row.key) {
        updated.key = slugify(String(fieldValue))
      }
      return updated
    })
    onChange(next)
  }

  const [previewRowCount, setPreviewRowCount] = useState(5)
  const columnKeys = value.map((r) => r.key).filter(Boolean)
  const formulaPresets = [
    { label: 'Sum quarters (Q1+Q2+Q3+Q4)', formula: 'q1_amount+q2_amount+q3_amount+q4_amount' },
    { label: 'Total (CSO + UNICEF)', formula: 'cso_contribution+unicef_contribution' },
    { label: 'Quantity × Unit cost', formula: 'quantity*unit_cost' },
    { label: 'Total cost (qty × cost × %)', formula: 'quantity*unit_cost*(cost_pct/100)' },
  ]

  const applyFormulaPreset = (index: number, formula: string) => {
    updateRow(index, 'computed', formula)
  }

  return (
    <div className="space-y-4">
      {/* Layout preview: rows and columns as a grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Table2 className="h-4 w-4" />
            Layout preview (rows × columns)
          </Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewRowCount((n) => Math.min(20, n + 1))}
              disabled={disabled || value.length === 0}
              title="Add preview row"
            >
              <Rows3 className="h-4 w-4 mr-1" />
              Add row
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRow}
              disabled={disabled}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add column
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          This is how your budget sheet will look. Add or remove columns below to change the layout; data rows are added when entering the budget.
        </p>
        <div className="rounded-md border overflow-x-auto bg-white dark:bg-slate-950">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-slate-100 dark:bg-slate-800">
                <th className="w-10 p-2 text-left text-xs font-medium text-slate-500 border-r">#</th>
                {value.map((col, i) => (
                  <th
                    key={i}
                    className="min-w-[100px] max-w-[180px] p-2 text-left font-medium text-slate-700 dark:text-slate-300 border-r last:border-r-0"
                    title={col.key}
                  >
                    {col.label || col.key || `Col ${i + 1}`}
                    {col.required && <span className="text-amber-500 ml-0.5">*</span>}
                  </th>
                ))}
                {value.length === 0 && (
                  <th className="p-4 text-muted-foreground font-normal">No columns yet — add columns below</th>
                )}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: previewRowCount }).map((_, rowIdx) => (
                <tr key={rowIdx} className="border-b last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="w-10 p-2 text-xs text-slate-400 border-r">{rowIdx + 1}</td>
                  {value.map((col, colIdx) => (
                    <td key={colIdx} className="min-w-[100px] max-w-[180px] p-2 border-r last:border-r-0">
                      <span className="text-slate-400 text-xs">
                        {col.type === 'currency' || col.type === 'number' ? '0' : '—'}
                      </span>
                    </td>
                  ))}
                  {value.length === 0 && <td className="p-2 text-slate-400">—</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Column definitions (editable) */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Column definitions (edit labels, types, formulas)</Label>
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-8 p-2" aria-label="Reorder" />
                <th className="text-left p-2 font-medium min-w-[120px]">Column label</th>
                <th className="text-left p-2 font-medium min-w-[100px]">Key (field)</th>
                <th className="text-left p-2 font-medium w-[130px]">Type</th>
                <th className="text-center p-2 font-medium w-20">Required</th>
                <th className="text-left p-2 font-medium min-w-[160px]">Computed formula</th>
                <th className="w-10 p-2" aria-label="Remove" />
              </tr>
            </thead>
            <tbody>
              {value.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    No columns. Click &quot;Add column&quot; above to define the budget sheet layout.
                  </td>
                </tr>
              ) : (
                value.map((row, index) => (
                  <tr key={index} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="p-1">
                      <div className="flex flex-col gap-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveRow(index, -1)}
                          disabled={disabled || index === 0}
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveRow(index, 1)}
                          disabled={disabled || index === value.length - 1}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                    <td className="p-2">
                      <Input
                        placeholder="e.g. Q1"
                        value={row.label}
                        onChange={(e) => updateRow(index, 'label', e.target.value)}
                        disabled={disabled}
                        className="h-8 text-sm"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        placeholder="e.g. q1_amount"
                        value={row.key}
                        onChange={(e) => updateRow(index, 'key', e.target.value)}
                        disabled={disabled}
                        className="h-8 font-mono text-sm"
                      />
                    </td>
                    <td className="p-2">
                      <Select
                        value={row.type}
                        onValueChange={(v) => updateRow(index, 'type', v)}
                        disabled={disabled}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COLUMN_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={!!row.required}
                        onChange={(e) => updateRow(index, 'required', e.target.checked)}
                        disabled={disabled}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <Input
                          placeholder="e.g. q1_amount+q2_amount+q3+q4"
                          value={row.computed ?? ''}
                          onChange={(e) => updateRow(index, 'computed', e.target.value)}
                          disabled={disabled}
                          className="h-8 font-mono text-sm flex-1 min-w-0"
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" title="Insert formula">
                              <Calculator className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            {formulaPresets.map((preset, i) => (
                              <DropdownMenuItem
                                key={i}
                                onClick={() => applyFormulaPreset(index, preset.formula)}
                              >
                                {preset.label}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                              Use column keys: {columnKeys.length ? columnKeys.join(', ') : '—'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                    <td className="p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeRow(index)}
                        disabled={disabled || value.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/** Parse column_definition.columns from API into ColumnDefRow[] */
export function parseColumnDefinition(
  columnDefinition: Record<string, unknown> | null | undefined
): ColumnDefRow[] {
  const cols = columnDefinition?.columns
  if (!Array.isArray(cols) || cols.length === 0) return []
  return cols.map((c: Record<string, unknown>) => ({
    key: String(c.key ?? ''),
    label: String(c.label ?? ''),
    type: String(c.type ?? 'text'),
    required: !!c.required,
    computed: c.computed != null ? String(c.computed) : '',
  }))
}

/** Parse column_definition into list of sheets (multi-sheet or single legacy) */
export function parseFormatSheets(
  columnDefinition: Record<string, unknown> | null | undefined
): FormatSheet[] {
  const sheets = columnDefinition?.sheets
  if (Array.isArray(sheets) && sheets.length > 0) {
    return sheets.map((s: Record<string, unknown>, idx: number) => {
      const cols = s.columns
      const colList = Array.isArray(cols)
        ? (cols as Record<string, unknown>[]).map((c) => ({
            key: String(c.key ?? ''),
            label: String(c.label ?? ''),
            type: String(c.type ?? 'text'),
            required: !!c.required,
            computed: c.computed != null ? String(c.computed) : '',
          }))
        : []
      const out: FormatSheet = {
        key: String(s.key ?? idx),
        name: String(s.name ?? `Sheet ${idx + 1}`),
        columns: colList,
      }
      if (s.columnWidths != null && typeof s.columnWidths === 'object' && !Array.isArray(s.columnWidths)) {
        const cw = s.columnWidths as Record<string, unknown>
        const normalized: Record<number, number> = {}
        for (const k of Object.keys(cw)) {
          const v = cw[k]
          const num = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
          if (!Number.isNaN(num) && num > 0) normalized[Number(k)] = num
        }
        if (Object.keys(normalized).length > 0) out.columnWidths = normalized
      }
      const num = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN)
      if (!Number.isNaN(num(s.headerRowHeight)) && num(s.headerRowHeight) > 0) out.headerRowHeight = num(s.headerRowHeight)
      if (!Number.isNaN(num(s.typeRowHeight)) && num(s.typeRowHeight) > 0) out.typeRowHeight = num(s.typeRowHeight)
      if (!Number.isNaN(num(s.dataRowHeight)) && num(s.dataRowHeight) > 0) out.dataRowHeight = num(s.dataRowHeight)
      if (s.cellData != null && typeof s.cellData === 'object') out.cellData = s.cellData as Record<string, string>
      const drc = num(s.dataRowCount)
      if (!Number.isNaN(drc) && drc >= 0) out.dataRowCount = drc
      if (Array.isArray(s.mergeRanges)) out.mergeRanges = s.mergeRanges as MergeRange[]
      if (s.cellStyles != null && typeof s.cellStyles === 'object' && !Array.isArray(s.cellStyles)) out.cellStyles = s.cellStyles as Record<string, Record<string, unknown>>
      return out
    })
  }
  const cols = parseColumnDefinition(columnDefinition)
  if (cols.length === 0) return []
  return [{ key: '0', name: 'Main', columns: cols }]
}

function columnsToApi(columns: ColumnDefRow[]): Record<string, unknown>[] {
  return columns
    .filter((r) => r.key.trim() || r.label.trim())
    .map((r) => {
      const col: Record<string, unknown> = {
        key: r.key.trim() || slugify(r.label) || 'field',
        label: r.label.trim() || r.key,
        type: r.type || 'text',
      }
      if (r.required) col.required = true
      if (r.computed?.trim()) col.computed = r.computed.trim()
      return col
    })
}

/** Build column_definition object from form (code, name, structure_type) and column rows */
export function buildColumnDefinition(
  columns: ColumnDefRow[],
  templateCode: string,
  templateName: string,
  structureType: string,
  existing?: Record<string, unknown> | null
): Record<string, unknown> {
  const base = existing && typeof existing === 'object' ? { ...existing } : {}
  const colArray = columnsToApi(columns)
  return {
    ...base,
    code: templateCode,
    name: templateName,
    structure_type: structureType,
    line_levels: (base.line_levels as string[]) ?? ['line'],
    columns: colArray,
    required_mappings: (base.required_mappings as string[]) ?? (colArray.some((c) => (c.type as string) === 'account_picker') ? ['account_id'] : []),
  }
}

/** Build column_definition with optional multi-sheet (annexes) and layout/cell data */
export function buildColumnDefinitionFromSheets(
  formatSheets: FormatSheet[],
  templateCode: string,
  templateName: string,
  structureType: string,
  existing?: Record<string, unknown> | null
): Record<string, unknown> {
  const base = existing && typeof existing === 'object' ? { ...existing } : {}
  const sheets = formatSheets.map((s) => {
    const sheet: Record<string, unknown> = {
      key: s.key || slugify(s.name) || String(formatSheets.indexOf(s)),
      name: s.name.trim() || `Sheet ${formatSheets.indexOf(s) + 1}`,
      columns: columnsToApi(s.columns),
    }
    if (s.columnWidths != null && Object.keys(s.columnWidths).length > 0) sheet.columnWidths = s.columnWidths
    if (typeof s.headerRowHeight === 'number') sheet.headerRowHeight = s.headerRowHeight
    if (typeof s.typeRowHeight === 'number') sheet.typeRowHeight = s.typeRowHeight
    if (typeof s.dataRowHeight === 'number') sheet.dataRowHeight = s.dataRowHeight
    if (s.cellData != null && Object.keys(s.cellData).length > 0) sheet.cellData = s.cellData
    if (typeof s.dataRowCount === 'number') sheet.dataRowCount = s.dataRowCount
    if (s.mergeRanges != null && s.mergeRanges.length > 0) sheet.mergeRanges = s.mergeRanges
    if (s.cellStyles != null && Object.keys(s.cellStyles).length > 0) sheet.cellStyles = s.cellStyles
    return sheet
  })
  const firstCols = (sheets[0]?.columns as Record<string, unknown>[]) ?? []
  const hasAccountPicker = firstCols.some((c) => (c?.type as string) === 'account_picker')
  return {
    ...base,
    code: templateCode,
    name: templateName,
    structure_type: structureType,
    line_levels: (base.line_levels as string[]) ?? ['line'],
    columns: firstCols,
    sheets: sheets.length > 0 ? sheets : undefined,
    required_mappings: (base.required_mappings as string[]) ?? (hasAccountPicker ? ['account_id'] : []),
  }
}
