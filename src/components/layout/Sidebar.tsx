'use client'

import React, { useState, useEffect, useRef, memo, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useOrganizationStore } from '@/stores/organizationStore'
import { useSidebar, FLYOUT_WIDTH } from '@/contexts/SidebarContext'
import {
  FolderKanban,
  CreditCard,
  Building,
  Building2,
  BookOpen,
  Coins,
  Receipt,
  Heart,
  Settings,
  LayoutDashboard,
  Landmark,
  FileStack,
  Calculator,
  BarChart3,
  Package,
  ChevronsLeft,
  ChevronsRight,
  Folder,
  X,
  HelpCircle,
  MessageSquare,
  ShieldCheck,
  Tag,
  SlidersHorizontal,
  ClipboardCheck,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ApprovalCenterNavBadge } from '@/components/approval/ApprovalCenterNavBadge'
import { useApprovalCenterCounts } from '@/hooks/useApprovalCenterCounts'
import { useAuthStore } from '@/stores/authStore'

/** Solid triangle like image: right (collapsed) or down (expanded). Small, left-aligned. */
function ExpandTriangle({ expanded }: { expanded: boolean }) {
  return (
    <span className="flex shrink-0 w-3 justify-center text-gray-600">
      {expanded ? (
        <svg width="6" height="6" viewBox="0 0 10 10" fill="currentColor" className="text-gray-600 shrink-0">
          <path d="M0 2 L10 2 L5 10 Z" />
        </svg>
      ) : (
        <svg width="6" height="6" viewBox="0 0 10 10" fill="currentColor" className="text-gray-600 shrink-0">
          <path d="M0 0 L0 10 L10 5 Z" />
        </svg>
      )}
    </span>
  )
}

/** Outlined folder icon, thin lines like image. */
function NavFolderIcon({ className }: { className?: string }) {
  return <Folder className={cn('h-3.5 w-3.5 shrink-0 text-gray-600', className)} strokeWidth={1.25} />
}

/** Small dot for sub-module items (e.g. under Donor Management). */
function NavDotIcon({ className }: { className?: string }) {
  return <span className={cn('h-1.5 w-1.5 rounded-full bg-gray-500 shrink-0', className)} aria-hidden />
}

/** A flyout child is either a direct link or a group with nested links (dropdown). */
type NavChild =
  | { title: string; href: string; /** Hide link unless user can view period close */ access?: 'period-close' }
  | { title: string; children: { title: string; href: string }[] }

