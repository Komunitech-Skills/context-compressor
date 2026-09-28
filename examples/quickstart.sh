#!/usr/bin/env bash
# Synthetic onboarding example; run from a reviewed checkout.
set -euo pipefail
umask 077
REPO="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
DEMO_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/rin-readme-context-compressor.XXXXXX")"
WS="$DEMO_ROOT/workspace"
mkdir -p "$WS"
export OPENCLAW_WORKSPACE="$WS"
printf 'Example artifacts: %s\n' "$DEMO_ROOT"
# These exercise real plugin code with synthetic hook contexts, not a live Gateway.
bash "$REPO/test.sh"
echo 'Offline plugin fixture tests passed. Follow README for isolated runtime activation.'
printf 'Quickstart passed: %s (synthetic; see README for scope).\n' "context-compressor"
