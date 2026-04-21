'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Network,
  Plus,
  RefreshCw,
  Users,
  Building2,
  ChevronDown,
  ChevronRight,
  User,
  Briefcase,
  Edit,
  Trash2,
  Link2,
  Shield,
  AlertTriangle,
  CheckCircle2,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Search,
  FileDown,
  FileText,
  FileSpreadsheet,
  FileType,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useOrganizationStore } from '@/stores/organizationStore'
import {
  getOrganogram,
  getUnits,
  getPositions,
  createUnit,
  updateUnit,
  deleteUnit,
  createPosition,
  updatePosition,
  deletePosition,
  assignUser,
  getSodRules,
  createSodRule,
  deleteSodRule,
  OrganogramData,
  OrganizationalUnit,
  Position,
  PositionNode,
  SegregationOfDuties,
} from '@/lib/api/organogram'

// Tabs for the organogram page
const tabs = [
  { id: 'chart', label: 'Organization Chart', icon: Network },
  { id: 'units', label: 'Units/Departments', icon: Building2 },
  { id: 'positions', label: 'Positions', icon: Briefcase },
  { id: 'sod', label: 'Segregation of Duties', icon: Shield },
]

const unitTypes = [
  { value: 'division', label: 'Division' },
  { value: 'department', label: 'Department' },
  { value: 'unit', label: 'Unit' },
  { value: 'section', label: 'Section' },
  { value: 'team', label: 'Team' },
]

const positionLevels = [
  { value: 'executive', label: 'Executive' },
  { value: 'senior_management', label: 'Senior Management' },
  { value: 'middle_management', label: 'Middle Management' },
  { value: 'supervisory', label: 'Supervisory' },
  { value: 'professional', label: 'Professional' },
  { value: 'support', label: 'Support Staff' },
]

// Position level colors for Positions tab (badges)
const levelColors: Record<string, string> = {
  executive: 'bg-purple-100 border-purple-300 text-purple-800',
  senior_management: 'bg-emerald-100 border-emerald-300 text-emerald-900',
  middle_management: 'bg-cyan-100 border-cyan-300 text-cyan-800',
  supervisory: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  professional: 'bg-amber-100 border-amber-300 text-amber-800',
  support: 'bg-gray-100 border-gray-300 text-gray-800',
}

// Chart node colors by position level (solid bg + white text) — segregates levels in the organogram
const chartLevelStyles: Record<string, { box: string; border: string; line: string }> = {
  executive: { box: 'bg-purple-600', border: 'border-purple-700', line: 'bg-purple-600' },
  senior_management: { box: 'bg-primary', border: 'border-emerald-800/80', line: 'bg-primary' },
  middle_management: { box: 'bg-cyan-600', border: 'border-cyan-700', line: 'bg-cyan-600' },
  supervisory: { box: 'bg-emerald-600', border: 'border-emerald-700', line: 'bg-emerald-600' },
  professional: { box: 'bg-amber-600', border: 'border-amber-700', line: 'bg-amber-600' },
  support: { box: 'bg-gray-600', border: 'border-gray-700', line: 'bg-gray-600' },
}
const CHART_DEFAULT = { box: 'bg-emerald-600', border: 'border-emerald-700', line: 'bg-emerald-600' }
function getChartStyle(level: string | undefined) {
  return (level && chartLevelStyles[level]) ? chartLevelStyles[level] : CHART_DEFAULT
}

