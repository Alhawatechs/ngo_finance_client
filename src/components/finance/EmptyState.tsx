'use client'

import React from 'react'
import { LucideIcon } from 'lucide-react'

export interface FinanceEmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

/**
 * Unitary empty state for list pages: icon, title, description, optional action.
 */
export function FinanceEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: FinanceEmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-6 text-center border border-dashed rounded-lg bg-muted/30 ${className}`}
    >
      {Icon && (
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
