'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  User,
  Shield,
  Palette,
  Accessibility,
  Bell,
  Globe,
  Lock,
  Database,
  Zap,
  Landmark,
  Search,
  ListCollapse,
  ListTree,
  X,
  Sparkles,
  ArrowUp,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { cn } from '@/lib/utils'
import {
  SETTINGS_GROUP_META,
  SETTINGS_GROUP_ORDER,
  SETTINGS_SECTION_GROUP,
  SETTINGS_SECTION_IDS,
  SETTINGS_SECTION_LABELS,
  SETTINGS_SECTION_QUERY,
  type SettingsGroupId,
  type SettingsSectionId,
  isSettingsSectionId,
} from '@/components/settings/unified/settings-constants'
import { ProfileSettingsSection } from '@/components/settings/unified/ProfileSettingsSection'
import { SecuritySettingsSection } from '@/components/settings/unified/SecuritySettingsSection'
import { AppearanceSettingsSection } from '@/components/settings/unified/AppearanceSettingsSection'
import { AccessibilitySettingsSection } from '@/components/settings/unified/AccessibilitySettingsSection'
import { NotificationsSettingsSection } from '@/components/settings/unified/NotificationsSettingsSection'
import { LocalizationSettingsSection } from '@/components/settings/unified/LocalizationSettingsSection'
import { SystemPreferencesSettingsSection } from '@/components/settings/unified/SystemPreferencesSettingsSection'
import { DataExportSettingsSection } from '@/components/settings/unified/DataExportSettingsSection'
import { PerformanceSettingsSection } from '@/components/settings/unified/PerformanceSettingsSection'
import { FinanceShortcutsSection } from '@/components/settings/unified/FinanceShortcutsSection'

const TIP_STORAGE_KEY = 'erp-settings-welcome-tip-dismissed'

type Panel = {
  id: SettingsSectionId
  title: string
  hint: string
  icon: ReactNode
  keywords: string[]
  group: SettingsGroupId
  content: ReactNode
}

const triggerClass =
  'rounded-t-lg border-0 bg-muted/80 px-4 py-3.5 text-left text-[15px] font-semibold text-foreground shadow-none hover:bg-muted hover:no-underline data-[state=open]:bg-card'

const itemClass =
  'scroll-mt-4 mb-3 overflow-hidden rounded-xl border border-border bg-card shadow-sm last:mb-0'

const contentShell = 'border-t border-border bg-muted/30 px-4 py-5'

function syncUrlAfterOpen(
  nextOpen: SettingsSectionId[],
  setSectionInUrl: (id: string | null) => void
) {
  if (nextOpen.length === 0) setSectionInUrl(null)
  else setSectionInUrl(nextOpen[nextOpen.length - 1])
}

function SettingsUnifiedPageFallback() {
  return (
    <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
      Loading settings…
    </div>
  )
}

/**
 * Inner implementation: uses `useSearchParams`, which must sit under a Suspense boundary (Next.js App Router).
 */
