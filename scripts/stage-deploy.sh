#!/usr/bin/env bash
# Builds a clean folder for `netlify deploy` (the Netlify MCP zips the whole
# folder and ignores .gitignore): source + resized private photos only — the
# full-size originals in private-assets/ never leave this machine.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-/tmp/pink-riot-deploy}"
rm -rf "$OUT"
mkdir -p "$OUT"
npm run assets >/dev/null
tar --exclude=./node_modules --exclude=./dist --exclude=./.git --exclude=./private-assets \
    --exclude=./test-results --exclude=./tests/e2e/out -cf - . | tar -xf - -C "$OUT"
ls "$OUT/public/assets/private" | wc -l | xargs echo "photos staged:"
echo "staged in $OUT"
