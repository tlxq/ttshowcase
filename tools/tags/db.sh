#!/usr/bin/env bash
# The tag save on a real Postgres (src/tags/tags.db.test.ts): starts a throwaway Postgres in a container on this PC
# (127.0.0.1 only, a random free port, kept in memory), makes the table from tools/tags/schema.sql, runs the test
# and removes the container. Nothing live is touched: no Neon, no Vercel.
#   tools/tags/db.sh              needs Docker
#   tools/tags/db.sh --if-docker  the whole check's step: without Docker on this PC it says so and passes; on GitHub Docker is a must
# TAGS_DB_IMAGE names another Postgres image; TAGS_DB_ROUNDS the rounds of each race (default 50).
set -euo pipefail
cd "$(dirname "$0")/../.."
image="${TAGS_DB_IMAGE:-postgres:18.7-alpine}"

if ! docker info >/dev/null 2>&1; then
  if [ "${1:-}" = --if-docker ] && [ -z "${CI:-}" ]; then
    echo "tags:db: skipped, Docker isn't running on this PC. GitHub runs it on every PR"
    exit 0
  fi
  echo "Couldn't start the test database. Docker isn't running. Start Docker, then run: mise run tags:db" >&2
  exit 1
fi

name="ttshowcase-tags-db-$$"
password="$(od -An -N16 -tx1 /dev/urandom | tr -d ' \n')"
trap 'docker rm -f "$name" >/dev/null 2>&1 || true' EXIT
docker run -d --rm --name "$name" -e POSTGRES_PASSWORD="$password" -p 127.0.0.1::5432 \
  --tmpfs /var/lib/postgresql "$image" >/dev/null
port="$(docker port "$name" 5432/tcp | head -1 | sed 's/.*://')"

# over TCP: the image first runs a set-up server that listens on its socket only
ready=""
for _ in $(seq 1 150); do
  if docker exec "$name" pg_isready -q -h 127.0.0.1 -U postgres 2>/dev/null; then ready=1; break; fi
  sleep 0.2
done
[ -n "$ready" ] || { echo "Couldn't start the test database. Postgres didn't answer within 30 s. Try again" >&2; docker logs "$name" 2>&1 | tail -20 >&2; exit 1; }

docker exec -i "$name" psql -X -q -v ON_ERROR_STOP=1 -U postgres <tools/tags/schema.sql
echo "tags:db: $(docker exec "$name" psql -X -At -U postgres -c 'show server_version' | sed 's/^/Postgres /') on 127.0.0.1:$port, table from tools/tags/schema.sql"
TAGS_DB_URL="postgres://postgres:$password@127.0.0.1:$port/postgres" node --test src/tags/tags.db.test.ts
