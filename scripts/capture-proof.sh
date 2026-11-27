#!/usr/bin/env bash
# Usage: scripts/capture-proof.sh <phase1|phase2>
# phase1: drives Playwright headless against the local stack and saves screenshots + logs.
# phase2: same against the cloud endpoints (reads .local/cloud.env written by deploy.sh).
set -euo pipefail
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
PHASE="${1:?usage: capture-proof.sh <phase1|phase2>}"

redact() { sed -E 's/[0-9]{12}/<ACCOUNT_ID>/g'; }

case "$PHASE" in
phase1)
  OUT="$ROOT/proof/phase1-local"
  mkdir -p "$OUT/screenshots" "$OUT/logs" "$OUT/tests"
  "$ROOT/scripts/dev-up.sh"
  export PROOF_DIR="$OUT/screenshots" PW_OUT_DIR="$OUT/tests/playwright"
  rm -f "$PROOF_DIR"/*.png
  (cd apps/web && pnpm exec playwright test)
  (cd apps/mobile && pnpm exec playwright test)
  node scripts/trace-request.mjs "http://localhost:${API_PORT:-4000}" "$LOCAL/logs/api.log" "$LOCAL/logs/worker.log" >"$OUT/logs/request-id-trace.log"
  grep -E 'invoice pdf uploaded|Email to customer|kpis refreshed' "$LOCAL/logs/worker.log" | tail -40 >"$OUT/logs/worker-invoice.log"
  grep -E 'thumbnail created' "$LOCAL/logs/thumbnailer.log" | tail -20 >"$OUT/logs/thumbnailer.log"
  tail -200 "$LOCAL/logs/api.log" >"$OUT/logs/api-tail.log"
  ;;
phase2)
  OUT="$ROOT/proof/phase2-cloud"
  # shellcheck disable=SC1091
  . "$LOCAL/cloud.env"
  export AWS_PROFILE=field-service-saas-deployer AWS_REGION=ap-southeast-2
  mkdir -p "$OUT/screenshots" "$OUT/logs" "$OUT/tests"
  export PW_OUT_DIR="$OUT/tests/playwright-cloud" PROOF_DIR="$OUT/screenshots-raw"
  mkdir -p "$PROOF_DIR"
  (cd apps/web && WEB_URL="$WEB_URL" pnpm exec playwright test)
  (cd apps/mobile && MOBILE_URL="$MOBILE_URL" WEB_URL="$WEB_URL" API_URL="$API_URL" pnpm exec playwright test)
  # cloud-named screenshots required by SPECS section 10
  cp "$PROOF_DIR/09-dashboard-kpis.png" "$OUT/screenshots/01-eks-dashboard.png"
  cp "$PROOF_DIR/06-mobile-complete-photos.png" "$OUT/screenshots/02-cf-mobile-complete.png"
  cp "$PROOF_DIR/07-job-thumbnails.png" "$OUT/screenshots/03-eks-thumbnails.png"
  cp "$PROOF_DIR/08-invoice-pdf.png" "$OUT/screenshots/04-eks-invoice.png"
  ;;
*) echo "unknown phase $PHASE" >&2; exit 1 ;;
esac
echo "proof captured in $OUT"
