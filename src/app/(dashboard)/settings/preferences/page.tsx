import { redirect } from 'next/navigation'

export default function SettingsPreferencesRedirectPage() {
  redirect('/settings?section=system')
}
