import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format as formatDateFns, isValid, parse } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Compare dotted account codes (1 < 2 < 11 < 11.1 < 11.1.2 < 11.1.10). Use for COA sorting. */
export function compareAccountCodes(a: string, b: string): number {
  const sa = (a || '').trim().includes('.') ? (a || '').trim().split('.') : [(a || '').trim()]
  const sb = (b || '').trim().includes('.') ? (b || '').trim().split('.') : [(b || '').trim()]
  const n = Math.max(sa.length, sb.length)
  for (let i = 0; i < n; i++) {
    const ea = sa[i]
    const eb = sb[i]
    if (ea === undefined) return -1
    if (eb === undefined) return 1
    const ia = parseInt(ea, 10)
    const ib = parseInt(eb, 10)
    if (ia !== ib) return ia - ib
  }
  return 0
}

/**
 * Convert storage/logo URLs from backend (e.g. http://localhost:8000/storage/...) to
 * same-origin path so they work via Next.js proxy. Returns /storage/... for img src.
 */
export function toSameOriginStorageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null
  if (url.startsWith('/storage/')) return url
  try {
    const u = new URL(url)
    if (u.pathname.startsWith('/storage/')) return u.pathname
  } catch (_) {}
  return url
}

/** Symbol and decimal places for display (aligned with COMMON_CURRENCIES). JPY = 0 decimals. */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', AFN: '؋', GBP: '£', CHF: 'CHF', JPY: '¥', PKR: '₨', INR: '₹',
  AED: 'د.إ', SAR: '﷼', CAD: 'C$', AUD: 'A$',
}
const CURRENCY_DECIMALS: Record<string, number> = {
  JPY: 0,
  // others default 2
}

