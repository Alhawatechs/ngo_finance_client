import type { ChartOfAccount } from '@/types'

/**
 * Currency for list/balance columns: organization default (typically AFN), unless the account name
 * indicates a USD-denominated line (e.g. "… (USD)" in the NGO chart) — then show USD.
 */
export function displayCurrencyForAccount(
  account: (Pick<ChartOfAccount, 'account_name'> & { currency_code?: string | null }) | null | undefined,
  orgDefaultCurrency: string
): string {
  const org = (orgDefaultCurrency || 'AFN').trim().toUpperCase() || 'AFN'
  const name = String(account?.account_name ?? '')
  if (/\(USD\)/i.test(name)) {
    return 'USD'
  }
  const code = account?.currency_code?.trim()
  if (code) return code.toUpperCase()
  return org
}
