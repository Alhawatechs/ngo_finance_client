// Common types
export interface BaseEntity {
  id: number
  created_at: string
  updated_at: string
}

// Organization types
export interface Organization extends BaseEntity {
  name: string
  short_name: string
  registration_number?: string
  address?: string
  city?: string
  country: string
  phone?: string
  email?: string
  website?: string
  logo_url?: string
  default_currency: string
  fiscal_year_start_month: number
  is_active: boolean
}

export interface Office extends BaseEntity {
  organization_id: number
  name: string
  code: string
  is_head_office: boolean
  address?: string
  city: string
  province?: string
  phone?: string
  email?: string
  manager_name?: string
  is_active: boolean
}

// Finance types
export interface ChartOfAccount extends BaseEntity {
  organization_id: number
  parent_id?: number
  account_code: string
  account_name: string
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  normal_balance: 'debit' | 'credit'
  currency_code?: string
  level: number
  is_header: boolean
  is_posting: boolean
  is_bank_account: boolean
  is_cash_account: boolean
  fund_type?: 'unrestricted' | 'restricted' | 'temporarily_restricted'
  description?: string
  is_active: boolean
  opening_balance: number
  /** L4: opening + net posted journal lines; L3–L1: sum of children's rolled_up_balance (from API). */
  rolled_up_balance?: number
  children?: ChartOfAccount[]
  parent?: ChartOfAccount
  /** Set when soft-deleted; account still in DB but hidden from default view */
  deleted_at?: string | null
}

export interface Currency extends BaseEntity {
  code: string
  name: string
  symbol: string
  decimal_places: number
  is_default: boolean
  is_active: boolean
}

export interface ExchangeRate extends BaseEntity {
  from_currency: string
  to_currency: string
  rate: number
  effective_date: string
  source?: string
}

export interface FiscalYear extends BaseEntity {
  name: string
  start_date: string
  end_date: string
  status: 'draft' | 'open' | 'closed' | 'locked'
  is_current: boolean
}

export interface FiscalPeriod extends BaseEntity {
  fiscal_year_id: number
  name: string
  period_number: number
  start_date: string
  end_date: string
  status: 'draft' | 'open' | 'closed' | 'locked'
  is_adjustment_period: boolean
}

// Transaction types
export interface Voucher extends BaseEntity {
  organization_id: number
  office_id: number
  project_id?: number
  /** Set when voucher was created from a journal book; GL entry posts into that book. */
  journal_id?: number | null
  fund_id?: number
  voucher_number: string
  province_code?: string | null
  location_code?: string | null
  voucher_type: 'payment' | 'receipt' | 'journal' | 'contra'
  voucher_date: string
  payee_name?: string
  description: string
  currency: string
  exchange_rate: number
  total_amount: number
  base_currency_amount: number
  payment_method?: 'cash' | 'check' | 'bank_transfer' | 'mobile_money'
  check_number?: string
  bank_reference?: string
  status: 'draft' | 'submitted' | 'pending_approval' | 'approved' | 'rejected' | 'posted' | 'cancelled'
  current_approval_level: number
  required_approval_level: number
  rejection_reason?: string
  lines?: VoucherLine[]
  approvals?: VoucherApproval[]
  office?: Office
  project?: Project
  creator?: { id: number; name: string }
}

export interface VoucherLine extends BaseEntity {
  voucher_id: number
  account_id: number
  fund_id?: number
  project_id?: number
  line_number: number
  description?: string
  debit_amount: number
  credit_amount: number
  cost_center?: string
  project_account_code?: string
  account?: ChartOfAccount
}

export interface VoucherApproval extends BaseEntity {
  voucher_id: number
  approval_level: number
  approver_id?: number
  action: 'pending' | 'approved' | 'rejected' | 'skipped'
  comments?: string
  action_at?: string
  approver?: { id: number; name: string; position?: string }
}

// Project types
export interface Donor extends BaseEntity {
  organization_id: number
  code: string
  name: string
  short_name?: string
  donor_type: 'bilateral' | 'multilateral' | 'foundation' | 'corporate' | 'individual' | 'government'
  contact_person?: string
  email?: string
  phone?: string
  address?: string
  country?: string
  website?: string
  reporting_currency: string
  reporting_frequency?: string
  default_budget_format_id?: number | null
  default_budget_format?: { id: number; name: string; code: string } | null
  is_active: boolean
}

export interface Grant extends BaseEntity {
  organization_id: number
  donor_id: number
  grant_code: string
  grant_name: string
  description?: string
  start_date: string
  end_date: string
  total_amount: number
  currency: string
  status: 'draft' | 'pending_approval' | 'approved' | 'active' | 'on_hold' | 'completed' | 'closed'
  donor?: Donor
}

export interface Project extends BaseEntity {
  organization_id: number
  grant_id?: number
  office_id?: number
  project_code: string
  project_name: string
  description?: string
  start_date: string
  end_date: string
  budget_amount: number
  currency: string
  status: 'draft' | 'pending_approval' | 'approved' | 'active' | 'on_hold' | 'completed' | 'closed'
  project_manager?: string
  sector?: string
  location?: string
  beneficiaries_target?: number
  grant?: Grant
  office?: Office
}

export interface Fund extends BaseEntity {
  organization_id: number
  code: string
  name: string
  description?: string
  fund_type: 'unrestricted' | 'restricted' | 'temporarily_restricted'
  donor_id?: number
  restriction_start_date?: string
  restriction_end_date?: string
  restriction_purpose?: string
  initial_amount: number
  is_active: boolean
  donor?: Donor
}

// Budget types
export interface Budget extends BaseEntity {
  organization_id: number
  fiscal_year_id: number
  office_id?: number
  project_id?: number
  fund_id?: number
  budget_code: string
  name: string
  description?: string
  budget_type: 'operational' | 'project' | 'capital' | 'consolidated'
  currency: string
  total_amount: number
  version: number
  status: 'draft' | 'submitted' | 'approved' | 'active' | 'revised' | 'closed'
  lines?: BudgetLine[]
}

export interface BudgetLine extends BaseEntity {
  budget_id: number
  account_id: number
  fund_id?: number
  line_code?: string
  description?: string
  annual_amount: number
  revised_amount?: number
  actual_amount: number
  committed_amount: number
  available_amount: number
  account?: ChartOfAccount
}

// Dashboard types
export interface DashboardStats {
  quick_stats: {
    total_budget: number
    funds_utilized: number
    remaining_budget: number
    pending_approvals: number
    active_projects: number
    regional_offices: number
  }
  budget_utilization: {
    percentage: number
    utilized: number
    total: number
  }
  project_performance: Array<{
    donor: string
    budget: number
    spent: number
    percentage: number
  }>
  currency_balances: Array<{
    currency: string
    balance: number
  }>
  approval_stats: Array<{
    level: number
    name: string
    pending_count: number
  }>
  expense_by_office: Array<{
    office: string
    amount: number
  }>
  budget_vs_actual: Array<{
    program: string
    budget: number
    actual: number
  }>
}

export interface Activity {
  id: number
  action: string
  description: string
  model_type: string
  user: string
  created_at: string
  time_ago: string
}
