// The pitch build reads TypeScript files straight from Node (api/tags.ts) and strips their types (stripTypeScriptTypes):
// Node 22.18 is the first 22 that does both without a flag. package.json's engines.node says the same; mise.toml pins the real version.
export const NEED_NODE = "22.18.0";

// the plain sentence to print when this Node can't run the build, or "" when it can
export function nodeProblem(version, hasStripTypes) {
  const [a = 0, b = 0, c = 0] = version.split(".").map(Number);
  const [x, y, z] = NEED_NODE.split(".").map(Number);
  const old = a < x || (a === x && (b < y || (b === y && c < z)));
  if (!old && hasStripTypes) return "";
  return `This build needs Node ${NEED_NODE} or newer, and this is Node ${version}. Run: mise install`;
}
