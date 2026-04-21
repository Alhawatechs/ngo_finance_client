'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { useOrganizationStore } from '@/stores/organizationStore'

export default function ProjectsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const organization = useOrganizationStore((s) => s.organization)
  const projectListLabel = (organization?.short_name || organization?.name) ? `${organization.short_name || organization.name}'s Project List` : 'Project List'
  useEffect(() => {
    console.error('Projects error:', error)
  }, [error])

  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Something went wrong</h2>
        <p className="text-sm text-muted-foreground mb-2">
          The project list could not load. This may be due to a connection issue with the server.
        </p>
        {error?.message && (
          <p className="text-xs text-muted-foreground mb-4 font-mono break-all bg-muted/50 px-3 py-2 rounded">
            {error.message}
          </p>
        )}
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={reset}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
          >
            Try again
          </button>
          <Link
            href="/projects"
            className="px-4 py-2 border border-border rounded-lg hover:bg-muted font-medium"
          >
            Back to {projectListLabel}
          </Link>
        </div>
      </div>
    </div>
  )
}
