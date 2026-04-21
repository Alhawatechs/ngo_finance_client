import { QueryClient } from '@tanstack/react-query'

/** Shared defaults for TanStack Query (matches former root Providers). */
export const QUERY_CLIENT_OPTIONS = {
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      retryDelay: (i: number) => Math.min(1000 * 2 ** i, 30000),
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      structuralSharing: true,
    },
    mutations: { retry: 0 },
  },
}

export function createQueryClient() {
  return new QueryClient(QUERY_CLIENT_OPTIONS)
}
