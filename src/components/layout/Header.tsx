'use client'

import { useState, memo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useOrganizationStore } from '@/stores/organizationStore'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Search,
  Bell,
  Settings,
  ChevronRight,
  HelpCircle,
  RefreshCw,
  X,
  Home,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/contexts/SidebarContext'
import { OfficeSwitcher } from '@/components/layout/OfficeSwitcher'
import { getNotificationsUnreadCount } from '@/lib/api/notifications'
import { NotificationSlidePanel } from '@/components/notifications/NotificationSlidePanel'
import { HeaderUserMenu } from '@/components/layout/HeaderUserMenu'
import {
  SETTINGS_SECTION_LABELS,
  SETTINGS_SECTION_QUERY,
  isSettingsSectionId,
} from '@/components/settings/unified/settings-constants'

/** Path prefix -> { parent (module), title (page), parentHref (where clicking parent goes) }. Longest match wins. */
const pathBreadcrumbs: Record<string, { parent: string; title: string; parentHref: string }> = {
  // Organization Setup
  '/admin/organization': { parent: 'Organization Setup', title: 'Organization Profile', parentHref: '/admin/organization' },
  '/admin/office-setup': { parent: 'Organization Setup', title: 'Office Setup', parentHref: '/admin/organization' },
  '/admin/organogram': { parent: 'Organization Setup', title: 'Organogram', parentHref: '/admin/organization' },
  // System Administration
  '/admin/approval-workflow/queue': { parent: 'Approval Workflow', title: 'Queue & review', parentHref: '/admin/approval-workflow' },
  '/admin/approval-workflow/approvers': { parent: 'Approval Workflow', title: 'Approvers & access', parentHref: '/admin/approval-workflow' },
  '/admin/approval-workflow': { parent: 'System Administration', title: 'Approval Workflow', parentHref: '/admin' },
  '/admin/access-matrix': { parent: 'System Administration', title: 'Access Matrix', parentHref: '/admin' },
  '/admin/permissions': { parent: 'System Administration', title: 'Permissions', parentHref: '/admin' },
  '/admin/roles': { parent: 'System Administration', title: 'Roles', parentHref: '/admin' },
  '/admin/departments': { parent: 'System Administration', title: 'Departments', parentHref: '/admin' },
  '/admin/users': { parent: 'System Administration', title: 'Users', parentHref: '/admin' },
  '/admin/audit': { parent: 'System Administration', title: 'Audit Trail', parentHref: '/admin' },
  '/admin/sessions': { parent: 'System Administration', title: 'Login Activity', parentHref: '/admin' },
  '/admin/security-settings': { parent: 'System Administration', title: 'Security Settings', parentHref: '/admin' },
  '/admin/config': { parent: 'System Administration', title: 'System Configuration', parentHref: '/admin' },
  '/admin': { parent: 'Home', title: 'System Administration', parentHref: '/dashboard' },
  // Dashboard
  '/dashboard': { parent: 'Home', title: 'Dashboard', parentHref: '/dashboard' },
  '/approvals/vouchers': { parent: 'Approval Center', title: 'Vouchers', parentHref: '/approvals' },
  '/approvals/budgets': { parent: 'Approval Center', title: 'Budgets', parentHref: '/approvals' },
  '/approvals': { parent: 'Home', title: 'Approval Center', parentHref: '/dashboard' },
  // Finance Assistant
  '/assistant': { parent: 'Home', title: 'Finance Assistant', parentHref: '/assistant' },
  // Project Management
  '/projects': { parent: 'Project Portfolio', title: 'Project list', parentHref: '/projects' },
  '/projects/new': { parent: 'Project Portfolio', title: 'Add Project', parentHref: '/projects' },
  '/projects/register': { parent: 'Project Portfolio', title: 'Project register', parentHref: '/projects' },
  '/projects/amendment': { parent: 'Project Portfolio', title: 'Project amendment', parentHref: '/projects' },
  '/projects/reports': { parent: 'Project Portfolio', title: 'Project Reports', parentHref: '/projects' },
  '/projects/grants': { parent: 'Project Management', title: 'Grants', parentHref: '/projects' },
  '/projects/create': { parent: 'Project Management', title: 'New Project', parentHref: '/projects' },
  '/projects/inquiry': { parent: 'Project Management', title: 'Inquiry', parentHref: '/projects' },
  // Donor Management (sub-module)
  '/projects/donors/add': { parent: 'Project Management', title: 'Add donor', parentHref: '/projects/donors' },
  '/projects/donors/inquiry': { parent: 'Project Management', title: 'Donor register', parentHref: '/projects/donors' },
  '/projects/donors': { parent: 'Project Management', title: 'Donor register', parentHref: '/projects/donors' },
  // Budget management (sub-module under Project Management)
  '/projects/budget/amendments': { parent: 'Project Management', title: 'Budget Amendments', parentHref: '/projects/budget' },
  '/projects/budget/reports': { parent: 'Project Management', title: 'Budget Reports', parentHref: '/projects/budget' },
  '/projects/budget/add': { parent: 'Project Management', title: 'Budget register', parentHref: '/projects/budget' },
  '/projects/budget/inquiry': { parent: 'Project Management', title: 'Budget inquiry', parentHref: '/projects/budget' },
  '/projects/budget': { parent: 'Project Management', title: 'Budget List', parentHref: '/projects/budget' },
  '/projects/budget/formats': { parent: 'Project Management', title: 'Budget Format Templates', parentHref: '/projects/budget' },
  '/budgets': { parent: 'Project Management', title: 'Budgets', parentHref: '/budget/planning' },
  '/budget/planning': { parent: 'Project Management', title: 'Planning', parentHref: '/projects/budget' },
  '/budget/tracking': { parent: 'Project Management', title: 'Tracking', parentHref: '/projects/budget' },
  '/budget/reports': { parent: 'Project Management', title: 'Overview reports', parentHref: '/projects/budget' },
  '/budget': { parent: 'Project Management', title: 'Budget management', parentHref: '/projects/budget' },
  // Donor Funds (under Project Management)
  '/projects/donor-funds/reports': { parent: 'Project Management', title: 'Fund reports', parentHref: '/projects/donor-funds' },
  '/projects/donor-funds/statements': { parent: 'Project Management', title: 'Fund statements', parentHref: '/projects/donor-funds' },
  '/projects/donor-funds/utilization': { parent: 'Project Management', title: 'Utilization', parentHref: '/projects/donor-funds' },
  '/projects/donor-funds/disbursements': { parent: 'Project Management', title: 'Disbursements', parentHref: '/projects/donor-funds' },
  '/projects/donor-funds/requests': { parent: 'Project Management', title: 'Fund requests', parentHref: '/projects/donor-funds' },
  '/projects/donor-funds': { parent: 'Project Management', title: 'Fund register', parentHref: '/projects/grants' },
  // Legacy /funds redirects to Donor Funds
  '/funds/request': { parent: 'Project Management', title: 'Fund requests', parentHref: '/projects/donor-funds' },
  '/funds/tracking': { parent: 'Project Management', title: 'Utilization', parentHref: '/projects/donor-funds' },
  '/funds/reports': { parent: 'Project Management', title: 'Fund reports', parentHref: '/projects/donor-funds' },
  '/funds': { parent: 'Project Management', title: 'Donor Funds', parentHref: '/projects/donor-funds' },
  // Payroll Management
  '/payroll/processing': { parent: 'Payroll Management', title: 'Processing', parentHref: '/payroll/processing' },
  '/payroll/tracking': { parent: 'Payroll Management', title: 'Tracking', parentHref: '/payroll/processing' },
  '/payroll/reports': { parent: 'Payroll Management', title: 'Reports', parentHref: '/payroll/processing' },
  '/payroll': { parent: 'Payroll Management', title: 'Payroll Management', parentHref: '/payroll/processing' },
  // Offices & Branches
  '/offices/transfers': { parent: 'Offices & Branches', title: 'Transfers', parentHref: '/offices' },
  '/offices': { parent: 'Offices & Branches', title: 'Management', parentHref: '/offices' },
  // Document Management
  '/archive': { parent: 'Document Management', title: 'Archive', parentHref: '/archive' },
  '/documents': { parent: 'Document Management', title: 'Storage', parentHref: '/documents' },
  // General Ledger
  '/general-ledger/period-close': { parent: 'General Ledger', title: 'Period Close', parentHref: '/general-ledger' },
  '/general-ledger/voucher-settings': { parent: 'General Ledger', title: 'Voucher Settings', parentHref: '/general-ledger' },
  '/general-ledger/journal-entries/posted': { parent: 'General Ledger', title: 'Posted ledger', parentHref: '/general-ledger' },
  '/general-ledger/journal-entries': { parent: 'General Ledger', title: 'Journal Entries', parentHref: '/general-ledger' },
  '/general-ledger/currency/exchange-rates': { parent: 'Currency', title: 'Exchange Rates', parentHref: '/general-ledger/currency' },
  '/general-ledger/currency/converter': { parent: 'Currency', title: 'Converter', parentHref: '/general-ledger/currency' },
  '/general-ledger/currency': { parent: 'General Ledger', title: 'Currency', parentHref: '/general-ledger' },
  // Chart of Accounts sub-modules
  '/general-ledger/accounts/opening-balances': { parent: 'Chart of Accounts', title: 'Opening Balances', parentHref: '/general-ledger/accounts' },
  '/general-ledger/accounts/import-export': { parent: 'Chart of Accounts', title: 'Import & Export', parentHref: '/general-ledger/accounts' },
  '/general-ledger/accounts/structure/donor-mapping': { parent: 'Chart of Accounts', title: 'Donor Mapping', parentHref: '/general-ledger/accounts' },
  '/general-ledger/accounts/structure': { parent: 'Chart of Accounts', title: 'Structure Reference', parentHref: '/general-ledger/accounts' },
  '/general-ledger/accounts': { parent: 'General Ledger', title: 'Chart of Accounts', parentHref: '/general-ledger' },
  '/general-ledger': { parent: 'General Ledger', title: 'General Ledger hub', parentHref: '/dashboard' },
  // Settings
  '/settings': { parent: 'Home', title: 'Settings', parentHref: '/dashboard' },
  '/settings/profile': { parent: 'Settings', title: 'My profile', parentHref: '/settings' },
  '/settings/security': { parent: 'Settings', title: 'Security & privacy', parentHref: '/settings' },
  '/settings/appearance': { parent: 'Settings', title: 'Appearance & Design', parentHref: '/settings' },
  '/settings/accessibility': { parent: 'Settings', title: 'Accessibility', parentHref: '/settings' },
  '/settings/data-export': { parent: 'Settings', title: 'Data & Export', parentHref: '/settings' },
  '/settings/performance': { parent: 'Settings', title: 'Performance', parentHref: '/settings' },
  '/settings/localization': { parent: 'Settings', title: 'Localization', parentHref: '/settings' },
  '/settings/notifications': { parent: 'Settings', title: 'Notifications', parentHref: '/settings' },
  '/settings/preferences': { parent: 'Settings', title: 'System Preferences', parentHref: '/settings' },
  '/vouchers/settings': { parent: 'General Ledger', title: 'Voucher Settings', parentHref: '/general-ledger' },
  '/general-ledger/fiscal-years': { parent: 'General Ledger', title: 'Fiscal Years', parentHref: '/general-ledger' },
  '/help': { parent: 'Home', title: 'Help Guide', parentHref: '/dashboard' },
  // Vouchers
  '/vouchers': { parent: 'General Ledger', title: 'Vouchers', parentHref: '/general-ledger' },
  '/vouchers/new': { parent: 'Vouchers', title: 'New Voucher', parentHref: '/vouchers' },
  '/vouchers/edit': { parent: 'Vouchers', title: 'Edit Voucher', parentHref: '/vouchers' },
  // Treasury & Cash (longer paths first for breadcrumb matching)
  '/treasury/cash/interproject-loan': { parent: 'Cash Management', title: 'Inter-project loan', parentHref: '/treasury/cash' },
  '/treasury/cash/cash-count': { parent: 'Cash Management', title: 'Cash count & Denomination', parentHref: '/treasury/cash' },
  '/treasury/cash/transfer': { parent: 'Cash Management', title: 'Cash transfer', parentHref: '/treasury/cash' },
  '/treasury/cash/exchange': { parent: 'Cash Management', title: 'Cash exchange', parentHref: '/treasury/cash' },
  '/treasury/cash/deposit': { parent: 'Cash Management', title: 'Cash deposit', parentHref: '/treasury/cash' },
  '/treasury/cash/withdrawal': { parent: 'Cash Management', title: 'Cash withdrawal', parentHref: '/treasury/cash' },
  '/treasury/advances/settings': { parent: 'Advances', title: 'Advance settings', parentHref: '/treasury/advances/advance-list' },
  '/treasury/advances/advance-list': { parent: 'Treasury & Cash', title: 'Advance list', parentHref: '/treasury/cash' },
  '/treasury/advances': { parent: 'Treasury & Cash', title: 'Advances', parentHref: '/treasury/advances/advance-list' },
  '/treasury/bank/reconciliation': { parent: 'Bank Management', title: 'Bank reconciliation', parentHref: '/treasury/bank/accounts' },
  '/treasury/bank/statements': { parent: 'Bank Management', title: 'Bank statements', parentHref: '/treasury/bank/accounts' },
  '/treasury/bank/accounts': { parent: 'Treasury & Cash', title: 'Bank accounts', parentHref: '/treasury/cash' },
  '/treasury/bank': { parent: 'Treasury & Cash', title: 'Bank Management', parentHref: '/treasury/bank/accounts' },
  '/treasury/cash': { parent: 'Treasury & Cash', title: 'Cash accounts', parentHref: '/treasury/cash' },
  '/treasury': { parent: 'Treasury & Cash', title: 'Treasury & Cash', parentHref: '/treasury/cash' },
  // Accounts Payable
  '/payable/invoices': { parent: 'Accounts Payable', title: 'Invoices', parentHref: '/payables/vendors' },
  '/payable/payments': { parent: 'Accounts Payable', title: 'Payments', parentHref: '/payables/vendors' },
  '/payable/expenses': { parent: 'Accounts Payable', title: 'Expenses', parentHref: '/payables/vendors' },
  '/payable/vendors': { parent: 'Accounts Payable', title: 'Vendors', parentHref: '/payables/vendors' },
  '/payable': { parent: 'Accounts Payable', title: 'Accounts Payable', parentHref: '/payables/vendors' },
  '/payables/vendors': { parent: 'Accounts Payable', title: 'Vendors', parentHref: '/payables/vendors' },
  // Accounts Receivable
  '/receivable/aging': { parent: 'Accounts Receivable', title: 'Aging Reports', parentHref: '/receivables/donors' },
  '/receivable/revenue': { parent: 'Accounts Receivable', title: 'Revenue', parentHref: '/receivables/donors' },
  '/receivable/donor': { parent: 'Accounts Receivable', title: 'Donor Receivables', parentHref: '/receivables/donors' },
  '/receivable': { parent: 'Accounts Receivable', title: 'Accounts Receivable', parentHref: '/receivables/donors' },
  '/receivables/donors': { parent: 'Accounts Receivable', title: 'Donors', parentHref: '/receivables/donors' },
  // Fixed Assets
  '/assets/tracking': { parent: 'Fixed Assets', title: 'Tracking', parentHref: '/assets' },
  '/assets/depreciation': { parent: 'Fixed Assets', title: 'Depreciation', parentHref: '/assets' },
  '/assets/register': { parent: 'Fixed Assets', title: 'Register', parentHref: '/assets' },
  '/assets': { parent: 'Fixed Assets', title: 'Fixed Assets', parentHref: '/assets' },
  // Tax Management
  '/tax/clearance': { parent: 'Tax Management', title: 'Clearance', parentHref: '/tax/journals' },
  '/tax/reports': { parent: 'Tax Management', title: 'Reports', parentHref: '/tax/journals' },
  '/tax/journals': { parent: 'Tax Management', title: 'Journals', parentHref: '/tax/journals' },
  '/tax': { parent: 'Tax Management', title: 'Tax Management', parentHref: '/tax/journals' },
  // Financial Reporting
  '/reports/donor-reports': { parent: 'Financial Reporting', title: 'Donor Reports', parentHref: '/reports' },
  '/reports/custom': { parent: 'Financial Reporting', title: 'Custom', parentHref: '/reports' },
  '/reports': { parent: 'Financial Reporting', title: 'Financial Reporting', parentHref: '/reports' },
  // Users (standalone)
  '/users': { parent: 'Home', title: 'User Management', parentHref: '/dashboard' },
}

