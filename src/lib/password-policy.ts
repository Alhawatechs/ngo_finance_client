import { z } from 'zod'

/** Matches backend `min:8` for password changes. */
export const PASSWORD_MIN_LENGTH = 8

/** Aligns with API: min 8 + confirmed. Strength meter encourages stronger choices. */
export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Enter your current password'),
    password: z.string().min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`),
    password_confirmation: z.string().min(1, 'Confirm your new password'),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Passwords do not match',
    path: ['password_confirmation'],
  })

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>

/** 0–4 score for UI meter (advisory). */
export function scorePasswordStrength(password: string): { score: number; label: string; color: string } {
  let points = 0
  if (password.length >= PASSWORD_MIN_LENGTH) points++
  if (password.length >= 12) points++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points++
  if (/[0-9]/.test(password)) points++
  if (/[^A-Za-z0-9]/.test(password)) points++

  const score = Math.min(4, points)
  const levels = [
    { label: 'Too weak', color: 'bg-red-500' },
    { label: 'Weak', color: 'bg-orange-500' },
    { label: 'Fair', color: 'bg-amber-500' },
    { label: 'Good', color: 'bg-emerald-500' },
    { label: 'Strong', color: 'bg-emerald-600' },
  ]
  return { score, ...levels[score] }
}
