'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useMarketingI18n } from '../useMarketingI18n'

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
  interest: '',
  org: '',
  name: '',
  email: '',
  phone: '',
  website: '',
  message: '',
}

const BOOK_CALL_TEXT = {
  en: {
    eyebrow: 'Sales · NGOBook',
    title: 'Book a call with people who speak finance - and software.',
    lead: 'Whether you are evaluating a new ledger, tightening treasury controls, or aligning donor reporting to one source of truth, this session is a working conversation - not a script.',
    notePrefix: 'Typical first response within two business days. Email',
    noteMid: 'or call',
    asideTitle: 'Tell us who you are - we will handle the rest',
    asideLead: 'The strongest first calls include your finance lead and, when relevant, someone who cares about hosting or security.',
    asideList: [
      'Multi-office NGOs and INGOs comparing ERP-style finance options',
      'Teams modernizing from spreadsheets or fragmented field tools',
      'Organizations preparing donor audits, board packs, or major grants',
    ],
    formTitle: 'Request your call',
    formLead: 'Share a work email and a few lines on what you are trying to solve. Fields marked with * are required.',
    labels: {
      region: 'Country or region *',
      orgSize: 'Organization size *',
      interest: 'Focus for the call *',
      org: 'Organization name *',
      name: 'Full name *',
      email: 'Business email *',
      phone: 'Telephone *',
      website: 'Organization website',
      message: 'What should we prepare? *',
      messagePlaceholder: 'Offices, fiscal year-end, donor types, languages, or anything you want on the agenda.',
      websitePlaceholder: 'https://',
    },
    options: {
      select: 'Select...',
      regions: ['Africa', 'Americas', 'Asia Pacific', 'Europe', 'Middle East', 'Other / multiple regions'],
      sizes: ['1 to 50 staff', '51 to 250 staff', '251 to 1,000 staff', '1,000+ staff', 'Prefer not to say'],
      interests: [
        'Book a consultation call',
        'Product demo / guided tour',
        'Pricing and licensing',
        'Multi-office / grant accounting fit',
        'Treasury and approvals',
        'Reporting and donor lines',
      ],
    },
    policyPrefix: 'By submitting, you agree NGOBook may use this information only to respond to your request. Read our',
    policyLink: 'privacy notice',
    policySuffix: '.',
    submit: 'Send request',
    sending: 'Sending...',
    success: 'Thank you. Our team will review your request and reach out within two business days.',
    errRequired: 'Please complete all required fields before submitting.',
    errEmail: 'Please enter a valid work email address.',
  },
  'fa-AF': {
    eyebrow: 'فروش · NGOBook',
    title: 'با تیمی تماس بگیرید که هم مالی می‌فهمد و هم نرم‌افزار.',
    lead: 'اگر در حال ارزیابی لیجر جدید، تقویت کنترل‌های خزانه‌داری یا هم‌راستاسازی گزارش‌دهی اهداکننده هستید، این نشست یک گفت‌وگوی کاری است.',
    notePrefix: 'پاسخ اولیه معمولاً ظرف دو روز کاری. ایمیل',
    noteMid: 'یا تماس',
    asideTitle: 'خودتان را معرفی کنید - ادامه را ما مدیریت می‌کنیم',
    asideLead: 'بهترین تماس اولیه وقتی است که مسئول مالی شما و در صورت نیاز فرد مرتبط با امنیت یا هاستینگ حضور داشته باشد.',
    asideList: [
      'NGO های چنددفتری در حال مقایسه گزینه‌های ERP مالی',
      'تیم‌هایی که از اکسل یا ابزارهای پراکنده مهاجرت می‌کنند',
      'سازمان‌هایی که برای ممیزی یا گزارش‌های مدیریتی آماده می‌شوند',
    ],
    formTitle: 'درخواست تماس',
    formLead: 'ایمیل کاری و چند خط از نیازتان را وارد کنید. فیلدهای ستاره‌دار الزامی‌اند.',
    labels: {
      region: 'کشور یا منطقه *',
      orgSize: 'اندازه سازمان *',
      interest: 'محور تماس *',
      org: 'نام سازمان *',
      name: 'نام کامل *',
      email: 'ایمیل کاری *',
      phone: 'تلفن *',
      website: 'وب‌سایت سازمان',
      message: 'چه چیزی را برای تماس آماده کنیم؟ *',
      messagePlaceholder: 'دفاتر، پایان سال مالی، نوع اهداکننده‌ها، زبان‌ها و موارد مدنظر شما.',
      websitePlaceholder: 'https://',
    },
    options: {
      select: 'انتخاب...',
      regions: ['آفریقا', 'آمریکا', 'آسیا پاسفیک', 'اروپا', 'خاورمیانه', 'سایر / چند منطقه'],
      sizes: ['1 تا 50 کارمند', '51 تا 250 کارمند', '251 تا 1,000 کارمند', 'بیش از 1,000', 'ترجیح می‌دهم نگویم'],
      interests: ['مشاوره اولیه', 'دمو / معرفی محصول', 'قیمت و لایسنس', 'تناسب با حسابداری گرنت و چنددفتر', 'خزانه‌داری و تاییدات', 'گزارش‌دهی و خطوط اهداکننده'],
    },
    policyPrefix: 'با ارسال فرم، موافقت می‌کنید NGOBook فقط برای پاسخ به درخواست شما از اطلاعات استفاده کند. مطالعه',
    policyLink: 'اطلاعیه محرمیت',
    policySuffix: '.',
    submit: 'ارسال درخواست',
    sending: 'در حال ارسال...',
    success: 'سپاس. تیم ما درخواست شما را بررسی کرده و حداکثر ظرف دو روز کاری پاسخ می‌دهد.',
    errRequired: 'لطفاً تمام فیلدهای الزامی را تکمیل کنید.',
    errEmail: 'لطفاً یک ایمیل کاری معتبر وارد کنید.',
  },
  ps: {
    eyebrow: 'پلور · NGOBook',
    title: 'له داسې ټیم سره اړیکه ونیسئ چې هم مالي پوهه لري او هم سافټویر.',
    lead: 'که تاسو نوی لیجر ارزوی، د خزانې کنټرولونه پیاوړي کوئ، یا د تمویل ورکوونکو راپورونه همغږي کوئ، دا ناسته عملي او کاري ده.',
    notePrefix: 'معمولا لومړنی ځواب په دوو کاري ورځو کې. ایمیل',
    noteMid: 'یا اړیکه',
    asideTitle: 'خپل معلومات راکړئ - پاتې کار موږ سمبالوو',
    asideLead: 'غوره لومړنۍ ناسته هغه ده چې ستاسو د مالي ټیم مشر او که اړتیا وي د IT/امنیت استازی پکې وي.',
    asideList: [
      'څو-دفتره NGO ګانې چې ERP مالي حلونه ارزوي',
      'هغه ټیمونه چې له سپریډشیټونو او جلا وسیلو څخه بدلېږي',
      'هغه ادارې چې د تمویل راپورونو او پلټنو ته چمتو کېږي',
    ],
    formTitle: 'د تماس غوښتنه',
    formLead: 'خپل کاري ایمیل او د اړتیا لنډ معلومات شریک کړئ. د ستوري نښه شوي فیلډونه ضروري دي.',
    labels: {
      region: 'هیواد یا سیمه *',
      orgSize: 'د ادارې اندازه *',
      interest: 'د تماس تمرکز *',
      org: 'د ادارې نوم *',
      name: 'بشپړ نوم *',
      email: 'کاري ایمیل *',
      phone: 'تلیفون *',
      website: 'د ادارې ویب‌پاڼه',
      message: 'موږ د تماس لپاره څه چمتو کړو؟ *',
      messagePlaceholder: 'دفترونه، مالي کال پای، د تمویل ډولونه، ژبې او نور مهم موارد.',
      websitePlaceholder: 'https://',
    },
    options: {
      select: 'وټاکئ...',
      regions: ['افریقا', 'امریکا', 'اسیا پاسفیک', 'اروپا', 'منځنی ختیځ', 'نور / څو سیمې'],
      sizes: ['له 1 تر 50 کارکوونکي', 'له 51 تر 250 کارکوونکي', 'له 251 تر 1,000 کارکوونکي', 'له 1,000 زیات', 'نه ویل غوره ګڼم'],
      interests: ['د مشورې اړیکه', 'محصولي ډیمو / لارښود', 'بیه او لایسنس', 'د څو-دفتره او ګرانټ حسابدارۍ مناسب والی', 'خزانه او تاییدات', 'راپورونه او تمویل کرښې'],
    },
    policyPrefix: 'په سپارلو سره، تاسو موافق یاست چې NGOBook یوازې ستاسو د غوښتنې د ځواب لپاره معلومات وکاروي. ولولئ',
    policyLink: 'د محرمیت خبرتیا',
    policySuffix: '.',
    submit: 'غوښتنه واستوئ',
    sending: 'لېږل کېږي...',
    success: 'مننه. زموږ ټیم به ستاسو غوښتنه وڅېړي او په دوو کاري ورځو کې به اړیکه ونیسي.',
    errRequired: 'مهرباني وکړئ ټول اړین فیلډونه بشپړ کړئ.',
    errEmail: 'مهرباني وکړئ معتبر کاري ایمیل ولیکئ.',
  },
} as const

