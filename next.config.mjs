/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'www.rami-levy.co.il' },
      { protocol: 'https', hostname: 'wqkhetnkcocehekniwig.supabase.co' },
      { protocol: 'https', hostname: 'images.openfoodfacts.org' },
    ],
  },
};

export default nextConfig;
