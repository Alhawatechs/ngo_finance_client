import { redirect } from 'next/navigation'

export default function SettingsLocalizationRedirectPage() {
  redirect('/settings?section=localization')
}
