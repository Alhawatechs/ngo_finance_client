'use client'

import React from 'react'
import { ProjectsPageLayout } from './ProjectsPageLayout'

export function ProjectsPageView(props: { children: React.ReactNode }) {
  return (
    <ProjectsPageLayout>
      {props.children}
    </ProjectsPageLayout>
  )
}
