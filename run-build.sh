#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
echo "=== Installed dependencies ==="
bun install 2>&1
echo "=== Building ==="
bun run build 2>&1
echo "=== Build complete ==="
