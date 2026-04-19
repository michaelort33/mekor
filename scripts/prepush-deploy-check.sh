#!/usr/bin/env bash
set -euo pipefail

required_node_major=22
current_node_major="$(node -p "process.versions.node.split('.')[0]")"

if [[ "$current_node_major" != "$required_node_major" ]]; then
  echo "[prepush] Node $required_node_major is required; re-running checks with Node $required_node_major"
  exec npx -y node@22 /opt/homebrew/lib/node_modules/npm/bin/npm-cli.js run prepush:deploy-check
fi

echo "[prepush] Running lint"
npm run lint

echo "[prepush] Running tests"
npm run test

if [[ -n "${DATABASE_URL:-}" ]]; then
  echo "[prepush] Running native contract verification (DATABASE_URL detected)"
  npm run native:verify
else
  echo "[prepush] Skipping native contract verification (DATABASE_URL not set)"
fi

echo "[prepush] Running Next.js production build"
npm run build

echo "[prepush] Running Vercel build parity check"
rm -rf .vercel/output
npm run build:vercel

echo "[prepush] Deploy validation passed"
