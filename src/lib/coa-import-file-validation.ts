/** Client-side checks before sending chart-of-accounts import to the API. */

import { getClientValidationActions } from '@/lib/coa-import-guidance'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB, matches Laravel max:10240 (KB)

const ALLOWED_EXTENSIONS = new Set(['csv', 'txt', 'xlsx', 'xls', 'xlsm'])

/** Excel / OpenDocument / ZIP-based workbooks start with PK */
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]

export type CoaImportFileValidation =
  | { ok: true }
  | {
      ok: false
      title: string
      detail: string
      code: 'size' | 'extension' | 'empty' | 'excel_magic'
      /** Steps to fix the file to meet system requirements */
      actions: string[]
    }

function readFileHead(file: File, bytes: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => {
      if (r.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(r.result))
      } else {
        reject(new Error('read failed'))
      }
    }
    r.onerror = () => reject(r.error)
    r.readAsArrayBuffer(file.slice(0, bytes))
  })
}

/**
 * Validates extension, size, non-empty file, and basic Excel magic bytes for .xlsx/.xlsm.
 */
export async function validateCoaImportFile(file: File): Promise<CoaImportFileValidation> {
  if (!file || file.size === 0) {
    return {
      ok: false,
      title: 'Empty file',
      detail: 'Choose a non-empty CSV or Excel file.',
      code: 'empty',
      actions: getClientValidationActions('empty'),
    }
  }

  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      title: 'File too large',
      detail: `Maximum size is 10 MB. This file is ${(file.size / (1024 * 1024)).toFixed(2)} MB.`,
      code: 'size',
      actions: getClientValidationActions('size'),
    }
  }

  const name = file.name || ''
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : ''

  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      title: 'Unsupported file type',
      detail:
        'Only CSV (.csv, .txt) or Excel (.xlsx, .xls, .xlsm) are accepted. PDF, Word, images, and other formats cannot be imported.',
      code: 'extension',
      actions: getClientValidationActions('extension'),
    }
  }

  if (ext === 'xlsx' || ext === 'xlsm') {
    try {
      const head = await readFileHead(file, 4)
      const ok =
        head.length >= 4 &&
        head[0] === ZIP_MAGIC[0] &&
        head[1] === ZIP_MAGIC[1] &&
        head[2] === ZIP_MAGIC[2] &&
        head[3] === ZIP_MAGIC[3]
      if (!ok) {
        return {
          ok: false,
          title: 'Not a valid Excel file',
          detail:
            'This file does not look like a real .xlsx workbook (wrong file contents). Rename a PDF or CSV to .xlsx will not work — use Excel or download our import sample.',
          code: 'excel_magic',
          actions: getClientValidationActions('excel_magic'),
        }
      }
    } catch {
      /* if read fails, let server validate */
    }
  }

  return { ok: true }
}

export const COA_IMPORT_ALLOWED_EXTENSIONS_LABEL = '.csv, .txt, .xlsx, .xls, .xlsm'
