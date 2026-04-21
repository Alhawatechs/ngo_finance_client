/**
 * Chart of accounts PDF export — jsPDF + jspdf-autotable in the browser
 * (same pattern as projects-export `exportProjectsToPdf`: Helvetica, no custom font fetch).
 * Column layout matches Excel export (see chart-of-accounts-export-columns).
 */
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ChartOfAccount } from '@/types'
import { compareAccountCodes } from '@/lib/utils'
import type { Styles } from 'jspdf-autotable'
import {
  type ChartOfAccountExportColumnKey,
  exportColumnLabels,
  normalizeExportColumns,
} from '@/lib/chart-of-accounts-export-columns'

/** Coerce API ids (string | number) so Map lookups match parent chains. */
function coaId(value: unknown): number {
  return Number(value)
}

/** Safe parent id from API (may be number or string in JSON). */
function parentIdNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

/**
 * Normalize rows from the API before PDF/sort so parent_id and id types stay consistent.
 */
export function normalizeChartOfAccountsForPdf(accounts: ChartOfAccount[]): ChartOfAccount[] {
  return accounts.map((a) => ({
    ...a,
    id: coaId(a.id),
    parent_id: parentIdNumber(a.parent_id),
    organization_id: coaId(a.organization_id),
    level: Number(a.level ?? 0),
    is_posting: Boolean(a.is_posting),
    is_header: Boolean(a.is_header),
    is_active: Boolean(a.is_active),
  }))
}

/** Same path rules as backend ChartOfAccountsExport::hierarchyPathFor */
export function hierarchyPathForExport(
  account: ChartOfAccount,
  byId: Map<number, ChartOfAccount>
): string {
  const chain: ChartOfAccount[] = []
  let current: ChartOfAccount | undefined = account
  let guard = 0
  while (current && guard++ < 64) {
    chain.unshift(current)
    const pidN: number | undefined = parentIdNumber(current.parent_id)
    current = pidN !== undefined ? byId.get(pidN) : undefined
  }
  const parts: string[] = []
  chain.forEach((node, i) => {
    const code = String(node.account_code ?? '').trim()
    const name = String(node.account_name ?? '').trim()
    if (i === 0) {
      parts.push(`${code} · ${name}`.trim())
    } else {
      parts.push(`${code} . ${name}`.trim())
    }
  })
  return parts.join(': ')
}

function glAccountLabel(account: ChartOfAccount, byId: Map<number, ChartOfAccount>): string {
  const pidN = parentIdNumber(account.parent_id)
  if (pidN === undefined) return ''
  const parent = byId.get(pidN)
  if (!parent) return ''
  return `${String(parent.account_name).trim()}: ${String(parent.account_code).trim()}`
}

function accountNatureLabel(account: ChartOfAccount): string {
  const nb = String(account.normal_balance ?? '')
    .toLowerCase()
    .trim()
  if (nb === 'debit') return 'Debit'
  if (nb === 'credit') return 'Credit'
  if (!nb) return ''
  return nb.charAt(0).toUpperCase() + nb.slice(1).toLowerCase()
}

/** Matches backend ChartOfAccountsExport::accountTypeLabelForExport (NGO workbook). */
function accountTypeLabelForExport(account: ChartOfAccount): string {
  const t = String(account.account_type ?? '').toLowerCase().trim()
  if (!t) return ''
  if (account.is_posting) {
    switch (t) {
      case 'expense':
        return 'Expense'
      case 'revenue':
        return 'Revenue'
      case 'asset':
        return 'Asset'
      case 'liability':
        return 'Liability'
      case 'equity':
        return 'Equity'
      default:
        return t.charAt(0).toUpperCase() + t.slice(1)
    }
  }
  switch (t) {
    case 'expense':
      return 'Expenses'
    case 'revenue':
      return 'Revenue'
    case 'asset':
      return 'Asset'
    case 'liability':
      return 'Liability'
    case 'equity':
      return 'Equity'
    default:
      return t.charAt(0).toUpperCase() + t.slice(1)
  }
}

function statusLabel(account: ChartOfAccount): string {
  if (account.deleted_at) return 'Deleted'
  return account.is_active ? 'Active' : 'Inactive'
}

function currencyForExport(account: ChartOfAccount, defaultCurrency: string): string {
  const c = String(account.currency_code ?? '').trim().toUpperCase()
  return c || defaultCurrency.trim().toUpperCase() || 'AFN'
}

/** Last (XXX) ISO code in a string — matches backend folder-row currency inference. */
function currencyFromPathOrName(pathOrName: string): string | null {
  const re = /\(([A-Z]{3})\)/gi
  let m: RegExpExecArray | null
  let last: string | null = null
  while ((m = re.exec(pathOrName)) !== null) {
    last = m[1].toUpperCase()
  }
  return last
}

function currencyForHeaderExport(
  account: ChartOfAccount,
  hierarchyPath: string,
  defaultCurrency: string
): string {
  const c = String(account.currency_code ?? '').trim().toUpperCase()
  if (c) return c
  const fromPath = currencyFromPathOrName(hierarchyPath)
  if (fromPath) return fromPath
  const fromName = currencyFromPathOrName(String(account.account_name ?? ''))
  if (fromName) return fromName
  return defaultCurrency.trim().toUpperCase() || 'AFN'
}

