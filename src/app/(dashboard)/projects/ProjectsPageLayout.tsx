'use client'

import React from 'react'

export function ProjectsPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6 animate-fade-in">
      {children}
    </div>
  )
}
