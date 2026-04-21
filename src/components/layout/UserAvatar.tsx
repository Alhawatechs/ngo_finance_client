'use client'

import { useState } from 'react'
import { cn, getInitials } from '@/lib/utils'

const SIZE_CLASS = {
  sm: 'h-8 w-8 text-xs font-semibold',
  md: 'h-11 w-11 text-sm font-semibold',
  lg: 'h-16 w-16 text-lg font-semibold',
  xl: 'h-24 w-24 text-2xl font-semibold',
} as const

export type UserAvatarSize = keyof typeof SIZE_CLASS

export interface UserAvatarProps {
  name: string
  initials: string
  avatarUrl?: string | null
  size?: UserAvatarSize
  className?: string
  /** Header trigger: light initials on blue. Profile / dropdown: primary tint. */
  variant?: 'header' | 'default'
}

/**
 * Rounded avatar with optional photo; falls back to initials on error or missing URL.
 */
export function UserAvatar({
  name,
  initials,
  avatarUrl,
  size = 'md',
  className,
  variant = 'default',
}: UserAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false)
  const showImg = Boolean(avatarUrl && !imgFailed)
  const fallback = initials || getInitials(name || 'U')

  const bg =
    variant === 'header'
      ? 'bg-white/20 text-white'
      : 'bg-primary/12 text-primary ring-2 ring-white shadow-sm'

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full flex items-center justify-center',
        SIZE_CLASS[size],
        !showImg && bg,
        className
      )}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote API URLs; avoid Next/Image remotePatterns drift
        <img
          src={avatarUrl!}
          alt={`${name} profile photo`}
          width={size === 'xl' ? 96 : size === 'lg' ? 64 : size === 'md' ? 44 : 32}
          height={size === 'xl' ? 96 : size === 'lg' ? 64 : size === 'md' ? 44 : 32}
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span className="select-none" aria-hidden>
          {fallback}
        </span>
      )}
    </div>
  )
}
