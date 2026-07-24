/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.sanity.io' }],
  },
  // Marketing pages are statically generated and served from the CDN.
  // Only /api/contact and /studio need a running function.
  async redirects() {
    // TODO: confirm — populated once the live site's URLs are known.
    return [];
  },
};

export default nextConfig;
