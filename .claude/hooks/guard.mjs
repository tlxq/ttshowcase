// Runs before every shell command Claude makes in this repo (PreToolUse on Bash, .claude/settings.json).
// Blocks what the repo's rules say never happens; the reason goes back to Claude. Tests: node --test .claude/hooks/
// Commands are found in the shell text with quoted strings and heredoc bodies taken out, so a grep or a test file
// that only mentions `git commit` is let through. The attribution check reads the whole text, quotes included.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const start = String.raw`(?:^|[;&|(\n]|\bthen\b|\bdo\b)\s*`; // where a command can begin
const git = String.raw`(?:\S+=\S+\s+)*git(?:\s+-[cC]\s+\S+|\s+--\S+)*\s+`; // git -C dir / -c k=v before the verb
const commit = new RegExp(start + git + String.raw`commit\b`);
const prText = new RegExp(start + String.raw`gh\s+pr\s+(?:create|edit|merge|comment)\b`);
const push = new RegExp(start + git + String.raw`push\b([^;&|\n]*)`, "g");
const deploy = new RegExp(start + String.raw`(?:npx\s+)?vercel(?:\s+(?:deploy|--prod|promote|rollback|alias|remove|rm|env\s+(?:rm|add|pull))\b|\s*(?:$|[;&|\n]))`);
// The [:] keeps this line from matching tools/public-guard itself.
const attribution = /co-authored-by[:].*(claude|anthropic)|claude-session[:]|claude\.ai\/code|generated with \[?claude|🤖/i;
const font = /\.(woff2?|ttf|otf|eot)$/i;

/** The shell text with heredoc bodies and quoted strings blanked out. */
export function commandsOnly(cmd) {
  const lines = cmd.split("\n"), out = [];
  for (let i = 0; i < lines.length; i++) {
    out.push(lines[i]);
    const tag = lines[i].match(/<<-?\s*['"]?(\w+)['"]?/);
    if (tag) while (i + 1 < lines.length && lines[i + 1].trim() !== tag[1]) i++;
  }
  return out.join("\n").replace(/'[^']*'/g, "''").replace(/"(?:[^"\\]|\\.)*"/g, '""');
}

export function currentBranch(cwd) {
  return (spawnSync("git", ["branch", "--show-current"], { cwd: cwd || process.cwd(), encoding: "utf8" }).stdout || "").trim();
}

export function stagedFonts(cwd) {
  const run = spawnSync("git", ["diff", "--cached", "--name-only", "--diff-filter=d"], { cwd: cwd || process.cwd(), encoding: "utf8" });
  return (run.stdout || "").split("\n").filter((f) => font.test(f));
}

export function decide(input, env = {}) {
  const fonts = env.fonts || stagedFonts, branch = env.branch || currentBranch;
  const cmd = typeof input?.tool_input?.command === "string" ? input.tool_input.command : "";
  const bare = commandsOnly(cmd);

  if ((commit.test(bare) || prText.test(bare)) && attribution.test(cmd)) {
    return "Blocked: AI attribution in a commit or PR text (Co-Authored-By, session link, 'Generated with'). This repo never has it. Remove it and try again.";
  }
  if (deploy.test(bare)) {
    return "Blocked: nothing deploys from the terminal. The site deploys when a PR is merged into master.";
  }
  for (const m of bare.matchAll(push)) {
    const args = m[1];
    if (/\s-[a-z]*f[a-z]*\b|\s--force\b|\s--force-with-lease\b|\s\+\S/.test(args)) return "Blocked: force-push. Make a new commit instead.";
    const targets = args.split(/\s+/).filter((a) => a && !a.startsWith("-"));
    if (targets.slice(1).some((t) => /(^|:)(refs\/heads\/)?master$/.test(t))) return "Blocked: push to master. Push the branch and open a PR.";
    if (targets.length < 2 && branch(input?.cwd) === "master") return "Blocked: push while on master. Push the branch and open a PR.";
  }
  if (commit.test(bare)) {
    const found = fonts(input?.cwd);
    if (found.length) {
      return `Blocked: font files staged (${found.join(", ")}). Clash Display's licence forbids a public repository; fonts are fetched into .cache/fonts at build time. Unstage them: git restore --staged ${found.join(" ")}`;
    }
  }
  return null;
}

function main() {
  let input = {};
  try {
    input = JSON.parse(readFileSync(0, "utf8"));
  } catch {}
  const reason = decide(input);
  if (reason) {
    process.stderr.write(`${reason}\n`);
    process.exit(2);
  }
  process.exit(0);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
