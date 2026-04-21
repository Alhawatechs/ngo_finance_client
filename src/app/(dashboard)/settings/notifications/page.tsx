import { redirect } from 'next/navigation'

export default function SettingsNotificationsRedirectPage() {
  redirect('/settings?section=notifications')
}
