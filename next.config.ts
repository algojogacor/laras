import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Type errors are caught at build time (tsc --noEmit passes with 0 errors).
  // Do NOT re-enable ignoreBuildErrors — it masks type regressions.
  // typescript: { ignoreBuildErrors: true },
  reactStrictMode: true,
};

export default nextConfig;
