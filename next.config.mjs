/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    scrollRestoration: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'www.rami-levy.co.il' },
      { protocol: 'https', hostname: 'wqkhetnkcocehekniwig.supabase.co' },
      { protocol: 'https', hostname: 'images.openfoodfacts.org' },
    ],
  },
};

export default nextConfig;
