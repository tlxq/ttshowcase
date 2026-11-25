#!/usr/bin/env bash
# The night walk (Tom 11-25): the full `mise run pitch:check` and `mise run walk` once a night on master, on the desk.
# Runs inside its own clone kept at GitHub's master (never a working folder); the desk timer
# (its desk timer lives in the private home repo, desk/systemd/ttshowcase-night.*) moves the clone and starts this script.
# 1. Waits for a quiet desk: no browser test or picture generation running and load under 4, at most
#    NIGHT_WAIT_MIN minutes (default 60), then runs anyway and says so.
# 2. npm ci only when package-lock.json changed since the last night (or node_modules is missing).
# 3. Both checks; each skips by itself when it already passed on this commit (tools/passes).
# Writes ${XDG_STATE_HOME:-~/.local/state}/ttshowcase/night.json:
#   {when, commit, result: green|red|skipped, failed: [check names], log, note}
# skipped = both checks had already passed on this commit, so nothing ran. Exit 1 when red.
# The SessionStart hook (.claude/hooks/night.mjs) says so in the next session when it is red.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2

state="${XDG_STATE_HOME:-$HOME/.local/state}/ttshowcase"
logs="$state/night-logs"
mkdir -p "$logs"
log="$logs/$(date +%F-%H%M%S).log"
ls -t "$logs" | tail -n +15 | while read -r old; do rm -f "$logs/$old"; done
exec > >(tee -a "$log") 2>&1

busy() {
  local load
  pgrep -f '[p]laywright test' >/dev/null && { echo "a browser test is running"; return 0; }
  pgrep -f '[s]d-cli' >/dev/null && { echo "picture generation (sd-cli) is running"; return 0; }
  load=$(cut -d' ' -f1 /proc/loadavg)
  awk -v l="$load" 'BEGIN { exit !(l >= 4) }' && { echo "load is $load"; return 0; }
  return 1
}

note=""
wait_min="${NIGHT_WAIT_MIN:-60}"
waited=0
while why=$(busy); do
  if [ "$waited" -ge "$wait_min" ]; then
    note="The desk stayed busy for $wait_min min ($why), so the walk ran anyway; paint times may be off."
    echo "$note"
    break
  fi
  [ "$waited" = 0 ] && echo "Waiting for a quiet desk: $why."
  sleep 60
  waited=$((waited + 1))
done

commit=$(git rev-parse HEAD)
echo "Night walk on $(git rev-parse --short HEAD) ($(git log -1 --format=%s))"

lock_now=$(sha256sum package-lock.json | cut -c1-16)
lock_file=.cache/night/lock
if [ ! -d node_modules ] || [ "$(cat "$lock_file" 2>/dev/null)" != "$lock_now" ]; then
  echo "package-lock.json changed: npm ci"
  if npm ci --no-audit --no-fund; then mkdir -p .cache/night && echo "$lock_now" > "$lock_file"; fi
fi

failed=()
ran=0
for check in pitch:check walk; do
  out=$(mktemp)
  mise run "$check" 2>&1 | tee "$out"
  rc=${PIPESTATUS[0]}
  grep -q "already passed on" "$out" || ran=1
  if [ "$rc" != 0 ]; then
    # "<name>: FAILED …" lines, with or without mise's "[task] " prefix
    names=$(sed -nE 's/^(\[[^]]*\] )?([a-z0-9-]+): FAILED.*/\2/p' "$out" | sort -u)
    if [ -n "$names" ]; then
      while read -r n; do failed+=("$check $n"); done <<<"$names"
    else
      failed+=("$check")
    fi
  fi
  rm -f "$out"
done

if [ "${#failed[@]}" -gt 0 ]; then result=red
elif [ "$ran" = 0 ]; then result=skipped
else result=green
fi

tmp="$state/night.json.tmp"
jq -n --arg when "$(date -Iseconds)" --arg commit "$commit" --arg result "$result" --arg log "$log" --arg note "$note" \
  --args '{when: $when, commit: $commit, result: $result, failed: $ARGS.positional, log: $log, note: $note}' \
  "${failed[@]}" > "$tmp" && mv "$tmp" "$state/night.json"

if [ "$result" = red ]; then
  list=$(printf '%s, ' "${failed[@]}")
  echo "Night walk red: ${list%, }. Log: $log"
  exit 1
fi
echo "Night walk $result. Log: $log"
