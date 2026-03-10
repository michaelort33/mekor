#!/usr/bin/env bash
set -euo pipefail

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
