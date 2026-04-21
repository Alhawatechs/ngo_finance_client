'use client'

import { useOrganizationStore } from '@/stores/organizationStore'
import { Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReportHeaderProps {
  title: string
  subtitle?: string
  period?: string
  className?: string
  variant?: 'default' | 'print'
}

export function ReportHeader({ 
  title, 
  subtitle, 
  period, 
  className,
  variant = 'default' 
}: ReportHeaderProps) {
  const { branding, organization } = useOrganizationStore()
  
  const logoUrl = branding?.logo_url || organization?.logo_url
  const orgName = branding?.name || organization?.name || 'Organization'
  const orgTagline = organization?.tagline

  if (variant === 'print') {
    return (
      <div className={cn("print-header mb-6 pb-4 border-b-2 border-gray-300", className)}>
        <div className="flex items-start gap-4">
          {logoUrl ? (
            <div className="max-w-[200px] flex-shrink-0">
              <img 
                src={logoUrl} 
                alt={orgName} 
                className="max-h-16 w-auto object-contain"
              />
            </div>
          ) : (
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
          )}
          <div className="flex-1">
            {!logoUrl && <h1 className="text-xl font-bold text-gray-900">{orgName}</h1>}
            {orgTagline && (
              <p className="text-sm text-gray-500">{orgTagline}</p>
            )}
            <div className="mt-2">
              <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
              {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
              {period && <p className="text-sm text-gray-500 mt-1">{period}</p>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center justify-between pb-4 border-b border-gray-200 mb-6", className)}>
      <div className="flex items-center gap-4">
        {logoUrl ? (
          <div className="max-w-[160px] h-12 rounded-xl overflow-hidden bg-white border border-gray-100 flex items-center justify-center shadow-sm px-3">
            <img 
              src={logoUrl} 
              alt={orgName} 
              className="max-h-10 w-auto object-contain"
            />
          </div>
        ) : (
          <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
            <Building2 className="h-7 w-7 text-white" />
          </div>
        )}
        <div>
          <h1 className="text-lg font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          {period && (
            <p className="text-xs text-gray-400 mt-0.5">{period}</p>
          )}
        </div>
      </div>
      {!logoUrl && (
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-700">{orgName}</p>
          {orgTagline && (
            <p className="text-xs text-gray-400">{orgTagline}</p>
          )}
        </div>
      )}
    </div>
  )
}

// For PDF/Print output - styled for printing
export function PrintableReportHeader({ 
  title, 
  subtitle,
  period,
  generatedAt,
}: {
  title: string
  subtitle?: string
  period?: string
  generatedAt?: string
}) {
  const { branding, organization } = useOrganizationStore()
  
  const logoUrl = branding?.logo_url || organization?.logo_url
  const orgName = branding?.name || organization?.name || 'Organization'
  const address = organization?.address
  const city = organization?.city
  const country = organization?.country
  const phone = organization?.phone
  const email = organization?.email

  return (
    <div className="hidden print:block mb-8">
      <div className="flex items-start justify-between border-b-2 border-gray-800 pb-4">
        <div className="flex items-start gap-4">
          {logoUrl ? (
            <div className="max-w-[220px] flex-shrink-0">
              <img 
                src={logoUrl} 
                alt={orgName} 
                className="max-h-16 w-auto object-contain"
              />
            </div>
          ) : (
            <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
              <Building2 className="h-10 w-10 text-gray-500" />
            </div>
          )}
          <div>
            {!logoUrl && <h1 className="text-2xl font-bold text-gray-900">{orgName}</h1>}
            {address && <p className="text-sm text-gray-600">{address}</p>}
            {(city || country) && (
              <p className="text-sm text-gray-600">
                {[city, country].filter(Boolean).join(', ')}
              </p>
            )}
            {phone && <p className="text-sm text-gray-600">Tel: {phone}</p>}
            {email && <p className="text-sm text-gray-600">Email: {email}</p>}
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
          {period && <p className="text-sm font-medium text-gray-700 mt-1">{period}</p>}
          {generatedAt && (
            <p className="text-xs text-gray-500 mt-2">Generated: {generatedAt}</p>
          )}
        </div>
      </div>
    </div>
  )
}
