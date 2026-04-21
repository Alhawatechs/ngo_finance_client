import { redirect } from 'next/navigation'

export default function SettingsCurrenciesRedirectPage() {
  redirect('/general-ledger/currency')
}
