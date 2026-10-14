#!/bin/bash
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install the current LTS version from https://nodejs.org/en/download and run this script again."
  exit 1
fi
NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "This app needs Node.js 18 or newer. Current version: $(node -v)"
  exit 1
fi
mkdir -p data
chmod +x scripts/start.sh scripts/health-check.sh
cat <<'MSG'

DR53 AI Sales Agent v0.5.0 is ready.
1. Start it with: ./scripts/start.sh
2. Open http://127.0.0.1:3053 (AI Sales Agent opens first).
3. Enter a customer number and use the typed agent or call/message actions.

No .env file, ElevenLabs, Twilio, or paid API credentials are required.
For AI chat and experimental voice conversation, install/run Ollama:
  ollama pull qwen2.5:3b
  ollama serve

Live voice assist is experimental and relies on Mac speaker/mic acoustics; it is not a supported direct Phone-app audio bridge. Test only with your own phone first.
MSG
