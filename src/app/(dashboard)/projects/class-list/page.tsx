'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  Tag,
  Plus,
  Search,
  Loader2,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  FolderTree,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  getCostCenters,
  createCostCenter,
  updateCostCenter,
  deleteCostCenter,
  type CostCenter,
  type CostCenterFormData,
} from '@/lib/api/cost-centers'
import { getProjects } from '@/lib/api/projects'
import type { Project } from '@/lib/api/projects'
import { ProjectsPageHeader } from '@/components/projects/PageHeader'
import { ProjectsPageLayout } from '../ProjectsPageLayout'
import { cn } from '@/lib/utils'

/** Flatten tree into array with depth for indentation. */
function flattenWithDepth(nodes: CostCenter[] | undefined, depth = 0): { node: CostCenter; depth: number }[] {
  if (!nodes?.length) return []
  const out: { node: CostCenter; depth: number }[] = []
  for (const n of nodes) {
    out.push({ node: n, depth })
    out.push(...flattenWithDepth(n.children, depth + 1))
  }
  return out
}

/** Collect id and all descendant ids from a node. */
function descendantIds(node: CostCenter): number[] {
  return [node.id, ...(node.children ?? []).flatMap(descendantIds)]
}

function countClasses(nodes: CostCenter[] | undefined): number {
  if (!nodes?.length) return 0
  return nodes.length + nodes.reduce((sum, n) => sum + countClasses(n.children), 0)
}

/** Filter flat tree to only rows visible given expanded state (root always visible; child visible if parent expanded). */
function visibleRows(
  flat: { node: CostCenter; depth: number }[],
  expandedIds: Set<number>
): { node: CostCenter; depth: number }[] {
  const ancestorIds: number[] = []
  return flat.filter(({ node, depth }) => {
    const parentId = depth > 0 ? ancestorIds[depth - 1] : null
    const visible = depth === 0 || (parentId != null && expandedIds.has(parentId))
    if (visible) {
      ancestorIds.length = depth
      ancestorIds[depth] = node.id
    }
    return visible
  })
}


