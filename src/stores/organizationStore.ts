import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toSameOriginStorageUrl } from '@/lib/utils'
import { useAuthStore } from './authStore'
import { 
  OrganizationSettings, 
  OrganizationBranding,
  getOrganization, 
  getOrganizationBranding,
  updateOrganization as updateOrganizationApi,
  uploadOrganizationLogo as uploadLogoApi,
  removeOrganizationLogo as removeLogoApi,
  uploadOrganizationLicense as uploadLicenseApi,
  removeOrganizationLicense as removeLicenseApi,
  UpdateOrganizationData 
} from '@/lib/api/organization'

interface LogoUploadResult {
  logo_url: string
  logo_path?: string
  had_transparency?: boolean
  dimensions?: { width: number; height: number }
}

/** Skip redundant GET /organization when layout + many pages all call fetch on mount (not persisted). */
const ORG_FETCH_MIN_INTERVAL_MS = 120_000

interface OrganizationState {
  organization: OrganizationSettings | null
  branding: OrganizationBranding | null
  isLoading: boolean
  isHydrated: boolean
  error: string | null
  /** Last successful in-memory fetch (per user); avoids duplicate network on rapid navigation. */
  lastOrganizationFetchAt: number | null
  lastOrganizationFetchUserId: number | null

  // Actions
  fetchOrganization: (options?: { force?: boolean }) => Promise<void>
  fetchBranding: () => Promise<void>
  updateOrganization: (data: UpdateOrganizationData) => Promise<boolean>
  uploadLogo: (file: File) => Promise<LogoUploadResult | null>
  removeLogo: () => Promise<boolean>
  uploadLicense: (file: File) => Promise<{ success: boolean; message?: string }>
  removeLicense: () => Promise<boolean>
  setHydrated: () => void
  clearError: () => void
}

export const useOrganizationStore = create<OrganizationState>()(
  persist(
    (set, get) => ({
      organization: null,
      branding: null,
      isLoading: false,
      isHydrated: false,
      error: null,
      lastOrganizationFetchAt: null,
      lastOrganizationFetchUserId: null,

      fetchOrganization: async (options) => {
        const force = options?.force === true
        const { organization, branding, lastOrganizationFetchAt, lastOrganizationFetchUserId } = get()
        const authUserId = useAuthStore.getState().user?.id ?? null
        const withinInterval =
          lastOrganizationFetchAt != null &&
          Date.now() - lastOrganizationFetchAt < ORG_FETCH_MIN_INTERVAL_MS
        const sameUser = authUserId != null && lastOrganizationFetchUserId === authUserId
        if (
          !force &&
          organization &&
          branding &&
          sameUser &&
          withinInterval
        ) {
          return
        }

        set({ isLoading: true, error: null })
        try {
          const response = await getOrganization()
          const org = response.data
          const uid = useAuthStore.getState().user?.id ?? null
          set({
            organization: org,
            branding: {
              name: org.name,
              short_name: org.short_name,
              logo_url: toSameOriginStorageUrl(org.logo_url) ?? org.logo_url ?? null,
              tagline: org.tagline ?? undefined,
            },
            isLoading: false,
            lastOrganizationFetchAt: Date.now(),
            lastOrganizationFetchUserId: uid,
          })
        } catch (err: unknown) {
          const msg = err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : null
          set({ error: msg || 'Failed to fetch organization', isLoading: false })
        }
      },

      fetchBranding: async () => {
        try {
          const response = await getOrganizationBranding()
          set({
            branding: {
              ...response.data,
              logo_url: toSameOriginStorageUrl(response.data.logo_url) ?? response.data.logo_url,
            },
          })
        } catch (error) {
          // Silently fail for branding - use defaults so login page still renders
          set({
            branding: {
              name: 'AADA ERP',
              short_name: 'AADA',
              logo_url: null,
              tagline: undefined,
            },
          })
        }
      },

      updateOrganization: async (data: UpdateOrganizationData) => {
        set({ isLoading: true, error: null })
        try {
          const response = await updateOrganizationApi(data)
          // Update both organization and branding so all consumers (sidebar, reports, organogram, etc.) see changes immediately
          const org = response.data
          set({ 
            organization: org,
            branding: {
              name: org.name,
              short_name: org.short_name,
              logo_url: toSameOriginStorageUrl(org.logo_url) ?? org.logo_url ?? null,
              tagline: org.tagline ?? undefined,
            },
            isLoading: false 
          })
          return true
        } catch (err: unknown) {
          const msg = err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : null
          set({ error: msg || 'Failed to update organization', isLoading: false })
          return false
        }
      },

      uploadLogo: async (file: File) => {
        set({ isLoading: true, error: null })
        try {
          const response = await uploadLogoApi(file)
          const currentOrg = get().organization
          const logoUrl = toSameOriginStorageUrl(response.data.logo_url) ?? response.data.logo_url
          if (currentOrg) {
            set({ 
              organization: { ...currentOrg, logo_url: logoUrl },
              branding: {
                name: currentOrg.name,
                short_name: currentOrg.short_name,
                logo_url: logoUrl,
                tagline: currentOrg.tagline ?? undefined,
              },
              isLoading: false 
            })
          }
          // Return response data for additional info (transparency, dimensions)
          return response.data
        } catch (err: unknown) {
          const msg = err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : null
          set({ error: msg || 'Failed to upload logo', isLoading: false })
          return null
        }
      },

      removeLogo: async () => {
        set({ isLoading: true, error: null })
        try {
          await removeLogoApi()
          const currentOrg = get().organization
          if (currentOrg) {
            set({ 
              organization: { ...currentOrg, logo_url: null },
              branding: {
                name: currentOrg.name,
                short_name: currentOrg.short_name,
                logo_url: null,
                tagline: currentOrg.tagline ?? undefined,
              },
              isLoading: false 
            })
          }
          return true
        } catch (err: unknown) {
          const msg = err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : null
          set({ error: msg || 'Failed to remove logo', isLoading: false })
          return false
        }
      },

      uploadLicense: async (file: File): Promise<{ success: boolean; message?: string }> => {
        set({ isLoading: true, error: null })
        try {
          const response = await uploadLicenseApi(file)
          const currentOrg = get().organization
          const licenseUrl = response.data?.license_url
          if (currentOrg && licenseUrl) {
            set({ 
              organization: { ...currentOrg, license_url: licenseUrl },
              isLoading: false 
            })
            return { success: true }
          }
          set({ isLoading: false })
          return { success: !!licenseUrl }
        } catch (err: unknown) {
          const message = err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message
              || (err as { message?: string }).message
            : 'Failed to upload license'
          set({ 
            error: message,
            isLoading: false 
          })
          return { success: false, message }
        }
      },

      removeLicense: async () => {
        set({ isLoading: true, error: null })
        try {
          await removeLicenseApi()
          const currentOrg = get().organization
          if (currentOrg) {
            set({ 
              organization: { ...currentOrg, license_url: null },
              isLoading: false,
            })
          } else {
            set({ isLoading: false })
          }
          return true
        } catch (err: unknown) {
          const msg = err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : null
          set({ error: msg || 'Failed to remove license', isLoading: false })
          return false
        }
      },

      setHydrated: () => {
        set({ isHydrated: true })
      },

      clearError: () => {
        set({ error: null })
      },
    }),
    {
      name: 'organization-storage',
      partialize: (state) => ({ 
        organization: state.organization,
        branding: state.branding,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated()
      },
    }
  )
)