interface NavItem {
  title: string
  href?: string
  icon: React.ElementType
  children?: NavChild[]
  /** Pending count badge (e.g. Approval Center queue) */
  badge?: 'approval-center'
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Approval Center', href: '/approvals', icon: ClipboardCheck, badge: 'approval-center' },
  {
    title: 'Project Management',
    icon: FolderKanban,
    children: [
      {
        title: 'Project Portfolio',
        children: [
          { title: 'Project list', href: '/projects' },
          { title: 'Project register', href: '/projects/register' },
          { title: 'Project amendment', href: '/projects/amendment' },
          { title: 'Class list', href: '/projects/class-list' },
          { title: 'Project Reports', href: '/projects/reports' },
        ],
      },
      {
        title: 'Donor Management',
        children: [
          { title: 'Donor dashboard', href: '/projects/donors/dashboard' },
          { title: 'Donor register', href: '/projects/donors' },
          { title: 'Donor grants', href: '/projects/donors/grants' },
          { title: 'Donations', href: '/projects/donors/donations' },
          { title: 'Pledges', href: '/projects/donors/pledges' },
          { title: 'Donor reports', href: '/projects/donors/reports' },
        ],
      },
      {
        title: 'Budget management',
        children: [
          { title: 'Planning', href: '/budget/planning' },
          { title: 'Tracking', href: '/budget/tracking' },
          { title: 'Overview reports', href: '/budget/reports' },
          { title: 'Budget List', href: '/projects/budget' },
          { title: 'Budget register', href: '/projects/budget/add' },
          { title: 'Budget Amendments', href: '/projects/budget/amendments' },
          { title: 'Budget Reports', href: '/projects/budget/reports' },
          { title: 'Budget Format Templates', href: '/projects/budget/formats' },
        ],
      },
      {
        title: 'Donor Funds',
        children: [
          { title: 'Fund register', href: '/projects/donor-funds' },
          { title: 'Fund requests', href: '/projects/donor-funds/requests' },
          { title: 'Disbursements', href: '/projects/donor-funds/disbursements' },
          { title: 'Utilization', href: '/projects/donor-funds/utilization' },
          { title: 'Fund statements', href: '/projects/donor-funds/statements' },
          { title: 'Fund reports', href: '/projects/donor-funds/reports' },
        ],
      },
    ],
  },
  {
    title: 'Payroll Management',
    icon: CreditCard,
    children: [
      { title: 'Processing', href: '/payroll/processing' },
      { title: 'Tracking', href: '/payroll/tracking' },
      { title: 'Reports', href: '/payroll/reports' },
    ],
  },
  {
    title: 'Offices & Branches',
    icon: Building,
    children: [
      { title: 'Management', href: '/offices' },
      { title: 'Transfers', href: '/offices/transfers' },
    ],
  },
  {
    title: 'General Ledger',
    icon: BookOpen,
    children: [
      { title: 'General Ledger hub', href: '/general-ledger' },
      { title: 'Chart of Accounts', href: '/general-ledger/accounts' },
      {
        title: 'Journal Entries',
        children: [
          { title: 'Journal books', href: '/general-ledger/journal-entries' },
          { title: 'Posted ledger', href: '/general-ledger/journal-entries/posted' },
        ],
      },
      {
        title: 'Vouchers',
        children: [
          { title: 'Voucher list', href: '/vouchers' },
          { title: 'Voucher Settings', href: '/vouchers/settings' },
        ],
      },
      { title: 'Currency', href: '/general-ledger/currency' },
      { title: 'Fiscal Years', href: '/general-ledger/fiscal-years' },
      { title: 'Period Close', href: '/general-ledger/period-close', access: 'period-close' },
    ],
  },
  {
    title: 'Treasury & Cash',
    icon: Landmark,
    children: [
      {
        title: 'Cash Management',
        children: [
          { title: 'Cash accounts', href: '/treasury/cash' },
          { title: 'Withdrawal', href: '/treasury/cash/withdrawal' },
          { title: 'Deposit', href: '/treasury/cash/deposit' },
          { title: 'Exchange', href: '/treasury/cash/exchange' },
          { title: 'Transfer', href: '/treasury/cash/transfer' },
          { title: 'Inter-project loan', href: '/treasury/cash/interproject-loan' },
          { title: 'Cash count & Denomination', href: '/treasury/cash/cash-count' },
        ],
      },
      {
        title: 'Bank Management',
        children: [
          { title: 'Bank accounts', href: '/treasury/bank/accounts' },
          { title: 'Bank statements', href: '/treasury/bank/statements' },
          { title: 'Bank reconciliation', href: '/treasury/bank/reconciliation' },
        ],
      },
      {
        title: 'Advances',
        children: [
          { title: 'Advance List', href: '/treasury/advances/advance-list' },
          { title: 'Advance Settings', href: '/treasury/advances/settings' },
        ],
      },
    ],
  },
  {
    title: 'Accounts Payable',
    icon: Receipt,
    children: [
      { title: 'Invoices', href: '/payable/invoices' },
      { title: 'Payments', href: '/payable/payments' },
      { title: 'Vendors', href: '/payables/vendors' },
      { title: 'Expenses', href: '/payable/expenses' },
    ],
  },
  {
    title: 'Accounts Receivable',
    icon: Heart,
    children: [
      { title: 'Donor Receivables', href: '/receivable/donor' },
      { title: 'Revenue', href: '/receivable/revenue' },
      { title: 'Aging Reports', href: '/receivable/aging' },
      { title: 'Donors', href: '/receivables/donors' },
    ],
  },
  {
    title: 'Fixed Assets',
    icon: Package,
    children: [
      { title: 'Register', href: '/assets' },
      { title: 'Depreciation', href: '/assets/depreciation' },
      { title: 'Tracking', href: '/assets/tracking' },
    ],
  },
  {
    title: 'Tax Management',
    icon: Calculator,
    children: [
      { title: 'Journals', href: '/tax/journals' },
      { title: 'Reports', href: '/tax/reports' },
      { title: 'Clearance', href: '/tax/clearance' },
    ],
  },
  {
    title: 'Financial Reporting',
    icon: BarChart3,
    children: [
      { title: 'Standard', href: '/reports' },
      { title: 'Custom', href: '/reports/custom' },
      { title: 'Donor Reports', href: '/reports/donor-reports' },
    ],
  },
  {
    title: 'Document Management',
    icon: FileStack,
    children: [
      { title: 'Archive Management', href: '/archive' },
      { title: 'Storage', href: '/documents' },
    ],
  },
  {
    title: 'Audit & Compliance',
    icon: ShieldCheck,
    children: [
      { title: 'Audit Trail', href: '/audit-compliance/audit-trail' },
      { title: 'Compliance Dashboard', href: '/audit-compliance/dashboard' },
      { title: 'Donor / Grant Compliance', href: '/audit-compliance/donor-compliance' },
      { title: 'Internal Controls', href: '/audit-compliance/internal-controls' },
      { title: 'External Audit', href: '/audit-compliance/external-audit' },
      { title: 'Findings & Remediation', href: '/audit-compliance/findings' },
    ],
  },
  { title: 'Finance Assistant', href: '/assistant', icon: MessageSquare },
  // Separator before System Administration
  {
    title: 'System Administration',
    icon: Settings,
    children: [
      { title: 'Administration Hub', href: '/admin' },
      { title: 'Users', href: '/admin/users' },
      { title: 'Roles', href: '/admin/roles' },
      { title: 'Departments', href: '/admin/departments' },
      { title: 'Permissions', href: '/admin/permissions' },
      { title: 'Access Matrix', href: '/admin/access-matrix' },
      {
        title: 'Approval Workflow',
        children: [
          { title: 'Policy & limits', href: '/admin/approval-workflow' },
          { title: 'Queue & review', href: '/admin/approval-workflow/queue' },
          { title: 'Approvers & access', href: '/admin/approval-workflow/approvers' },
        ],
      },
      { title: 'Audit Trail', href: '/audit-compliance/audit-trail' },
      { title: 'Login Activity', href: '/admin/sessions' },
      { title: 'Security Settings', href: '/admin/security-settings' },
      { title: 'System Configuration', href: '/admin/config' },
    ],
  },
  {
    title: 'Organization Setup',
    icon: Building2,
    children: [
      { title: 'Organization Profile', href: '/admin/organization' },
      { title: 'Office Setup', href: '/admin/office-setup' },
      { title: 'Organogram', href: '/admin/organogram' },
    ],
  },
]

