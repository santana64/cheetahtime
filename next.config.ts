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
      // Heavy build-only binaries (NOT @swc/helpers — needed by Next.js runtime)
      "./node_modules/esbuild/bin/**/*",
      "./node_modules/esbuild/install.js",
    ],
  },
};

export default nextConfig;
