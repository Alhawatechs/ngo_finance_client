'use client'

import React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart3, FolderOpen, TrendingUp, Wallet, FileText, ArrowRight, FileSpreadsheet, Landmark, PieChart } from 'lucide-react'
import { getProjectsSummary } from '@/lib/api/projects'
import { formatCurrency } from '@/lib/utils'
import { ProjectsPageHeader } from '@/components/projects/PageHeader'
import { ProjectsPageLayout } from '../ProjectsPageLayout'

const PROJECT_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

/** Single report entry for the "All project-related reports" section */
function ReportLink({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string
  title: string
  description: string
  icon: React.ElementType
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-lg border border-slate-200/80 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50/50"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-800">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 mt-1" />
    </Link>
  )
}

export default function ProjectReportsPage() {
  const { data: summaryResponse, isLoading } = useQuery({
    queryKey: ['projects-summary-reports'],
    queryFn: () => getProjectsSummary(),
  })

  const summary = (summaryResponse as { data?: unknown })?.data ?? summaryResponse
  const totalProjects = (summary as { total_projects?: number })?.total_projects ?? 0
  const activeProjects = (summary as { active_projects?: number })?.active_projects ?? 0
  const totalBudget = (summary as { total_budget?: number })?.total_budget ?? null
  const totalSpent = (summary as { total_spent?: number })?.total_spent ?? null
  const utilizationRate = (summary as { utilization_rate?: number })?.utilization_rate ?? null
  const byCurrency = (summary as { by_currency?: { currency: string; total_budget: number; total_spent: number; project_count: number; utilization_rate: number }[] })?.by_currency ?? []
  const byStatus = (summary as { by_status?: Record<string, { count: number; budget: number; spent: number }> })?.by_status ?? {}

  const statusEntries = Object.entries(byStatus).sort((a, b) => b[1].count - a[1].count)

  return (
    <ProjectsPageLayout>
      <ProjectsPageHeader
        title="Project Reports"
        description="Track and access all reports related to projects—portfolio summary, financial statements by project, donor reports, budget reports, and exports."
        breadcrumbs={[
          { label: 'Project list', href: '/projects' },
          { label: 'Project Reports' },
        ]}
      />

      {/* Portfolio at a glance */}
      <section className="mb-8" aria-labelledby="portfolio-heading">
        <h2 id="portfolio-heading" className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
          Portfolio at a glance
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader className="pb-1.5 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <FolderOpen className="h-3.5 w-3.5" /> Total projects
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 px-4 pt-0">
                <p className="text-2xl font-semibold tabular-nums text-slate-800">{totalProjects}</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader className="pb-1.5 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-emerald-600 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5" /> Active
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 px-4 pt-0">
                <p className="text-2xl font-semibold tabular-nums text-emerald-700">{activeProjects}</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader className="pb-1.5 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Wallet className="h-3.5 w-3.5" /> Budget
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 px-4 pt-0">
                {byCurrency.length > 1 ? (
                  <div className="space-y-0.5">
                    {byCurrency.map((row) => (
                      <p key={row.currency} className="text-base font-semibold tabular-nums text-slate-800">
                        {formatCurrency(row.total_budget ?? 0, row.currency)}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-2xl font-semibold tabular-nums text-slate-800">
                    {totalBudget != null ? formatCurrency(totalBudget, byCurrency[0]?.currency ?? 'USD') : '—'}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader className="pb-1.5 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">Spent · Utilization</CardTitle>
              </CardHeader>
              <CardContent className="pb-4 px-4 pt-0">
                {byCurrency.length > 1 ? (
                  <div className="space-y-0.5">
                    {byCurrency.map((row) => (
                      <p key={row.currency} className="text-sm font-semibold tabular-nums text-slate-800">
                        {formatCurrency(row.total_spent ?? 0, row.currency)}
                        {row.utilization_rate != null && ` · ${row.utilization_rate}%`}
                      </p>
                    ))}
                  </div>
                ) : (
                  <>
                    <p className="text-xl font-semibold tabular-nums text-amber-800">
                      {totalSpent != null ? formatCurrency(totalSpent, byCurrency[0]?.currency ?? 'USD') : '—'}
                    </p>
                    {utilizationRate != null && <p className="text-xs text-slate-500 mt-0.5">{utilizationRate}% utilization</p>}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      {/* Analytics: By status & By currency */}
      <section className="mb-8" aria-labelledby="analytics-heading">
        <h2 id="analytics-heading" className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
          Analytics
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-slate-600" />
                By status
              </CardTitle>
              <p className="text-xs text-slate-500">Project count, budget and spent by status</p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : statusEntries.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">No project data</p>
              ) : (
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 uppercase tracking-wider">
                        <th className="text-left py-2.5 px-3 font-medium text-slate-600">Status</th>
                        <th className="text-right py-2.5 px-3 font-medium text-slate-600">Count</th>
                        <th className="text-right py-2.5 px-3 font-medium text-slate-600">Budget</th>
                        <th className="text-right py-2.5 px-3 font-medium text-slate-600">Spent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {statusEntries.map(([status, row]) => (
                        <tr key={status} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-medium text-slate-800">{PROJECT_STATUS_LABELS[status] ?? status}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums">{row.count}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums">{formatCurrency(row.budget ?? 0, 'USD')}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-amber-800">{formatCurrency(row.spent ?? 0, 'USD')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-slate-600" />
                By currency
              </CardTitle>
              <p className="text-xs text-slate-500">Budget, spent and utilization per currency</p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : byCurrency.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">No project data</p>
              ) : (
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 uppercase tracking-wider">
                        <th className="text-left py-2.5 px-3 font-medium text-slate-600">Currency</th>
                        <th className="text-right py-2.5 px-3 font-medium text-slate-600">Projects</th>
                        <th className="text-right py-2.5 px-3 font-medium text-slate-600">Budget</th>
                        <th className="text-right py-2.5 px-3 font-medium text-slate-600">Spent</th>
                        <th className="text-right py-2.5 px-3 font-medium text-slate-600">Util %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {byCurrency.map((row) => (
                        <tr key={row.currency} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-medium font-mono text-slate-800">{row.currency}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums">{row.project_count ?? 0}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums">{formatCurrency(row.total_budget ?? 0, row.currency)}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-amber-800">{formatCurrency(row.total_spent ?? 0, row.currency)}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums">{row.utilization_rate != null ? `${row.utilization_rate}%` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* All project-related reports — central hub */}
      <section className="mb-6" aria-labelledby="reports-hub-heading">
        <h2 id="reports-hub-heading" className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
          All project-related reports
        </h2>
        <p className="text-sm text-slate-600 mb-4 max-w-2xl">
          Use these reports to track project performance, finances, donors, and budgets. Filter by project where applicable.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ReportLink
            href="/projects"
            title="Project list"
            description="View and export the full project portfolio (Excel, PDF, CSV)"
            icon={FolderOpen}
          />
          <ReportLink
            href="/reports"
            title="Trial Balance &amp; Statements"
            description="Income statement, balance sheet, cash flow; filter by project"
            icon={FileText}
          />
          <ReportLink
            href="/reports/donor-reports"
            title="Donor reports"
            description="Donor-level financial reports and project funding"
            icon={Landmark}
          />
          <ReportLink
            href="/projects/budget/reports"
            title="Budget reports"
            description="Budget list, amendments, and budget vs actual"
            icon={PieChart}
          />
          <ReportLink
            href="/projects/donor-funds/reports"
            title="Fund reports"
            description="Donor fund balances and fund-level reports"
            icon={BarChart3}
          />
        </div>
      </section>
    </ProjectsPageLayout>
  )
}
