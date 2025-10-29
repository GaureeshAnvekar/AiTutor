const CopyWebpackPlugin = require("copy-webpack-plugin");
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

    config.plugins.push(
      new CopyWebpackPlugin({
        patterns: [
          {
            from: "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
            to: ".next/server/vendor-chunks/pdf.worker.mjs",
            info: { minimized: true },
          },
        ],
      })
    );

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
