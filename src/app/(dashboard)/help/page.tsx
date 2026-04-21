'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { HelpCircle, BookOpen, FileText, Video, MessageCircle, Settings, ChevronRight } from 'lucide-react'

export default function HelpGuidePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Help Guide</h1>
        <p className="text-sm text-gray-500 mt-1">Get started with AADA ERP Finance</p>
      </div>

      {/* Settings Module - System-wide configuration under Help Guide */}
      <Link
        href="/settings"
        className="block rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6 transition-all hover:border-primary/40 hover:shadow-md"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
            <p className="mt-1 text-sm text-gray-600">
              Configure design, appearance, localization, notifications, and system-wide preferences for the entire application.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Open Settings
              <ChevronRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </Link>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Help & Documentation</h2>
        <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-700" />
              <CardTitle className="text-base">Getting Started</CardTitle>
            </div>
            <CardDescription>Learn the basics of the finance system</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            Set up your organization, configure fiscal years, and manage your chart of accounts to get started.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-700" />
              <CardTitle className="text-base">Documentation</CardTitle>
            </div>
            <CardDescription>Detailed guides and references</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            Browse user manuals, API documentation, and process guides for each module.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-emerald-700" />
              <CardTitle className="text-base">Video Tutorials</CardTitle>
            </div>
            <CardDescription>Watch step-by-step walkthroughs</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            Video guides for journal entries, vouchers, reports, and more.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-emerald-700" />
              <CardTitle className="text-base">Support</CardTitle>
            </div>
            <CardDescription>Contact our support team</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            Need assistance? Reach out to our support team for help with any issues.
          </CardContent>
        </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-emerald-700" />
            Quick Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>• Use the sidebar to navigate between modules. Click a module to view its sub-pages.</p>
          <p>• Collapse the sidebar with the &lt;&lt; icon at the top to gain more screen space.</p>
          <p>• Access Help Guide and Settings from the bottom of the sidebar for documentation and system configuration.</p>
        </CardContent>
      </Card>
    </div>
  )
}
