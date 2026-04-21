import { cn } from '@/lib/utils'

/** Shared layout tokens for the public home route (`/`). Styled after NGOBook. */
export const publicPage = {
  inner: 'w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16',
  sectionPad: 'py-16 sm:py-20 lg:py-24',
  scrollSection: 'scroll-mt-[72px] relative',
  sectionBorder: 'border-b border-slate-200/70',
  surface: 'bg-white',
  surfaceAlt: 'bg-slate-50/70',
  kicker:
    'inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0f766e] before:inline-block before:h-1.5 before:w-1.5 before:rounded-full before:bg-[#14b8a6]',
  h2: 'font-sans text-2xl font-bold leading-[1.15] tracking-tight text-slate-900 sm:text-3xl lg:text-[2rem]',
  h2Display:
    'font-sans text-3xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-4xl lg:text-[2.4rem]',
  body: 'text-sm leading-relaxed text-slate-700 sm:text-base sm:leading-[1.72]',
  bodyMuted: 'text-sm leading-relaxed text-slate-600 sm:text-base sm:leading-[1.68]',
  subKicker: 'text-xs font-medium uppercase tracking-[0.12em] text-slate-500',
  imageFrame: 'shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06),0_16px_40px_-14px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/[0.05] rounded-xl',
  iconBox: cn(
    'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
    'bg-[#0f766e]/10 text-[#0f766e] ring-1 ring-[#0f766e]/15',
  ),
  surfaceRaised:
    'rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.045),0_10px_28px_-8px_rgba(15,23,42,0.07)]',
} as const
