'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  Check,
  AlertTriangle,
  Info,
  ClipboardList,
  Landmark,
  ExternalLink,
  RefreshCw,
  CheckCheck,
  ChevronDown,
} from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/contexts/SidebarContext'
import {
  getNotificationsRecent,
  getNotificationsUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  type UserNotification,
} from '@/lib/api/notifications'

const PANEL_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

/** ~85% transparency (15% opaque white) + blur; WebKit needs explicit -webkit-backdrop-filter. */
const PANEL_GLASS_STYLE: CSSProperties = {
  backgroundColor: 'rgba(255, 255, 255, 0.15)',
  WebkitBackdropFilter: 'blur(30px) saturate(1.12)',
  backdropFilter: 'blur(30px) saturate(1.12)',
}

const TYPE_ORDER = ['approval', 'budget', 'treasury', 'success', 'warning', 'info'] as const

function groupByType(items: UserNotification[]): [string, UserNotification[]][] {
  const map = new Map<string, UserNotification[]>()
  for (const n of items) {
    const key = n.type && n.type.length > 0 ? n.type : 'info'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(n)
  }
  const entries = [...map.entries()]
  entries.sort((a, b) => {
    const ia = TYPE_ORDER.indexOf(a[0] as (typeof TYPE_ORDER)[number])
    const ib = TYPE_ORDER.indexOf(b[0] as (typeof TYPE_ORDER)[number])
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })
  return entries
}

function typeSectionLabel(type: string): string {
  switch (type) {
    case 'approval':
      return 'Approvals'
    case 'budget':
      return 'Budget'
    case 'treasury':
      return 'Treasury & cash'
    case 'success':
      return 'Success'
    case 'warning':
      return 'Alerts'
    case 'info':
      return 'System'
    default:
      return 'Other'
  }
}

function formatPanelTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function NotificationIcon({ type, className }: { type: string; className?: string }) {
  const c = cn('h-3.5 w-3.5 shrink-0', className)
  switch (type) {
    case 'success':
      return <Check className={cn(c, 'text-emerald-600')} strokeWidth={2} />
    case 'warning':
      return <AlertTriangle className={cn(c, 'text-amber-600')} strokeWidth={2} />
    case 'budget':
      return <ClipboardList className={cn(c, 'text-violet-600')} strokeWidth={2} />
    case 'approval':
      return <Bell className={cn(c, 'text-sky-700')} strokeWidth={2} />
    case 'treasury':
      return <Landmark className={cn(c, 'text-primary')} strokeWidth={2} />
    default:
      return <Info className={cn(c, 'text-muted-foreground')} strokeWidth={2} />
  }
}

function SkeletonRow() {
  return (
    <div className="flex gap-2.5 rounded-none border border-border/80 bg-card p-3.5 shadow-sm">
      <div className="h-3.5 w-3.5 shrink-0 animate-pulse rounded-none bg-muted/80" aria-hidden />
      <div className="min-w-0 flex-1 space-y-2 pt-0.5">
        <div className="h-3.5 w-2/3 animate-pulse rounded-none bg-muted" />
        <div className="h-3 w-full animate-pulse rounded-none bg-muted/70" />
        <div className="h-2.5 w-1/3 animate-pulse rounded-none bg-muted/70" />
      </div>
    </div>
  )
}

export interface NotificationSlidePanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  notificationsEnabled: boolean
}