function SettingsUnifiedPageInner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState<SettingsSectionId[]>([])
  const [showWelcomeTip, setShowWelcomeTip] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const mainRef = useRef<HTMLDivElement>(null)
  const announceRef = useRef<HTMLDivElement>(null)

  const sectionFromUrl = searchParams.get(SETTINGS_SECTION_QUERY)

  const setSectionInUrl = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (id) params.set(SETTINGS_SECTION_QUERY, id)
      else params.delete(SETTINGS_SECTION_QUERY)
      const q = params.toString()
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  useEffect(() => {
    try {
      setShowWelcomeTip(typeof window !== 'undefined' && localStorage.getItem(TIP_STORAGE_KEY) !== '1')
    } catch {
      setShowWelcomeTip(true)
    }
  }, [])

  const dismissWelcomeTip = useCallback(() => {
    try {
      localStorage.setItem(TIP_STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
    setShowWelcomeTip(false)
  }, [])

  const scrollToSection = useCallback(
    (id: SettingsSectionId) => {
      setOpen((prev) => (prev.includes(id) ? prev : [...prev, id]))
      setSectionInUrl(id)
      window.requestAnimationFrame(() => {
        document.getElementById(`settings-section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
      const label = SETTINGS_SECTION_LABELS[id]
      if (announceRef.current) announceRef.current.textContent = `Opened ${label}`
    },
    [setSectionInUrl]
  )

  useEffect(() => {
    if (sectionFromUrl && isSettingsSectionId(sectionFromUrl)) {
      setOpen((prev) => (prev.includes(sectionFromUrl) ? prev : [...prev, sectionFromUrl]))
      const t = window.setTimeout(() => {
        document.getElementById(`settings-section-${sectionFromUrl}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 120)
      return () => window.clearTimeout(t)
    }
  }, [sectionFromUrl])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      e.preventDefault()
      searchInputRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const el = mainRef.current?.closest('main')
    if (!el) return
    const onScroll = () => setShowBackToTop(el.scrollTop > 400)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const panels: Panel[] = useMemo(
    () => [
      {
        id: 'profile',
        title: 'Profile',
        hint: 'Your name, photo, and work details',
        group: SETTINGS_SECTION_GROUP.profile,
        icon: <User className="h-4 w-4 text-primary" />,
        keywords: ['name', 'avatar', 'email', 'role', 'office'],
        content: <ProfileSettingsSection />,
      },
      {
        id: 'security',
        title: 'Security & privacy',
        hint: 'Change your password and read privacy notes',
        group: SETTINGS_SECTION_GROUP.security,
        icon: <Shield className="h-4 w-4 text-primary" />,
        keywords: ['password', 'lock', 'forgot', 'privacy'],
        content: <SecuritySettingsSection />,
      },
      {
        id: 'appearance',
        title: 'Appearance & display',
        hint: 'Theme, text size, sidebar, and full screen',
        group: SETTINGS_SECTION_GROUP.appearance,
        icon: <Palette className="h-4 w-4 text-primary" />,
        keywords: ['theme', 'dark', 'light', 'font', 'accent', 'fullscreen'],
        content: <AppearanceSettingsSection />,
      },
      {
        id: 'accessibility',
        title: 'Accessibility',
        hint: 'Easier reading, less motion, keyboard help',
        group: SETTINGS_SECTION_GROUP.accessibility,
        icon: <Accessibility className="h-4 w-4 text-primary" />,
        keywords: ['contrast', 'keyboard', 'screen reader', 'motion'],
        content: <AccessibilitySettingsSection />,
      },
      {
        id: 'notifications',
        title: 'Notifications',
        hint: 'In-app inbox, email, and quiet hours',
        group: SETTINGS_SECTION_GROUP.notifications,
        icon: <Bell className="h-4 w-4 text-primary" />,
        keywords: ['email', 'alert', 'inbox', 'sound', 'digest'],
        content: <NotificationsSettingsSection />,
      },
      {
        id: 'localization',
        title: 'Localization',
        hint: 'How dates, numbers, and time look',
        group: SETTINGS_SECTION_GROUP.localization,
        icon: <Globe className="h-4 w-4 text-primary" />,
        keywords: ['date', 'time', 'language', 'format'],
        content: <LocalizationSettingsSection />,
      },
      {
        id: 'system',
        title: 'System preferences',
        hint: 'Sessions, passwords rules, and data retention',
        group: SETTINGS_SECTION_GROUP.system,
        icon: <Lock className="h-4 w-4 text-primary" />,
        keywords: ['session', 'timeout', '2fa', 'retention'],
        content: <SystemPreferencesSettingsSection />,
      },
      {
        id: 'data',
        title: 'Data & export',
        hint: 'Download formats and backup options',
        group: SETTINGS_SECTION_GROUP.data,
        icon: <Database className="h-4 w-4 text-primary" />,
        keywords: ['export', 'backup', 'csv', 'download'],
        content: <DataExportSettingsSection />,
      },
      {
        id: 'performance',
        title: 'Performance',
        hint: 'Faster loading and clearing cache',
        group: SETTINGS_SECTION_GROUP.performance,
        icon: <Zap className="h-4 w-4 text-primary" />,
        keywords: ['cache', 'prefetch', 'speed'],
        content: <PerformanceSettingsSection />,
      },
      {
        id: 'finance',
        title: 'Finance & help',
        hint: 'Open currency, vouchers, fiscal years, or help',
        group: SETTINGS_SECTION_GROUP.finance,
        icon: <Landmark className="h-4 w-4 text-primary" />,
        keywords: ['currency', 'voucher', 'fiscal', 'help', 'ledger'],
        content: (
          <div className="space-y-3">
            <FinanceShortcutsSection />
          </div>
        ),
      },
    ],
    []
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return panels
    return panels.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.hint.toLowerCase().includes(q) ||
        p.keywords.some((k) => k.includes(q))
    )
  }, [panels, search])

  const navIds = useMemo((): SettingsSectionId[] => {
    const q = search.trim().toLowerCase()
    if (!q) return [...SETTINGS_SECTION_IDS]
    return filtered.map((p) => p.id)
  }, [search, filtered])

  const activeNavId: SettingsSectionId | null =
    sectionFromUrl && isSettingsSectionId(sectionFromUrl) ? sectionFromUrl : null

  const mergeGroupOpen = useCallback(
    (groupPanels: Panel[], nextInGroup: SettingsSectionId[]) => {
      const groupIdSet = new Set(groupPanels.map((p) => p.id))
      setOpen((prev) => {
        const rest = prev.filter((id) => !groupIdSet.has(id))
        const next = [...rest, ...nextInGroup]
        queueMicrotask(() => syncUrlAfterOpen(next, setSectionInUrl))
        return next
      })
    },
    [setSectionInUrl]
  )

  const expandAll = () => {
    const ids = filtered.map((p) => p.id)
    setOpen(ids)
    queueMicrotask(() => syncUrlAfterOpen(ids, setSectionInUrl))
  }

  const collapseAll = () => {
    setOpen([])
    setSectionInUrl(null)
  }

  const scrollMainTop = () => {
    mainRef.current?.closest('main')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div
      ref={mainRef}
      className="space-y-8 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7"
    >
      <div
        aria-live="polite"
        ref={announceRef}
        className="sr-only"
      />

      {showWelcomeTip ? (
        <div
          className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between"
          role="region"
          aria-label="Settings tips"
        >
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" aria-hidden />
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Open a section to change it. Save when a save button appears in that section.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={dismissWelcomeTip}>
            Dismiss
          </Button>
        </div>
      ) : null}

      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-muted/30 to-primary/5',
          'px-6 py-8 shadow-sm sm:px-8'
        )}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Press{' '}
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                /
              </kbd>{' '}
              anytime to focus search.
            </p>
          </div>
          <div className="relative w-full max-w-md">
            <label htmlFor="settings-search" className="sr-only">
              Search settings
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="settings-search"
              ref={searchInputRef}
              placeholder="Search settings…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-h-11 border-input bg-background pl-9 pr-9 text-foreground placeholder:text-muted-foreground"
              aria-describedby="settings-search-hint"
              autoComplete="off"
            />
            <p id="settings-search-hint" className="sr-only">
              Filters the list of settings sections as you type
            </p>
            {search ? (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="min-w-0 space-y-4">
          <nav className="sticky top-0 z-10 -mx-1 border-b border-border bg-card/95 px-1 pb-3 pt-1 backdrop-blur supports-[backdrop-filter]:bg-card/80" aria-label="Settings sections">
            <span className="sr-only">Section shortcuts</span>
            <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {navIds.map((id) => (
                <Button
                  key={id}
                  type="button"
                  variant={activeNavId === id ? 'default' : 'outline'}
                  size="sm"
                  className="min-h-10 shrink-0 whitespace-nowrap"
                  onClick={() => scrollToSection(id)}
                >
                  {SETTINGS_SECTION_LABELS[id]}
                </Button>
              ))}
            </div>
          </nav>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={expandAll}
              aria-label="Open all sections"
              title="Open all sections"
            >
              <ListTree className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={collapseAll}
              aria-label="Close all sections"
              title="Close all sections"
            >
              <ListCollapse className="h-4 w-4" aria-hidden />
            </Button>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-12 text-center text-muted-foreground">
              <p className="font-medium text-foreground">Nothing matches that search</p>
              <p className="mt-2 text-sm text-muted-foreground">Try a shorter word (e.g. &quot;theme&quot; or &quot;email&quot;) or clear the box to see everything again.</p>
              <Button type="button" variant="default" className="mt-4" onClick={() => setSearch('')}>
                Show all settings
              </Button>
            </div>
          ) : (
            <div className="space-y-10">
              {SETTINGS_GROUP_ORDER.map((groupId) => {
                const groupPanels = filtered.filter((p) => p.group === groupId)
                if (!groupPanels.length) return null
                const meta = SETTINGS_GROUP_META[groupId]
                return (
                  <section
                    key={groupId}
                    aria-labelledby={`settings-heading-${groupId}`}
                    className="space-y-4"
                  >
                    <div className="border-b border-border pb-3">
                      <h2 id={`settings-heading-${groupId}`} className="text-lg font-semibold text-foreground">
                        {meta.title}
                      </h2>
                    </div>
                    <Accordion
                      type="multiple"
                      value={open.filter((id) => groupPanels.some((p) => p.id === id))}
                      onValueChange={(v) => mergeGroupOpen(groupPanels, v as SettingsSectionId[])}
                      className="w-full"
                    >
                      {groupPanels.map((panel) => (
                        <AccordionItem
                          key={panel.id}
                          id={`settings-section-${panel.id}`}
                          value={panel.id}
                          className={itemClass}
                        >
                          <AccordionTrigger className={triggerClass}>
                            <span className="flex w-full items-center gap-3 pr-2 text-left">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-card shadow-sm ring-1 ring-border">
                                {panel.icon}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-foreground">{panel.title}</span>
                                <span className="mt-0.5 block text-xs font-normal leading-snug text-muted-foreground">
                                  {panel.hint}
                                </span>
                              </span>
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className={contentShell}>{panel.content}</AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </section>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {showBackToTop ? (
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="fixed bottom-6 right-6 z-30 h-11 w-11 rounded-full border border-border bg-card/95 text-foreground shadow-lg backdrop-blur-sm"
          onClick={scrollMainTop}
          aria-label="Back to top of settings"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      ) : null}
    </div>
  )
}

export function SettingsUnifiedPage() {
  return (
    <Suspense fallback={<SettingsUnifiedPageFallback />}>
      <SettingsUnifiedPageInner />
    </Suspense>
  )
}
