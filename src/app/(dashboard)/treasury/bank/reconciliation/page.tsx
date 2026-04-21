import { Suspense } from 'react'
import { BankReconciliationPage } from '@/components/treasury/bank/BankReconciliationPage'

export default function TreasuryBankReconciliationPage() {
  return (
    <Suspense fallback={null}>
      <BankReconciliationPage />
    </Suspense>
  )
}
