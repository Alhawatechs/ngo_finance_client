import { redirect } from 'next/navigation'

export default function SettingsAccessibilityRedirectPage() {
  redirect('/settings?section=accessibility')
}
