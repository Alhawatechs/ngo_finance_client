import apiClient from './client'

export interface Budget {
  id: number
  organization_id: number
  name: string
  fiscal_year_id: number
  office_id: number | null
  project_id: number | null
  fund_id: number | null
  budget_format_template_id?: number | null
  grant_id?: number | null
  budget_type: 'operational' | 'project' | 'departmental' | 'consolidated'
  currency: string
  total_budget?: number
  total_amount?: number
  description: string | null
  status: string
  created_by?: number
  approved_by: number | null
  approved_at: string | null
  fiscal_year?: { id: number; name: string; start_date: string; end_date: string }
  office?: { id: number; name: string }
  project?: { id: number; project_code: string; project_name: string }
  budget_format_template?: { id: number; name: string; code: string } | null
  grant?: { id: number; grant_code: string; grant_name: string } | null
  lines?: BudgetLine[]
  created_at: string
  updated_at: string
}

export interface BudgetLine {
  id: number
  budget_id: number
  account_id: number
  line_number?: number
  sheet_key?: string | null
  description: string
  q1_amount: number
  q2_amount: number
  q3_amount: number
  q4_amount: number
  annual_amount: number
  actual_amount?: number
  account?: { id: number; account_code: string; account_name: string }
  format_attributes?: Record<string, unknown>
  variance?: number
  variance_percent?: number
  utilization?: number
}

export interface BudgetFormatTemplate {
  id: number
  name: string
  code: string
  structure_type: string
  donor_id?: number | null
  donor?: { id: number; code: string; name: string }
  column_definition?: Record<string, unknown>
  google_spreadsheet_id?: string | null
  is_active?: boolean
}

export interface BudgetFormData {
  name: string
  fiscal_year_id: number
  office_id?: number
  project_id?: number
  fund_id?: number
  budget_format_template_id?: number
  grant_id?: number
  budget_type: 'operational' | 'project' | 'departmental' | 'consolidated'
  currency: string
  description?: string
  lines: {
    account_id: number
    description: string
    donor_expenditure_code_id?: number
    sheet_key?: string | null
    q1_amount: number
    q2_amount: number
    q3_amount: number
    q4_amount: number
    format_attributes?: Record<string, unknown>
  }[]
}

export async function getBudgetFormatTemplates(options?: { includeInactive?: boolean; withDonor?: boolean }) {
  const params: Record<string, unknown> = {}
  if (options?.includeInactive) params.include_inactive = 1
  if (options?.withDonor) params.with_donor = 1
  const response = await apiClient.get('/budget-format-templates', {
    params: Object.keys(params).length ? params : undefined,
  })
  const data = response.data as { data?: BudgetFormatTemplate[] } | BudgetFormatTemplate[]
  return Array.isArray(data) ? data : (data?.data ?? [])
}

export interface BudgetFormatTemplateFormData {
  name: string
  code: string
  donor_id?: number | null
  structure_type: 'account_based' | 'donor_code_based' | 'activity_based' | 'hybrid'
  column_definition?: Record<string, unknown> | null
  google_spreadsheet_id?: string | null
  is_active?: boolean
}

export interface ImportFromGoogleSheetResponse {
  column_definition: Record<string, unknown>
  sheet_count: number
}

export async function importBudgetFormatFromGoogleSheet(url: string) {
  const response = await apiClient.post<{ success: boolean; data: ImportFromGoogleSheetResponse }>(
    '/budget-format-templates/import-from-google-sheet',
    { url }
  )
  return response.data
}

export async function getBudgetFormatTemplate(id: number) {
  const response = await apiClient.get(`/budget-format-templates/${id}`)
  const body = response.data as { data?: BudgetFormatTemplate } | BudgetFormatTemplate
  // Backend returns { success, message, data: template }; unwrap so callers get the template
  if (body && typeof body === 'object' && 'data' in body && (body as { data?: unknown }).data != null) {
    return (body as { data: BudgetFormatTemplate }).data
  }
  return body as BudgetFormatTemplate
}

export async function createBudgetFormatTemplate(data: BudgetFormatTemplateFormData) {
  const response = await apiClient.post('/budget-format-templates', data)
  return response.data
}

export async function updateBudgetFormatTemplate(id: number, data: Partial<BudgetFormatTemplateFormData>) {
  const response = await apiClient.put(`/budget-format-templates/${id}`, data)
  return response.data
}

