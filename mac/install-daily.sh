#!/usr/bin/env bash
# Install (or remove) the 8am post generator.
#
#   ./mac/install-daily.sh            # install, runs every day at 08:00
#   HOUR=7 ./mac/install-daily.sh     # a different hour
#   ./mac/install-daily.sh --remove
#
# launchd rather than cron: cron on macOS does not survive sleep well, and
# launchd runs a missed job when the Mac wakes instead of skipping the day.

set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LABEL="com.lazyscale.daily"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
HOUR="${HOUR:-8}"
MINUTE="${MINUTE:-0}"

if [ "${1:-}" = "--remove" ]; then
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || launchctl unload "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"
  echo "Removed. No more morning posts."
  exit 0
fi

mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$REPO/content/morning.sh</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>$HOUR</integer>
    <key>Minute</key><integer>$MINUTE</integer>
  </dict>
  <!-- If the Mac was asleep at the scheduled time, run on wake rather than
       skipping the day entirely. -->
  <key>RunAtLoad</key><false/>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/LazyScale-Daily.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/LazyScale-Daily.log</string>
</dict>
</plist>
PLIST

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"

printf 'Installed: every day at %02d:%02d\n' "$HOUR" "$MINUTE"
echo "Test it now:   launchctl kickstart -k gui/$(id -u)/$LABEL"
echo "Remove it:     ./mac/install-daily.sh --remove"
