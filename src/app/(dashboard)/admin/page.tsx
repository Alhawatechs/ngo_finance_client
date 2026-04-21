'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  FinancePageHeader,
  FinanceModuleCard,
} from '@/components/finance'
import {
  Users,
  KeyRound,
  Building,
  Building2,
  Shield,
  LayoutGrid,
  Workflow,
  FileCheck,
  Activity,
  Lock,
  Settings,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'
import { getUsers } from '@/lib/api/users'
import { getRoles } from '@/lib/api/roles'
import { getDepartments } from '@/lib/api/departments'

const peopleAndAccess = [
  {
    title: 'Users',
    description: 'Manage staff accounts, roles, offices, and access. Invite users and control who can access the system.',
    href: '/admin/users',
    icon: <Users className="h-5 w-5" />,
  },
  {
    title: 'Roles',
    description: 'Define roles and assign permissions. Organization-level and office-specific roles for donor-funded operations.',
    href: '/admin/roles',
    icon: <KeyRound className="h-5 w-5" />,
  },
  {
    title: 'Departments',
    description: 'Organize staff by department and office. Link managers and structure for reporting and approvals.',
    href: '/admin/departments',
    icon: <Building className="h-5 w-5" />,
  },
]

const securityAndCompliance = [
  {
    title: 'Permissions',
    description: 'View and manage granular permissions. Essential for donor compliance and segregation of duties.',
    href: '/admin/permissions',
    icon: <Shield className="h-5 w-5" />,
  },
  {
    title: 'Access Matrix',
    description: 'See which roles have which permissions. Audit-ready view for donor and external audit requirements.',
    href: '/admin/access-matrix',
    icon: <LayoutGrid className="h-5 w-5" />,
  },
  {
    title: 'Audit Trail',
    description: 'Track all changes to financial data. Required for donor reporting and external audit evidence.',
    href: '/audit-compliance/audit-trail',
    icon: <FileCheck className="h-5 w-5" />,
  },
  {
    title: 'Login Activity',
    description: 'Monitor user sessions and login history. Detect unauthorized access and support security reviews.',
    href: '/admin/sessions',
    icon: <Activity className="h-5 w-5" />,
  },
]

const workflowAndSystem = [
  {
    title: 'Approval Workflow',
    description: 'Configure approval levels and limits for vouchers and fund requests. Align with donor delegation rules.',
    href: '/admin/approval-workflow',
    icon: <Workflow className="h-5 w-5" />,
  },
  {
    title: 'Security Settings',
    description: 'Password policies, session timeouts, and security options. Strengthen controls for NGO finance.',
    href: '/admin/security-settings',
    icon: <Lock className="h-5 w-5" />,
  },
  {
    title: 'System Configuration',
    description: 'Email, integrations, backups, and system preferences. Central configuration for administrators.',
    href: '/admin/config',
    icon: <Settings className="h-5 w-5" />,
  },
]

function ModuleCard({
  title,
  description,
  href,
  icon,
}: {
  title: string
  description: string
  href: string
  icon: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="group block rounded-lg border bg-card p-5 transition-colors hover:bg-muted/30 hover:border-primary/20"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground group-hover:text-primary">{title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-primary" />
      </div>
    </Link>
  )
}

export default function SystemAdministrationPage() {
  return (
    <div className="space-y-8">
      <FinancePageHeader
        title="System Administration"
        description="Manage users, roles, permissions, and system settings. Configure access controls and workflows to support donor compliance, audit readiness, and NGO finance best practices."
      />

      {/* People & Access */}
      <FinanceModuleCard
        title="People & Access"
        subtitle="Manage staff, roles, and organizational structure"
        icon={<Users className="h-5 w-5" />}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {peopleAndAccess.map((m) => (
            <ModuleCard key={m.href} {...m} />
          ))}
        </div>
      </FinanceModuleCard>

      {/* Security & Compliance */}
      <FinanceModuleCard
        title="Security & Compliance"
        subtitle="Permissions, audit trail, and security monitoring for donor and external audit requirements"
        icon={<ShieldCheck className="h-5 w-5" />}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {securityAndCompliance.map((m) => (
            <ModuleCard key={m.href} {...m} />
          ))}
        </div>
      </FinanceModuleCard>

      {/* Workflow & System */}
      <FinanceModuleCard
        title="Workflow & System"
        subtitle="Approval workflows and system configuration"
        icon={<Workflow className="h-5 w-5" />}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workflowAndSystem.map((m) => (
            <ModuleCard key={m.href} {...m} />
          ))}
        </div>
      </FinanceModuleCard>

      {/* Organization Setup quick link */}
      <FinanceModuleCard
        title="Organization Setup"
        subtitle="Organization profile, offices, and organogram"
        icon={<Building2 className="h-5 w-5" />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            href="/admin/organization"
            className="group flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/30 hover:border-primary/20"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary">Organization Profile</h3>
              <p className="text-xs text-muted-foreground">Branding, fiscal year, multi-currency</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </Link>
          <Link
            href="/admin/office-setup"
            className="group flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/30 hover:border-primary/20"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary">Office Setup</h3>
              <p className="text-xs text-muted-foreground">Branches, locations, cost centers</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </Link>
          <Link
            href="/admin/organogram"
            className="group flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/30 hover:border-primary/20"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary">Organogram</h3>
              <p className="text-xs text-muted-foreground">Structure, positions, reporting lines</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </Link>
        </div>
      </FinanceModuleCard>

      {/* NGO context note */}
      <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <div className="flex gap-3">
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
          <div>
            <h3 className="font-medium text-emerald-950 dark:text-emerald-100">Donor compliance & audit readiness</h3>
            <p className="mt-0.5 text-sm text-emerald-800/90 dark:text-emerald-200/90">
              Strong access controls and audit trails support donor reporting and external audit requirements.
              Use the Access Matrix to verify segregation of duties, and the Audit Trail for change history.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
