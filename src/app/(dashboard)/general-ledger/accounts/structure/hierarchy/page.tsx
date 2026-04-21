import { redirect } from 'next/navigation'

export default function HierarchyRedirectPage() {
  redirect('/general-ledger/accounts/import-export')
}
