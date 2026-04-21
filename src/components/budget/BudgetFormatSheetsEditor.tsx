'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { createDefaultSheet, type FormatSheet } from '@/components/budget/ColumnDefinitionEditor'

const UniverSpreadsheetEmbed = dynamic(
  () => import('@/components/budget/UniverSpreadsheetEmbed').then((m) => m.UniverSpreadsheetEmbed),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center min-h-[320px] gap-3 text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/30 rounded-b-xl">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 dark:border-slate-600 border-t-[#023e8a] dark:border-t-sky-500" aria-hidden />
        <p className="text-sm font-medium">Loading spreadsheet editor…</p>
        <p className="text-xs">Formula bar and toolbar will appear shortly.</p>
      </div>
    ),
  }
)

interface BudgetFormatSheetsEditorProps {
  value: FormatSheet[]
  onChange: (value: FormatSheet[]) => void
  templateCode?: string
  templateName?: string
  disabled?: boolean
}

export function BudgetFormatSheetsEditor({
  value,
  onChange,
  disabled,
}: BudgetFormatSheetsEditorProps) {
  const sheets = value.length > 0 ? value : [createDefaultSheet('0', 'Main')]

  return (
    <div className="flex flex-col min-h-0 flex-1 h-full">
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <div className="univer-editor-frame flex-1 flex flex-col overflow-visible bg-white dark:bg-slate-900 rounded-b-lg border border-slate-200 dark:border-slate-700 shadow-sm">
          <UniverSpreadsheetEmbed
            key={`workbook-${sheets.length}-${sheets.map((s) => s.key).join('-')}`}
            sheets={sheets}
            onChange={onChange}
            disabled={disabled}
            className="flex-1 w-full min-h-0"
          />
        </div>
      </div>
    </div>
  )
}
