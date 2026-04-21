import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type DigestFrequency = 'realtime' | 'hourly' | 'daily' | 'weekly' | 'never'

export interface NotificationPreferences {
  digestFrequency: DigestFrequency
  quietHoursEnabled: boolean
  quietHoursStart: string // HH:mm
  quietHoursEnd: string // HH:mm
  soundEnabled: boolean
}

export interface AppearancePreferences {
  theme: 'light' | 'dark' | 'system'
  density: 'compact' | 'default' | 'comfortable'
  sidebarDefaultOpen: boolean
  reduceMotion: boolean
  fontSize: 'small' | 'default' | 'large' | 'xlarge'
  accentColor: 'blue' | 'indigo' | 'violet' | 'emerald' | 'amber'
  highContrast: boolean
}

export interface AccessibilityPreferences {
  highContrast: boolean
  reduceMotion: boolean
  largeFocusIndicator: boolean
  fontSize: 'small' | 'default' | 'large' | 'xlarge'
  screenReaderOptimized: boolean
  keyboardShortcutsEnabled: boolean
}

export interface DataExportPreferences {
  defaultExportFormat: 'xlsx' | 'csv' | 'json' | 'pdf'
  includeArchived: boolean
  backupFrequency: 'daily' | 'weekly' | 'monthly' | 'never'
  autoExportReports: boolean
}

export interface PerformancePreferences {
  prefetchLinks: 'none' | 'hover' | 'visible' | 'aggressive'
  lazyLoadImages: boolean
  cacheReports: boolean
  virtualScrollTables: boolean
}

const DEFAULT_NOTIFICATION: NotificationPreferences = {
  digestFrequency: 'daily',
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  soundEnabled: true,
}

const DEFAULT_APPEARANCE: AppearancePreferences = {
  theme: 'light',
  density: 'default',
  sidebarDefaultOpen: true,
  reduceMotion: false,
  fontSize: 'default',
  accentColor: 'blue',
  highContrast: false,
}

const DEFAULT_ACCESSIBILITY: AccessibilityPreferences = {
  highContrast: false,
  reduceMotion: false,
  largeFocusIndicator: true,
  fontSize: 'default',
  screenReaderOptimized: false,
  keyboardShortcutsEnabled: true,
}

const DEFAULT_DATA_EXPORT: DataExportPreferences = {
  defaultExportFormat: 'xlsx',
  includeArchived: false,
  backupFrequency: 'weekly',
  autoExportReports: false,
}

const DEFAULT_PERFORMANCE: PerformancePreferences = {
  prefetchLinks: 'hover',
  lazyLoadImages: true,
  cacheReports: true,
  virtualScrollTables: true,
}

interface UserPreferencesState {
  notificationPreferences: NotificationPreferences
  setNotificationPreferences: (prefs: Partial<NotificationPreferences>) => void
  appearancePreferences: AppearancePreferences
  setAppearancePreferences: (prefs: Partial<AppearancePreferences>) => void
  accessibilityPreferences: AccessibilityPreferences
  setAccessibilityPreferences: (prefs: Partial<AccessibilityPreferences>) => void
  dataExportPreferences: DataExportPreferences
  setDataExportPreferences: (prefs: Partial<DataExportPreferences>) => void
  performancePreferences: PerformancePreferences
  setPerformancePreferences: (prefs: Partial<PerformancePreferences>) => void
}

export const useUserPreferencesStore = create<UserPreferencesState>()(
  persist(
    (set) => ({
      notificationPreferences: DEFAULT_NOTIFICATION,
      setNotificationPreferences: (prefs) =>
        set((state) => ({
          notificationPreferences: { ...state.notificationPreferences, ...prefs },
        })),

      appearancePreferences: DEFAULT_APPEARANCE,
      setAppearancePreferences: (prefs) =>
        set((state) => ({
          appearancePreferences: { ...state.appearancePreferences, ...prefs },
        })),

      accessibilityPreferences: DEFAULT_ACCESSIBILITY,
      setAccessibilityPreferences: (prefs) =>
        set((state) => ({
          accessibilityPreferences: { ...state.accessibilityPreferences, ...prefs },
        })),

      dataExportPreferences: DEFAULT_DATA_EXPORT,
      setDataExportPreferences: (prefs) =>
        set((state) => ({
          dataExportPreferences: { ...state.dataExportPreferences, ...prefs },
        })),

      performancePreferences: DEFAULT_PERFORMANCE,
      setPerformancePreferences: (prefs) =>
        set((state) => ({
          performancePreferences: { ...state.performancePreferences, ...prefs },
        })),
    }),
    { name: 'user-preferences' }
  )
)
