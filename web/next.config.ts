import type { NextConfig } from "next";

// Static export: the Hono server serves web/out at the same origin as the API.
// For local UI work against a running server, set NEXT_PUBLIC_API_BASE=http://localhost:4021.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
