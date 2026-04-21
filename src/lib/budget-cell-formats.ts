/**
 * Excel-like cell format types for budget format columns.
 * Used in Add Format spreadsheet; type is auto-detected from column label when possible.
 */

export const CELL_FORMAT_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'fraction', label: 'Fraction' },
  { value: 'scientific', label: 'Scientific' },
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'special', label: 'Special' },
  { value: 'custom', label: 'Custom' },
  { value: 'account_picker', label: 'Account' },
  { value: 'select', label: 'Dropdown' },
] as const

export type CellFormatValue = (typeof CELL_FORMAT_TYPES)[number]['value']

/** Map display format to API/storage type (backend accepts any string; some map to same handling) */
const NORMALIZE_TYPE: Record<string, string> = {
  general: 'text',
  accounting: 'currency',
  fraction: 'number',
  scientific: 'number',
  special: 'text',
  custom: 'text',
}

export function normalizeColumnTypeForApi(type: string): string {
  return NORMALIZE_TYPE[type] ?? type
}

/**
 * Auto-detect cell format from column header label (case-insensitive).
 * Returns the suggested type value for the column.
 */
export function detectCellFormatFromLabel(label: string): CellFormatValue {
  const lower = label.trim().toLowerCase()
  if (!lower) return 'general'

  // Currency / money
  if (
    /\b(amount|cost|total|price|usd|budget|contribution|grant|fee|payment|expense|revenue|salary|wage)\b/.test(lower) ||
    /\b(q1|q2|q3|q4|quarter)\s*(amount|budget)?/.test(lower) ||
    /\(usd\)|\(eur\)|\(afn\)|\$|currency/.test(lower)
  ) {
    return 'currency'
  }
  // Accounting (same as currency for display; could use accounting alignment later)
  if (/\b(debit|credit|balance|ledger)\b/.test(lower)) return 'accounting'

  // Percentage
  if (/\b(percent|pct|%|rate)\b/.test(lower) || /%\s*cost|%\s*share/.test(lower)) return 'percentage'

  // Date
  if (/\b(date|start|end|deadline|due|from|to)\b/.test(lower) && !/\b(amount|total|number)\b/.test(lower)) return 'date'

  // Time
  if (/\b(time|duration|hours|hrs)\b/.test(lower)) return 'time'

  // Number (quantity, count, etc.)
  if (
    /\b(quantity|qty|number|units|count|no\.|num|id#)\b/.test(lower) ||
    /\b(unit cost|unit_cost)\b/.test(lower)
  ) {
    return 'number'
  }
  // Fraction (e.g. "portion", "share" as fraction)
  if (/\b(fraction|portion|ratio)\b/.test(lower)) return 'fraction'
  // Scientific
  if (/\b(scientific|exponent|e\+|e-)\b/.test(lower)) return 'scientific'

  // Long text
  if (/\b(narrative|description|remarks?|notes?|comment|summary)\b/.test(lower) && lower.length > 15) return 'textarea'
  if (/\b(description|narrative|remark|note|name|title|item|line)\b/.test(lower)) return 'text'

  // Code / special
  if (/\b(code|id|ref|reference|section|category)\b/.test(lower)) return 'special'

  return 'general'
}
