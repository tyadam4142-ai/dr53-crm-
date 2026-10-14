#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 18+ is required. Install it from https://nodejs.org/en/download, then run setup.sh."
  read -r -p "Press Return to close this window..."
  exit 1
fi
NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "This app needs Node.js 18 or newer. Current version: $(node -v)"
  read -r -p "Press Return to close this window..."
  exit 1
fi
mkdir -p data
echo "DR53 AI Sales Agent v0.5.0 is starting at http://127.0.0.1:3053"
echo "Leave this window open while using the app. Press Ctrl+C to stop."
node server.js