export function formatCurrency(amount: number, currency: string = 'AFN'): string {
  const code = (currency || 'AFN').toUpperCase()
  const symbol = CURRENCY_SYMBOLS[code] ?? code
  const decimals = CURRENCY_DECIMALS[code] ?? 2
  return `${symbol}${Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

/** Numeric amount only (no symbol) — use with a separate ISO currency label. */
export function formatCurrencyAmountOnly(amount: number, currency: string = 'AFN'): string {
  const code = (currency || 'AFN').toUpperCase()
  const decimals = CURRENCY_DECIMALS[code] ?? 2
  return Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** ISO 4217 code for display (e.g. AFN, USD). */
export function getCurrencyIsoCode(currency: string | undefined | null): string {
  return (currency || 'AFN').trim().toUpperCase() || 'AFN'
}

/** Single date display format used across the entire system: DD/MM/YYYY */
export const DATE_DISPLAY_FORMAT = 'dd/MM/yyyy'
/** Readable base format for date pickers and typed input: e.g. Jan 11, 2023 */
export const DATE_DISPLAY_FORMAT_READABLE = 'MMM d, yyyy'
/** Alternative long format: e.g. 25 December 2024 */
export const DATE_DISPLAY_FORMAT_LONG = 'd MMMM yyyy'

/**
 * Parse a user-typed date string into YYYY-MM-DD. Accepts many common formats so users
 * can type e.g. 11-Jan-2023, 11/01/2023, 2023-01-11, Jan 11 2023. Returns null if invalid.
 */
const FLEXIBLE_DATE_FORMATS = [
  'yyyy-MM-dd',
  'd-MMM-yyyy',   // 11-Jan-2023
  'd-MMM-yy',     // 11-Jan-23
  'dd-MMM-yyyy',
  'd/M/yyyy',
  'd/M/yy',
  'dd/MM/yyyy',
  'MM/dd/yyyy',
  'M/d/yyyy',
  'd MMM yyyy',   // 11 Jan 2023
  'd MMMM yyyy',
  'MMM d, yyyy',  // Jan 11, 2023
  'MMMM d, yyyy',
  'MMM d yyyy',
  'd.MM.yyyy',
  'yyyy/MM/dd',
]

export function parseFlexibleDate(input: string): string | null {
  const trimmed = input?.trim()
  if (!trimmed) return null
  for (const fmt of FLEXIBLE_DATE_FORMATS) {
    try {
      const d = parse(trimmed, fmt, new Date())
      if (isValid(d)) return formatDateFns(d, 'yyyy-MM-dd')
    } catch {
      continue
    }
  }
  const iso = new Date(trimmed)
  if (!isNaN(iso.getTime())) return formatDateFns(iso, 'yyyy-MM-dd')
  return null
}

/**
 * Format a date for display. Uses the system-wide format (DD/MM/yyyy) everywhere.
 * @param date - ISO date string (YYYY-MM-DD) or Date
 * @param format - 'short' (dd/MM/yyyy), 'long' (d MMMM yyyy), or 'readable' (MMM d, yyyy e.g. Jan 11, 2023)
 */
export function formatDate(date: string | Date, format: 'short' | 'long' | 'readable' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date.includes('T') ? date : date + 'T12:00:00') : date
  if (!isValid(d)) return '—'
  if (format === 'readable') return formatDateFns(d, DATE_DISPLAY_FORMAT_READABLE)
  return formatDateFns(d, format === 'long' ? DATE_DISPLAY_FORMAT_LONG : DATE_DISPLAY_FORMAT)
}

/** Today's date as YYYY-MM-DD for use in state and API (single format for storage). */
export function todayISO(): string {
  return formatDateFns(new Date(), 'yyyy-MM-dd')
}

/** Parse a display or API date string to YYYY-MM-DD. Pass-through if already YYYY-MM-DD. */
export function toISODate(date: string | Date | null | undefined): string {
  if (!date) return ''
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date
  const d = typeof date === 'string' ? new Date(date.includes('T') ? date : date + 'T12:00:00') : date
  return isValid(d) ? formatDateFns(d, 'yyyy-MM-dd') : ''
}

export function formatNumber(value: number, decimals: number = 0): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** Format number for voucher amount cell: decimal 2, comma thousands (e.g. 34,000.00 or -1,234.56). Empty when zero. */
export function formatAmountCell(value: number | undefined): string {
  const n = Number(value)
  if (n === 0 || Number.isNaN(n)) return ''
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Parse voucher amount cell input (strips commas; supports leading - and (123.45) accounting negatives). */
export function parseAmountCell(input: string): number {
  let s = String(input).replace(/,/g, '').trim()
  if (s.startsWith('(') && s.endsWith(')')) {
    s = `-${s.slice(1, -1)}`
  }
  const n = parseFloat(s)
  return Number.isNaN(n) ? 0 : Math.round(n * 100) / 100
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const TIME_INTERVALS: readonly [number, string][] = [
  [31536000, 'year'], [2592000, 'month'], [86400, 'day'],
  [3600, 'hour'], [60, 'minute'], [1, 'second'],
] as const

export function timeAgo(date: string | Date): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 1) return 'just now'

  for (const [seconds, label] of TIME_INTERVALS) {
    const interval = Math.floor(diff / seconds)
    if (interval >= 1) return `${interval} ${label}${interval > 1 ? 's' : ''} ago`
  }
  return 'just now'
}

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
const THOUSANDS = ['', 'thousand', 'million', 'billion']

function hundredsToWords(n: number): string {
  if (n === 0) return ''
  if (n < 20) return ONES[n]
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '')
  return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + hundredsToWords(n % 100) : '')
}

/**
 * Convert a number to words (English). Used for "amount in words" on vouchers/checks.
 * @param amount - numeric amount
 * @param decimals - fractional part (e.g. cents). Rendered as "and XX/100".
 */
export function amountToWords(amount: number, decimals: number = 0): string {
  if (!Number.isFinite(amount) || amount === 0) return 'Zero'
  const negative = amount < 0
  const abs = Math.abs(amount)
  const int = Math.floor(abs)
  const frac = decimals > 0 ? Math.round((abs - int) * Math.pow(10, decimals)) : 0
  if (int === 0 && frac === 0) return negative ? 'Minus zero' : 'Zero'
  let s = ''
  let groupIndex = 0
  let n = int
  while (n > 0) {
    const group = n % 1000
    if (group > 0) {
      const part = hundredsToWords(group)
      const name = THOUSANDS[groupIndex]
      s = part + (name ? ' ' + name : '') + (s ? ' ' + s : '')
    }
    n = Math.floor(n / 1000)
    groupIndex++
  }
  s = s.trim() || 'zero'
  s = s.charAt(0).toUpperCase() + s.slice(1)
  if (frac > 0) s += ` and ${String(frac).padStart(decimals, '0')}/${Math.pow(10, decimals)}`
  return negative ? `Minus ${s}` : s
}
