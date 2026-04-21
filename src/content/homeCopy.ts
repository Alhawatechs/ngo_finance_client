/**
 * Public home copy (`/`). Edit here without touching layout components.
 */
export const homeNav = [
  { href: '#overview', label: 'Overview' },
  { href: '#audience', label: "Who it's for" },
  { href: '#features', label: 'Features' },
  { href: '#trust', label: 'Trust' },
  { href: '#security', label: 'Security' },
] as const

export const headerNavLinkClass =
  'rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-50 hover:text-[#0f766e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/35 focus-visible:ring-offset-2'

export const headerActions = {
  logIn: 'Log in',
  getStarted: 'Get started',
} as const

export const hero = {
  brand: 'AADA ERP Finance',
  headlineAccessible:
    'NGO finance digital transformation for mission-driven organizations with AADA ERP Finance.',
  headlineLine1: 'NGO FINANCE',
  headlineLine2: 'DIGITAL TRANSFORMATION',
  subhead:
    'Bring ledger, treasury, projects, and approvals together in one ERP—so NGOs can run a transparent digital finance operation: show donors and boards how funds move from grants to field programs, with controls your finance team can trust.',
  primaryCta: 'Explore overview',
  secondaryCta: 'Log in',
} as const

export const heroStats = [
  {
    key: 'funds',
    value: 'Ledger',
    title: 'Grants & accounting',
    subtitle: 'General ledger, vouchers, funds, projects, donor restrictions',
    icon: 'piggy' as const,
  },
  {
    key: 'treasury',
    value: 'Treasury',
    title: 'Cash & banking',
    subtitle: 'Cashbook, bank feeds, approvals, payment controls',
    icon: 'bank' as const,
  },
  {
    key: 'reporting',
    value: 'Reports',
    title: 'Close & compliance',
    subtitle: 'Fiscal periods, trial balance, donor schedules, board exports',
    icon: 'chart' as const,
  },
] as const

export const overview = {
  kicker: 'The platform',
  title: 'What AADA ERP Finance is',
  lead:
    'AADA ERP Finance is a web-based NGO finance ERP: a single system for chart of accounts, journals and vouchers, cash and bank, projects and budgets, structured approvals, and financial reporting—instead of juggling spreadsheets and disconnected tools.',
  paragraphs: [
    'It is designed for organizations that must show how funds move from donors and grants through programs to outcomes. Offices, roles, and fiscal calendars can be configured so the right people see the right transactions—while leadership keeps a consolidated picture.',
    'From day-to-day posting to period close and exports for compliance, the product emphasizes traceability: who approved what, which project or donor line it belongs to, and how it rolls up in reports.',
  ] as const,
  highlights: [
    {
      title: 'Integrated, not stitched together',
      body: 'Ledger, treasury, and project dimensions work in one data model—fewer manual bridges between accounting and operations.',
    },
    {
      title: 'Built for governance',
      body: 'Approvals, user roles, and office scoping support segregation of duties and management oversight.',
    },
    {
      title: 'Ready for scrutiny',
      body: 'Reporting and exports are aimed at finance reviews, donor reporting, and audit-style questions—not only month-end totals.',
    },
  ] as const,
} as const

export const audience = {
  kicker: `Who it's for`,
  title: 'Built for NGO finance and program leadership',
  body:
    'Finance controllers, accountants, and treasury staff use AADA ERP Finance for daily posting, bank and cash, and period management. Program and grant managers gain clearer links between budgets, projects, and spend. Leadership relies on dashboards and reports for oversight—whether you operate from one office or several.',
} as const

export const pillarsIntro =
  'Four pillars anchor NGO finance operations: a controlled general ledger, visible treasury, program-linked planning, and reporting leadership can stand behind.'

export const pillars = [
  {
    title: 'General ledger & compliance',
    description:
      'Chart of accounts, journal entries, vouchers, and fiscal years/periods—with posting rules and history that support reconciliations, donor lines, and audit trails where your process requires them.',
    icon: 'ledger' as const,
  },
  {
    title: 'Treasury & cash',
    description:
      'Cash and bank movements, operational treasury tasks, and visibility into balances and activity so you always know liquidity and can explain it to finance and non-finance stakeholders.',
    icon: 'treasury' as const,
  },
  {
    title: 'Projects & budgets',
    description:
      'Tie programs and budgets to financial activity: plan versus actual, donor or grant structures where configured, and clearer handoffs between program teams and finance.',
    icon: 'projects' as const,
  },
  {
    title: 'Approvals & reporting',
    description:
      'Configurable approval paths for vouchers and budgets, plus financial reports and exports for management, boards, donors, and compliance—so decisions rest on current, controlled numbers.',
    icon: 'reports' as const,
  },
] as const

export const whyTrust = {
  kicker: 'Why NGOs choose it',
  title: 'Built for oversight, donors, and audit',
  intro:
    'The same priorities that show up in board packs and donor reports—visibility, control, and defensible numbers.',
  items: [
    {
      key: 'oversight',
      title: 'Operational clarity',
      body:
        'Dashboards and structured workflows help finance and leadership see balances, commitments, and exceptions—so decisions rest on current data, not spreadsheets.',
      icon: 'oversight' as const,
    },
    {
      key: 'donor',
      title: 'Donor-aligned reporting',
      body:
        'Link grants, projects, and dimensions to how you report to donors: clearer traceability from funding lines to spend without manual stitching.',
      icon: 'donor' as const,
    },
    {
      key: 'integration',
      title: 'Treasury & controls in one place',
      body:
        'Cash, bank, and approvals live beside the ledger—fewer handoffs between treasury and accounting and a clearer path for reviews.',
      icon: 'integration' as const,
    },
  ],
} as const

export const trustStrip = {
  headline: 'Designed for NGOs that answer to donors, boards, and auditors',
  partners: ['Relief & development', 'Education & child protection', 'Health & WASH', 'Livelihoods', 'Faith-based charities'] as const,
} as const

export const security = {
  kicker: 'Governance',
  title: 'Security & governance',
  body:
    'Access is role-based: users see only what their office and permissions allow. Sessions are authenticated; sensitive actions sit behind the same controls as the rest of the ERP. You configure users, offices, and roles to mirror how your NGO delegates authority—supporting internal control expectations without sacrificing usability for authorized staff.',
} as const

export const footer = {
  productName: 'AADA ERP Finance',
  tagline: 'NGO Finance Management System',
  signIn: 'Sign in',
  onThisPage: 'On this page',
  backToTop: 'Back to top',
  copyright: 'All rights reserved.',
} as const
