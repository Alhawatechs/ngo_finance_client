'use client'

import React, { useState, useEffect } from 'react'
import { useOrganizationStore } from '@/stores/organizationStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LogoEditor } from '@/components/ui/logo-editor'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import {
  Building2,
  Save,
  RefreshCw,
  Image as ImageIcon,
  Globe,
  Mail,
  MapPin,
  DollarSign,
  FileText,
  AlertCircle,
  Trash2,
  Users,
  Shield,
  Landmark,
  TrendingUp,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  AlertTriangle,
  X,
  Settings,
  Receipt,
  Calculator,
  FileCheck,
  Info,
  ChevronRight,
  Banknote,
  Lock,
  Database,
  Briefcase,
  Plus,
  PenLine,
  Wallet,
  CreditCard,
  FileDown,
  FileSpreadsheet,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  exportOrganizationToPdf,
  exportOrganizationToExcel,
  type OrganizationExportData,
} from '@/lib/organization-export'
import { Country, State, City } from 'country-state-city'
import { DEFAULT_SECTOR_OPTIONS } from '@/lib/organization-sectors'

// Enhanced Tab definitions for Finance System
const tabs = [
  { 
    id: 'profile', 
    label: 'Organization Profile', 
    icon: Building2,
    description: 'Basic info, sectors, geographic areas & operational metrics'
  },
  { 
    id: 'legal', 
    label: 'Legal, Compliance & Leadership', 
    icon: Shield,
    description: 'Registration, tax, and key personnel'
  },
  { 
    id: 'financial', 
    label: 'Financial Settings', 
    icon: Calculator,
    description: 'Currency, fiscal year, budgeting'
  },
  { 
    id: 'banking', 
    label: 'Banking & Payments', 
    icon: Landmark,
    description: 'Bank accounts and payment methods'
  },
  { 
    id: 'contact', 
    label: 'Contact & Address', 
    icon: MapPin,
    description: 'Location and contact details'
  },
  { 
    id: 'system', 
    label: 'System Preferences', 
    icon: Settings,
    description: 'Regional and display settings'
  },
]

const organizationTypes = [
  'Non-Governmental Organization (NGO)',
  'International NGO (INGO)',
  'Foundation',
  'Charity',
  'Non-Profit Corporation',
  'Community Based Organization (CBO)',
  'Civil Society Organization (CSO)',
  'Trust',
  'Association',
  'Private Company',
  'Government Entity',
  'Other',
]

