#!/usr/bin/env bash
# Runs a .sql file against the live tag store (Neon): tools/tags/schema.sql, or the file you name. Safe to run again.
#   tools/tags/sql.sh [file.sql]
# The database address comes from ~/.config/ttdevs/ttshowcase-tags-db.url (ttpass sync fills it from Pass).
# It is never printed: anything that looks like it is replaced with <hidden> in psql's output.
set -uo pipefail
cd "$(dirname "$0")/../.."
file="${1:-tools/tags/schema.sql}"
key_file="$HOME/.config/ttdevs/ttshowcase-tags-db.url"
[ -r "$key_file" ] || { echo "Couldn't find the tag store's address in ~/.config/ttdevs/ttshowcase-tags-db.url. Run: ttpass sync" >&2; exit 1; }
[ -r "$file" ] || { echo "Couldn't find $file" >&2; exit 1; }
command -v psql >/dev/null || { echo "Couldn't find psql. Install the PostgreSQL client" >&2; exit 1; }
url="$(tr -d '\n' <"$key_file")"
psql -X -v ON_ERROR_STOP=1 -f "$file" "$url" 2>&1 | sed -E 's#postgres(ql)?://[^[:space:]"'"'"']*#<hidden>#g'
exit "${PIPESTATUS[0]}"
