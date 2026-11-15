/** Reads a design token from the page at run time. tokens.css is the only place the values live. */
export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** A token written as a time ("700ms" or "0.7s"), in milliseconds. */
export function cssMs(name: string): number {
  const raw = cssVar(name);
  const value = parseFloat(raw);
  if (Number.isNaN(value)) throw new Error(`Token ${name} is not a time: "${raw}"`);
  return raw.endsWith("ms") ? value : value * 1000;
}
