/**
 * Organization profile export: PDF and Excel with organization name and logo.
 */
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

export interface OrganizationExportData {
  name: string
  short_name: string
  tagline?: string
  registration_number?: string
  mission_statement?: string
  vision_statement?: string
  establishment_date?: string
  organization_type?: string
  sectors_of_operation?: string[]
  geographic_areas?: string[]
  staff_count?: number | string
  volunteer_count?: number | string
  beneficiaries_count?: number | string
  active_projects_count?: number | string
  // Legal
  tax_id?: string
  tax_exemption_number?: string
  tax_exemption_date?: string
  ngo_registration_body?: string
  registration_date?: string
  registration_expiry_date?: string
  legal_status?: string
  // Leadership
  board_members?: { name: string; role?: string; email?: string; phone?: string }[]
  key_staff?: { name: string; role?: string; email?: string; phone?: string }[]
  authorized_signatory_1?: string
  authorized_signatory_1_title?: string
  authorized_signatory_2?: string
  authorized_signatory_2_title?: string
  authorized_signatory_3?: string
  authorized_signatory_3_title?: string
  // Financial
  default_currency?: string
  secondary_currencies?: string[]
  fiscal_year_start_month?: number
  fiscal_year_end_month?: number
  accounting_method?: string
  budget_control_level?: string
  default_tax_rate?: number
  // Banking
  primary_bank_name?: string
  primary_bank_branch?: string
  primary_bank_account?: string
  primary_bank_swift?: string
  primary_bank_iban?: string
  secondary_bank_name?: string
  secondary_bank_branch?: string
  secondary_bank_account?: string
  payment_methods?: string[]
  enable_online_banking?: boolean
  // Contact
  address?: string
  city?: string
  state_province?: string
  postal_code?: string
  country?: string
  phone?: string
  secondary_phone?: string
  fax?: string
  email?: string
  secondary_email?: string
  website?: string
  facebook_url?: string
  twitter_url?: string
  linkedin_url?: string
  instagram_url?: string
  youtube_url?: string
  // Audit
  external_auditor?: string
  last_audit_date?: string
  audit_opinion?: string
  // System
  timezone?: string
  date_format?: string
  number_format?: string
  language?: string
}

