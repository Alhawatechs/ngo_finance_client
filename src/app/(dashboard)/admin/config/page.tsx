'use client'

import React from 'react'
import Link from 'next/link'
import { Construction, Settings, Mail, Database, RefreshCw } from 'lucide-react'
import { FinancePageHeader, FinanceEmptyState } from '@/components/finance'
import { Button } from '@/components/ui/button'

export default function AdminConfigPage() {
  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="System Configuration"
        description="Configure system-wide settings, integrations, and preferences for your NGO finance system."
      />

      <FinanceEmptyState
        icon={Settings}
        title="Coming soon"
        description="System Configuration is under development. You'll be able to configure email settings, integrations, backup schedules, and system preferences for donor reporting and audit workflows."
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
          <Mail className="h-5 w-5 text-muted-foreground mb-2" />
          <h3 className="font-medium text-sm">Email & Notifications</h3>
          <p className="text-xs text-muted-foreground mt-0.5">SMTP, alerts, and notification preferences</p>
        </div>
        <div className="rounded-lg border bg-muted/20 p-4">
          <Database className="h-5 w-5 text-muted-foreground mb-2" />
          <h3 className="font-medium text-sm">Backup & Maintenance</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Scheduled backups and data retention</p>
        </div>
        <div className="rounded-lg border bg-muted/20 p-4">
          <Settings className="h-5 w-5 text-muted-foreground mb-2" />
          <h3 className="font-medium text-sm">Integrations</h3>
          <p className="text-xs text-muted-foreground mt-0.5">API keys and third-party connections</p>
        </div>
      </div>
    </div>
  )
}
