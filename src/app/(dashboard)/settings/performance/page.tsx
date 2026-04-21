import { redirect } from 'next/navigation'

export default function SettingsPerformanceRedirectPage() {
  redirect('/settings?section=performance')
}
