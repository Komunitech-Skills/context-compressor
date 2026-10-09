#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
TEST_HOME=$(mktemp -d)
trap 'rm -rf -- "$TEST_HOME"' EXIT
run() {
  env -i HOME="$TEST_HOME" PATH="$PATH" LANG=C.UTF-8 PYTHONDONTWRITEBYTECODE=1 GIT_CONFIG_NOSYSTEM=1 GIT_TERMINAL_PROMPT=0 "$@"
}
run node test/compress.test.mjs
run node test/middleware.integration.mjs
run node test/failure-isolation.mjs
run node test/research-preservation.mjs
run python3 -m unittest discover -s tests -p 'test_*.py'
run python3 scripts/evaluation-v3.py evaluations/v3/plan.json
