#!/usr/bin/env bash
# Re-download the self-hosted Cairo subsets from Google Fonts.
# Cairo is a variable font, so one file per script covers weights 400–800.
set -euo pipefail
cd "$(dirname "$0")/.."
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
CSS=$(curl -sS -A "$UA" 'https://fonts.googleapis.com/css2?family=Cairo:wght@400..800&display=swap')
echo "$CSS" | awk '/\/\* arabic \*\//{f=1} f&&/url\(/{match($0,/https:[^)]+/);print substr($0,RSTART,RLENGTH);exit}' \
  | xargs -r curl -sS -o assets/fonts/cairo-arabic.woff2
echo "$CSS" | awk '/\/\* latin \*\//{f=1} f&&/url\(/{match($0,/https:[^)]+/);print substr($0,RSTART,RLENGTH);exit}' \
  | xargs -r curl -sS -o assets/fonts/cairo-latin.woff2
ls -la assets/fonts/
echo "Check unicode-range values in assets/css/fonts.css still match the upstream CSS."
