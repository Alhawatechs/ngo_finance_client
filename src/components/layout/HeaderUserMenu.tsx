'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, LogOut, Settings, User, Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/stores/authStore'
import { useOrganizationStore } from '@/stores/organizationStore'
import { getInitials, cn } from '@/lib/utils'
import { UserAvatar } from '@/components/layout/UserAvatar'

export function HeaderUserMenu() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const organization = useOrganizationStore((s) => s.organization)

  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = useCallback(async () => {
    setLoggingOut(true)
    try {
      await logout()
      router.push('/login')
    } finally {
      setLoggingOut(false)
    }
  }, [logout, router])

  const primaryRoleLabel =
    user?.roles?.[0]?.display_name ?? user?.roles?.[0]?.name ?? user?.position ?? 'Staff'

  const orgLabel =
    organization?.short_name || organization?.name || user?.organization?.short_name || user?.organization?.name

  const displayName = user?.name ?? 'User'
  const initials = user?.initials || getInitials(displayName)
  const email = user?.email ?? ''

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Account menu, signed in as ${displayName}`}
          aria-haspopup="menu"
          className={cn(
            'group flex items-center gap-2.5 pl-2 pr-2.5 py-1.5 rounded-lg border transition-colors outline-none',
            'border-transparent hover:bg-white/10 hover:border-emerald-600/80',
            'focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-primary',
            'data-[state=open]:border-sky-400/70 data-[state=open]:bg-white/10 data-[state=open]:ring-1 data-[state=open]:ring-sky-300/40'
          )}
        >
          <div className="relative">
            <UserAvatar
              name={displayName}
              initials={initials}
              avatarUrl={user?.avatar_url}
              size="sm"
              variant="header"
            />
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-primary bg-emerald-500"
              aria-hidden
            />
          </div>
          <div className="hidden lg:block text-left min-w-0">
            <p className="text-sm font-medium text-white leading-tight truncate max-w-[10rem]">{displayName}</p>
            <p className="text-xs text-emerald-200/90 leading-tight truncate max-w-[10rem]">{primaryRoleLabel}</p>
          </div>
          <ChevronDown
            className="h-4 w-4 text-emerald-300 hidden lg:block shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
            strokeWidth={1.75}
            aria-hidden
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="w-[min(100vw-1.5rem,21rem)] rounded-xl p-0 overflow-hidden shadow-xl border border-slate-200/90 bg-popover"
      >
        <div className="px-4 py-3.5 bg-gradient-to-b from-slate-50/95 to-slate-100/80 border-b border-slate-200/80">
          <div className="flex items-start gap-3">
            <UserAvatar
              name={displayName}
              initials={initials}
              avatarUrl={user?.avatar_url}
              size="md"
              variant="default"
            />
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-semibold leading-snug text-slate-900 truncate">{displayName}</p>
              {email ? (
                <a
                  href={`mailto:${email}`}
                  className="mt-0.5 block text-xs text-slate-500 truncate hover:text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {email}
                </a>
              ) : null}
              <p className="mt-1 text-[11px] font-medium text-primary/90 truncate">{primaryRoleLabel}</p>
              {orgLabel ? (
                <p className="mt-1 text-[11px] text-slate-500 truncate border-t border-slate-200/80 pt-1.5">
                  {orgLabel}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <DropdownMenuGroup className="p-1.5 bg-white">
          <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-2.5 py-2.5 text-sm focus:bg-slate-100">
            <Link href="/settings?section=profile" className="flex w-full items-center gap-3">
              <User className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.75} />
              <span className="font-medium text-slate-800">My profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-2.5 py-2.5 text-sm focus:bg-slate-100">
            <Link href="/settings" className="flex w-full items-center gap-3">
              <Settings className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.75} />
              <span className="font-medium text-slate-800">Settings</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="my-0 bg-slate-200/80" />

        <div className="p-1.5 bg-white">
          <DropdownMenuItem
            disabled={loggingOut}
            onClick={() => void handleLogout()}
            className="cursor-pointer rounded-lg px-2.5 py-2.5 text-sm font-semibold text-red-600 focus:text-red-700 focus:bg-red-50 data-[disabled]:opacity-60"
          >
            <span className="flex w-full items-center gap-3">
              {loggingOut ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" strokeWidth={1.75} />
              ) : (
                <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              )}
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
