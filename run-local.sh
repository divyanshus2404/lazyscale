#!/usr/bin/env bash
# Run the whole thing locally — site and serverless functions.
#
#   ./run-local.sh
#
# vercel dev does not reliably pick up .env.local on a linked project: it
# resolves environment from the linked Vercel project instead, so anything only
# in the local file never reaches the functions. This reads .env.local and
# exports it into the process, which does work.
set -euo pipefail
cd "$(dirname "$0")"

PORT="${PORT:-3100}"

if [ -f .env.local ]; then
  # An env file is valid shell, so source it directly. Process substitution was
  # tried first and silently exported nothing.
  set -a
  # shellcheck disable=SC1091
  . ./.env.local
  set +a
  echo "loaded .env.local"
else
  echo "no .env.local — using defaults; see LOCAL.md"
  export TENANTS_JSON='{"demo":{"name":"Demo Business","email":"you@example.com","autoreply":false,"threshold":11}}'
  export ADMIN_SECRET='local-dev-secret'
fi

echo "→ http://localhost:${PORT}"
exec vercel dev --listen "$PORT" --yes
