/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    // Fix for PDF.js compatibility
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };
    return config;
  },
  images: {
    domains: ['localhost'],
  },
  experimental: {
    serverComponentsExternalPackages: ['pdfjs-dist'],
  },
  typescript: {
    ignoreBuildErrors: true, // skip TS type checking during `next build`
  },
  eslint: {
    ignoreDuringBuilds: true, // optional: skip ESLint during build
  },
}

module.exports = nextConfig
