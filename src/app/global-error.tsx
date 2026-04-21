'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const isDev = process.env.NODE_ENV === 'development'
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            {error?.message?.includes('Internal') ? 'Internal Server Error' : 'Something went wrong'}
          </h1>
          <p className="text-sm text-gray-600 mb-4">
            The application encountered an error. Please try refreshing the page.
          </p>
          {(error?.message || error?.digest) && (
            <p className="text-xs text-red-600 mb-4 font-mono break-all text-left bg-red-50 p-3 rounded">
              {error.message || (error.digest ? `Digest: ${error.digest}` : '')}
            </p>
          )}
          <button
            onClick={reset}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-emerald-800 font-medium"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
