import { buildMarketingModuleItems } from './modules/catalog'
import { marketingMessagesEn } from './messages/en'
import { marketingMessagesFaAF } from './messages/fa-AF'
import { marketingMessagesPs } from './messages/ps'
import type { MarketingLocale, MarketingMessages, MarketingMessagesBase } from './types'

function withModuleItems(base: MarketingMessagesBase, locale: MarketingLocale): MarketingMessages {
  return {
    ...base,
    modules: {
      ...base.modules,
      items: buildMarketingModuleItems(locale),
    },
  }
}

export const MARKETING_MESSAGES: Record<MarketingLocale, MarketingMessages> = {
  en: withModuleItems(marketingMessagesEn, 'en'),
  'fa-AF': withModuleItems(marketingMessagesFaAF, 'fa-AF'),
  ps: withModuleItems(marketingMessagesPs, 'ps'),
}
