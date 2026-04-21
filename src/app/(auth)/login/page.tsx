'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/stores/authStore'
import { useOrganizationStore } from '@/stores/organizationStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Building2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  AlertCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  remember_me: z.boolean().optional(),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading, error, clearError, isAuthenticated, user } = useAuthStore()
  const { branding, fetchBranding } = useOrganizationStore()
  const [showPassword, setShowPassword] = useState(false)
  const [showDemo, setShowDemo] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      remember_me: false,
    },
  })

  useEffect(() => {
    fetchBranding().catch(() => {})
  }, [fetchBranding])

  useEffect(() => {
    const orgName = branding?.short_name || branding?.name || 'ERP'
    document.title = `Sign In | ${orgName} Finance`
  }, [branding])

  useEffect(() => {
    if (isAuthenticated && user) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, user, router])

  useEffect(() => {
    return () => clearError()
  }, [clearError])

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login({ email: data.email, password: data.password })
      router.push('/dashboard')
    } catch {
      // Error handled by store
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100 p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-emerald-200/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-slate-200/40" style={{ background: 'transparent' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        <Card className="shadow-xl border-slate-200/80 bg-white/95 backdrop-blur-sm animate-fade-in-up">
          <CardHeader className="space-y-4 pb-6 text-center border-b border-slate-100">
            {branding?.logo_url ? (
              <div className="mx-auto max-w-[280px] rounded-xl overflow-hidden bg-white border border-slate-100 flex items-center justify-center shadow-sm p-4">
                <img
                  src={branding.logo_url}
                  alt={branding.name || 'Logo'}
                  className="max-h-16 w-auto object-contain"
                />
              </div>
            ) : (
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                <Building2 className="h-8 w-8 text-white" strokeWidth={1.5} />
              </div>
            )}
            {!branding?.logo_url && (
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {branding?.name || 'AADA ERP Finance'}
              </h1>
            )}
            {branding?.tagline && (
              <p className="text-sm text-primary font-medium">{branding.tagline}</p>
            )}
            <p className="text-slate-500 text-sm">Sign in to your account</p>
          </CardHeader>

          <CardContent className="p-8 pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-3 p-4 rounded-lg border border-red-200 bg-red-50 text-red-800"
                >
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
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
                    disabled={isLoading}
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

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 font-medium">
                  Password <span className="text-red-600">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={isLoading}
                    aria-describedby="login-password-hint"
                    className={cn(
                      'pl-10 pr-11 h-11',
                      errors.password && 'border-red-500 focus-visible:ring-0.5 focus-visible:ring-red-500/20'
                    )}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
                )}
                <p id="login-password-hint" className="text-xs text-slate-500">
                  Sign-in ID is your email. Passwords are case-sensitive. New passwords must be at least 8 characters.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-0.5 focus:ring-primary/50"
                    {...register('remember_me')}
                  />
                  <span className="text-sm text-slate-600">Remember me</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-primary hover:text-primary-dark transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

              <div className="flex items-center gap-2 pt-2 text-slate-500">
                <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs">Secure sign in</span>
              </div>
            </form>

            {/* Collapsible demo credentials */}
            <div className="mt-6 pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDemo(!showDemo)}
                className="w-full flex items-center justify-between text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                <span>Demo credentials</span>
                {showDemo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {showDemo && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-500 mb-2">For development and testing:</p>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <code className="px-2 py-1 bg-white rounded border border-slate-200 text-slate-700">
                      admin@aada.org.af
                    </code>
                    <span className="text-slate-300">/</span>
                    <code className="px-2 py-1 bg-white rounded border border-slate-200 text-slate-700">
                      password
                    </code>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} {branding?.name || 'AADA ERP Finance'}. All rights reserved.
        </p>
      </div>
    </div>
  )
}
