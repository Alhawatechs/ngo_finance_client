'use client'

import { Building2, Check, ChevronDown } from 'lucide-react'
import { useOfficeOptional } from '@/contexts/OfficeContext'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * Renders an office switcher dropdown in the header. Only shown when the user has
 * at least one allowed office. Sends X-Office-Id via context/localStorage to the API client.
 */
export function OfficeSwitcher() {
  const office = useOfficeOptional()
  if (!office) return null
  const { officeId, setOfficeId, allowedOffices, selectedOffice, isLoading } = office

  if (isLoading || allowedOffices.length === 0) return null

  const title = selectedOffice
    ? `${selectedOffice.name} (${selectedOffice.code})`
    : 'Select office'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1 rounded-lg px-2 text-emerald-200 hover:text-white hover:bg-white/10 border border-emerald-700/50 hover:border-emerald-400/80"
          title={title}
          aria-label={title}
        >
          <Building2 className="h-4 w-4 shrink-0" aria-hidden />
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl">
        {allowedOffices.map((office) => (
          <DropdownMenuItem
            key={office.id}
            onClick={() => setOfficeId(office.id)}
            className="cursor-pointer gap-2"
          >
            {officeId === office.id ? (
              <Check className="h-4 w-4 text-emerald-700" />
            ) : (
              <span className="w-4" />
            )}
            <span className="flex-1 truncate">
              {office.name} ({office.code})
            </span>
            {office.is_head_office && (
              <span className="text-[10px] text-muted-foreground">Head</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
