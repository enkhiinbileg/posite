/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
  // Hardcode NEXT_PUBLIC_* vars so they are always embedded at build time.
  // These are all public-facing values (anon keys, public URLs) — safe to commit.
  // Without this, Cloudflare CI builds without .env and falls back to 'dummy-anon-key'.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://jtlwllzaxscxqtcoqpll.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bHdsbHpheHNjeHF0Y29xcGxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NjMxNzAsImV4cCI6MjA4NDAzOTE3MH0.e31jvTn1pD9bVRrR7q99EUvHiVDXD_xvhDUPKuwWwLo',
    NEXT_PUBLIC_SITE_URL: 'https://mytoon.site',
    NEXT_PUBLIC_R2_ACCOUNT_ID: '02423135e993ac7317bdad45242cc187',
    NEXT_PUBLIC_R2_ACCESS_KEY_ID: 'f90556c502352f67ced403ba0cd08446',
    NEXT_PUBLIC_R2_BUCKET_NAME: 'webtoon',
    NEXT_PUBLIC_R2_PUBLIC_URL: 'https://pub-153c22e6ca2e4d61b33d4768e4f97534.r2.dev',
    NEXT_PUBLIC_GOOGLE_FONTS_API_KEY: 'AIzaSyCsWcy2rq8vrHdMlwTlTAZMaOs8jZezoTY',
    NEXT_PUBLIC_CDN_DOMAIN: 'https://dry-truth-8017.artmongolian1.workers.dev',
  },
};

export default nextConfig;
