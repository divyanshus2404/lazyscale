#!/usr/bin/env bash
# Generate the morning post, put the caption on the clipboard, and say so.
#
# Run by launchd every morning (see mac/install-daily.sh), or by hand:
#   ./content/morning.sh
#
# It stops at the clipboard on purpose. Posting to a LinkedIn company page needs
# the Community Management API, which is partner-approved rather than self-serve,
# and driving linkedin.com with a script would breach their User Agreement. So
# the last step is yours: it is one paste and one click.

set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1

LOG="$HOME/Library/Logs/LazyScale-Daily.log"
mkdir -p "$(dirname "$LOG")"
exec >> "$LOG" 2>&1
echo "--- $(date '+%F %T') ---"

# launchd gives a job almost no PATH, so python3 and Chrome need finding.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

if ! command -v python3 >/dev/null 2>&1; then
  osascript -e 'display notification "python3 not found" with title "LazyScale"' || true
  echo "python3 missing"; exit 1
fi

OUTPUT="$(python3 content/make-post.py 2>&1)"
STATUS=$?
echo "$OUTPUT"

if [ $STATUS -ne 0 ]; then
  osascript -e 'display notification "Could not generate today’s post. See the log." with title "LazyScale"' || true
  exit 1
fi

IMG="$(echo "$OUTPUT" | sed -n '1p')"
TXT="$(echo "$OUTPUT" | sed -n '2p')"
WHAT="$(echo "$OUTPUT" | sed -n '3p')"

# The caption goes straight to the clipboard, so posting is paste-and-go.
[ -f "$TXT" ] && pbcopy < "$TXT"

osascript -e "display notification \"Caption copied. ${WHAT//\"/}\" with title \"LazyScale: today's post is ready\" subtitle \"$(basename "$IMG")\"" || true
echo "ready: $IMG"
