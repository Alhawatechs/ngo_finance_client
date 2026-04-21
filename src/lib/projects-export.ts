/**
 * Projects export utilities: Excel (.xlsx), PDF (.pdf), CSV (.csv)
 * Exports project list with all relevant columns and optional summary.
 * Excel uses xlsx-js-style for table design (borders, header fill, fonts).
 */
import * as XLSX from 'xlsx-js-style'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

/** Thin border on all sides for table cells */
const EXCEL_BORDER_THIN = {
  top: { style: 'thin' as const },
  bottom: { style: 'thin' as const },
  left: { style: 'thin' as const },
  right: { style: 'thin' as const },
}

export interface ProjectsExportSummary {
  total_projects: number
  active_projects: number
  total_budget: number
  total_spent: number
  utilization_rate: number
  by_currency?: { currency: string; total_budget: number; total_spent: number; utilization_rate: number }[]
}

export function computeProjectsSummary(projects: any[]): ProjectsExportSummary {
  const total = projects.length
  const active = projects.filter((p) => p.status === 'active').length
  const byCurrency = (projects as { currency?: string; total_budget?: number; spent_amount?: number }[]).reduce(
    (acc, p) => {
      const cur = p.currency || 'USD'
      if (!acc[cur]) acc[cur] = { currency: cur, total_budget: 0, total_spent: 0 }
      acc[cur].total_budget += Number(p.total_budget) || 0
      acc[cur].total_spent += Number(p.spent_amount) || 0
      return acc
    },
    {} as Record<string, { currency: string; total_budget: number; total_spent: number }>
  )
  const byCurrencyList = Object.values(byCurrency).map((row) => ({
    ...row,
    utilization_rate: row.total_budget > 0 ? Math.round((row.total_spent / row.total_budget) * 10000) / 100 : 0,
  }))
  const singleCurrency = byCurrencyList.length === 1 ? byCurrencyList[0] : null
  const totalBudget = singleCurrency ? singleCurrency.total_budget : 0
  const totalSpent = singleCurrency ? singleCurrency.total_spent : 0
  const utilization_rate = singleCurrency ? singleCurrency.utilization_rate : 0
  return {
    total_projects: total,
    active_projects: active,
    total_budget: totalBudget,
    total_spent: totalSpent,
    utilization_rate,
    by_currency: byCurrencyList,
  }
}

/** Format summary as a single line for export. Uses per-currency amounts when multiple currencies. */
export function formatSummaryOneLine(
  summary: ProjectsExportSummary,
  formatCurrency: (amount: number, currency?: string) => string
): string {
  const budgetStr =
    summary.by_currency && summary.by_currency.length > 1
      ? summary.by_currency.map((r) => formatCurrency(r.total_budget, r.currency)).join('; ')
      : formatCurrency(summary.total_budget, summary.by_currency?.[0]?.currency)
  const spentStr =
    summary.by_currency && summary.by_currency.length > 1
      ? summary.by_currency.map((r) => formatCurrency(r.total_spent, r.currency)).join('; ')
      : formatCurrency(summary.total_spent, summary.by_currency?.[0]?.currency)
  const utilStr =
    summary.by_currency && summary.by_currency.length > 1
      ? summary.by_currency.map((r) => `${r.currency} ${r.utilization_rate}%`).join('; ')
      : `${summary.utilization_rate}%`
  return `Total: ${summary.total_projects} | Active: ${summary.active_projects} | Budget: ${budgetStr} | Spent: ${spentStr} | Util: ${utilStr}`
}

const PROJECT_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
}
const GRANT_TYPE_LABELS: Record<string, string> = {
  restricted: 'Restricted',
  unrestricted: 'Unrestricted',
  temporarily_restricted: 'Temporarily Restricted',
}

export interface ProjectExportRow {
  no: number
  code: string
  grantCode: string
  projectName: string
  donor: string
  fundType: string
  sector: string
  location: string
  startDate: string
  endDate: string
  currency: string
  budget: string
  spent: string
  utilPercent: string
  status: string
}