export function NotificationSlidePanel({
  open,
  onOpenChange,
  notificationsEnabled,
}: NotificationSlidePanelProps) {
  const { contentLeft } = useSidebar()
  const router = useRouter()
  const queryClient = useQueryClient()
  const scrollRef = useRef<HTMLDivElement>(null)
  const refreshBtnRef = useRef<HTMLButtonElement>(null)
  const [mounted, setMounted] = useState(false)
  const [headerScrolled, setHeaderScrolled] = useState(false)
  /** `true` = group is collapsed (items hidden). New groups default to expanded. */
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) {
      setHeaderScrolled(false)
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  useEffect(() => {
    if (!open) return
    const t = requestAnimationFrame(() => {
      refreshBtnRef.current?.focus()
    })
    return () => cancelAnimationFrame(t)
  }, [open])

  const onScrollBody = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setHeaderScrolled(el.scrollTop > 6)
  }, [])

  const { data: unreadCount = 0, isFetching: countFetching } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const r = await getNotificationsUnreadCount()
      return r.data?.unread_count ?? 0
    },
    refetchInterval: notificationsEnabled ? 60_000 : false,
    refetchOnWindowFocus: true,
    enabled: notificationsEnabled,
  })

  const {
    data: recentItems = [],
    isLoading: recentLoading,
    isFetching: recentFetching,
    refetch: refetchRecent,
  } = useQuery({
    queryKey: ['notifications-recent'],
    queryFn: async () => {
      const r = await getNotificationsRecent(40)
      return r.data ?? []
    },
    refetchInterval: notificationsEnabled ? 60_000 : false,
    refetchOnWindowFocus: true,
    enabled: notificationsEnabled && open,
  })

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications-recent'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      ])
      void refetchRecent()
    },
  })

  const hasUnreadInList = recentItems.some((n) => !n.is_read)
  const canClearAll =
    notificationsEnabled && (unreadCount > 0 || hasUnreadInList) && !markAllMutation.isPending

  const handleClearAll = useCallback(() => {
    if (!canClearAll) return
    markAllMutation.mutate()
  }, [canClearAll, markAllMutation])

  const markOneMutation = useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-recent'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const invalidateNotifications = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    queryClient.invalidateQueries({ queryKey: ['notifications-recent'] })
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }, [queryClient])

  const handleRefresh = useCallback(() => {
    void refetchRecent()
    void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
  }, [refetchRecent, queryClient])

  const handleNotificationClick = useCallback(
    async (n: UserNotification) => {
      if (!n.is_read) {
        try {
          await markNotificationRead(n.id)
          invalidateNotifications()
        } catch {
          /* ignore */
        }
      }
      if (n.action_url) {
        onOpenChange(false)
        router.push(n.action_url)
      }
    },
    [router, invalidateNotifications, onOpenChange]
  )

  const handleMarkReadOnly = useCallback(
    (e: React.MouseEvent, id: number) => {
      e.stopPropagation()
      markOneMutation.mutate(id)
    },
    [markOneMutation]
  )

  const handleOpenLink = useCallback(
    async (e: React.MouseEvent, n: UserNotification) => {
      e.stopPropagation()
      if (!n.action_url) return
      if (!n.is_read) {
        try {
          await markNotificationRead(n.id)
          invalidateNotifications()
        } catch {
          /* ignore */
        }
      }
      onOpenChange(false)
      router.push(n.action_url)
    },
    [router, invalidateNotifications, onOpenChange]
  )

  const grouped = useMemo(() => groupByType(recentItems), [recentItems])

  /** Stable primitive so sync effect does not re-run every render (grouped[] is a new reference each time). */
  const groupSignature = useMemo(() => {
    const keys = new Set<string>()
    for (const n of recentItems) {
      keys.add(n.type && n.type.length > 0 ? n.type : 'info')
    }
    return [...keys].sort().join('|')
  }, [recentItems])

  useEffect(() => {
    setCollapsed((prev) => {
      const next: Record<string, boolean> = {}
      for (const [key] of groupByType(recentItems)) {
        next[key] = prev[key] ?? false
      }
      const sameKeys =
        Object.keys(prev).length === Object.keys(next).length &&
        Object.keys(next).every((k) => (prev[k] ?? false) === (next[k] ?? false))
      if (sameKeys) {
        return prev
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recentItems is read for grouping; groupSignature tracks type-set changes without unstable array identity
  }, [groupSignature])

  const toggleGroup = useCallback((key: string) => {
    setCollapsed((p) => ({ ...p, [key]: p[key] === false ? true : false }))
  }, [])

  const expandAllGroups = useCallback(() => {
    const next: Record<string, boolean> = {}
    grouped.forEach(([k]) => {
      next[k] = false
    })
    setCollapsed(next)
  }, [grouped])

  const collapseAllGroups = useCallback(() => {
    const next: Record<string, boolean> = {}
    grouped.forEach(([k]) => {
      next[k] = true
    })
    setCollapsed(next)
  }, [grouped])

  const allGroupsCollapsed =
    grouped.length > 0 && grouped.every(([k]) => collapsed[k] === true)

  if (!mounted) return null

  const isRefreshing = recentFetching && !recentLoading

  const panel = (
    <div
      className={cn(
        'fixed top-14 right-0 bottom-0 z-[100]',
        !open && 'pointer-events-none'
      )}
      style={{ left: contentLeft }}
      aria-hidden={!open}
    >
      {/* Same horizontal band as main content (flyout-style); does not cover header or left sidebar. */}
      <button
        type="button"
        className={cn(
          'absolute inset-0 bg-transparent transition-opacity duration-300 motion-reduce:transition-none',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
        aria-label="Close notifications"
        tabIndex={open ? 0 : -1}
        onClick={() => onOpenChange(false)}
      />

      <aside
        id="notification-slide-panel"
        style={{ transitionTimingFunction: PANEL_EASE, ...PANEL_GLASS_STYLE }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          // overflow-hidden on the same node breaks backdrop-filter in Safari; clip via inner wrapper
          'pointer-events-auto absolute bottom-0 right-0 top-0 z-[1] flex w-[min(360px,100vw)] max-w-[100vw] flex-col rounded-none',
          'border-l border-border/90 shadow-[4px_0_24px_-4px_rgba(15,23,42,0.12),0_0_0_1px_rgba(15,23,42,0.04)]',
          'transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none motion-reduce:duration-150 will-change-transform',
          open ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        )}
        role="dialog"
        aria-modal="false"
        aria-labelledby="notification-panel-title"
        aria-describedby="notification-panel-desc"
      >
        <div
          className="pointer-events-none h-0.5 shrink-0 border-b border-white/20 bg-white/15"
          aria-hidden
        />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className={cn(
            'relative z-20 flex shrink-0 flex-col border-b border-white/20 bg-transparent px-4 py-3.5 transition-[box-shadow] motion-reduce:transition-none',
            headerScrolled && 'shadow-[0_6px_16px_-8px_rgba(15,23,42,0.12)]'
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                id="notification-panel-title"
                className="truncate text-[0.9375rem] font-semibold leading-tight tracking-tight text-foreground"
              >
                Notifications
              </h2>
              <p id="notification-panel-desc" className="mt-1 text-[11px] leading-snug text-muted-foreground">
                {notificationsEnabled ? (
                  <>
                    {unreadCount === 0 ? (
                      <span className="text-emerald-700/90">You&apos;re up to date</span>
                    ) : (
                      <>
                        <span className="tabular-nums font-semibold text-foreground">{unreadCount}</span>
                        <span className="text-muted-foreground"> unread</span>
                      </>
                    )}
                    {countFetching && !recentLoading ? (
                      <span className="text-muted-foreground"> · Syncing…</span>
                    ) : null}
                  </>
                ) : (
                  'In-app alerts are turned off'
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
              <Button
                ref={refreshBtnRef}
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-none text-muted-foreground hover:bg-white hover:text-foreground hover:shadow-sm disabled:opacity-40"
                title="Refresh list"
                disabled={!notificationsEnabled || recentLoading}
                onClick={() => handleRefresh()}
              >
                <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin motion-reduce:animate-none')} strokeWidth={2} />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-none border-slate-200 bg-white px-2.5 text-xs font-medium text-primary shadow-sm hover:bg-slate-50 disabled:opacity-40"
                disabled={!canClearAll}
                onClick={handleClearAll}
              >
                {markAllMutation.isPending ? '…' : 'Mark all read'}
              </Button>
            </div>
          </div>
        </div>

        <div
          ref={scrollRef}
          onScroll={onScrollBody}
          className="notification-panel-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain bg-transparent px-3 py-3"
        >
          {!notificationsEnabled && (
            <div className="rounded-none border border-dashed border-border bg-card/80 px-4 py-12 text-center">
              <p className="text-sm leading-relaxed text-muted-foreground">
                In-app alerts are disabled. Enable them in{' '}
                <Link
                  href="/settings?section=notifications"
                  className="font-medium text-primary underline decoration-primary/25 underline-offset-2 hover:text-primary-dark"
                  onClick={() => onOpenChange(false)}
                >
                  Notification settings
                </Link>
                .
              </p>
            </div>
          )}

          {notificationsEnabled && recentLoading && (
            <div className="space-y-2.5" aria-busy="true" aria-live="polite">
              <p className="sr-only">Loading notifications</p>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          )}

          {notificationsEnabled && !recentLoading && recentItems.length === 0 && (
            <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
              <Bell className="mb-3 h-8 w-8 text-muted-foreground/50" strokeWidth={1.25} aria-hidden />
              <p className="text-sm font-semibold tracking-tight text-foreground">No notifications</p>
              <p className="mt-2 max-w-[240px] text-xs leading-relaxed text-muted-foreground">
                New approvals, budgets, treasury activity, and system messages will appear here.
              </p>
            </div>
          )}

          {notificationsEnabled && !recentLoading && recentItems.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  By type
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="text-[10px] font-medium text-muted-foreground hover:text-foreground"
                    onClick={allGroupsCollapsed ? expandAllGroups : collapseAllGroups}
                  >
                    {allGroupsCollapsed ? 'Expand all' : 'Collapse all'}
                  </button>
                </div>
              </div>
              <ul className="space-y-1.5">
                {grouped.map(([typeKey, list]) => {
                  const isCollapsed = collapsed[typeKey] === true
                  const unreadInGroup = list.filter((n) => !n.is_read).length
                  return (
                    <li key={typeKey} className="list-none border border-border/80 bg-card shadow-sm">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left text-xs font-semibold text-foreground hover:bg-slate-50/90"
                        onClick={() => toggleGroup(typeKey)}
                        aria-expanded={!isCollapsed}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <NotificationIcon type={typeKey} />
                          <span className="truncate">{typeSectionLabel(typeKey)}</span>
                          <span className="tabular-nums text-[11px] font-normal text-muted-foreground">
                            ({list.length}
                            {unreadInGroup > 0 ? (
                              <span className="text-primary"> · {unreadInGroup} new</span>
                            ) : null}
                            )
                          </span>
                        </span>
                        <ChevronDown
                          className={cn(
                            'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
                            isCollapsed && '-rotate-90'
                          )}
                          aria-hidden
                        />
                      </button>
                      {!isCollapsed && (
                        <ul className="space-y-2 border-t border-slate-100 bg-slate-50/40 px-2 py-2" role="list">
                          {list.map((n) => (
                            <li key={n.id} role="listitem">
                              <div
                                className={cn(
                                  'group/card overflow-hidden rounded-none border border-border/90 bg-white shadow-sm transition-all duration-200 motion-reduce:transition-none',
                                  'hover:border-slate-300 hover:shadow-md',
                                  !n.is_read && 'border-l-[3px] border-l-primary'
                                )}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleNotificationClick(n)}
                                  className="w-full rounded-none px-2.5 pb-2 pt-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/25"
                                >
                                  <div className="flex gap-2.5">
                                    <div className="flex shrink-0 items-start justify-center pt-0.5 text-muted-foreground">
                                      <NotificationIcon type={n.type} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm font-semibold leading-snug text-foreground">{n.title}</p>
                                        {!n.is_read && (
                                          <span
                                            className="mt-0.5 inline-flex h-1.5 w-1.5 shrink-0 rounded-none bg-primary shadow-sm"
                                            aria-label="Unread"
                                          />
                                        )}
                                      </div>
                                      <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                                        {n.message}
                                      </p>
                                      <p className="mt-2 text-[11px] tabular-nums text-muted-foreground">
                                        <time dateTime={n.created_at}>{formatPanelTime(n.created_at)}</time>
                                        <span className="mx-1.5 text-slate-300">·</span>
                                        <span>{timeAgo(n.created_at)}</span>
                                      </p>
                                    </div>
                                  </div>
                                </button>
                                <div className="flex items-center justify-end gap-1 border-t border-slate-100 bg-slate-50/80 px-2 py-1.5">
                                  {!n.is_read && (
                                    <button
                                      type="button"
                                      disabled={markOneMutation.isPending}
                                      className="inline-flex items-center gap-1 rounded-none px-2 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-white hover:text-foreground hover:shadow-sm disabled:pointer-events-none"
                                      onClick={(e) => handleMarkReadOnly(e, n.id)}
                                    >
                                      <CheckCheck className="h-3.5 w-3.5 opacity-70" />
                                      Mark read
                                    </button>
                                  )}
                                  {n.action_url && (
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-1 rounded-none px-2 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/8"
                                      onClick={(e) => handleOpenLink(e, n)}
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                      Open
                                    </button>
                                  )}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="relative z-20 shrink-0 border-t border-white/20 bg-transparent px-3 py-3.5">
          <Button
            variant="outline"
            className="h-10 w-full rounded-none border-primary/25 bg-white text-sm font-semibold text-primary shadow-sm hover:bg-primary/5"
            asChild
          >
            <Link href="/settings?section=notifications" onClick={() => onOpenChange(false)}>
              Open notification center
            </Link>
          </Button>
          <p className="mt-2.5 text-center text-[10px] leading-snug text-muted-foreground">
            Full inbox, filters, and email delivery
          </p>
        </div>
        </div>
      </aside>
    </div>
  )

  return createPortal(panel, document.body)
}
