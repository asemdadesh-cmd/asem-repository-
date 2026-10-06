#!/usr/bin/env bash
# Builds a clean folder for `netlify deploy` (the Netlify MCP zips the whole
# folder and ignores .gitignore). Photos are NOT included: they live in Netlify
# Blobs — upload them with scripts/upload-photos.mjs.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-/tmp/pink-riot-deploy}"
rm -rf "$OUT"
mkdir -p "$OUT"
tar --exclude=./node_modules --exclude=./dist --exclude=./.git --exclude=./private-assets \
    --exclude=./public/assets/private --exclude=./test-results --exclude=./tests/e2e/out -cf - . | tar -xf - -C "$OUT"
echo "staged in $OUT"
