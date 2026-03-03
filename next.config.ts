import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "wxacuvlwlalejd25.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "static.wixstatic.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/main-line-manyunk",
        destination: "/center-city?neighborhood=main-line-manyunk",
        permanent: true,
      },
      {
        source: "/old-yorkroad-northeast",
        destination: "/center-city?neighborhood=old-yorkroad-northeast",
        permanent: true,
      },
      {
        source: "/cherry-hill",
        destination: "/center-city?neighborhood=cherry-hill",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