// Organization Chart Node — color by position level, white text, neutral connectors
function OrgChartNode({ node, level = 0, exportMode = false }: { node: PositionNode; level?: number; exportMode?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(level < 2)
  const hasChildren = node.direct_reports && node.direct_reports.length > 0
  const style = getChartStyle(node.level)

  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          'relative min-w-[200px] rounded-lg border-2 py-3 px-4 shadow-sm transition-all text-white',
          style.box,
          style.border,
          node.is_vacant && 'opacity-90 border-dashed',
          !exportMode && 'cursor-pointer hover:shadow-md hover:brightness-110',
          exportMode && 'min-w-[220px] py-3.5 px-4'
        )}
        onClick={() => !exportMode && hasChildren && setIsExpanded(!isExpanded)}
      >
        <div>
          <p className={cn('font-semibold text-white truncate text-center', exportMode ? 'text-base' : 'text-sm')}>{node.title}</p>
          {node.department && (
            <p className={cn('text-white/90 truncate text-center mt-0.5', exportMode ? 'text-xs' : 'text-xs')}>{node.department}</p>
          )}
          <div className="mt-3 flex items-center justify-center gap-2 min-h-[28px]">
            {node.holder ? (
              <>
                <div className="w-7 h-7 rounded-full bg-white/20 border border-white/40 flex items-center justify-center shrink-0">
                  <User className="h-3.5 w-3.5 text-white" />
                </div>
                <span className={cn('font-medium text-white truncate max-w-[120px]', exportMode ? 'text-sm' : 'text-xs')}>
                  {node.holder.name}
                  {node.holder.is_acting && <span className="text-white/80 ml-0.5">(Acting)</span>}
                </span>
              </>
            ) : (
              <span className={cn('text-white/80', exportMode ? 'text-sm' : 'text-xs italic')}>
                {exportMode ? '—' : 'Vacant'}
              </span>
            )}
          </div>
        </div>
        {hasChildren && !exportMode && (
          <div className={cn('absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 shadow flex items-center justify-center z-10', style.box, style.border)}>
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-white" /> : <ChevronRight className="h-3.5 w-3.5 text-white" />}
          </div>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="relative mt-6 flex gap-6" style={{ paddingTop: '44px' }}>
          {/* Connector layer: neutral gray so level-colored boxes stand out */}
          <div className="absolute top-0 left-0 right-0 h-11 pointer-events-none" aria-hidden>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 bg-slate-400" style={{ height: '24px' }} />
            <div className="absolute left-0 right-0 w-full bg-slate-400 h-0.5" style={{ top: '23px' }} />
          </div>
          {node.direct_reports.map((child) => (
            <div key={child.id} className="relative flex flex-col items-center">
              <div className="absolute left-1/2 -translate-x-1/2 w-0.5 bg-slate-400" style={{ top: '-20px', height: '20px' }} />
              <OrgChartNode node={child} level={level + 1} exportMode={exportMode} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Unit Tree Item Component — clean hierarchy with visible actions
function UnitTreeItem({
  unit,
  level = 0,
  onEdit,
  onDelete,
  onAddChild,
}: {
  unit: OrganizationalUnit
  level?: number
  onEdit: (unit: OrganizationalUnit) => void
  onDelete: (unit: OrganizationalUnit) => void
  onAddChild: (parentId: number) => void
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const hasChildren = unit.children && unit.children.length > 0

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-center gap-3 py-2.5 px-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/30 transition-colors group',
          level > 0 && 'ml-6'
        )}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="w-6" aria-hidden />
        )}
        <div
          className="w-3 h-3 rounded-full shrink-0 border border-white shadow-sm"
          style={{ backgroundColor: unit.color || 'var(--muted)' }}
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">{unit.name}</p>
          <p className="text-xs text-muted-foreground">
            {unit.type} · {unit.positions_count ?? 0} positions · {unit.staff_count ?? 0} staff
          </p>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onAddChild(unit.id)} title="Add sub-unit">
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(unit)} title="Edit unit">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(unit)} title="Delete unit">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {hasChildren && isExpanded && (
        <div className="border-l-2 border-border/50 ml-5 mt-1 pl-2">
          {unit.children!.map((child) => (
            <UnitTreeItem key={child.id} unit={child} level={level + 1} onEdit={onEdit} onDelete={onDelete} onAddChild={onAddChild} />
          ))}
        </div>
      )}
    </div>
  )
}

