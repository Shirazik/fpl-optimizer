import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Exclude Python venv from client-side bundle
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude server-only modules from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        child_process: false,
        fs: false,
        path: false,
      }
    }
    return config
  },

  turbopack: {
    // Empty config to use Turbopack defaults
  },
}

export default nextConfig
