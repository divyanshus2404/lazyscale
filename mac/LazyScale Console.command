#!/usr/bin/env bash
# Double-click this to start the console.
#
# It runs in Terminal, which already has whatever folder permissions you granted
# it — so unlike the .app bundle, macOS does not have to be persuaded to let it
# read the project folder. Closing the Terminal window stops the server.

cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1
PORT="${PORT:-3100}"

printf '\033]0;LazyScale Console\007'
echo "LazyScale Console"
echo "Project: $(pwd)"
echo

if curl -s -m 2 -o /dev/null "http://localhost:$PORT/"; then
  echo "Already running. Opening the console…"
  open "http://localhost:$PORT/app"
  exit 0
fi

if ! command -v vercel >/dev/null 2>&1; then
  echo "The Vercel CLI is not installed. Run:"
  echo "    npm install -g vercel"
  echo
  read -r -p "Press return to close."
  exit 1
fi

# Open the console once the server answers, without blocking the server itself.
(
  for _ in $(seq 1 90); do
    if curl -s -m 2 -o /dev/null "http://localhost:$PORT/"; then
      open "http://localhost:$PORT/app"
      exit 0
    fi
    sleep 1
  done
) &

echo "Starting… the browser opens on its own. Ctrl-C here stops it."
echo
exec ./run-local.sh