/** Fetch logo URL and return as data URL for embedding in exports (same-origin or CORS-friendly) */
async function getLogoDataUrl(logoUrl: string | null | undefined): Promise<string | null> {
  if (!logoUrl) return null
  try {
    const res = await fetch(logoUrl, { mode: 'cors' })
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/** Capture the on-screen chart (logo + green boxes + lines) as image for export. Lazy-loads html2canvas. */
async function captureChartAsImage(containerRef: React.RefObject<HTMLDivElement | null>): Promise<string | null> {
  if (!containerRef.current) return null
  const el = containerRef.current
  const origOverflow = el.style.overflow
  const origMaxHeight = el.style.maxHeight
  try {
    const { default: html2canvas } = await import('html2canvas')
    el.style.overflow = 'visible'
    el.style.maxHeight = 'none'
    const canvas = await html2canvas(el, {
      scale: 2.5,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    })
    return canvas.toDataURL('image/png')
  } catch {
    return null
  } finally {
    el.style.overflow = origOverflow
    el.style.maxHeight = origMaxHeight
  }
}

export default function OrganogramPage() {
  const { organization } = useOrganizationStore()
  const [activeTab, setActiveTab] = useState('chart')
  const [isLoading, setIsLoading] = useState(true)
  const [organogramData, setOrganogramData] = useState<OrganogramData | null>(null)
  const [units, setUnits] = useState<OrganizationalUnit[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [sodRules, setSodRules] = useState<SegregationOfDuties[]>([])
  
  // Dialogs
  const [unitDialogOpen, setUnitDialogOpen] = useState(false)
  const [positionDialogOpen, setPositionDialogOpen] = useState(false)
  const [sodDialogOpen, setSodDialogOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<OrganizationalUnit | null>(null)
  const [editingPosition, setEditingPosition] = useState<Position | null>(null)
  const [parentUnitId, setParentUnitId] = useState<number | null>(null)
  
  // Zoom
  const [zoom, setZoom] = useState(100)
  const [isExporting, setIsExporting] = useState(false)
  const [isCapturingForExport, setIsCapturingForExport] = useState(false)
  const chartContainerRef = useRef<HTMLDivElement>(null)

  // Search/filter
  const [unitSearch, setUnitSearch] = useState('')
  const [positionSearch, setPositionSearch] = useState('')

  // Delete confirmations
  const [unitToDelete, setUnitToDelete] = useState<OrganizationalUnit | null>(null)
  const [positionToDelete, setPositionToDelete] = useState<Position | null>(null)
  const [sodRuleToDelete, setSodRuleToDelete] = useState<SegregationOfDuties | null>(null)

  // Form states
  const [unitForm, setUnitForm] = useState({
    name: '',
    code: '',
    type: 'department' as 'section' | 'unit' | 'division' | 'department' | 'team',
    description: '',
    head_title: '',
    color: '#3B82F6',
  })

  const [positionForm, setPositionForm] = useState({
    title: '',
    code: '',
    organizational_unit_id: '',
    reports_to_id: '',
    level: 'professional' as 'executive' | 'senior_management' | 'middle_management' | 'supervisory' | 'professional' | 'support',
    description: '',
    headcount: '1',
    is_supervisory: false,
  })

  const [sodForm, setSodForm] = useState({
    name: '',
    description: '',
    rule_type: 'incompatible_positions' as const,
    position_a_id: '',
    position_b_id: '',
    severity: 'warning' as const,
  })

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [orgData, unitsData, positionsData, sodData] = await Promise.all([
        getOrganogram(),
        getUnits(),
        getPositions(),
        getSodRules(),
      ])
      setOrganogramData(orgData.data)
      setUnits(unitsData.data)
      setPositions(positionsData.data)
      setSodRules(sodData.data)
    } catch (error) {
      console.error('Failed to fetch organogram data:', error)
      toast.error('Failed to load organogram data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Unit handlers
  const handleOpenUnitDialog = (unit?: OrganizationalUnit, parentId?: number) => {
    if (unit) {
      setEditingUnit(unit)
      setUnitForm({
        name: unit.name,
        code: unit.code || '',
        type: unit.type,
        description: unit.description || '',
        head_title: unit.head_title || '',
        color: unit.color || '#3B82F6',
      })
      setParentUnitId(unit.parent_id || null)
    } else {
      setEditingUnit(null)
      setUnitForm({
        name: '',
        code: '',
        type: 'department',
        description: '',
        head_title: '',
        color: '#3B82F6',
      })
      setParentUnitId(parentId || null)
    }
    setUnitDialogOpen(true)
  }

  const handleSaveUnit = async () => {
    try {
      if (editingUnit) {
        await updateUnit(editingUnit.id, { ...unitForm, parent_id: parentUnitId || undefined })
        toast.success('Unit updated successfully')
      } else {
        await createUnit({ ...unitForm, parent_id: parentUnitId || undefined })
        toast.success('Unit created successfully')
      }
      setUnitDialogOpen(false)
      fetchData()
    } catch (error) {
      toast.error('Failed to save unit')
    }
  }

  const handleDeleteUnit = (unit: OrganizationalUnit) => setUnitToDelete(unit)
  const confirmDeleteUnit = async () => {
    if (!unitToDelete) return
    try {
      await deleteUnit(unitToDelete.id)
      toast.success('Unit deleted successfully')
      setUnitToDelete(null)
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete unit')
    }
  }

  // Position handlers
  const handleOpenPositionDialog = (position?: Position) => {
    if (position) {
      setEditingPosition(position)
      setPositionForm({
        title: position.title,
        code: position.code || '',
        organizational_unit_id: position.organizational_unit_id?.toString() || '',
        reports_to_id: position.reports_to_id?.toString() || '',
        level: position.level,
        description: position.description || '',
        headcount: position.headcount?.toString() || '1',
        is_supervisory: position.is_supervisory,
      })
    } else {
      setEditingPosition(null)
      setPositionForm({
        title: '',
        code: '',
        organizational_unit_id: '',
        reports_to_id: '',
        level: 'professional' as 'executive' | 'senior_management' | 'middle_management' | 'supervisory' | 'professional' | 'support',
        description: '',
        headcount: '1',
        is_supervisory: false,
      })
    }
    setPositionDialogOpen(true)
  }

  const handleSavePosition = async () => {
    try {
      const data = {
        ...positionForm,
        organizational_unit_id: positionForm.organizational_unit_id ? parseInt(positionForm.organizational_unit_id) : undefined,
        reports_to_id: positionForm.reports_to_id ? parseInt(positionForm.reports_to_id) : undefined,
        headcount: parseInt(positionForm.headcount),
      }
      
      if (editingPosition) {
        await updatePosition(editingPosition.id, data)
        toast.success('Position updated successfully')
      } else {
        await createPosition(data)
        toast.success('Position created successfully')
      }
      setPositionDialogOpen(false)
      fetchData()
    } catch (error) {
      toast.error('Failed to save position')
    }
  }

  const handleDeletePosition = (position: Position) => setPositionToDelete(position)
  const confirmDeletePosition = async () => {
    if (!positionToDelete) return
    try {
      await deletePosition(positionToDelete.id)
      toast.success('Position deleted successfully')
      setPositionToDelete(null)
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete position')
    }
  }

  // SoD handlers
  const handleSaveSodRule = async () => {
    try {
      await createSodRule({
        ...sodForm,
        position_a_id: sodForm.position_a_id ? parseInt(sodForm.position_a_id) : undefined,
        position_b_id: sodForm.position_b_id ? parseInt(sodForm.position_b_id) : undefined,
      })
      toast.success('Rule created successfully')
      setSodDialogOpen(false)
      fetchData()
    } catch (error) {
      toast.error('Failed to create rule')
    }
  }

  const handleDeleteSodRule = (rule: SegregationOfDuties) => setSodRuleToDelete(rule)
  const confirmDeleteSodRule = async () => {
    if (!sodRuleToDelete) return
    try {
      await deleteSodRule(sodRuleToDelete.id)
      toast.success('Rule deleted successfully')
      setSodRuleToDelete(null)
      fetchData()
    } catch (error: any) {
      toast.error('Failed to delete rule')
    }
  }

  // Build hierarchical units for display
  const buildUnitTree = (units: OrganizationalUnit[]): OrganizationalUnit[] => {
    const unitMap = new Map<number, OrganizationalUnit>()
    const rootUnits: OrganizationalUnit[] = []

    // First pass: Create map
    units.forEach(unit => {
      unitMap.set(unit.id, { ...unit, children: [] })
    })

    // Second pass: Build tree
    units.forEach(unit => {
      const currentUnit = unitMap.get(unit.id)!
      if (unit.parent_id && unitMap.has(unit.parent_id)) {
        const parent = unitMap.get(unit.parent_id)!
        parent.children = parent.children || []
        parent.children.push(currentUnit)
      } else {
        rootUnits.push(currentUnit)
      }
    })

    return rootUnits
  }

  const unitTree = buildUnitTree(units)

  const exportData = useMemo(() => {
    if (!organogramData) return null
    return {
      units: unitTree,
      positions,
      sodRules,
      statistics: organogramData.statistics,
    }
  }, [organogramData, unitTree, positions, sodRules])

  const handleExportWord = async () => {
    if (!exportData) return
    setIsExporting(true)
    try {
      const { exportToWord } = await import('@/lib/organogram-export')
      setActiveTab('chart')
      await new Promise((r) => setTimeout(r, 300))
      setIsCapturingForExport(true)
      await new Promise((r) => setTimeout(r, 450))
      const [logoDataUrl, chartImageDataUrl] = await Promise.all([
        getLogoDataUrl(organization?.logo_url ?? null),
        captureChartAsImage(chartContainerRef),
      ])
      setIsCapturingForExport(false)
      await exportToWord({
        ...exportData,
        organizationName: organization?.name,
        logoDataUrl: logoDataUrl ?? undefined,
        chartTree: organogramData?.positions ?? undefined,
        chartImageDataUrl: chartImageDataUrl ?? undefined,
      })
      toast.success('Exported to Word')
    } catch (e) {
      toast.error('Export failed')
    } finally {
      setIsExporting(false)
    }
  }
  const handleExportExcel = async () => {
    if (!exportData) return
    setIsExporting(true)
    try {
      const { exportToExcel } = await import('@/lib/organogram-export')
      exportToExcel({
        ...exportData,
        organizationName: organization?.name,
        chartTree: organogramData?.positions ?? undefined,
      })
      toast.success('Exported to Excel')
    } catch (e) {
      toast.error('Export failed')
    } finally {
      setIsExporting(false)
    }
  }
  const handleExportPdf = async () => {
    if (!exportData) return
    setIsExporting(true)
    try {
      const { exportToPdf } = await import('@/lib/organogram-export')
      setActiveTab('chart')
      await new Promise((r) => setTimeout(r, 300))
      setIsCapturingForExport(true)
      await new Promise((r) => setTimeout(r, 450))
      const [logoDataUrl, chartImageDataUrl] = await Promise.all([
        getLogoDataUrl(organization?.logo_url ?? null),
        captureChartAsImage(chartContainerRef),
      ])
      setIsCapturingForExport(false)
      exportToPdf({
        ...exportData,
        organizationName: organization?.name,
        logoDataUrl: logoDataUrl ?? undefined,
        chartTree: organogramData?.positions ?? undefined,
        chartImageDataUrl: chartImageDataUrl ?? undefined,
      })
      toast.success('Exported to PDF')
    } catch (e) {
      toast.error('Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const unitTreeFiltered = useMemo(() => {
    if (!unitSearch.trim()) return unitTree
    const q = unitSearch.trim().toLowerCase()
    return unitTree.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.code && u.code.toLowerCase().includes(q)) ||
        u.type.toLowerCase().includes(q)
    )
  }, [unitTree, unitSearch])

  const positionsFiltered = useMemo(() => {
    if (!positionSearch.trim()) return positions
    const q = positionSearch.trim().toLowerCase()
    return positions.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.organizational_unit?.name?.toLowerCase().includes(q))
    )
  }, [positions, positionSearch])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header — professional with Export */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/5 shadow-sm">
            <Network className="h-6 w-6 text-primary" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Organogram</h1>
            <p className="text-sm text-muted-foreground">Organization structure, positions, reporting lines, and segregation of duties</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2" disabled={!exportData || isExporting}>
                <FileDown className="h-4 w-4" />
                Export
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Export organogram</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleExportWord} disabled={isExporting}>
                <FileText className="h-4 w-4 mr-2" />
                Export to Word (.docx)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleExportExcel} disabled={isExporting}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export to Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleExportPdf} disabled={isExporting}>
                <FileType className="h-4 w-4 mr-2" />
                Export to PDF (.pdf)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" className="gap-2" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50 p-1.5 rounded-xl h-auto flex flex-wrap gap-1 border border-border/50">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-2 rounded-lg px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border">
                <Icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </TabsTrigger>
            )
          })}
        </TabsList>

      {/* Tab Content */}
      <div className="space-y-4">
        <TabsContent value="chart" className="mt-0">
          <Card className="border-l-4 border-l-primary/80 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base">Organization Chart</CardTitle>
                <CardDescription>Hierarchy and reporting structure — click nodes to expand or collapse</CardDescription>
              </div>
              <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.max(50, z - 10))} title="Zoom out">
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="min-w-[3rem] text-center text-sm font-medium tabular-nums">{zoom}%</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.min(150, z + 10))} title="Zoom in">
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(100)} title="Reset zoom">
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div
                ref={chartContainerRef}
                className={cn(
                  'overflow-auto rounded-xl border bg-white p-6 min-h-[420px]',
                  isCapturingForExport && 'chart-export-mode'
                )}
                style={{ maxHeight: 'calc(100vh - 380px)' }}
                data-export-mode={isCapturingForExport || undefined}
              >
                {/* Logo and organization name (matches reference organogram) */}
                {(organization?.logo_url || organization?.name) && (
                  <div className={cn('flex items-center gap-4 mb-6 pb-4 border-b border-emerald-200', isCapturingForExport && 'mb-8 pb-6')}>
                    {organization.logo_url && (
                      <img
                        src={organization.logo_url}
                        alt=""
                        className={cn('object-contain shrink-0', isCapturingForExport ? 'h-16 w-16' : 'h-14 w-14')}
                        aria-hidden
                      />
                    )}
                    {organization.name && (
                      <h2 className={cn('font-semibold text-emerald-700', isCapturingForExport ? 'text-xl' : 'text-lg')}>
                        {organization.name}
                      </h2>
                    )}
                  </div>
                )}
                <div className="flex justify-center" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
                  {isLoading && !organogramData ? (
                    <div className="w-full space-y-6 py-8">
                      <Skeleton className="h-8 w-48 mx-auto" />
                      <div className="flex gap-8 justify-center">
                        <Skeleton className="h-28 w-[200px] rounded-lg" />
                        <Skeleton className="h-28 w-[200px] rounded-lg" />
                      </div>
                      <div className="flex gap-6 justify-center">
                        <Skeleton className="h-24 w-[180px] rounded-lg" />
                        <Skeleton className="h-24 w-[180px] rounded-lg" />
                        <Skeleton className="h-24 w-[180px] rounded-lg" />
                      </div>
                    </div>
                  ) : organogramData?.positions && organogramData.positions.length > 0 ? (
                    <div className="flex gap-8">
                      {organogramData.positions.map((root) => (
                        <OrgChartNode key={root.id} node={root} exportMode={isCapturingForExport} />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="rounded-full bg-muted p-4 mb-4">
                        <Network className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium text-foreground mb-1">No positions yet</h3>
                      <p className="text-sm text-muted-foreground mb-6 max-w-sm">Add units and positions to build your organization chart.</p>
                      <Button onClick={() => handleOpenPositionDialog()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add first position
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-4">
                <span className="text-xs font-medium text-muted-foreground mr-1">Level:</span>
                {positionLevels.map((l) => {
                  const s = getChartStyle(l.value)
                  return (
                    <div key={l.value} className="flex items-center gap-2">
                      <div className={cn('h-4 w-4 rounded border-2', s.box, s.border)} />
                      <span className="text-xs text-muted-foreground">{l.label}</span>
                    </div>
                  )
                })}
                <div className="flex items-center gap-2 ml-2">
                  <div className="h-4 w-4 rounded border-2 border-dashed bg-muted" />
                  <span className="text-xs text-muted-foreground">Vacant</span>
                </div>
                <span className="text-xs text-muted-foreground">Click a box to expand or collapse</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="units" className="mt-0">
          <Card className="border-l-4 border-l-primary/80 shadow-sm">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Organizational Units</CardTitle>
                <CardDescription>Departments, divisions, and teams in a hierarchical structure</CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search units..."
                    value={unitSearch}
                    onChange={(e) => setUnitSearch(e.target.value)}
                    className="pl-9 w-full sm:w-56"
                  />
                </div>
                <Button onClick={() => handleOpenUnitDialog()} className="sm:ml-2">
                  <Plus className="h-4 w-4 mr-2" />
                  Add unit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading && units.length === 0 ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : unitTreeFiltered.length > 0 ? (
                <div className="space-y-1">
                  {unitTreeFiltered.map((unit) => (
                    <UnitTreeItem
                      key={unit.id}
                      unit={unit}
                      onEdit={handleOpenUnitDialog}
                      onDelete={handleDeleteUnit}
                      onAddChild={(parentId) => handleOpenUnitDialog(undefined, parentId)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <Building2 className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-1">No units yet</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                    {unitSearch ? 'No units match your search.' : 'Create your first organizational unit to get started.'}
                  </p>
                  {!unitSearch && (
                    <Button onClick={() => handleOpenUnitDialog()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add first unit
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="positions" className="mt-0">
          <Card className="border-l-4 border-l-emerald-600/80 shadow-sm">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Positions</CardTitle>
                <CardDescription>Roles, levels, reporting lines, and current holders</CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search positions..."
                    value={positionSearch}
                    onChange={(e) => setPositionSearch(e.target.value)}
                    className="pl-9 w-full sm:w-56"
                  />
                </div>
                <Button onClick={() => handleOpenPositionDialog()} className="sm:ml-2">
                  <Plus className="h-4 w-4 mr-2" />
                  Add position
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading && positions.length === 0 ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : positionsFiltered.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Position</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Department</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Level</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Reports to</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Holder</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positionsFiltered.map((position) => (
                        <tr key={position.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-foreground">{position.title}</p>
                              {position.code && <p className="text-xs text-muted-foreground">{position.code}</p>}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">{position.organizational_unit?.name ?? '—'}</td>
                          <td className="py-3 px-4">
                            <Badge variant="secondary" className={cn('font-medium', levelColors[position.level])}>
                              {positionLevels.find((l) => l.value === position.level)?.label}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">{position.reports_to?.title ?? '—'}</td>
                          <td className="py-3 px-4">
                            {position.holder ? (
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                                <span className="text-foreground">{position.holder.name}</span>
                              </div>
                            ) : (
                              <span className="italic text-amber-600">Vacant</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenPositionDialog(position)} title="Edit">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeletePosition(position)} title="Delete">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <Briefcase className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-1">No positions yet</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                    {positionSearch ? 'No positions match your search.' : 'Define positions and assign them to units.'}
                  </p>
                  {!positionSearch && (
                    <Button onClick={() => handleOpenPositionDialog()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add first position
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sod" className="mt-0">
          <Card className="border-l-4 border-l-amber-600/80 shadow-sm">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Segregation of Duties</CardTitle>
                <CardDescription>Rules to prevent conflicts of interest and enforce internal controls</CardDescription>
              </div>
              <Button onClick={() => { setSodForm({ name: '', description: '', rule_type: 'incompatible_positions', position_a_id: '', position_b_id: '', severity: 'warning' }); setSodDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add rule
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading && sodRules.length === 0 ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-xl" />
                  ))}
                </div>
              ) : sodRules.length > 0 ? (
                <div className="space-y-3">
                  {sodRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-start gap-4 rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                          rule.severity === 'block' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-600'
                        )}
                      >
                        {rule.severity === 'block' ? <X className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="font-medium text-foreground">{rule.name}</p>
                          <Badge variant={rule.severity === 'block' ? 'destructive' : 'secondary'} className="text-xs">
                            {rule.severity === 'block' ? 'Blocks' : 'Warns'}
                          </Badge>
                        </div>
                        {rule.description && <p className="text-sm text-muted-foreground mb-2">{rule.description}</p>}
                        {rule.position_a && rule.position_b && (
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="rounded-md border bg-muted/50 px-2.5 py-1 font-medium text-foreground">{rule.position_a.title}</span>
                            <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="rounded-md border bg-muted/50 px-2.5 py-1 font-medium text-foreground">{rule.position_b.title}</span>
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive hover:text-destructive" onClick={() => handleDeleteSodRule(rule)} title="Delete rule">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <Shield className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-1">No rules defined</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm">Create segregation of duties rules to enforce internal controls.</p>
                  <Button onClick={() => setSodDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add first rule
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </div>
      </Tabs>

      {/* Unit Dialog */}
      <Dialog open={unitDialogOpen} onOpenChange={(open) => { if (open !== unitDialogOpen) setUnitDialogOpen(open) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUnit ? 'Edit unit' : 'Create unit'}</DialogTitle>
            <DialogDescription>Organizational units are departments, divisions, or teams in your structure.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label required>Name</Label>
              <Input
                value={unitForm.name}
                onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                placeholder="e.g., Finance Department"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input value={unitForm.code} onChange={(e) => setUnitForm({ ...unitForm, code: e.target.value })} placeholder="e.g., FIN" />
              </div>
              <div className="space-y-2">
                <Label required>Type</Label>
                <Select value={unitForm.type} onValueChange={(v) => setUnitForm({ ...unitForm, type: v as typeof unitForm.type })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {unitTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Parent unit</Label>
              <Select
                value={parentUnitId != null ? parentUnitId.toString() : '__none__'}
                onValueChange={(v) => setParentUnitId(v === '__none__' ? null : parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (top level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None (top level)</SelectItem>
                  {units.filter((u) => u.id !== editingUnit?.id).map((unit) => (
                    <SelectItem key={unit.id} value={unit.id.toString()}>{unit.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Head title</Label>
              <Input value={unitForm.head_title} onChange={(e) => setUnitForm({ ...unitForm, head_title: e.target.value })} placeholder="e.g., Director, Manager" />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={unitForm.color}
                  onChange={(e) => setUnitForm({ ...unitForm, color: e.target.value })}
                  className="h-10 w-10 cursor-pointer rounded border"
                />
                <Input value={unitForm.color} onChange={(e) => setUnitForm({ ...unitForm, color: e.target.value })} className="flex-1 font-mono text-sm" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={unitForm.description} onChange={(e) => setUnitForm({ ...unitForm, description: e.target.value })} rows={2} placeholder="Optional description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnitDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveUnit}>{editingUnit ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Position Dialog */}
      <Dialog open={positionDialogOpen} onOpenChange={(open) => { if (open !== positionDialogOpen) setPositionDialogOpen(open) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPosition ? 'Edit position' : 'Create position'}</DialogTitle>
            <DialogDescription>Positions define roles and reporting lines in your organization.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label required>Title</Label>
              <Input value={positionForm.title} onChange={(e) => setPositionForm({ ...positionForm, title: e.target.value })} placeholder="e.g., Finance Manager" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input value={positionForm.code} onChange={(e) => setPositionForm({ ...positionForm, code: e.target.value })} placeholder="e.g., FIN-MGR" />
              </div>
              <div className="space-y-2">
                <Label required>Level</Label>
                <Select value={positionForm.level} onValueChange={(v) => setPositionForm({ ...positionForm, level: v as typeof positionForm.level })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {positionLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Department / unit</Label>
              <Select
                value={positionForm.organizational_unit_id || '__none__'}
                onValueChange={(v) => setPositionForm({ ...positionForm, organizational_unit_id: v === '__none__' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Not assigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not assigned</SelectItem>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id.toString()}>{unit.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reports to</Label>
              <Select
                value={positionForm.reports_to_id || '__none__'}
                onValueChange={(v) => setPositionForm({ ...positionForm, reports_to_id: v === '__none__' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (top level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None (top level)</SelectItem>
                  {positions.filter((p) => p.id !== editingPosition?.id).map((pos) => (
                    <SelectItem key={pos.id} value={pos.id.toString()}>{pos.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Headcount</Label>
                <Input type="number" value={positionForm.headcount} onChange={(e) => setPositionForm({ ...positionForm, headcount: e.target.value })} min={1} />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={positionForm.is_supervisory} onChange={(e) => setPositionForm({ ...positionForm, is_supervisory: e.target.checked })} className="h-4 w-4 rounded border-input" />
                  <span className="text-sm font-medium">Supervisory role</span>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={positionForm.description} onChange={(e) => setPositionForm({ ...positionForm, description: e.target.value })} rows={2} placeholder="Optional description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPositionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePosition}>{editingPosition ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SoD Dialog */}
      <Dialog open={sodDialogOpen} onOpenChange={(open) => { if (open !== sodDialogOpen) setSodDialogOpen(open) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create segregation of duties rule</DialogTitle>
            <DialogDescription>Define incompatible positions to prevent conflicts of interest.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label required>Rule name</Label>
              <Input value={sodForm.name} onChange={(e) => setSodForm({ ...sodForm, name: e.target.value })} placeholder="e.g., Voucher creation and approval" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={sodForm.description} onChange={(e) => setSodForm({ ...sodForm, description: e.target.value })} rows={2} placeholder="Why these positions are incompatible" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label required>Position A</Label>
                <Select value={sodForm.position_a_id || '__none__'} onValueChange={(v) => setSodForm({ ...sodForm, position_a_id: v === '__none__' ? '' : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select position</SelectItem>
                    {positions.map((pos) => (
                      <SelectItem key={pos.id} value={pos.id.toString()}>{pos.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label required>Position B</Label>
                <Select value={sodForm.position_b_id || '__none__'} onValueChange={(v) => setSodForm({ ...sodForm, position_b_id: v === '__none__' ? '' : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select position</SelectItem>
                    {positions.map((pos) => (
                      <SelectItem key={pos.id} value={pos.id.toString()}>{pos.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label required>Severity</Label>
              <Select value={sodForm.severity} onValueChange={(v) => setSodForm({ ...sodForm, severity: v as typeof sodForm.severity })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warning">Warning — show alert but allow</SelectItem>
                  <SelectItem value="block">Block — prevent assignment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSodDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSodRule}>Create rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmations */}
      <AlertDialog open={!!unitToDelete} onOpenChange={(open) => !open && setUnitToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete unit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{unitToDelete?.name}&quot;? This may affect child units and positions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteUnit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!positionToDelete} onOpenChange={(open) => !open && setPositionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete position</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{positionToDelete?.title}&quot;? Assignments to this position will be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePosition} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!sodRuleToDelete} onOpenChange={(open) => !open && setSodRuleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the rule &quot;{sodRuleToDelete?.name}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSodRule} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
