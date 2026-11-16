import assert from "node:assert/strict";
import { test } from "node:test";
import { decide } from "./guard.mjs";

// Split strings: the attribution lines must never appear whole in the repo (tools/public-guard).
const CO = "Co-Authored" + "-By: Claude";
const SESSION = "Claude" + "-Session: https://claude.ai/code/" + "session_1";
const GEN = "Generated" + " with [Claude Code](https://claude.com/claude-code)";
const run = (command, fonts = [], branch = "chore/x") => decide({ tool_input: { command }, cwd: "." }, { fonts: () => fonts, branch: () => branch });

test("lets ordinary commands through", () => {
  for (const c of [
    "git status",
    "mise run check",
    "git commit -m 'fix: the line keeps clear'",
    "git push -u origin chore/pitch-setup",
    "git push origin master-fix",
    "gh pr create --title 'chore: x' --body 'Tested: mise run check'",
    "vercel ls",
    "git log --grep=vercel",
    "git log | grep vercel",
    "git commit -m 'docs: why we never run vercel deploy'",
    `grep -n "&& git commit" notes.txt`,
    `cat > t.txt <<'EOF'\ngit commit -m x\n${CO}\nvercel --prod\nEOF`,
    `echo '${SESSION}'`,
  ]) {
    assert.equal(run(c), null, c);
  }
});

test("blocks AI attribution in commits and PR texts", () => {
  for (const c of [
    `git commit -m 'feat: x\n\n${CO} Opus 5.5 <noreply@anthropic.com>'`,
    `git commit -m 'x' -m '${SESSION}'`,
    `gh pr create --title x --body '🤖 ${GEN}'`,
    `git add . && git commit -m 'x\n${CO.toLowerCase()} <noreply@anthropic.com>'`,
    `git -C ../ttshowcase commit -m '${SESSION}'`,
    `(cd x; git commit -m '${SESSION}')`,
  ]) {
    assert.match(run(c), /AI attribution/, c);
  }
});

test("blocks deploys from the terminal", () => {
  for (const c of ["vercel --prod", "npx vercel deploy", "vercel", "vercel env rm KEY", "mise run build && vercel promote x"]) {
    assert.match(run(c), /nothing deploys from the terminal/, c);
  }
});

test("blocks force-push and push to master", () => {
  for (const c of ["git push --force origin chore/x", "git push -fu origin chore/x", "git push origin +chore/x"]) assert.match(run(c), /force-push/, c);
  for (const c of ["git push origin master", "git push origin HEAD:master", "git push origin feat:master"]) assert.match(run(c), /push to master/, c);
  assert.match(run("git push", [], "master"), /while on master/);
  assert.equal(run("git push", [], "chore/x"), null);
});

test("blocks a commit with font files staged", () => {
  assert.match(run("git commit -m 'chore: fonts'", ["pitch/fonts/ClashDisplay-Bold.woff2"]), /font files staged/);
  assert.equal(run("git status", ["pitch/fonts/ClashDisplay-Bold.woff2"]), null);
});
