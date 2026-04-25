'use client'

import Link from 'next/link'
import { useMarketingI18n } from '../useMarketingI18n'
import type { LegalContent } from './legal-content'

type Props = {
  content: LegalContent
}

export function LegalMarketingPage({ content }: Props) {
  const { dir } = useMarketingI18n()

  return (
    <div className="bg-white text-slate-900" dir={dir}>
      <main className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0f766e]">{content.eyebrow}</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{content.title}</h1>
          <p className="mt-4 max-w-3xl text-slate-600" dangerouslySetInnerHTML={{ __html: content.leadHtml }} />
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">{content.updated}</span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">{content.readTime}</span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">{content.scopeTag}</span>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-slate-200 bg-white p-5 lg:sticky lg:top-24 lg:h-fit">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{content.tocTitle}</p>
            <ol className="mt-3 space-y-2">
              {content.sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="text-sm font-medium text-[#0f766e] hover:underline">
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </aside>

          <div>
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-bold">{content.glanceTitle}</h2>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-700">
                {content.glance.map((item) => (
                  <li key={item} dangerouslySetInnerHTML={{ __html: item }} />
                ))}
              </ul>
            </section>

            <div className="mt-6 space-y-4">
              {content.sections.map((section) => (
                <section key={section.id} id={section.id} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h2 className="text-xl font-bold tracking-tight">{section.title}</h2>
                  <div className="mt-3 space-y-2 text-slate-700 [&_ul]:list-disc [&_ul]:pl-6" dangerouslySetInnerHTML={{ __html: section.html }} />
                </section>
              ))}
            </div>

            <section className="mt-6 rounded-2xl border border-[#bde4df] bg-[#f4fbfa] p-6">
              <h3 className="text-lg font-bold">{content.contactCardTitle}</h3>
              <p className="mt-2 text-slate-700" dangerouslySetInnerHTML={{ __html: content.contactCardHtml }} />
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/book-a-call" className="rounded-full bg-[#0f766e] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#115e59]">
                  {content.ctaBookCall}
                </Link>
                <a
                  href="mailto:sales@ngobook.com"
                  className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-[#0f766e]/40 hover:text-[#0f766e]"
                >
                  {content.ctaEmail}
                </a>
              </div>
            </section>

            <nav className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
              <span className="font-semibold text-slate-500">{content.relatedLabel}:</span>
              <Link href={content.relatedSiblingHref} className="font-semibold text-[#0f766e] hover:underline">
                {content.relatedSiblingText}
              </Link>
              <Link href="/book-a-call" className="font-semibold text-[#0f766e] hover:underline">
                {content.relatedBookCallText}
              </Link>
              <Link href="/" className="font-semibold text-[#0f766e] hover:underline">
                {content.relatedOverviewText}
              </Link>
            </nav>
          </div>
        </div>
      </main>
    </div>
  )
}