export function BookCallMarketingPage() {
  const { locale, dir } = useMarketingI18n()
  const text = BOOK_CALL_TEXT[locale]
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
      setError(text.errRequired)
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError(text.errEmail)
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
        setSuccess(text.success)
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
    <div className="bg-white text-slate-900" dir={dir}>
      <main className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0f766e]">{text.eyebrow}</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{text.title}</h1>
          <p className="mt-4 max-w-3xl text-slate-600">{text.lead}</p>
          <p className="mt-3 text-sm text-slate-500">
            {text.notePrefix} <a className="text-[#0f766e]" href="mailto:sales@ngobook.com">sales@ngobook.com</a> {text.noteMid}{' '}
            <a className="text-[#0f766e]" href="tel:+93704519947">+93 (0) 704519947</a>.
          </p>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold">{text.asideTitle}</h2>
            <p className="mt-3 text-slate-600">{text.asideLead}</p>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-sm text-slate-700">
              {text.asideList.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </aside>

          <div className="rounded-2xl border border-[#bde4df] bg-[#f4fbfa] p-6 sm:p-8">
            <h2 className="text-2xl font-bold">{text.formTitle}</h2>
            <p className="mt-2 text-sm text-slate-600">{text.formLead}</p>

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
              {success ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="text-sm font-medium text-slate-700">
                  {text.labels.region}
                  <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.region} onChange={(e) => updateField('region', e.target.value)}>
                    <option value="">{text.options.select}</option>
                    {text.options.regions.map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  {text.labels.orgSize}
                  <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.orgSize} onChange={(e) => updateField('orgSize', e.target.value)}>
                    <option value="">{text.options.select}</option>
                    {text.options.sizes.map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  {text.labels.interest}
                  <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.interest} onChange={(e) => updateField('interest', e.target.value)}>
                    <option value="">{text.options.select}</option>
                    {text.options.interests.map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  {text.labels.org}
                  <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.org} onChange={(e) => updateField('org', e.target.value)} />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  {text.labels.name}
                  <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.name} onChange={(e) => updateField('name', e.target.value)} />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  {text.labels.email}
                  <input type="email" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  {text.labels.phone}
                  <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                {text.labels.website}
                <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" placeholder={text.labels.websitePlaceholder} value={form.website} onChange={(e) => updateField('website', e.target.value)} />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                {text.labels.message}
                <textarea
                  rows={6}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  placeholder={text.labels.messagePlaceholder}
                  value={form.message}
                  onChange={(e) => updateField('message', e.target.value)}
                />
                <span className="mt-1 block text-xs text-slate-500">{messageLength} / 4,000</span>
              </label>

              <p className="text-sm text-slate-600">
                {text.policyPrefix}{' '}
                <a className="font-semibold text-[#0f766e] hover:underline" href="/privacy-policy">
                  {text.policyLink}
                </a>
                {text.policySuffix}
              </p>

              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-[#0f766e] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? text.sending : text.submit}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  )
}
