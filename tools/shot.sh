#!/bin/bash
# Screenshot the locally served site in headless Chrome and print console errors.
# usage: tools/shot.sh out.png "query=string" [width,height] [virtual-time-ms]
# Serve first:  python -m http.server 8765 --bind 127.0.0.1
OUT="${1:?output file}"; QUERY="${2:-auto=zen&q=high}"; SIZE="${3:-1920,1080}"; BUDGET="${4:-16000}"
CHROME="${CHROME:-/c/Program Files/Google/Chrome/Application/chrome.exe}"
PROFILE="$(mktemp -d)"            # fresh profile every run: stale cached modules have misled tests before
WIN() { command -v cygpath >/dev/null && cygpath -w "$1" || echo "$1"; }
"$CHROME" --headless=new --no-first-run --user-data-dir="$(WIN "$PROFILE")" --window-size="$SIZE" \
  --hide-scrollbars --enable-logging=stderr --v=0 --autoplay-policy=no-user-gesture-required \
  --virtual-time-budget="$BUDGET" --screenshot="$(WIN "$OUT")" "http://127.0.0.1:8765/?$QUERY" 2>&1 \
  | grep -E "CONSOLE|ERROR: [0-9]+:[0-9]+" | grep -v "AudioContext" | head -20
rm -rf "$PROFILE"
ls -l "$OUT"
