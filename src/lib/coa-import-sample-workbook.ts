/**
 * Builds the chart-of-accounts import sample workbook (two sheets: guidelines + format).
 */
import * as XLSX from 'xlsx'
import type { WorkBook } from 'xlsx'

/** Headers for the sample format sheet — same columns the import API expects. */
export const COA_IMPORT_SAMPLE_HEADERS = [
  'Account Code',
  'Account Name',
  'Type',
  'Normal Balance',
  'Currency',
  'Opening Balance',
  'Description',
] as const

const SAMPLE_ROWS: (string | number)[][] = [
  ['1', 'Income (Layer 1 header)', 'revenue', 'credit', 'USD', 0, 'Top-level category — use Account list for headers vs posting'],
  ['11.1', 'Donor Grants (subcategory)', 'revenue', 'credit', 'USD', 0, 'Subcategory under income'],
  ['11.1.1', 'Restricted Grant Revenue', 'revenue', 'credit', 'USD', 0, 'Posting account example'],
  ['2', 'Expenses (Layer 1 header)', 'expense', 'debit', 'USD', 0, 'Expense branch'],
  ['21.1.1', 'Program Salaries', 'expense', 'debit', 'USD', 0, 'Typical program cost'],
  ['3', 'Assets (Layer 1 header)', 'asset', 'debit', 'USD', 0, 'Asset branch'],
  ['31.1.1', 'Cash - Operating', 'asset', 'debit', 'USD', 0, 'Bank / cash posting account'],
]

function guidelinesSheetRows(): (string | number)[][] {
  return [
    ['Chart of accounts — import guidelines'],
    [
      'Fill the Sample format sheet (second tab), then upload the file from General Ledger → Chart of accounts → Import & Export. Requires Edit Chart of Accounts and Edit Chart of Accounts Code.',
    ],
    [],
    ['1. How to upload'],
    ['• Use CSV, or Excel with the “Sample format” worksheet (recommended).'],
    ['• Rows are processed in account-code order; parent accounts must exist (in the file or already in your chart).'],
    ['• Codes that already exist in your organization are skipped (not overwritten).'],
    ['• Layer 1 = single digit 1–5; L2 = e.g. 11; L3 = e.g. 11.1; L4 = e.g. 11.1.1 (posting accounts).'],
    [],
    ['2. Account codes'],
    ['• Follow your organization’s dotted numbering policy.'],
    ['• Codes must be unique; duplicates in the file keep the first row only.'],
    [],
    ['3. Column reference (Sample format sheet)'],
    ['• Account Code — Required.'],
    ['• Account Name — Required.'],
    ['• Type — asset, liability, equity, revenue, expense (lowercase).'],
    ['• Normal Balance — debit or credit (lowercase).'],
    ['• Currency — For L4 posting accounts: use an active org currency, or leave blank to use the default.'],
    ['• Opening Balance — Number; headers leave as 0 or empty.'],
    ['• Description — Optional.'],
    [],
    ['4. Export vs this sample'],
    ['• A full export from the app may include extra columns; this template matches the import parser.'],
    [],
    ['5. If import is not available to you'],
    ['• Ask an administrator for Edit Chart of Accounts Code, or add accounts one by one from Account list.'],
  ]
}

export function buildCoaImportSampleWorkbook(): WorkBook {
  const guidelines = XLSX.utils.aoa_to_sheet(guidelinesSheetRows())
  guidelines['!cols'] = [{ wch: 92 }]

  const formatHeader = [...COA_IMPORT_SAMPLE_HEADERS]
  const formatBody = [formatHeader, ...SAMPLE_ROWS]
  const formatSheet = XLSX.utils.aoa_to_sheet(formatBody)
  formatSheet['!cols'] = [
    { wch: 14 },
    { wch: 36 },
    { wch: 12 },
    { wch: 16 },
    { wch: 10 },
    { wch: 18 },
    { wch: 52 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, guidelines, 'Import guidelines')
  XLSX.utils.book_append_sheet(wb, formatSheet, 'Sample format')
  return wb
}

export function downloadCoaImportSampleExcel(): void {
  const wb = buildCoaImportSampleWorkbook()
  const date = new Date().toISOString().split('T')[0]
  XLSX.writeFile(wb, `chart-of-accounts-import-sample-${date}.xlsx`)
}

function escapeCsvCell(v: string | number): string {
  const s = String(v ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/** Same tabular data as the "Sample format" sheet, as CSV. */
export function getCoaImportSampleCsv(): string {
  const header = COA_IMPORT_SAMPLE_HEADERS.join(',')
  const rows = SAMPLE_ROWS.map((r) => r.map(escapeCsvCell).join(','))
  return [header, ...rows].join('\n')
}

export function downloadCoaImportSampleCsv(): void {
  const csv = getCoaImportSampleCsv()
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `chart-of-accounts-import-sample-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