function getBreadcrumb(
  pathname: string,
  orgName?: string | null,
  searchParams?: { get: (key: string) => string | null } | null
): { title: string; parent: string; parentHref: string } {
  if (pathname === '/settings' && searchParams) {
    const raw = searchParams.get(SETTINGS_SECTION_QUERY)
    if (isSettingsSectionId(raw)) {
      return {
        parent: 'Settings',
        title: SETTINGS_SECTION_LABELS[raw],
        parentHref: '/settings',
      }
    }
  }

  const sortedPaths = Object.keys(pathBreadcrumbs).sort((a, b) => b.length - a.length)
  for (const path of sortedPaths) {
    const exact = pathname === path
    const withSegment = pathname.startsWith(path + '/')
    if (exact || (path === '/admin' ? pathname.startsWith('/admin') : withSegment)) {
      let result = pathBreadcrumbs[path]
      if (result.parent === 'Project Portfolio' && orgName) {
        const projectListLabel = `${orgName} Projects Portfolio`
        result = { ...result, parent: projectListLabel }
        if (path === '/projects') result = { ...result, title: projectListLabel }
      }
      return result
    }
  }
  return { title: 'Dashboard', parent: 'Home', parentHref: '/dashboard' }
}

function HeaderInner() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const organization = useOrganizationStore((s) => s.organization)
  const [showSearch, setShowSearch] = useState(false)
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false)
  const notificationsEnabled = organization?.enable_notifications !== false

  const breadcrumb = getBreadcrumb(pathname, organization?.short_name || organization?.name, searchParams)

  const { contentLeft } = useSidebar()

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const r = await getNotificationsUnreadCount()
      return r.data?.unread_count ?? 0
    },
    refetchInterval: notificationsEnabled ? 60_000 : false,
    refetchOnWindowFocus: true,
    enabled: notificationsEnabled,
  })
  return (
    <header
      className="fixed top-0 right-0 h-14 z-40 bg-primary border-b border-primary-dark shadow-sm transition-[left] duration-200 ease-out"
      style={{ left: contentLeft }}
    >
      <div className="flex items-center justify-between h-full px-5">
        {/* Left - Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm min-w-0">
          <button
            onClick={() => router.push(breadcrumb.parentHref)}
            className="flex items-center gap-1.5 text-emerald-200 hover:text-white transition-colors shrink-0"
          >
            <Home className="h-4 w-4" />
            <span>{breadcrumb.parent}</span>
          </button>
          <ChevronRight className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="font-semibold text-white truncate">{breadcrumb.title}</span>
        </nav>

        {/* Right - Actions (office switcher at far right before profile; sends X-Office-Id for per-office DB context) */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Search Toggle */}
          {showSearch ? (
            <div className="relative animate-fade-in w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-300" />
              <input
                type="text"
                placeholder="Search..."
                autoFocus
                className="w-full h-9 pl-9 pr-9 text-sm bg-white/10 border border-emerald-800/80 rounded-lg text-white placeholder:text-emerald-300 focus:outline-none focus:ring-0.5 focus:ring-white/40 focus:border-emerald-400"
                onBlur={() => setShowSearch(false)}
              />
              <button 
                onClick={() => setShowSearch(false)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-300 hover:text-white p-1 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10"
              onClick={() => setShowSearch(true)}
            >
              <Search className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          )}

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10"
            onClick={() => window.location.reload()}
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
          </Button>

          <Link href="/help">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10" title="Help guide">
              <HelpCircle className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10" title="Settings">
              <Settings className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-9 w-9 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 relative transition-colors',
              notificationPanelOpen && 'bg-white/15 text-white ring-1 ring-white/25'
            )}
            title={notificationPanelOpen ? 'Close notifications' : 'Notifications'}
            aria-label={notificationPanelOpen ? 'Close notifications' : 'Open notifications'}
            aria-expanded={notificationPanelOpen}
            aria-controls="notification-slide-panel"
            onClick={() => setNotificationPanelOpen((open) => !open)}
          >
            <Bell className="h-4 w-4" strokeWidth={1.75} />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Button>

          <NotificationSlidePanel
            open={notificationPanelOpen}
            onOpenChange={setNotificationPanelOpen}
            notificationsEnabled={notificationsEnabled}
          />

          <OfficeSwitcher />

          <div className="w-px h-6 bg-emerald-800 mx-1" />

          <HeaderUserMenu />
        </div>
      </div>
    </header>
  )
}

export const Header = memo(HeaderInner)
