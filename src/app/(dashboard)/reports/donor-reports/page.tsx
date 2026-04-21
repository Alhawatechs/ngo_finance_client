'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  FileText,
  Download,
  Printer,
  Globe,
  FolderKanban,
  DollarSign,
  TrendingUp,
  PieChart,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { getDonors, Donor } from '@/lib/api/donors'
import { getDonorReport, DONOR_REPORT_FORMATS } from '@/lib/api/reports'
import apiClient from '@/lib/api/client'

export default function DonorReportsPage() {
  const [selectedDonor, setSelectedDonor] = useState<string>('')
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [reportFormat, setReportFormat] = useState('standard')

  const { toast } = useToast()

  // Fetch donors
  const { data: donorsData } = useQuery({
    queryKey: ['donors-list'],
    queryFn: () => getDonors({ per_page: 100, is_active: true }),
  })

  const donors: Donor[] = donorsData?.data || []

  // Fetch donor report
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['donor-report', selectedDonor, startDate, endDate, reportFormat],
    queryFn: async () => {
      const response = await apiClient.get('/reports/donor', {
        params: {
          donor_id: parseInt(selectedDonor),
          start_date: startDate,
          end_date: endDate,
          format: reportFormat,
        }
      })
      return response.data
    },
    enabled: !!selectedDonor,
  })

  const report = reportData?.data

  const handleGenerateReport = () => {
    if (!selectedDonor) {
      toast({ title: 'Error', description: 'Please select a donor', variant: 'destructive' })
      return
    }
    refetch()
    toast({ title: 'Report Generated', description: 'The donor report has been generated.' })
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Donor Reports</h1>
          <p className="text-muted-foreground">
            Generate donor-specific financial reports in various formats
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" disabled={!report}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="secondary" disabled={!report}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Report Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Parameters</CardTitle>
          <CardDescription>Select donor and reporting period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4 items-end">
            <div className="space-y-2">
              <Label required>Donor</Label>
              <Select value={selectedDonor} onValueChange={setSelectedDonor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select donor" />
                </SelectTrigger>
                <SelectContent>
                  {donors.map((donor) => (
                    <SelectItem key={donor.id} value={donor.id.toString()}>
                      {donor.code} - {donor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <DatePicker value={startDate} onChange={setStartDate} maxDate={endDate} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <DatePicker value={endDate} onChange={setEndDate} minDate={startDate} />
            </div>
            <div className="space-y-2">
              <Label>Report Format</Label>
              <Select value={reportFormat} onValueChange={setReportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DONOR_REPORT_FORMATS.map((format) => (
                    <SelectItem key={format.id} value={format.id}>
                      {format.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerateReport}>
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {isLoading && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
              <div className="grid grid-cols-4 gap-4 mt-6">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && report && (
        <>
          {/* Report Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Globe className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{report.donor.name}</h2>
                    <p className="text-muted-foreground">
                      {report.donor.code} | {report.donor.type}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Reporting Period</p>
                  <p className="font-medium">
                    {formatDate(report.period.start_date)} - {formatDate(report.period.end_date)}
                  </p>
                  <Badge variant="outline" className="mt-1">
                    {DONOR_REPORT_FORMATS.find(f => f.id === reportFormat)?.name}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{report.summary.total_grants}</p>
                    <p className="text-sm text-muted-foreground">Grants</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <FolderKanban className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{report.summary.total_projects}</p>
                    <p className="text-sm text-muted-foreground">Projects</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(report.summary.total_budget)}</p>
                    <p className="text-sm text-muted-foreground">Total Budget</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{report.summary.utilization_rate}%</p>
                    <p className="text-sm text-muted-foreground">Utilization</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Total Budget</span>
                  <span className="font-mono font-bold">{formatCurrency(report.summary.total_budget)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Total Disbursed</span>
                  <span className="font-mono">{formatCurrency(report.summary.total_disbursed)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Total Expenditure</span>
                  <span className="font-mono text-red-600">{formatCurrency(report.summary.total_expenditure)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b bg-muted px-2 rounded">
                  <span className="font-medium">Remaining Budget</span>
                  <span className="font-mono font-bold text-green-600">{formatCurrency(report.summary.remaining_budget)}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Budget Utilization</span>
                    <span>{report.summary.utilization_rate}%</span>
                  </div>
                  <Progress value={report.summary.utilization_rate} className="h-3" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* By Project */}
          <Card>
            <CardHeader>
              <CardTitle>Expenditure by Project</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">Project</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Budget</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Expenditure</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {report.by_project.map((project: any, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs text-muted-foreground">{project.project_code}</p>
                        <p>{project.project_name}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(project.total_budget)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(project.expenditures)}</td>
                      <td className="px-4 py-3">
                        <div className="w-24 mx-auto">
                          <Progress value={project.utilization} className="h-2" />
                          <p className="text-xs text-center mt-1">{project.utilization}%</p>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* By Category */}
          <Card>
            <CardHeader>
              <CardTitle>Expenditure by Category</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Amount</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {report.by_category.map((category: any, idx: number) => {
                    const percentage = report.summary.total_expenditure > 0
                      ? ((category.amount / report.summary.total_expenditure) * 100).toFixed(1)
                      : 0
                    return (
                      <tr key={idx} className="border-b">
                        <td className="px-4 py-3">{category.category}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(category.amount)}</td>
                        <td className="px-4 py-3 text-right">{percentage}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {!isLoading && !report && selectedDonor && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No data available for the selected period. Click &quot;Generate Report&quot; to load the report.
          </CardContent>
        </Card>
      )}

      {!selectedDonor && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Select a donor and click &quot;Generate Report&quot; to view the financial report.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
