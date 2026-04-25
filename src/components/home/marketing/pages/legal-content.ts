export type LegalSection = {
  id: string
  title: string
  html: string
}

export type LegalContent = {
  eyebrow: string
  title: string
  leadHtml: string
  updated: string
  readTime: string
  scopeTag: string
  glanceTitle: string
  glance: string[]
  tocTitle: string
  sections: LegalSection[]
  contactCardTitle: string
  contactCardHtml: string
  ctaBookCall: string
  ctaEmail: string
  relatedLabel: string
  relatedSiblingText: string
  relatedSiblingHref: string
  relatedBookCallText: string
  relatedOverviewText: string
}

type LegalKind = 'privacy' | 'terms'
type LegalLocale = 'en' | 'fa-AF' | 'ps'

const privacyContentEn: LegalContent = {
  eyebrow: 'Legal · Privacy',
  title: 'Privacy notice',
  leadHtml:
    'How <strong>NGOBook</strong> handles the information you share through this marketing website, our enquiry forms, and related email contact.',
  updated: 'Last updated: 13 April 2026',
  readTime: 'About 4 min read',
  scopeTag: 'Marketing site only',
  glanceTitle: 'At a glance',
  glance: [
    'We only collect what you share with us - name, work email, organization, and your message.',
    'Your details are used to answer your enquiry and to keep the site secure and reliable.',
    'We never sell your personal information.',
    'You can ask us to access, correct, or delete your data by emailing <a href="mailto:sales@ngobook.com">sales@ngobook.com</a>.',
  ],
  tocTitle: 'On this page',
  sections: [
    {
      id: 'p-scope',
      title: 'Scope of this notice',
      html: 'This notice describes how <strong>NGOBook</strong> ("we", "us") handles information collected through the NGOBook <strong>marketing website</strong> (including localized pages), enquiry forms, and related email contact. It does not replace contractual terms for a subscribed NGOBook production environment - those are agreed separately with your organization.',
    },
    {
      id: 'p-collect',
      title: 'What we collect',
      html: '<p>Depending on how you interact with us, we may process:</p><ul><li><strong>Contact and enquiry data</strong> you submit - for example name, work email, organization, country or region, and message content.</li><li><strong>Technical data</strong> typical of web browsing (such as IP address, browser type, and approximate location derived by standard server logs), used for security and reliability.</li></ul>',
    },
    {
      id: 'p-use',
      title: 'How we use information',
      html: '<p>We use this information to:</p><ul><li>Respond to product, pricing, and partnership enquiries.</li><li>Operate, secure, and improve our public websites.</li><li>Meet legal, regulatory, or professional obligations where they apply.</li></ul><p>We do not sell your personal information.</p>',
    },
    {
      id: 'p-retention',
      title: 'Data retention',
      html: 'Enquiry records are kept only as long as needed to manage the conversation, meet legal requirements, or defend legitimate interests, after which they are deleted or anonymized in line with our internal schedules.',
    },
    {
      id: 'p-transfers',
      title: 'International transfers',
      html: 'If you contact us from outside our primary operating region, data may be processed in countries where we or our service providers operate. We use appropriate safeguards where required by applicable law.',
    },
    {
      id: 'p-rights',
      title: 'Your rights',
      html: 'You may request access, correction, or deletion of marketing enquiry data where applicable law allows, by emailing <a href="mailto:sales@ngobook.com">sales@ngobook.com</a>. We may need to verify your request before acting on it.',
    },
    {
      id: 'p-changes',
      title: 'Changes to this notice',
      html: 'We may update this notice from time to time. The "Last updated" date above will change when we do. Continued use of the site after changes means you accept the revised notice.',
    },
  ],
  contactCardTitle: 'Questions about this notice?',
  contactCardHtml:
    'Email <a href="mailto:sales@ngobook.com">sales@ngobook.com</a> or call <a href="tel:+93704519947">+93 (0) 704519947</a>. We usually reply within two business days.',
  ctaBookCall: 'Book a call',
  ctaEmail: 'Email sales',
  relatedLabel: 'Related',
  relatedSiblingText: 'Terms of use',
  relatedSiblingHref: '/terms-conditions',
  relatedBookCallText: 'Book a call',
  relatedOverviewText: 'Overview',
}

