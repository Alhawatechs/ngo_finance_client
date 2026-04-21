import { redirect } from 'next/navigation'

export default function StructureIndexRedirectPage() {
  redirect('/general-ledger/accounts/import-export')
}
