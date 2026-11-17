#!/usr/bin/env bash
# Makes the tags table in the site's Neon database (tools/tags/schema.sql). Safe to run again.
set -euo pipefail
cd "$(dirname "$0")"
. ./env.sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f schema.sql
psql "$DATABASE_URL" -At -c "select 'tags table ready: ' || count(*) || ' tags, ' || count(*) filter (where status = 'up') || ' on the wall' from tags"
