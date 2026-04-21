'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { Eye, EyeOff, KeyRound, Loader2, Lock, Shield, Info } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { changePasswordSchema, type ChangePasswordFormValues, PASSWORD_MIN_LENGTH } from '@/lib/password-policy'
import { changePassword } from '@/lib/api/auth'
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { SETTINGS_SECTION_QUERY } from '@/components/settings/unified/settings-constants'

function fieldError(err: unknown, key: string): string | undefined {
  if (!isAxiosError(err)) return undefined
  const body = err.response?.data as { errors?: Record<string, string[]> } | undefined
  return body?.errors?.[key]?.[0]
}

const section = (id: string) => `/settings?${SETTINGS_SECTION_QUERY}=${id}`

export function SecuritySettingsSection() {
  const { toast } = useToast()
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: '',
      password: '',
      password_confirmation: '',
    },
  })

  const newPassword = form.watch('password')

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await changePassword(data)
      toast({
        title: 'Password updated',
        description: 'Your password has been changed. Use it next time you sign in on another device.',
      })
      form.reset()
    } catch (e: unknown) {
      const msg =
        fieldError(e, 'current_password') ||
        fieldError(e, 'password') ||
        (isAxiosError(e) && (e.response?.data as { message?: string } | undefined)?.message) ||
        'Could not update password. Try again.'
      toast({ title: 'Could not change password', description: msg, variant: 'destructive' })
    }
  })

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="border-slate-200/90 shadow-sm dark:border-slate-200 lg:col-span-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-teal-700 dark:text-teal-400" />
            <CardTitle className="text-lg">Change password</CardTitle>
          </div>
          <CardDescription>
            Use at least {PASSWORD_MIN_LENGTH} characters. Choose a password you don&apos;t use elsewhere.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="max-w-lg space-y-5">
            <div className="space-y-2">
              <Label htmlFor="current_password">Current password</Label>
              <div className="relative">
                <Input
                  id="current_password"
                  type={showCurrent ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={cn('pr-10', form.formState.errors.current_password && 'border-destructive')}
                  {...form.register('current_password')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  aria-label={showCurrent ? 'Hide password' : 'Show password'}
                  onClick={() => setShowCurrent((v) => !v)}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.current_password && (
                <p className="text-xs text-destructive">{form.formState.errors.current_password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showNew ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={cn('pr-10', form.formState.errors.password && 'border-destructive')}
                  {...form.register('password')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  aria-label={showNew ? 'Hide password' : 'Show password'}
                  onClick={() => setShowNew((v) => !v)}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrengthMeter password={newPassword} />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password_confirmation">Confirm new password</Label>
              <div className="relative">
                <Input
                  id="password_confirmation"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={cn('pr-10', form.formState.errors.password_confirmation && 'border-destructive')}
                  {...form.register('password_confirmation')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  onClick={() => setShowConfirm((v) => !v)}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password_confirmation && (
                <p className="text-xs text-destructive">{form.formState.errors.password_confirmation.message}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating…
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Update password
                  </>
                )}
              </Button>
              <Link href="/forgot-password" className="text-sm font-medium text-teal-700 hover:underline dark:text-teal-400">
                Forgot password?
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="h-fit border-slate-200/90 shadow-sm dark:border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-teal-700 dark:text-teal-400" />
            <CardTitle className="text-base">Privacy & session</CardTitle>
          </div>
          <CardDescription>How we handle your account data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="flex gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400" />
            <p>
              Sign-in uses your <strong className="text-foreground">email address</strong> as your username. Passwords are
              stored encrypted and never shown to staff in plain text.
            </p>
          </div>
          <p>
            Session and security policies (timeout, periodic password change, optional two-factor) are set by your
            organization in{' '}
            <Link href={section('system')} className="font-medium text-teal-700 hover:underline dark:text-teal-400">
              System preferences
            </Link>
            .
          </p>
          <p>
            Control alerts and email in{' '}
            <Link href={section('notifications')} className="font-medium text-teal-700 hover:underline dark:text-teal-400">
              Notification settings
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
