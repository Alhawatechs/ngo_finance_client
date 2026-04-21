/**
 * Chart of accounts Excel/PDF export columns — keys must stay in sync with
 * backend ChartOfAccountsExport::ALLOWED_COLUMNS.
 */
export const CHART_OF_ACCOUNTS_EXPORT_COLUMN_KEYS = [
  'chart_of_accounts',
  'general_ledger_account',
  'account_code',
  'account_name',
  'account_type',
  'account_nature',
  'currency',
  'balance',
  'status',
  'description',
  'remark',
] as const

export type ChartOfAccountExportColumnKey = (typeof CHART_OF_ACCOUNTS_EXPORT_COLUMN_KEYS)[number]

export const CHART_OF_ACCOUNTS_EXPORT_COLUMN_META: Record<
  ChartOfAccountExportColumnKey,
  { label: string; description: string }
> = {
  chart_of_accounts: {
    label: 'Chart of Accounts',
    description: 'Full hierarchy path on category and header rows (non-posting accounts).',
  },
  general_ledger_account: {
    label: 'General Ledger Account',
    description: 'Parent account name and code on posting (detail) rows only.',
  },
  account_code: {
    label: 'Account Code',
    description: 'Dotted code for posting accounts; empty on header rows.',
  },
  account_name: {
    label: 'Account Name',
    description: 'Name for posting accounts; empty where the path column carries the label.',
  },
  account_type: {
    label: 'Type',
    description: 'Classification: Asset, Liability, Equity, Revenue, or Expense.',
  },
  account_nature: {
    label: 'Account Nature',
    description: 'Normal balance: Debit or Credit.',
  },
  currency: {
    label: 'Currency',
    description: 'ISO code for posting accounts; uses your org default when blank.',
  },
  balance: {
    label: 'Balance',
    description: 'Opening balance column; export header uses Balance (ORG) with your organization default currency.',
  },
  status: {
    label: 'Status',
    description: 'Active, inactive, or deleted (if included in the export).',
  },
  description: {
    label: 'Description',
    description: 'Text from the account description field.',
  },
  remark: {
    label: 'Remark',
    description: 'Extra notes column (optional; often empty).',
  },
}

/** Groups for the export dialog (visual hierarchy only). */
export const CHART_OF_ACCOUNTS_EXPORT_COLUMN_GROUPS: {
  title: string
  hint?: string
  keys: ChartOfAccountExportColumnKey[]
}[] = [
  {
    title: 'Hierarchy',
    hint: 'Structured path and parent context',
    keys: ['chart_of_accounts', 'general_ledger_account'],
  },
  {
    title: 'Identifiers',
    keys: ['account_code', 'account_name'],
  },
  {
    title: 'Classification & amounts',
    keys: ['account_type', 'account_nature', 'currency', 'balance', 'status'],
  },
  {
    title: 'Notes',
    keys: ['description', 'remark'],
  },
]

export const DEFAULT_CHART_OF_ACCOUNTS_EXPORT_COLUMNS: ChartOfAccountExportColumnKey[] = [
  ...CHART_OF_ACCOUNTS_EXPORT_COLUMN_KEYS,
]

const STORAGE_KEY = 'coa_export_column_keys_v2'

export function loadSavedExportColumns(): ChartOfAccountExportColumnKey[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    return normalizeExportColumns(parsed as string[])
  } catch {
    return null
  }
}

export function saveExportColumns(columns: ChartOfAccountExportColumnKey[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(columns))
  } catch {
    /* ignore */
  }
}

/** Filters to allowed keys, dedupes, preserves order; falls back to default if empty or invalid. */
export function normalizeExportColumns(
  keys: string[] | null | undefined
): ChartOfAccountExportColumnKey[] {
  if (!keys?.length) return [...DEFAULT_CHART_OF_ACCOUNTS_EXPORT_COLUMNS]
  const allowed = new Set<string>(CHART_OF_ACCOUNTS_EXPORT_COLUMN_KEYS)
  const out: ChartOfAccountExportColumnKey[] = []
  for (const k of keys) {
    if (typeof k === 'string' && allowed.has(k) && !out.includes(k as ChartOfAccountExportColumnKey)) {
      out.push(k as ChartOfAccountExportColumnKey)
    }
  }
  return out.length > 0 ? out : [...DEFAULT_CHART_OF_ACCOUNTS_EXPORT_COLUMNS]
}

/** Header row for PDF/CSV — balance column matches Excel: Balance (AFN), Balance (USD), etc. */
export function exportColumnLabels(keys: ChartOfAccountExportColumnKey[], defaultCurrency?: string): string[] {
  const dc = (defaultCurrency || 'AFN').trim().toUpperCase() || 'AFN'
  return keys.map((k) => (k === 'balance' ? `Balance (${dc})` : CHART_OF_ACCOUNTS_EXPORT_COLUMN_META[k].label))
}
