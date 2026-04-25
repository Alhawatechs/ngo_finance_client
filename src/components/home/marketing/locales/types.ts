export type MarketingLocale = 'en' | 'fa-AF' | 'ps'

export type FaqItem = { q: string; a: string }
export type JourneyItem = { n: string; title: string; text: string }

/** Stable ids for marketing module tiles — order is defined in `modules/catalog.ts`. */
export type MarketingModuleId =
  | 'generalLedger'
  | 'trialBalance'
  | 'generalDocuments'
  | 'fixedAssets'
  | 'planningBudgeting'
  | 'paymentVoucher'
  | 'accountsPayable'
  | 'procurement'
  | 'foreignExchange'
  | 'cashBank'
  | 'reports'
  | 'multiOfficeControls'

export type ModuleItem = { id: MarketingModuleId; title: string; text: string }

export type MarketingMessages = {
  skipLink: string
  nav: { id: string; label: string }[]
  header: {
    platformTour: string
    bookCall: string
    login: string
    lang: string
  }
  hero: {
    label: string
    brand: string
    title: string
    lead: string
    chip1: string
    chip2: string
    chip3: string
    explore: string
    talk: string
    note: string
  }
  overview: { eyebrow: string; h2: string; lead: string }
  journey: { eyebrow: string; h2: string; lead: string; steps: JourneyItem[] }
  modules: { eyebrow: string; h2: string; lead: string; items: ModuleItem[] }
  pricing: { eyebrow: string; h2: string; lead: string; cta: string; bullets: string[] }
  spotlight: { eyebrow: string; h2: string; text: string }
  faq: { eyebrow: string; h2: string; intro: string; items: FaqItem[] }
  cta: { tag: string; h2: string; text: string; primary: string; secondary: string }
  footer: {
    tagline: string
    contact: string
    legal: string
    privacy: string
    terms: string
    website: string
    copy: string
  }
}

/** Messages without `modules.items` — items are injected from the module catalog. */
export type MarketingMessagesBase = Omit<MarketingMessages, 'modules'> & {
  modules: Pick<MarketingMessages['modules'], 'eyebrow' | 'h2' | 'lead'>
}