export function buildProjectExportRows(projects: any[], formatCurrency: (amount: number, currency?: string) => string, startIndex = 1): ProjectExportRow[] {
  return projects.map((p, i) => {
    const donor = p.grant?.donor ? (p.grant.donor.short_name || p.grant.donor.name || p.grant.donor.code || '') : ''
    const rawFundType = p.grant?.grant_type || ''
    const fundType = GRANT_TYPE_LABELS[rawFundType] || rawFundType
    const locations = (p.locations_list ?? p.locations ?? (p.location ? [p.location] : [])) as string[]
    const loc = Array.isArray(locations) && locations.length > 0 ? locations.join(', ') : (p.location || '')
    const util = (p.total_budget > 0 ? ((p.spent_amount ?? 0) / p.total_budget) * 100 : 0).toFixed(1)
    const startD = p.start_date ? (typeof p.start_date === 'string' ? p.start_date.split('T')[0] : String(p.start_date)) : ''
    const endD = p.end_date ? (typeof p.end_date === 'string' ? p.end_date.split('T')[0] : String(p.end_date)) : ''
    const currencyDisplay = p.currency || p.grant?.currency || 'USD'
    const statusLabel = PROJECT_STATUS_LABELS[p.status] || p.status || ''
    return {
      no: startIndex + i,
      code: p.project_code || '',
      grantCode: p.grant?.grant_code || '',
      projectName: p.project_name || '',
      donor,
      fundType,
      sector: p.sector || '',
      location: loc,
      startDate: startD,
      endDate: endD,
      currency: currencyDisplay,
      budget: formatCurrency(p.total_budget ?? 0, p.currency),
      spent: formatCurrency(p.spent_amount ?? 0, p.currency),
      utilPercent: `${util}%`,
      status: statusLabel,
    }
  })
}

const EXCEL_HEADERS = ['No', 'Code', 'Grant Code', 'Project Name', 'Donor', 'Fund Type', 'Sector', 'Location', 'Start Date', 'End Date', 'Currency', 'Budget', 'Spent', 'Util %', 'Status']
const EXCEL_COLUMN_COUNT = EXCEL_HEADERS.length

export function exportProjectsToExcel(
  projects: any[],
  formatCurrency: (amount: number, currency?: string) => string,
  filename = 'Projects.xlsx',
  summary?: ProjectsExportSummary | null,
  preparedBy?: string,
  title = 'Project Portfolio'
): void {
  const resolvedSummary = summary ?? (projects.length ? computeProjectsSummary(projects) : null)
  const rows = buildProjectExportRows(projects, formatCurrency)
  const exportDate = new Date().toLocaleDateString()
  const exportedLine = `Exported: ${projects.length} project(s) — ${exportDate}`

  // Build rows to match PDF layout: Title, Exported line, Summary, blank, Table header, Data, blank, Footer
  const titleRow = [title] as (string | number)[]
  const exportedRow = [exportedLine] as (string | number)[]
  const summaryRow: (string | number)[] = resolvedSummary
    ? [formatSummaryOneLine(resolvedSummary, formatCurrency)]
    : []
  const blankRow = [] as (string | number)[]
  const footerRows: (string | number)[][] = [
    [],
    [`Prepared by: ${preparedBy ?? ''}`],
    ['Signature: ________'],
  ]

  const data: (string | number)[][] = [
    titleRow,
    exportedRow,
    ...(summaryRow.length ? [summaryRow] : []),
    blankRow,
    EXCEL_HEADERS,
    ...rows.map((r) => [r.no, r.code, r.grantCode, r.projectName, r.donor, r.fundType, r.sector, r.location, r.startDate, r.endDate, r.currency, r.budget, r.spent, r.utilPercent, r.status]),
    ...footerRows,
  ]

  const ws = XLSX.utils.aoa_to_sheet(data)

  // Column widths for table (all columns)
  const colWidths = [{ wch: 4 }, { wch: 14 }, { wch: 14 }, { wch: 40 }, { wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 12 }]
  ws['!cols'] = colWidths

  // Merge cells for title, exported line, summary, and footer (span full table width) so layout matches PDF
  const hasSummary = summaryRow.length > 0
  const headerRowIndex = 3 + (hasSummary ? 1 : 0) // row index of "No, Code, Grant Code, ..."
  const preparedByRowIndex = headerRowIndex + 1 + rows.length + 1 // after header + data + blank
  const signatureRowIndex = preparedByRowIndex + 1

  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: EXCEL_COLUMN_COUNT - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: EXCEL_COLUMN_COUNT - 1 } },
  ]
  if (hasSummary) {
    merges.push({ s: { r: 2, c: 0 }, e: { r: 2, c: EXCEL_COLUMN_COUNT - 1 } })
  }
  merges.push(
    { s: { r: preparedByRowIndex, c: 0 }, e: { r: preparedByRowIndex, c: EXCEL_COLUMN_COUNT - 1 } },
    { s: { r: signatureRowIndex, c: 0 }, e: { r: signatureRowIndex, c: EXCEL_COLUMN_COUNT - 1 } }
  )
  ws['!merges'] = merges

  // Table design: apply borders, header fill, and fonts (xlsx-js-style)
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
  const titleStyle = { font: { bold: true, sz: 14, color: { rgb: '000000' } } }
  const subtitleStyle = { font: { sz: 10, color: { rgb: '000000' } } }
  const summaryStyle = { font: { sz: 9, color: { rgb: '000000' } } }
  const headerStyle = {
    fill: { fgColor: { rgb: 'E5E5E5' } },
    font: { bold: true, sz: 11, color: { rgb: '000000' } },
    border: EXCEL_BORDER_THIN,
  }
  const dataCellStyle = { border: EXCEL_BORDER_THIN }
  const footerStyle = { font: { sz: 10, color: { rgb: '000000' } } }

  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = 0; c < EXCEL_COLUMN_COUNT; c++) {
      const ref = XLSX.utils.encode_cell({ r, c })
      const cell = ws[ref]
      if (!cell) continue
      if (r === 0) {
        cell.s = titleStyle
      } else if (r === 1) {
        cell.s = subtitleStyle
      } else if (hasSummary && r === 2) {
        cell.s = summaryStyle
      } else if (r === headerRowIndex) {
        cell.s = headerStyle
      } else if (r > headerRowIndex && r < preparedByRowIndex) {
        cell.s = dataCellStyle
      } else if (r === preparedByRowIndex || r === signatureRowIndex) {
        cell.s = footerStyle
      }
    }
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Projects')
  XLSX.writeFile(wb, filename)
}

