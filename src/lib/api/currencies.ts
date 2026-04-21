import apiClient from './client'
import { Currency, ExchangeRate } from '@/types'

export interface CurrencyFormData {
  code: string
  name: string
  symbol: string
  decimal_places?: number
  is_default?: boolean
  is_active?: boolean
}

export interface ExchangeRateFormData {
  from_currency: string
  to_currency: string
  rate: number
  effective_date: string
  source?: string
}

export interface ExchangeRateListParams {
  page?: number
  per_page?: number
  from_currency?: string
  to_currency?: string
  from_date?: string
  to_date?: string
}

export interface ConversionResult {
  original_amount: number
  converted_amount: number
  from_currency: string
  to_currency: string
  rate: number
  effective_date?: string
}

// Currency APIs
export async function getCurrencies(params?: { is_active?: boolean }) {
  const response = await apiClient.get('/currencies', { params })
  return response.data
}

export async function getCurrency(id: number) {
  const response = await apiClient.get(`/currencies/${id}`)
  return response.data
}

export async function createCurrency(data: CurrencyFormData) {
  const response = await apiClient.post('/currencies', data)
  return response.data
}

export async function updateCurrency(id: number, data: Partial<CurrencyFormData>) {
  const response = await apiClient.put(`/currencies/${id}`, data)
  return response.data
}

export async function deleteCurrency(id: number) {
  const response = await apiClient.delete(`/currencies/${id}`)
  return response.data
}

export async function setDefaultCurrency(id: number) {
  const response = await apiClient.post(`/currencies/${id}/set-default`)
  return response.data
}

// Exchange Rate APIs
export async function getExchangeRates(params?: ExchangeRateListParams) {
  const response = await apiClient.get('/exchange-rates', { params })
  return response.data
}

export async function getExchangeRate(id: number) {
  const response = await apiClient.get(`/exchange-rates/${id}`)
  return response.data
}

export async function createExchangeRate(data: ExchangeRateFormData) {
  const response = await apiClient.post('/exchange-rates', data)
  return response.data
}

export async function updateExchangeRate(id: number, data: Partial<ExchangeRateFormData>) {
  const response = await apiClient.put(`/exchange-rates/${id}`, data)
  return response.data
}

export async function deleteExchangeRate(id: number) {
  const response = await apiClient.delete(`/exchange-rates/${id}`)
  return response.data
}

export async function getCurrentRate(from: string, to: string, date?: string) {
  const response = await apiClient.get('/exchange-rates/current', {
    params: { from, to, date },
  })
  return response.data
}

export async function convertAmount(
  amount: number,
  from: string,
  to: string,
  date?: string
): Promise<{ data: ConversionResult }> {
  const response = await apiClient.post('/exchange-rates/convert', {
    amount,
    from,
    to,
    date,
  })
  return response.data
}

export async function bulkImportRates(rates: ExchangeRateFormData[]) {
  const response = await apiClient.post('/exchange-rates/bulk-import', { rates })
  return response.data
}

export async function getRateHistory(from: string, to: string, startDate?: string, endDate?: string) {
  const response = await apiClient.get('/exchange-rates/history', {
    params: { from, to, start_date: startDate, end_date: endDate },
  })
  return response.data
}

// Currency display helpers
export function formatCurrencyValue(amount: number, currency: Currency): string {
  const decimalPlaces = currency.decimal_places ?? 2
  const formattedAmount = amount.toFixed(decimalPlaces)
  return `${currency.symbol}${formattedAmount}`
}

// Common currencies for NGO operations
export const COMMON_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'AFN', name: 'Afghan Afghani', symbol: '؋' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
]

export function getCurrencyByCode(code: string) {
  return COMMON_CURRENCIES.find(c => c.code === code)
}
