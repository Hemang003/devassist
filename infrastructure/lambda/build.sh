#!/usr/bin/env bash
# Copyright (c) 2026 Hemang Parmar
#
# Bundles the aggregation Lambda into a deploy-ready zip.

set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "${HERE}"

rm -rf node_modules aggregate_stats.zip
npm install --omit=dev --no-audit --no-fund
zip -qr aggregate_stats.zip aggregate_stats.js node_modules package.json
echo "Built: ${HERE}/aggregate_stats.zip"
