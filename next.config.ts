import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel deployment — standard output mode
  output: undefined,
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Note: We intentionally do NOT externalize firebase-admin because it
  // depends on jwks-rsa → jose (ESM-only). Bundling via Turbopack handles
  // the CJS/ESM interop correctly. Externalizing causes ERR_REQUIRE_ESM.
  serverExternalPackages: [
    "@prisma/client",
    "@grpc/grpc-js",
    "google-auth-library",
    "googleapis",
    "gcx",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