const SEPARATOR_BEFORE_INDEX = 15 // before System Administration

/** Normalize path for comparison (trailing slash, empty). */
function norm(p: string) {
  return (p || '/').replace(/\/$/, '') || '/'
}

/** Exact match: pathname equals href (normalized). */
function pathMatches(pathname: string, href: string): boolean {
  return norm(pathname) === norm(href)
}

/** True if pathname is exactly href or a path under href (e.g. /projects or /projects/123). */
function pathUnder(pathname: string, href: string): boolean {
  const p = norm(pathname)
  const h = norm(href)
  return p === h || p.startsWith(h + '/')
}

/** Collect all hrefs from flyout children (direct links + nested in groups). */
function collectFlyoutHrefs(children: NavChild[]): string[] {
  const hrefs: string[] = []
  for (const c of children) {
    if ('href' in c) hrefs.push(c.href)
    else for (const sub of c.children || []) {
      if ('href' in sub) hrefs.push(sub.href)
      else for (const nest of (sub as { title: string; children: { title: string; href: string }[] }).children || []) hrefs.push((nest as { title: string; href: string }).href)
    }
  }
  return hrefs
}

/** Best matching href for pathname in this flyout (longest match so the right item stays selected when on that page). */
function getActiveFlyoutHref(pathname: string, children: NavChild[]): string | null {
  const p = norm(pathname)
  const hrefs = collectFlyoutHrefs(children)
  let best: string | null = null
  let bestLen = -1
  for (const href of hrefs) {
    const h = norm(href)
    if (p !== h && !p.startsWith(h + '/')) continue
    if (h.length > bestLen) {
      bestLen = h.length
      best = href
    }
  }
  return best
}

function isPathInNavChild(pathname: string, child: NavChild): boolean {
  if ('href' in child) return pathUnder(pathname, child.href)
  return child.children?.some((c) => pathUnder(pathname, c.href)) ?? false
}

