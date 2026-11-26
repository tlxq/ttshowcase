#!/usr/bin/env bash
# Opens /next, the new site behind its secret link: once per browser, then the cookie remembers it.
#   tools/next.sh live   ttdevs.com/next (Vercel)
#   tools/next.sh dev    this PC's Tailscale dev server (mise run dev), port from PORT (default 3000)
#   tools/next.sh preview [PR#]   a PR's Vercel preview (the current branch's PR when none is named): prints the link and a QR
# --print (anywhere in the line) or NEXT_PRINT=1 prints the link instead of opening a browser: for the phone, and for scripts
# and checkers, which must never get a browser tab on the desk. The key comes from Proton Pass via ttpass sync.
set -euo pipefail
print="${NEXT_PRINT:-}"
args=()
for a in "$@"; do if [ "$a" = --print ]; then print=1; else args+=("$a"); fi; done
set -- "${args[@]+"${args[@]}"}"
key_file="$HOME/.config/ttdevs/ttshowcase-next.key"
[ -r "$key_file" ] || { echo "Couldn't find /next's key in $key_file. Run: ttpass sync" >&2; exit 1; }
if [ "${1:-}" = preview ]; then
  # Previews sit behind Vercel's login. The bypass secret (Protection Bypass for Automation) lets the phone in.
  # The link holds secrets, so it goes to the terminal only, never into a file or log.
  bypass_file="$HOME/.config/ttdevs/ttshowcase-vercel-bypass.key"
  command -v gh >/dev/null && command -v vercel >/dev/null || { echo "Couldn't find gh and vercel. Run: mise install" >&2; exit 1; }
  if [ -n "${2:-}" ]; then branch=$(gh pr view "$2" --json headRefName --jq .headRefName)
  else branch=$(gh pr view --json headRefName --jq .headRefName 2>/dev/null || true); fi
  [ -n "$branch" ] || { echo "Couldn't find the PR's branch. Name the PR: mise run next preview 44, or run showcase look" >&2; exit 1; }
  # the Vercel link lives in the main checkout's .vercel (a worktree has none)
  repo=$(cd "$(dirname "$0")/.." && cd "$(git rev-parse --git-common-dir)/.." && pwd)
  link="$repo/.vercel/project.json"
  [ -r "$link" ] || { echo "Couldn't find the Vercel link in $link. Run: vercel link" >&2; exit 1; }
  eval "$(python3 -I -c 'import json, sys; d = json.load(open(sys.argv[1])); print("export VERCEL_ORG_ID=%s VERCEL_PROJECT_ID=%s" % (d["orgId"], d["projectId"]))' "$link")"
  host=$(vercel ls -m "githubCommitRef=$branch" --json --limit 5 2>/dev/null | python3 -I -c '
import json, sys
raw = sys.stdin.read()
rows = [d for d in json.loads(raw[raw.index("{"):])["deployments"] if d.get("state") == "READY"]
if rows: print(rows[0]["meta"].get("branchAlias") or rows[0]["url"])') || true
  [ -n "$host" ] || { echo "Couldn't find a ready preview for $branch. Wait for Vercel to build the PR, then run this again" >&2; exit 1; }
  quote() { python3 -I -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read().strip(), safe=""))'; }
  next_key=$(quote <"$key_file")
  if [ -r "$bypass_file" ]; then
    url="https://$host/next?x-vercel-protection-bypass=$(quote <"$bypass_file")&x-vercel-set-bypass-cookie=true&key=$next_key"
  else
    url="https://$host/next?key=$next_key"
    echo "Couldn't find the bypass secret in $bypass_file, so this link stops at Vercel's login." >&2
    echo "Create it in Vercel > Settings > Deployment Protection > Protection Bypass for Automation, save it in Pass as \"Dev/ttshowcase vercel bypass\", then run: ttpass sync" >&2
  fi
  echo "Preview of $branch:"
  echo "$url"
  if command -v qrencode >/dev/null; then qrencode -t ansiutf8 "$url"; else echo "(No QR: install qrencode to get one)" >&2; fi
  exit 0
fi
case "${1:-live}" in
  live) base="https://ttdevs.com" ;;
  dev)
    name=$(tailscale status --json | python3 -I -c 'import json, sys; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))')
    base="http://$name:${PORT:-3000}" ;;
  *) echo "Usage: tools/next.sh live|dev [--print] | preview [PR#]  (NEXT_PRINT=1 is the same as --print)" >&2; exit 2 ;;
esac
# percent-encoded: Pass may put symbols in the key
url="$base/next?key=$(python3 -I -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read().strip(), safe=""))' <"$key_file")"
if [ -n "$print" ]; then
  echo "$url"
  command -v qrencode >/dev/null && qrencode -t ansiutf8 "$url"
else
  xdg-open "$url" >/dev/null 2>&1 &
  echo "Opened $base/next in the browser"
fi
