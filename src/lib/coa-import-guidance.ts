/**
 * Chart of accounts import — what the system expects, shown when uploads fail
 * so users can align files with requirements.
 */

/** Short reference for help panels */
export const COA_IMPORT_FORMAT_RULES = [
  'File type: CSV (.csv, .txt) or Excel (.xlsx, .xls, .xlsm), max 10 MB.',
  'One header row must include the words “Account Code” and “Account Name”, plus Type and Normal Balance (exact column titles as in the sample). Optional columns: Currency, Opening Balance, Description.',
  'Type must be: asset, liability, equity, revenue, or expense.',
  'Normal balance must be: debit or credit.',
  'Account codes follow the dotted hierarchy (e.g. 1, 11, 11.1); posting level uses your org’s rules (see Import guidelines in the sample workbook).',
] as const

export function getClientValidationActions(
  code: 'size' | 'extension' | 'empty' | 'excel_magic'
): string[] {
  switch (code) {
    case 'empty':
      return [
        'Export or save your table again so the file is not zero bytes.',
        'If you use Excel, use Save As → CSV or keep the .xlsx and upload that.',
      ]
    case 'size':
      return [
        'Remove unused columns or split the file into multiple imports (max 2,000 data rows per file).',
        'Or save a smaller CSV without extra formatting or embedded objects.',
      ]
    case 'extension':
      return [
        'Export from Excel as .xlsx or Save As comma-separated values (.csv).',
        'Do not upload PDF, Word, or images — only spreadsheet files listed in the allowed types.',
      ]
    case 'excel_magic':
      return [
        'Open the file in Excel or LibreOffice and use Save As → Excel Workbook (.xlsx).',
        'Or download our “import sample” Excel file and paste your table into the “Sample format” sheet.',
        'Do not rename a .pdf or other file to .xlsx; the contents must be a real workbook.',
      ]
    default:
      return []
  }
}

/** Optional row-level tips keyed by common server messages (partial match). */
export function tipForRowErrorMessage(message: string): string | null {
  const m = message.toLowerCase()
  if (m.includes('type must be')) {
    return 'Use exactly one of: asset, liability, equity, revenue, expense (lowercase is fine).'
  }
  if (m.includes('normal balance must be')) {
    return 'Use debit or credit only.'
  }
  if (m.includes('currency')) {
    return 'Currency must be an active currency for your organization (often 3-letter code like USD).'
  }
  if (m.includes('parent account')) {
    return 'List parent accounts above children in the file, or create the parent in the chart first.'
  }
  if (m.includes('duplicate account code')) {
    return 'Remove duplicate rows for the same Account Code; only the first occurrence is kept.'
  }
  if (m.includes('well-formed') || m.includes('dotted')) {
    return 'Codes must match your chart’s numbering rules (see Import guidelines).'
  }
  if (m.includes('extend the parent')) {
    return 'Child codes must start with the parent code (e.g. under 11 use 11.1, not 12.1).'
  }
  if (m.includes('top-level')) {
    return 'First segment of the code must be a single digit 1–5 for top-level accounts.'
  }
  if (m.includes('maximum account level')) {
    return 'This chart supports up to four hierarchy levels; adjust parent/child codes.'
  }
  return null
}
