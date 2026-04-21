'use client'

import React from 'react'
import { FileText, FileSpreadsheet, Archive, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const EXT_ICON: Record<string, { Icon: LucideIcon; className: string }> = {
  pdf: { Icon: FileText, className: 'text-red-600' },
  doc: { Icon: FileText, className: 'text-emerald-700' },
  docx: { Icon: FileText, className: 'text-emerald-700' },
  xlsx: { Icon: FileSpreadsheet, className: 'text-emerald-600' },
  xls: { Icon: FileSpreadsheet, className: 'text-emerald-600' },
  zip: { Icon: Archive, className: 'text-amber-600' },
}

function getIconForFileName(fileName: string): { Icon: LucideIcon; className: string } {
  const ext = (fileName || '').split('.').pop()?.toLowerCase()
  return EXT_ICON[ext ?? ''] ?? { Icon: FileText, className: 'text-slate-500' }
}

export interface DocumentFileIconProps {
  /** File name (e.g. "report.pdf" or "Budget.xlsx") to pick icon and color */
  fileName: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClass = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-5 w-5' } as const

/** Renders a file-type-specific icon (PDF=red doc, Word=blue doc, Excel=green sheet, ZIP=amber archive). */
export function DocumentFileIcon({ fileName, className, size = 'md' }: DocumentFileIconProps) {
  const { Icon, className: colorClass } = getIconForFileName(fileName)
  return (
    <Icon
      className={cn('shrink-0', sizeClass[size], colorClass, className)}
      aria-hidden
    />
  )
}

/** Returns { Icon, className } for use inline (e.g. when you need the icon element with custom wrapper). */
export function getDocumentFileIcon(fileName: string): { Icon: LucideIcon; className: string } {
  return getIconForFileName(fileName)
}
