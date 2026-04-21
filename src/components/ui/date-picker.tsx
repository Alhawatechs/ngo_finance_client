'use client'

import React, { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { cn, DATE_DISPLAY_FORMAT_READABLE, parseFlexibleDate } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DatePickerCalendar } from '@/components/ui/date-picker-calendar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export interface DatePickerProps {
  value: string // YYYY-MM-DD
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  inputClassName?: string
  /** Extra classes for the calendar popover (e.g. disable animation to avoid layout jitter). */
  popoverContentClassName?: string
  minDate?: string
  maxDate?: string
  id?: string
}

/**
 * Professional date picker: editable input accepts typed dates (e.g. 11-Jan-2023, Jan 11 2023)
 * and displays in base format (Jan 11, 2023). Calendar popover available via click.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = 'Type date (e.g. 11-Jan-2023) or pick',
  disabled = false,
  className,
  inputClassName,
  popoverContentClassName,
  minDate,
  maxDate,
  id,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [inputText, setInputText] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr || typeof dateStr !== 'string') return null
    const s = dateStr.split('T')[0].trim()
    if (!s) return null
    const d = new Date(s + 'T12:00:00')
    return Number.isNaN(d.getTime()) ? null : d
  }

  const displayValue = (() => {
    const d = parseDate(value)
    return d ? format(d, DATE_DISPLAY_FORMAT_READABLE) : ''
  })()

  useEffect(() => {
    if (!isFocused) setInputText(displayValue)
  }, [displayValue, isFocused])

  const handleSelect = (date: string) => {
    onChange(date)
    const d = parseDate(date)
    setInputText(d ? format(d, DATE_DISPLAY_FORMAT_READABLE) : '')
    setOpen(false)
  }

  const commitTypedDate = () => {
    const trimmed = inputText.trim()
    if (!trimmed) {
      setInputText(displayValue)
      return
    }
    const parsed = parseFlexibleDate(trimmed)
    if (parsed) {
      onChange(parsed)
      const d = parseDate(parsed)
      setInputText(d ? format(d, DATE_DISPLAY_FORMAT_READABLE) : '')
    } else {
      setInputText(displayValue)
    }
  }

  const handleBlur = () => {
    setIsFocused(false)
    commitTypedDate()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitTypedDate()
      inputRef.current?.blur()
    }
  }

  return (
    <div
      className={cn(
        'flex items-stretch box-border min-h-0 h-10 rounded-md border border-input bg-background overflow-hidden',
        className
      )}
    >
      <Input
        ref={inputRef}
        id={id}
        value={isFocused ? inputText : displayValue}
        onChange={(e) => setInputText(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          'h-full min-h-0 flex-1 min-w-0 border-0 rounded-none bg-transparent shadow-none',
          'ring-0 focus-visible:ring-0 focus-visible:ring-offset-0',
          'px-2 py-0 text-sm leading-tight tabular-nums',
          !displayValue && !inputText && 'text-muted-foreground',
          inputClassName
        )}
      />
      <Popover modal={false} open={open} onOpenChange={(newOpen) => { if (newOpen !== open) setOpen(newOpen) }}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="!h-full min-h-0 !w-8 shrink-0 rounded-none border-l border-input/50 text-muted-foreground hover:bg-muted/50 hover:text-foreground ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            aria-label="Open calendar"
          >
            <CalendarIcon className="h-3.5 w-3.5 shrink-0 pointer-events-none" />
          </Button>
        </PopoverTrigger>
      <PopoverContent
        className={cn(
          'w-auto p-0 border-border bg-card',
          'data-[state=open]:animate-none data-[state=closed]:animate-none duration-0',
          popoverContentClassName
        )}
        align="start"
        sideOffset={4}
      >
        <DatePickerCalendar
          value={value}
          onChange={handleSelect}
          minDate={minDate}
          maxDate={maxDate}
        />
      </PopoverContent>
    </Popover>
    </div>
  )
}
