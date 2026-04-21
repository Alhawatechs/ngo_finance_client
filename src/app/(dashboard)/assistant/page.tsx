'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useOrganizationStore } from '@/stores/organizationStore'
import { AssistantChat } from '@/components/assistant/AssistantChat'
import { MessageSquare, Sparkles } from 'lucide-react'

export default function AssistantPage() {
  const organization = useOrganizationStore((s) => s.organization)
  const branding = useOrganizationStore((s) => s.branding)
  const orgAbbrev = organization?.short_name ?? branding?.short_name ?? organization?.name ?? branding?.name ?? 'AADA'
  const title = `${orgAbbrev} AI Finance Assistant`

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-7rem)] flex flex-col gap-4 overflow-hidden">
      {/* Compact single-line header */}
      <header className="shrink-0 flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-gradient-to-r from-primary/5 to-transparent px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <MessageSquare className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
            Finance Assistant
            <Badge variant="secondary" className="font-normal gap-1 text-xs">
              <Sparkles className="h-3 w-3" />
              AI
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground truncate">
            Live data from your office · Verify critical decisions in reports
          </p>
        </div>
      </header>

      {/* Chat card - takes remaining space, scrolls inside */}
      <Card className="flex-1 min-h-0 overflow-hidden border border-border/60 shadow-sm rounded-xl flex flex-col">
        <CardHeader className="shrink-0 border-b border-border/60 bg-muted/20 py-3 px-4">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold text-foreground">
              {title}
            </CardTitle>
            <CardDescription className="text-xs mt-0 hidden sm:inline">
              Ask or pick a suggestion below. Answers use your current context.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 min-h-0 flex flex-col">
          <AssistantChat className="flex-1 min-h-0" />
        </CardContent>
      </Card>
    </div>
  )
}
