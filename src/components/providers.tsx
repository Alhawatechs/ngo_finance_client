'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useOrganizationStore } from '@/stores/organizationStore'
import { createQueryClient } from '@/lib/query-client'

/** Short delay so we don't block first paint; persist often completes by then */
const EARLY_HYDRATION_MS = 120

/**
 * Root client shell: one QueryClient for the whole app (avoids “No QueryClient set” when
 * layout boundaries or chunk order differ), plus store hydration.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient())
  const setAuthHydrated = useAuthStore((s) => s.setHydrated)
  const setOrgHydrated = useOrganizationStore((s) => s.setHydrated)

  useEffect(() => {
    const t = setTimeout(() => {
      setAuthHydrated()
      setOrgHydrated()
    }, EARLY_HYDRATION_MS)
    return () => clearTimeout(t)
  }, [setAuthHydrated, setOrgHydrated])

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
