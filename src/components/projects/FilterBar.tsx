'use client'

import React from 'react'
import { Search, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface FilterBarProps {
  searchPlaceholder?: string
  searchValue: string
  onSearchChange: (v: string) => void
  onRefresh?: () => void
  isRefreshing?: boolean
  children?: React.ReactNode
  className?: string
}

export function ProjectsFilterBar({
  searchPlaceholder = 'Search...',
  searchValue,
  onSearchChange,
  onRefresh,
  isRefreshing,
  children,
  className = '',
}: FilterBarProps) {
  return (
    <div className={`flex flex-col sm:flex-row gap-4 items-stretch sm:items-center ${className}`}>
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      {children}
      {onRefresh && (
        <Button
          variant="outline"
          size="icon"
          title="Refresh"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      )}
    </div>
  )
}