export async function deleteBudgetFormatTemplate(id: number) {
  await apiClient.delete(`/budget-format-templates/${id}`)
}

export async function getSuggestedBudgetFormat(projectId: number) {
  const response = await apiClient.get('/budget-format-templates/suggested', { params: { project_id: projectId } })
  return response.data
}

// Budget APIs
export async function getBudgets(params?: { page?: number; per_page?: number; fiscal_year_id?: number; office_id?: number; budget_type?: string; status?: string; budget_format_template_id?: number; search?: string }) {
  const response = await apiClient.get('/budgets', { params })
  return response.data
}

export async function getBudget(id: number) {
  const response = await apiClient.get(`/budgets/${id}`)
  return response.data
}

export async function createBudget(data: BudgetFormData) {
  const response = await apiClient.post('/budgets', data)
  return response.data
}

export async function updateBudget(
  id: number,
  data: Partial<{
    name: string
    description: string
    status: string
    lines: BudgetFormData['lines']
  }>
) {
  const response = await apiClient.put(`/budgets/${id}`, data)
  return response.data
}

export async function deleteBudget(id: number) {
  const response = await apiClient.delete(`/budgets/${id}`)
  return response.data
}

/** Create a new draft budget (revision) from an approved budget. Returns the new budget. */
export async function reviseBudget(id: number) {
  const response = await apiClient.post(`/budgets/${id}/revise`)
  return response.data
}

export async function submitBudget(id: number) {
  const response = await apiClient.post(`/budgets/${id}/submit`)
  return response.data
}

export async function approveBudget(id: number) {
  const response = await apiClient.post(`/budgets/${id}/approve`)
  return response.data
}

export async function getBudgetComparison(params: { fiscal_year_id: number; office_id?: number }) {
  const response = await apiClient.get('/budgets/comparison', { params })
  return response.data
}

export async function getBudgetSummary() {
  const response = await apiClient.get('/budgets/summary')
  return response.data
}

/** Export budget to Excel. Downloads file. format: 'unicef_her' | 'unfpa_who' */
export async function exportBudgetToExcel(budgetId: number, format: 'unicef_her' | 'unfpa_who' = 'unfpa_who'): Promise<void> {
  const response = await apiClient.get(`/budgets/${budgetId}/export`, {
    params: { format },
    responseType: 'blob',
  })
  const blob = response.data as Blob
  const contentDisposition = response.headers['content-disposition']
  const match = contentDisposition?.match(/filename="?([^"]+)"?/) ?? null
  const filename = match?.[1] ?? `budget-${budgetId}-export.xlsx`
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}

/** Parse Excel file for budget import. Returns rows for UNICEF or UNFPA format. */
export async function parseBudgetExcel(
  file: File,
  format: 'unicef_her' | 'unfpa_who'
): Promise<{ rows: Record<string, unknown>[]; errors?: string[] }> {
  const XLSX = await import('xlsx')
  const data = await file.arrayBuffer()
  const wb = XLSX.read(data, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][]
  if (json.length < 2) return { rows: [] }
  const headers = (json[0] as unknown[]).map((h) => String(h ?? '').trim().toLowerCase())
  const rows: Record<string, unknown>[] = []
  for (let i = 1; i < json.length; i++) {
    const row = json[i] as unknown[]
    const obj: Record<string, unknown> = {}
    headers.forEach((h, j) => {
      if (h && row[j] !== undefined && row[j] !== '') obj[h] = row[j]
    })
    if (format === 'unicef_her') {
      const section = obj['section'] ?? obj['code'] ?? ''
      const itemDesc = obj['item description'] ?? obj['item description'] ?? obj['description'] ?? ''
      const cso = Number(obj['cso (usd)'] ?? obj['cso'] ?? 0) || 0
      const unicef = Number(obj['unicef (usd)'] ?? obj['unicef'] ?? 0) || 0
      const q1 = Number(obj['q1'] ?? 0) || 0
      const q2 = Number(obj['q2'] ?? 0) || 0
      const q3 = Number(obj['q3'] ?? 0) || 0
      const q4 = Number(obj['q4'] ?? 0) || 0
      if (section || itemDesc || cso + unicef + q1 + q2 + q3 + q4 > 0) {
        rows.push({ section_code: section, item_description: itemDesc, cso_contribution: cso, unicef_contribution: unicef, q1_amount: q1, q2_amount: q2, q3_amount: q3, q4_amount: q4, remark: obj['remark'] ?? '' })
      }
    } else {
      const code = obj['code'] ?? ''
      const desc = obj['budget line description'] ?? obj['description'] ?? ''
      const qty = Number(obj['qty'] ?? obj['quantity'] ?? 0) || 0
      const unitCost = Number(obj['unit cost'] ?? obj['unit_cost'] ?? 0) || 0
      const costPct = Number(obj['% cost'] ?? obj['cost_pct'] ?? 100) || 100
      const total = Number(obj['total cost'] ?? obj['total'] ?? 0) || qty * unitCost * (costPct / 100)
      const qSplit = total / 4
      if (code || desc || total > 0) {
        rows.push({ category_code: code, budget_line_description: desc, quantity: qty, unit_cost: unitCost, cost_pct: costPct, duration_recurrence: obj['duration/recurrence'] ?? '', remarks: obj['remarks'] ?? '', q1_amount: qSplit, q2_amount: qSplit, q3_amount: qSplit, q4_amount: qSplit })
      }
    }
  }
  return { rows }
}

