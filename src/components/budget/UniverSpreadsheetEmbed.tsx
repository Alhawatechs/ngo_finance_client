'use client'

import React, { useRef, useEffect, useState } from 'react'
import type { LocaleType } from '@univerjs/core'
import { createDefaultSheet, type FormatSheet } from '@/components/budget/ColumnDefinitionEditor'
import {
  formatSheetToGridData,
  gridDataToSheetUpdate,
} from '@/components/budget/HandsontableSpreadsheetEmbed'

/** Univer cellData is row -> col -> { v?, f?, s? }. s = style id for workbook.styles. */
type UniverCellData = Record<string, Record<string, { v?: string | number | boolean; f?: string; s?: string }>>

/** Snapshot sheet may include columnData, rowData, mergeData (from Univer save()). */
type UniverSheetSnapshot = {
  rowCount?: number
  columnCount?: number
  cellData?: UniverCellData
  name?: string
  columnData?: Record<string, { w?: number; hd?: number }>
  rowData?: Record<string, { h?: number; hd?: number }>
  mergeData?: { startRow: number; startColumn: number; endRow: number; endColumn: number }[]
}

function gridToUniverCellData(grid: string[][]): UniverCellData {
  const cellData: UniverCellData = {}
  grid.forEach((row, r) => {
    cellData[r] = {}
    row.forEach((val, c) => {
      const s = val != null ? String(val).trim() : ''
      if (s === '') return
      /* Preserve formulas so Univer can evaluate them; use only f so engine computes v */
      if (s.startsWith('=')) {
        cellData[r][c] = { f: s }
      } else {
        cellData[r][c] = { v: s }
      }
    })
  })
  return cellData
}

/** Dedupe style objects across sheets and return styles map and keyToId(json) lookup. */
function buildWorkbookStyles(
  sheets: FormatSheet[]
): { styles: Record<string, Record<string, unknown>>; keyToId: (json: string) => string } {
  const styleMap = new Map<string, string>()
  const styles: Record<string, Record<string, unknown>> = {}
  let nextId = 0
  for (const sheet of sheets) {
    const cellStyles = sheet.cellStyles
    if (!cellStyles || typeof cellStyles !== 'object') continue
    for (const key of Object.keys(cellStyles)) {
      const obj = cellStyles[key]
      if (!obj || typeof obj !== 'object') continue
      const json = JSON.stringify(obj)
      if (!styleMap.has(json)) {
        const id = `s${nextId++}`
        styleMap.set(json, id)
        styles[id] = obj
      }
    }
  }
  return {
    styles,
    keyToId: (json: string) => styleMap.get(json) ?? '',
  }
}

/** Apply cellStyles to cellData (add .s style id) and return merged cellData. */
function applyCellStyles(
  cellData: UniverCellData,
  cellStyles: Record<string, Record<string, unknown>> | undefined,
  keyToId: (key: string) => string
): UniverCellData {
  if (!cellStyles || typeof cellStyles !== 'object') return cellData
  const out = { ...cellData }
  for (const key of Object.keys(cellStyles)) {
    const [r, c] = key.split(',').map(Number)
    if (Number.isNaN(r) || Number.isNaN(c)) continue
    const styleId = keyToId(JSON.stringify(cellStyles[key]))
    if (!styleId) continue
    if (!out[r]) out[r] = {}
    out[r][c] = { ...(out[r][c] ?? {}), s: styleId }
  }
  return out
}

function univerCellDataToGrid(
  cellData: UniverCellData | undefined,
  rowCount: number,
  columnCount: number
): string[][] {
  const grid: string[][] = []
  for (let r = 0; r < rowCount; r++) {
    const row: string[] = []
    const rowData = cellData?.[r]
    for (let c = 0; c < columnCount; c++) {
      const cell = rowData?.[c]
      const f = cell?.f
      const v = cell?.v
      const val =
        f != null && String(f).startsWith('=')
          ? String(f)
          : v != null
            ? String(v)
            : ''
      row.push(val)
    }
    grid.push(row)
  }
  return grid
}

