'use client'

import { cn } from '@/lib/utils'
import { scorePasswordStrength } from '@/lib/password-policy'

export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null

  const { score, label, color } = scorePasswordStrength(password)
  const pct = (score / 4) * 100

  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all duration-300', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        Strength: <span className="font-medium text-foreground">{label}</span>
      </p>
    </div>
  )
}