/** Infer column type from a sample cell value */
function inferColumnType(val: unknown): string {
  if (val == null || val === '') return 'text'
  if (typeof val === 'number') return 'currency'
  if (typeof val === 'boolean') return 'text'
  const s = String(val).trim()
  if (/^-?\d+([.,]\d+)?%?$/.test(s) || /^-?[\d.,]+$/.test(s)) return 'currency'
  return 'text'
}

const DEFAULT_COL_WIDTH_PX = 128
const DEFAULT_HEADER_ROW_HEIGHT_PX = 36
const DEFAULT_TYPE_ROW_HEIGHT_PX = 36
const DEFAULT_DATA_ROW_HEIGHT_PX = 32
/** Excel column width (characters) to approximate px (≈8px per char) */
function excelColWidthToPx(wch: number | undefined): number {
  if (wch == null || wch <= 0) return DEFAULT_COL_WIDTH_PX
  return Math.min(400, Math.max(60, Math.round(wch * 8)))
}
/** Excel row height (points) to px (≈1.33px per point) */
function excelRowHeightToPx(hpt: number | undefined): number {
  if (hpt == null || hpt <= 0) return DEFAULT_HEADER_ROW_HEIGHT_PX
  return Math.min(120, Math.max(24, Math.round(hpt * 1.33)))
}

export interface MergeRange {
  startRow: number
  startColumn: number
  endRow: number
  endColumn: number
}

/** Univer-compatible cell style (IStyleData). Keys match Univer: ff, fs, bl, it, cl, bg, ht, vt, bd, n, etc. */
export type UniverStyleData = Record<string, unknown>

export interface ParsedFormatSheet {
  key: string
  name: string
  columns: { key: string; label: string; type: string; required?: boolean; computed?: string }[]
  columnWidths?: Record<number, number>
  headerRowHeight?: number
  typeRowHeight?: number
  dataRowHeight?: number
  cellData?: Record<string, string>
  dataRowCount?: number
  /** Merged cell ranges from Excel (SheetJS !merges) */
  mergeRanges?: MergeRange[]
  /** Cell styles from Excel: key "row,col" (Univer row 0 = header, 1+ = data) -> Univer style object */
  cellStyles?: Record<string, UniverStyleData>
}

