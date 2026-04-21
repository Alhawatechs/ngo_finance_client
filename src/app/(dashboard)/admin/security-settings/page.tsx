'use client'

import React from 'react'
import Link from 'next/link'
import { Lock, Key, Shield, Clock, RefreshCw } from 'lucide-react'
import { FinancePageHeader, FinanceEmptyState } from '@/components/finance'
import { Button } from '@/components/ui/button'

export default function AdminSecuritySettingsPage() {
  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Security Settings"
        description="Configure password policies, authentication, and session controls. Essential for donor compliance and audit requirements."
      />

      <FinanceEmptyState
        icon={Lock}
        title="Coming soon"
        description="Security Settings is under development. You'll be able to configure password policies, two-factor authentication, session timeouts, and IP restrictions to strengthen controls for NGO finance."
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
          <Key className="h-5 w-5 text-muted-foreground mb-2" />
          <h3 className="font-medium text-sm">Password Policy</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Length, complexity, expiry, and history</p>
        </div>
        <div className="rounded-lg border bg-muted/20 p-4">
          <Shield className="h-5 w-5 text-muted-foreground mb-2" />
          <h3 className="font-medium text-sm">Two-Factor Authentication</h3>
          <p className="text-xs text-muted-foreground mt-0.5">2FA enforcement for sensitive roles</p>
        </div>
        <div className="rounded-lg border bg-muted/20 p-4">
          <Clock className="h-5 w-5 text-muted-foreground mb-2" />
          <h3 className="font-medium text-sm">Session Settings</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Timeout, concurrent sessions, lockout</p>
        </div>
      </div>
    </div>
  )
}
