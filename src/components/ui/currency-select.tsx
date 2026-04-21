'use client'

import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCurrencies } from '@/hooks/useCurrencies'
import { cn } from '@/lib/utils'

export interface CurrencySelectProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  triggerClassName?: string
  /** When true, allow clearing selection (shows a "none" option). When false, a currency must be selected. */
  allowNone?: boolean
}

/**
 * Single source for currency selection across the app. Uses org active currencies or COMMON_CURRENCIES fallback.
 */
export function CurrencySelect({
  value,
  onChange,
  placeholder = 'Select currency',
  disabled = false,
  className,
  triggerClassName,
  allowNone = true,
}: CurrencySelectProps) {
  const { options, isLoading } = useCurrencies()

  const selectValue =
    value && options.some((o) => o.code === value)
      ? value
      : allowNone
        ? '__none__'
        : (value || options[0]?.code || '__none__')

  return (
    <Select
      value={selectValue}
      onValueChange={(v) => onChange(v === '__none__' ? '' : v)}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className={cn(triggerClassName, className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value="__none__">{placeholder}</SelectItem>}
        {options.map((opt) => (
          <SelectItem key={opt.code} value={opt.code}>
            {opt.code} — {opt.name} ({opt.symbol})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
