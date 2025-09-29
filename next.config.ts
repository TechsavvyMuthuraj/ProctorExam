import type { NextConfig } from 'next';
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

const nextConfig: NextConfig = {
  /* config options */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'drive.google.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // ✅ Only add Monaco to client-side production build
    if (!isServer && process.env.NODE_ENV === 'production') {
      config.plugins.push(
        new MonacoWebpackPlugin({
          languages: [
            'javascript',
            'typescript',
            'css',
            'html',
            'json',
            'python',
            'java',
            'sql',
          ],
        })
      );
    }
    return config;
  },
  turbo: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
      },
    },
  },
};

export default nextConfig;
