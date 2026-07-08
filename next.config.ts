import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel deployment — standard output mode
  output: undefined,
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Mark packages that should NOT be bundled by turbopack — they should
  // remain as external requires (Vercel will resolve them from node_modules)
  serverExternalPackages: [
    "@prisma/client",
    "firebase-admin",
    "firebase-admin/firestore",
    "firebase-admin/auth",
    "@firebase/firestore",
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
