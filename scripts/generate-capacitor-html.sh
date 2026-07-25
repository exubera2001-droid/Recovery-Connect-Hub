#!/usr/bin/env bash
# Generates dist/client/index.html for Capacitor from the Vite client build assets.
# Called by cap:build after the Vite build.

set -e

ASSETS_DIR="dist/client/assets"

# Find the main JS bundle (largest index-*.js in assets/)
MAIN_JS_FILE=$(ls -S "$ASSETS_DIR"/index-*.js 2>/dev/null | head -1)
MAIN_JS_NAME=$(basename "$MAIN_JS_FILE" 2>/dev/null)

# Find the CSS file (app-*.css)
CSS_FILE=$(ls "$ASSETS_DIR"/app-*.css 2>/dev/null | head -1)
CSS_NAME=$(basename "$CSS_FILE" 2>/dev/null)

if [ -z "$MAIN_JS_NAME" ]; then
  echo "Error: Could not find main JS bundle in $ASSETS_DIR"
  exit 1
fi

cat > dist/client/index.html <<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no" />
  <meta name="theme-color" content="#F3EDE2" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <title>ThriveHer</title>
  ${CSS_NAME:+<link rel="stylesheet" href="/assets/$CSS_NAME" />}
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F3EDE2; }
    #root { min-height: 100dvh; }
    @supports (-webkit-touch-callout: none) {
      body { padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); }
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/assets/$MAIN_JS_NAME"></script>
</body>
</html>
HTML

echo "✓ Generated dist/client/index.html (main: assets/$MAIN_JS_NAME)"
