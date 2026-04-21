import { redirect } from 'next/navigation'

export default function SettingsProfileRedirectPage() {
  redirect('/settings?section=profile')
}
