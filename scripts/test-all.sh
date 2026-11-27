#!/usr/bin/env bash
# Runs every local test layer. Reports land in proof/phase1-local/tests (override with REPORT_DIR).
# Layers: lint+typecheck+build, Jest unit (api, worker), Nest e2e (Supertest), Lambda (Vitest), Vitest web+mobile, Playwright web+mobile.
set -euo pipefail
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
load_env

REPORT_DIR="${REPORT_DIR:-$ROOT/proof/phase1-local/tests}"
mkdir -p "$REPORT_DIR"
export PW_OUT_DIR="$REPORT_DIR/playwright"

echo "== lint + typecheck + build"
pnpm turbo run lint typecheck build 2>&1 | tee "$REPORT_DIR/build-lint-typecheck.log" | tail -5

echo "== compose deps + migrations"
docker compose up -d --wait
pnpm exec prisma migrate deploy

echo "== jest unit (api, worker)"
pnpm --filter @fss/api test
pnpm --filter @fss/worker test

echo "== nest e2e (supertest vs compose postgres/redis)"
pnpm --filter @fss/api test:e2e --forceExit

echo "== vitest (lambda handler, web component, mobile component)"
pnpm --filter @fss/thumbnailer exec vitest run --reporter=default --reporter=junit --outputFile.junit="$REPORT_DIR/lambda-vitest-junit.xml"
pnpm --filter @fss/web exec vitest run --reporter=default --reporter=junit --outputFile.junit="$REPORT_DIR/web-vitest-junit.xml"
pnpm --filter @fss/mobile exec vitest run --reporter=default --reporter=junit --outputFile.junit="$REPORT_DIR/mobile-vitest-junit.xml"

echo "== playwright (needs the running stack)"
pnpm exec playwright install chromium >/dev/null 2>&1 || (cd apps/web && pnpm exec playwright install chromium)
"$ROOT/scripts/dev-up.sh"
(cd apps/web && pnpm exec playwright test)
(cd apps/mobile && pnpm exec playwright test)

cp -f apps/api/reports/*.xml apps/worker/reports/*.xml "$REPORT_DIR/" 2>/dev/null || true
echo "== all test layers passed; reports in $REPORT_DIR"