/** Convert Excel ARGB hex to 6-char rgb for Univer (no alpha). */
function excelRgbToHex(rgb: string | undefined): string | undefined {
  if (!rgb || typeof rgb !== 'string') return undefined
  const hex = rgb.replace(/^#/, '').trim()
  if (hex.length === 8) return '#' + hex.slice(2, 8).toLowerCase()
  if (hex.length === 6) return '#' + hex.toLowerCase()
  return undefined
}

/** Map xlsx-js-style cell .s to Univer IStyleData (font, fill, alignment, border). */
function excelStyleToUniver(
  excelStyle: { font?: { name?: string; sz?: number; bold?: boolean; italic?: boolean; color?: { rgb?: string } }; fill?: { fgColor?: { rgb?: string }; bgColor?: { rgb?: string } }; alignment?: { horizontal?: string; vertical?: string }; border?: { top?: { style?: number; color?: { rgb?: string } }; bottom?: { style?: number; color?: { rgb?: string } }; left?: { style?: number; color?: { rgb?: string } }; right?: { style?: number; color?: { rgb?: string } } } } | undefined
): UniverStyleData | null {
  if (!excelStyle || typeof excelStyle !== 'object') return null
  const out: UniverStyleData = {}
  const font = excelStyle.font
  if (font) {
    if (font.name) out.ff = font.name
    if (font.sz != null) out.fs = Number(font.sz)
    if (font.bold === true) out.bl = 1
    if (font.italic === true) out.it = 1
    const cl = excelRgbToHex(font.color?.rgb)
    if (cl) out.cl = { rgb: cl }
  }
  const fill = excelStyle.fill
  if (fill?.fgColor?.rgb) {
    const bg = excelRgbToHex(fill.fgColor.rgb)
    if (bg) out.bg = { rgb: bg }
  } else if (fill?.bgColor?.rgb) {
    const bg = excelRgbToHex(fill.bgColor.rgb)
    if (bg) out.bg = { rgb: bg }
  }
  const align = excelStyle.alignment
  if (align) {
    const h = align.horizontal
    if (h === 'left') out.ht = 1
    else if (h === 'center' || h === 'centre') out.ht = 2
    else if (h === 'right') out.ht = 3
    const v = align.vertical
    if (v === 'top') out.vt = 1
    else if (v === 'center' || v === 'centre' || v === 'middle') out.vt = 2
    else if (v === 'bottom') out.vt = 3
  }
  const border = excelStyle.border
  if (border && (border.top || border.bottom || border.left || border.right)) {
    const side = (s: { style?: number; color?: { rgb?: string } } | undefined) => {
      if (!s) return undefined
      const cl = excelRgbToHex(s.color?.rgb)
      return { s: s.style ?? 1, cl: cl ? { rgb: cl } : { rgb: '#000000' } }
    }
    const bd: UniverStyleData = {}
    if (border.top) bd.t = side(border.top)
    if (border.bottom) bd.b = side(border.bottom)
    if (border.left) bd.l = side(border.left)
    if (border.right) bd.r = side(border.right)
    if (Object.keys(bd).length) out.bd = bd
  }
  return Object.keys(out).length ? out : null
}

/** Parse an Excel file to define a budget format: sheets, columns, widths, heights, cell data, and styles. */
export async function parseExcelToFormatSheets(
  file: File
): Promise<{ sheets: ParsedFormatSheet[] }> {
  const XLSX = await import('xlsx-js-style')
  const data = await file.arrayBuffer()
  const wb = XLSX.read(data, { type: 'array' })
  const result: ParsedFormatSheet[] = []
  function slug(s: string): string {
    return s
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || 'column'
  }
  for (let i = 0; i < wb.SheetNames.length; i++) {
    const sheetName = wb.SheetNames[i]
    const ws = wb.Sheets[sheetName] as { [key: string]: unknown }
    const json = XLSX.utils.sheet_to_json<unknown[]>(ws as never, { header: 1, defval: '' }) as unknown[][]
    const numRows = json.length
    const headers = (json[0] ?? []).map((h) => String(h ?? '').trim())
    const numCols = Math.max(headers.length, 1)
    const sampleRow = (json[1] ?? []) as unknown[]
    const columns = headers.map((label, j) => {
      const key = slug(label || `col_${j}`)
      const type = inferColumnType(sampleRow[j])
      return { key, label: label || key, type, required: false as boolean | undefined, computed: '' as string | undefined }
    })
    while (columns.length < numCols) {
      columns.push({ key: `col_${columns.length}`, label: '', type: 'text', required: false, computed: '' })
    }

    const cellData: Record<string, string> = {}
    for (let r = 2; r < numRows; r++) {
      const row = (json[r] ?? []) as unknown[]
      for (let c = 0; c < numCols; c++) {
        const val = row[c]
        if (val != null && val !== '') cellData[`${r - 2},${c}`] = String(val)
      }
    }
    const dataRowCount = Math.max(1, numRows - 2)

    const cellStyles: Record<string, UniverStyleData> = {}
    const refStr = ws['!ref'] as string | undefined
    if (refStr && typeof refStr === 'string') {
      try {
        const range = XLSX.utils.decode_range(refStr)
        for (let r = range.s.r; r <= range.e.r; r++) {
          if (r === 1) continue
          const univerRow = r === 0 ? 0 : r - 1
          for (let c = range.s.c; c <= range.e.c; c++) {
            const ref = XLSX.utils.encode_cell({ r, c })
            const cell = ws[ref] as { v?: unknown; s?: unknown } | undefined
            const style = excelStyleToUniver(cell?.s as Parameters<typeof excelStyleToUniver>[0])
            if (style) cellStyles[`${univerRow},${c}`] = style
          }
        }
      } catch (_) {
        /* ignore invalid range */
      }
    }

    const rawCols = ws['!cols'] as Array<{ wch?: number; width?: number }> | undefined
    const columnWidths: Record<number, number> = {}
    if (Array.isArray(rawCols)) {
      rawCols.forEach((col, j) => {
        const wch = col?.wch ?? col?.width
        if (wch != null) columnWidths[j] = excelColWidthToPx(wch)
      })
    }

    const rawRows = ws['!rows'] as Array<{ hpt?: number }> | undefined
    let headerRowHeight: number | undefined
    let typeRowHeight: number | undefined
    let dataRowHeight: number | undefined
    if (Array.isArray(rawRows)) {
      if (rawRows[0]?.hpt != null) headerRowHeight = excelRowHeightToPx(rawRows[0].hpt)
      if (rawRows[1]?.hpt != null) typeRowHeight = excelRowHeightToPx(rawRows[1].hpt)
      if (rawRows[2]?.hpt != null) dataRowHeight = excelRowHeightToPx(rawRows[2].hpt)
      else if (rawRows.length > 3) {
        const dataHeights = rawRows.slice(2).map((row) => row?.hpt).filter((h): h is number => h != null && h > 0)
        if (dataHeights.length) dataRowHeight = excelRowHeightToPx(dataHeights.reduce((a, b) => a + b, 0) / dataHeights.length)
      }
    }

    const rawMerges = ws['!merges'] as Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> | undefined
    const mergeRanges: MergeRange[] = []
    if (Array.isArray(rawMerges)) {
      for (const m of rawMerges) {
        if (m?.s && m?.e && typeof m.s.r === 'number' && typeof m.s.c === 'number' && typeof m.e.r === 'number' && typeof m.e.c === 'number') {
          mergeRanges.push({
            startRow: m.s.r,
            startColumn: m.s.c,
            endRow: m.e.r,
            endColumn: m.e.c,
          })
        }
      }
    }

    result.push({
      key: String(i),
      name: sheetName || `Sheet ${i + 1}`,
      columns,
      ...(Object.keys(columnWidths).length > 0 && { columnWidths }),
      ...(headerRowHeight != null && { headerRowHeight }),
      ...(typeRowHeight != null && { typeRowHeight }),
      ...(dataRowHeight != null && { dataRowHeight }),
      ...(Object.keys(cellData).length > 0 && { cellData }),
      dataRowCount,
      ...(mergeRanges.length > 0 && { mergeRanges }),
      ...(Object.keys(cellStyles).length > 0 && { cellStyles }),
    })
  }
  return { sheets: result }
}

// Helper functions
export function getBudgetTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    operational: 'Operational',
    project: 'Project',
    departmental: 'Departmental',
    consolidated: 'Consolidated',
  }
  return labels[type] || type
}

export function getBudgetTypeColor(type: string): string {
  const colors: Record<string, string> = {
    operational: 'bg-emerald-100 text-emerald-800',
    project: 'bg-green-100 text-green-700',
    departmental: 'bg-purple-100 text-purple-700',
    consolidated: 'bg-orange-100 text-orange-700',
  }
  return colors[type] || 'bg-gray-100 text-gray-700'
}

export function getBudgetStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    pending_approval: 'Pending Approval',
    approved: 'Approved',
    rejected: 'Rejected',
  }
  return labels[status] || status
}

export function getBudgetStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    pending_approval: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

export function calculateVariance(budgeted: number, actual: number): { amount: number; percent: number; favorable: boolean } {
  const amount = budgeted - actual
  const percent = budgeted > 0 ? Math.round((amount / budgeted) * 100) : 0
  const favorable = amount >= 0
  return { amount, percent, favorable }
}
