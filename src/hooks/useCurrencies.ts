'use client'

import { useQuery } from '@tanstack/react-query'
import { getCurrencies } from '@/lib/api/currencies'
import { COMMON_CURRENCIES } from '@/lib/api/currencies'
import type { Currency } from '@/types'

export interface CurrencyOption {
  code: string
  name: string
  symbol: string
}

export interface UseCurrenciesOptions {
  /**
   * When true, only currencies returned by the API (organization active list) are used.
   * No COMMON_CURRENCIES fallback — use for journal books and anywhere the org setup must be the single source of truth.
   */
  strictOrganizationOnly?: boolean
}

/**
 * Returns organization active currencies for dropdowns.
 * By default, falls back to COMMON_CURRENCIES if the org has no rows yet (legacy UX).
 * Pass `{ strictOrganizationOnly: true }` to show only General Ledger → Currency (active) with no fallback.
 */
export function useCurrencies(options?: UseCurrenciesOptions) {
  const strict = options?.strictOrganizationOnly === true

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['currencies', { is_active: true }],
    queryFn: () => getCurrencies({ is_active: true }),
  })

  const list: Currency[] = data?.data ?? []

  const optionsList: CurrencyOption[] =
    list.length > 0
      ? list.map((c) => ({ code: c.code, name: c.name, symbol: c.symbol }))
      : strict
        ? []
        : COMMON_CURRENCIES.map((c) => ({ code: c.code, name: c.name, symbol: c.symbol }))

  const defaultCurrency =
    list.find((c) => c.is_default)?.code ??
    list[0]?.code ??
    (strict ? null : 'USD')

  return {
    currencies: list,
    options: optionsList,
    defaultCurrency,
    isLoading,
    isFetching,
    hasOrganizationCurrencies: list.length > 0,
  }
}

/** Active currencies from organization setup only (General Ledger → Currency). No generic fallback list. */
export function useOrganizationActiveCurrencies() {
  return useCurrencies({ strictOrganizationOnly: true })
}
