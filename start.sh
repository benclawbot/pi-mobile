#!/bin/bash
# Pi-Mobile startup script
# Serves the PWA on port 5173 with MagicDNS support

cd "$(dirname "$0")/public"
echo "Starting Pi-Mobile on http://localhost:5173"
echo "Access via Tailscale: http://pcmaison.tail94f992.ts.net:5173"
npx serve -l 5173 -s .
