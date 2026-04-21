'use client'

import React, { useState, useRef, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { PrintableReportHeader } from '@/components/ui/report-header'
import { useOrganizationStore } from '@/stores/organizationStore'
import {
  FileText,
  Download,
  Printer,
  TrendingUp,
  TrendingDown,
  Scale,
  BarChart3,
  PieChart,
  CheckCircle,
  AlertTriangle,
  Building2,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { FinanceModuleLinks } from '@/components/finance'
import {
  getTrialBalance,
  getIncomeStatement,
  getBalanceSheet,
  getCashFlowStatement,
  getGeneralLedger,
  formatReportPeriod,
  TrialBalanceReport,
  IncomeStatementReport,
  BalanceSheetReport,
  CashFlowReport,
} from '@/lib/api/reports'
import { useQuery as useAccountsQuery } from '@tanstack/react-query'
import { getAccountsTree, flattenAccountsTree } from '@/lib/api/chart-of-accounts'
import { getProjects } from '@/lib/api/projects'

interface GLReportData {
  report_type?: string
  report_currency?: string
  account?: { code?: string; name?: string }
  period?: { start_date?: string; end_date?: string }
  opening_balance?: number
  closing_balance?: number
  total_debit?: number
  total_credit?: number
  transactions?: Array<Record<string, unknown>>
}

function ReportsPageContent() {
  const searchParams = useSearchParams()
  const projectIdFromUrl = searchParams.get('project_id')
  const [activeReport, setActiveReport] = useState('trial-balance')
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [glAccountId, setGlAccountId] = useState<string>('')
  const [projectId, setProjectId] = useState<string>('all')
  const { branding, organization } = useOrganizationStore()
  const reportRef = useRef<HTMLDivElement>(null)

  // Sync project_id from URL once (e.g. from Projects page link). Use primitive deps to avoid update loop.
  useEffect(() => {
    if (projectIdFromUrl && projectIdFromUrl !== projectId) setProjectId(projectIdFromUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when URL param changes
  }, [projectIdFromUrl])

  // Sync report tab from URL (e.g. /reports?report=general-ledger from GL hub).
  const reportFromUrl = searchParams.get('report')
  useEffect(() => {
    if (reportFromUrl && ['trial-balance', 'income-statement', 'balance-sheet', 'cash-flow', 'general-ledger'].includes(reportFromUrl)) {
      setActiveReport(reportFromUrl)
    }
  }, [reportFromUrl])

  const projectIdNum = projectId === 'all' ? undefined : Number(projectId)

  const { data: projectsData } = useQuery({
    queryKey: ['projects-list-reports'],
    queryFn: () => getProjects({ per_page: 200, status: 'active' }),
  })
  const projects = Array.isArray(projectsData) ? projectsData : (projectsData?.data ?? [])
  const selectedProject = projects.find((p: { id: number }) => p.id === projectIdNum)

  const { toast } = useToast()
  
  const handlePrint = () => {
    window.print()
  }

  // Fetch Trial Balance (project-scoped when project selected)
  const { data: trialBalanceData, isLoading: tbLoading, refetch: refetchTB } = useQuery({
    queryKey: ['trial-balance', reportDate, projectIdNum],
    queryFn: () => getTrialBalance({ as_of_date: reportDate, project_id: projectIdNum }),
    enabled: activeReport === 'trial-balance',
  })

  // Fetch Income Statement (project-scoped when project selected)
  const { data: incomeStatementData, isLoading: isLoading, refetch: refetchIS } = useQuery({
    queryKey: ['income-statement', startDate, endDate, projectIdNum],
    queryFn: () => getIncomeStatement({ start_date: startDate, end_date: endDate, project_id: projectIdNum }),
    enabled: activeReport === 'income-statement',
  })

  // Fetch Balance Sheet (project-scoped when project selected)
  const { data: balanceSheetData, isLoading: bsLoading, refetch: refetchBS } = useQuery({
    queryKey: ['balance-sheet', reportDate, projectIdNum],
    queryFn: () => getBalanceSheet({ as_of_date: reportDate, project_id: projectIdNum }),
    enabled: activeReport === 'balance-sheet',
  })

  // Fetch Cash Flow (project-scoped when project selected)
  const { data: cashFlowData, isLoading: cfLoading, refetch: refetchCF } = useQuery({
    queryKey: ['cash-flow', startDate, endDate, projectIdNum],
    queryFn: () => getCashFlowStatement({ start_date: startDate, end_date: endDate, project_id: projectIdNum }),
    enabled: activeReport === 'cash-flow',
  })

  // Accounts for General Ledger report (posting only)
  const { data: accountsTreeData } = useAccountsQuery({
    queryKey: ['chart-of-accounts-tree'],
    queryFn: () => getAccountsTree(),
    enabled: activeReport === 'general-ledger',
  })
  const glAccounts = useMemo(() => {
    if (!accountsTreeData?.success || !accountsTreeData?.data) return []
    return flattenAccountsTree(accountsTreeData.data).filter((a: { is_posting?: boolean }) => a.is_posting)
  }, [accountsTreeData])

  // Fetch General Ledger (single account, date range; project-scoped when project selected)
  const { data: glReportData, isLoading: glLoading, refetch: refetchGL } = useQuery({
    queryKey: ['general-ledger-report', glAccountId, startDate, endDate, projectIdNum],
    queryFn: () =>
      getGeneralLedger({
        account_id: Number(glAccountId),
        start_date: startDate,
        end_date: endDate,
        project_id: projectIdNum,
      }),
    enabled: activeReport === 'general-ledger' && !!glAccountId && !!startDate && !!endDate,
  })

  const trialBalance: TrialBalanceReport | null = trialBalanceData?.data || null
  const incomeStatement: IncomeStatementReport | null = incomeStatementData?.data || null
  const balanceSheet: BalanceSheetReport | null = balanceSheetData?.data || null
  const cashFlow: CashFlowReport | null = cashFlowData?.data || null
  const glReport: GLReportData | null = glReportData?.data ?? null
  const glCurrency = glReport?.report_currency ?? 'AFN'

  const handleRunReport = () => {
    switch (activeReport) {
      case 'trial-balance':
        refetchTB()
        break
      case 'income-statement':
        refetchIS()
        break
      case 'balance-sheet':
        refetchBS()
        break
      case 'cash-flow':
        refetchCF()
        break
      case 'general-ledger':
        refetchGL()
        break
    }
    toast({ title: 'Report Generated', description: 'The report has been generated.' })
  }

  const reportCards = [
    { id: 'trial-balance', name: 'Trial Balance', icon: Scale, description: 'Verify account balances' },
    { id: 'income-statement', name: 'Income Statement', icon: TrendingUp, description: 'Revenue vs expenses' },
    { id: 'balance-sheet', name: 'Balance Sheet', icon: PieChart, description: 'Assets, liabilities, equity' },
    { id: 'cash-flow', name: 'Cash Flow', icon: BarChart3, description: 'Cash movements' },
    { id: 'general-ledger', name: 'General Ledger', icon: FileText, description: 'Ledger by account' },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Financial Reports</h1>
          <p className="text-muted-foreground">
            {selectedProject
              ? `Project finance lifecycle: ${selectedProject.project_name ?? selectedProject.project_code} — Journal → Ledger → Trial balance → Financial statements`
              : 'Generate and analyze financial statements. Select a project for project-level reports.'}
          </p>
        </div>
        <div className="flex gap-3 no-print">
          <Button variant="secondary">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="secondary" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>
      <FinanceModuleLinks variant="inline" className="no-print" />

      {/* Report Selection */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {reportCards.map((report) => (
          <Card
            key={report.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              activeReport === report.id && "ring-2 ring-slate-400"
            )}
            onClick={() => setActiveReport(report.id)}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className={cn(
                "h-12 w-12 rounded-lg flex items-center justify-center",
                activeReport === report.id ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                <report.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">{report.name}</p>
                <p className="text-xs text-muted-foreground">{report.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Report Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            {/* Project scope: each project has its own journal → ledger → trial balance → statements */}
            <div className="space-y-2 min-w-[200px]">
              <Label>Project (scope)</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Organization (all projects)</SelectItem>
                  {projects.map((p: { id: number; project_code: string; project_name: string }) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.project_name || p.project_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {activeReport === 'general-ledger' ? (
              <>
                <div className="space-y-2 min-w-[200px]">
                  <Label>Account</Label>
                  <Select value={glAccountId} onValueChange={setGlAccountId}>
                    <SelectTrigger className="w-[280px]">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {glAccounts.map((acc: { id: number; account_code: string; account_name?: string }) => (
                        <SelectItem key={acc.id} value={String(acc.id)}>
                          <span className="font-mono text-xs">{acc.account_code}</span>
                          <span className="text-muted-foreground ml-2 truncate">— {acc.account_name ?? ''}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <DatePicker value={startDate} onChange={setStartDate} maxDate={endDate} className="w-[200px]" />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <DatePicker value={endDate} onChange={setEndDate} minDate={startDate} className="w-[200px]" />
                </div>
              </>
            ) : (activeReport === 'trial-balance' || activeReport === 'balance-sheet') ? (
              <div className="space-y-2">
                <Label>As of Date</Label>
                <DatePicker
                  value={reportDate}
                  onChange={setReportDate}
                  className="w-[200px]"
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <DatePicker
                    value={startDate}
                    onChange={setStartDate}
                    maxDate={endDate}
                    className="w-[200px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <DatePicker
                    value={endDate}
                    onChange={setEndDate}
                    minDate={startDate}
                    className="w-[200px]"
                  />
                </div>
              </>
            )}
            <Button onClick={handleRunReport} disabled={activeReport === 'general-ledger' && !glAccountId}>
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      <Card ref={reportRef}>
        {/* Printable Header - only shows when printing */}
        <PrintableReportHeader
          title={reportCards.find(r => r.id === activeReport)?.name || 'Report'}
          subtitle={
            selectedProject
              ? `Project: ${selectedProject.project_name ?? selectedProject.project_code}${activeReport === 'general-ledger' && glReport ? ` · ${glReport.account?.code ?? ''} — ${glReport.account?.name ?? ''}` : ''}`
              : activeReport === 'general-ledger' && glReport ? `${glReport.account?.code ?? ''} — ${glReport.account?.name ?? ''}` : undefined
          }
          period={
            activeReport === 'trial-balance' || activeReport === 'balance-sheet'
              ? `As of ${formatDate(reportDate)}`
              : formatReportPeriod(startDate, endDate)
          }
          generatedAt={new Date().toLocaleString()}
        />
        
        <CardHeader className="no-print">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {(branding?.logo_url || organization?.logo_url) && (
                <img 
                  src={branding?.logo_url || organization?.logo_url || ''} 
                  alt="Logo" 
                  className="h-10 w-10 object-contain rounded-lg"
                />
              )}
              <span>
                {reportCards.find(r => r.id === activeReport)?.name}
              </span>
            </div>
            <span className="text-sm font-normal text-muted-foreground">
              {selectedProject && (
                <Badge variant="secondary" className="mr-2">
                  Project: {selectedProject.project_name ?? selectedProject.project_code}
                </Badge>
              )}
              {activeReport === 'general-ledger' && glReport
                ? `${glReport.account?.code ?? ''} — ${glReport.account?.name ?? ''} · ${formatReportPeriod(startDate, endDate)}`
                : activeReport === 'trial-balance' || activeReport === 'balance-sheet'
                  ? `As of ${formatDate(reportDate)}`
                  : formatReportPeriod(startDate, endDate)
              }
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Trial Balance */}
          {activeReport === 'trial-balance' && (
            <>
              {tbLoading && <ReportSkeleton />}
              {!tbLoading && trialBalance && (
                <div className="space-y-4">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left text-sm font-medium">Account Code</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Account Name</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Debit</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trialBalance.accounts.map((account, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="px-4 py-2 font-mono text-sm">{account.account_code}</td>
                          <td className="px-4 py-2">{account.account_name}</td>
                          <td className="px-4 py-2 text-right font-mono">{account.debit > 0 ? formatCurrency(account.debit) : '-'}</td>
                          <td className="px-4 py-2 text-right font-mono">{account.credit > 0 ? formatCurrency(account.credit) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted font-bold">
                        <td className="px-4 py-3" colSpan={2}>Total</td>
                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(trialBalance.totals.debit)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(trialBalance.totals.credit)}</td>
                      </tr>
                    </tfoot>
                  </table>
                  <div className="flex items-center gap-2">
                    {trialBalance.totals.balanced ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-green-600 font-medium">Trial Balance is in balance</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <span className="text-red-600 font-medium">Trial Balance is out of balance</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Income Statement */}
          {activeReport === 'income-statement' && (
            <>
              {isLoading && <ReportSkeleton />}
              {!isLoading && incomeStatement && (
                <div className="space-y-6">
                  {/* Revenue */}
                  <div>
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      Revenue
                    </h3>
                    <table className="w-full">
                      <tbody>
                        {incomeStatement.revenue.accounts.map((account, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="px-4 py-2 font-mono text-sm">{account.account_code}</td>
                            <td className="px-4 py-2">{account.account_name}</td>
                            <td className="px-4 py-2 text-right font-mono">{formatCurrency(account.balance)}</td>
                          </tr>
                        ))}
                        <tr className="bg-green-50 font-bold">
                          <td className="px-4 py-2" colSpan={2}>Total Revenue</td>
                          <td className="px-4 py-2 text-right font-mono text-green-600">{formatCurrency(incomeStatement.revenue.total)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Expenses */}
                  <div>
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-red-600" />
                      Expenses
                    </h3>
                    <table className="w-full">
                      <tbody>
                        {incomeStatement.expenses.accounts.map((account, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="px-4 py-2 font-mono text-sm">{account.account_code}</td>
                            <td className="px-4 py-2">{account.account_name}</td>
                            <td className="px-4 py-2 text-right font-mono">{formatCurrency(account.balance)}</td>
                          </tr>
                        ))}
                        <tr className="bg-red-50 font-bold">
                          <td className="px-4 py-2" colSpan={2}>Total Expenses</td>
                          <td className="px-4 py-2 text-right font-mono text-red-600">{formatCurrency(incomeStatement.expenses.total)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Net Income */}
                  <div className={cn(
                    "p-4 rounded-lg text-center",
                    incomeStatement.net_income >= 0 ? "bg-green-100" : "bg-red-100"
                  )}>
                    <p className="text-sm text-muted-foreground">{incomeStatement.net_income_label}</p>
                    <p className={cn(
                      "text-3xl font-bold",
                      incomeStatement.net_income >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {formatCurrency(Math.abs(incomeStatement.net_income))}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Balance Sheet */}
          {activeReport === 'balance-sheet' && (
            <>
              {bsLoading && <ReportSkeleton />}
              {!bsLoading && balanceSheet && (
                <div className="grid grid-cols-2 gap-6">
                  {/* Assets */}
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Assets</h3>
                    <table className="w-full">
                      <tbody>
                        {balanceSheet.assets.accounts.map((account, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="px-2 py-1 text-sm">{account.account_name}</td>
                            <td className="px-2 py-1 text-right font-mono text-sm">{formatCurrency(account.balance)}</td>
                          </tr>
                        ))}
                        <tr className="bg-emerald-50 font-bold">
                          <td className="px-2 py-2">Total Assets</td>
                          <td className="px-2 py-2 text-right font-mono">{formatCurrency(balanceSheet.assets.total)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Liabilities & Equity */}
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Liabilities</h3>
                    <table className="w-full mb-4">
                      <tbody>
                        {balanceSheet.liabilities.accounts.map((account, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="px-2 py-1 text-sm">{account.account_name}</td>
                            <td className="px-2 py-1 text-right font-mono text-sm">{formatCurrency(account.balance)}</td>
                          </tr>
                        ))}
                        <tr className="bg-orange-50 font-bold">
                          <td className="px-2 py-2">Total Liabilities</td>
                          <td className="px-2 py-2 text-right font-mono">{formatCurrency(balanceSheet.liabilities.total)}</td>
                        </tr>
                      </tbody>
                    </table>

                    <h3 className="font-semibold text-lg mb-2">Equity</h3>
                    <table className="w-full">
                      <tbody>
                        {balanceSheet.equity.accounts.map((account, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="px-2 py-1 text-sm">{account.account_name}</td>
                            <td className="px-2 py-1 text-right font-mono text-sm">{formatCurrency(account.balance)}</td>
                          </tr>
                        ))}
                        <tr className="border-b">
                          <td className="px-2 py-1 text-sm">Retained Earnings</td>
                          <td className="px-2 py-1 text-right font-mono text-sm">{formatCurrency(balanceSheet.equity.retained_earnings)}</td>
                        </tr>
                        <tr className="bg-green-50 font-bold">
                          <td className="px-2 py-2">Total Equity</td>
                          <td className="px-2 py-2 text-right font-mono">{formatCurrency(balanceSheet.equity.total)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Balance Check */}
                  <div className="col-span-2 p-4 bg-muted rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Liabilities + Equity</p>
                        <p className="text-xl font-bold">{formatCurrency(balanceSheet.total_liabilities_and_equity)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {balanceSheet.balanced ? (
                          <>
                            <CheckCircle className="h-6 w-6 text-green-600" />
                            <span className="text-green-600 font-medium">Balanced</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-6 w-6 text-red-600" />
                            <span className="text-red-600 font-medium">Not Balanced</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Cash Flow */}
          {activeReport === 'cash-flow' && (
            <>
              {cfLoading && <ReportSkeleton />}
              {!cfLoading && cashFlow && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Opening Cash Balance</p>
                      <p className="text-2xl font-bold">{formatCurrency(cashFlow.opening_balance)}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Closing Cash Balance</p>
                      <p className="text-2xl font-bold">{formatCurrency(cashFlow.closing_balance)}</p>
                    </div>
                  </div>

                  <table className="w-full">
                    <tbody>
                      <tr className="border-b">
                        <td className="px-4 py-3 font-medium">Operating Activities</td>
                        <td className={cn(
                          "px-4 py-3 text-right font-mono",
                          cashFlow.operating_activities >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {cashFlow.operating_activities >= 0 ? '+' : ''}{formatCurrency(cashFlow.operating_activities)}
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-4 py-3 font-medium">Investing Activities</td>
                        <td className={cn(
                          "px-4 py-3 text-right font-mono",
                          cashFlow.investing_activities >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {cashFlow.investing_activities >= 0 ? '+' : ''}{formatCurrency(cashFlow.investing_activities)}
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-4 py-3 font-medium">Financing Activities</td>
                        <td className={cn(
                          "px-4 py-3 text-right font-mono",
                          cashFlow.financing_activities >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {cashFlow.financing_activities >= 0 ? '+' : ''}{formatCurrency(cashFlow.financing_activities)}
                        </td>
                      </tr>
                      <tr className="bg-muted font-bold">
                        <td className="px-4 py-3">Net Change in Cash</td>
                        <td className={cn(
                          "px-4 py-3 text-right font-mono",
                          cashFlow.net_change_in_cash >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {cashFlow.net_change_in_cash >= 0 ? '+' : ''}{formatCurrency(cashFlow.net_change_in_cash)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* General Ledger */}
          {activeReport === 'general-ledger' && (
            <>
              {glLoading && <ReportSkeleton />}
              {!glLoading && glReport && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/40">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Opening balance</p>
                      <p className="font-mono font-semibold mt-0.5">{formatCurrency(glReport.opening_balance ?? 0, glCurrency)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total debit</p>
                      <p className="font-mono font-semibold mt-0.5">{formatCurrency(glReport.total_debit ?? 0, glCurrency)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total credit</p>
                      <p className="font-mono font-semibold mt-0.5">{formatCurrency(glReport.total_credit ?? 0, glCurrency)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Closing balance</p>
                      <p className="font-mono font-semibold mt-0.5">{formatCurrency(glReport.closing_balance ?? 0, glCurrency)}</p>
                    </div>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/60">
                          <th className="px-4 py-3 text-left font-semibold">Date</th>
                          <th className="px-4 py-3 text-left font-semibold">Reference</th>
                          <th className="px-4 py-3 text-left font-semibold">Description</th>
                          <th className="px-4 py-3 text-right font-semibold">Debit</th>
                          <th className="px-4 py-3 text-right font-semibold">Credit</th>
                          <th className="px-4 py-3 text-right font-semibold">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(glReport.transactions ?? []).map((tx: Record<string, unknown>, idx: number) => {
                          const je = (tx.journal_entry ?? tx) as Record<string, unknown>
                          return (
                            <tr key={idx} className="border-b hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(String(je.entry_date ?? tx.entry_date ?? ''))}</td>
                              <td className="px-4 py-2.5 font-mono text-xs">{String(je.entry_number ?? tx.entry_number ?? '')}</td>
                              <td className="px-4 py-2.5 max-w-[200px] truncate" title={String(je.description ?? tx.description ?? '')}>
                                {String(je.description ?? tx.description ?? '')}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                                {(tx.report_debit as number) > 0 ? formatCurrency(tx.report_debit as number, glCurrency) : '—'}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                                {(tx.report_credit as number) > 0 ? formatCurrency(tx.report_credit as number, glCurrency) : '—'}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono tabular-nums font-medium">
                                {formatCurrency((tx.running_balance as number) ?? 0, glCurrency)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/60 font-semibold">
                          <td className="px-4 py-3" colSpan={3}>Totals</td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums">{formatCurrency(glReport.total_debit ?? 0, glCurrency)}</td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums">{formatCurrency(glReport.total_credit ?? 0, glCurrency)}</td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums">{formatCurrency(glReport.closing_balance ?? 0, glCurrency)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
              {!glLoading && activeReport === 'general-ledger' && glAccountId && !glReport && (
                <div className="py-8 text-center text-muted-foreground">
                  <p className="font-medium">No transactions in the selected period</p>
                  <p className="text-sm mt-1">Try a different date range or account.</p>
                </div>
              )}
              {activeReport === 'general-ledger' && !glAccountId && (
                <div className="py-8 text-center text-muted-foreground">
                  <p className="font-medium">Select an account and date range, then click Generate Report.</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <ReportsPageContent />
    </Suspense>
  )
}

function ReportSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex justify-between">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}
