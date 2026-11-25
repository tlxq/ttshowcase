export const CSS_MARKER: string;
export const JS_MARKER: string;
export function readParts(dir: string): { css: string; js: string };
export function fillParts(page: string, parts: { css: string; js: string }): string;
