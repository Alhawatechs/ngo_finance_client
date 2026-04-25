import type { MarketingLocale, MarketingModuleId, ModuleItem } from '../types'

type ModuleCatalogCell = Pick<ModuleItem, 'title' | 'text'>

/** Single source of truth for tile order and stable keys (deep links / analytics). */
export const MARKETING_MODULE_ORDER = [
  'generalLedger',
  'trialBalance',
  'generalDocuments',
  'fixedAssets',
  'planningBudgeting',
  'paymentVoucher',
  'accountsPayable',
  'procurement',
  'foreignExchange',
  'cashBank',
  'reports',
  'multiOfficeControls',
] as const satisfies readonly MarketingModuleId[]

type ModuleRow = Record<MarketingModuleId, ModuleCatalogCell>

const en: ModuleRow = {
  generalLedger: {
    title: 'General Ledger',
    text: 'Core ledger with controlled posting and period discipline.',
  },
  trialBalance: {
    title: 'Trial Balance',
    text: 'Fast monthly and year-end balancing workflows.',
  },
  generalDocuments: {
    title: 'General Documents',
    text: 'Centralized financial document management.',
  },
  fixedAssets: {
    title: 'Fixed Assets',
    text: 'Asset lifecycle and depreciation tracking.',
  },
  planningBudgeting: {
    title: 'Planning & Budgeting',
    text: 'Budget ownership and program-linked planning.',
  },
  paymentVoucher: {
    title: 'Payment Voucher',
    text: 'Structured voucher approvals and controls.',
  },
  accountsPayable: {
    title: 'Accounts Payable',
    text: 'Vendor obligations and payment readiness visibility.',
  },
  procurement: {
    title: 'Procurement',
    text: 'Aligned procurement flow with finance checks.',
  },
  foreignExchange: {
    title: 'Foreign Exchange',
    text: 'Multi-currency handling for field operations.',
  },
  cashBank: {
    title: 'Cash & Bank',
    text: 'Treasury controls across cashbooks and banks.',
  },
  reports: {
    title: 'Reports',
    text: 'Donor and leadership-ready exports.',
  },
  multiOfficeControls: {
    title: 'Multi-office Controls',
    text: 'Role and office-level segregation of duties.',
  },
}

const faAF: ModuleRow = {
  generalLedger: {
    title: 'دفتر کل',
    text: 'دفتر کل با ثبت کنترل‌شده و انضباط دوره مالی.',
  },
  trialBalance: {
    title: 'تراز آزمایشی',
    text: 'جریان سریع تراز ماهانه و پایان سال.',
  },
  generalDocuments: {
    title: 'اسناد عمومی',
    text: 'مدیریت متمرکز اسناد مالی.',
  },
  fixedAssets: {
    title: 'دارایی‌های ثابت',
    text: 'چرخه عمر دارایی و پیگیری استهلاک.',
  },
  planningBudgeting: {
    title: 'برنامه‌ریزی و بودجه',
    text: 'مالکیت بودجه و برنامه‌ریزی پیوند به برنامه‌ها.',
  },
  paymentVoucher: {
    title: 'فیش پرداخت',
    text: 'تاییدها و کنترل‌های ساختاریافته ووچر.',
  },
  accountsPayable: {
    title: 'حساب‌های پرداختنی',
    text: 'تعهدات تأمین‌کننده و دید آمادگی پرداخت.',
  },
  procurement: {
    title: 'تدارکات',
    text: 'جریان تدارک همسو با کنترل‌های مالی.',
  },
  foreignExchange: {
    title: 'ارز خارجی',
    text: 'مدیریت چندارزی برای عملیات میدانی.',
  },
  cashBank: {
    title: 'صندوق و بانک',
    text: 'کنترل‌های خزانه‌ای روی دفاتر نقدی و بانک‌ها.',
  },
  reports: {
    title: 'گزارش‌ها',
    text: 'خروجی‌های آماده برای اهداکننده و مدیریت.',
  },
  multiOfficeControls: {
    title: 'کنترل چند دفتر',
    text: 'جداسازی وظایف در سطح نقش و دفتر.',
  },
}

const ps: ModuleRow = {
  generalLedger: {
    title: 'عمومي لجر',
    text: 'د کنټرول شوي ثبت او د مالي دورې انضباط سره مرکزي لجر.',
  },
  trialBalance: {
    title: 'د ازمایښت توازن',
    text: 'د میاشتې او کال پای ته چټک توازن بهیرونه.',
  },
  generalDocuments: {
    title: 'عمومي اسناد',
    text: 'د مالي اسنادو مرکزي مدیریت.',
  },
  fixedAssets: {
    title: 'ثابت شتمنۍ',
    text: 'د شتمنۍ ژوند دوره او د استهلاک تعقیب.',
  },
  planningBudgeting: {
    title: 'پلان او بودیجه',
    text: 'د بودیجې مالکیت او د پروګرام سره تړلې پلان جوړونه.',
  },
  paymentVoucher: {
    title: 'د تادیې ووچر',
    text: 'منظم منظوري او کنټرولونه.',
  },
  accountsPayable: {
    title: 'ورکړې حسابونه',
    text: 'د پلورونکو مکلفیتونه او د تادیې چمتووالي لید.',
  },
  procurement: {
    title: 'پرېنښتون',
    text: 'د مالي کنټرولونو سره سم پرېنښتون بهیر.',
  },
  foreignExchange: {
    title: 'بهرنۍ اسعار',
    text: 'د ساحوي عملیاتو لپاره څو اسعاره اداره.',
  },
  cashBank: {
    title: 'نغدي او بانک',
    text: 'د نغدي کتابونو او بانکونو په اوږدو کې د خزانې کنټرولونه.',
  },
  reports: {
    title: 'راپورونه',
    text: 'د اهداکوونکو او مشرتابه لپاره چمتو صادرات.',
  },
  multiOfficeControls: {
    title: 'څو-دفتر کنټرولونه',
    text: 'د رول او دفتر په کچه د دندو جلا کول.',
  },
}

export const marketingModuleCatalog: Record<MarketingLocale, ModuleRow> = {
  en,
  'fa-AF': faAF,
  ps,
}

export function buildMarketingModuleItems(locale: MarketingLocale): ModuleItem[] {
  const row = marketingModuleCatalog[locale]
  return MARKETING_MODULE_ORDER.map((id) => ({
    id,
    title: row[id].title,
    text: row[id].text,
  }))
}
