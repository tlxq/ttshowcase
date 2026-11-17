# Sourced by the tag tools: loads the live site's settings (DATABASE_URL, TAG_SECRET) from Vercel into this
# shell only. They go to a private temporary file that is deleted at once, never into the repo.
set -euo pipefail
_env=$(mktemp)
trap 'rm -f "$_env"' EXIT
vercel env pull "$_env" --environment="${TAGS_ENV:-production}" --yes >/dev/null 2>&1 ||
  { echo "Couldn't read the site's settings from Vercel. Run: vercel login" >&2; exit 1; }
set -a
# shellcheck disable=SC1090
. "$_env"
set +a
rm -f "$_env"
[ -n "${DATABASE_URL:-}" ] || { echo "Vercel has no DATABASE_URL yet: add Neon under the project's Storage tab" >&2; exit 1; }