/** Single nav item: closed = icon only; opened = icon + label. Items with children open the second sidebar (sub-modules). No chevron. */
function NavItemButton({
  item,
  index,
  isCollapsed,
  isActive,
  onOpenFlyout,
  flyoutOpenForThis,
  isAnotherFlyoutOpen,
  approvalQueueTotal,
}: {
  item: NavItem
  index: number
  isCollapsed: boolean
  isActive: boolean
  onOpenFlyout: (index: number) => void
  flyoutOpenForThis: boolean
  isAnotherFlyoutOpen: boolean
  /** Pending approval count for Approval Center badge (from Sidebar useApprovalCenterCounts). */
  approvalQueueTotal?: number
}) {
  const pathname = usePathname()
  const hasChildren = item.children && item.children.length > 0
  const isChildActive =
    hasChildren &&
    item.children?.some((c) => isPathInNavChild(pathname, c))
  const Icon = item.icon
  // When another flyout is open, only that flyout's item is active—suppress pathname-based highlight
  const active = flyoutOpenForThis || (!isAnotherFlyoutOpen && (isActive || isChildActive))

  if (isCollapsed) {
    if (!hasChildren && item.href) {
      return (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center justify-center w-full h-8 relative transition-colors',
                  active ? 'bg-gray-300' : 'hover:bg-gray-200'
                )}
              >
                {active && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-700 rounded-r" />
                )}
                <span className="relative inline-flex items-center justify-center">
                  <Icon className="h-4 w-4 text-gray-900" strokeWidth={2} />
                  {item.badge === 'approval-center' && approvalQueueTotal != null && approvalQueueTotal > 0 && (
                    <ApprovalCenterNavBadge collapsed count={approvalQueueTotal} />
                  )}
                </span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {item.title}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => onOpenFlyout(index)}
              className={cn(
                'flex items-center justify-center w-full h-8 relative transition-colors',
                active ? 'bg-gray-300' : 'hover:bg-gray-200'
              )}
            >
              {active && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-700 rounded-r" />
              )}
              <Icon className="h-4 w-4 text-gray-900" strokeWidth={2} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {item.title}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (!hasChildren && item.href) {
    return (
      <Link
        href={item.href}
        prefetch
        className={cn(
          'flex items-center gap-2 px-2.5 py-1.5 mx-1.5 rounded-r-md text-sm transition-colors border-l-2 border-transparent',
          active
            ? 'bg-emerald-50 text-emerald-950 border-l-primary'
            : 'text-gray-900 hover:bg-gray-100 font-medium'
        )}
      >
        <span className="flex items-center justify-center w-7 h-7 shrink-0">
          <Icon className={cn('h-4 w-4', active ? 'text-emerald-800' : 'text-gray-800')} strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1 truncate">{item.title}</span>
        {item.badge === 'approval-center' && approvalQueueTotal != null && approvalQueueTotal > 0 && (
          <ApprovalCenterNavBadge count={approvalQueueTotal} />
        )}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onOpenFlyout(index)}
      className={cn(
        'flex items-center gap-2 px-2.5 py-1.5 mx-1.5 w-full rounded-r-md text-sm transition-colors border-l-2 border-transparent text-left font-medium',
        active
          ? 'bg-emerald-50 text-emerald-950 border-l-primary'
          : 'text-gray-900 hover:bg-gray-100'
      )}
    >
      <span className="flex items-center justify-center w-7 h-7 shrink-0">
        <Icon className={cn('h-4 w-4', active ? 'text-emerald-800' : 'text-gray-800')} strokeWidth={1.75} />
      </span>
      <span className="flex-1 truncate">{item.title}</span>
    </button>
  )
}

function userCanViewPeriodClose(
  user: { is_super_admin?: boolean; permissions?: string[] } | null
): boolean {
  if (!user) return false
  if (user.is_super_admin) return true
  const p = user.permissions ?? []
  return (
    p.includes('view-period-close') ||
    p.includes('manage-period-close') ||
    p.includes('permanently-lock-period-close')
  )
}

