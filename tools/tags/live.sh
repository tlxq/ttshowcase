#!/usr/bin/env bash
# One real round on a deployment: send a tag, check it's hidden, approve it, see it listed, take it down with the
# visitor's key, see it gone, then delete the test row. Tom gets one mail ("test" as the name).
#   tools/tags/live.sh [base url]   default https://ttdevs.com
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
. "$here/env.sh"
BASE="${1:-https://ttdevs.com}" node "$here/live.mjs"
