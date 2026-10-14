#!/bin/bash
set -e
cd "$(dirname "$0")/.."
if ! command -v node >/dev/null 2>&1; then echo "Install Node.js 18+ from https://nodejs.org/en/download"; exit 1; fi
NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [ "$NODE_MAJOR" -lt 18 ]; then echo "This app needs Node.js 18 or newer. Current version: $(node -v)"; exit 1; fi
mkdir -p data
echo "Starting DR53 AI Sales Agent v0.5.0 on this Mac."
echo "Open: http://127.0.0.1:3053 (AI Sales Agent opens first)"
echo "Keep this Terminal window open; press Ctrl+C to stop. Voice Assist requires Ollama and Chrome microphone permission."
node server.js