export default function OrganizationSettingsPage() {
  const { 
    organization, 
    isLoading, 
    error,
    fetchOrganization, 
    updateOrganization, 
    uploadLogo, 
    removeLogo,
    uploadLicense,
    removeLicense,
    clearError,
  } = useOrganizationStore()

  const [activeTab, setActiveTab] = useState('profile')
  const [formData, setFormData] = useState<Record<string, any>>({
    // Basic Info
    name: '',
    short_name: '',
    registration_number: '',
    tagline: '',
    mission_statement: '',
    vision_statement: '',
    establishment_date: '',
    organization_type: '',
    
    // Financial Settings
    default_currency: 'USD',
    secondary_currencies: [],
    fiscal_year_start_month: 1,
    fiscal_year_end_month: 12,
    accounting_method: 'accrual',
    budget_control_level: 'warning',
    allow_negative_budgets: false,
    require_budget_check: true,
    default_tax_rate: 0,
    enable_multi_currency: true,
    exchange_rate_source: 'manual',
    cost_center_mandatory: false,
    project_mandatory: true,
    fund_mandatory: true,
    
    // Legal & Compliance
    tax_id: '',
    tax_exemption_number: '',
    tax_exemption_date: '',
    ngo_registration_body: '',
    registration_date: '',
    registration_expiry_date: '',
    legal_status: '',
    
    // Leadership
    executive_director: '',
    executive_director_email: '',
    board_chair: '',
    finance_director: '',
    finance_director_email: '',
    authorized_signatory_1: '',
    authorized_signatory_1_title: '',
    authorized_signatory_2: '',
    authorized_signatory_2_title: '',
    authorized_signatory_3: '',
    authorized_signatory_3_title: '',
    board_members: [] as { name: string; role?: string; email?: string; phone?: string }[],
    key_staff: [] as { name: string; role?: string; email?: string; phone?: string }[],

    // Address
    address: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: '',
    
    // Contact
    phone: '',
    secondary_phone: '',
    fax: '',
    email: '',
    secondary_email: '',
    website: '',
    
    // Social Media
    facebook_url: '',
    twitter_url: '',
    linkedin_url: '',
    instagram_url: '',
    youtube_url: '',
    
    // Operational
    sectors_of_operation: [],
    geographic_areas: [],
    staff_count: '',
    volunteer_count: '',
    beneficiaries_count: '',
    active_projects_count: '',
    
    // Banking
    primary_bank_name: '',
    primary_bank_branch: '',
    primary_bank_account: '',
    primary_bank_swift: '',
    primary_bank_iban: '',
    secondary_bank_name: '',
    secondary_bank_branch: '',
    secondary_bank_account: '',
    enable_online_banking: false,
    payment_methods: ['check', 'bank_transfer'],
    
    // Reporting & Audit
    external_auditor: '',
    last_audit_date: '',
    audit_opinion: '',
    statutory_reports: [],
    
    // System Settings
    timezone: 'Asia/Kabul',
    date_format: 'DD/MM/YYYY',
    number_format: '1,234.56',
    language: 'en',
    enable_notifications: true,
    enable_email_alerts: true,
    session_timeout: 30,
    require_password_change: 90,
    enable_two_factor: false,
    data_retention_years: 7,
  })

  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState<'pdf' | 'excel' | null>(null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isUploadingLicense, setIsUploadingLicense] = useState(false)
  const [previewLogo, setPreviewLogo] = useState<string | null>(null)
  const [newArea, setNewArea] = useState('')
  const [isLogoEditorOpen, setIsLogoEditorOpen] = useState(false)
  const [logoDeleteDialogOpen, setLogoDeleteDialogOpen] = useState(false)
  const licenseFileInputRef = React.useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchOrganization()
  }, [fetchOrganization])

  useEffect(() => {
    if (organization) {
      let boardMembers = organization.board_members ?? []
      let keyStaff = organization.key_staff ?? []
      if (boardMembers.length === 0 && organization.board_chair) {
        boardMembers = [{ name: organization.board_chair, role: 'Board Chair' }]
      }
      if (keyStaff.length === 0) {
        const entries: { name: string; role?: string; email?: string }[] = []
        if (organization.executive_director) {
          entries.push({
            name: organization.executive_director,
            role: 'Executive Director',
            email: organization.executive_director_email || undefined,
          })
        }
        if (organization.finance_director) {
          entries.push({
            name: organization.finance_director,
            role: 'Finance Director',
            email: organization.finance_director_email || undefined,
          })
        }
        if (entries.length) keyStaff = entries
      }
      setFormData({
        ...formData,
        ...organization,
        sectors_of_operation: organization.sectors_of_operation || [],
        geographic_areas: organization.geographic_areas || [],
        statutory_reports: organization.statutory_reports || [],
        secondary_currencies: organization.secondary_currencies || [],
        payment_methods: organization.payment_methods || ['check', 'bank_transfer'],
        board_members: boardMembers,
        key_staff: keyStaff,
      })
      setPreviewLogo(organization.logo_url || null)
    }
  }, [organization])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }))
  }

  const countries = React.useMemo(() => Country.getAllCountries(), [])
  const selectedCountryIso = countries.find(c => c.name === formData.country)?.isoCode ?? null
  const provinces = React.useMemo(
    () => (selectedCountryIso ? State.getStatesOfCountry(selectedCountryIso) : []),
    [selectedCountryIso]
  )
  const selectedStateIso = provinces.find(s => s.name === formData.state_province)?.isoCode ?? null
  const cities = React.useMemo(() => {
    if (!selectedCountryIso) return []
    if (selectedStateIso) {
      return City.getCitiesOfState(selectedCountryIso, selectedStateIso) || []
    }
    return City.getCitiesOfCountry(selectedCountryIso) || []
  }, [selectedCountryIso, selectedStateIso])
  const hasProvinces = provinces.length > 0
  const hasCities = cities.length > 0 && cities.length <= 1000

  const postalCodePlaceholders: Record<string, string> = {
    AF: 'e.g. 1001',
    US: 'e.g. 12345',
    GB: 'e.g. SW1A 1AA',
    CA: 'e.g. K1A 0B1',
    DE: 'e.g. 10115',
    FR: 'e.g. 75001',
    IN: 'e.g. 110001',
    AU: 'e.g. 2000',
    PK: 'e.g. 44000',
  }
  const postalCodePlaceholder = selectedCountryIso
    ? postalCodePlaceholders[selectedCountryIso] || 'Postal / ZIP code'
    : 'Select country first'

  const handleCountryChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      country: value || '',
      state_province: '',
      city: '',
    }))
  }

  const handleProvinceChange = (value: string) => {
    setFormData(prev => ({ ...prev, state_province: value || '', city: '' }))
  }

  const handleCityChange = (value: string) => {
    setFormData(prev => ({ ...prev, city: value || '' }))
  }

  const handleSave = async () => {
    // Mandatory: Organization Profile
    const name = (formData.name || '').trim()
    const shortName = (formData.short_name || '').trim()
    if (!name) {
      setActiveTab('profile')
      toast.error('Organization Name is required.')
      return
    }
    if (!shortName) {
      setActiveTab('profile')
      toast.error('Short Name / Abbreviation is required.')
      return
    }

    // Mandatory: at least one sector (as per license)
    const sectors = formData.sectors_of_operation || []
    if (!sectors.length) {
      setActiveTab('profile')
      toast.error('Select at least one sector (as per license). This field is required.')
      return
    }

    // Mandatory: Financial Settings
    if (!formData.default_currency || formData.default_currency.length !== 3) {
      setActiveTab('financial')
      toast.error('Base currency is required.')
      return
    }
    if (!formData.fiscal_year_start_month || formData.fiscal_year_start_month < 1 || formData.fiscal_year_start_month > 12) {
      setActiveTab('financial')
      toast.error('Fiscal Year Start Month is required.')
      return
    }

    // Mandatory: at least one contact (email or phone)
    const email = (formData.email || '').trim()
    const phone = (formData.phone || '').trim()
    if (!email && !phone) {
      setActiveTab('contact')
      toast.error('At least one of Primary Email or Primary Phone is required.')
      return
    }

    setIsSaving(true)
    const success = await updateOrganization(formData)
    setIsSaving(false)
    
    if (success) {
      toast.success('Organization settings saved successfully')
    } else {
      toast.error('Failed to save organization settings')
    }
  }

  const handleLogoSave = async (file: File) => {
    setIsUploadingLogo(true)
    const result = await uploadLogo(file)
    setIsUploadingLogo(false)

    if (result) {
      setPreviewLogo(result.logo_url)
      
      if (result.had_transparency === false) {
        toast.success('Logo saved! Background was made transparent automatically.', {
          description: result.dimensions 
            ? `Optimized to ${result.dimensions.width}x${result.dimensions.height}px`
            : undefined,
          duration: 5000,
        })
      } else if (result.had_transparency === true) {
        toast.success('Logo saved successfully!', {
          description: 'Image already had transparency.',
          duration: 3000,
        })
      } else {
        toast.success('Logo saved successfully!')
      }
    } else {
      setPreviewLogo(organization?.logo_url || null)
      toast.error('Failed to save logo')
    }
  }

  const handleRemoveLogo = async () => {
    setIsUploadingLogo(true)
    const success = await removeLogo()
    setIsUploadingLogo(false)

    if (success) {
      setPreviewLogo(null)
      toast.success('Logo removed successfully')
    } else {
      toast.error('Failed to remove logo')
    }
  }

  /** Resolve logo to base64 data URL for PDF (needed when logo is a blob/http URL). */
  const getLogoDataUrl = async (): Promise<string | null> => {
    const src = previewLogo || organization?.logo_url
    if (!src) return null
    if (src.startsWith('data:')) return src
    try {
      const res = await fetch(src, { mode: 'cors', credentials: 'omit' })
      const blob = await res.blob()
      return await new Promise<string | null>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(blob)
      })
    } catch {
      return null
    }
  }

  const buildExportData = (): OrganizationExportData => ({
    name: formData.name || '',
    short_name: formData.short_name || '',
    tagline: formData.tagline || undefined,
    registration_number: formData.registration_number || undefined,
    mission_statement: formData.mission_statement || undefined,
    vision_statement: formData.vision_statement || undefined,
    establishment_date: formData.establishment_date || undefined,
    organization_type: formData.organization_type || undefined,
    sectors_of_operation: formData.sectors_of_operation || undefined,
    geographic_areas: formData.geographic_areas || undefined,
    staff_count: formData.staff_count ?? undefined,
    volunteer_count: formData.volunteer_count ?? undefined,
    beneficiaries_count: formData.beneficiaries_count ?? undefined,
    active_projects_count: formData.active_projects_count ?? undefined,
    tax_id: formData.tax_id || undefined,
    tax_exemption_number: formData.tax_exemption_number || undefined,
    tax_exemption_date: formData.tax_exemption_date || undefined,
    ngo_registration_body: formData.ngo_registration_body || undefined,
    registration_date: formData.registration_date || undefined,
    registration_expiry_date: formData.registration_expiry_date || undefined,
    legal_status: formData.legal_status || undefined,
    board_members: formData.board_members?.filter((m: { name: string }) => m?.name?.trim()) || undefined,
    key_staff: formData.key_staff?.filter((m: { name: string }) => m?.name?.trim()) || undefined,
    authorized_signatory_1: formData.authorized_signatory_1 || undefined,
    authorized_signatory_1_title: formData.authorized_signatory_1_title || undefined,
    authorized_signatory_2: formData.authorized_signatory_2 || undefined,
    authorized_signatory_2_title: formData.authorized_signatory_2_title || undefined,
    authorized_signatory_3: formData.authorized_signatory_3 || undefined,
    authorized_signatory_3_title: formData.authorized_signatory_3_title || undefined,
    default_currency: formData.default_currency || undefined,
    fiscal_year_start_month: formData.fiscal_year_start_month ?? undefined,
    fiscal_year_end_month: formData.fiscal_year_end_month ?? undefined,
    accounting_method: formData.accounting_method || undefined,
    budget_control_level: formData.budget_control_level || undefined,
    default_tax_rate: formData.default_tax_rate ?? undefined,
    primary_bank_name: formData.primary_bank_name || undefined,
    primary_bank_branch: formData.primary_bank_branch || undefined,
    primary_bank_account: formData.primary_bank_account || undefined,
    primary_bank_swift: formData.primary_bank_swift || undefined,
    primary_bank_iban: formData.primary_bank_iban || undefined,
    secondary_bank_name: formData.secondary_bank_name || undefined,
    secondary_bank_branch: formData.secondary_bank_branch || undefined,
    secondary_bank_account: formData.secondary_bank_account || undefined,
    payment_methods: formData.payment_methods || undefined,
    enable_online_banking: formData.enable_online_banking ?? undefined,
    address: formData.address || undefined,
    city: formData.city || undefined,
    state_province: formData.state_province || undefined,
    postal_code: formData.postal_code || undefined,
    country: formData.country || undefined,
    phone: formData.phone || undefined,
    secondary_phone: formData.secondary_phone || undefined,
    fax: formData.fax || undefined,
    email: formData.email || undefined,
    secondary_email: formData.secondary_email || undefined,
    website: formData.website || undefined,
    facebook_url: formData.facebook_url || undefined,
    twitter_url: formData.twitter_url || undefined,
    linkedin_url: formData.linkedin_url || undefined,
    instagram_url: formData.instagram_url || undefined,
    youtube_url: formData.youtube_url || undefined,
    external_auditor: formData.external_auditor || undefined,
    last_audit_date: formData.last_audit_date || undefined,
    audit_opinion: formData.audit_opinion || undefined,
    timezone: formData.timezone || undefined,
    date_format: formData.date_format || undefined,
    number_format: formData.number_format || undefined,
    language: formData.language || undefined,
  })

  const handleExportPdf = async () => {
    setIsExporting('pdf')
    try {
      const logoDataUrl = await getLogoDataUrl()
      exportOrganizationToPdf(buildExportData(), {
        logoDataUrl,
        filename: `${(formData.short_name || formData.name || 'Organization').replace(/\s+/g, '_')}_Profile.pdf`,
      })
      toast.success('PDF downloaded')
    } catch (e) {
      toast.error('Failed to export PDF')
    } finally {
      setIsExporting(null)
    }
  }

  const handleExportExcel = async () => {
    setIsExporting('excel')
    try {
      exportOrganizationToExcel(buildExportData(), {
        filename: `${(formData.short_name || formData.name || 'Organization').replace(/\s+/g, '_')}_Profile.xlsx`,
      })
      toast.success('Excel downloaded')
    } catch (e) {
      toast.error('Failed to export Excel')
    } finally {
      setIsExporting(null)
    }
  }

  const addArea = () => {
    const areas = formData.geographic_areas ?? []
    if (newArea.trim() && !areas.includes(newArea.trim())) {
      setFormData(prev => ({
        ...prev,
        geographic_areas: [...(prev.geographic_areas ?? []), newArea.trim()]
      }))
      setNewArea('')
    }
  }

  const removeArea = (area: string) => {
    setFormData(prev => ({
      ...prev,
      geographic_areas: (prev.geographic_areas ?? []).filter((a: string) => a !== area)
    }))
  }

  type LeadershipEntry = { name: string; role?: string; email?: string; phone?: string }
  const boardMembers = formData.board_members ?? []
  const keyStaff = formData.key_staff ?? []

  const addBoardMember = () => {
    setFormData(prev => ({
      ...prev,
      board_members: [...(prev.board_members ?? []), { name: '', role: '' }],
    }))
  }
  const updateBoardMember = (index: number, field: keyof LeadershipEntry, value: string) => {
    setFormData(prev => ({
      ...prev,
      board_members: (prev.board_members ?? []).map((m: LeadershipEntry, i: number) => i === index ? { ...m, [field]: value } : m),
    }))
  }
  const removeBoardMember = (index: number) => {
    setFormData(prev => ({
      ...prev,
      board_members: (prev.board_members ?? []).filter((_: LeadershipEntry, i: number) => i !== index),
    }))
  }

  const addKeyStaff = () => {
    setFormData(prev => ({
      ...prev,
      key_staff: [...(prev.key_staff ?? []), { name: '', role: '' }],
    }))
  }
  const updateKeyStaff = (index: number, field: keyof LeadershipEntry, value: string) => {
    setFormData(prev => ({
      ...prev,
      key_staff: (prev.key_staff ?? []).map((m: LeadershipEntry, i: number) => i === index ? { ...m, [field]: value } : m),
    }))
  }
  const removeKeyStaff = (index: number) => {
    setFormData(prev => ({
      ...prev,
      key_staff: (prev.key_staff ?? []).filter((_: LeadershipEntry, i: number) => i !== index),
    }))
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'AFN', name: 'Afghan Afghani', symbol: '؋' },
    { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
    { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  ]

  const timezones = [
    { value: 'Asia/Kabul', label: 'Asia/Kabul (UTC+4:30)' },
    { value: 'Asia/Karachi', label: 'Asia/Karachi (UTC+5)' },
    { value: 'Asia/Dubai', label: 'Asia/Dubai (UTC+4)' },
    { value: 'Europe/London', label: 'Europe/London (UTC+0)' },
    { value: 'America/New_York', label: 'America/New_York (UTC-5)' },
    { value: 'UTC', label: 'UTC' },
  ]

  const dateFormats = [
    { value: 'DD/MM/YYYY', label: '31/12/2024' },
    { value: 'MM/DD/YYYY', label: '12/31/2024' },
    { value: 'YYYY-MM-DD', label: '2024-12-31' },
    { value: 'DD-MMM-YYYY', label: '31-Dec-2024' },
  ]

  if (isLoading && !organization) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid lg:grid-cols-4 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80 lg:col-span-3" />
        </div>
      </div>
    )
  }

  const isRegistrationExpiring = formData.registration_expiry_date && 
    new Date(formData.registration_expiry_date) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)

  const activeTabData = tabs.find(t => t.id === activeTab)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Settings className="h-6 w-6 text-primary-foreground" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Organization Setup</h1>
            <p className="text-sm text-gray-500">Configure your finance system settings and organization profile</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="h-10 px-4 rounded-lg"
            onClick={handleExportPdf}
            disabled={!!isExporting}
          >
            {isExporting === 'pdf' ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4 mr-2" />
            )}
            Export PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-10 px-4 rounded-lg"
            onClick={handleExportExcel}
            disabled={!!isExporting}
          >
            {isExporting === 'excel' ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 mr-2" />
            )}
            Export Excel
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-10 px-4 rounded-lg"
            onClick={() => fetchOrganization({ force: true })}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button 
            size="sm" 
            className="h-10 px-4 rounded-lg"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">{error}</span>
          <button onClick={clearError} className="ml-auto text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {isRegistrationExpiring && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700">
          <AlertTriangle className="h-5 w-5" />
          <span className="text-sm">
            <strong>Registration Expiring Soon:</strong> Your organization registration expires on {formData.registration_expiry_date}. Please renew it.
          </span>
        </div>
      )}

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="space-y-4">
          {/* Logo Card */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-gray-500" />
                Logo
              </h3>
              {previewLogo && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsLogoEditorOpen(true); }}
                    className="text-xs text-emerald-700 hover:text-emerald-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setLogoDeleteDialogOpen(true); }}
                    className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
                    title="Remove logo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              )}
            </div>
            
            <div 
              className={cn(
                "w-full h-20 rounded-xl border-2 flex items-center justify-center overflow-hidden cursor-pointer transition-all",
                previewLogo 
                  ? "border-gray-200 bg-white" 
                  : "border-dashed border-gray-300 bg-gray-50 hover:border-emerald-400 hover:bg-emerald-50"
              )}
              onClick={() => setIsLogoEditorOpen(true)}
            >
              {previewLogo ? (
                <img 
                  src={previewLogo} 
                  alt="Logo" 
                  className="max-w-full max-h-16 object-contain px-2"
                />
              ) : (
                <div className="text-center">
                  <Building2 className="h-6 w-6 text-gray-300 mx-auto" />
                  <p className="text-xs text-gray-400 mt-1">Upload logo</p>
                </div>
              )}
            </div>
          </div>

          {/* Logo delete confirmation */}
          <AlertDialog open={logoDeleteDialogOpen} onOpenChange={(open) => { if (open !== logoDeleteDialogOpen) setLogoDeleteDialogOpen(open) }}>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove logo?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove the organization logo. You can upload a new one at any time.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={async () => {
                    setLogoDeleteDialogOpen(false)
                    await handleRemoveLogo()
                  }}
                >
                  Remove logo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Navigation Tabs */}
          <div className="card p-2">
            <nav className="space-y-0.5">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group",
                      isActive
                        ? "bg-emerald-50 text-emerald-900"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        isActive ? "text-primary" : "text-gray-700"
                      )}>
                        {tab.label}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{tab.description}</p>
                    </div>
                    <ChevronRight className={cn(
                      "h-4 w-4 transition-transform",
                      isActive ? "text-emerald-700" : "text-gray-300"
                    )} />
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Quick Stats */}
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Quick Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Fiscal Year</span>
                <span className="font-medium">{months[formData.fiscal_year_start_month - 1]?.slice(0, 3)} - {months[formData.fiscal_year_end_month - 1]?.slice(0, 3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Currency</span>
                <span className="font-medium">{formData.default_currency}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="card">
            {/* Tab Header */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                {activeTabData && (
                  <>
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <activeTabData.icon className="h-5 w-5 text-emerald-800" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{activeTabData.label}</h2>
                      <p className="text-sm text-gray-500">{activeTabData.description}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label required>Organization Name</Label>
                      <Input 
                        name="name" 
                        value={formData.name} 
                        onChange={handleInputChange} 
                        className="mt-1.5"
                        placeholder="Full legal name of the organization"
                      />
                    </div>
                    <div>
                      <Label required>Short Name / Abbreviation</Label>
                      <Input 
                        name="short_name" 
                        value={formData.short_name} 
                        onChange={handleInputChange} 
                        className="mt-1.5" 
                        placeholder="e.g., UNICEF, WHO"
                      />
                      <p className="text-xs text-gray-400 mt-1">Used in reports and system displays</p>
                    </div>
                  </div>

                  <div>
                    <Label>Tagline / Motto</Label>
                    <Input 
                      name="tagline" 
                      value={formData.tagline} 
                      onChange={handleInputChange} 
                      className="mt-1.5"
                      placeholder="Organization's slogan or motto"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label>Organization Type</Label>
                      <select 
                        name="organization_type" 
                        value={formData.organization_type ?? ''} 
                        onChange={handleInputChange}
                        className="form-select mt-1.5"
                      >
                        <option value="">Select type...</option>
                        {organizationTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Establishment Date</Label>
                      <DatePicker
                        value={formData.establishment_date ?? ''}
                        onChange={(v) => setFormData(prev => ({ ...prev, establishment_date: v }))}
                        className="mt-1.5"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Mission Statement</Label>
                    <textarea 
                      name="mission_statement" 
                      value={formData.mission_statement ?? ''} 
                      onChange={handleInputChange}
                      className="form-control mt-1.5"
                      rows={3}
                      placeholder="Describe the organization's mission..."
                    />
                  </div>

                  <div>
                    <Label>Vision Statement</Label>
                    <textarea 
                      name="vision_statement" 
                      value={formData.vision_statement ?? ''} 
                      onChange={handleInputChange}
                      className="form-control mt-1.5"
                      rows={3}
                      placeholder="Describe the organization's vision..."
                    />
                  </div>

                  {/* Sectors (as per license) - compact, mandatory */}
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-emerald-700 flex-shrink-0" />
                      <span className="text-sm font-semibold text-gray-900">Sectors (as per license)</span>
                      <span className="text-red-500 ml-0.5 align-top text-xs font-bold">*</span>
                      <span className="text-xs text-gray-400">— licensed to work in</span>
                    </div>
                    {(formData.sectors_of_operation?.length ?? 0) === 0 && (
                      <p className="text-xs text-red-500 mb-1.5">Select at least one sector (required)</p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(formData.sectors_of_operation || []).map((sector: string) => (
                        <span
                          key={sector}
                          className="inline-flex items-center gap-1 py-0.5 pl-2 pr-1 rounded-md bg-emerald-50 text-emerald-900 text-xs font-medium border border-emerald-100"
                        >
                          {sector}
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              sectors_of_operation: (prev.sectors_of_operation || []).filter((s: string) => s !== sector),
                            }))}
                            className="p-0.5 rounded hover:bg-emerald-200/50 text-emerald-700"
                            aria-label={`Remove ${sector}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      <select
                        value=""
                        onChange={(e) => {
                          const v = e.target.value
                          if (!v) return
                          const current = formData.sectors_of_operation || []
                          if (!current.includes(v)) {
                            setFormData(prev => ({ ...prev, sectors_of_operation: [...(prev.sectors_of_operation || []), v] }))
                          }
                          e.target.value = ''
                        }}
                        className="h-6 min-w-[100px] text-xs rounded border border-gray-200 bg-white text-gray-600 focus:border-slate-400 focus:ring-0.5 focus:ring-ring py-0 pr-6 pl-2"
                      >
                        <option value="">+ Add sector</option>
                        {DEFAULT_SECTOR_OPTIONS.filter(s => !(formData.sectors_of_operation || []).includes(s)).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Geographic areas & operational metrics — enhanced */}
                  <div className="pt-6 border-t border-border space-y-6">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <MapPin className="h-4 w-4 text-emerald-600" />
                      Geographic areas of operation
                    </div>
                    <p className="text-xs text-muted-foreground -mt-2">Provinces, regions, or countries where the organization operates.</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {(formData.geographic_areas ?? []).map((area: string) => (
                        <span
                          key={area}
                          className="inline-flex items-center gap-1 py-0.5 pl-2.5 pr-1 rounded-md bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-800/50 dark:text-emerald-200"
                        >
                          {area}
                          <button
                            type="button"
                            onClick={() => removeArea(area)}
                            className="p-0.5 rounded hover:bg-emerald-200/50 text-emerald-600 dark:hover:bg-emerald-700/50"
                            aria-label={`Remove ${area}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      <div className="flex gap-2 flex-1 min-w-[200px]">
                        <Input
                          value={newArea}
                          onChange={(e) => setNewArea(e.target.value)}
                          placeholder="Province, region, or country..."
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addArea())}
                          className="h-8 text-sm"
                        />
                        <Button type="button" variant="outline" size="sm" onClick={addArea} disabled={!newArea.trim()}>
                          Add
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground pt-2">
                      <TrendingUp className="h-4 w-4 text-violet-600" />
                      Operational metrics
                    </div>
                    <p className="text-xs text-muted-foreground -mt-2">Optional counts for reporting and donor communications.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Staff count</Label>
                        <Input
                          type="number"
                          name="staff_count"
                          value={formData.staff_count ?? ''}
                          onChange={handleInputChange}
                          className="h-9 bg-muted/30"
                          min={0}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Volunteer count</Label>
                        <Input
                          type="number"
                          name="volunteer_count"
                          value={formData.volunteer_count ?? ''}
                          onChange={handleInputChange}
                          className="h-9 bg-muted/30"
                          min={0}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Beneficiaries reached</Label>
                        <Input
                          type="number"
                          name="beneficiaries_count"
                          value={formData.beneficiaries_count ?? ''}
                          onChange={handleInputChange}
                          className="h-9 bg-muted/30"
                          min={0}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Active projects</Label>
                        <Input
                          type="number"
                          name="active_projects_count"
                          value={formData.active_projects_count ?? ''}
                          onChange={handleInputChange}
                          className="h-9 bg-muted/30"
                          min={0}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Financial Settings Tab — enhanced design */}
              {activeTab === 'financial' && (
                <div className="space-y-6">
                  <p className="text-sm text-muted-foreground">
                    Base currency, fiscal year, accounting basis, and budget rules. These settings apply across transactions and reporting.
                  </p>

                  {/* Base Currency & Fiscal Year */}
                  <Card className="border-l-4 border-l-emerald-600/80 shadow-sm">
                    <CardHeader className="pb-3 pt-5 px-5">
                      <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/10">
                          <DollarSign className="h-4 w-4 text-emerald-600" />
                        </span>
                        Base currency & fiscal year
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">Base currency applies across the finance system (General Ledger, vouchers, budgets). When multi-currency is enabled, other currencies can be used in transactions; otherwise only the base currency is permitted.</p>
                    </CardHeader>
                    <CardContent className="px-5 pb-5 pt-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground" required>Base currency</Label>
                          <select
                            name="default_currency"
                            value={formData.default_currency ?? ''}
                            onChange={handleInputChange}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-0.5 focus-visible:ring-ring"
                          >
                            {currencies.map(c => (
                              <option key={c.code} value={c.code}>{c.code} — {c.symbol}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-end pb-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              name="enable_multi_currency"
                              checked={formData.enable_multi_currency}
                              onChange={handleInputChange}
                              className="h-4 w-4 rounded border-input"
                            />
                            <span className="text-sm text-muted-foreground">Multi-currency</span>
                          </label>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground" required>Fiscal year start</Label>
                          <select
                            name="fiscal_year_start_month"
                            value={formData.fiscal_year_start_month ?? ''}
                            onChange={handleInputChange}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-0.5 focus-visible:ring-ring"
                          >
                            {months.map((month, i) => (
                              <option key={i} value={i + 1}>{month}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">Fiscal year end</Label>
                          <select
                            name="fiscal_year_end_month"
                            value={formData.fiscal_year_end_month ?? ''}
                            onChange={handleInputChange}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-0.5 focus-visible:ring-ring"
                          >
                            {months.map((month, i) => (
                              <option key={i} value={i + 1}>{month}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Accounting, tax & budget */}
                  <Card className="border-l-4 border-l-primary/80 shadow-sm">
                    <CardHeader className="pb-3 pt-5 px-5">
                      <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <Calculator className="h-4 w-4 text-emerald-700" />
                        </span>
                        Accounting, tax & budget
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">Basis of accounting, default tax rate, and budget control behavior.</p>
                    </CardHeader>
                    <CardContent className="px-5 pb-5 pt-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">Accounting basis</Label>
                          <select
                            name="accounting_method"
                            value={formData.accounting_method ?? ''}
                            onChange={handleInputChange}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-0.5 focus-visible:ring-ring"
                          >
                            <option value="accrual">Accrual</option>
                            <option value="cash">Cash</option>
                            <option value="modified_cash">Modified Cash</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">Default tax (%)</Label>
                          <Input
                            type="number"
                            name="default_tax_rate"
                            value={formData.default_tax_rate}
                            onChange={handleInputChange}
                            className="h-9 text-sm"
                            min={0}
                            max={100}
                            step={0.01}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">Budget control</Label>
                          <select
                            name="budget_control_level"
                            value={formData.budget_control_level ?? ''}
                            onChange={handleInputChange}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-0.5 focus-visible:ring-ring"
                          >
                            <option value="none">None</option>
                            <option value="warning">Warning only</option>
                            <option value="block">Block over budget</option>
                          </select>
                        </div>
                        <div className="flex flex-wrap items-end gap-4 pb-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="require_budget_check" checked={formData.require_budget_check} onChange={handleInputChange} className="h-4 w-4 rounded border-input" />
                            <span className="text-xs text-muted-foreground">Check before post</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="allow_negative_budgets" checked={formData.allow_negative_budgets} onChange={handleInputChange} className="h-4 w-4 rounded border-input" />
                            <span className="text-xs text-muted-foreground">Allow negative</span>
                          </label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Mandatory on transactions */}
                  <Card className="border-l-4 border-l-slate-600/80 shadow-sm">
                    <CardHeader className="pb-2 pt-4 px-5">
                      <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-600/10">
                          <Database className="h-4 w-4 text-slate-600" />
                        </span>
                        Mandatory on transactions
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">Require these dimensions when posting journal entries or vouchers.</p>
                    </CardHeader>
                    <CardContent className="px-5 pb-5 pt-0">
                      <div className="flex flex-wrap items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" name="project_mandatory" checked={formData.project_mandatory} onChange={handleInputChange} className="h-4 w-4 rounded border-input" />
                          <span className="text-sm text-foreground">Project</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" name="fund_mandatory" checked={formData.fund_mandatory} onChange={handleInputChange} className="h-4 w-4 rounded border-input" />
                          <span className="text-sm text-foreground">Fund</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" name="cost_center_mandatory" checked={formData.cost_center_mandatory} onChange={handleInputChange} className="h-4 w-4 rounded border-input" />
                          <span className="text-sm text-foreground">Cost center</span>
                        </label>
                      </div>
                    </CardContent>
                  </Card>

                  <p className="text-xs text-muted-foreground border-t border-border pt-4 flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    Base currency is used for all transactions unless multi-currency is enabled. Fiscal year defines your reporting period. Accrual = record when earned/incurred; Cash = when money moves.
                  </p>
                </div>
              )}

              {/* Approval Workflow is under Administration > Approval Workflow */}

              {/* Banking Tab — enhanced design */}
              {activeTab === 'banking' && (
                <div className="space-y-6">
                  <p className="text-sm text-muted-foreground">
                    Bank accounts, payment channels, and online banking. Configure primary and secondary accounts and choose which payment methods are allowed for vouchers and payments.
                  </p>

                  {/* Primary Bank Account */}
                  <Card className="border-l-4 border-l-emerald-600/80 shadow-sm">
                    <CardHeader className="pb-3 pt-5 px-5">
                      <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/10">
                          <Landmark className="h-4 w-4 text-emerald-600" />
                        </span>
                        Primary Bank Account
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">Main operating account for receipts and payments. SWIFT/BIC and IBAN used for international transfers.</p>
                    </CardHeader>
                    <CardContent className="px-5 pb-5 pt-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">Bank name</Label>
                          <Input
                            name="primary_bank_name"
                            value={formData.primary_bank_name}
                            onChange={handleInputChange}
                            className="h-9 bg-muted/30"
                            placeholder="e.g., Afghanistan International Bank"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">Branch</Label>
                          <Input
                            name="primary_bank_branch"
                            value={formData.primary_bank_branch}
                            onChange={handleInputChange}
                            className="h-9 bg-muted/30"
                            placeholder="Branch name or code"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">Account number</Label>
                          <Input
                            name="primary_bank_account"
                            value={formData.primary_bank_account}
                            onChange={handleInputChange}
                            className="h-9 bg-muted/30"
                            placeholder="Account number"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">SWIFT / BIC</Label>
                          <Input
                            name="primary_bank_swift"
                            value={formData.primary_bank_swift}
                            onChange={handleInputChange}
                            className="h-9 bg-muted/30"
                            placeholder="e.g., AIKIAFKA"
                          />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-xs font-medium text-muted-foreground">IBAN</Label>
                          <Input
                            name="primary_bank_iban"
                            value={formData.primary_bank_iban}
                            onChange={handleInputChange}
                            className="h-9 bg-muted/30"
                            placeholder="International Bank Account Number"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Secondary Bank Account */}
                  <Card className="border-l-4 border-l-slate-600/80 shadow-sm">
                    <CardHeader className="pb-3 pt-5 px-5">
                      <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-600/10">
                          <Banknote className="h-4 w-4 text-slate-600" />
                        </span>
                        Secondary Bank Account
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">Optional second account for project-specific or reserve funds.</p>
                    </CardHeader>
                    <CardContent className="px-5 pb-5 pt-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">Bank name</Label>
                          <Input
                            name="secondary_bank_name"
                            value={formData.secondary_bank_name}
                            onChange={handleInputChange}
                            className="h-9 bg-muted/30"
                            placeholder="Bank name"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">Branch</Label>
                          <Input
                            name="secondary_bank_branch"
                            value={formData.secondary_bank_branch}
                            onChange={handleInputChange}
                            className="h-9 bg-muted/30"
                            placeholder="Branch"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">Account number</Label>
                          <Input
                            name="secondary_bank_account"
                            value={formData.secondary_bank_account}
                            onChange={handleInputChange}
                            className="h-9 bg-muted/30"
                            placeholder="Account number"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Online Banking */}
                  <Card className="border-l-4 border-l-primary/80 shadow-sm">
                    <CardHeader className="pb-3 pt-5 px-5">
                      <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <CreditCard className="h-4 w-4 text-emerald-700" />
                        </span>
                        Online Banking
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">Enable integration and visibility for online banking channels.</p>
                    </CardHeader>
                    <CardContent className="px-5 pb-5 pt-0">
                      <label className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/20 cursor-pointer transition-colors max-w-md">
                        <input
                          type="checkbox"
                          name="enable_online_banking"
                          checked={formData.enable_online_banking}
                          onChange={handleInputChange}
                          className="mt-1 h-4 w-4 rounded border-input"
                        />
                        <div>
                          <span className="text-sm font-medium text-foreground">Enable online banking</span>
                          <p className="text-xs text-muted-foreground mt-0.5">Use online banking feeds or API for reconciliation and balance checks.</p>
                        </div>
                      </label>
                    </CardContent>
                  </Card>

                  {/* Payment Methods */}
                  <Card className="border-l-4 border-l-violet-600/80 shadow-sm">
                    <CardHeader className="pb-3 pt-5 px-5">
                      <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600/10">
                          <Wallet className="h-4 w-4 text-violet-600" />
                        </span>
                        Payment Methods
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">Select which payment methods are available for vouchers and payments. At least one is required.</p>
                    </CardHeader>
                    <CardContent className="px-5 pb-5 pt-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                        {[
                          { id: 'bank_transfer', label: 'Bank Transfer', desc: 'Wire, ACH, SEPA' },
                          { id: 'check', label: 'Check / Cheque', desc: 'Paper or e-cheque' },
                          { id: 'cash', label: 'Cash', desc: 'Physical currency' },
                          { id: 'mobile_money', label: 'Mobile Money', desc: 'Mobile wallet, M-Pesa' },
                          { id: 'msp', label: 'MSP', desc: 'Money Service Provider' },
                        ].map(method => (
                          <label
                            key={method.id}
                            className={cn(
                              'flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200',
                              formData.payment_methods?.includes(method.id)
                                ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30 dark:border-violet-500'
                                : 'border-border bg-card hover:bg-muted/20 hover:border-muted-foreground/30'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={formData.payment_methods?.includes(method.id)}
                              onChange={(e) => {
                                const methods = formData.payment_methods || []
                                if (e.target.checked) {
                                  setFormData(prev => ({ ...prev, payment_methods: [...methods, method.id] }))
                                } else {
                                  setFormData(prev => ({ ...prev, payment_methods: methods.filter((m: string) => m !== method.id) }))
                                }
                              }}
                              className="mt-0.5 h-4 w-4 rounded border-input text-violet-600 focus:ring-0.5 focus:ring-violet-500"
                            />
                            <div className="min-w-0">
                              <span className="text-sm font-medium text-foreground block">{method.label}</span>
                              <span className="text-xs text-muted-foreground">{method.desc}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5 shrink-0" />
                        MSP (Money Service Provider) includes hawala, remittance agents, and licensed transfer services.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Legal, Compliance & Leadership — enhanced design */}
              {activeTab === 'legal' && (
                <div className="space-y-8">
                  <p className="text-sm text-muted-foreground">
                    Registration, tax, legal status, and governance. Board members, key staff, and authorized signatories for official documents.
                  </p>

                  {/* Legal & compliance */}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      Legal & compliance
                    </h3>
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      <Card className="border-l-4 border-l-primary/80 shadow-sm">
                        <CardHeader className="pb-3 pt-5 px-5">
                          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                              <FileCheck className="h-4 w-4 text-emerald-700" />
                            </span>
                            Registration
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">Official registration with government or regulator</p>
                        </CardHeader>
                        <CardContent className="px-5 pb-5 pt-0 space-y-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">Registration number</Label>
                            <Input name="registration_number" value={formData.registration_number} onChange={handleInputChange} className="h-9 bg-muted/30" placeholder="Official registration number" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">Registration body</Label>
                            <Input name="ngo_registration_body" value={formData.ngo_registration_body} onChange={handleInputChange} className="h-9 bg-muted/30" placeholder="e.g., Ministry of Economy" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-muted-foreground">Valid from</Label>
                              <DatePicker value={formData.registration_date ?? ''} onChange={(v) => setFormData(prev => ({ ...prev, registration_date: v }))} inputClassName="h-9 bg-muted/30" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-muted-foreground">Expiry date</Label>
                              <DatePicker value={formData.registration_expiry_date ?? ''} onChange={(v) => setFormData(prev => ({ ...prev, registration_expiry_date: v }))} inputClassName="h-9 bg-muted/30" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-l-4 border-l-slate-600/80 shadow-sm">
                        <CardHeader className="pb-3 pt-5 px-5">
                          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-600/10">
                              <Receipt className="h-4 w-4 text-slate-600" />
                            </span>
                            Tax
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">Tax ID and exemption details</p>
                        </CardHeader>
                        <CardContent className="px-5 pb-5 pt-0 space-y-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">Tax ID / TIN</Label>
                            <Input name="tax_id" value={formData.tax_id} onChange={handleInputChange} className="h-9 bg-muted/30" placeholder="Tax identification number" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">Tax exemption number</Label>
                            <Input name="tax_exemption_number" value={formData.tax_exemption_number} onChange={handleInputChange} className="h-9 bg-muted/30" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">Exemption date</Label>
                            <DatePicker value={formData.tax_exemption_date ?? ''} onChange={(v) => setFormData(prev => ({ ...prev, tax_exemption_date: v }))} inputClassName="h-9 bg-muted/30" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">Legal status</Label>
                            <Input name="legal_status" value={formData.legal_status} onChange={handleInputChange} className="h-9 bg-muted/30" placeholder="e.g., Active, Registered" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-l-4 border-l-amber-600/80 shadow-sm">
                        <CardHeader className="pb-3 pt-5 px-5">
                          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-600/10">
                              <FileText className="h-4 w-4 text-amber-600" />
                            </span>
                            Organization License
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">Attach your official license document (PDF, Word, or image).</p>
                        </CardHeader>
                        <CardContent className="px-5 pb-5 pt-0 space-y-4">
                          <input
                            ref={licenseFileInputRef}
                            type="file"
                            accept=".pdf,.doc,.docx,image/jpeg,image/jpg,image/png"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              setIsUploadingLicense(true)
                              const result = await uploadLicense(file)
                              setIsUploadingLicense(false)
                              e.target.value = ''
                              if (result.success) toast.success('License uploaded successfully')
                              else toast.error(result.message || 'Failed to upload license')
                            }}
                          />
                          {organization?.license_url ? (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border">
                                <FileText className="h-5 w-5 text-amber-600 shrink-0" />
                                <span className="text-sm font-medium text-foreground">License attached</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5"
                                  onClick={() => window.open(organization.license_url!, '_blank', 'noopener')}
                                >
                                  View license
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  disabled={isUploadingLicense}
                                  onClick={async () => {
                                    const ok = await removeLicense()
                                    if (ok) toast.success('License removed')
                                    else toast.error('Failed to remove license')
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Remove
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full gap-2"
                              disabled={isUploadingLicense}
                              onClick={() => licenseFileInputRef.current?.click()}
                            >
                              {isUploadingLicense ? 'Uploading…' : 'Upload license'}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Leadership & governance */}
                  <div className="pt-2 border-t border-border/60">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      Leadership & governance
                    </h3>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Card className="border-l-4 border-l-emerald-600/80 shadow-sm">
                        <CardHeader className="pb-3 pt-5 px-5 flex flex-row items-start justify-between gap-4">
                          <div>
                            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600/10">
                                <Users className="h-4 w-4 text-emerald-600" />
                              </span>
                              Board of Directors
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">Governing body members</p>
                          </div>
                          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 shrink-0" onClick={addBoardMember}>
                            <Plus className="h-3.5 w-3.5" /> Add member
                          </Button>
                        </CardHeader>
                        <CardContent className="px-5 pb-5 pt-0">
                          {boardMembers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/20 py-8 px-4 text-center">
                              <Users className="h-10 w-10 text-muted-foreground/50 mb-2" />
                              <p className="text-sm font-medium text-muted-foreground">No board members</p>
                              <p className="text-xs text-muted-foreground mt-0.5">Add members of your governing body.</p>
                              <Button type="button" variant="secondary" size="sm" className="mt-3 gap-1.5" onClick={addBoardMember}>
                                <Plus className="h-3.5 w-3.5" /> Add member
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {boardMembers.map((member: LeadershipEntry, index: number) => (
                                <div key={index} className={cn('rounded-lg border bg-card p-4 space-y-3', index > 0 && 'border-t')}>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Member {index + 1}</span>
                                    <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => removeBoardMember(index)} aria-label="Remove member">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">Full name</Label>
                                      <Input className="h-9" placeholder="Full name" value={member.name} onChange={e => updateBoardMember(index, 'name', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">Role / title</Label>
                                      <Input className="h-9" placeholder="e.g., Chair, Treasurer" value={member.role ?? ''} onChange={e => updateBoardMember(index, 'role', e.target.value)} />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">Email</Label>
                                      <Input type="email" className="h-9" placeholder="email@example.com" value={member.email ?? ''} onChange={e => updateBoardMember(index, 'email', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">Phone</Label>
                                      <Input className="h-9" placeholder="+123 456 7890" value={member.phone ?? ''} onChange={e => updateBoardMember(index, 'phone', e.target.value)} />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      <Card className="border-l-4 border-l-amber-600/80 shadow-sm">
                        <CardHeader className="pb-3 pt-5 px-5 flex flex-row items-start justify-between gap-4">
                          <div>
                            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-600/10">
                                <Briefcase className="h-4 w-4 text-amber-600" />
                              </span>
                              Key Staff
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">Senior management and key personnel</p>
                          </div>
                          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 shrink-0" onClick={addKeyStaff}>
                            <Plus className="h-3.5 w-3.5" /> Add staff
                          </Button>
                        </CardHeader>
                        <CardContent className="px-5 pb-5 pt-0">
                          {keyStaff.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/20 py-8 px-4 text-center">
                              <Briefcase className="h-10 w-10 text-muted-foreground/50 mb-2" />
                              <p className="text-sm font-medium text-muted-foreground">No key staff</p>
                              <p className="text-xs text-muted-foreground mt-0.5">Add executive director, finance director, and other key roles.</p>
                              <Button type="button" variant="secondary" size="sm" className="mt-3 gap-1.5" onClick={addKeyStaff}>
                                <Plus className="h-3.5 w-3.5" /> Add staff
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {keyStaff.map((staff: LeadershipEntry, index: number) => (
                                <div key={index} className={cn('rounded-lg border bg-card p-4 space-y-3', index > 0 && 'border-t')}>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Staff {index + 1}</span>
                                    <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => removeKeyStaff(index)} aria-label="Remove staff">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">Full name</Label>
                                      <Input className="h-9" placeholder="Full name" value={staff.name} onChange={e => updateKeyStaff(index, 'name', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">Role / title</Label>
                                      <Input className="h-9" placeholder="e.g., Executive Director" value={staff.role ?? ''} onChange={e => updateKeyStaff(index, 'role', e.target.value)} />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">Email</Label>
                                      <Input type="email" className="h-9" placeholder="email@example.com" value={staff.email ?? ''} onChange={e => updateKeyStaff(index, 'email', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">Phone</Label>
                                      <Input className="h-9" placeholder="+123 456 7890" value={staff.phone ?? ''} onChange={e => updateKeyStaff(index, 'phone', e.target.value)} />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Authorized signatories — compact */}
                    <Card className="mt-5 border-l-4 border-l-violet-600/80 shadow-sm overflow-hidden">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600/10 border border-violet-200/50">
                            <PenLine className="h-4 w-4 text-violet-600" />
                          </span>
                          <div>
                            <CardTitle className="text-sm font-semibold text-foreground">Authorized signatories</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">Sign official documents and financial instruments.</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 pt-0">
                        <div className="space-y-2">
                          {[1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2.5 hover:border-violet-200/50 transition-colors"
                            >
                              <div className="grid sm:grid-cols-2 gap-2 sm:gap-3">
                                <div className="space-y-1">
                                  <Label className="text-[11px] font-medium text-muted-foreground">Signatory {i} — Name</Label>
                                  <Input
                                    name={`authorized_signatory_${i}`}
                                    value={formData[`authorized_signatory_${i}`] || ''}
                                    onChange={handleInputChange}
                                    className="h-8 text-sm bg-background/80 border-border"
                                    placeholder="Full name"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[11px] font-medium text-muted-foreground">Title</Label>
                                  <Input
                                    name={`authorized_signatory_${i}_title`}
                                    value={formData[`authorized_signatory_${i}_title`] || ''}
                                    onChange={handleInputChange}
                                    className="h-8 text-sm bg-background/80 border-border"
                                    placeholder="e.g., Executive Director"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                          <FileText className="h-3 w-3 shrink-0" />
                          Shown on vouchers, contracts, and reports.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Contact Tab */}
              {activeTab === 'contact' && (
                <div className="space-y-6">
                  <div>
                    <Label>Address</Label>
                    <Input 
                      name="address" 
                      value={formData.address} 
                      onChange={handleInputChange} 
                      className="mt-1.5"
                      placeholder="Street address"
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label>Country</Label>
                      <Select
                        value={formData.country || undefined}
                        onValueChange={handleCountryChange}
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {formData.country && !countries.some((c) => c.name === formData.country) && (
                            <SelectItem value={formData.country}>{formData.country}</SelectItem>
                          )}
                          {countries.map((c) => (
                            <SelectItem key={c.isoCode} value={c.name}>
                              {c.flag ? `${c.flag} ` : ''}{c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>State / Province</Label>
                      {hasProvinces ? (
                        <Select
                          value={formData.state_province || undefined}
                          onValueChange={handleProvinceChange}
                        >
                          <SelectTrigger className="mt-1.5">
                            <SelectValue placeholder="Select province" />
                          </SelectTrigger>
                          <SelectContent>
                            {formData.state_province && !provinces.some((s) => s.name === formData.state_province) && (
                              <SelectItem value={formData.state_province}>{formData.state_province}</SelectItem>
                            )}
                            {provinces.map((s) => (
                              <SelectItem key={s.isoCode} value={s.name}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input 
                          name="state_province" 
                          value={formData.state_province} 
                          onChange={handleInputChange} 
                          className="mt-1.5"
                          placeholder={formData.country ? 'No provinces available' : 'Select country first'}
                        />
                      )}
                    </div>
                    <div>
                      <Label>City / Place</Label>
                      {hasCities ? (
                        <Select
                          value={formData.city || undefined}
                          onValueChange={handleCityChange}
                        >
                          <SelectTrigger className="mt-1.5">
                            <SelectValue placeholder="Select city" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {formData.city && !cities.some((ct) => ct.name === formData.city) && (
                              <SelectItem value={formData.city}>{formData.city}</SelectItem>
                            )}
                            {cities.map((ct, i) => (
                              <SelectItem key={`${ct.name}-${ct.stateCode}-${i}`} value={ct.name}>
                                {ct.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input 
                          name="city" 
                          value={formData.city} 
                          onChange={handleInputChange} 
                          className="mt-1.5"
                          placeholder={formData.country ? 'Type city name' : 'Select country first'}
                        />
                      )}
                    </div>
                    <div>
                      <Label>Postal Code</Label>
                      <Input 
                        name="postal_code" 
                        value={formData.postal_code} 
                        onChange={handleInputChange} 
                        className="mt-1.5"
                        placeholder={postalCodePlaceholder}
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Contact Information</h3>
                    <p className="text-xs text-muted-foreground mb-4">At least one of Primary Phone or Primary Email is required.</p>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label required>Primary Phone</Label>
                        <Input 
                          name="phone" 
                          value={formData.phone} 
                          onChange={handleInputChange} 
                          className="mt-1.5"
                          placeholder="+93 20 123 4567"
                        />
                      </div>
                      <div>
                        <Label>Secondary Phone</Label>
                        <Input 
                          name="secondary_phone" 
                          value={formData.secondary_phone} 
                          onChange={handleInputChange} 
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label required>Primary Email</Label>
                        <Input 
                          type="email"
                          name="email" 
                          value={formData.email} 
                          onChange={handleInputChange} 
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label>Secondary Email</Label>
                        <Input 
                          type="email"
                          name="secondary_email" 
                          value={formData.secondary_email} 
                          onChange={handleInputChange} 
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label>Website</Label>
                        <Input 
                          name="website" 
                          value={formData.website} 
                          onChange={handleInputChange} 
                          className="mt-1.5"
                          placeholder="https://www.example.org"
                        />
                      </div>
                      <div>
                        <Label>Fax</Label>
                        <Input 
                          name="fax" 
                          value={formData.fax} 
                          onChange={handleInputChange} 
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Social Media */}
                  <div className="pt-6 border-t border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Social Media</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Facebook className="h-5 w-5 text-emerald-700" />
                        <Input 
                          name="facebook_url" 
                          value={formData.facebook_url} 
                          onChange={handleInputChange}
                          placeholder="Facebook URL"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Twitter className="h-5 w-5 text-sky-500" />
                        <Input 
                          name="twitter_url" 
                          value={formData.twitter_url} 
                          onChange={handleInputChange}
                          placeholder="Twitter URL"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Linkedin className="h-5 w-5 text-emerald-800" />
                        <Input 
                          name="linkedin_url" 
                          value={formData.linkedin_url} 
                          onChange={handleInputChange}
                          placeholder="LinkedIn URL"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Instagram className="h-5 w-5 text-pink-600" />
                        <Input 
                          name="instagram_url" 
                          value={formData.instagram_url} 
                          onChange={handleInputChange}
                          placeholder="Instagram URL"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* System Preferences Tab */}
              {activeTab === 'system' && (
                <div className="space-y-8">
                  {/* Regional Settings */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-emerald-700" />
                      Regional Settings
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label>Timezone</Label>
                        <select 
                          name="timezone" 
                          value={formData.timezone ?? ''} 
                          onChange={handleInputChange}
                          className="form-select mt-1.5"
                        >
                          {timezones.map(tz => (
                            <option key={tz.value} value={tz.value}>{tz.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Date Format</Label>
                        <select 
                          name="date_format" 
                          value={formData.date_format ?? ''} 
                          onChange={handleInputChange}
                          className="form-select mt-1.5"
                        >
                          {dateFormats.map(df => (
                            <option key={df.value} value={df.value}>{df.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Number Format</Label>
                        <select 
                          name="number_format" 
                          value={formData.number_format ?? ''} 
                          onChange={handleInputChange}
                          className="form-select mt-1.5"
                        >
                          <option value="1,234.56">1,234.56 (Comma thousand, dot decimal)</option>
                          <option value="1.234,56">1.234,56 (Dot thousand, comma decimal)</option>
                          <option value="1 234.56">1 234.56 (Space thousand, dot decimal)</option>
                        </select>
                      </div>
                      <div>
                        <Label>Language</Label>
                        <select 
                          name="language" 
                          value={formData.language ?? ''} 
                          onChange={handleInputChange}
                          className="form-select mt-1.5"
                        >
                          <option value="en">English</option>
                          <option value="fa">Dari (فارسی)</option>
                          <option value="ps">Pashto (پښتو)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Security Settings */}
                  <div className="pt-6 border-t border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Lock className="h-4 w-4 text-emerald-700" />
                      Security Settings
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label>Session Timeout (minutes)</Label>
                        <Input 
                          type="number"
                          name="session_timeout" 
                          value={formData.session_timeout} 
                          onChange={handleInputChange}
                          className="mt-1.5"
                          min="5"
                          max="480"
                        />
                      </div>
                      <div>
                        <Label>Password Change Frequency (days)</Label>
                        <Input 
                          type="number"
                          name="require_password_change" 
                          value={formData.require_password_change} 
                          onChange={handleInputChange}
                          className="mt-1.5"
                          min="0"
                        />
                        <p className="text-xs text-gray-400 mt-1">0 = never expire</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="enable_two_factor"
                          checked={formData.enable_two_factor}
                          onChange={handleInputChange}
                          className="form-check-input"
                        />
                        <span className="text-sm text-gray-700">Enable two-factor authentication</span>
                      </label>
                    </div>
                  </div>

                  {/* Notification Settings */}
                  <div className="pt-6 border-t border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-emerald-700" />
                      Notifications
                    </h3>
                    <div className="space-y-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="enable_notifications"
                          checked={formData.enable_notifications}
                          onChange={handleInputChange}
                          className="form-check-input"
                        />
                        <span className="text-sm text-gray-700">Enable in-app notifications</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="enable_email_alerts"
                          checked={formData.enable_email_alerts}
                          onChange={handleInputChange}
                          className="form-check-input"
                        />
                        <span className="text-sm text-gray-700">Enable email alerts for approvals</span>
                      </label>
                    </div>
                  </div>

                  {/* Data Management */}
                  <div className="pt-6 border-t border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Database className="h-4 w-4 text-emerald-700" />
                      Data Management
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label>Data Retention (years)</Label>
                        <Input 
                          type="number"
                          name="data_retention_years" 
                          value={formData.data_retention_years} 
                          onChange={handleInputChange}
                          className="mt-1.5"
                          min="1"
                          max="99"
                        />
                        <p className="text-xs text-gray-400 mt-1">How long to keep financial records</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Logo Editor Dialog */}
      <LogoEditor
        open={isLogoEditorOpen}
        onOpenChange={(open) => { if (open !== isLogoEditorOpen) setIsLogoEditorOpen(open) }}
        currentLogo={previewLogo}
        onSave={handleLogoSave}
        isUploading={isUploadingLogo}
        organizationName={formData.name}
        organizationShortName={formData.short_name}
      />
    </div>
  )
}