function formatValue(v: unknown, empty = '—'): string {
  if (v == null || v === '') return empty
  if (Array.isArray(v)) return v.length ? v.join(', ') : empty
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function addSection(
  doc: jsPDF,
  y: number,
  title: string,
  rows: [string, string][],
  margin: number,
  pageWidth: number
): number {
  const titleFontSize = 11
  const bodyFontSize = 9
  doc.setFontSize(titleFontSize)
  doc.setFont('helvetica', 'bold')
  doc.text(title, margin, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(bodyFontSize)
  if (rows.length) {
    autoTable(doc, {
      startY: y,
      head: [['Field', 'Value']],
      body: rows.map(([k, v]) => [k, v]),
      theme: 'plain',
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 55, fontStyle: 'normal' },
        1: { cellWidth: pageWidth - 2 * margin - 55 },
      },
      styles: { fontSize: bodyFontSize },
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }
  return y
}

/** Export organization profile to PDF with logo and name. */
export function exportOrganizationToPdf(
  data: OrganizationExportData,
  options: { logoDataUrl?: string | null; filename?: string } = {}
): void {
  const { logoDataUrl, filename = 'Organization_Profile.pdf' } = options
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14
  let y = 15

  // Logo (centered or left)
  if (logoDataUrl) {
    try {
      const imgW = 28
      const imgH = 28
      const format =
        logoDataUrl.startsWith('data:image/jpeg') || logoDataUrl.startsWith('data:image/jpg') ? 'JPEG' : 'PNG'
      doc.addImage(logoDataUrl, format, margin, y, imgW, imgH)
      y += imgH + 4
    } catch (_) {}
  }

  // Organization name and tagline
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(data.name || 'Organization', margin, y)
  y += 8
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  if (data.short_name) {
    doc.text(data.short_name, margin, y)
    y += 6
  }
  if (data.tagline) {
    doc.setTextColor(100, 100, 100)
    doc.text(data.tagline, margin, y)
    doc.setTextColor(0, 0, 0)
    y += 8
  } else {
    y += 4
  }

  const line = (label: string, value: unknown) => [label, formatValue(value)] as [string, string]

  // Organization Profile
  y = addSection(
    doc,
    y,
    'Organization Profile',
    [
      line('Registration number', data.registration_number),
      line('Organization type', data.organization_type),
      line('Establishment date', data.establishment_date),
      line('Mission', data.mission_statement),
      line('Vision', data.vision_statement),
      line('Sectors of operation', data.sectors_of_operation),
      line('Geographic areas', data.geographic_areas),
      line('Staff count', data.staff_count),
      line('Volunteer count', data.volunteer_count),
      line('Beneficiaries count', data.beneficiaries_count),
      line('Active projects', data.active_projects_count),
    ].filter(([, v]) => v !== '—'),
    margin,
    pageWidth
  )

  // Legal & Compliance
  y = addSection(
    doc,
    y,
    'Legal & Compliance',
    [
      line('Tax ID', data.tax_id),
      line('Tax exemption number', data.tax_exemption_number),
      line('Tax exemption date', data.tax_exemption_date),
      line('NGO registration body', data.ngo_registration_body),
      line('Registration date', data.registration_date),
      line('Registration expiry', data.registration_expiry_date),
      line('Legal status', data.legal_status),
    ].filter(([, v]) => v !== '—'),
    margin,
    pageWidth
  )

  // Leadership
  const leadershipRows: [string, string][] = []
  if (data.board_members?.length) {
    data.board_members.forEach((m, i) => {
      leadershipRows.push(
        line(`Board member ${i + 1}`, `${m.name}${m.role ? ` — ${m.role}` : ''}${m.email ? ` (${m.email})` : ''}`)
      )
    })
  }
  if (data.key_staff?.length) {
    data.key_staff.forEach((m, i) => {
      leadershipRows.push(
        line(`Key staff ${i + 1}`, `${m.name}${m.role ? ` — ${m.role}` : ''}${m.email ? ` (${m.email})` : ''}`)
      )
    })
  }
  ;[
    data.authorized_signatory_1 && line('Authorized signatory 1', `${data.authorized_signatory_1}${data.authorized_signatory_1_title ? `, ${data.authorized_signatory_1_title}` : ''}`),
    data.authorized_signatory_2 && line('Authorized signatory 2', `${data.authorized_signatory_2}${data.authorized_signatory_2_title ? `, ${data.authorized_signatory_2_title}` : ''}`),
    data.authorized_signatory_3 && line('Authorized signatory 3', `${data.authorized_signatory_3}${data.authorized_signatory_3_title ? `, ${data.authorized_signatory_3_title}` : ''}`),
  ].forEach((r) => r && leadershipRows.push(r))
  if (leadershipRows.length) {
    y = addSection(doc, y, 'Leadership & Governance', leadershipRows, margin, pageWidth)
  }

  // Financial
  y = addSection(
    doc,
    y,
    'Financial Settings',
    [
      line('Base currency', data.default_currency),
      line('Fiscal year start month', data.fiscal_year_start_month),
      line('Fiscal year end month', data.fiscal_year_end_month),
      line('Accounting method', data.accounting_method),
      line('Budget control level', data.budget_control_level),
      line('Default tax rate (%)', data.default_tax_rate),
    ].filter(([, v]) => v !== '—'),
    margin,
    pageWidth
  )

  // Banking
  y = addSection(
    doc,
    y,
    'Banking & Payments',
    [
      line('Primary bank', data.primary_bank_name),
      line('Branch', data.primary_bank_branch),
      line('Account', data.primary_bank_account),
      line('SWIFT', data.primary_bank_swift),
      line('IBAN', data.primary_bank_iban),
      line('Secondary bank', data.secondary_bank_name),
      line('Secondary branch', data.secondary_bank_branch),
      line('Secondary account', data.secondary_bank_account),
      line('Payment methods', data.payment_methods),
      line('Online banking', data.enable_online_banking != null ? (data.enable_online_banking ? 'Yes' : 'No') : undefined),
    ].filter(([, v]) => v !== '—'),
    margin,
    pageWidth
  )

  // Contact & Address
  y = addSection(
    doc,
    y,
    'Contact & Address',
    [
      line('Address', data.address),
      line('City', data.city),
      line('State / Province', data.state_province),
      line('Postal code', data.postal_code),
      line('Country', data.country),
      line('Phone', data.phone),
      line('Secondary phone', data.secondary_phone),
      line('Fax', data.fax),
      line('Email', data.email),
      line('Secondary email', data.secondary_email),
      line('Website', data.website),
      line('Facebook', data.facebook_url),
      line('Twitter', data.twitter_url),
      line('LinkedIn', data.linkedin_url),
      line('Instagram', data.instagram_url),
      line('YouTube', data.youtube_url),
    ].filter(([, v]) => v !== '—'),
    margin,
    pageWidth
  )

  // Audit & System (only if we have space; otherwise new page)
  if (y > pageHeight - 50) {
    doc.addPage()
    y = 15
  }
  y = addSection(
    doc,
    y,
    'Reporting & System',
    [
      line('External auditor', data.external_auditor),
      line('Last audit date', data.last_audit_date),
      line('Audit opinion', data.audit_opinion),
      line('Timezone', data.timezone),
      line('Date format', data.date_format),
      line('Number format', data.number_format),
      line('Language', data.language),
    ].filter(([, v]) => v !== '—'),
    margin,
    pageWidth
  )

  doc.save(filename)
}

/** Export organization profile to Excel with organization name (logo not embedded; professional layout). */
export function exportOrganizationToExcel(
  data: OrganizationExportData,
  options: { filename?: string } = {}
): void {
  const { filename = 'Organization_Profile.xlsx' } = options
  const wb = XLSX.utils.book_new()
  const toStr = (v: unknown) => formatValue(v, '')

  const rows: (string | number)[][] = [
    [data.name || 'Organization'],
    data.short_name ? [data.short_name] : [],
    data.tagline ? [data.tagline] : [],
    [],
    ['Organization Profile', ''],
    ['Registration number', toStr(data.registration_number)],
    ['Organization type', toStr(data.organization_type)],
    ['Establishment date', toStr(data.establishment_date)],
    ['Mission', toStr(data.mission_statement)],
    ['Vision', toStr(data.vision_statement)],
    ['Sectors of operation', toStr(data.sectors_of_operation)],
    ['Geographic areas', toStr(data.geographic_areas)],
    ['Staff count', toStr(data.staff_count)],
    ['Volunteer count', toStr(data.volunteer_count)],
    ['Beneficiaries count', toStr(data.beneficiaries_count)],
    ['Active projects', toStr(data.active_projects_count)],
    [],
    ['Legal & Compliance', ''],
    ['Tax ID', toStr(data.tax_id)],
    ['Tax exemption number', toStr(data.tax_exemption_number)],
    ['Tax exemption date', toStr(data.tax_exemption_date)],
    ['NGO registration body', toStr(data.ngo_registration_body)],
    ['Registration date', toStr(data.registration_date)],
    ['Registration expiry', toStr(data.registration_expiry_date)],
    ['Legal status', toStr(data.legal_status)],
    [],
    ['Leadership & Governance', ''],
  ]

  if (data.board_members?.length) {
    data.board_members.forEach((m, i) => {
      rows.push([`Board member ${i + 1}`, `${m.name}${m.role ? ` — ${m.role}` : ''}${m.email ? ` (${m.email})` : ''}`])
    })
  }
  if (data.key_staff?.length) {
    data.key_staff.forEach((m, i) => {
      rows.push([`Key staff ${i + 1}`, `${m.name}${m.role ? ` — ${m.role}` : ''}${m.email ? ` (${m.email})` : ''}`])
    })
  }
  if (data.authorized_signatory_1) {
    rows.push(['Authorized signatory 1', `${data.authorized_signatory_1}${data.authorized_signatory_1_title ? `, ${data.authorized_signatory_1_title}` : ''}`])
  }
  if (data.authorized_signatory_2) {
    rows.push(['Authorized signatory 2', `${data.authorized_signatory_2}${data.authorized_signatory_2_title ? `, ${data.authorized_signatory_2_title}` : ''}`])
  }
  if (data.authorized_signatory_3) {
    rows.push(['Authorized signatory 3', `${data.authorized_signatory_3}${data.authorized_signatory_3_title ? `, ${data.authorized_signatory_3_title}` : ''}`])
  }

  rows.push(
    [],
    ['Financial Settings', ''],
    ['Base currency', toStr(data.default_currency)],
    ['Fiscal year start month', toStr(data.fiscal_year_start_month)],
    ['Fiscal year end month', toStr(data.fiscal_year_end_month)],
    ['Accounting method', toStr(data.accounting_method)],
    ['Budget control level', toStr(data.budget_control_level)],
    ['Default tax rate (%)', toStr(data.default_tax_rate)],
    [],
    ['Banking & Payments', ''],
    ['Primary bank', toStr(data.primary_bank_name)],
    ['Branch', toStr(data.primary_bank_branch)],
    ['Account', toStr(data.primary_bank_account)],
    ['SWIFT', toStr(data.primary_bank_swift)],
    ['IBAN', toStr(data.primary_bank_iban)],
    ['Secondary bank', toStr(data.secondary_bank_name)],
    ['Secondary branch', toStr(data.secondary_bank_branch)],
    ['Secondary account', toStr(data.secondary_bank_account)],
    ['Payment methods', toStr(data.payment_methods)],
    ['Online banking', data.enable_online_banking != null ? (data.enable_online_banking ? 'Yes' : 'No') : ''],
    [],
    ['Contact & Address', ''],
    ['Address', toStr(data.address)],
    ['City', toStr(data.city)],
    ['State / Province', toStr(data.state_province)],
    ['Postal code', toStr(data.postal_code)],
    ['Country', toStr(data.country)],
    ['Phone', toStr(data.phone)],
    ['Secondary phone', toStr(data.secondary_phone)],
    ['Fax', toStr(data.fax)],
    ['Email', toStr(data.email)],
    ['Secondary email', toStr(data.secondary_email)],
    ['Website', toStr(data.website)],
    ['Facebook', toStr(data.facebook_url)],
    ['Twitter', toStr(data.twitter_url)],
    ['LinkedIn', toStr(data.linkedin_url)],
    ['Instagram', toStr(data.instagram_url)],
    ['YouTube', toStr(data.youtube_url)],
    [],
    ['Reporting & System', ''],
    ['External auditor', toStr(data.external_auditor)],
    ['Last audit date', toStr(data.last_audit_date)],
    ['Audit opinion', toStr(data.audit_opinion)],
    ['Timezone', toStr(data.timezone)],
    ['Date format', toStr(data.date_format)],
    ['Number format', toStr(data.number_format)],
    ['Language', toStr(data.language)]
  )

  const ws = XLSX.utils.aoa_to_sheet(rows.map((r) => (r.length === 0 ? ['', ''] : r.length === 1 ? [r[0], ''] : r)))
  const colW = [{ wch: 28 }, { wch: 60 }]
  ws['!cols'] = colW
  XLSX.utils.book_append_sheet(wb, ws, 'Organization Profile')
  XLSX.writeFile(wb, filename)
}
