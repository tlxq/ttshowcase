import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Tom's tlxq mark (the ASCII logo from ~/.1dot/kit/brand, tlxq-light.svg) in the text colour, read at build time. */
const svg = readFileSync(join(process.cwd(), "src/look/tlxq-mark.svg"), "utf8");

export function TlxqMark({ className }: { className?: string }) {
  return (
    <span
      className={className}
      role="img"
      aria-label="tlxq"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
