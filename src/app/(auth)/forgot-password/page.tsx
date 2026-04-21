'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Building2, Mail, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import apiClient from '@/lib/api/client'

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setError(null)
    try {
      await apiClient.post('/auth/forgot-password', { email: data.email })
      setSubmitted(true)
    } catch (err: unknown) {
      const res = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response
        : null
      setError(res?.data?.message ?? 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100 p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-emerald-200/20 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <Card className="shadow-xl border-slate-200/80 bg-white/95 backdrop-blur-sm animate-fade-in-up">
          <CardHeader className="space-y-4 pb-6 text-center border-b border-slate-100">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Building2 className="h-8 w-8 text-white" strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Forgot password
            </h1>
            <p className="text-slate-500 text-sm">
              Enter your email and we&apos;ll send you a reset link
            </p>
          </CardHeader>

          <CardContent className="p-8 pt-6">
            {submitted ? (
              <div className="space-y-4 text-center">
                <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm">
                  If an account exists with that email, you will receive a password reset link shortly.
                </div>
                <Link href="/login" className="inline-flex items-center gap-2 text-primary font-medium hover:text-primary-dark">
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-3 p-4 rounded-lg border border-red-200 bg-red-50 text-red-800"
                  >
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700 font-medium">
                    Email address <span className="text-red-600">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="username"
                      disabled={isSubmitting}
                      className={cn(
                        'pl-10 h-11',
                        errors.email && 'border-red-500 focus-visible:ring-0.5 focus-visible:ring-red-500/20'
                      )}
                      {...register('email')}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending...' : 'Send reset link'}
                </Button>

                <p className="text-xs text-slate-500 text-center leading-relaxed">
                  Automated reset email is being rolled out. If you don&apos;t receive a message, contact your administrator.
                </p>

                <Link
                  href="/login"
                  className="block text-center text-sm font-medium text-primary hover:text-primary-dark transition-colors"
                >
                  ← Back to sign in
                </Link>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
