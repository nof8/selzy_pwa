import withPWA from 'next-pwa';

const pwaConfig = {
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: false, // Enable PWA in all environments for testing
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
