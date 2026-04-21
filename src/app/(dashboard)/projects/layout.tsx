'use client'

import { ReactNode } from 'react'

/**
 * Project Management layout.
 * Wraps all sub-modules: Project Portfolio, Donors, Contracts, Budget, Donor Funds.
 * Each page uses ProjectsPageHeader for consistent titles, descriptions, and breadcrumbs.
 */
export default function ProjectsLayout({ children }: { children: ReactNode }) {
  return <div className="space-y-6">{children}</div>
}
