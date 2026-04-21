/**
 * Shared constants for Project Management modules.
 * Used across Donors, Contracts, Budget, and Donor Funds.
 */

/** Legacy list; sector options for dropdowns come from Organization setup (sectors_of_operation). See useOrganizationSectors / DEFAULT_SECTOR_OPTIONS. */
export const PROJECT_SECTORS = [
  'Health',
  'Education',
  'WASH',
  'Protection',
  'Livelihoods',
  'Shelter',
  'Food Security',
  'Multi-Sector',
  'Emergency Response',
  'Governance',
] as const

/** Document types for contract attachments */
export const CONTRACT_DOCUMENT_TYPES = [
  'contract',
  'amendment',
  'budget',
  'report',
  'other',
] as const

/** Grant types */
export const GRANT_TYPES = [
  { value: 'restricted', label: 'Restricted' },
  { value: 'unrestricted', label: 'Unrestricted' },
  { value: 'temporarily_restricted', label: 'Temporarily Restricted' },
] as const

/** Default page size for list views */
export const DEFAULT_PAGE_SIZE = 15

/** Projects sub-module breadcrumb base */
export const PROJECTS_BREADCRUMB = { label: 'Project Management', href: '/projects' }

/** Document upload: PDF, Word, Excel, ZIP (or zipped folder). Max size 50MB. */
export const DOC_UPLOAD_MAX_MB = 50
export const DOC_UPLOAD_ACCEPT =
  '.pdf,.doc,.docx,.xlsx,.xls,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/zip,application/x-zip-compressed'

const DOC_UPLOAD_EXTENSIONS = ['pdf', 'doc', 'docx', 'xlsx', 'xls', 'zip'] as const

/** Validate file for document upload (PDF, Word, Excel, ZIP). Returns error message or null. */
export function validateDocumentUploadFile(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext || !DOC_UPLOAD_EXTENSIONS.includes(ext as (typeof DOC_UPLOAD_EXTENSIONS)[number])) {
    return 'Please upload a PDF, Word, Excel, or ZIP file (.pdf, .doc, .docx, .xlsx, .xls, .zip).'
  }
  if (file.size > DOC_UPLOAD_MAX_MB * 1024 * 1024) {
    return `File must be under ${DOC_UPLOAD_MAX_MB} MB.`
  }
  return null
}
