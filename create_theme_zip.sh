#!/usr/bin/env bash
set -euo pipefail

# Creates a ZIP of the WP theme folder for upload via WP Admin
THEME_DIR="wordpress-theme/pepx-research-chemicals"
OUT="pepx-research-chemicals-theme.zip"

if [ ! -d "$THEME_DIR" ]; then
  echo "Theme folder not found: $THEME_DIR"
  exit 1
fi

echo "Creating $OUT from $THEME_DIR"
(cd "$(dirname "$THEME_DIR")" && zip -r "../$OUT" "$(basename "$THEME_DIR")")

echo "Created $OUT"
