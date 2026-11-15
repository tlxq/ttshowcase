import type { NextConfig } from "next";

const config: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
  agentRules: false,
  // Live editing over Tailscale: the dev server only trusts these hosts.
  allowedDevOrigins: ["**.ts.net"],
};

export default config;
