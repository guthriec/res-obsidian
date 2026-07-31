#!/usr/bin/env bash
set -euo pipefail

# Install / update the res-obsidian plugin in an Obsidian vault.
#
# Usage:
#   ./install.sh /path/to/obsidian/vault
#
# What it does:
#   1. Rebuilds main.js from the current source.
#   2. Copies manifest.json + main.js into <vault>/.obsidian/plugins/res-sync/
#   3. Enables the plugin in <vault>/.obsidian/community-plugins.json
#
# After running, restart Obsidian (or toggle "Res Sync" in Settings → Community plugins).

PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VAULT="${1:-}"

if [ -z "$VAULT" ]; then
  echo "Usage: $0 /path/to/obsidian/vault" >&2
  exit 1
fi
if [ ! -d "$VAULT" ]; then
  echo "Error: vault directory '$VAULT' does not exist" >&2
  exit 1
fi

echo "Building plugin..."
( cd "$PLUGIN_DIR" && npm run build )

TARGET="$VAULT/.obsidian/plugins/res-sync"
mkdir -p "$TARGET"

echo "Copying plugin files to $TARGET"
cp "$PLUGIN_DIR/manifest.json" "$TARGET/"
cp "$PLUGIN_DIR/main.js" "$TARGET/"
[ -f "$PLUGIN_DIR/main.js.map" ] && cp "$PLUGIN_DIR/main.js.map" "$TARGET/"

COMMUNITY="$VAULT/.obsidian/community-plugins.json"
RES_COMMUNITY="$COMMUNITY" node -e "
  const fs = require('fs');
  const p = process.env.RES_COMMUNITY;
  let a = [];
  try { a = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { a = []; }
  if (!Array.isArray(a)) a = [];
  if (!a.includes('res-sync')) a.push('res-sync');
  fs.writeFileSync(p, JSON.stringify(a, null, 2) + '\n');
"

echo "Done. Restart Obsidian (or enable 'Res Sync' in Settings → Community plugins)."
