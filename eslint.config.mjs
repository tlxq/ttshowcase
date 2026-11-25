import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [
  ...coreWebVitals,
  ...typescript,
  {
    // The site is a static export with images unoptimized (next.config.ts), so next/image only adds
    // script and hydration: measured 11-14, 16 KB more script for the Live part's screens.
    rules: { "@next/next/no-img-element": "off" },
  },
  {
    ignores: [
      ".next/",
      "out/",
      "node_modules/",
      ".claude/",
      ".cache/",
      ".playwright-cli/",
      "tools/",
      "pitch/paint/", // one script cut into parts (not linted before the split either)
    ],
  },
];

export default config;
