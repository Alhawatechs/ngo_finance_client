'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tag } from 'lucide-react'
import { ChartOfAccountsPageFrame } from '@/components/finance/ChartOfAccountsPageFrame'

const DONOR_EXPENSE_MAPPING = [
  { category: 'Wages/Salaries', range: '21.1.1–21.1.3, 21.1.x', accounts: 'Program salaries, management salaries' },
  { category: 'Goods and Services', range: '22.2.1, 21.1.8, 21.1.15', accounts: 'Program supplies, office supplies, printing' },
  { category: 'Training and Survey', range: '22.1.1, 22.1.2, 21.1.17, 23.1.1–23.1.55', accounts: 'Program training, staff development, management trainings (23.1)' },
  { category: 'Equipments', range: '24.1.1, 24.1.2, 24.1.3–24.1.5, 24.2.1–24.2.34', accounts: 'Under 24 (24.x); medical 24.1, office & furniture 24.2' },
  { category: 'Indirect/Admin', range: '21.1.1–21.1.20', accounts: 'Overhead, allocated admin to programs' },
  { category: 'Contingency', range: '25.1', accounts: 'Contingency reserve per donor agreements (example L2 25 under Expenses)' },
  { category: 'Innovations', range: '26.1', accounts: 'Pilot projects and innovations (example L2 26 under Expenses)' },
]

export default function DonorMappingPage() {
  return (
    <ChartOfAccountsPageFrame title="Donor expense mapping" className="gap-3">
      <Card className="coa-ledger-card flex min-h-0 flex-1 flex-col overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Tag className="h-5 w-5" />
            Donor category mapping
          </CardTitle>
          <CardDescription>
            Map donor budget categories to chart of accounts code ranges.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
          <div className="voucher-sheet-grid min-h-0 flex-1 overflow-x-auto overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
            <div className="coa-ledger-table-frame w-full min-w-0">
            <table className="w-full text-sm table-fixed">
              <thead className="coa-ledger-thead sticky top-0 z-10">
                <tr className="uppercase tracking-wider">
                  <th className="px-3 py-2 text-left font-semibold w-40">Donor category</th>
                  <th className="px-3 py-2 text-left font-semibold w-48">CoA range / accounts</th>
                  <th className="px-3 py-2 text-left font-semibold">Examples</th>
                </tr>
              </thead>
              <tbody>
                {DONOR_EXPENSE_MAPPING.map((row) => (
                  <tr key={row.category}>
                    <td className="px-3 py-2 font-medium">{row.category}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.range}</td>
                    <td className="px-3 py-2 text-muted-foreground truncate" title={row.accounts}>{row.accounts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </ChartOfAccountsPageFrame>
  )
}
