import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'NGOBook - Finance & treasury for mission-driven organizations',
  description:
    'NGOBook: NGO finance and treasury on one ledger-general ledger, banking, grant dimensions, multi-office controls, and donor reporting built for audit-ready close.',
  openGraph: {
    title: 'NGOBook - Finance & treasury for mission-driven organizations',
    description:
      'NGOBook: NGO finance and treasury on one ledger-general ledger, banking, grant dimensions, multi-office controls, and donor reporting built for audit-ready close.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NGOBook - Finance & treasury for mission-driven organizations',
    description:
      'NGOBook: NGO finance and treasury on one ledger-general ledger, banking, grant dimensions, multi-office controls, and donor reporting built for audit-ready close.',
  },
}

export default function HomePage() {
  return (
    <div className="bg-white">
      <iframe
        src="/marketing-home/index.html"
        title="NGOBook Marketing Home"
        className="h-[100dvh] w-full border-0"
        loading="eager"
      />

      <section id="request-call" className="border-t border-slate-200 bg-slate-50/70 px-6 py-16">
        <div className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">Request a Call</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Talk to our finance team
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
            Share your office footprint, donor model, and reporting needs. We will help you scope the right
            NGOBook setup and provide a tailored quotation.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/marketing-home/index.html#/book-a-call"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-teal-700 px-6 text-sm font-semibold text-white transition-colors hover:bg-teal-800"
            >
              Open Request Call Form
            </a>
            <a
              href="mailto:sales@ngobook.com"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition-colors hover:border-teal-300 hover:text-teal-700"
            >
              Email sales@ngobook.com
            </a>
          </div>
        </div>
      </section>

      <section id="contact" className="border-t border-slate-200 bg-white px-6 py-16">
        <div className="mx-auto w-full max-w-5xl rounded-2xl border border-slate-200 bg-slate-50/60 p-8 shadow-sm sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">Contact</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Get in touch</h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-600">
            For product demos, implementation scope, security questions, or pricing details, contact the NGOBook
            team directly.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <a
              href="mailto:sales@ngobook.com"
              className="rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-teal-300"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Email</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">sales@ngobook.com</p>
            </a>
            <a
              href="tel:+93704519947"
              className="rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-teal-300"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Phone</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">+93 (0) 704519947</p>
            </a>
            <a
              href="https://www.ngobook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-teal-300"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Website</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">www.ngobook.com</p>
            </a>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/marketing-home/index.html#/book-a-call"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-teal-700 px-6 text-sm font-semibold text-white transition-colors hover:bg-teal-800"
            >
              Request a Call
            </a>
            <a
              href="mailto:sales@ngobook.com?subject=NGOBook%20Inquiry"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition-colors hover:border-teal-300 hover:text-teal-700"
            >
              Send Email
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
