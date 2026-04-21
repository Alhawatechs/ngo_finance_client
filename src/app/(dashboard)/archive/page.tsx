'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FinanceDataTable,
  FinanceDataTableHeader,
  FinanceDataTableTh,
  FinanceDataTableRow,
  FinanceDataTableTd,
  FinancePagination,
} from '@/components/finance'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { Archive, Upload, Search, Download, Trash2, FileText, Loader2, Eye } from 'lucide-react'
import {
  getArchiveDocuments,
  uploadArchiveDocument,
  downloadArchiveDocument,
  deleteArchiveDocument,
  bulkDownloadArchiveDocuments,
  type ArchiveDocument,
  type ArchiveListParams,
} from '@/lib/api/archive'
import { getOffices } from '@/lib/api/offices'
import { formatDate } from '@/lib/utils'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const DOCUMENT_TYPES = [
  { value: 'invoice', label: 'Invoice' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'contract', label: 'Contract' },
  { value: 'amendment', label: 'Amendment' },
  { value: 'budget', label: 'Budget' },
  { value: 'report', label: 'Report' },
  { value: 'correspondence', label: 'Correspondence' },
  { value: 'other', label: 'Other' },
]

const ARCHIVE_CATEGORIES = [
  { value: 'policy', label: 'Policy' },
  { value: 'template', label: 'Template' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'other', label: 'Other' },
]

const SOURCE_OPTIONS = [
  { value: 'grant', label: 'Grant' },
  { value: 'project', label: 'Project' },
  { value: 'voucher', label: 'Voucher' },
  { value: 'standalone', label: 'Standalone' },
]

