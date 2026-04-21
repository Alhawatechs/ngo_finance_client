'use client'

import React from 'react'
import { cn } from '@/lib/utils'

/**
 * Standard layout for dashboard pages: one-way structure (title, description, actions, content).
 * Use this so every page follows the same design. See docs/DESIGN.md.
 */
export interface PageLayoutProps {
  /** Page title (H1). */
  title: string
  /** Semantic heading level when the module layout already provides an H1 (e.g. chart of accounts). */
  titleAs?: 'h1' | 'h2' | 'h3'
  /** Optional class for the title (e.g. serif for classic ledger pages). */
  titleClassName?: string
  /** Optional class for the description line. */
  descriptionClassName?: string
  /** Optional short description below the title. */
  description?: string
  /** Actions (buttons, etc.) on the right side of the header. */
  actions?: React.ReactNode
  /** Main content (cards, tables). */
  children: React.ReactNode
  /** Extra class for the outer wrapper. */
  className?: string
  /** If true, header and content use compact spacing (e.g. list-style pages). */
  compact?: boolean
}

export function PageLayout({
  title,
  titleAs = 'h1',
  titleClassName,
  descriptionClassName,
  description,
  actions,
  children,
  className,
  compact = false,
}: PageLayoutProps) {
  const TitleTag = titleAs
  return (
    <div className={cn('space-y-4', compact && 'space-y-4', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <TitleTag
            className={cn(
              'font-sans text-xl font-semibold tracking-tight text-foreground truncate',
              titleClassName
            )}
          >
            {title}
          </TitleTag>
          {description && (
            <p className={cn(
              'text-muted-foreground truncate',
              compact ? 'text-xs mt-0.5' : 'text-sm mt-0.5',
              descriptionClassName
            )}>
              {description}
            </p>
          )}
        </div>
        {actions != null && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}
