#!/usr/bin/env bash
# Names what's live on ttdevs.com: a git tag vX.Y.Z on master and a GitHub Release whose notes are the merged PR
# titles since the last release (each squash commit is one PR, so its subject is the PR title with its number).
#   tools/release.sh major|minor|patch   the next version after the last tag
#   tools/release.sh vX.Y.Z              an exact version (the first one, or going live = v2.0.0)
# Add --dry-run to print the version and notes without making anything.
set -euo pipefail
cd "$(dirname "$0")/.."
want="${1:-}"; dry="${2:-}"
[ -n "$want" ] || { echo "Usage: tools/release.sh major|minor|patch|vX.Y.Z [--dry-run]" >&2; exit 2; }

git fetch -q --tags origin master
head=$(git rev-parse origin/master)
last=$(git describe --tags --abbrev=0 --match 'v[0-9]*' "$head" 2>/dev/null || true)
case "$want" in
  major|minor|patch)
    [ -n "$last" ] || { echo "No release yet: give the first version, e.g. tools/release.sh v1.0.0" >&2; exit 2; }
    IFS=. read -r a b c <<<"${last#v}"
    case "$want" in major) next="v$((a + 1)).0.0" ;; minor) next="v$a.$((b + 1)).0" ;; patch) next="v$a.$b.$((c + 1))" ;; esac ;;
  v[0-9]*.[0-9]*.[0-9]*) next="$want" ;;
  *) echo "Usage: tools/release.sh major|minor|patch|vX.Y.Z [--dry-run]" >&2; exit 2 ;;
esac
git rev-parse -q --verify "refs/tags/$next" >/dev/null && { echo "$next already exists" >&2; exit 1; }
if [ -n "$last" ] && [ "$(git rev-parse "$last^{commit}")" = "$head" ]; then
  echo "Nothing merged since $last" >&2; exit 1
fi

notes=$(git log --first-parent --format='- %s' ${last:+"$last.."}"$head")
echo "$next (${last:-first release}) on master $(git rev-parse --short "$head"):"
echo "$notes"
[ "$dry" = --dry-run ] && exit 0

gh release create "$next" --target "$head" --title "$next" --notes "$notes" >/dev/null
git fetch -q --tags origin
echo "Released $next: $(gh release view "$next" --json url -q .url)"
