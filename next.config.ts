import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Type errors are now caught at build time (tsc --noEmit passes with 0 errors
  // as of RESTORE-002). Keep this commented for reference; do NOT re-enable
  // ignoreBuildErrors — it masks type regressions.
  // typescript: { ignoreBuildErrors: true },
  reactStrictMode: true,
};

export default nextConfig;