function SidebarInner() {
  const pathname = usePathname()
  const { isCollapsed, toggle, width, setFlyoutOpen } = useSidebar()
  const { data: approvalCounts } = useApprovalCenterCounts()
  const { branding, organization, fetchOrganization } = useOrganizationStore()
  const user = useAuthStore((s) => s.user)
  const projectListLabel = (organization?.short_name || organization?.name) ? `${organization.short_name || organization.name} Projects Portfolio` : 'Project Portfolio'
  const resolvedNavItems = useMemo(() => {
    const canPc = userCanViewPeriodClose(user)
    return navItems.map((item) => {
      if (item.children) {
        return {
          ...item,
          children: item.children
            .filter((child) => {
              if ('href' in child && child.access === 'period-close' && !canPc) return false
              return true
            })
            .map((child) =>
              'children' in child && child.title === 'Project Portfolio'
                ? { ...child, title: projectListLabel }
                : child
            ),
        }
      }
      return item
    })
  }, [projectListLabel, user])
  const [flyoutIndex, setFlyoutIndex] = useState<number | null>(null)
  const [expandedTopKey, setExpandedTopKey] = useState<string | null>(null)
  const [expandedNestedKey, setExpandedNestedKey] = useState<string | null>(null)
  const flyoutRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!branding) fetchOrganization()
  }, [branding, fetchOrganization])

  useEffect(() => {
    setFlyoutOpen(flyoutIndex !== null)
    if (flyoutIndex === null) {
      setExpandedTopKey(null)
      setExpandedNestedKey(null)
    }
  }, [flyoutIndex, setFlyoutOpen])

  useEffect(() => {
    if (flyoutIndex === null) return
    const handle = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        flyoutRef.current && !flyoutRef.current.contains(target) &&
        sidebarRef.current && !sidebarRef.current.contains(target)
      ) {
        setFlyoutIndex(null)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [flyoutIndex])

  const flyoutItem = flyoutIndex !== null ? resolvedNavItems[flyoutIndex] : null

  const handleFlyoutToggle = (index: number) => {
    setFlyoutIndex((prev) => (prev === index ? null : index))
  }

  return (
    <>
      <aside
        ref={sidebarRef}
        data-sidebar-closed={isCollapsed ? '' : undefined}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-200 ease-out',
          isCollapsed ? 'bg-gray-100' : 'bg-white border-r border-gray-200'
        )}
        style={{ width }}
      >
        {/* Top: logo + collapse — matches header (primary), no gray box around logo */}
        <div
          className={cn(
            'shrink-0 flex items-center border-b border-primary-dark bg-primary transition-colors',
            isCollapsed
              ? 'h-14 flex-row justify-between items-center px-2'
              : 'h-14 justify-between gap-2 px-3'
          )}
        >
          <Link
            href="/dashboard"
            className={cn(
              'flex items-center min-w-0',
              isCollapsed ? 'justify-center flex-1 min-w-0' : 'gap-2 flex-1'
            )}
          >
            {branding?.logo_url ? (
              <img
                src={branding.logo_url}
                alt={branding.name || 'Logo'}
                className="flex-shrink-0 w-12 h-12 object-contain"
              />
            ) : (
              <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 text-white/90">
                <BarChart3 className="h-6 w-6" strokeWidth={2} />
              </div>
            )}
            {!isCollapsed && (
              <div className="min-w-0">
                <h1 className="text-[15px] font-semibold text-white truncate leading-tight">
                  {branding?.short_name || 'AADA'} Finance
                </h1>
                <p className="text-xs text-emerald-300 font-medium leading-tight">ERP</p>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={toggle}
            className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-md text-emerald-200 hover:bg-white/10 hover:text-white transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronsRight className="h-4 w-4" strokeWidth={2} />
            ) : (
              <ChevronsLeft className="h-4 w-4" strokeWidth={2} />
            )}
          </button>
        </div>

        {/* Nav - compact, tight spacing */}
        <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-1 overscroll-contain">
          <div className="space-y-0">
            {resolvedNavItems.map((navItem, index) => {
              const showSeparator = index === SEPARATOR_BEFORE_INDEX
              const isActive = navItem.href
                ? pathname === navItem.href
                : !!(navItem.children?.some((c) => isPathInNavChild(pathname, c)))
              const navKey = navItem.href ?? navItem.title
              const approvalQueueTotal =
                navItem.badge === 'approval-center' ? approvalCounts?.all : undefined
              return (
                <React.Fragment key={navKey}>
                  {showSeparator && (
                    <div
                      className={cn(
                        'mx-1.5 my-0.5 border-t border-gray-200',
                        isCollapsed ? 'mx-2 my-0.5' : ''
                      )}
                    />
                  )}
                  <div className="relative">
                    <NavItemButton
                      item={navItem}
                      index={index}
                      isCollapsed={isCollapsed}
                      isActive={isActive}
                      onOpenFlyout={handleFlyoutToggle}
                      flyoutOpenForThis={flyoutIndex === index}
                      isAnotherFlyoutOpen={flyoutIndex !== null && flyoutIndex !== index}
                      approvalQueueTotal={approvalQueueTotal}
                    />
                  </div>
                </React.Fragment>
              )
            })}
          </div>
        </nav>

        {/* Bottom: Help Guide + Settings (under Help Guide module) + System Version */}
        <div
          className={cn(
            'shrink-0 border-t border-gray-200 flex flex-col',
            isCollapsed ? 'bg-gray-100' : 'bg-white'
          )}
        >
          <div
            className={cn(
              'py-1.5',
              isCollapsed
                ? 'px-0 flex flex-col items-center gap-0.5'
                : 'px-2 space-y-0.5'
            )}
          >
            {isCollapsed ? (
              <>
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href="/help"
                        className="flex items-center justify-center w-full h-9 rounded-md text-gray-600 hover:bg-gray-200 transition-colors"
                      >
                        <HelpCircle className="h-4 w-4 text-gray-600" strokeWidth={1.75} />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>Help Guide</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href="/settings"
                        className="flex items-center justify-center w-full h-9 rounded-md text-gray-600 hover:bg-gray-200 transition-colors"
                      >
                        <Settings className="h-4 w-4 text-gray-600" strokeWidth={1.75} />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>Settings</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            ) : (
              <>
                <Link
                  href="/help"
                  className="flex items-center gap-2 px-2.5 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <HelpCircle className="h-4 w-4 shrink-0 text-gray-500" strokeWidth={1.75} />
                  <span>Help Guide</span>
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-2 px-2.5 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Settings className="h-4 w-4 shrink-0 text-gray-500" strokeWidth={1.75} />
                  <span>Settings</span>
                </Link>
              </>
            )}
          </div>

          {/* Version — separator line above, no background */}
          <div className={cn('shrink-0 border-t border-gray-200', isCollapsed ? 'px-0 py-2 flex justify-center' : 'px-2.5 py-2.5')}>
            {(() => {
              const ver = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
              const versionLabel = `Version ${ver}`
              return isCollapsed ? (
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-200/90">
                        <Tag className="h-4 w-4 text-gray-500" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      <span className="text-xs font-medium">{versionLabel}</span>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <div className="flex items-center gap-2.5 text-gray-600">
                  <div className="flex items-center justify-center w-7 h-7 shrink-0 rounded-full border border-gray-200/90">
                    <Tag className="h-3.5 w-3.5 text-gray-500" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </div>
                  <span className="text-[11px] font-medium tabular-nums tracking-tight">
                    Version {ver}
                  </span>
                </div>
              )
            })()}
          </div>
        </div>
      </aside>

      {/* Second sidebar: sub-modules; overlays page, below header */}
      {flyoutItem?.children && flyoutIndex !== null && (
        <div
          ref={flyoutRef}
          className="fixed z-40 bg-white border-r border-gray-200 flex flex-col shadow-xl transition-[left] duration-200 ease-out"
          style={{
            left: width,
            top: 56,
            bottom: 0,
            width: FLYOUT_WIDTH,
          }}
        >
          <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2.5 border-b border-gray-200 bg-gray-50/80">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-600 truncate">
              {flyoutItem.title}
            </span>
            <button
              type="button"
              onClick={() => setFlyoutIndex(null)}
              className="flex-shrink-0 p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
              title="Close"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
          {/* When sub-module list is large, content wraps below and scrolls so all items stay accessible */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-1.5 text-left overscroll-contain">
            {(() => {
              const FLYOUT_ICON_COLUMN_WIDTH = '1.75rem' // dropdown + gap so folder aligns (same for all sub-modules)
              // Standard style for all sub-sub-modules (and any further nesting): connector line indented right near dot, dot icon, same link styles. Use these for any future sub-sub-modules.
              const SUB_SUBMODULE_WRAPPER_CLASS = 'border-l-2 border-gray-300 ml-5 mt-0.5 mb-1 pl-1.5'
              const SUB_SUBMODULE_LINK_PADDING_LEFT = '0.5rem'
              const SUB_SUBMODULE_LINK_BASE = 'flex items-center gap-2 w-full py-2 pr-2 rounded-md text-[12px] transition-colors border-l-4 border-transparent -ml-px'
              // No selection highlight in flyout: sub-modules/sub-sub-modules never show as selected; current location is shown only in the Header breadcrumb.
              return flyoutItem.children.map((child, i) => {
              if ('href' in child) {
                // Same layout for direct links: [dropdown icon][folder][label]; for links triangle is static (right)
                return (
                  <Link
                    key={i}
                    href={child.href}
                    prefetch
                    className="flex items-center gap-1.5 w-full pl-2 pr-3 py-2 mx-1.5 rounded-md text-[13px] transition-colors border-l-4 border-transparent text-left text-gray-700 hover:bg-gray-200"
                  >
                    <span className="flex shrink-0 items-center gap-1" style={{ width: FLYOUT_ICON_COLUMN_WIDTH }}>
                      <ExpandTriangle expanded={false} />
                      <NavFolderIcon />
                    </span>
                    <span className="truncate">{child.title}</span>
                  </Link>
                )
              }
              // Sub-module with sub-sub-modules: expandable [dropdown][folder][label]
              const topKey = `top-${i}`
              const isTopExpanded = expandedTopKey === topKey
              return (
                <div key={i}>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedTopKey((k) => (k === topKey ? null : topKey))
                    }
                    className="flex items-center gap-1.5 w-full pl-2 pr-3 py-2 mx-1.5 rounded-md text-[13px] transition-colors border-l-4 border-transparent text-left text-gray-700 hover:bg-gray-200"
                  >
                    <span className="flex shrink-0 items-center gap-1" style={{ width: FLYOUT_ICON_COLUMN_WIDTH }}>
                      <ExpandTriangle expanded={isTopExpanded} />
                      <NavFolderIcon />
                    </span>
                    <span className="truncate">{child.title}</span>
                  </button>
                  {isTopExpanded && child.children && child.children.length > 0 && (
                    <div className={SUB_SUBMODULE_WRAPPER_CLASS}>
                      {child.children.map((sub, j) => {
                        if ('href' in sub) {
                          return (
                            <Link
                              key={j}
                              href={sub.href}
                              prefetch
                              className={cn(SUB_SUBMODULE_LINK_BASE, 'text-gray-700 hover:bg-gray-200')}
                              style={{ paddingLeft: SUB_SUBMODULE_LINK_PADDING_LEFT }}
                            >
                              <NavDotIcon />
                              <span className="truncate">{sub.title}</span>
                            </Link>
                          )
                        }
                        // Nested group: same [dropdown][folder][label]; children use SUB_SUBMODULE_* style (all future sub-sub-modules)
                        const nestedSub = sub as { title: string; children: { title: string; href: string }[] }
                        const nestedKey = `nested-${i}-${j}`
                        const isExpanded = expandedNestedKey === nestedKey
                        return (
                          <div key={j}>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedNestedKey((k) => (k === nestedKey ? null : nestedKey))
                              }
                              className="flex items-center gap-1.5 w-full pl-1.5 py-2 pr-2 rounded-md text-[13px] transition-colors border-l-4 border-transparent text-left -ml-px text-gray-700 hover:bg-gray-200"
                            >
                              <span className="flex shrink-0 items-center gap-1" style={{ width: FLYOUT_ICON_COLUMN_WIDTH }}>
                                <ExpandTriangle expanded={isExpanded} />
                                <NavFolderIcon />
                              </span>
                              <span className="truncate">{nestedSub.title}</span>
                            </button>
                            {isExpanded && nestedSub.children && (
                              <div className={SUB_SUBMODULE_WRAPPER_CLASS}>
                                {nestedSub.children.map((nest: { title: string; href: string }, k: number) => (
                                    <Link
                                      key={k}
                                      href={nest.href}
                                      prefetch
                                      className={cn(SUB_SUBMODULE_LINK_BASE, 'text-gray-700 hover:bg-gray-200 border-l-transparent')}
                                      style={{ paddingLeft: SUB_SUBMODULE_LINK_PADDING_LEFT }}
                                    >
                                      <NavDotIcon />
                                      <span className="truncate">{nest.title}</span>
                                    </Link>
                                  ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            });
          })()}
          </div>
        </div>
      )}
    </>
  )
}

export const Sidebar = memo(SidebarInner)
