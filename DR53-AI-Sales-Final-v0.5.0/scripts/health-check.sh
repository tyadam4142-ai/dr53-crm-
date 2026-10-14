#!/bin/bash
set -e
curl -fsS http://127.0.0.1:3053/api/health || { echo "DR53 server is not running. Start it with ./scripts/start.sh"; exit 1; }
echo
