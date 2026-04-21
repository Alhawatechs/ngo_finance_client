import apiClient from './client'

export interface OrganizationSettings {
  id: number
  
  // Basic Info
  name: string
  short_name: string
  registration_number?: string
  tagline?: string
  mission_statement?: string
  vision_statement?: string
  establishment_date?: string
  organization_type?: string
  
  // Financial Settings
  default_currency: string
  secondary_currencies?: string[]
  fiscal_year_start_month: number
  fiscal_year_end_month?: number
  accounting_method?: string
  budget_control_level?: string
  allow_negative_budgets?: boolean
  require_budget_check?: boolean
  default_tax_rate?: number
  enable_multi_currency?: boolean
  exchange_rate_source?: string
  cost_center_mandatory?: boolean
  project_mandatory?: boolean
  fund_mandatory?: boolean
  
  // Document Settings
  voucher_number_format?: string
  voucher_number_reset?: string
  payment_voucher_prefix?: string
  receipt_voucher_prefix?: string
  journal_voucher_prefix?: string
  contra_voucher_prefix?: string
  purchase_order_prefix?: string
  invoice_prefix?: string
  next_payment_voucher_number?: number
  next_receipt_voucher_number?: number
  next_journal_voucher_number?: number
  voucher_print_copies?: number
  show_amount_in_words?: boolean
  show_signature_lines?: boolean
  require_narration?: boolean
  
  // Approval Settings
  enable_approval_workflow?: boolean
  approval_levels?: number
  approval_limit_level1?: number
  approval_limit_level2?: number
  approval_limit_level3?: number
  require_dual_signature?: boolean
  dual_signature_threshold?: number
  allow_self_approval?: boolean
  auto_approve_below?: number
  require_supporting_documents?: boolean
  
  // Legal & Compliance
  tax_id?: string
  tax_exemption_number?: string
  tax_exemption_date?: string
  ngo_registration_body?: string
  registration_date?: string
  registration_expiry_date?: string
  legal_status?: string
  license_url?: string | null
  
  // Leadership
  executive_director?: string
  executive_director_email?: string
  board_chair?: string
  finance_director?: string
  finance_director_email?: string
  authorized_signatory_1?: string
  authorized_signatory_1_title?: string
  authorized_signatory_2?: string
  authorized_signatory_2_title?: string
  authorized_signatory_3?: string
  authorized_signatory_3_title?: string
  board_members?: { name: string; role?: string; email?: string; phone?: string }[]
  key_staff?: { name: string; role?: string; email?: string; phone?: string }[]

  // Address
  address?: string
  city?: string
  state_province?: string
  postal_code?: string
  country?: string
  
  // Contact
  phone?: string
  secondary_phone?: string
  fax?: string
  email?: string
  secondary_email?: string
  website?: string
  
  // Social Media
  facebook_url?: string
  twitter_url?: string
  linkedin_url?: string
  instagram_url?: string
  youtube_url?: string
  
  // Operational
  sectors_of_operation?: string[]
  geographic_areas?: string[]
  staff_count?: number
  volunteer_count?: number
  beneficiaries_count?: number
  active_projects_count?: number
  
  // Banking
  primary_bank_name?: string
  primary_bank_branch?: string
  primary_bank_account?: string
  primary_bank_swift?: string
  primary_bank_iban?: string
  secondary_bank_name?: string
  secondary_bank_branch?: string
  secondary_bank_account?: string
  enable_online_banking?: boolean
  payment_methods?: string[]
  
  // Reporting & Audit
  external_auditor?: string
  last_audit_date?: string
  audit_opinion?: string
  statutory_reports?: string[]
  
  // System Settings
  logo_url?: string | null
  timezone?: string
  date_format?: string
  number_format?: string
  language?: string
  enable_notifications?: boolean
  enable_email_alerts?: boolean
  session_timeout?: number
  require_password_change?: number
  enable_two_factor?: boolean
  data_retention_years?: number
  
  // Meta
  is_active: boolean
  years_in_operation?: number
  created_at?: string
  updated_at?: string
}

export interface OrganizationBranding {
  name: string
  short_name: string
  logo_url: string | null
  tagline?: string
}

export interface UpdateOrganizationData {
  [key: string]: any
}

/**
 * Get organization settings (authenticated)
 */
export async function getOrganization(): Promise<{ data: OrganizationSettings }> {
  const response = await apiClient.get('/organization')
  return response.data
}

/**
 * Update organization settings
 */
export async function updateOrganization(data: UpdateOrganizationData): Promise<{ data: OrganizationSettings; message: string }> {
  const response = await apiClient.put('/organization', data)
  return response.data
}

/**
 * Upload organization logo
 */
export async function uploadOrganizationLogo(file: File): Promise<{ data: { logo_url: string }; message: string }> {
  const formData = new FormData()
  formData.append('logo', file)
  
  const response = await apiClient.post('/organization/logo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

/**
 * Remove organization logo
 */
export async function removeOrganizationLogo(): Promise<{ message: string }> {
  const response = await apiClient.delete('/organization/logo')
  return response.data
}

/**
 * Upload organization license document
 */
export async function uploadOrganizationLicense(file: File): Promise<{ data: { license_url: string }; message: string }> {
  const formData = new FormData()
  formData.append('license', file)
  // Do not set Content-Type so axios sends multipart/form-data with boundary
  const response = await apiClient.post('/organization/license', formData)
  return response.data
}

/**
 * Remove organization license
 */
export async function removeOrganizationLicense(): Promise<{ message: string }> {
  const response = await apiClient.delete('/organization/license')
  return response.data
}

/**
 * Get organization branding (public - for login page)
 */
export async function getOrganizationBranding(): Promise<{ data: OrganizationBranding }> {
  const response = await apiClient.get('/organization/branding')
  return response.data
}

/**
 * Get organization statistics
 */
export async function getOrganizationStatistics(): Promise<{ data: {
  staff_count: number
  volunteer_count: number
  beneficiaries_count: number
  active_projects_count: number
  offices_count: number
  donors_count: number
  years_in_operation: number | null
  registration_expiring_soon: boolean
  registration_expired: boolean
}}> {
  const response = await apiClient.get('/organization/statistics')
  return response.data
}
