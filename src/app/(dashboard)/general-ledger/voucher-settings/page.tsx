'use client'

import { redirect } from 'next/navigation'

/**
 * Voucher Settings has been moved under the Vouchers module.
 * Redirect legacy link to the new location.
 */
export default function VoucherSettingsRedirect() {
  redirect('/vouchers/settings')
}
