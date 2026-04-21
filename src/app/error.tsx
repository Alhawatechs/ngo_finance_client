'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-md w-full text-center">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {error?.message?.includes('Internal') ? 'Internal Server Error' : 'Something went wrong'}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Please try again or go back to the dashboard.
        </p>
        {error?.message && (
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-4 font-mono break-all">
            {error.message}
          </p>
        )}
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={reset}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-emerald-800 font-medium"
          >
            Try again
          </button>
          <a
            href="/login"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 font-medium"
          >
            Go to login
          </a>
        </div>
      </div>
    </div>
  )
}
