'use client'

import React, { useMemo } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday } from 'date-fns'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export interface DatePickerCalendarProps {
  value: string // YYYY-MM-DD
  onChange: (date: string) => void
  className?: string
  /** Optional min date (YYYY-MM-DD) */
  minDate?: string
  /** Optional max date (YYYY-MM-DD) */
  maxDate?: string
}

function parseDateSafe(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null
  const s = dateStr.split('T')[0].trim()
  if (!s) return null
  const d = new Date(s + 'T12:00:00')
  return Number.isNaN(d.getTime()) ? null : d
}

export function DatePickerCalendar({
  value,
  onChange,
  className,
  minDate,
  maxDate,
}: DatePickerCalendarProps) {
  const selectedDate = parseDateSafe(value)
  const [viewDate, setViewDate] = React.useState(() =>
    selectedDate || new Date()
  )
  // Keep view in sync when value changes from outside (e.g. form reset)
  React.useEffect(() => {
    if (selectedDate) setViewDate(selectedDate)
  }, [value])

  const handlePrevMonth = () => setViewDate((d) => subMonths(d, 1))
  const handleNextMonth = () => setViewDate((d) => addMonths(d, 1))
  const handleToday = () => {
    const today = new Date()
    setViewDate(today)
    onChange(format(today, 'yyyy-MM-dd'))
  }

  const min = minDate ? (() => {
    const d = parseDateSafe(minDate)
    if (d) { d.setHours(0, 0, 0, 0); return d }
    return null
  })() : null
  const max = maxDate ? (() => {
    const d = parseDateSafe(maxDate)
    if (d) { d.setHours(23, 59, 59, 999); return d }
    return null
  })() : null

  const isDisabled = (d: Date) => {
    if (min && d < min) return true
    if (max && d > max) return true
    return false
  }

  const handleSelect = (d: Date) => {
    if (isDisabled(d)) return
    onChange(format(d, 'yyyy-MM-dd'))
  }

  const grid = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 0 })
    const days: Date[] = []
    let d = start
    while (d <= end) {
      days.push(d)
      d = addDays(d, 1)
    }
    return days
  }, [viewDate])

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card text-card-foreground shadow-lg overflow-hidden',
        className
      )}
    >
      {/* Header: Today | Month Year | < > */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <button
          type="button"
          onClick={handleToday}
          className="text-sm font-medium text-foreground hover:text-primary hover:underline focus:outline-none focus-visible:ring-[0.5px] focus-visible:ring-ring rounded px-1.5 py-0.5"
        >
          Today
        </button>
        <span className="text-sm font-semibold text-foreground">
          {format(viewDate, 'MMMM yyyy')}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-[0.5px] focus-visible:ring-ring"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-[0.5px] focus-visible:ring-ring"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 border-b border-border/60 bg-muted/30">
        {DAYS.map((day) => (
          <div
            key={day}
            className="py-1.5 text-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 p-2 gap-0.5">
        {grid.map((d) => {
          const inMonth = isSameMonth(d, viewDate)
          const selected = selectedDate && isSameDay(d, selectedDate)
          const today = isToday(d)
          const disabled = isDisabled(d)
          return (
            <button
              key={d.toISOString()}
              type="button"
              disabled={disabled}
              onClick={() => handleSelect(d)}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors focus:outline-none focus-visible:ring-[0.5px] focus-visible:ring-ring focus-visible:ring-offset-0',
                !inMonth && 'text-muted-foreground/60',
                inMonth && !selected && !disabled && 'text-foreground hover:bg-primary/15',
                selected && 'bg-primary text-primary-foreground hover:bg-primary/90',
                today && !selected && 'font-semibold',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              {format(d, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}
