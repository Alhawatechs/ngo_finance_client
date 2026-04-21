'use client'

import React from 'react'
import Link from 'next/link'
import { Activity, LogIn, Monitor, AlertTriangle, RefreshCw } from 'lucide-react'
import { FinancePageHeader, FinanceEmptyState } from '@/components/finance'
import { Button } from '@/components/ui/button'

export default function AdminSessionsPage() {
  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Login Activity"
        description="Monitor user sessions, login history, and security events. Supports audit reviews and unauthorized access detection."
      />

      <FinanceEmptyState
        icon={Activity}
        title="Coming soon"
        description="Login Activity monitoring is under development. You'll be able to view login history, active sessions, failed attempts, and security events for donor and external audit evidence."
        action={
          <Button variant="outline" asChild>
            <Link href="/admin">
              <RefreshCw className="h-4 w-4 mr-2" />
              Back to Administration
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-muted/20 p-4">
          <LogIn className="h-5 w-5 text-muted-foreground mb-2" />
          <h3 className="font-medium text-sm">Login History</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Timestamp, IP, device, and location</p>
        </div>
        <div className="rounded-lg border bg-muted/20 p-4">
          <Monitor className="h-5 w-5 text-muted-foreground mb-2" />
          <h3 className="font-medium text-sm">Active Sessions</h3>
          <p className="text-xs text-muted-foreground mt-0.5">View and revoke active user sessions</p>
        </div>
        <div className="rounded-lg border bg-muted/20 p-4">
          <AlertTriangle className="h-5 w-5 text-muted-foreground mb-2" />
          <h3 className="font-medium text-sm">Security Events</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Failed logins, lockouts, and anomalies</p>
        </div>
      </div>
    </div>
  )
}