const termsContentEn: LegalContent = {
  eyebrow: 'Legal · Terms',
  title: 'Terms of use',
  leadHtml:
    'The rules for using the public <strong>NGOBook</strong> marketing website and the materials linked from it. Browsing this site does not create a software or services contract.',
  updated: 'Last updated: 13 April 2026',
  readTime: 'About 3 min read',
  scopeTag: 'Marketing site only',
  glanceTitle: 'At a glance',
  glance: [
    'This site is for information and pre-sales discussion only - it is not a software or services contract.',
    'NGOBook branding, documentation excerpts, and site design belong to NGOBook or its licensors.',
    'Use the site lawfully - no unauthorised access, scraping at scale, or uploading malware.',
    'Commercial obligations only begin once an order form or statement of work is signed with NGOBook.',
  ],
  tocTitle: 'On this page',
  sections: [
    {
      id: 't-scope',
      title: 'Scope & agreement',
      html: 'These terms govern your use of the public NGOBook <strong>marketing website</strong> and the downloadable materials linked from it (collectively, the "Site"), operated by <strong>NGOBook</strong>. By using the Site, you agree to these terms. If you do not agree, please do not use the Site.',
    },
    {
      id: 't-contract',
      title: 'Not a contract for software',
      html: 'Content on the Site is for information and pre-sales discussion only. A separate agreement (order form, statement of work, or equivalent) is required for any NGOBook software or professional services.',
    },
    {
      id: 't-ip',
      title: 'Intellectual property',
      html: 'NGOBook branding, documentation excerpts, and Site design are owned by NGOBook or its licensors. You may not copy, modify, or redistribute them except as allowed by law or with our written permission.',
    },
    {
      id: 't-use',
      title: 'Acceptable use',
      html: 'You agree not to misuse the Site - for example by attempting unauthorized access, scraping at scale in a way that impairs service, or uploading malware. We may suspend access if we reasonably believe these terms are violated.',
    },
    {
      id: 't-disclaimer',
      title: 'Disclaimer',
      html: 'The Site is provided "as is". To the fullest extent permitted by law, we disclaim warranties of merchantability, fitness for a particular purpose, and non-infringement. Nothing on the Site is professional legal, tax, or accounting advice.',
    },
    {
      id: 't-liability',
      title: 'Limitation of liability',
      html: 'To the extent permitted by law, NGOBook will not be liable for indirect, incidental, special, consequential, or punitive damages, or loss of profits, data, or goodwill, arising from your use of the Site.',
    },
    {
      id: 't-law',
      title: 'Governing law',
      html: "These terms are governed by the laws applicable to NGOBook's operating jurisdiction, without regard to conflict-of-law rules, except where mandatory consumer protections in your country say otherwise.",
    },
  ],
  contactCardTitle: 'Questions about these terms?',
  contactCardHtml:
    'Email <a href="mailto:sales@ngobook.com">sales@ngobook.com</a> or call <a href="tel:+93704519947">+93 (0) 704519947</a>. We usually reply within two business days.',
  ctaBookCall: 'Book a call',
  ctaEmail: 'Email sales',
  relatedLabel: 'Related',
  relatedSiblingText: 'Privacy notice',
  relatedSiblingHref: '/privacy-policy',
  relatedBookCallText: 'Book a call',
  relatedOverviewText: 'Overview',
}

const privacyContentFa: LegalContent = {
  ...privacyContentEn,
  eyebrow: 'قانونی · محرمیت',
  title: 'اطلاعیه محرمیت',
  readTime: 'حدود 4 دقیقه مطالعه',
  glanceTitle: 'در یک نگاه',
  tocTitle: 'در این صفحه',
  contactCardTitle: 'سوالی در مورد این اطلاعیه دارید؟',
  ctaBookCall: 'رزرو تماس',
  ctaEmail: 'ایمیل به فروش',
  relatedLabel: 'مرتبط',
  relatedSiblingText: 'شرایط استفاده',
  relatedBookCallText: 'رزرو تماس',
  relatedOverviewText: 'نمای کلی',
}

const termsContentFa: LegalContent = {
  ...termsContentEn,
  eyebrow: 'قانونی · شرایط',
  title: 'شرایط استفاده',
  readTime: 'حدود 3 دقیقه مطالعه',
  glanceTitle: 'در یک نگاه',
  tocTitle: 'در این صفحه',
  contactCardTitle: 'سوالی در مورد این شرایط دارید؟',
  ctaBookCall: 'رزرو تماس',
  ctaEmail: 'ایمیل به فروش',
  relatedLabel: 'مرتبط',
  relatedSiblingText: 'اطلاعیه محرمیت',
  relatedBookCallText: 'رزرو تماس',
  relatedOverviewText: 'نمای کلی',
}

const privacyContentPs: LegalContent = {
  ...privacyContentEn,
  eyebrow: 'قانوني · محرمیت',
  title: 'د محرمیت خبرتیا',
  readTime: 'شاوخوا 4 دقیقې لوستل',
  glanceTitle: 'په لنډه توګه',
  tocTitle: 'په دې پاڼه کې',
  contactCardTitle: 'د دې خبرتیا په اړه پوښتنه لرئ؟',
  ctaBookCall: 'د اړیکې وخت واخلئ',
  ctaEmail: 'خرڅلاو ته ایمیل',
  relatedLabel: 'اړوند',
  relatedSiblingText: 'د کارولو شرایط',
  relatedBookCallText: 'د اړیکې وخت واخلئ',
  relatedOverviewText: 'عمومي کتنه',
}

const termsContentPs: LegalContent = {
  ...termsContentEn,
  eyebrow: 'قانوني · شرایط',
  title: 'د کارولو شرایط',
  readTime: 'شاوخوا 3 دقیقې لوستل',
  glanceTitle: 'په لنډه توګه',
  tocTitle: 'په دې پاڼه کې',
  contactCardTitle: 'د دې شرایطو په اړه پوښتنه لرئ؟',
  ctaBookCall: 'د اړیکې وخت واخلئ',
  ctaEmail: 'خرڅلاو ته ایمیل',
  relatedLabel: 'اړوند',
  relatedSiblingText: 'د محرمیت خبرتیا',
  relatedBookCallText: 'د اړیکې وخت واخلئ',
  relatedOverviewText: 'عمومي کتنه',
}

const LEGAL_CONTENT: Record<LegalLocale, Record<LegalKind, LegalContent>> = {
  en: { privacy: privacyContentEn, terms: termsContentEn },
  'fa-AF': { privacy: privacyContentFa, terms: termsContentFa },
  ps: { privacy: privacyContentPs, terms: termsContentPs },
}

export function getLegalContent(locale: LegalLocale, kind: LegalKind): LegalContent {
  return LEGAL_CONTENT[locale][kind]
}
