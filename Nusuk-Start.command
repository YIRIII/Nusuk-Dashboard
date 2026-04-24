#!/usr/bin/env bash
# Double-click this file to launch Hadaq Tracker.
# Runs API + Web in one terminal window and opens the browser.

set -e

cd "$(dirname "$0")"

# Kill any conda shim that hijacked `node`.
unset CONDA_DEFAULT_ENV
unset CONDA_PREFIX
conda deactivate 2>/dev/null || true

# Load nvm (installed via Homebrew or standard path).
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm use 20 >/dev/null 2>&1 || nvm install 20
fi

# Sanity check: Node 20 must be active.
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo "missing")
if [ "$NODE_MAJOR" != "20" ]; then
  echo ""
  echo "❌ Node 20 is required (found: $NODE_MAJOR)."
  echo "   Run: nvm install 20 && nvm use 20"
  echo ""
  read -r -p "Press Enter to close..."
  exit 1
fi

echo ""
echo "✓ Node $(node --version) · starting Hadaq…"
echo ""

# Kill any leftover servers from a previous run.
lsof -ti :3001 | xargs kill -9 2>/dev/null || true
lsof -ti :5173 | xargs kill -9 2>/dev/null || true

# Start servers, detect the actual Vite port, then open the browser.
npm start 2>&1 | while IFS= read -r line; do
  printf '%s\n' "$line"
  case "$line" in
    *"Local:"*"http://localhost:"*)
      port=$(echo "$line" | grep -oE 'localhost:[0-9]+' | cut -d: -f2)
      [ -n "$port" ] && open "http://localhost:${port}/" &
      ;;
  esac
done
