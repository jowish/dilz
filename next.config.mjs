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
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'media.shufersal.co.il' },
    ],
  },
};

export default nextConfig;
