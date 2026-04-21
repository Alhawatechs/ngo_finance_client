'use client'

import { useEffect } from 'react'
import { useUserPreferencesStore } from '@/stores/userPreferencesStore'

/**
 * Applies user preferences (appearance, accessibility) to the document.
 * Renders nothing; runs effects that update html classes and CSS variables.
 */
export function SettingsApply() {
  const appearance = useUserPreferencesStore((s) => s.appearancePreferences)
  const accessibility = useUserPreferencesStore((s) => s.accessibilityPreferences)

  useEffect(() => {
    const html = document.documentElement

    // Theme: light/dark/system (system uses prefers-color-scheme)
    if (appearance.theme === 'dark') {
      html.classList.add('dark')
    } else if (appearance.theme === 'light') {
      html.classList.remove('dark')
    } else {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (dark) html.classList.add('dark')
      else html.classList.remove('dark')
    }

    // Font size: use effective value (accessibility overrides appearance if different)
    const fontSize = accessibility.fontSize !== 'default' ? accessibility.fontSize : appearance.fontSize
    html.dataset.fontSize = fontSize
    const scale = { small: 0.9, default: 1, large: 1.1, xlarge: 1.25 }[fontSize]
    html.style.setProperty('--app-font-size', `${14 * scale}px`)

    // Reduce motion: either appearance or accessibility
    const reduceMotion = appearance.reduceMotion || accessibility.reduceMotion
    if (reduceMotion) html.classList.add('reduce-motion')
    else html.classList.remove('reduce-motion')

    // High contrast: either appearance or accessibility
    const highContrast = appearance.highContrast || accessibility.highContrast
    if (highContrast) html.classList.add('high-contrast')
    else html.classList.remove('high-contrast')

    // Large focus indicator
    if (accessibility.largeFocusIndicator) html.classList.add('large-focus-indicator')
    else html.classList.remove('large-focus-indicator')

    // Layout density
    html.dataset.density = appearance.density

    // Accent color (for future theming)
    html.dataset.accent = appearance.accentColor
  }, [appearance, accessibility])

  return null
}
