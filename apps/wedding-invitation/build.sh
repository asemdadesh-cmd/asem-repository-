#!/usr/bin/env bash
# Builds dist/index.html (standalone page) and dist/wedding-invitation.zip from invitation.html + assets/.
set -euo pipefail
cd "$(dirname "$0")"
rm -rf dist && mkdir -p dist/site
{
  echo '<!doctype html>'
  echo '<html lang="ar" dir="rtl">'
  echo '<head>'
  echo '<meta charset="utf-8">'
  echo '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
  echo '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}img{max-width:100%}[hidden]{display:none!important}</style>'
  echo '</head>'
  echo '<body>'
  cat invitation.html
  echo '</body>'
  echo '</html>'
} > dist/site/index.html
cp -r assets dist/site/
find dist/site/assets -name '.gitkeep' -delete
cp README-guests.txt dist/site/ 2>/dev/null || true
(cd dist/site && zip -qr ../wedding-invitation.zip .)
echo "built dist/wedding-invitation.zip"
