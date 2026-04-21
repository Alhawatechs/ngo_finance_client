/** Query param ?section= — used for deep links and redirects from old routes */
export const SETTINGS_SECTION_IDS = [
  'profile',
  'security',
  'appearance',
  'accessibility',
  'notifications',
  'localization',
  'system',
  'data',
  'performance',
  'finance',
] as const

export type SettingsSectionId = (typeof SETTINGS_SECTION_IDS)[number]

export const SETTINGS_SECTION_QUERY = 'section'

/** Short titles for breadcrumbs and quick navigation */
export const SETTINGS_SECTION_LABELS: Record<SettingsSectionId, string> = {
  profile: 'Profile',
  security: 'Security & privacy',
  appearance: 'Appearance & display',
  accessibility: 'Accessibility',
  notifications: 'Notifications',
  localization: 'Localization',
  system: 'System preferences',
  data: 'Data & export',
  performance: 'Performance',
  finance: 'Finance & help',
}

export function isSettingsSectionId(value: string | null | undefined): value is SettingsSectionId {
  return value != null && (SETTINGS_SECTION_IDS as readonly string[]).includes(value)
}

/** High-level areas shown as headings in the settings UI */
export const SETTINGS_GROUP_ORDER = ['personal', 'experience', 'organization', 'advanced'] as const
export type SettingsGroupId = (typeof SETTINGS_GROUP_ORDER)[number]

export const SETTINGS_GROUP_META: Record<SettingsGroupId, { title: string; description: string }> = {
  personal: {
    title: 'Your account',
    description: 'Your profile and how you sign in',
  },
  experience: {
    title: 'Look, feel & alerts',
    description: 'Display, accessibility, and notifications',
  },
  organization: {
    title: 'Organization',
    description: 'Dates, numbers, and rules for everyone',
  },
  advanced: {
    title: 'Data & tools',
    description: 'Exports, speed, and finance shortcuts',
  },
}

export const SETTINGS_SECTION_GROUP: Record<SettingsSectionId, SettingsGroupId> = {
  profile: 'personal',
  security: 'personal',
  appearance: 'experience',
  accessibility: 'experience',
  notifications: 'experience',
  localization: 'organization',
  system: 'organization',
  data: 'advanced',
  performance: 'advanced',
  finance: 'advanced',
}
