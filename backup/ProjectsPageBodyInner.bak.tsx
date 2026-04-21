'use client'
// @ts-nocheck - backup file, not used in build
import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { CurrencySelect } from '@/components/ui/currency-select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Plus, RefreshCw, Eye, Edit, Trash2, Search, FolderKanban, FileText, Receipt, BarChart3, Upload, FilePlus, X, FileWarning, AlertTriangle } from 'lucide-react'
import { ActionMenu } from '@/components/ui/action-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { ProjectsPageHeader } from '@/components/projects/PageHeader'
import { FinanceDataTable, FinanceDataTableHeader, FinanceDataTableTh, FinanceDataTableRow, FinanceDataTableTd, FinancePagination } from '@/components/finance/DataTable'
import { getProjectStatusLabel, getProjectStatusColor, getGrantTypeLabel, calculateUtilization, type GrantDocumentType, GrantFormData } from '@/lib/api/projects'

export function ProjectsPageBodyInner({ c }: { c: Record<string, any> }) {
  return (
    <div className="contents">
      <ProjectsPageHeader
        title="Project Portfolio"
        description="View and manage all projects, track budget utilization and timelines"
        breadcrumbs={[]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => c.refetch()} disabled={c.isLoading}>
              <RefreshCw className={typeof c.cn === 'function' ? c.cn('h-4 w-4 mr-2', c.isLoading && 'animate-spin') : 'h-4 w-4 mr-2'} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => { c.setEditingProject(null); c.resetForm(); c.setProjectDialogOpen(true) }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </Button>
          </div>
        }
      />

      <Card className="border-gray-100">
        <CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-3">Filter portfolio</p>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or code..."
                value={c.searchQuery}
                onChange={(e) => c.setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={c.filterStatus} onValueChange={c.setFilterStatus}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_hold">On hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">All projects</CardTitle>
          <p className="text-sm text-muted-foreground mt-0.5">
            {c.isError
              ? 'Could not load projects'
              : c.pagination
                ? `${c.pagination.total} project${c.pagination.total !== 1 ? 's' : ''} in portfolio`
                : 'Loadingâ€¦'}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {c.isError && (
            <div className="p-6 text-center border-b">
              <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Failed to load projects</p>
              <p className="text-xs text-muted-foreground mt-1">
                {(c.error as any)?.response?.data?.message || (c.error as Error)?.message || 'Please try again.'}
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => c.refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          )}
          <FinanceDataTable className="border-0">
            <table className="w-full text-xs projects-portfolio-table">
              <FinanceDataTableHeader>
                <FinanceDataTableTh className="min-w-[40px] w-10 py-2 px-2.5 text-xs font-semibold text-foreground/90">No</FinanceDataTableTh>
                <FinanceDataTableTh className="min-w-[80px] py-2 px-2.5 text-xs font-semibold text-foreground/90">Code</FinanceDataTableTh>
                <FinanceDataTableTh className="min-w-[140px] py-2 px-2.5 text-xs font-semibold text-foreground/90">Project name</FinanceDataTableTh>
                <FinanceDataTableTh className="min-w-[100px] py-2 px-2.5 text-xs font-semibold text-foreground/90">Donor</FinanceDataTableTh>
                <FinanceDataTableTh className="min-w-[100px] py-2 px-2.5 text-xs font-semibold text-foreground/90">Fund Type</FinanceDataTableTh>
                <FinanceDataTableTh className="min-w-[72px] py-2 px-2.5 text-xs font-semibold text-foreground/90">Sector</FinanceDataTableTh>
                <FinanceDataTableTh className="min-w-[80px] py-2 px-2.5 text-xs font-semibold text-foreground/90">Location</FinanceDataTableTh>
                <FinanceDataTableTh className="min-w-[78px] py-2 px-2.5 text-xs font-semibold text-foreground/90">From</FinanceDataTableTh>
                <FinanceDataTableTh className="min-w-[78px] py-2 px-2.5 text-xs font-semibold text-foreground/90">To</FinanceDataTableTh>
                <FinanceDataTableTh align="right" className="min-w-[76px] py-2 px-2.5 text-xs font-semibold text-foreground/90">Budget</FinanceDataTableTh>
                <FinanceDataTableTh align="right" className="min-w-[68px] py-2 px-2.5 text-xs font-semibold text-foreground/90">Spent</FinanceDataTableTh>
                <FinanceDataTableTh align="right" className="min-w-[56px] py-2 px-2.5 text-xs font-semibold text-foreground/90">Util %</FinanceDataTableTh>
                <FinanceDataTableTh className="min-w-[82px] py-2 px-2.5 text-xs font-semibold text-foreground/90">Status</FinanceDataTableTh>
                <FinanceDataTableTh align="center" className="min-w-[52px] w-[52px] py-2 px-2.5 text-xs font-semibold text-foreground/90">Actions</FinanceDataTableTh>
              </FinanceDataTableHeader>
              <tbody>
                {c.isLoading && (
                  [...Array(10)].map((_: unknown, i: number) => (
                    <FinanceDataTableRow key={i} className="even:bg-muted/15">
                      <FinanceDataTableTd className="py-2 px-2.5"><Skeleton className="h-3.5 w-5" /></FinanceDataTableTd>
                      <FinanceDataTableTd className="py-2 px-2.5"><Skeleton className="h-3.5 w-14" /></FinanceDataTableTd>
                      <FinanceDataTableTd className="py-2 px-2.5"><Skeleton className="h-3.5 w-28" /></FinanceDataTableTd>
                      <FinanceDataTableTd className="py-2 px-2.5"><Skeleton className="h-3.5 w-20" /></FinanceDataTableTd>
                      <FinanceDataTableTd className="py-2 px-2.5"><Skeleton className="h-3.5 w-20" /></FinanceDataTableTd>
                      <FinanceDataTableTd className="py-2 px-2.5"><Skeleton className="h-3.5 w-12" /></FinanceDataTableTd>
                      <FinanceDataTableTd className="py-2 px-2.5"><Skeleton className="h-3.5 w-12" /></FinanceDataTableTd>
                      <FinanceDataTableTd className="py-2 px-2.5"><Skeleton className="h-3.5 w-16" /></FinanceDataTableTd>
                      <FinanceDataTableTd className="py-2 px-2.5"><Skeleton className="h-3.5 w-16" /></FinanceDataTableTd>
                      <FinanceDataTableTd align="right" className="py-2 px-2.5"><Skeleton className="h-3.5 w-12 ml-auto" /></FinanceDataTableTd>
                      <FinanceDataTableTd align="right" className="py-2 px-2.5"><Skeleton className="h-3.5 w-10 ml-auto" /></FinanceDataTableTd>
                      <FinanceDataTableTd align="right" className="py-2 px-2.5"><Skeleton className="h-3.5 w-8 ml-auto" /></FinanceDataTableTd>
                      <FinanceDataTableTd className="py-2 px-2.5"><Skeleton className="h-3.5 w-14" /></FinanceDataTableTd>
                      <FinanceDataTableTd className="py-2 px-2.5"><Skeleton className="h-3.5 w-16" /></FinanceDataTableTd>
                    </FinanceDataTableRow>
                  ))
                )}
                {!c.isLoading && !c.isError && c.projects.length === 0 && (
                  <tr className="border-b">
                    <td colSpan={14} className="py-12 text-center">
                      <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                        <FolderKanban className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="font-medium text-foreground">No projects in portfolio</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {c.searchQuery || c.filterStatus !== 'all' ? 'Try adjusting filters or add a new project.' : 'Get started by adding your first project.'}
                      </p>
                      <Button
                        variant="default"
                        size="sm"
                        className="mt-4"
                        onClick={() => { c.setEditingProject(null); c.resetForm(); c.setProjectDialogOpen(true) }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add project
                      </Button>
                    </td>
                  </tr>
                )}
                {!c.isLoading && c.projects.map((project: any, index: number) => {
                  const utilization = c.calculateUtilization(project.spent_amount, project.total_budget)
                  const rowNo = (c.pagination?.from ?? 1) + index
                  const fundType = project.grant?.grant_type
                  return (
                    <FinanceDataTableRow key={project.id} className="even:bg-muted/15 hover:bg-muted/30 transition-colors">
                      <FinanceDataTableTd className="py-2 px-2.5 text-muted-foreground tabular-nums">{rowNo}</FinanceDataTableTd>
                      <FinanceDataTableTd className="py-2 px-2.5">
                        <span className="font-mono text-muted-foreground">{project.project_code}</span>
                      </FinanceDataTableTd>
                      <FinanceDataTableTd className="py-2 px-2.5">
                        <span className="font-medium text-foreground">{project.project_name}</span>
                      </FinanceDataTableTd>
                      <FinanceDataTableTd className="py-2 px-2.5">
                        <span className="text-muted-foreground">{project.grant?.donor ? (project.grant.donor.short_name || project.grant.donor.name || project.grant.donor.code) : 'â€”'}</span>
                      </FinanceDataTableTd>
                      <FinanceDataTableTd className="py-2 px-2.5">
                        <span className="text-muted-foreground">{fundType ? c.getGrantTypeLabel(fundType) : 'â€”'}</span>
                      </FinanceDataTableTd>
                      <FinanceDataTableTd className="py-2 px-2.5">{project.sector || 'â€”'}</FinanceDataTableTd>
                      <FinanceDataTableTd className="py-2 px-2.5">{project.location || 'â€”'}</FinanceDataTableTd>
                      <FinanceDataTableTd className="py-2 px-2.5">
                        <span className="text-muted-foreground">{c.formatDate(project.start_date)}</span>
                      </FinanceDataTableTd>
                      <FinanceDataTableTd className="py-2 px-2.5">
                        <span className="text-muted-foreground">{c.formatDate(project.end_date)}</span>
                      </FinanceDataTableTd>
                      <FinanceDataTableTd align="right" className="py-2 px-2.5 font-mono tabular-nums">
                        {c.formatCurrency(project.total_budget)}
                      </FinanceDataTableTd>
                      <FinanceDataTableTd align="right" className="py-2 px-2.5 font-mono tabular-nums text-muted-foreground">
                        {c.formatCurrency(project.spent_amount)}
                      </FinanceDataTableTd>
                      <FinanceDataTableTd align="right" className="py-2 px-2.5 tabular-nums">
                        <span className={c.cn(
                          Number(utilization) > 90 && 'text-amber-600 font-medium',
                          Number(utilization) > 100 && 'text-red-600 font-medium'
                        )}>
                          {utilization}%
                        </span>
                      </FinanceDataTableTd>
                      <FinanceDataTableTd className="py-2 px-2.5">
                        <Badge className={c.cn('text-[10px] px-1.5 py-0', c.getProjectStatusColor(project.status))}>
                          {c.getProjectStatusLabel(project.status)}
                        </Badge>
                      </FinanceDataTableTd>
                      <FinanceDataTableTd align="center" className="py-2 px-2.5">
                        <ActionMenu
                          triggerClassName="h-7 w-7 rounded hover:bg-muted inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                          menuWidth={160}
                          items={[
                            { label: 'View details', icon: <Eye className="h-3.5 w-3.5" />, onClick: () => c.handleView(project) },
                            { label: 'Edit', icon: <Edit className="h-3.5 w-3.5" />, onClick: () => c.handleEdit(project) },
                            { label: 'Delete', icon: <Trash2 className="h-3.5 w-3.5" />, onClick: () => { c.setProjectToDelete(project); c.setDeleteDialogOpen(true) }, destructive: true },
                          ]}
                        />
                      </FinanceDataTableTd>
                    </FinanceDataTableRow>
                  )
                })}
              </tbody>
            </table>
          </FinanceDataTable>
          {c.pagination && Number(c.pagination.last_page) > 1 && (
            <FinancePagination
              from={c.pagination.from}
              to={c.pagination.to}
              total={c.pagination.total}
              label="projects"
              onPrevious={() => c.setPage((p: number) => p - 1)}
              onNext={() => c.setPage((p: number) => p + 1)}
              previousDisabled={c.page === 1}
              nextDisabled={c.page === c.pagination.last_page}
              className="px-4"
            />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={c.projectDialogOpen}
        onOpenChange={(open) => {
          if (open !== c.projectDialogOpen) c.setProjectDialogOpen(open)
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-2 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FilePlus className="h-5 w-5" />
              {c.editingProject ? 'Edit project' : 'Add project'}
            </DialogTitle>
            <DialogDescription>
              {c.editingProject ? 'Update project details and classification.' : 'Select project donor and contract, then fill in project details, locations, budget, and upload attachments.'}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4 overflow-y-auto flex-1 space-y-6">
            <div className="space-y-4">
              <p className="text-sm font-semibold text-foreground border-b pb-1.5">1. Project Donor & Contract</p>
              <div className="space-y-2">
                <Label required>Project Donor</Label>
                <Select
                  value={c.effectiveDonorId ? String(c.effectiveDonorId) : ''}
                  onValueChange={(v) => {
                    const id = v ? parseInt(v, 10) : 0
                    c.setSelectedDonorId(id)
                    if (c.contractMode === 'new') c.setNewContractForm((f: any) => ({ ...f, donor_id: id }))
                    if (c.contractMode === 'existing') c.setProjectForm((prev: any) => ({ ...prev, grant_id: 0 }))
                  }}
                  disabled={!!c.editingProject}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select donor from list" />
                  </SelectTrigger>
                  <SelectContent>
                    {(c.donors || []).map((d: any) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name} {d.code ? `(${d.code})` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!c.editingProject && (
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="contractMode" checked={c.contractMode === 'existing'} onChange={() => c.setContractMode('existing')} className="rounded-full" />
                    <span className="text-sm">Use existing contract</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="contractMode" checked={c.contractMode === 'new'} onChange={() => c.setContractMode('new')} className="rounded-full" />
                    <span className="text-sm">Create new contract</span>
                  </label>
                </div>
              )}
              {c.contractMode === 'existing' || c.editingProject ? (
                <div className="space-y-2">
                  <Label required>Grant / Contract</Label>
                  <Select
                    value={Number(c.projectForm?.grant_id) > 0 ? c.projectForm.grant_id.toString() : ''}
                    onValueChange={(v) => {
                      const id = v ? parseInt(v, 10) : 0
                      c.setProjectForm((prev: any) => ({ ...prev, grant_id: id }))
                      const g = (c.grants || []).find((x: any) => x.id === id)
                      if (g) c.setSelectedDonorId(g.donor_id)
                    }}
                    disabled={!!c.editingProject}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select grant (filtered by donor)" />
                    </SelectTrigger>
                    <SelectContent>
                      {(c.grantsFilteredByDonor || []).map((grant: any) => (
                        <SelectItem key={grant.id} value={grant.id.toString()}>
                          {grant.grant_code} â€“ {grant.grant_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label required>Donor</Label>
                      <Select
                        value={(c.newContractForm?.donor_id ?? 0) > 0 ? c.newContractForm.donor_id!.toString() : ''}
                        onValueChange={(v) => c.setNewContractForm((f: any) => ({ ...f, donor_id: v ? parseInt(v, 10) : 0 }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select donor" />
                        </SelectTrigger>
                        <SelectContent>
                          {(c.donors || []).map((d: any) => (
                            <SelectItem key={d.id} value={String(d.id)}>{d.name} {d.code ? `(${d.code})` : ''}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label required>Contract / Grant code</Label>
                      <Input
                        placeholder="e.g. GRANT-2024-001"
                        value={c.newContractForm?.grant_code ?? ''}
                        onChange={(e) => c.setNewContractForm((f: any) => ({ ...f, grant_code: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label required>Contract / Grant name</Label>
                    <Input
                      placeholder="e.g. Health Program Phase II"
                      value={c.newContractForm?.grant_name ?? ''}
                      onChange={(e) => c.setNewContractForm((f: any) => ({ ...f, grant_name: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Contract reference</Label>
                      <Input
                        placeholder="e.g. CTR-2024-001"
                        value={c.newContractForm?.contract_reference ?? ''}
                        onChange={(e) => c.setNewContractForm((f: any) => ({ ...f, contract_reference: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Contract date</Label>
                      <DatePicker
                        value={c.newContractForm?.contract_date ?? ''}
                        onChange={(v) => c.setNewContractForm((f: any) => ({ ...f, contract_date: v }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label required>Start date</Label>
                      <DatePicker
                        value={c.newContractForm?.start_date ?? ''}
                        onChange={(v) => c.setNewContractForm((f: any) => ({ ...f, start_date: v }))}
                        maxDate={c.newContractForm?.end_date ?? undefined}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label required>End date</Label>
                      <DatePicker
                        value={c.newContractForm?.end_date ?? ''}
                        onChange={(v) => c.setNewContractForm((f: any) => ({ ...f, end_date: v }))}
                        minDate={c.newContractForm?.start_date ?? undefined}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label required>Total amount</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="0.00"
                        value={c.newContractForm?.total_amount === 0 ? '' : c.newContractForm?.total_amount}
                        onChange={(e) => c.setNewContractForm((f: any) => ({ ...f, total_amount: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label required>Currency</Label>
                      <CurrencySelect value={c.newContractForm?.currency ?? 'USD'} onChange={(v) => c.setNewContractForm((f: any) => ({ ...f, currency: v || 'USD' }))} placeholder="Select currency" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Fund type</Label>
                    <Select
                      value={c.newContractForm?.grant_type ?? 'restricted'}
                      onValueChange={(v) => c.setNewContractForm((f: any) => ({ ...f, grant_type: v as GrantFormData['grant_type'] }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="restricted">Restricted</SelectItem>
                        <SelectItem value="unrestricted">Unrestricted</SelectItem>
                        <SelectItem value="temporarily_restricted">Temporarily Restricted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Partner</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="hasPartner" checked={!c.hasPartner} onChange={() => c.setHasPartner(false)} className="rounded-full" />
                        <span className="text-sm">No</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="hasPartner" checked={c.hasPartner} onChange={() => c.setHasPartner(true)} className="rounded-full" />
                        <span className="text-sm">Yes</span>
                      </label>
                    </div>
                    {c.hasPartner && (
                      <div className="grid grid-cols-1 gap-3 pt-2 border-t">
                        <Input placeholder="Partner name" value={c.newContractForm?.partner_name ?? ''} onChange={(e) => c.setNewContractForm((f: any) => ({ ...f, partner_name: e.target.value }))} />
                        <Textarea placeholder="Detail about partner" rows={2} value={c.newContractForm?.partner_details ?? ''} onChange={(e) => c.setNewContractForm((f: any) => ({ ...f, partner_details: e.target.value }))} />
                      </div>
                    )}
                  </div>
                  <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-900/30 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <Label className="text-base font-medium">Upload attachments (contract, budget, other)</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">PDF or Word, max {c.CONTRACT_DOC_MAX_MB ?? 10} MB per file.</p>
                    {([c.contractFile].filter(Boolean).length > 0 || (c.attachments || []).length > 0) ? (
                      <div className="space-y-2">
                        {c.contractFile && (
                          <div className="flex items-center gap-3 flex-wrap">
                            <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                            <span className="text-sm truncate">{c.contractFile.name}</span>
                            <Select value={c.contractFileDocType} onValueChange={(v) => c.setContractFileDocType(v as GrantDocumentType)}>
                              <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="contract">Contract</SelectItem>
                                <SelectItem value="amendment">Amendment</SelectItem>
                                <SelectItem value="budget">Budget</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input placeholder="Title" value={c.contractFileTitle} onChange={(e) => c.setContractFileTitle(e.target.value)} className="h-8 flex-1 min-w-[120px]" />
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => { c.setContractFile(null); c.setContractFileError?.(null); if (c.contractFileInputRef?.current) c.contractFileInputRef.current.value = '' }}><X className="h-4 w-4" /></Button>
                          </div>
                        )}
                        {(c.attachments || []).map((a: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 flex-wrap">
                            <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                            <span className="text-sm truncate">{a.file.name}</span>
                            <Select value={a.documentType} onValueChange={(v) => c.setAttachments((prev) => prev.map((x, j) => j === i ? { ...x, documentType: v as GrantDocumentType } : x))}>
                              <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="contract">Contract</SelectItem>
                                <SelectItem value="budget">Budget</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input placeholder="Title" value={a.title} onChange={(e) => c.setAttachments((prev: any[]) => prev.map((x: any, j: number) => j === i ? { ...x, title: e.target.value } : x)))} className="h-8 flex-1 min-w-[120px]" />
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => c.setAttachments((prev) => prev.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => c.attachmentsInputRef?.current?.click()}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add another file
                        </Button>
                        <input ref={c.attachmentsInputRef} type="file" accept={c.CONTRACT_DOC_ACCEPT} className="sr-only" onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          if (c.validateContractFile?.(file)) return
                          c.setAttachments((prev) => [...prev, { file, title: file.name, documentType: 'other' }])
                          e.target.value = ''
                        }} />
                      </div>
                    ) : (
                      <div
                        role="button"
                        tabIndex={0}
                        className={c.cn(
                          'rounded-lg border-2 border-dashed p-4 transition-colors cursor-pointer',
                          c.isDragging && 'border-primary bg-primary/5',
                          !c.isDragging && 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                        )}
                        onClick={() => c.contractFileInputRef?.current?.click()}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && c.contractFileInputRef?.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); c.setIsDragging?.(true) }}
                        onDragLeave={() => c.setIsDragging?.(false)}
                        onDrop={(e) => {
                          e.preventDefault()
                          c.setIsDragging?.(false)
                          const file = e.dataTransfer.files?.[0]
                          if (!file) return
                          const err = c.validateContractFile?.(file)
                          c.setContractFileError?.(err ?? null)
                          c.setContractFile(err ? null : file)
                        }}
                      >
                        <input
                          ref={c.contractFileInputRef}
                          type="file"
                          accept={c.CONTRACT_DOC_ACCEPT}
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (!file) { c.setContractFile(null); c.setContractFileError?.(null); return }
                            c.setContractFileError?.(c.validateContractFile?.(file) ?? null)
                            c.setContractFile(c.validateContractFile?.(file) ? null : file)
                          }}
                        />
                        <div className="flex flex-col items-center gap-2 py-2">
                          <Upload className="h-6 w-6 text-muted-foreground" />
                          <span className="text-sm font-medium">Drop file here or click to browse</span>
                        </div>
                      </div>
                    )}
                    {c.contractFileError && (
                      <p className="text-sm text-destructive flex items-center gap-1.5"><FileWarning className="h-4 w-4" />{c.contractFileError}</p>
                    )}
                    {c.uploadProgress != null && <div className="space-y-1"><p className="text-sm text-muted-foreground">Uploadingâ€¦</p><Progress value={c.uploadProgress} className="h-2" /></div>}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <p className="text-sm font-semibold text-foreground border-b pb-1.5">2. Project Name, Code & Office</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label required>Project Name</Label>
                  <Input placeholder="Project name" value={c.projectForm?.project_name ?? ''} onChange={(e) => c.setProjectForm({ ...c.projectForm, project_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Project / Grant code</Label>
                  <Input
                    placeholder="From contract"
                    value={c.contractMode === 'existing' && Number(c.projectForm?.grant_id) > 0 ? ((c.allGrants || []).find((g: any) => g.id === c.projectForm.grant_id)?.grant_code ?? '') : (c.newContractForm?.grant_code ?? '')}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label required>Project Code (for vouchers)</Label>
                  <Input placeholder="e.g. PRJ-001" value={c.projectForm?.project_code ?? ''} onChange={(e) => c.setProjectForm({ ...c.projectForm, project_code: e.target.value.toUpperCase() })} disabled={!!c.editingProject} />
                </div>
                <div className="space-y-2">
                  <Label required>Office</Label>
                  <Select
                    value={Number(c.projectForm?.office_id) > 0 ? c.projectForm.office_id.toString() : ''}
                    onValueChange={(v) => c.setProjectForm((prev: any) => ({ ...prev, office_id: v ? parseInt(v, 10) : 0 }))}
                    disabled={!!c.editingProject}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select office" />
                    </SelectTrigger>
                    <SelectContent>
                      {(c.offices || []).map((office: any) => (
                        <SelectItem key={office.id} value={office.id.toString()}>
                          {office.code} â€“ {office.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={c.projectForm?.status || 'draft'} onValueChange={(v) => c.setProjectForm({ ...c.projectForm, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_hold">On hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-semibold text-foreground border-b pb-1.5">3. Project Locations (one or many)</p>
              <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-background min-h-10">
                {(c.projectForm?.locations ?? []).map((loc: string, i: number) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-sm">
                    {loc}
                    <button type="button" onClick={() => c.setProjectForm((f: any) => ({ ...f, locations: (f.locations ?? []).filter((_: any, j: number) => j !== i) }))} className="hover:text-destructive rounded" aria-label="Remove location">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
                <input
                  className="flex-1 min-w-[120px] bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground"
                  placeholder="Add location (Enter or comma)"
                  value={c.projectLocationInput ?? ''}
                  onChange={(e) => c.setProjectLocationInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      const v = (e.key === ',' ? (c.projectLocationInput ?? '').replace(/,/g, '') : (c.projectLocationInput ?? '')).trim()
                      if (v) {
                        c.setProjectForm((f: any) => ({ ...f, locations: [...(f.locations ?? []), v] }))
                        c.setProjectLocationInput('')
                      }
                    }
                  }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-semibold text-foreground border-b pb-1.5">4. Sector, Start date & End date</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Sector</Label>
                  <Select value={c.projectForm?.sector || ''} onValueChange={(v) => c.setProjectForm({ ...c.projectForm, sector: v })}>
                    <SelectTrigger><SelectValue placeholder="Select sector" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Health">Health</SelectItem>
                      <SelectItem value="Education">Education</SelectItem>
                      <SelectItem value="WASH">WASH</SelectItem>
                      <SelectItem value="Protection">Protection</SelectItem>
                      <SelectItem value="Livelihoods">Livelihoods</SelectItem>
                      <SelectItem value="Shelter">Shelter</SelectItem>
                      <SelectItem value="Food Security">Food Security</SelectItem>
                      <SelectItem value="Multi-Sector">Multi-Sector</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label required>Start date</Label>
                  <DatePicker value={c.projectForm?.start_date ?? ''} onChange={(v) => c.setProjectForm({ ...c.projectForm, start_date: v })} maxDate={c.projectForm?.end_date || undefined} />
                </div>
                <div className="space-y-2">
                  <Label required>End date</Label>
                  <DatePicker value={c.projectForm?.end_date ?? ''} onChange={(v) => c.setProjectForm({ ...c.projectForm, end_date: v })} minDate={c.projectForm?.start_date || undefined} />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-semibold text-foreground border-b pb-1.5">5. Total budget & Currency</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label required>Total budget</Label>
                  <Input type="number" min={0} step="0.01" placeholder="0.00" value={c.projectForm?.total_budget === 0 ? '' : c.projectForm?.total_budget} onChange={(e) => c.setProjectForm({ ...c.projectForm, total_budget: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label required>Currency</Label>
                  <CurrencySelect value={c.projectForm?.currency || ''} onChange={(v) => c.setProjectForm({ ...c.projectForm, currency: v || 'USD' })} placeholder="Select currency" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-semibold text-foreground border-b pb-1.5">6. Project Description</p>
              <Textarea placeholder="Brief description of the project..." value={c.projectForm?.description || ''} onChange={(e) => c.setProjectForm({ ...c.projectForm, description: e.target.value })} rows={3} />
              <div className="space-y-2">
                <Label>Target beneficiaries</Label>
                <Input type="number" min={0} placeholder="Number of beneficiaries" value={c.projectForm?.target_beneficiaries ?? ''} onChange={(e) => c.setProjectForm({ ...c.projectForm, target_beneficiaries: e.target.value ? parseInt(e.target.value) : undefined })} />
              </div>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t shrink-0">
            <Button variant="secondary" onClick={() => c.setProjectDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={c.handleSave}
              disabled={
                c.createMutation?.isPending ||
                c.updateMutation?.isPending ||
                (c.uploadProgress != null) ||
                (c.contractMode === 'existing' && !c.projectForm?.grant_id) ||
                (c.contractMode === 'new' && (!c.effectiveDonorId || !(c.newContractForm?.grant_code ?? '').trim() || !(c.newContractForm?.grant_name ?? '').trim() || !c.newContractForm?.start_date || !c.newContractForm?.end_date || !(Number(c.newContractForm?.total_amount ?? 0) >= 0) || !c.newContractForm?.currency)) ||
                !c.projectForm?.office_id ||
                !(c.projectForm?.project_code ?? '').trim() ||
                !(c.projectForm?.project_name ?? '').trim() ||
                !c.projectForm?.start_date ||
                !c.projectForm?.end_date ||
                !(Number(c.projectForm?.total_budget ?? 0) >= 0) ||
                !c.projectForm?.currency
              }
            >
              {c.createMutation?.isPending || c.updateMutation?.isPending ? 'Savingâ€¦' : c.editingProject ? 'Update project' : 'Add project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={c.viewDialogOpen}
        onOpenChange={(open) => {
          if (open !== c.viewDialogOpen) c.setViewDialogOpen(open)
        }}
      >
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Project details</DialogTitle>
            <DialogDescription>
              {c.viewingProject?.project?.project_code && (
                <span className="font-mono text-muted-foreground">{c.viewingProject.project.project_code}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          {c.viewingProject && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{c.viewingProject.project.project_name}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge className={c.getProjectStatusColor(c.viewingProject.project.status)}>
                    {c.getProjectStatusLabel(c.viewingProject.project.status)}
                  </Badge>
                  {c.viewingProject.project.grant && (
                    <Badge variant="outline" className="font-normal">
                      Grant: {c.viewingProject.project.grant.grant_code}
                    </Badge>
                  )}
                  {c.viewingProject.project.sector && (
                    <span className="text-xs text-muted-foreground">{c.viewingProject.project.sector}</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Office</p>
                  <p className="font-medium text-gray-900 mt-0.5">{c.viewingProject.project.office?.name || 'â€”'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Project manager</p>
                  <p className="font-medium text-gray-900 mt-0.5">{c.viewingProject.project.manager?.name || 'â€”'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Start date</p>
                  <p className="font-medium text-gray-900 mt-0.5">{c.formatDate(c.viewingProject.project.start_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">End date</p>
                  <p className="font-medium text-gray-900 mt-0.5">{c.formatDate(c.viewingProject.project.end_date)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">Budget utilization</p>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-semibold">{c.viewingProject.budget_utilization}%</span>
                </div>
                <Progress value={c.viewingProject.budget_utilization} className="h-2" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-center">
                  <p className="text-xs text-muted-foreground">Total budget</p>
                  <p className="text-base font-semibold text-gray-900 mt-0.5">{c.formatCurrency(c.viewingProject.project.total_budget)}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-center">
                  <p className="text-xs text-muted-foreground">Spent</p>
                  <p className="text-base font-semibold text-gray-900 mt-0.5">{c.formatCurrency(c.viewingProject.project.spent_amount)}</p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-center">
                  <p className="text-xs text-muted-foreground">Available</p>
                  <p className="text-base font-semibold text-emerald-700 mt-0.5">{c.formatCurrency(c.viewingProject.available_budget)}</p>
                </div>
              </div>
              {c.viewingProject.project.description && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{c.viewingProject.project.description}</p>
                </div>
              )}
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">General Ledger</p>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/general-ledger/journal-entries?project_id=${c.viewingProject.project.id}`} className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground" onClick={() => c.setViewDialogOpen(false)}>
                    <FileText className="h-3.5 w-3.5" />
                    Journal
                  </Link>
                  <Link href={`/vouchers?project_id=${c.viewingProject.project.id}`} className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground" onClick={() => c.setViewDialogOpen(false)}>
                    <Receipt className="h-3.5 w-3.5" />
                    Vouchers
                  </Link>
                  <Link href={`/reports?project_id=${c.viewingProject.project.id}`} className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground" onClick={() => c.setViewDialogOpen(false)}>
                    <BarChart3 className="h-3.5 w-3.5" />
                    Reports
                  </Link>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => c.setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={c.deleteDialogOpen}
        onOpenChange={(open) => {
          if (open !== c.deleteDialogOpen) c.setDeleteDialogOpen(open)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete project <strong>{c.projectToDelete?.project_name}</strong> ({c.projectToDelete?.project_code})?
              Only planning or cancelled projects with zero spent/committed amounts can be deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => c.projectToDelete && c.deleteMutation?.mutate(c.projectToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={c.deleteMutation?.isPending}
            >
              {c.deleteMutation?.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

