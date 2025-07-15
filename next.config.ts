import withPWA from 'next-pwa';

const pwaConfig = {
  dest: 'public',
  register: true,
  skipWaiting: false, // Prevent aggressive updates that cause reloads
  disable: process.env.NODE_ENV === 'development', // Disable in dev to prevent reload issues
  reloadOnOnline: false, // Don't reload when coming back online
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/apig\.selzy\.com\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'selzy-api-cache',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    }
  ]
};

const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true
  },
  experimental: {
    optimizePackageImports: ['react', 'react-dom']
  }
};

export default withPWA(pwaConfig)(nextConfig);