interface UniverSpreadsheetEmbedProps {
  /** All sheets in the template; one Univer worksheet per item. */
  sheets: FormatSheet[]
  /** Key of the sheet to show; switching is driven by the parent (e.g. custom tab bar). */
  activeSheetKey?: string
  /** Called with the full updated sheets array when any sheet changes. */
  onChange: (sheets: FormatSheet[]) => void
  disabled?: boolean
  className?: string
  onError?: (error: Error) => void
}

/**
 * Embedded Univer spreadsheet with multiple worksheets. Row 0 = headers, row 1+ = data (no types row).
 * The built-in sheet bar is hidden; the parent controls the active sheet via activeSheetKey (e.g. custom tab bar).
 */
type ScrollState = { sheetViewStartRow: number; sheetViewStartColumn: number }

type UniverAPI = {
  createWorkbook: (data: unknown) => void
  getActiveWorkbook: () => {
    save: () => { sheetOrder?: string[]; sheets?: Record<string, UniverSheetSnapshot>; styles?: Record<string, Record<string, unknown>> }
    getActiveSheet: () => {
      getMaxRows: () => number
      getMaxColumns: () => number
      getScrollState: () => ScrollState
      scrollToCell: (row: number, column: number, duration?: number) => unknown
      insertRowsAfter: (afterPosition: number, howMany: number) => unknown
      insertColumnsAfter: (afterPosition: number, howMany: number) => unknown
    }
    getSheetBySheetId: (id: string) => unknown
    setActiveSheet: (sheet: unknown) => void
  } | null
  addEvent: (name: string, cb: () => void) => { dispose: () => void }
  disposeUnit: (id: string) => void
  loadLocales?: (locale: string, pack: Record<string, unknown>) => void
  setLocale?: (locale: string) => void
}

