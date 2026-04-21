'use client'

import React, { useState, useRef, useCallback } from 'react'
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
import { Plus, Trash2, Calculator, Table2, Rows3, Sparkles, ChevronRight, GripVertical, GripHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ColumnDefRow } from '@/components/budget/ColumnDefinitionEditor'
import { DEFAULT_TEMPLATE_ROWS } from '@/components/budget/ColumnDefinitionEditor'
import { CELL_FORMAT_TYPES, detectCellFormatFromLabel } from '@/lib/budget-cell-formats'

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'column'
}

/** Excel-style column letter from 0-based index: 0→A, 1→B, ..., 26→AA */
function columnLetter(index: number): string {
  let s = ''
  let n = index
  do {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return s
}

const FORMULA_PRESETS = [
  { label: 'Sum quarters (Q1+Q2+Q3+Q4)', formula: 'q1_amount+q2_amount+q3_amount+q4_amount' },
  { label: 'Total (CSO + UNICEF)', formula: 'cso_contribution+unicef_contribution' },
  { label: 'Quantity × Unit cost', formula: 'quantity*unit_cost' },
  { label: 'Total cost (qty × cost × %)', formula: 'quantity*unit_cost*(cost_pct/100)' },
]

const DEFAULT_COL_WIDTH = 128
const MIN_COL_WIDTH = 60
const MAX_COL_WIDTH = 400
const DEFAULT_HEADER_ROW_HEIGHT = 36
const DEFAULT_TYPE_ROW_HEIGHT = 36
const DEFAULT_DATA_ROW_HEIGHT = 32
const MIN_ROW_HEIGHT = 24
const MAX_ROW_HEIGHT = 120

export interface SheetLayoutPatch {
  columnWidths?: Record<number, number>
  headerRowHeight?: number
  typeRowHeight?: number
  dataRowHeight?: number
  cellData?: Record<string, string>
  dataRowCount?: number
}

interface SpreadsheetFormatEditorProps {
  value: ColumnDefRow[]
  onChange: (value: ColumnDefRow[]) => void
  disabled?: boolean
  /** Sheet name shown in toolbar */
  sheetName?: string
  /** Initial layout/cell data from Excel import or saved format (syncs into state) */
  initialColumnWidths?: Record<number, number>
  initialHeaderRowHeight?: number
  initialTypeRowHeight?: number
  initialDataRowHeight?: number
  initialCellData?: Record<string, string>
  initialDataRowCount?: number
  /** Called when user resizes or edits cell data so parent can persist */
  onSheetLayoutChange?: (patch: SheetLayoutPatch) => void
}

/**
 * In-app spreadsheet for designing a budget format: grid-first with editable headers,
 * type row, and sample data rows. No external account required.
 */
/** Logical row index: 0 = header, 1 = type row, 2..2+previewRows-1 = data rows */
const LOGICAL_HEADER_ROW = 0
const LOGICAL_TYPE_ROW = 1

export function SpreadsheetFormatEditor({
  value,
  onChange,
  disabled,
  sheetName = 'Sheet',
  initialColumnWidths,
  initialHeaderRowHeight,
  initialTypeRowHeight,
  initialDataRowHeight,
  initialCellData,
  initialDataRowCount,
  onSheetLayoutChange,
}: SpreadsheetFormatEditorProps) {
  const [previewRows, setPreviewRows] = useState(() => initialDataRowCount ?? DEFAULT_TEMPLATE_ROWS)
  const [selectedColIndex, setSelectedColIndex] = useState<number | null>(null)
  /** Cell values for data rows only: key "dataRowIdx,colIdx" */
  const [cellData, setCellData] = useState<Record<string, string>>(() => initialCellData ?? {})
  const cellRefs = useRef<Record<string, HTMLElement | null>>({})
  /** Column index -> width in px */
  const [columnWidths, setColumnWidths] = useState<Record<number, number>>(() => initialColumnWidths ?? {})
  /** Row heights in px: header row, type row, data rows */
  const [headerRowHeight, setHeaderRowHeight] = useState(() => initialHeaderRowHeight ?? DEFAULT_HEADER_ROW_HEIGHT)
  const [typeRowHeight, setTypeRowHeight] = useState(() => initialTypeRowHeight ?? DEFAULT_TYPE_ROW_HEIGHT)
  const [dataRowHeight, setDataRowHeight] = useState(() => initialDataRowHeight ?? DEFAULT_DATA_ROW_HEIGHT)
  const resizeRef = useRef({ startX: 0, startWidth: 0, startY: 0, startHeight: 0 })
  const [resizingCol, setResizingCol] = useState<number | null>(null)
  const [resizingRow, setResizingRow] = useState<number | null>(null) // 0 = header, 1 = type, 2 = data
  const columns = value.length > 0 ? value : []
  const columnKeys = columns.map((c) => c.key).filter(Boolean)

  const numCols = columns.length
  const maxLogicalRow = LOGICAL_TYPE_ROW + previewRows

  React.useEffect(() => {
    if (initialColumnWidths != null && Object.keys(initialColumnWidths).length > 0) setColumnWidths(initialColumnWidths)
  }, [initialColumnWidths])
  React.useEffect(() => {
    if (initialHeaderRowHeight != null) setHeaderRowHeight(initialHeaderRowHeight)
  }, [initialHeaderRowHeight])
  React.useEffect(() => {
    if (initialTypeRowHeight != null) setTypeRowHeight(initialTypeRowHeight)
  }, [initialTypeRowHeight])
  React.useEffect(() => {
    if (initialDataRowHeight != null) setDataRowHeight(initialDataRowHeight)
  }, [initialDataRowHeight])
  React.useEffect(() => {
    if (initialCellData != null) setCellData(initialCellData)
  }, [initialCellData])
  React.useEffect(() => {
    if (initialDataRowCount != null && initialDataRowCount >= 1) setPreviewRows(initialDataRowCount)
  }, [initialDataRowCount])

  const getColWidth = useCallback((colIndex: number) => columnWidths[colIndex] ?? DEFAULT_COL_WIDTH, [columnWidths])

  const setRef = useCallback((logicalRow: number, col: number, el: HTMLElement | null) => {
    const key = `${logicalRow},${col}`
    cellRefs.current[key] = el
  }, [])

  const focusCell = useCallback(
    (logicalRow: number, col: number) => {
      const key = `${logicalRow},${col}`
      const el = cellRefs.current[key]
      if (el) {
        el.focus()
        if ('select' in el && typeof (el as HTMLInputElement).select === 'function') (el as HTMLInputElement).select()
      }
    },
    []
  )

  const handleCellKeyDown = useCallback(
    (logicalRow: number, col: number, e: React.KeyboardEvent) => {
      if (disabled) return
      switch (e.key) {
        case 'ArrowDown': {
          const nextRow = Math.min(logicalRow + 1, maxLogicalRow)
          if (nextRow !== logicalRow) {
            e.preventDefault()
            focusCell(nextRow, col)
          }
          break
        }
        case 'ArrowUp': {
          const nextRow = Math.max(logicalRow - 1, 0)
          if (nextRow !== logicalRow) {
            e.preventDefault()
            focusCell(nextRow, col)
          }
          break
        }
        case 'ArrowRight': {
          if (col < numCols - 1) {
            e.preventDefault()
            focusCell(logicalRow, col + 1)
          }
          break
        }
        case 'ArrowLeft': {
          if (col > 0) {
            e.preventDefault()
            focusCell(logicalRow, col - 1)
          }
          break
        }
        case 'Tab': {
          e.preventDefault()
          if (e.shiftKey) {
            if (col > 0) focusCell(logicalRow, col - 1)
            else if (logicalRow > 0) focusCell(logicalRow - 1, numCols - 1)
          } else {
            if (col < numCols - 1) focusCell(logicalRow, col + 1)
            else if (logicalRow < maxLogicalRow) focusCell(logicalRow + 1, 0)
          }
          break
        }
        case 'Enter': {
          e.preventDefault()
          const nextRow = Math.min(logicalRow + 1, maxLogicalRow)
          if (nextRow !== logicalRow) focusCell(nextRow, col)
          break
        }
        default:
          break
      }
    },
    [disabled, maxLogicalRow, numCols, focusCell]
  )

  const handleColResizeStart = useCallback((colIndex: number, e: React.MouseEvent) => {
    e.preventDefault()
    if (disabled) return
    resizeRef.current = { startX: e.clientX, startWidth: columnWidths[colIndex] ?? DEFAULT_COL_WIDTH, startY: 0, startHeight: 0 }
    setResizingCol(colIndex)
  }, [disabled, columnWidths])

  const handleRowResizeStart = useCallback((rowKind: number, e: React.MouseEvent) => {
    e.preventDefault()
    if (disabled) return
    const startHeight = rowKind === 0 ? headerRowHeight : rowKind === 1 ? typeRowHeight : dataRowHeight
    resizeRef.current = { startX: 0, startWidth: 0, startY: e.clientY, startHeight }
    setResizingRow(rowKind)
  }, [disabled, headerRowHeight, typeRowHeight, dataRowHeight])

  React.useEffect(() => {
    if (resizingCol === null) return
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeRef.current.startX
      const newWidth = Math.min(MAX_COL_WIDTH, Math.max(MIN_COL_WIDTH, resizeRef.current.startWidth + delta))
      setColumnWidths((prev) => {
        const next = { ...prev, [resizingCol]: newWidth }
        columnWidthsRef.current = next
        return next
      })
    }
    const onUp = () => {
      onSheetLayoutChange?.({ columnWidths: columnWidthsRef.current })
      setResizingCol(null)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [resizingCol, onSheetLayoutChange])

  const rowHeightsRef = useRef({ headerRowHeight, typeRowHeight, dataRowHeight })
  React.useEffect(() => {
    rowHeightsRef.current = { headerRowHeight, typeRowHeight, dataRowHeight }
  }, [headerRowHeight, typeRowHeight, dataRowHeight])
  React.useEffect(() => {
    if (resizingRow === null) return
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
    const onMove = (e: MouseEvent) => {
      const delta = e.clientY - resizeRef.current.startY
      const newHeight = Math.min(MAX_ROW_HEIGHT, Math.max(MIN_ROW_HEIGHT, resizeRef.current.startHeight + delta))
      if (resizingRow === 0) setHeaderRowHeight(newHeight)
      else if (resizingRow === 1) setTypeRowHeight(newHeight)
      else setDataRowHeight(newHeight)
      resizeRef.current.startHeight = newHeight
      resizeRef.current.startY = e.clientY
    }
    const onUp = () => {
      const { headerRowHeight: h, typeRowHeight: t, dataRowHeight: d } = rowHeightsRef.current
      onSheetLayoutChange?.({ headerRowHeight: h, typeRowHeight: t, dataRowHeight: d })
      setResizingRow(null)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [resizingRow, onSheetLayoutChange])

  const updateColumn = (index: number, field: keyof ColumnDefRow, fieldValue: string | boolean) => {
    const next = value.map((col, i) => {
      if (i !== index) return col
      const updated = { ...col, [field]: fieldValue }
      if (field === 'label') {
        if (!col.key) updated.key = slugify(String(fieldValue))
        // Auto-detect cell format from column header
        const detected = detectCellFormatFromLabel(String(fieldValue))
        updated.type = detected
      }
      return updated
    })
    onChange(next)
  }

  const addColumn = () => {
    const next = [...value, { key: '', label: '', type: 'text', required: false, computed: '' }]
    onChange(next)
    setSelectedColIndex(next.length - 1)
  }

  const removeColumn = (index: number) => {
    if (value.length <= 1) return
    const next = value.filter((_, i) => i !== index)
    onChange(next)
    setSelectedColIndex(null)
  }

  const columnWidthsRef = useRef<Record<number, number>>({})
  const layoutRef = useRef<SheetLayoutPatch>({})
  React.useEffect(() => {
    columnWidthsRef.current = columnWidths
    layoutRef.current = {
      ...layoutRef.current,
      columnWidths,
      headerRowHeight,
      typeRowHeight,
      dataRowHeight,
      cellData,
      dataRowCount: previewRows,
    }
  }, [columnWidths, headerRowHeight, typeRowHeight, dataRowHeight, cellData, previewRows])

  const addPreviewRow = () => setPreviewRows((n) => {
    const next = Math.min(200, n + 1)
    onSheetLayoutChange?.({ dataRowCount: next })
    return next
  })

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* Collapsible format options */}
      <details className="group shrink-0 mb-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 overflow-hidden">
        <summary className="list-none cursor-pointer select-none flex items-center gap-2 py-2 px-2.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
          <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90 text-slate-500" />
          <Table2 className="h-4 w-4 shrink-0 text-slate-500" />
          <span className="font-medium">Format options</span>
          <span className="text-slate-400 dark:text-slate-500 text-xs">
            {sheetName} · {columns.length} column{columns.length !== 1 ? 's' : ''}
          </span>
        </summary>
        <div className="pl-4 pr-2 pt-2 pb-2 space-y-2 border-t border-slate-100 dark:border-slate-700">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPreviewRow}
              disabled={disabled || columns.length === 0}
              title="Add preview row"
              className="gap-1.5"
            >
              <Rows3 className="h-4 w-4" />
              Add row
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={addColumn} disabled={disabled} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add column
            </Button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            Cell format is auto-detected from the column header. Override in the type row (row 2).
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Excel-style navigation: Arrow keys to move, Tab / Shift+Tab for next/previous cell, Enter to move down.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Resize: drag the <GripVertical className="h-3 w-3 inline mx-0.5 text-slate-400" /> grip at the right edge of a column, or the <GripHorizontal className="h-3 w-3 inline mx-0.5 text-slate-400" /> bar below a row.
          </p>
        </div>
      </details>

      {/* Spreadsheet grid — clean Excel-style: white, thin light grey grid, no placeholders */}
      <div className="rounded-lg border border-slate-100 bg-white overflow-hidden dark:border-slate-700 dark:bg-slate-900 flex-1 min-h-[320px] flex flex-col shadow-sm">
        <div className="overflow-auto flex-1 min-h-[300px] max-h-[min(85vh,1000px)] scrollbar-thin bg-white dark:bg-slate-900" style={{ scrollbarGutter: 'stable' }}>
          <table className="w-full text-sm border-collapse min-w-0 bg-white dark:bg-slate-900">
            <thead className="sticky top-0 z-20 bg-white dark:bg-slate-900">
              {/* Row 0: Column letters A, B, C, ... — subtle grey */}
              <tr className="border-b border-slate-100 dark:border-slate-700/80" style={{ height: 28 }}>
                <th className="w-9 min-w-[36px] h-7 shrink-0 border-r border-slate-100 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs font-medium text-center sticky left-0 z-20">
                  {/* Corner */}
                </th>
                {columns.map((col, i) => (
                  <th
                    key={i}
                    className="relative h-7 border-r border-slate-100 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs font-medium text-center shrink-0"
                    style={{ width: getColWidth(i), minWidth: MIN_COL_WIDTH, maxWidth: MAX_COL_WIDTH }}
                  >
                    {columnLetter(i)}
                    {!disabled && (
                      <span
                        role="separator"
                        aria-label={`Resize column ${columnLetter(i)}`}
                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize flex items-center justify-center group hover:bg-slate-200/60 dark:hover:bg-slate-600/40 transition-colors z-30"
                        onMouseDown={(e) => handleColResizeStart(i, e)}
                      >
                        <GripVertical className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100" />
                      </span>
                    )}
                  </th>
                ))}
                {columns.length === 0 && (
                  <th className="min-w-[80px] h-7 border-r border-slate-100 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/60" />
                )}
              </tr>
              {/* Row 1: Column headers (editable) — light grey header row */}
              <tr className="border-b border-slate-100 dark:border-slate-700/80" style={{ height: headerRowHeight }}>
                <th className="w-9 min-w-[36px] shrink-0 border-r border-slate-100 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs font-medium text-center sticky left-0 z-20">
                  1
                </th>
                {columns.map((col, i) => (
                  <th
                    key={i}
                    className={cn(
                      'relative p-0 border-r border-slate-100 dark:border-slate-700/80 shrink-0',
                      selectedColIndex === i && 'ring-1 ring-inset ring-slate-300 dark:ring-slate-500',
                      'bg-slate-50 dark:bg-slate-800/60'
                    )}
                    style={{ width: getColWidth(i), minWidth: MIN_COL_WIDTH, maxWidth: MAX_COL_WIDTH }}
                  >
                    <Input
                      ref={(el) => setRef(LOGICAL_HEADER_ROW, i, el)}
                      value={col.label}
                      onChange={(e) => updateColumn(i, 'label', e.target.value)}
                      onFocus={() => setSelectedColIndex(i)}
                      onKeyDown={(e) => handleCellKeyDown(LOGICAL_HEADER_ROW, i, e)}
                      placeholder=""
                      disabled={disabled}
                      className="h-full w-full rounded-none border-0 bg-transparent text-slate-800 dark:text-slate-200 placeholder:text-transparent font-medium text-xs focus-visible:ring-0.5 focus-visible:ring-ring focus-visible:ring-offset-0 min-h-0"
                      style={{ height: headerRowHeight }}
                    />
                    {!disabled && (
                      <span
                        role="separator"
                        aria-label={`Resize column ${columnLetter(i)}`}
                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize flex items-center justify-center group hover:bg-slate-200/60 dark:hover:bg-slate-600/40 z-30"
                        onMouseDown={(e) => handleColResizeStart(i, e)}
                      >
                        <GripVertical className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100" />
                      </span>
                    )}
                  </th>
                ))}
                {columns.length === 0 && (
                  <th className="min-w-[120px] p-2 text-slate-400 font-normal text-left bg-slate-50 dark:bg-slate-800/60 text-xs">
                    Add column to start
                  </th>
                )}
              </tr>
              {/* Row 1 resize handle */}
              {!disabled && columns.length > 0 && (
                <tr className="border-0">
                  <td colSpan={numCols + 1} className="p-0 h-0 border-0">
                    <div
                      role="separator"
                      aria-label="Resize header row"
                      className="h-1 -mt-px cursor-row-resize flex items-center justify-center bg-transparent hover:bg-slate-100 dark:hover:bg-slate-700/40 group transition-colors border-b border-slate-100 dark:border-slate-700/80"
                      onMouseDown={(e) => handleRowResizeStart(0, e)}
                    >
                      <GripHorizontal className="h-3 w-3 text-slate-300 dark:text-slate-500 opacity-0 group-hover:opacity-100" />
                    </div>
                  </td>
                </tr>
              )}
              {/* Row 2: Type per column — subtle row */}
              {columns.length > 0 && (
                <>
                  <tr className="border-b border-slate-100 dark:border-slate-700/80 bg-white dark:bg-slate-900" style={{ height: typeRowHeight }}>
                    <td className="w-9 min-w-[36px] p-0 border-r border-slate-100 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs font-medium text-center align-middle sticky left-0 z-10">
                      2
                    </td>
                    {columns.map((col, i) => (
                      <td
                        key={i}
                        className="p-0.5 border-r border-slate-100 dark:border-slate-700/80 last:border-r-0 bg-white dark:bg-slate-900"
                        style={{ width: getColWidth(i), minWidth: MIN_COL_WIDTH, maxWidth: MAX_COL_WIDTH }}
                        onClick={() => setSelectedColIndex(i)}
                      >
                        <Select
                          value={col.type}
                          onValueChange={(v) => updateColumn(i, 'type', v)}
                          disabled={disabled}
                        >
                          <SelectTrigger
                            ref={(el) => setRef(LOGICAL_TYPE_ROW, i, el)}
                            onKeyDown={(e) => handleCellKeyDown(LOGICAL_TYPE_ROW, i, e)}
                            className="h-full min-h-7 text-xs rounded-none border-0 border-b border-slate-100 dark:border-slate-700 bg-transparent dark:bg-transparent shadow-none focus:ring-0.5 focus:ring-ring w-full"
                            style={{ height: typeRowHeight - 6 }}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CELL_FORMAT_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    ))}
                  </tr>
                  {/* Row 2 resize handle */}
                  {!disabled && (
                    <tr className="border-0">
                      <td colSpan={numCols + 1} className="p-0 h-0 border-0">
                        <div
                          role="separator"
                          aria-label="Resize type row"
                          className="h-1 -mt-px cursor-row-resize flex items-center justify-center bg-transparent hover:bg-slate-100 dark:hover:bg-slate-700/40 group transition-colors border-b border-slate-100 dark:border-slate-700/80"
                          onMouseDown={(e) => handleRowResizeStart(1, e)}
                        >
                          <GripHorizontal className="h-3 w-3 text-slate-300 dark:text-slate-500 opacity-0 group-hover:opacity-100" />
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )}
            </thead>
            <tbody>
              {Array.from({ length: previewRows }).map((_, rowIdx) => (
                <React.Fragment key={rowIdx}>
                  <tr
                    className="border-b border-slate-100 dark:border-slate-700/80 last:border-b-0 bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    style={{ height: dataRowHeight }}
                  >
                    <td className="w-9 min-w-[36px] p-0 border-r border-slate-100 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs font-medium text-center align-middle sticky left-0 z-10">
                      {rowIdx + 3}
                    </td>
                    {columns.map((col, colIdx) => {
                      const dataKey = `${rowIdx},${colIdx}`
                      const logicalRow = LOGICAL_TYPE_ROW + 1 + rowIdx
                      const cellValue = cellData[dataKey] ?? ''
                      return (
                        <td
                          key={colIdx}
                          className="p-0 border-r border-slate-100 dark:border-slate-700/80 last:border-r-0 bg-white dark:bg-slate-900"
                          style={{ width: getColWidth(colIdx), minWidth: MIN_COL_WIDTH, maxWidth: MAX_COL_WIDTH }}
                        >
                          <input
                            ref={(el) => setRef(logicalRow, colIdx, el)}
                            type="text"
                            value={cellValue}
                            onChange={(e) => {
                              setCellData((prev) => {
                                const next = { ...prev, [dataKey]: e.target.value }
                                onSheetLayoutChange?.({ cellData: next })
                                return next
                              })
                            }}
                            onKeyDown={(e) => handleCellKeyDown(logicalRow, colIdx, e)}
                            placeholder=""
                            disabled={disabled}
                            className="h-full w-full px-2 py-0.5 text-xs rounded-none border-0 bg-transparent text-slate-800 dark:text-slate-200 placeholder:text-transparent focus:outline-none focus:ring-0.5 focus:ring-ring focus:bg-slate-50/80 dark:focus:bg-slate-800/50 min-h-0"
                            style={{ height: dataRowHeight }}
                          />
                        </td>
                      )
                    })}
                    {columns.length === 0 && (
                      <td className="p-2 border-r border-slate-100 dark:border-slate-700/80 bg-white dark:bg-slate-900 min-w-[80px]" />
                    )}
                  </tr>
                  {/* Data row height resize: only after first data row */}
                  {!disabled && columns.length > 0 && rowIdx === 0 && (
                    <tr className="border-0">
                      <td colSpan={numCols + 1} className="p-0 h-0 border-0">
                        <div
                          role="separator"
                          aria-label="Resize data row height"
                          className="h-1 -mt-px cursor-row-resize flex items-center justify-center bg-transparent hover:bg-slate-100 dark:hover:bg-slate-700/40 group transition-colors border-b border-slate-100 dark:border-slate-700/80"
                          onMouseDown={(e) => handleRowResizeStart(2, e)}
                        >
                          <GripHorizontal className="h-3 w-3 text-slate-300 dark:text-slate-500 opacity-0 group-hover:opacity-100" />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Column options for selected column */}
      {columns.length > 0 && selectedColIndex !== null && selectedColIndex < columns.length && (
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-800/30">
          <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Column: &quot;{columns[selectedColIndex].label || columns[selectedColIndex].key || 'Untitled'}&quot;
          </Label>
          <div className="mt-2 flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="required-col"
                checked={!!columns[selectedColIndex].required}
                onChange={(e) => updateColumn(selectedColIndex, 'required', e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 rounded border-slate-300"
              />
              <label htmlFor="required-col" className="text-xs text-slate-600 dark:text-slate-400">
                Required
              </label>
            </div>
            <div className="flex-1 min-w-[200px] flex gap-1">
              <Input
                placeholder="Computed formula (e.g. q1+q2+q3+q4)"
                value={columns[selectedColIndex].computed ?? ''}
                onChange={(e) => updateColumn(selectedColIndex, 'computed', e.target.value)}
                disabled={disabled}
                className="h-8 font-mono text-xs flex-1"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    title="Insert formula"
                  >
                    <Calculator className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {FORMULA_PRESETS.map((preset, i) => (
                    <DropdownMenuItem
                      key={i}
                      onClick={() => updateColumn(selectedColIndex, 'computed', preset.formula)}
                    >
                      {preset.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                    Keys: {columnKeys.length ? columnKeys.join(', ') : '—'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => removeColumn(selectedColIndex)}
              disabled={disabled || columns.length <= 1}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Remove column
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
