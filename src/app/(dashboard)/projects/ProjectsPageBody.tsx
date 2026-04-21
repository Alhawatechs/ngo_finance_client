'use client'

import React from 'react'
import { ProjectsPageBodyInner } from '@/components/projects/ProjectsPageBodyInner'

export function ProjectsPageBody({ ctxRef }: { ctxRef: React.MutableRefObject<Record<string, unknown> | null> }) {
  const c = ctxRef?.current as Record<string, any> | null | undefined
  if (c == null || typeof c.setSearchQuery !== 'function') {
    return React.createElement('div', { className: 'flex items-center justify-center p-8' }, 'Loading…')
  }
  return React.createElement(ProjectsPageBodyInner, { c })
}