export function UniverSpreadsheetEmbed({
  sheets: sheetsProp,
  activeSheetKey,
  onChange,
  disabled = false,
  className = '',
  onError,
}: UniverSpreadsheetEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onChangeRef = useRef(onChange)
  const mountedRef = useRef(true)
  const onErrorRef = useRef(onError)
  const apiRef = useRef<UniverAPI | null>(null)
  const syncRef = useRef<(() => void) | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const sheets = sheetsProp.length > 0 ? sheetsProp : [createDefaultSheet('0', 'Main')]
  onChangeRef.current = onChange
  onErrorRef.current = onError

  useEffect(() => {
    setLoadFailed(false)
    mountedRef.current = true
    const container = containerRef.current
    if (!container) return

    let univer: { univer: { dispose: () => void }; univerAPI: unknown } | null = null
    let eventDisposable: { dispose: () => void } | null = null
    let commandDisposable: { dispose: () => void } | null = null
    let editEndDisposable: { dispose: () => void } | null = null
    let syncTimeout: ReturnType<typeof setTimeout> | null = null
    let rafId = 0

    const init = async () => {
      if (!mountedRef.current) return
      try {
        await new Promise<void>((resolve) => {
          rafId = requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve())
          })
        })
        if (!mountedRef.current) return
        const [
          presetsModule,
          presetSheetsModule,
          enUSLocaleModule,
        ] = await Promise.all([
          import('@univerjs/presets'),
          import('@univerjs/preset-sheets-core'),
          import('@univerjs/preset-sheets-core/locales/en-US').catch(() => ({ default: {} })),
        ])
        await import('@univerjs/preset-sheets-core/lib/index.css')
        if (!mountedRef.current) return

        const MIN_CONTAINER_WIDTH = 200
        let rect = container.getBoundingClientRect()
        if (rect.width < MIN_CONTAINER_WIDTH) {
          await new Promise<void>((resolve, reject) => {
            let resolved = false
            const timeout = setTimeout(() => {
              if (resolved) return
              resolved = true
              observer.disconnect()
              if (container.getBoundingClientRect().width >= MIN_CONTAINER_WIDTH) resolve()
              else reject(new Error('Spreadsheet container has no width. Ensure the parent has a defined width.'))
            }, 8000)
            const observer = new ResizeObserver(() => {
              if (!mountedRef.current || resolved) return
              const r = container.getBoundingClientRect()
              if (r.width >= MIN_CONTAINER_WIDTH) {
                resolved = true
                clearTimeout(timeout)
                observer.disconnect()
                resolve()
              }
            })
            observer.observe(container)
          })
        }
        if (!mountedRef.current) return
        rect = container.getBoundingClientRect()
        if (rect.width < MIN_CONTAINER_WIDTH) {
          throw new Error('Spreadsheet container has no width. Ensure the parent has a defined width.')
        }

        const { createUniver, LocaleType, mergeLocales } = presetsModule
        const { UniverSheetsCorePreset } = presetSheetsModule
        const UniverPresetSheetsCoreEnUS = (enUSLocaleModule?.default ?? enUSLocaleModule) as Record<string, unknown>
        const localeKey = (typeof LocaleType !== 'undefined' && LocaleType?.EN_US) ? LocaleType.EN_US : 'enUS'
        const languagePack =
          typeof mergeLocales === 'function' && UniverPresetSheetsCoreEnUS && Object.keys(UniverPresetSheetsCoreEnUS).length > 0
            ? mergeLocales(UniverPresetSheetsCoreEnUS)
            : (UniverPresetSheetsCoreEnUS && Object.keys(UniverPresetSheetsCoreEnUS).length > 0
              ? UniverPresetSheetsCoreEnUS
              : { shortcut: { undo: 'Undo', redo: 'Redo' } }) as Record<string, unknown>

        // Ensure locale config is a plain object so Univer always receives it (avoids "Locale not initialized")
        // createUniver expects locale to be LocaleType (enum), not string
        const localeConfig = {
          locale: localeKey as LocaleType,
          locales: { [String(localeKey)]: languagePack } as Record<string, Record<string, unknown>>,
        }

      const sheetOrder = sheets.map((s) => s.key)
      const { styles: workbookStyles, keyToId } = buildWorkbookStyles(sheets)
      const defaultColWidth = 100
      const defaultRowH = 25
      const sheetsData: Record<string, {
        id: string
        name: string
        tabColor: string
        hidden: number
        freeze: { startRow: number; startColumn: number; ySplit: number; xSplit: number }
        rowCount: number
        columnCount: number
        defaultColumnWidth: number
        defaultRowHeight: number
        mergeData: { startRow: number; startColumn: number; endRow: number; endColumn: number }[]
        cellData: UniverCellData
        rowData: Record<string, unknown>
        columnData: Record<string, unknown>
        rowHeader: { width: number; hidden: number }
        columnHeader: { height: number; hidden: number }
        showGridlines: number
        rightToLeft: number
      }> = {}
      for (const sheet of sheets) {
        const grid = formatSheetToGridData(sheet)
        const numRows = grid.length
        const numCols = Math.max(1, grid.reduce((max, row) => Math.max(max, row.length), 0))
        const mergeData = (sheet.mergeRanges ?? []).map((m) => ({
          startRow: m.startRow,
          startColumn: m.startColumn,
          endRow: m.endRow,
          endColumn: m.endColumn,
        }))
        const baseCellData = gridToUniverCellData(grid)
        const cellData = applyCellStyles(baseCellData, sheet.cellStyles, keyToId)
        const columnData: Record<string, { w?: number; hd?: number }> = {}
        if (sheet.columnWidths && typeof sheet.columnWidths === 'object') {
          for (const c of Object.keys(sheet.columnWidths)) {
            const w = sheet.columnWidths[Number(c)]
            if (w != null && w > 0) columnData[c] = { w, hd: 0 }
          }
        }
        const rowData: Record<string, { h?: number; hd?: number }> = {}
        if (sheet.headerRowHeight != null && sheet.headerRowHeight > 0) rowData['0'] = { h: sheet.headerRowHeight, hd: 0 }
        if (sheet.typeRowHeight != null && sheet.typeRowHeight > 0) rowData['1'] = { h: sheet.typeRowHeight, hd: 0 }
        const dataH = sheet.dataRowHeight ?? defaultRowH
        if (dataH > 0 && numRows > 2) {
          for (let r = 2; r < numRows; r++) rowData[String(r)] = { h: dataH, hd: 0 }
        }
        sheetsData[sheet.key] = {
          id: sheet.key,
          name: sheet.name || 'Sheet',
          tabColor: '',
          hidden: 0,
          freeze: { startRow: -1, startColumn: -1, ySplit: 0, xSplit: 0 },
          rowCount: Math.max(numRows, 100),
          columnCount: Math.max(numCols, 26),
          defaultColumnWidth: defaultColWidth,
          defaultRowHeight: dataH > 0 ? dataH : defaultRowH,
          mergeData,
          cellData,
          rowData,
          columnData,
          rowHeader: { width: 46, hidden: 0 },
          columnHeader: { height: 20, hidden: 0 },
          showGridlines: 1,
          rightToLeft: 0,
        }
      }
      const workbookData = {
        id: `workbook-budget-${sheetOrder.join('-')}`,
        name: 'Budget template',
        appVersion: '0.15.5',
        locale: 'enUS',
        styles: workbookStyles,
        sheetOrder,
        sheets: sheetsData,
      }

      univer = createUniver({
        ...localeConfig,
        presets: [
          UniverSheetsCorePreset({
            container,
            header: true,
            toolbar: true,
            formulaBar: true,
            footer: {},
            statusBarStatistic: true,
            ribbonType: 'default',
            menu: {},
            contextMenu: true,
            sheets: {
              protectedRangeShadow: true,
            },
            formula: {},
          }),
        ],
      } as Parameters<typeof createUniver>[0])

      const api = univer.univerAPI as UniverAPI

      // Apply locale before any other API use so LocaleService is never used uninitialized
      if (api.loadLocales && api.setLocale) {
        api.loadLocales(String(localeKey), languagePack as Record<string, unknown>)
        api.setLocale(String(localeKey))
      }

      api.createWorkbook(workbookData)
      apiRef.current = api
      if (activeSheetKey) {
        try {
          const wb = api.getActiveWorkbook()
          const sheet = wb?.getSheetBySheetId(activeSheetKey)
          if (sheet) wb!.setActiveSheet(sheet)
        } catch (_) { /* ignore */ }
      }

      /** Extract design (column widths, row heights, merges, styles) from Univer snapshot so it is saved with the template. */
      const extractDesignFromSnapshot = (
        univerSheet: UniverSheetSnapshot,
        snapshotStyles: Record<string, Record<string, unknown>> | undefined
      ): Pick<FormatSheet, 'columnWidths' | 'headerRowHeight' | 'typeRowHeight' | 'dataRowHeight' | 'mergeRanges' | 'cellStyles'> => {
        const out: Pick<FormatSheet, 'columnWidths' | 'headerRowHeight' | 'typeRowHeight' | 'dataRowHeight' | 'mergeRanges' | 'cellStyles'> = {}
        const cd = univerSheet.columnData
        if (cd && typeof cd === 'object') {
          const columnWidths: Record<number, number> = {}
          for (const k of Object.keys(cd)) {
            const w = (cd[k] as { w?: number })?.w
            if (typeof w === 'number' && w > 0) columnWidths[Number(k)] = w
          }
          if (Object.keys(columnWidths).length > 0) out.columnWidths = columnWidths
        }
        const rd = univerSheet.rowData
        if (rd && typeof rd === 'object') {
          const h0 = (rd['0'] as { h?: number })?.h
          if (typeof h0 === 'number' && h0 > 0) out.headerRowHeight = h0
          const h1 = (rd['1'] as { h?: number })?.h
          if (typeof h1 === 'number' && h1 > 0) out.typeRowHeight = h1
          const h2 = (rd['2'] as { h?: number })?.h
          if (typeof h2 === 'number' && h2 > 0) out.dataRowHeight = h2
        }
        const md = univerSheet.mergeData
        if (Array.isArray(md) && md.length > 0) {
          out.mergeRanges = md.map((m) => ({
            startRow: m.startRow,
            startColumn: m.startColumn,
            endRow: m.endRow,
            endColumn: m.endColumn,
          }))
        }
        const cellData = univerSheet.cellData
        if (snapshotStyles && cellData && typeof cellData === 'object') {
          const cellStyles: Record<string, Record<string, unknown>> = {}
          for (const rowKey of Object.keys(cellData)) {
            const row = cellData[rowKey]
            if (!row || typeof row !== 'object') continue
            for (const colKey of Object.keys(row)) {
              const cell = row[colKey] as { s?: string }
              const styleId = cell?.s
              if (!styleId || !snapshotStyles[styleId]) continue
              cellStyles[`${rowKey},${colKey}`] = { ...snapshotStyles[styleId] }
            }
          }
          if (Object.keys(cellStyles).length > 0) out.cellStyles = cellStyles
        }
        return out
      }

      const syncFromUniver = () => {
        if (!mountedRef.current) return
        if (disabled) return
        try {
          const wb = api.getActiveWorkbook()
          if (!wb) return
          const sheet = wb.getActiveSheet()
          const scrollState: ScrollState | null = sheet
            ? { sheetViewStartRow: sheet.getScrollState().sheetViewStartRow, sheetViewStartColumn: sheet.getScrollState().sheetViewStartColumn }
            : null
          const snapshot = wb.save()
          const order = snapshot.sheetOrder ?? []
          const snapshotSheets = snapshot.sheets as Record<string, UniverSheetSnapshot> | undefined
          const snapshotStyles = snapshot.styles as Record<string, Record<string, unknown>> | undefined
          if (!snapshotSheets || order.length === 0) return
          const nextSheets: FormatSheet[] = []
          for (let i = 0; i < order.length; i++) {
            const sheetId = order[i]
            const univerSheet = snapshotSheets[sheetId]
            if (!univerSheet) continue
            const rowCount = univerSheet.rowCount ?? 100
            const columnCount = univerSheet.columnCount ?? 26
            const cellData = univerSheet.cellData
            const grid = univerCellDataToGrid(cellData, rowCount, columnCount)
            const existing = sheets[i] ?? sheets.find((s) => s.key === sheetId)
            const existingColumns = existing?.columns ?? []
            const update = grid.length >= 1 ? gridDataToSheetUpdate(grid, existingColumns) : { columns: existingColumns, cellData: {}, dataRowCount: 0 }
            const design = extractDesignFromSnapshot(univerSheet, snapshotStyles)
            nextSheets.push({
              key: sheetId,
              name: (univerSheet.name as string) ?? existing?.name ?? `Sheet ${i + 1}`,
              columns: update.columns,
              cellData: update.cellData,
              dataRowCount: update.dataRowCount,
              mergeRanges: design.mergeRanges ?? existing?.mergeRanges,
              cellStyles: design.cellStyles ?? existing?.cellStyles,
              columnWidths: design.columnWidths ?? existing?.columnWidths,
              headerRowHeight: design.headerRowHeight ?? existing?.headerRowHeight,
              typeRowHeight: design.typeRowHeight ?? existing?.typeRowHeight,
              dataRowHeight: design.dataRowHeight ?? existing?.dataRowHeight,
            })
          }
          if (nextSheets.length > 0) onChangeRef.current(nextSheets)
          if (scrollState && sheet && mountedRef.current) {
            requestAnimationFrame(() => {
              if (!mountedRef.current) return
              try {
                const currentSheet = api.getActiveWorkbook()?.getActiveSheet()
                if (currentSheet) {
                  currentSheet.scrollToCell(scrollState.sheetViewStartRow, scrollState.sheetViewStartColumn, 0)
                }
              } catch (_) { /* ignore */ }
            })
          }
        } catch (err) {
          if (typeof console !== 'undefined' && console.warn) {
            console.warn('[UniverSpreadsheetEmbed] syncFromUniver failed', err)
          }
        }
      }
      syncRef.current = syncFromUniver

      const SYNC_DEBOUNCE_MS = 300
      const debouncedSync = () => {
        if (syncTimeout) clearTimeout(syncTimeout)
        syncTimeout = setTimeout(() => {
          syncTimeout = null
          syncFromUniver()
        }, SYNC_DEBOUNCE_MS)
      }

      const Event = (api as { Event?: Record<string, string> }).Event
      const eventName = (name: string) => (Event?.[name] ?? name)
      try {
        eventDisposable = api.addEvent?.(eventName('SheetValueChanged'), debouncedSync) ?? null
        commandDisposable = api.addEvent?.(eventName('CommandExecuted'), debouncedSync) ?? null
        editEndDisposable = api.addEvent?.(eventName('SheetEditEnded'), () => syncFromUniver()) ?? null
      } catch {
        eventDisposable = api.addEvent?.('SheetValueChanged', debouncedSync) ?? null
        commandDisposable = api.addEvent?.('CommandExecuted', debouncedSync) ?? null
        editEndDisposable = api.addEvent?.('SheetEditEnded', () => syncFromUniver()) ?? null
      }

      // Initial sync so parent state matches the workbook
      setTimeout(() => syncFromUniver(), 200)
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        if (mountedRef.current) {
          setLoadFailed(true)
          onErrorRef.current?.(error)
        }
      }
    }

    init()

    return () => {
      apiRef.current = null
      syncRef.current = null
      if (rafId) cancelAnimationFrame(rafId)
      if (syncTimeout) clearTimeout(syncTimeout)
      syncTimeout = null
      mountedRef.current = false
      eventDisposable?.dispose?.()
      eventDisposable = null
      commandDisposable?.dispose?.()
      commandDisposable = null
      editEndDisposable?.dispose?.()
      editEndDisposable = null
      const toDispose = univer
      univer = null
      if (toDispose) {
        setTimeout(() => {
          try {
            if (toDispose.univerAPI) {
              const api = toDispose.univerAPI as { getActiveWorkbook: () => { getId: () => string } | null; disposeUnit: (id: string) => void }
              const wb = api.getActiveWorkbook?.()
              if (wb?.getId()) api.disposeUnit?.(wb.getId())
            }
            toDispose.univer?.dispose()
          } catch {
            // ignore
          }
        }, 0)
      }
    }
  }, [sheets.length, sheets.map((s) => s.key).join(','), disabled, retryKey])

  useEffect(() => {
    if (!activeSheetKey) return
    const api = apiRef.current
    if (!api) return
    try {
      const wb = api.getActiveWorkbook()
      const sheet = wb?.getSheetBySheetId(activeSheetKey)
      if (sheet) wb!.setActiveSheet(sheet)
    } catch (_) {
      /* ignore */
    }
  }, [activeSheetKey])

  if (loadFailed) {
    return (
      <div
        className={className}
        style={{ minHeight: 200, width: '100%' }}
        role="alert"
        aria-live="polite"
      >
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] rounded-b-xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 p-6 text-center">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">Spreadsheet editor could not load</p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mb-4 max-w-sm">
            The editor failed to initialize. Check your browser and network, then try again.
          </p>
          <button
            type="button"
            onClick={() => { setLoadFailed(false); setRetryKey((k) => k + 1); }}
            className="text-sm font-medium px-3 py-1.5 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`univer-spreadsheet-embed univer-spreadsheet-embed--budget flex-1 min-h-0 w-full ${className}`.trim()}
      style={{
        minHeight: 'var(--univer-sheet-min-height, 190vh)',
        minWidth: 200,
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'visible',
        flex: '1 1 0',
        boxSizing: 'border-box',
      }}
      data-readonly={disabled || undefined}
      role="application"
      aria-label="Budget spreadsheet editor"
    />
  )
}
