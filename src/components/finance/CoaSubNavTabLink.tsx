'use client'

import Link from 'next/link'
import { useCallback, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type CoaSubNavTabLinkProps = {
  href: string
  active?: boolean
  className?: string
  children: ReactNode
}

/** Update spotlight center on the anchor (CSS vars = no React re-render per mousemove). */
function setGlowPosition(el: HTMLAnchorElement, clientX: number, clientY: number) {
  const r = el.getBoundingClientRect()
  if (r.width <= 0 || r.height <= 0) return
  const x = ((clientX - r.left) / r.width) * 100
  const y = ((clientY - r.top) / r.height) * 100
  el.style.setProperty('--coa-glow-x', `${x}%`)
  el.style.setProperty('--coa-glow-y', `${y}%`)
}

/**
 * Chart of Accounts sub-nav: white tab, blue mouse-follow hover on inactive, primary fill when active.
 */
export function CoaSubNavTabLink({ href, active, className, children }: CoaSubNavTabLinkProps) {
  const [hover, setHover] = useState(false)

  const onPointerOnTab = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    setGlowPosition(e.currentTarget, e.clientX, e.clientY)
  }, [])

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'coa-subnav-tab relative isolate inline-flex min-h-[2.25rem] min-w-[7.25rem] max-w-[12rem] flex-1 items-center overflow-hidden rounded-none bg-white px-2.5 py-1.5 text-xs font-semibold shadow-none outline-none sm:min-w-[8rem] sm:max-w-none sm:flex-initial',
        '[--coa-glow-x:50%] [--coa-glow-y:50%]',
        'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-card',
        active ? 'bg-primary text-white hover:brightness-105' : 'text-primary',
        className
      )}
      onMouseEnter={(e) => {
        setHover(true)
        onPointerOnTab(e)
      }}
      onMouseMove={onPointerOnTab}
      onMouseLeave={() => setHover(false)}
    >
      {/* Blue hover spotlight follows cursor (inactive tabs only) */}
      {!active && (
        <span
          className={cn(
            'pointer-events-none absolute inset-0 z-[1] transition-opacity duration-150',
            hover ? 'opacity-100' : 'opacity-0',
            'motion-reduce:opacity-0 motion-reduce:transition-none'
          )}
          style={{
            background:
              'radial-gradient(ellipse 130px 100px at var(--coa-glow-x, 50%) var(--coa-glow-y, 50%), rgba(30, 58, 138, 0.42) 0%, rgba(29, 78, 216, 0.28) 26%, rgba(37, 99, 235, 0.18) 44%, rgba(59, 130, 246, 0.1) 58%, transparent 78%)',
          }}
          aria-hidden
        />
      )}
      <span
        className={cn(
          'relative z-10 flex w-full min-w-0 items-center justify-between gap-2',
          active ? 'text-white' : 'text-primary'
        )}
      >
        {children}
      </span>
    </Link>
  )
}
