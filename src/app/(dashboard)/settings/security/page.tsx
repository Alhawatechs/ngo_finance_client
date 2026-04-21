import { redirect } from 'next/navigation'

export default function SettingsSecurityRedirectPage() {
  redirect('/settings?section=security')
}
