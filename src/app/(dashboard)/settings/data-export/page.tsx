import { redirect } from 'next/navigation'

export default function SettingsDataExportRedirectPage() {
  redirect('/settings?section=data')
}