export default function ClassListPage() {
  const { toast } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedProjectId, setExpandedProjectId] = useState<number | null>(null)
  const [costCentersByProject, setCostCentersByProject] = useState<Record<number, CostCenter[]>>({})
  const [loadingProjectId, setLoadingProjectId] = useState<number | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<CostCenter | null>(null)
  const [saving, setSaving] = useState(false)
  const [addUnderParentId, setAddUnderParentId] = useState<number | null>(null)
  /** Per-project set of expanded class ids (for tree expand/collapse). New projects start with all expanded. */
  const [expandedClassIdsByProject, setExpandedClassIdsByProject] = useState<Record<number, Set<number>>>({})
  const [form, setForm] = useState<CostCenterFormData>({
    parent_id: null,
    project_id: null,
    name: '',
    description: '',
    is_active: true,
  })

  const toggleClassExpanded = useCallback((projectId: number, classId: number) => {
    setExpandedClassIdsByProject((prev) => {
      const set = new Set(prev[projectId] ?? [])
      if (set.has(classId)) set.delete(classId)
      else set.add(classId)
      return { ...prev, [projectId]: set }
    })
  }, [])

  const loadProjects = useCallback(async () => {
    try {
      setProjectsLoading(true)
      setProjectsError(null)
      const r = await getProjects({ per_page: 200, all_offices: true })
      setProjects(Array.isArray((r as { data?: Project[] })?.data) ? (r as { data: Project[] }).data : [])
    } catch (error) {
      const msg =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : null
      setProjectsError(msg || 'Failed to load projects.')
      toast({ title: 'Error', description: msg || 'Failed to load projects', variant: 'destructive' })
    } finally {
      setProjectsLoading(false)
    }
  }, [toast])

  const loadClassesForProject = useCallback(
    async (projectId: number, force = false) => {
      if (!force && costCentersByProject[projectId]) return
      setLoadingProjectId(projectId)
      try {
        const res = await getCostCenters({
          project_id: projectId,
          tree: true,
          with_projects: true,
          include_inactive: true,
        })
        const data = (res as { data?: CostCenter[] })?.data ?? []
        const list = Array.isArray(data) ? data : []
        setCostCentersByProject((prev) => ({ ...prev, [projectId]: list }))
        const allIds = flattenWithDepth(list).map(({ node }) => node.id)
        setExpandedClassIdsByProject((prev) => ({ ...prev, [projectId]: new Set(allIds) }))
      } catch (error) {
        const msg =
          error && typeof error === 'object' && 'response' in error
            ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
            : null
        toast({ title: 'Error', description: msg || 'Failed to load class list for project', variant: 'destructive' })
      } finally {
        setLoadingProjectId(null)
      }
    },
    [costCentersByProject, toast]
  )

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  useEffect(() => {
    if (expandedProjectId != null) loadClassesForProject(expandedProjectId)
  }, [expandedProjectId, loadClassesForProject])

  const toggleExpand = (projectId: number) => {
    setExpandedProjectId((prev) => (prev === projectId ? null : projectId))
  }

  const filteredProjects = useMemo(() => {
    if (!searchTerm.trim()) return projects
    const term = searchTerm.toLowerCase()
    return projects.filter(
      (p) =>
        p.project_code?.toLowerCase().includes(term) ||
        p.project_name?.toLowerCase().includes(term)
    )
  }, [projects, searchTerm])

  const refreshProjectClasses = useCallback(
    (projectId: number) => {
      setCostCentersByProject((prev) => {
        const next = { ...prev }
        delete next[projectId]
        return next
      })
      loadClassesForProject(projectId, true)
    },
    [loadClassesForProject]
  )

  const openAdd = (projectId: number | null, parentId?: number | null) => {
    setAddUnderParentId(parentId ?? null)
    setForm({
      parent_id: parentId ?? null,
      project_id: projectId ?? null,
      name: '',
      description: '',
      is_active: true,
    })
    setSelected(null)
    setAddOpen(true)
  }

  const openEdit = (cc: CostCenter) => {
    setSelected(cc)
    setForm({
      parent_id: cc.parent_id ?? null,
      project_id: cc.project_id ?? null,
      name: cc.name,
      description: cc.description ?? '',
      is_active: cc.is_active ?? true,
    })
    setEditOpen(true)
  }

  const openDelete = (cc: CostCenter) => {
    setSelected(cc)
    setDeleteOpen(true)
  }

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Validation', description: 'Name is required.', variant: 'destructive' })
      return
    }
    try {
      setSaving(true)
      await createCostCenter({
        parent_id: addUnderParentId ?? null,
        project_id: form.project_id ?? null,
        name: form.name.trim(),
        description: form.description?.trim() || null,
        is_active: form.is_active ?? true,
      })
      toast({ title: 'Success', description: 'Cost center (class) created.' })
      setAddOpen(false)
      setAddUnderParentId(null)
      if (form.project_id) refreshProjectClasses(form.project_id)
      else loadProjects()
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to create cost center'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!selected || !form.name.trim()) return
    try {
      setSaving(true)
      await updateCostCenter(selected.id, {
        parent_id: form.parent_id ?? null,
        project_id: form.project_id ?? null,
        name: form.name.trim(),
        description: form.description?.trim() || null,
        is_active: form.is_active ?? true,
      })
      toast({ title: 'Success', description: 'Cost center updated.' })
      setEditOpen(false)
      const pid = selected.project_id ?? form.project_id
      setSelected(null)
      if (pid) refreshProjectClasses(pid)
      else loadProjects()
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to update cost center'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    const pid = selected.project_id
    try {
      await deleteCostCenter(selected.id)
      toast({ title: 'Success', description: 'Cost center removed.' })
      setDeleteOpen(false)
      setSelected(null)
      if (pid) refreshProjectClasses(pid)
      else loadProjects()
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to delete cost center'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    }
  }

  const projectTree = (projectId: number): CostCenter[] => costCentersByProject[projectId] ?? []
  const flatForProject = (projectId: number) => flattenWithDepth(projectTree(projectId))

  return (
    <ProjectsPageLayout>
      <div className="space-y-5 animate-fade-in">
        <ProjectsPageHeader
          title="Class list"
          description="Each project has its own class list; all class codes start with the project code (e.g. for project 0F: 0F:Main Office, 0F:Sub Office; subclasses add levels). Click a project to view and manage its classes and subclasses."
          actions={
            <>
              <Link href="/projects/amendment">
                <Button variant="outline" size="sm" className="rounded-md border border-slate-300 dark:border-slate-600">
                  Project amendment
                </Button>
              </Link>
              <Button size="sm" className="rounded-md bg-[#023e8a] hover:bg-[#023e8a]/90" onClick={() => openAdd(null, null)}>
                <Plus className="h-4 w-4 mr-2" />
                Add class
              </Button>
            </>
          }
        />

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search projects by code or name…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
            />
          </div>
          {!projectsLoading && filteredProjects.length > 0 && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {projectsLoading ? (
          <Card className="rounded-md border border-slate-200 dark:border-slate-600 overflow-hidden">
            <CardContent className="flex flex-col items-center justify-center min-h-[300px] gap-4">
              <div className="h-10 w-10 rounded-md border-2 border-slate-300 border-t-[#023e8a] animate-spin" />
              <p className="text-sm text-slate-600 dark:text-slate-400">Loading projects…</p>
            </CardContent>
          </Card>
        ) : projectsError ? (
          <Card className="rounded-md border border-red-300 dark:border-red-800 overflow-hidden">
            <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <FolderTree className="h-10 w-10 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-700 dark:text-red-300 max-w-sm">{projectsError}</p>
              <Button variant="outline" size="sm" onClick={loadProjects} className="rounded-md">
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : filteredProjects.length === 0 ? (
          <Card className="rounded-md border border-slate-200 dark:border-slate-600 overflow-hidden">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center px-6">
              <FolderTree className="h-12 w-12 text-slate-400 dark:text-slate-500 mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
                {searchTerm ? 'No projects match your search' : 'No projects yet'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mb-5">
                {searchTerm ? 'Try a different search term.' : 'Register a project first; a default class is created for each new project.'}
              </p>
              {!searchTerm && (
                <Link href="/projects/register">
                  <Button size="sm" variant="outline" className="rounded-md">
                    Go to Project register
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-md border border-slate-200 dark:border-slate-600 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-600">
                    <th className="w-10 px-2 py-2.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-600" aria-label="Expand" />
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-600">Project</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-600">Status</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300">Classes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((project) => {
                    const isExpanded = expandedProjectId === project.id
                    const tree = projectTree(project.id)
                    const loading = loadingProjectId === project.id
                    const classCount = countClasses(tree)
                    return (
                      <React.Fragment key={project.id}>
                        <tr
                          className={cn(
                            'cursor-pointer border-b border-slate-200 dark:border-slate-700',
                            isExpanded ? 'bg-slate-50 dark:bg-slate-800/50' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/30'
                          )}
                          onClick={() => toggleExpand(project.id)}
                        >
                          <td className="px-2 py-2.5 align-middle border-r border-slate-200 dark:border-slate-700">
                            <span className="inline-flex items-center justify-center w-8 h-8 text-slate-600 dark:text-slate-400">
                              {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 align-middle border-r border-slate-200 dark:border-slate-700">
                            <div className="min-w-0 flex flex-col gap-0.5">
                              <code className="inline-block w-fit font-mono text-xs px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {project.project_code}
                              </code>
                              <span className="font-medium text-slate-800 dark:text-slate-100 truncate block">{project.project_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 align-middle border-r border-slate-200 dark:border-slate-700">
                            <span className={cn(
                              'text-xs capitalize',
                              project.status === 'active' ? 'text-green-700 dark:text-green-400' : 'text-slate-600 dark:text-slate-400'
                            )}>
                              {project.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 align-middle text-slate-600 dark:text-slate-400">
                            {loading ? '…' : classCount > 0 ? `${classCount} class${classCount !== 1 ? 'es' : ''}` : '—'}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-700">
                            <td colSpan={4} className="p-0">
                              <div className="border-l-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 py-4 pl-5 pr-4">
                                {loading ? (
                                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 py-4">
                                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                                    <span className="text-sm">Loading class list…</span>
                                  </div>
                                ) : tree.length === 0 ? (
                                  <div className="flex flex-wrap items-center gap-3 py-4 border border-dashed border-slate-300 dark:border-slate-600 p-4">
                                    <p className="text-sm text-slate-600 dark:text-slate-400">No classes yet for this project.</p>
                                    <Button size="sm" variant="outline" className="rounded-md shrink-0" onClick={(e) => { e.stopPropagation(); openAdd(project.id, null) }}>
                                      <Plus className="h-4 w-4 mr-2" />
                                      Add first class
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                      <div>
                                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                                          Class list & subclasses
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                          All codes use project code as prefix: <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 font-mono text-[11px]">0F:Main Office</code>, <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 font-mono text-[11px]">0F:Sub Office</code>
                                        </p>
                                      </div>
                                      <Button size="sm" variant="outline" className="rounded-md h-8" onClick={(e) => { e.stopPropagation(); openAdd(project.id, null) }}>
                                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                                        Add class
                                      </Button>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-xs text-slate-600"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          const flat = flatForProject(project.id)
                                          const ids = new Set(flat.map(({ node }) => node.id))
                                          const expanded = expandedClassIdsByProject[project.id]
                                          const allExpanded = expanded && flat.length > 0 && flat.every(({ node }) => expanded.has(node.id))
                                          setExpandedClassIdsByProject((p) => ({ ...p, [project.id]: allExpanded ? new Set() : new Set(flat.map(({ node }) => node.id)) }))
                                        }}
                                      >
                                        {(expandedClassIdsByProject[project.id]?.size ?? 0) < flatForProject(project.id).length ? 'Expand all' : 'Collapse all'}
                                      </Button>
                                    </div>
                                    <div className="border border-slate-200 dark:border-slate-600 rounded-md overflow-hidden">
                                      <table className="w-full text-sm border-collapse">
                                        <thead>
                                          <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-600">
                                            <th className="text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-600">Class name</th>
                                            <th className="text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-600">Code</th>
                                            <th className="text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-600">Description</th>
                                            <th className="text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-600">Status</th>
                                            <th className="w-40 px-3 py-2 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {visibleRows(
                                            flatForProject(project.id),
                                            expandedClassIdsByProject[project.id] ?? new Set()
                                          ).map(({ node: cc, depth }) => {
                                            const hasChildren = (cc.children?.length ?? 0) > 0
                                            const isExpanded = (expandedClassIdsByProject[project.id] ?? new Set()).has(cc.id)
                                            return (
                                              <tr
                                                key={cc.id}
                                                className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                <td className="px-3 py-2 align-middle border-r border-slate-200 dark:border-slate-600">
                                                  <div className="flex items-center gap-1 min-w-0" style={{ paddingLeft: depth * 20 }}>
                                                    {hasChildren ? (
                                                      <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); toggleClassExpanded(project.id, cc.id) }}
                                                        className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 inline-flex items-center justify-center shrink-0"
                                                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                                                      >
                                                        {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-600 dark:text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />}
                                                      </button>
                                                    ) : (
                                                      <span className="w-5 inline-block shrink-0" />
                                                    )}
                                                    <span className="font-medium text-slate-800 dark:text-slate-100 truncate">{cc.name}</span>
                                                    {depth > 0 && <span className="text-xs text-slate-400 ml-1">(subclass)</span>}
                                                  </div>
                                                </td>
                                                <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-600 align-middle">
                                                  <code className="inline-block font-mono text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 max-w-[240px] truncate block" title={cc.code}>
                                                    {cc.code}
                                                  </code>
                                                </td>
                                                <td className="px-3 py-2 text-slate-600 dark:text-slate-400 max-w-xs truncate border-r border-slate-200 dark:border-slate-600">
                                                  {cc.description || '—'}
                                                </td>
                                                <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-600">
                                                  <span className={cn(
                                                    'text-xs',
                                                    cc.is_active ? 'text-green-700 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'
                                                  )}>
                                                    {cc.is_active ? 'Active' : 'Inactive'}
                                                  </span>
                                                </td>
                                                <td className="px-3 py-2">
                                                  <div className="flex items-center justify-end gap-0.5">
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-7 rounded-md text-xs"
                                                      onClick={(e) => { e.stopPropagation(); openAdd(project.id, cc.id) }}
                                                      title="Add subclass"
                                                    >
                                                      <FolderOpen className="h-3.5 w-3.5 mr-1" />
                                                      Sub
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="h-7 rounded-md text-xs" onClick={(e) => { e.stopPropagation(); openEdit(cc) }} aria-label="Edit class">
                                                      <Edit className="h-3.5 w-3.5 mr-1" />
                                                      Edit
                                                    </Button>
                                                    <Button
                                                      variant="ghost"
                                                      size="icon"
                                                      className="h-7 w-7 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                      onClick={(e) => { e.stopPropagation(); openDelete(cc) }}
                                                      aria-label="Delete"
                                                      disabled={((cc as CostCenter & { projects_count?: number }).projects_count ?? cc.projects?.length ?? 0) > 0}
                                                    >
                                                      <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                  </div>
                                                </td>
                                              </tr>
                                            )
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-2xl max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Add class (cost center)</DialogTitle>
            <DialogDescription>Create a new class. Link to a project. Use &quot;Sub&quot; on a class to add a subclass.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Link to project</Label>
              <Select
                value={form.project_id != null ? String(form.project_id) : 'none'}
                onValueChange={(v) => setForm((p) => ({ ...p, project_id: v === 'none' ? null : Number(v) }))}
              >
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.project_code} — {p.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-name">Name *</Label>
              <Input id="add-name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Project Alpha" className="rounded-lg" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-desc">Description</Label>
              <Textarea id="add-desc" value={form.description ?? ''} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Optional" rows={2} className="rounded-lg" />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="add-active" checked={form.is_active ?? true} onCheckedChange={(c) => setForm((p) => ({ ...p, is_active: c }))} />
              <Label htmlFor="add-active">Active</Label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)} className="rounded-lg">Cancel</Button>
            <Button onClick={handleCreate} disabled={saving} className="rounded-lg bg-[#023e8a] hover:bg-[#023e8a]/90">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-2xl max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{selected?.parent_id ? 'Edit subclass' : 'Edit class'}</DialogTitle>
            <DialogDescription>
              {selected?.parent_id ? "Update this subclass's name, description, parent, or status." : 'Update name, description, or status.'}
              {selected?.code && (
                <span className="mt-2 block">
                  <code className="inline-block font-mono text-xs px-2 py-1.5 rounded border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                    {selected.code}
                  </code>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Link to project</Label>
              <Select value={form.project_id != null ? String(form.project_id) : 'none'} onValueChange={(v) => setForm((p) => ({ ...p, project_id: v === 'none' ? null : Number(v) }))}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.project_code} — {p.project_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Parent class</Label>
              <Select value={form.parent_id != null ? String(form.parent_id) : 'none'} onValueChange={(v) => setForm((p) => ({ ...p, parent_id: v === 'none' ? null : Number(v) }))}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="None (root)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (root)</SelectItem>
                  {selected &&
                    (selected.project_id != null ? flatForProject(selected.project_id) : [])
                      .filter(({ node }) => !descendantIds(selected).includes(node.id))
                      .map(({ node, depth }) => (
                        <SelectItem key={node.id} value={String(node.id)}>
                          {'—'.repeat(depth)} {node.name}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input id="edit-name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="rounded-lg" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea id="edit-desc" value={form.description ?? ''} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} className="rounded-lg" />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="edit-active" checked={form.is_active ?? true} onCheckedChange={(c) => setForm((p) => ({ ...p, is_active: c }))} />
              <Label htmlFor="edit-active">Active</Label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="rounded-lg">Cancel</Button>
            <Button onClick={handleUpdate} disabled={saving} className="rounded-lg bg-[#023e8a] hover:bg-[#023e8a]/90">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete cost center?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selected?.name}&quot;? This cannot be undone.
              Any subclasses under this class will also be removed. Cost centers linked to projects cannot be deleted—unlink the project first or deactivate instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProjectsPageLayout>
  )
}
