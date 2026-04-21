'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Mail,
  Building2,
  Briefcase,
  Shield,
  Clock,
  MapPin,
  Copy,
  Check,
  Bell,
  KeyRound,
  Palette,
  HelpCircle,
  SlidersHorizontal,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/stores/authStore'
import { useOrganizationStore } from '@/stores/organizationStore'
import { getInitials, cn } from '@/lib/utils'
import { UserAvatar } from '@/components/layout/UserAvatar'
import { useToast } from '@/components/ui/use-toast'
import { ProfileEditForm } from '@/components/settings/ProfileEditForm'
import { SETTINGS_SECTION_QUERY } from '@/components/settings/unified/settings-constants'

function formatDate(iso?: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return '—'
  }
}

const q = (section: string) => `/settings?${SETTINGS_SECTION_QUERY}=${section}`

const relatedLinks = [
  { href: q('appearance'), label: 'Appearance', icon: Palette },
  { href: q('security'), label: 'Security', icon: KeyRound },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: q('notifications'), label: 'Alert preferences', icon: SlidersHorizontal },
  { href: '/help', label: 'Help', icon: HelpCircle },
] as const

export function ProfileSettingsSection() {
  const user = useAuthStore((s) => s.user)
  const organization = useOrganizationStore((s) => s.organization)
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const orgName =
    organization?.name || organization?.short_name || user?.organization?.name || user?.organization?.short_name

  const copyEmail = async () => {
    if (!user?.email) return
    try {
      await navigator.clipboard.writeText(user.email)
      setCopied(true)
      toast({ title: 'Copied', description: 'Email address copied to clipboard.' })
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: 'Could not copy', description: 'Copy the address manually.', variant: 'destructive' })
    }
  }

  if (!user) {
    return <p className="text-sm text-muted-foreground">You are not signed in.</p>
  }

  const primaryRole = user.roles?.[0]?.display_name ?? user.roles?.[0]?.name
  const roleLine = primaryRole ?? user.position ?? '—'
  const statusOk = user.status === 'active'

  return (
    <div className="space-y-6">
      <section
        className={cn(
          'relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card via-muted/40 to-primary/5',
          'shadow-sm'
        )}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />
        <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-start sm:p-6">
          <div className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:items-start">
            <div className="relative shrink-0">
              <UserAvatar
                name={user.name}
                initials={user.initials || getInitials(user.name)}
                avatarUrl={user.avatar_url}
                size="xl"
                variant="default"
              />
              <span
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background',
                  statusOk ? 'bg-emerald-500' : 'bg-amber-500'
                )}
                title={user.status ? `Status: ${user.status}` : undefined}
                aria-hidden
              />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{user.name}</h2>
                {user.status ? (
                  <Badge variant={statusOk ? 'success' : 'secondary'} className="font-normal capitalize">
                    {user.status}
                  </Badge>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">{roleLine}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href={`mailto:${user.email}`}
                  className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <Mail className="h-4 w-4 shrink-0 opacity-80" />
                  <span className="truncate">{user.email}</span>
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => void copyEmail()}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              {orgName ? (
                <p className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{orgName}</span>
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <nav
        aria-label="Related settings"
        className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm"
      >
        {relatedLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href + label}
            href={href}
            className="inline-flex items-center gap-2 text-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <ProfileEditForm user={user} />

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-foreground">Account details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/50 p-3">
              <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0">
                <dt className="sr-only">Position</dt>
                <dd className="text-sm font-medium text-foreground">{user.position ?? '—'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/50 p-3">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0">
                <dt className="sr-only">Department</dt>
                <dd className="text-sm font-medium text-foreground">{user.department ?? '—'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/50 p-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0">
                <dt className="sr-only">Office</dt>
                <dd className="text-sm font-medium text-foreground">
                  {user.office ? `${user.office.name} (${user.office.code})` : '—'}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/50 p-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0">
                <dt className="sr-only">Last sign-in</dt>
                <dd className="text-sm font-medium text-foreground">{formatDate(user.last_login_at)}</dd>
              </div>
            </div>
            <div className="sm:col-span-2 flex items-start gap-3 rounded-xl border border-border bg-muted/50 p-3">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <dt className="sr-only">Roles</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {user.roles && user.roles.length > 0 ? (
                    user.roles.map((r) => (
                      <span
                        key={r.id}
                        className="inline-flex rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-foreground"
                      >
                        {r.display_name || r.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </dd>
              </div>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
