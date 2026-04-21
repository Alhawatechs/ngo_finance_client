'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileStack, FileText, Receipt, Package, FileCheck, Archive } from 'lucide-react'

const documentAreas = [
  {
    title: 'Archive Management',
    description: 'Unified search and management of all financial documents from grants, vouchers, projects, and standalone uploads.',
    href: '/archive',
    icon: Archive,
  },
  {
    title: 'Grant documents',
    description: 'Upload and manage grant PDFs, amendments, and related donor agreement documents.',
    href: '/projects/grants',
    icon: FileText,
  },
  {
    title: 'Voucher attachments',
    description: 'Supporting documents attached to vouchers and journal entries.',
    href: '/vouchers',
    icon: Receipt,
  },
  {
    title: 'Asset documents',
    description: 'Acquisition receipts, depreciation schedules, and asset-related files.',
    href: '/assets',
    icon: Package,
  },
  {
    title: 'Audit & compliance',
    description: 'Audit trails, findings documentation, and compliance reports.',
    href: '/audit-compliance',
    icon: FileCheck,
  },
]

export default function DocumentsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Document storage</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Documents are stored with their related entities. Use the links below to access documents by area.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {documentAreas.map((area) => {
          const Icon = area.icon
          return (
            <Card key={area.href} className="hover:bg-muted/30 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className="h-5 w-5" />
                  {area.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{area.description}</p>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild>
                  <Link href={area.href}>View documents</Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileStack className="h-5 w-5" />
            How document storage works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This system stores documents in context with the records they support. Grant documents are attached to grants in the Donor grants module.
            Voucher and journal entry attachments are managed when creating or editing those records. Asset documents are linked to fixed assets.
            There is no single document repository — navigate to the relevant module to upload or download files.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
