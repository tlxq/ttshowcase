#!/usr/bin/env bash
# Compiles api/*.ts to plain .js the way Vercel ships a function, then loads each one in Node.
# Catches a function that imports a file Vercel won't have (#40 imported "../src/tags/admin.ts" and answered 500 live).
set -euo pipefail
cd "$(dirname "$0")/.."
out=.cache/fn-check
rm -rf "$out"
mkdir -p .cache
npx tsc -p tsconfig.json --noEmit false --allowImportingTsExtensions false --incremental false --declaration false \
  --rootDir . --outDir "$out" >"$out.log" 2>&1 || {
  grep -m3 "error" "$out.log" >&2
  echo "fn-check: couldn't compile api/ the way Vercel does (a relative .ts import needs rewriteRelativeImportExtensions in tsconfig.json)" >&2
  exit 1
}
rm -f "$out.log"
echo '{"type":"module"}' >"$out/package.json"
fail=0
for f in "$out"/api/*.js; do
  if ! node -e 'import(process.argv[1]).then((m) => { if (typeof m.default !== "function" && typeof m.GET !== "function" && typeof m.POST !== "function") process.exitCode = 1 }, (e) => { console.error(e.code || e.message); process.exitCode = 1 })' "$(realpath "$f")"; then
    echo "fn-check: api/$(basename "$f" .js).ts won't load once compiled" >&2
    fail=1
  fi
done
rm -rf "$out"
[ "$fail" = 0 ] && echo "fn-check: every function in api/ loads once compiled"
exit "$fail"
