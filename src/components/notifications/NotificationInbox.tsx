'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  Check,
  AlertTriangle,
  Info,
  ClipboardList,
  ExternalLink,
  Trash2,
  Landmark,
} from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'
import { FinanceEmptyState, FinancePagination } from '@/components/finance'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useOrganizationStore } from '@/stores/organizationStore'
import { useToast } from '@/components/ui/use-toast'
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  type UserNotification,
} from '@/lib/api/notifications'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const TYPE_FILTERS = [
  { value: '', label: 'All types' },
  { value: 'approval', label: 'Approval' },
  { value: 'budget', label: 'Budget' },
  { value: 'treasury', label: 'Treasury' },
  { value: 'success', label: 'Success' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'System' },
] as const

function notificationIcon(type: string) {
  switch (type) {
    case 'success':
      return <Check className="h-4 w-4 text-emerald-600" />
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-amber-600" />
    case 'budget':
      return <ClipboardList className="h-4 w-4 text-violet-600" />
    case 'approval':
      return <Bell className="h-4 w-4 text-sky-700" />
    case 'treasury':
      return <Landmark className="h-4 w-4 text-indigo-700" />
    default:
      return <Info className="h-4 w-4 text-emerald-700" />
  }
}

function iconSurface(type: string) {
  switch (type) {
    case 'success':
      return 'bg-emerald-50'
    case 'warning':
      return 'bg-amber-50'
    case 'budget':
      return 'bg-violet-50'
    case 'approval':
      return 'bg-sky-50'
    case 'treasury':
      return 'bg-indigo-50'
    default:
      return 'bg-emerald-100'
  }
}

/**
 * In-app notification inbox (list, filters, mark read, dismiss).
 * Rendered under Settings → Notifications → Inbox tab.
 */
export function NotificationInbox() {
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const organization = useOrganizationStore((s) => s.organization)
  const notificationsEnabled = organization?.enable_notifications !== false

  const [tab, setTab] = useState<'all' | 'unread'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const unreadOnly = tab === 'unread'

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['notifications', page, perPage, unreadOnly, typeFilter],
    queryFn: async () => {
      const res = await listNotifications({
        page,
        per_page: perPage,
        unread_only: unreadOnly,
        ...(typeFilter ? { type: typeFilter } : {}),
      })
      return res
    },
    enabled: notificationsEnabled,
  })

  const items = data?.data ?? []
  const meta = data?.meta

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
    queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    queryClient.invalidateQueries({ queryKey: ['notifications-recent'] })
  }, [queryClient])

  const markReadMutation = useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onSuccess: invalidate,
  })

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      invalidate()
      toast({ title: 'All notifications marked as read' })
    },
    onError: () => {
      toast({ title: 'Could not mark all as read', variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteNotification(id),
    onSuccess: () => {
      invalidate()
      toast({ title: 'Notification removed' })
      setDeleteId(null)
    },
    onError: () => {
      toast({ title: 'Could not remove notification', variant: 'destructive' })
    },
  })

  const handleRowClick = async (n: UserNotification) => {
    if (!n.is_read) {
      try {
        await markReadMutation.mutateAsync(n.id)
      } catch {
        /* ignore */
      }
    }
    if (n.action_url) {
      router.push(n.action_url)
    }
  }

  const onTabChange = (v: string) => {
    setTab(v as 'all' | 'unread')
    setPage(1)
  }

  const onTypeChange = (v: string) => {
    setTypeFilter(v)
    setPage(1)
  }

  const lastPage = meta?.last_page ?? 1
  const total = meta?.total ?? 0
  const from = meta?.from ?? 0
  const to = meta?.to ?? 0

  if (!notificationsEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Inbox</CardTitle>
          <CardDescription>Your alerts and updates from across the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <FinanceEmptyState
            icon={Bell}
            title="In-app notifications are off"
            description="Turn on “Enable notifications” in the Preferences tab below, or ask an administrator to enable organization notifications."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Inbox</h2>
          <p className="text-sm text-muted-foreground">
            Approvals, budgets, treasury activity, and system messages.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={markAllMutation.isPending || total === 0}
          onClick={() => markAllMutation.mutate()}
        >
          Mark all as read
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={onTabChange}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t.value || 'all'}
              type="button"
              onClick={() => onTypeChange(t.value)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                typeFilter === t.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted/60'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && (
            <div className="divide-y divide-border space-y-4 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && items.length === 0 && (
            <FinanceEmptyState
              icon={Bell}
              title="No notifications yet"
              description="When vouchers are submitted for approval, budgets need review, or other events occur, they will appear here."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button asChild variant="default" size="sm">
                    <Link href="/approvals">Open Approval Center</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/dashboard">Back to Dashboard</Link>
                  </Button>
                </div>
              }
            />
          )}

          {!isLoading && items.length > 0 && (
            <>
              <ul className="divide-y divide-border">
                {items.map((n) => (
                  <li key={n.id} className="group">
                    <div
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 transition-colors',
                        !n.is_read && 'bg-primary/[0.04]'
                      )}
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-start gap-3 text-left"
                        onClick={() => handleRowClick(n)}
                      >
                        <div
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                            iconSurface(n.type)
                          )}
                        >
                          {notificationIcon(n.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-foreground">{n.title}</span>
                            {!n.is_read && (
                              <span className="inline-flex h-2 w-2 rounded-full bg-primary" aria-hidden />
                            )}
                          </div>
                          <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                          <p className="mt-1 text-xs text-muted-foreground/80">{timeAgo(n.created_at)}</p>
                        </div>
                      </button>
                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 sm:opacity-100">
                        {n.action_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Open linked page"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRowClick(n)
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        {!n.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            disabled={markReadMutation.isPending}
                            onClick={(e) => {
                              e.stopPropagation()
                              markReadMutation.mutate(n.id)
                            }}
                          >
                            Mark read
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Dismiss"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteId(n.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {meta && total > 0 && (
                <FinancePagination
                  from={from}
                  to={to}
                  total={total}
                  label="notifications"
                  onPrevious={() => setPage((p) => Math.max(1, p - 1))}
                  onNext={() => setPage((p) => Math.min(lastPage, p + 1))}
                  previousDisabled={page <= 1 || isFetching}
                  nextDisabled={page >= lastPage || isFetching}
                  currentPage={page}
                  lastPage={lastPage}
                  onPageChange={setPage}
                  pageSize={perPage}
                  pageSizeOptions={[10, 20, 50]}
                  onPageSizeChange={(size) => {
                    setPerPage(size)
                    setPage(1)
                  }}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteId != null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this notification?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be removed from your inbox. This does not undo any underlying voucher or budget action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId != null && deleteMutation.mutate(deleteId)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
