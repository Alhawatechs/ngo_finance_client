'use client'

import React, { useRef, useEffect, useCallback, useState } from 'react'
import HotTable, { HotTableClass } from '@handsontable/react'
import { HyperFormula } from 'hyperformula'
import type { FormatSheet } from '@/components/budget/ColumnDefinitionEditor'
import 'handsontable/dist/handsontable.full.min.css'

/** Convert FormatSheet to 2D array: row0=headers, row1+=data (no types row) */
export function formatSheetToGridData(sheet: FormatSheet): string[][] {
  const cols = sheet.columns ?? []
  const numCols = cols.length
  if (numCols === 0) return [[''], []]

  const row0 = cols.map((c) => c.label ?? '')
  const cellData = sheet.cellData ?? {}
  const dataRowCount = Math.max(1, sheet.dataRowCount ?? 10)
  const rows: string[][] = [row0]

  for (let r = 0; r < dataRowCount; r++) {
    const row: string[] = []
    for (let c = 0; c < numCols; c++) {
      row.push(cellData[`${r},${c}`] ?? '')
    }
    rows.push(row)
  }
  return rows
}

function slug(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'column'
}

/** Convert 2D grid back to partial FormatSheet update (row0=headers, row1+=data; column types from existing or default) */
export function gridDataToSheetUpdate(
  grid: string[][],
  existingColumns: FormatSheet['columns']
): { columns: FormatSheet['columns']; cellData: Record<string, string>; dataRowCount: number } {
  if (grid.length < 1) {
    return {
      columns: existingColumns,
      cellData: {},
      dataRowCount: 0,
    }
  }
  const row0 = grid[0] ?? []
  const numCols = Math.max(existingColumns.length, row0.length)
  const columns = existingColumns.slice(0, numCols).map((col, i) => ({
    ...col,
    label: String(row0[i] ?? col.label ?? '').trim() || col.label,
    type: col.type ?? 'text',
  }))
  while (columns.length < numCols) {
    const i = columns.length
    const label = String(row0[i] ?? '').trim()
    columns.push({
      key: slug(label) || `col_${i}`,
      label,
      type: 'text',
      required: false,
      computed: '',
    })
  }
  const cellData: Record<string, string> = {}
  for (let r = 1; r < grid.length; r++) {
    const row = grid[r] ?? []
    for (let c = 0; c < numCols; c++) {
      const val = row[c]
      if (val != null && String(val).trim() !== '') cellData[`${r - 1},${c}`] = String(val)
    }
  }
  return {
    columns,
    cellData,
    dataRowCount: Math.max(0, grid.length - 1),
  }
}

interface HandsontableSpreadsheetEmbedProps {
  /** Current sheet (for initial data and column count) */
  sheet: FormatSheet
  /** Called when user edits; pass updated columns + cellData + dataRowCount */
  onChange: (update: {
    columns: FormatSheet['columns']
    cellData: Record<string, string>
    dataRowCount: number
  }) => void
  disabled?: boolean
  className?: string
}

/**
 * Embedded Handsontable spreadsheet with HyperFormula (Excel-like formulas).
 * Use for budget format template editing when user wants formula support.
 */
export function HandsontableSpreadsheetEmbed({
  sheet,
  onChange,
  disabled = false,
  className = '',
}: HandsontableSpreadsheetEmbedProps) {
  const hotRef = useRef<HotTableClass | null>(null)
  const [gridData, setGridData] = useState<string[][]>(() => formatSheetToGridData(sheet))
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    setGridData(formatSheetToGridData(sheet))
  }, [sheet.key, sheet.columns?.length, sheet.cellData, sheet.dataRowCount])

  const afterChange = useCallback(
    (changes: unknown, source: string) => {
      if (source === 'loadData' || !Array.isArray(changes) || changes.length === 0 || disabled) return
      const hot = hotRef.current?.hotInstance
      if (!hot) return
      // getData() returns current cell content (with formulas plugin, formula strings are stored in data)
      const data = hot.getData() as string[][]
      const update = gridDataToSheetUpdate(data, sheet.columns)
      onChangeRef.current(update)
      setGridData(data)
    },
    [disabled, sheet.columns]
  )

  return (
    <div className={className} style={{ minHeight: 320 }}>
      <HotTable
        ref={hotRef}
        data={gridData}
        licenseKey="non-commercial-and-evaluation"
        formulas={{
          engine: HyperFormula,
        }}
        afterChange={afterChange}
        readOnly={disabled}
        rowHeaders={true}
        colHeaders={true}
        contextMenu={!disabled}
        manualColumnResize={true}
        manualRowResize={true}
        stretchH="all"
        width="100%"
        height={400}
        cells={() => ({ readOnly: disabled })}
        className="htCenter htMiddle"
      />
    </div>
  )
}
