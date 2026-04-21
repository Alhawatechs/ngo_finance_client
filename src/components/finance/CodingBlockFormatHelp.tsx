'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Hash } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { CodingBlockFormatSpec } from '@/lib/api/vouchers'

interface CodingBlockFormatHelpProps {
  /** Format spec from getCodingBlockOptions().data.format */
  format?: CodingBlockFormatSpec | null
  /** Compact inline style (e.g. for toolbar) */
  compact?: boolean
  className?: string
}

/**
 * Displays the Coding Block voucher number format specification.
 * Use when project is selected (Coding Block voucher number) so users understand the format.
 */
export function CodingBlockFormatHelp({ format, compact, className }: CodingBlockFormatHelpProps) {
  const [open, setOpen] = useState(false)

  if (!format) return null

  if (compact) {
    return (
      <div className={cn('text-xs text-muted-foreground', className)}>
        <span className="font-medium text-foreground">Voucher # format:</span>{' '}
        <span className="font-mono">{format.example}</span>
        <span className="ml-1">({format.pattern})</span>
      </div>
    )
  }

  return (
    <Card className={cn('border-dashed', className)}>
      <CardHeader
        className="cursor-pointer py-3 px-4 flex flex-row items-center gap-2"
        onClick={() => setOpen(!open)}
      >
        <Hash className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Coding Block voucher number format</span>
        {open ? <ChevronDown className="h-4 w-4 ml-auto" /> : <ChevronRight className="h-4 w-4 ml-auto" />}
      </CardHeader>
      {open && (
        <CardContent className="pt-0 px-4 pb-4 space-y-3">
          <p className="text-sm text-muted-foreground">{format.description}</p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Pattern:</span>
            <span className="text-xs font-mono bg-muted px-2 py-1 rounded">{format.pattern}</span>
            <span className="text-xs text-muted-foreground">Example:</span>
            <span className="text-sm font-mono font-medium">{format.example}</span>
          </div>
          {format.components && format.components.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {format.components.map((c, i) => (
                <div key={i} className="flex gap-2 p-2 rounded bg-muted/50">
                  <span className="font-medium shrink-0">{c.name}</span>
                  <span className="text-muted-foreground">{c.description}</span>
                  <span className="font-mono shrink-0">{c.example}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