export default function ArchivePage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [documentType, setDocumentType] = useState<string>('')
  const [archiveCategory, setArchiveCategory] = useState<string>('')
  const [source, setSource] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [retentionExpired, setRetentionExpired] = useState(false)
  const [officeId, setOfficeId] = useState<string>('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deleteDoc, setDeleteDoc] = useState<ArchiveDocument | null>(null)
  const [previewDoc, setPreviewDoc] = useState<ArchiveDocument | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDownloading, setBulkDownloading] = useState(false)

  const params: Parameters<typeof getArchiveDocuments>[0] = {
    page,
    per_page: 25,
    ...(search && { search }),
    ...(documentType && { document_type: documentType }),
    ...(archiveCategory && { archive_category: archiveCategory }),
    ...(source && ['grant', 'project', 'voucher', 'standalone'].includes(source) && {
      source: source as 'grant' | 'project' | 'voucher' | 'standalone',
    }),
    ...(dateFrom && { date_from: dateFrom }),
    ...(dateTo && { date_to: dateTo }),
    ...(retentionExpired && { retention_expired: true }),
    ...(officeId && { office_id: parseInt(officeId, 10) }),
  }

  const { data, isLoading } = useQuery({
    queryKey: ['archive', params],
    queryFn: () => getArchiveDocuments(params),
  })

  const { data: officesData } = useQuery({
    queryKey: ['offices'],
    queryFn: () => getOffices(),
  })
  const offices = officesData ?? []

  const uploadMutation = useMutation({
    mutationFn: uploadArchiveDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archive'] })
      setUploadOpen(false)
      toast({ title: 'Document uploaded', description: 'The document was uploaded successfully.' })
    },
    onError: (err: unknown) => {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Upload failed'
      toast({ title: 'Upload failed', description: msg, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteArchiveDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archive'] })
      setDeleteDoc(null)
      toast({ title: 'Document deleted', description: 'The document was removed from the archive.' })
    },
    onError: () => {
      toast({ title: 'Delete failed', description: 'Could not delete the document.', variant: 'destructive' })
    },
  })

  const handleDownload = async (doc: ArchiveDocument) => {
    try {
      const blob = await downloadArchiveDocument(doc.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.file_name
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast({ title: 'Download failed', description: 'Could not download the file.', variant: 'destructive' })
    }
  }

  const handleBulkDownload = async () => {
    if (selectedIds.size === 0) return
    setBulkDownloading(true)
    try {
      const blob = await bulkDownloadArchiveDocuments(Array.from(selectedIds))
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'archive-documents.zip'
      a.click()
      URL.revokeObjectURL(url)
      setSelectedIds(new Set())
      toast({ title: 'Download started', description: `${selectedIds.size} document(s) downloaded.` })
    } catch {
      toast({ title: 'Bulk download failed', description: 'Could not download the selected documents.', variant: 'destructive' })
    } finally {
      setBulkDownloading(false)
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === documents.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(documents.map((d) => d.id)))
  }

  const documents = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Archive Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Centralized storage for all financial documents from grants, projects, vouchers, and standalone uploads.
          </p>
        </div>
        <div className="flex gap-2">
          {documents.length > 0 && (
            <Button
              variant="outline"
              onClick={handleBulkDownload}
              disabled={selectedIds.size === 0 || bulkDownloading}
            >
              {bulkDownloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Download selected {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
            </Button>
          )}
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload document
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Archive className="h-5 w-5" />
            Document archive
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs">Search</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Title or file name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-[140px]">
              <Label className="text-xs">Document type</Label>
              <Select value={documentType || 'all'} onValueChange={(v) => setDocumentType(v === 'all' ? '' : v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[140px]">
              <Label className="text-xs">Source</Label>
              <Select value={source || 'all'} onValueChange={(v) => setSource(v === 'all' ? '' : v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {SOURCE_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[140px]">
              <Label className="text-xs">Category</Label>
              <Select value={archiveCategory || 'all'} onValueChange={(v) => setArchiveCategory(v === 'all' ? '' : v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {ARCHIVE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[140px]">
              <Label className="text-xs">From date</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1" />
            </div>
            <div className="w-[140px]">
              <Label className="text-xs">To date</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1" />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={retentionExpired}
                  onChange={(e) => setRetentionExpired(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-xs">Retention expired</span>
              </label>
            </div>
            <div className="w-[140px]">
              <Label className="text-xs">Office</Label>
              <Select value={officeId || 'all'} onValueChange={(v) => setOfficeId(v === 'all' ? '' : v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {offices.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <FinanceDataTable tableClassName="w-full">
              <FinanceDataTableHeader>
                <FinanceDataTableTh align="center" className="w-10">
                  {documents.length > 0 && (
                    <input
                      type="checkbox"
                      checked={selectedIds.size === documents.length && documents.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300"
                      aria-label="Select all"
                    />
                  )}
                </FinanceDataTableTh>
                <FinanceDataTableTh>Title</FinanceDataTableTh>
                <FinanceDataTableTh>Type</FinanceDataTableTh>
                <FinanceDataTableTh>Source</FinanceDataTableTh>
                <FinanceDataTableTh>Office</FinanceDataTableTh>
                <FinanceDataTableTh align="right">Size</FinanceDataTableTh>
                <FinanceDataTableTh>Date</FinanceDataTableTh>
                <FinanceDataTableTh>Retention</FinanceDataTableTh>
                <FinanceDataTableTh>Uploaded by</FinanceDataTableTh>
                <FinanceDataTableTh align="center">Actions</FinanceDataTableTh>
              </FinanceDataTableHeader>
              <tbody>
                {isLoading ? (
                  <FinanceDataTableRow>
                    <td colSpan={10} className="py-3 px-4 text-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </td>
                  </FinanceDataTableRow>
                ) : documents.length === 0 ? (
                  <FinanceDataTableRow>
                    <td colSpan={10} className="py-3 px-4 text-center py-12 text-muted-foreground">
                      No documents found. Upload a standalone document or add documents to grants, projects, or vouchers.
                    </td>
                  </FinanceDataTableRow>
                ) : (
                  documents.map((doc) => (
                    <FinanceDataTableRow key={doc.id}>
                      <FinanceDataTableTd align="center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(doc.id)}
                          onChange={() => toggleSelect(doc.id)}
                          className="h-4 w-4 rounded border-gray-300"
                          aria-label={`Select ${doc.title}`}
                        />
                      </FinanceDataTableTd>
                      <FinanceDataTableTd>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium truncate max-w-[200px]" title={doc.title}>{doc.title}</span>
                        </div>
                      </FinanceDataTableTd>
                      <FinanceDataTableTd>
                        <span className="capitalize">{doc.document_type}</span>
                        {doc.archive_category && (
                          <span className="text-muted-foreground text-xs ml-1">({doc.archive_category})</span>
                        )}
                      </FinanceDataTableTd>
                      <FinanceDataTableTd>
                        {doc.source_link ? (
                          <Link href={doc.source_link} className="text-primary hover:underline">
                            {doc.source_label}
                          </Link>
                        ) : (
                          <span>{doc.source_label}</span>
                        )}
                      </FinanceDataTableTd>
                      <FinanceDataTableTd>{doc.office?.name ?? '—'}</FinanceDataTableTd>
                      <FinanceDataTableTd align="right">{formatFileSize(doc.file_size)}</FinanceDataTableTd>
                      <FinanceDataTableTd>{formatDate(doc.created_at)}</FinanceDataTableTd>
                      <FinanceDataTableTd>
                        {doc.retention_until ? (
                          <span className={doc.retention_until < new Date().toISOString().slice(0, 10) ? 'text-amber-600 font-medium' : ''}>
                            {formatDate(doc.retention_until)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </FinanceDataTableTd>
                      <FinanceDataTableTd>{doc.uploaded_by?.name ?? '—'}</FinanceDataTableTd>
                      <FinanceDataTableTd align="center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewDoc(doc)} title="Preview">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(doc)} title="Download">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteDoc(doc)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </FinanceDataTableTd>
                    </FinanceDataTableRow>
                  ))
                )}
              </tbody>
          </FinanceDataTable>

          {meta && meta.last_page > 1 && (
            <FinancePagination
              from={meta.total === 0 ? 0 : (meta.current_page - 1) * meta.per_page + 1}
              to={meta.total === 0 ? 0 : Math.min(meta.current_page * meta.per_page, meta.total)}
              total={meta.total}
              onPrevious={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(meta.last_page, p + 1))}
              previousDisabled={meta.current_page <= 1}
              nextDisabled={meta.current_page >= meta.last_page}
              currentPage={meta.current_page}
              lastPage={meta.last_page}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>

      {/* Upload dialog */}
      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUpload={(formData) => uploadMutation.mutate(formData)}
        isLoading={uploadMutation.isPending}
        offices={offices}
      />

      {/* Preview dialog */}
      <PreviewDialog doc={previewDoc} onClose={() => setPreviewDoc(null)} onDownload={handleDownload} />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteDoc?.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDoc && deleteMutation.mutate(deleteDoc.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function UploadDialog({
  open,
  onOpenChange,
  onUpload,
  isLoading,
  offices = [],
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpload: (formData: FormData) => void
  isLoading: boolean
  offices?: { id: number; name: string }[]
}) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [documentType, setDocumentType] = useState('other')
  const [archiveCategory, setArchiveCategory] = useState('other')
  const [retentionUntil, setRetentionUntil] = useState('')
  const [officeId, setOfficeId] = useState<string>('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title || file.name)
    formData.append('document_type', documentType)
    formData.append('archive_category', archiveCategory)
    if (retentionUntil) formData.append('retention_until', retentionUntil)
    if (officeId) formData.append('office_id', officeId)
    onUpload(formData)
    setFile(null)
    setTitle('')
    setDocumentType('other')
    setArchiveCategory('other')
    setRetentionUntil('')
    setOfficeId('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="file">File</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.zip"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">PDF, Word, Excel, images, or ZIP. Max 50MB.</p>
          </div>
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Leave blank to use file name"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Document type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Archive category</Label>
            <Select value={archiveCategory} onValueChange={setArchiveCategory}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ARCHIVE_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="retention">Retention until (optional)</Label>
            <Input
              id="retention"
              type="date"
              value={retentionUntil}
              onChange={(e) => setRetentionUntil(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">Compliance: keep document until this date.</p>
          </div>
          {offices.length > 0 && (
            <div>
              <Label>Office (optional)</Label>
              <Select value={officeId || 'none'} onValueChange={(v) => setOfficeId(v === 'none' ? '' : v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {offices.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Scope document to a specific office.</p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!file || isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PreviewDialog({
  doc,
  onClose,
  onDownload,
}: {
  doc: ArchiveDocument | null
  onClose: () => void
  onDownload: (doc: ArchiveDocument) => void
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canPreview = doc && (/^application\/pdf$/i.test(doc.file_type) || /^image\//i.test(doc.file_type))

  const blobUrlRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!doc) {
      setBlobUrl(null)
      setError(null)
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
      return
    }
    if (!canPreview) {
      setBlobUrl(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    downloadArchiveDocument(doc.id)
      .then((blob) => {
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
        const url = URL.createObjectURL(blob)
        blobUrlRef.current = url
        setBlobUrl(url)
      })
      .catch(() => setError('Could not load preview'))
      .finally(() => setLoading(false))
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [doc?.id, canPreview])

  if (!doc) return null

  return (
    <Dialog open={!!doc} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{doc.title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 flex flex-col gap-4">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-destructive py-8 text-center">{error}</p>
          ) : !canPreview ? (
            <div className="py-8 text-center text-muted-foreground space-y-4">
              <p>Preview not available for this file type.</p>
              <Button onClick={() => onDownload(doc)}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          ) : blobUrl && doc.file_type?.toLowerCase().includes('pdf') ? (
            <iframe
              src={blobUrl}
              title={doc.title}
              className="w-full flex-1 min-h-[400px] rounded border"
            />
          ) : blobUrl && /^image\//i.test(doc.file_type) ? (
            <img src={blobUrl} alt={doc.title} className="max-w-full max-h-[70vh] object-contain mx-auto" />
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => onDownload(doc)}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
