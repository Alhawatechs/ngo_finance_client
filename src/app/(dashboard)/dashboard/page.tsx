'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, timeAgo, cn, getCurrencyIsoCode } from '@/lib/utils'
import { useOrganizationStore } from '@/stores/organizationStore'
import {
  Wallet,
  DollarSign,
  PiggyBank,
  ClipboardList,
  FolderKanban,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  AlertTriangle,
  Banknote,
  FileText,
  CheckCircle2,
  Clock,
  Building2,
  RefreshCw,
  Download,
  Eye,
  MoreHorizontal,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import {
  getDashboardOverview,
  getMonthlyTrends,
  getAlerts,
  DashboardSummary,
  CashPosition,
  BudgetStatus,
  Alert,
  MonthlyTrend,
} from '@/lib/api/dashboard'

export default function DashboardPage() {
  const organization = useOrganizationStore((s) => s.organization)
  const fetchOrganization = useOrganizationStore((s) => s.fetchOrganization)

  useEffect(() => {
    void fetchOrganization()
  }, [fetchOrganization])

  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: getDashboardOverview,
    refetchInterval: 5 * 60 * 1000, // 5 min - matches backend cache, reduces load
  })

  const { data: alertsData } = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: getAlerts,
    staleTime: 2 * 60 * 1000, // 2 min - alerts don't need real-time
  })

  const { data: trendsData } = useQuery({
    queryKey: ['dashboard-trends', 6],
    queryFn: () => getMonthlyTrends(6),
    staleTime: 5 * 60 * 1000, // 5 min - trends are historical
  })

  const summary: DashboardSummary | null = dashboardData?.data?.summary || null
  const cashPosition: CashPosition | null = dashboardData?.data?.cash_position || null
  const budgetStatus: BudgetStatus | null = dashboardData?.data?.budget_status || null
  const recentVouchers = dashboardData?.data?.recent_vouchers || []
  const pendingApprovals = dashboardData?.data?.pending_approvals || []
  const alerts: Alert[] = alertsData?.data || []
  const trends: MonthlyTrend[] = trendsData?.data?.monthly_data || []

  // Same source as General Ledger → Currency (GlBaseCurrencyStrip / org settings): org default first, then API.
  const baseCurrency = getCurrencyIsoCode(
    organization?.default_currency ??
      summary?.default_currency ??
      budgetStatus?.default_currency ??
      cashPosition?.default_currency
  )
  const quickStats = [
    { label: 'Total Budget', value: formatCurrency(budgetStatus?.total_budget_base ?? budgetStatus?.total_budget ?? 0, baseCurrency), icon: Wallet },
    { label: 'Utilized', value: formatCurrency(budgetStatus?.total_spent_base ?? budgetStatus?.total_spent ?? 0, baseCurrency), icon: DollarSign, change: '+12%', up: true },
    { label: 'Remaining', value: formatCurrency(budgetStatus?.available_base ?? budgetStatus?.available ?? 0, baseCurrency), icon: PiggyBank },
    { label: 'Pending', value: summary?.pending_approvals || 0, icon: ClipboardList },
    { label: 'Projects', value: summary?.active_projects || 0, icon: FolderKanban },
    { label: 'Liquidity', value: formatCurrency(summary?.total_liquidity_base ?? summary?.total_liquidity ?? 0, baseCurrency), icon: Banknote },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back! Here's your financial overview.</p>
          <p className="text-xs text-muted-foreground mt-2">
            Figures use your organization base currency ({baseCurrency}), same as General Ledger.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-10 px-4 rounded-lg border-gray-300 text-gray-600 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-200"
            onClick={() => refetch()}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-10 px-4 rounded-lg border-gray-300 text-gray-600 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-200">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Link href="/vouchers">
            <Button size="sm" className="h-10 px-4 rounded-lg">
              <Plus className="h-4 w-4 mr-2" />
              New Voucher
            </Button>
          </Link>
        </div>
      </div>

      {/* Finance quick links */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border bg-card">
        <span className="text-sm font-medium text-muted-foreground mr-2">Finance:</span>
        <Link href="/general-ledger" className="text-sm font-medium text-primary hover:underline">General Ledger</Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/general-ledger/journal-entries" className="text-sm font-medium text-primary hover:underline">Journal</Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/vouchers" className="text-sm font-medium text-primary hover:underline">Vouchers</Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/reports" className="text-sm font-medium text-primary hover:underline">Trial Balance &amp; Reports</Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/general-ledger/accounts" className="text-sm font-medium text-primary hover:underline">Chart of Accounts</Link>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.slice(0, 2).map((alert, idx) => (
            <div 
              key={idx} 
              className={cn(
                "alert",
                alert.type === 'error' ? "alert-danger" :
                alert.type === 'warning' ? "alert-warning" : "alert-primary"
              )}
            >
              <AlertTriangle className="alert-icon" />
              <div className="alert-content">
                <p className="alert-title">{alert.title}</p>
                <p className="alert-description">{alert.message}</p>
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="card card-body">
              <Skeleton className="h-12 w-12 rounded-xl mb-4" />
              <Skeleton className="h-6 w-24 mb-2" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))
        ) : (
          quickStats.map((stat, idx) => (
            <div key={idx} className="card card-hover card-body cursor-pointer group">
              <div className="stat-card-icon bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                <stat.icon className="h-6 w-6" strokeWidth={1.75} />
              </div>
              <p className="stat-card-value">{stat.value}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="stat-card-label">{stat.label}</p>
                {stat.change && (
                  <span className={cn("stat-card-change", stat.up ? "positive" : "negative")}>
                    {stat.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {stat.change}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Main Content Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Budget Utilization */}
        <Link href="/budget/tracking" className="lg:col-span-2 card block hover:shadow-md transition-shadow">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                <TrendingUp className="h-5 w-5" strokeWidth={2} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Budget Utilization</h3>
                <p className="text-sm text-gray-500">Current fiscal year progress</p>
              </div>
            </div>
            <span className="text-sm font-medium text-primary flex items-center gap-1">
              <Eye className="h-4 w-4" />
              Details
            </span>
          </div>
          <div className="card-body">
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <p className="text-4xl font-bold text-gray-900">{budgetStatus?.utilization_rate || 0}%</p>
                    <p className="text-sm text-gray-500 mt-1">of total budget utilized</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(
                        budgetStatus?.total_spent_base ?? budgetStatus?.total_spent ?? 0,
                        baseCurrency
                      )}
                    </p>
                    <p className="text-sm text-gray-500">
                      of{' '}
                      {formatCurrency(
                        budgetStatus?.total_budget_base ?? budgetStatus?.total_budget ?? 0,
                        baseCurrency
                      )}
                    </p>
                  </div>
                </div>
                <div className="progress h-3">
                  <div 
                    className={cn(
                      "progress-bar",
                      (budgetStatus?.utilization_rate || 0) <= 50 ? "progress-bar-success" :
                      (budgetStatus?.utilization_rate || 0) <= 80 ? "progress-bar-primary" : "progress-bar-danger"
                    )}
                    style={{ width: `${budgetStatus?.utilization_rate || 0}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Safe (&lt;50%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-800" />
                      Normal (50-80%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      High (&gt;80%)
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </Link>

        {/* Cash Position */}
        <Link href="/treasury/cash" className="card block hover:shadow-md transition-shadow">
          <div className="card-header flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <Banknote className="h-5 w-5" strokeWidth={2} />
            </div>
            <h3 className="font-semibold text-gray-900">Cash Position</h3>
          </div>
          <div className="card-body">
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <Banknote className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Cash Balance</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-700">
                    {formatCurrency(
                      cashPosition?.cash?.total_base ?? cashPosition?.cash?.total ?? 0,
                      baseCurrency
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-emerald-700" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Bank Balance</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-800">
                    {formatCurrency(
                      cashPosition?.bank?.total_base ?? cashPosition?.bank?.total ?? 0,
                      baseCurrency
                    )}
                  </span>
                </div>
                <div className="divider" />
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700">Total Liquidity</span>
                  <span className="text-xl font-bold text-gray-900">
                    {formatCurrency(
                      (cashPosition?.cash?.total_base ?? cashPosition?.cash?.total ?? 0) +
                        (cashPosition?.bank?.total_base ?? cashPosition?.bank?.total ?? 0),
                      baseCurrency
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* Second Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                <TrendingUp className="h-5 w-5" strokeWidth={2} />
              </div>
              <h3 className="font-semibold text-gray-900">Monthly Trends</h3>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="badge badge-success">Revenue</span>
              <span className="badge badge-danger">Expenses</span>
            </div>
          </div>
          <div className="card-body p-0">
            <div className="divide-y divide-gray-100">
              {trends.slice(-4).map((trend, idx) => (
                <div key={idx} className="flex items-center justify-between px-5 py-3 hover:bg-emerald-50/50 transition-colors">
                  <span className="text-sm font-medium text-gray-600 w-16">{trend.month}</span>
                  <div className="flex items-center gap-6 text-sm">
                    <span className="text-emerald-600 font-semibold w-24 text-right">
                      +{formatCurrency(trend.revenue, baseCurrency)}
                    </span>
                    <span className="text-red-500 font-semibold w-24 text-right">
                      -{formatCurrency(trend.expenses, baseCurrency)}
                    </span>
                    <span className={cn(
                      "font-bold w-24 text-right px-2.5 py-1 rounded-lg",
                      trend.net >= 0 ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50"
                    )}>
                      {trend.net >= 0 ? '+' : ''}{formatCurrency(trend.net, baseCurrency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                <Clock className="h-5 w-5" strokeWidth={2} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Pending Approvals</h3>
                <p className="text-xs text-gray-500">{summary?.pending_approvals || 0} items awaiting action</p>
              </div>
            </div>
          </div>
          <div className="card-body p-0">
            {isLoading ? (
              <div className="p-5">
                <Skeleton className="h-40 w-full" />
              </div>
            ) : pendingApprovals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                </div>
                <p className="font-semibold text-gray-900">All caught up!</p>
                <p className="text-sm text-gray-500 mt-1">No pending approvals</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {pendingApprovals.slice(0, 4).map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between px-5 py-3 hover:bg-emerald-50/50 transition-colors cursor-pointer">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 font-mono">{item.voucher_number}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.office}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(item.amount, item.currency ?? baseCurrency)}</p>
                      <span className="badge badge-warning text-[10px]">Level {item.current_level}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {pendingApprovals.length > 0 && (
            <div className="card-footer">
              <Link href="/approvals" className="flex items-center justify-center gap-1 text-sm font-medium text-emerald-800 hover:text-emerald-900">
                View all pending
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Recent Vouchers */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <FileText className="h-5 w-5" strokeWidth={2} />
            </div>
            <h3 className="font-semibold text-gray-900">Recent Vouchers</h3>
          </div>
          <Link href="/vouchers">
            <Button variant="ghost" size="sm" className="text-emerald-800 hover:text-emerald-900">
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
        
        {isLoading ? (
          <div className="card-body space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Voucher #</th>
                  <th>Payee</th>
                  <th>Office</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentVouchers.map((voucher: any) => (
                  <tr key={voucher.id}>
                    <td>
                      <span className="font-mono font-medium text-gray-900">{voucher.voucher_number}</span>
                    </td>
                    <td className="text-gray-600">{voucher.payee}</td>
                    <td className="text-gray-600">{voucher.office}</td>
                    <td className="font-semibold text-gray-900">{formatCurrency(voucher.amount, voucher.currency ?? baseCurrency)}</td>
                    <td>
                      <span className={cn(
                        "badge",
                        voucher.status === 'approved' ? "badge-success" :
                        voucher.status === 'pending_approval' ? "badge-warning" :
                        voucher.status === 'posted' ? "badge-primary" : "badge-secondary"
                      )}>
                        {voucher.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="text-gray-500 text-sm">{timeAgo(voucher.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
