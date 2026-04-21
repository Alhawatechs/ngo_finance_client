'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface FinanceModuleCardProps {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  children: React.ReactNode
  headerClassName?: string
  contentClassName?: string
  className?: string
}

export function FinanceModuleCard({
  title,
  subtitle,
  icon,
  children,
  headerClassName,
  contentClassName,
  className,
}: FinanceModuleCardProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className={cn('pb-4', headerClassName)}>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          {title}
        </CardTitle>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </CardHeader>
      <CardContent className={cn('pt-0', contentClassName)}>{children}</CardContent>
    </Card>
  )
}