function formatBalanceForExport(account: ChartOfAccount): string {
  const ob = account.opening_balance
  if (ob === null || ob === undefined || Number.isNaN(Number(ob))) return ''
  return Number(ob).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Full row keyed like backend ChartOfAccountsExport (strings for PDF/CSV display). */
export function rowValuesForChartExport(
  account: ChartOfAccount,
  byId: Map<number, ChartOfAccount>,
  defaultCurrency: string
): Record<ChartOfAccountExportColumnKey, string> {
  if (!account.is_posting) {
    const path = hierarchyPathForExport(account, byId)
    return {
      chart_of_accounts: path,
      general_ledger_account: '',
      account_code: '',
      account_name: '',
      account_type: accountTypeLabelForExport(account),
      account_nature: accountNatureLabel(account),
      currency: currencyForHeaderExport(account, path, defaultCurrency),
      balance: '0.00',
      status: statusLabel(account),
      description: String(account.description ?? '').replace(/\s+/g, ' ').trim(),
      remark: '',
    }
  }
  return {
    chart_of_accounts: '',
    general_ledger_account: glAccountLabel(account, byId),
    account_code: String(account.account_code ?? ''),
    account_name: String(account.account_name ?? ''),
    account_type: accountTypeLabelForExport(account),
    account_nature: accountNatureLabel(account),
    currency: currencyForExport(account, defaultCurrency),
    balance: formatBalanceForExport(account),
    status: statusLabel(account),
    description: String(account.description ?? '').replace(/\s+/g, ' ').trim(),
    remark: '',
  }
}

/**
 * Same ordering as backend export: depth-first (complete one category subtree before the next).
 */
export function sortAccountsForExport(accounts: ChartOfAccount[]): ChartOfAccount[] {
  if (accounts.length === 0) return []

  const byId = new Map(accounts.map((a) => [coaId(a.id), a]))
  const byParent = new Map<number | 'root', ChartOfAccount[]>()

  for (const a of accounts) {
    const pidN = parentIdNumber(a.parent_id)
    const key = pidN !== undefined && byId.has(pidN) ? pidN : 'root'
    const list = byParent.get(key) ?? []
    list.push(a)
    byParent.set(key, list)
  }

  const result: ChartOfAccount[] = []
  const visit = (key: number | 'root') => {
    const nodes = byParent.get(key) ?? []
    nodes.sort((a, b) =>
      compareAccountCodes(String(a.account_code ?? ''), String(b.account_code ?? ''))
    )
    for (const n of nodes) {
      result.push(n)
      visit(coaId(n.id))
    }
  }
  visit('root')
  return result
}

export interface ExportChartOfAccountsPdfOptions {
  organizationName: string
  defaultCurrency: string
  /** ISO-ish timestamp line, e.g. from new Date().toLocaleString() */
  exportedAtLine: string
  filename?: string
  /** Subset/order of columns; defaults to all columns (same as Excel). */
  columns?: ChartOfAccountExportColumnKey[]
}

function isCategoryOrSubcategoryRow(account: ChartOfAccount | undefined): boolean {
  if (!account) return false
  return account.level === 1 || account.level === 2
}

/**
 * Build PDF like `exportProjectsToPdf`: built-in Helvetica only (reliable; no font fetch / registration).
 */
export function exportChartOfAccountsToPdf(accounts: ChartOfAccount[], options: ExportChartOfAccountsPdfOptions): void {
  const {
    organizationName,
    defaultCurrency,
    exportedAtLine,
    filename = `chart-of-accounts-${new Date().toISOString().split('T')[0]}.pdf`,
    columns: columnsOpt,
  } = options

  try {
    const baseCurrency = (defaultCurrency || 'AFN').trim() || 'AFN'
    const columnKeys = normalizeExportColumns(columnsOpt)
    const sorted = sortAccountsForExport(accounts)
    const byId = new Map(sorted.map((a) => [coaId(a.id), a]))
    const body: (string | number)[][] = sorted.map((a) => {
      const full = rowValuesForChartExport(a, byId, baseCurrency)
      return columnKeys.map((k) => String(full[k] ?? ''))
    })
    const head = [exportColumnLabels(columnKeys, baseCurrency)]

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const margin = 14

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('Chart of Accounts', margin, 12)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(organizationName, margin, 18)
    doc.text(`Exported: ${sorted.length} account(s) — ${exportedAtLine}`, margin, 24)

    const startY = 30
    const columnStyles: Record<string, Partial<Styles>> = {}
    const alignCenter = (key: (typeof columnKeys)[number]) => {
      const i = columnKeys.indexOf(key)
      if (i >= 0) columnStyles[String(i)] = { halign: 'center', valign: 'middle' }
    }
    const alignRight = (key: (typeof columnKeys)[number]) => {
      const i = columnKeys.indexOf(key)
      if (i >= 0) columnStyles[String(i)] = { halign: 'right', valign: 'middle' }
    }
    alignCenter('account_code')
    alignCenter('currency')
    alignCenter('status')
    alignRight('balance')

    const tableFontSize =
      columnKeys.length > 10 ? 5 : columnKeys.length > 7 ? 5.5 : columnKeys.length > 5 ? 6 : 6.5

    autoTable(doc, {
      startY,
      head,
      body,
      styles: {
        fontSize: tableFontSize,
        cellPadding: 1,
      },
      headStyles: {
        fillColor: [229, 229, 229],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      columnStyles,
      margin: { left: margin, right: margin },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const idx = data.row.index
          const account = typeof idx === 'number' ? sorted[idx] : undefined
          if (account && isCategoryOrSubcategoryRow(account)) {
            data.cell.styles.fontStyle = 'bold'
          }
        }
      },
    })

    doc.save(filename)
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : String(e)
    throw new Error(detail || 'PDF generation failed.')
  }
}
