#!/usr/bin/env bash
# ThriveHer — one-shot build and publish.
# Run this from the site directory:
#   cd /home/team/shared/site && bash build-and-publish.sh
set -euo pipefail
cd "$(dirname "$0")"
umask 002

echo "=== Installing dependencies ==="
bun install

echo ""
echo "=== Building ==="
bun run build

echo ""
echo "=== Publishing (taking over port 3000) ==="
bash publish.sh
