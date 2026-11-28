#!/usr/bin/env bash
# quiet.sh <command> [args]: speed is only true on a quiet desk (F-R-1, 11-24): another session's browser or build made the paint read 124-148 ms
# against 76-88 ms alone. Waits up to 90 s for the 1-minute load to drop under half the cores, then runs the command; still busy = says so
# plainly (exit 1) instead of reporting a slow page. Run it inside the graphics card's slot (tools/passes/gpu-slot.sh), so the picture run
# or speed check ahead of it has finished before the load is read.
cores=$(nproc) # QUIET_LOADAVG, QUIET_TRIES and QUIET_SLEEP are for the test
busy=""
for _ in $(seq 1 "${QUIET_TRIES:-45}"); do
  busy=$(awk -v c="$cores" '$1 >= c / 2 {print $1}' "${QUIET_LOADAVG:-/proc/loadavg}")
  [ -z "$busy" ] && break
  sleep "${QUIET_SLEEP:-2}"
done
if [ -n "$busy" ]; then
  echo "the desk is busy (load $busy on $cores cores), so paint times would be wrong. Stop the other work, then run: mise run walk speed-look"
  exit 1
fi
exec "$@"
