import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude large non-runtime files from the NFT (Node File Tracing) deployment bundle.
  // Without this, Turbopack traces the entire project root into every function bundle,
  // making the deployment artifact huge and causing "Deploying outputs" to hang.
  outputFileTracingExcludes: {
    "*": [
      // Prospection scripts with large JSON/CSV data files
      "./scripts/**/*",
      // Local demo JSON store — only used in dev, never on Vercel (Prisma is used)
      "./data/**/*",
      // Prisma native query engine binaries — not needed with @prisma/adapter-pg
      "./node_modules/.prisma/client/libquery_engine*",
      "./node_modules/@prisma/engines/**/*",
      "./node_modules/prisma/libquery_engine*",
      // Build tooling binaries not needed at runtime
      "./node_modules/esbuild/**/*",
      "./node_modules/@swc/**/*",
      "./node_modules/webpack/**/*",
    ],
  },
};

export default nextConfig;
