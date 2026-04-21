'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Shield, KeyRound, LayoutGrid, ArrowRight } from 'lucide-react'

const links = [
  {
    title: 'Users',
    description: 'Set each user’s approval level and whether they can approve amounts within their limit. Assign finance roles as needed.',
    href: '/admin/users',
    icon: Users,
  },
  {
    title: 'Roles',
    description: 'Define which roles may submit or approve vouchers and budgets. Pair with Permissions for fine control.',
    href: '/admin/roles',
    icon: Shield,
  },
  {
    title: 'Permissions',
    description: 'Optional: grant or restrict module actions that interact with approval (e.g. vouchers, budgets).',
    href: '/admin/permissions',
    icon: KeyRound,
  },
  {
    title: 'Access Matrix',
    description: 'Review role × module access in one grid to ensure approvers can reach the screens they need.',
    href: '/admin/access-matrix',
    icon: LayoutGrid,
  },
] as const

export default function ApprovalWorkflowApproversPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Approvers &amp; access</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Approval limits on the Policy tab apply per organization. Users must have an approval level above the
          transaction’s current step to approve vouchers. Budget approval typically requires the right project or
          finance role—keep Users and Roles aligned with your workflow.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {links.map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.href} className="shadow-sm border-border/80 hover:border-primary/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/8 border border-primary/15">
                    <Icon className="h-5 w-5 text-primary" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <CardDescription className="mt-1.5 text-sm leading-relaxed">{item.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Button variant="secondary" size="sm" className="gap-1.5" asChild>
                  <Link href={item.href}>
                    Open {item.title}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground border-t border-border pt-4">
        After changing roles or limits, ask affected users to refresh or log in again if permissions appear stale.
      </p>
    </div>
  )
}
