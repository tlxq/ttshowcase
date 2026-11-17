import type { NextConfig } from "next";

const config: NextConfig = {
  // The real build is a static export. `next dev` skips export mode, because export mode turns off
  // middleware.ts there, and the dev server must guard /next like Vercel does.
  output: process.env.NODE_ENV === "production" ? "export" : undefined,
  images: { unoptimized: true },
  reactStrictMode: true,
  agentRules: false,
  // Live editing over Tailscale: the dev server only trusts these hosts.
  allowedDevOrigins: ["**.ts.net"],
};

export default config;
