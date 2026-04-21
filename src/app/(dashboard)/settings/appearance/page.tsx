import { redirect } from 'next/navigation'

export default function SettingsAppearanceRedirectPage() {
  redirect('/settings?section=appearance')
}
