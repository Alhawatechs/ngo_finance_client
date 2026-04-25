'use client'

import { FormEvent, useMemo, useState } from 'react'

const SALES_EMAIL = 'sales@ngobook.com'

type BookCallForm = {
  region: string
  orgSize: string
  interest: string
  org: string
  name: string
  email: string
  phone: string
  website: string
  message: string
}

const initialForm: BookCallForm = {
  region: '',
  orgSize: '',
  interest: 'Book a consultation call',
  org: '',
  name: '',
  email: '',
  phone: '',
  website: '',
  message: '',
}

export function BookCallMarketingPage() {
  const [form, setForm] = useState<BookCallForm>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const messageLength = form.message.length

  const canSubmit = useMemo(() => {
    return Boolean(form.region && form.orgSize && form.interest && form.org && form.name && form.email && form.phone && form.message)
  }, [form])

  const updateField = <K extends keyof BookCallForm>(key: K, value: BookCallForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setError('')
    setSuccess('')
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!canSubmit) {
      setError('Please complete all required fields before submitting.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Please enter a valid work email address.')
      return
    }

    const subject = `NGOBook - Call request: ${form.org}`
    const body =
      `NGOBook - Book a call request\r\n` +
      `Source page: book-a-call-next\r\n\r\n` +
      `Country/region: ${form.region}\r\n` +
      `Organization size: ${form.orgSize}\r\n` +
      `Focus: ${form.interest}\r\n\r\n` +
      `Organization: ${form.org}\r\n` +
      `Contact name: ${form.name}\r\n` +
      `Work email: ${form.email}\r\n` +
      `Phone: ${form.phone}\r\n` +
      `${form.website ? `Website: ${form.website}\r\n` : ''}` +
      `\r\nGoals for the call:\r\n${form.message}\r\n`

    const mailto = `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    const payload = {
      _subject: subject,
      _replyto: form.email,
      _captcha: false,
      name: form.name,
      email: form.email,
      organization: form.org,
      country_region: form.region,
      organization_size: form.orgSize,
      primary_interest: form.interest,
      telephone: form.phone,
      website: form.website || '',
      message: form.message,
      source_page: 'book-a-call-next',
    }

    setSubmitting(true)
    try {
      const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(SALES_EMAIL)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setSuccess('Thank you. Our team will review your request and reach out within two business days.')
        setForm(initialForm)
        return
      }
      window.location.href = mailto
    } catch {
      window.location.href = mailto
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white text-slate-900">
      <main className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0f766e]">Sales · NGOBook</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Book a call with people who speak finance - and software.
          </h1>
          <p className="mt-4 max-w-3xl text-slate-600">
            Whether you are evaluating a new ledger, tightening treasury controls, or aligning donor reporting to one source of truth, this session is
            a working conversation - not a script.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Typical first response within two business days. Email <a className="text-[#0f766e]" href="mailto:sales@ngobook.com">sales@ngobook.com</a>{' '}
            or call <a className="text-[#0f766e]" href="tel:+93704519947">+93 (0) 704519947</a>.
          </p>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold">Tell us who you are - we will handle the rest</h2>
            <p className="mt-3 text-slate-600">
              The strongest first calls include your finance lead and, when relevant, someone who cares about hosting or security.
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-sm text-slate-700">
              <li>Multi-office NGOs and INGOs comparing ERP-style finance options</li>
              <li>Teams modernizing from spreadsheets or fragmented field tools</li>
              <li>Organizations preparing donor audits, board packs, or major grants</li>
            </ul>
          </aside>

          <div className="rounded-2xl border border-[#bde4df] bg-[#f4fbfa] p-6 sm:p-8">
            <h2 className="text-2xl font-bold">Request your call</h2>
            <p className="mt-2 text-sm text-slate-600">Share a work email and a few lines on what you are trying to solve. Fields marked with * are required.</p>

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
              {success ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="text-sm font-medium text-slate-700">
                  Country or region *
                  <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.region} onChange={(e) => updateField('region', e.target.value)}>
                    <option value="">Select...</option>
                    <option value="Africa">Africa</option>
                    <option value="Americas">Americas</option>
                    <option value="Asia Pacific">Asia Pacific</option>
                    <option value="Europe">Europe</option>
                    <option value="Middle East">Middle East</option>
                    <option value="Other / multiple">Other / multiple regions</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Organization size *
                  <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.orgSize} onChange={(e) => updateField('orgSize', e.target.value)}>
                    <option value="">Select...</option>
                    <option value="1 to 50 staff">1 to 50 staff</option>
                    <option value="51 to 250 staff">51 to 250 staff</option>
                    <option value="251 to 1,000 staff">251 to 1,000 staff</option>
                    <option value="1000+ staff">1,000+ staff</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Focus for the call *
                  <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.interest} onChange={(e) => updateField('interest', e.target.value)}>
                    <option value="Book a consultation call">Book a consultation call</option>
                    <option value="Product demo / guided tour">Product demo / guided tour</option>
                    <option value="Pricing and licensing">Pricing and licensing</option>
                    <option value="Multi-office / grant accounting fit">Multi-office / grant accounting fit</option>
                    <option value="Treasury and approvals">Treasury and approvals</option>
                    <option value="Reporting and donor lines">Reporting and donor lines</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Organization name *
                  <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.org} onChange={(e) => updateField('org', e.target.value)} />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Full name *
                  <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.name} onChange={(e) => updateField('name', e.target.value)} />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Business email *
                  <input type="email" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Telephone *
                  <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                Organization website
                <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" placeholder="https://" value={form.website} onChange={(e) => updateField('website', e.target.value)} />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                What should we prepare? *
                <textarea
                  rows={6}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  placeholder="Offices, fiscal year-end, donor types, languages, or anything you want on the agenda."
                  value={form.message}
                  onChange={(e) => updateField('message', e.target.value)}
                />
                <span className="mt-1 block text-xs text-slate-500">{messageLength} / 4,000</span>
              </label>

              <p className="text-sm text-slate-600">
                By submitting, you agree NGOBook may use this information only to respond to your request. Read our{' '}
                <a className="font-semibold text-[#0f766e] hover:underline" href="/privacy-policy">
                  privacy notice
                </a>
                .
              </p>

              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-[#0f766e] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? 'Sending...' : 'Send request'}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  )
}
