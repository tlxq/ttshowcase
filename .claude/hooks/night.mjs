// Runs when a Claude session starts in this repo (SessionStart, .claude/settings.json).
// Reads the last night walk (tools/night.sh writes ${XDG_STATE_HOME:-~/.local/state}/ttshowcase/night.json)
// and prints one line when it was red, so the fix comes first (CLAUDE.md, Tom 11-25), or when it was skipped
// because the fallback commit was already red (result "skipped" with red_commit: master's tip was NOT walked,
// which is not "fine"). Green, any other skipped night (both checks had already passed) or no file: prints nothing.
// Tests: node --test .claude/hooks/
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function nightFile(env = process.env) {
  return join(env.XDG_STATE_HOME || join(homedir(), ".local", "state"), "ttshowcase", "night.json");
}

/** The line for a night.json text, or "" when there is nothing to say. */
export function nightLine(text) {
  let night;
  try {
    night = JSON.parse(text);
  } catch {
    return "";
  }
  if (night?.result === "skipped" && night.red_commit) {
    const red = String(night.red_commit).slice(0, 7);
    const tip = String(night.commit || "").slice(0, 7);
    return `Night walk did not run${tip ? ` on ${tip}` : ""}: the older commit ${red} was already red. Fix that first.`;
  }
  if (night?.result !== "red") return "";
  const sha = String(night.commit || "").slice(0, 7) || "unknown commit";
  const checks = Array.isArray(night.failed) && night.failed.length ? night.failed.join(", ") : "see the log";
  return `Night walk red on ${sha}: ${checks}. Fix this first.`;
}

function main() {
  let text = "";
  try {
    text = readFileSync(nightFile(), "utf8");
  } catch {}
  const line = nightLine(text);
  if (line) process.stdout.write(`${line}\n`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
