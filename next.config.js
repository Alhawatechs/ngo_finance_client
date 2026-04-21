/** @type {import('next').NextConfig} */
const path = require('path')
const pkg = require('./package.json')

const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  // Use separate dirs so dev and build don't lock the same folder (avoids EPERM on Windows)
  distDir: process.env.NEXT_DIST_DIR || (process.env.NODE_ENV === 'production' ? '.next-build' : '.next-dev'),
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },

  // Reduce ChunkLoadError (timeout) on slow loads: give chunk loading more time
  webpack: (config, { isServer }) => {
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    }
    if (!isServer) {
      config.output = config.output || {}
      config.output.chunkLoadTimeout = 60000 // 60s (default is often 12s)
    }
    return config
  },

  // Image optimization (Next 15: domains deprecated, use remotePatterns)
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', pathname: '/**' },
      { protocol: 'http', hostname: '127.0.0.1', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Redirect legacy URLs to canonical routes (allows removing redirect-only pages)
  async redirects() {
    return [
      { source: '/projects/donors/add', destination: '/projects/donors', permanent: true },
      { source: '/receivable/donors', destination: '/receivables/donors', permanent: true },
      { source: '/reports/donor', destination: '/reports/donor-reports', permanent: true },
      { source: '/reports/standard', destination: '/reports', permanent: true },
      { source: '/payable/vendors', destination: '/payables/vendors', permanent: true },
    ];
  },

  // API and storage rewrites (proxy to Laravel backend)
  // On server: backend is on port 80. Set API_PROXY_DESTINATION=http://127.0.0.1:80 when building so /api and /storage work.
  async rewrites() {
    const backend = process.env.API_PROXY_DESTINATION || 'http://localhost:8000'
    return [
      { source: '/api/:path*', destination: `${backend}/api/:path*` },
      { source: '/storage/:path*', destination: `${backend}/storage/:path*` },
    ]
  },

  // Strip console.log in production (keep error/warn)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  // Tree-shaking: only bundle icons/components that are used
  experimental: {
    optimizePackageImports: [
      '@tanstack/react-query',
      'lucide-react',
      '@radix-ui/react-icons',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-popover',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-toast',
      'date-fns',
      'recharts',
      'sonner',
      '@handsontable/react',
      'handsontable',
    ],
  },

  // Headers for caching
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Enable gzip compression
  compress: true,

  // Optimize production build
  poweredByHeader: false,
  generateEtags: true,
}

module.exports = nextConfig
