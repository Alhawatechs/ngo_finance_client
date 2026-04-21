export type AdvanceType = 'travel' | 'project' | 'operational' | 'salary' | 'other'

export type AdvanceStatus =
  | 'pending'
  | 'approved'
  | 'disbursed'
  | 'partially_settled'
  | 'settled'
  | 'cancelled'

/** Client-side row until advances API is wired; mirrors core backend fields. */
export interface LocalAdvanceRow {
  id: string
  advance_number: string
  advance_type: AdvanceType
  employee_name: string
  advance_date: string
  expected_settlement_date: string
  purpose: string
  currency: string
  amount: number
  settled_amount: number
  outstanding_amount: number
  status: AdvanceStatus
}

export const ADVANCE_TYPE_OPTIONS: { value: AdvanceType; label: string }[] = [
  { value: 'travel', label: 'Travel' },
  { value: 'project', label: 'Project' },
  { value: 'operational', label: 'Operational' },
  { value: 'salary', label: 'Salary' },
  { value: 'other', label: 'Other' },
]

export const ADVANCE_STATUS_OPTIONS: { value: AdvanceStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'disbursed', label: 'Disbursed' },
  { value: 'partially_settled', label: 'Partially settled' },
  { value: 'settled', label: 'Settled' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function advanceTypeLabel(t: AdvanceType): string {
  return ADVANCE_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t
}

export function advanceStatusLabel(s: AdvanceStatus): string {
  return ADVANCE_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s
}

export function nextDraftAdvanceNumber(existing: LocalAdvanceRow[]): string {
  const year = new Date().getFullYear()
  const n = existing.filter((r) => r.advance_number.startsWith(`ADV-${year}`)).length + 1
  return `ADV-${year}-${String(n).padStart(4, '0')}`
}
