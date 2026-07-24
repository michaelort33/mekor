import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Parent lockfiles outside this repo make Turbopack pick the wrong workspace root
  // and fail CSS package resolution (e.g. tw-animate-css).
  turbopack: {
    root: path.join(__dirname),
  },
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
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "chalavita.com",
      },
    ],
  },
  async headers() {
    const privateNoIndexRoutes = [
      "/admin/:path*",
      "/account/:path*",
      "/api/:path*",
      "/members/:path*",
      "/community/:path*",
      "/member-events/:path*",
      "/profile/:path*",
      "/invite/:path*",
      "/login",
      "/signup",
      "/forgot-password",
      "/reset-password",
      "/newsletter/confirmed",
      "/newsletter/unsubscribed",
      "/search",
    ];

    return privateNoIndexRoutes.map((source) => ({
      source,
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
    }));
  },
  async redirects() {
    return [
      {
        source: "/our-rabbi",
        destination: "/our-rabbis",
        permanent: true,
      },
      {
        source: "/our-rabbis.html",
        destination: "/our-rabbis",
        permanent: true,
      },
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
      {
        source: "/post/hipcityveg-1",
        destination: "/post/hipcityveg",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
