import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel deployment — standard output mode (Vercel handles bundling)
  // For self-hosted Docker/standalone, set output: "standalone"
  output: undefined,
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Prisma generates its client into node_modules — make sure Vercel includes it
  serverExternalPackages: ["@prisma/client", "@node-rs/argon2"],
  // Make sure SQLite native binary is bundled
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
