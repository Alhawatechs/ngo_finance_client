import { redirect } from 'next/navigation'

/** Inbox lives under Settings → System settings → Notifications; keep URL for bookmarks. */
export default function NotificationsPage() {
  redirect('/settings?section=notifications')
}
