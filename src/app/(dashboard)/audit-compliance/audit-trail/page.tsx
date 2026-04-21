'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ListChecks, RefreshCw, Search, Eye } from 'lucide-react'
import { ActionMenu } from '@/components/ui/action-menu'
import { formatDate } from '@/lib/utils'
import { DatePicker } from '@/components/ui/date-picker'
import {
  getAuditLogs,
  getAuditLog,
  getModelTypeLabel,
  AuditLogEntry,
  AuditLogsParams,
} from '@/lib/api/audit-compliance'

export default function AuditTrailPage() {
  const [page, setPage] = useState(1)
  const [modelType, setModelType] = useState<string>('')
  const [action, setAction] = useState<string>('')
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')
  const [viewId, setViewId] = useState<number | null>(null)

  const params: AuditLogsParams = {
    page,
    per_page: 15,
    ...(modelType && { model_type: modelType }),
    ...(action && { action }),
    ...(from && { from }),
    ...(to && { to }),
  }

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => getAuditLogs(params),
  })

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['audit-log', viewId],
    queryFn: () => getAuditLog(viewId!),
    enabled: viewId !== null,
  })

  const logs = data?.data ?? []
  const meta = data?.meta
  const selectedLog = detailData?.data ?? null

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">Audit Trail</h1>
        <p className="text-muted-foreground">System-wide activity log: who did what, when</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Activity log
          </CardTitle>
          <CardDescription>View and filter user actions and data changes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={modelType || '__all__'} onValueChange={(v) => setModelType(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Model type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All types</SelectItem>
                <SelectItem value="App\\Models\\Voucher">Voucher</SelectItem>
                <SelectItem value="App\\Models\\JournalEntry">Journal Entry</SelectItem>
                <SelectItem value="App\\Models\\User">User</SelectItem>
                <SelectItem value="App\\Models\\Grant">Grant</SelectItem>
                <SelectItem value="App\\Models\\Project">Project</SelectItem>
              </SelectContent>
            </Select>
            <Select value={action || '__all__'} onValueChange={(v) => setAction(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
              </SelectContent>
            </Select>
            <DatePicker
              value={from}
              onChange={setFrom}
              placeholder="From"
              className="w-[140px]"
              inputClassName="h-9"
              maxDate={to || undefined}
            />
            <DatePicker
              value={to}
              onChange={setTo}
              placeholder="To"
              className="w-[140px]"
              inputClassName="h-9"
              minDate={from || undefined}
            />
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <Search className="h-4 w-4 mr-1" />
              Apply
            </Button>
            <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Date / Time</th>
                  <th className="px-4 py-3 text-left font-medium">User</th>
                  <th className="px-4 py-3 text-left font-medium">Action</th>
                  <th className="px-4 py-3 text-left font-medium">Model</th>
                  <th className="px-4 py-3 text-left font-medium">Description</th>
                  <th className="px-4 py-3 text-center font-medium w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full mt-2" />
                      <Skeleton className="h-8 w-full mt-2" />
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No audit log entries found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log: AuditLogEntry) => (
                    <tr key={log.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-4 py-3">{log.user?.name ?? log.user_name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="capitalize font-medium">{log.action}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {getModelTypeLabel(log.model_type)}
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate">{log.description}</td>
                      <td className="px-4 py-3 text-center">
                        <ActionMenu
                          triggerClassName="h-8 w-8"
                          items={[
                            {
                              label: 'View details',
                              icon: <Eye className="h-4 w-4" />,
                              onClick: () => setViewId(log.id),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.last_page > 1 && (
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Showing {meta.from ?? 0} to {meta.to ?? 0} of {meta.total} entries
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= meta.last_page}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={viewId !== null} onOpenChange={(open) => !open && setViewId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit log entry</DialogTitle>
          </DialogHeader>
          {detailLoading || !selectedLog ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Date</span>
                <span>{formatDate(selectedLog.created_at)}</span>
                <span className="text-muted-foreground">User</span>
                <span>{selectedLog.user?.name ?? selectedLog.user_name ?? '—'}</span>
                <span className="text-muted-foreground">Action</span>
                <span className="capitalize">{selectedLog.action}</span>
                <span className="text-muted-foreground">Model</span>
                <span>{getModelTypeLabel(selectedLog.model_type)}</span>
                <span className="text-muted-foreground">Description</span>
                <span>{selectedLog.description}</span>
                {selectedLog.url && (
                  <>
                    <span className="text-muted-foreground">URL</span>
                    <span className="truncate" title={selectedLog.url}>{selectedLog.url}</span>
                  </>
                )}
              </div>
              {selectedLog.old_values && Object.keys(selectedLog.old_values).length > 0 && (
                <div>
                  <p className="font-medium text-muted-foreground mb-1">Old values</p>
                  <pre className="rounded bg-muted p-3 text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.old_values, null, 2)}
                  </pre>
                </div>
              )}
              {selectedLog.new_values && Object.keys(selectedLog.new_values).length > 0 && (
                <div>
                  <p className="font-medium text-muted-foreground mb-1">New values</p>
                  <pre className="rounded bg-muted p-3 text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.new_values, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