export function exportProjectsToPdf(
  projects: any[],
  formatCurrency: (amount: number, currency?: string) => string,
  filename = 'Projects.pdf',
  title = 'Project Portfolio',
  summary?: ProjectsExportSummary | null,
  preparedBy?: string
): void {
  const resolvedSummary = summary ?? (projects.length ? computeProjectsSummary(projects) : null)
  const rows = buildProjectExportRows(projects, formatCurrency)
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 14

  doc.setFontSize(14)
  doc.text(title, margin, 12)
  doc.setFontSize(10)
  doc.text(`Exported: ${projects.length} project(s)`, margin, 18)
  let startY = 22
  if (resolvedSummary) {
    const summaryLine = formatSummaryOneLine(resolvedSummary, formatCurrency)
    doc.setFontSize(9)
    doc.text(summaryLine, margin, startY)
    startY += 8
  }
  const pdfHeaders = ['No', 'Code', 'Grant Code', 'Project Name', 'Donor', 'Fund Type', 'Sector', 'Location', 'Start Date', 'End Date', 'Currency', 'Budget', 'Spent', 'Util %', 'Status']
  autoTable(doc, {
    startY,
    head: [pdfHeaders],
    body: rows.map((r) => [
      r.no,
      r.code,
      r.grantCode,
      r.projectName,
      r.donor,
      r.fundType,
      r.sector,
      r.location,
      r.startDate,
      r.endDate,
      r.currency,
      r.budget,
      r.spent,
      r.utilPercent,
      r.status,
    ]),
    styles: { fontSize: 6 },
    headStyles: { fillColor: [229, 229, 229], textColor: [0, 0, 0], fontStyle: 'bold' },
    margin: { left: margin, right: margin },
  })
  const tableEndY = (doc as any).lastAutoTable?.finalY ?? startY
  const footerY = tableEndY + 14
  const spaceNeeded = 22
  const drawFooter = (y: number) => {
    doc.setFontSize(10)
    doc.text('Prepared by: ' + (preparedBy ?? ''), margin, y)
    doc.text('Signature: ________', margin, y + 7)
  }
  if (footerY + spaceNeeded < pageH - margin) {
    drawFooter(footerY)
  } else {
    doc.addPage('a4', 'landscape')
    drawFooter(20)
  }
  doc.save(filename)
}

export function exportProjectsToCsv(
  projects: any[],
  formatCurrency: (amount: number, currency?: string) => string,
  filename = 'Projects.csv',
  summary?: ProjectsExportSummary | null,
  preparedBy?: string
): void {
  const resolvedSummary = summary ?? (projects.length ? computeProjectsSummary(projects) : null)
  const rows = buildProjectExportRows(projects, formatCurrency)
  const headers = ['No', 'Code', 'Grant Code', 'Project Name', 'Donor', 'Fund Type', 'Sector', 'Location', 'Start Date', 'End Date', 'Currency', 'Budget', 'Spent', 'Util %', 'Status']
  const escape = (v: string) => {
    const s = String(v ?? '')
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const summaryLine = resolvedSummary ? formatSummaryOneLine(resolvedSummary, formatCurrency) : null
  const lines = [
    ...(summaryLine ? [summaryLine, ''] : []),
    headers.join(','),
    ...rows.map((r) => [r.no, r.code, r.grantCode, r.projectName, r.donor, r.fundType, r.sector, r.location, r.startDate, r.endDate, r.currency, r.budget, r.spent, r.utilPercent, r.status].map((x) => escape(String(x))).join(',')),
    '',
    'Prepared by: ' + (preparedBy ?? ''),
    'Signature: ________',
  ]
  const csv = '\uFEFF' + lines.join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
