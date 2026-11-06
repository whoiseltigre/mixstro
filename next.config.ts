import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Homepage assets live in a versioned folder (public/site/v1), so they can be cached forever.
        source: "/site/:version(v\\d+)/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/site/index.html",
        headers: [{ key: "Cache-Control", value: "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" }],
      },
    ];
  },
  // Fonts and the logo for the share cards, read from disk at request time.
  outputFileTracingIncludes: {
    "/p/[username]/og": ["./src/assets/og/**"],
    "/p/[username]/story": ["./src/assets/og/**"],
  },
};

export default nextConfig;
