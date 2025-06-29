import withPWA from 'next-pwa';

const pwaConfig = {
  dest: 'public',
  register: true,
  skipWaiting: true,
};

const nextConfig = {
  /* config options here */
};

export default withPWA(pwaConfig)(nextConfig);
