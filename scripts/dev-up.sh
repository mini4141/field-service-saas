#!/usr/bin/env bash
# Starts the whole stack locally: compose (postgres, redis, moto) + api, worker, web, mobile web, thumbnailer watcher.
# No AWS calls: moto stands in for S3 and a watcher runs the Lambda handler.
set -euo pipefail
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
load_env

echo "== dependencies + build"
[ -d node_modules ] || pnpm install --frozen-lockfile
# Browser-facing URLs are baked into the web/mobile builds.
export EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL:-http://localhost:${API_PORT:-4000}}"
pnpm turbo run build --filter=@fss/api --filter=@fss/worker --filter=@fss/web
(cd apps/mobile && CI=1 pnpm exec expo export --platform web --clear >"$LOCAL/logs/expo-export.log" 2>&1)

echo "== compose"
docker compose up -d --wait

echo "== database + bucket"
pnpm exec prisma migrate deploy
pnpm exec prisma db seed
pnpm --filter @fss/thumbnailer exec tsx src/local-init.ts

echo "== services"
"$ROOT/scripts/dev-down.sh" --apps-only >/dev/null 2>&1 || true
export API_INTERNAL_URL="http://localhost:${API_PORT:-4000}"
export API_WEBHOOK_URL="$API_INTERNAL_URL"
start_bg api node apps/api/dist/main.js
start_bg worker node apps/worker/dist/main.js
start_bg web node node_modules/next/dist/bin/next start apps/web -p "${WEB_PORT:-3000}"
start_bg mobile node node_modules/serve/build/main.js -s apps/mobile/dist -l "${MOBILE_PORT:-8081}"
start_bg thumbnailer node node_modules/tsx/dist/cli.mjs apps/thumbnailer/src/watcher.ts

wait_http "http://localhost:${API_PORT:-4000}/healthz"
wait_http "http://localhost:4100/healthz"
wait_http "http://localhost:${WEB_PORT:-3000}/login"
wait_http "http://localhost:${MOBILE_PORT:-8081}/"
echo "== up: web :${WEB_PORT:-3000}  mobile :${MOBILE_PORT:-8081}  api :${API_PORT:-4000} (docs /api/docs)"
echo "   demo logins: owner@sakura.test / office@sakura.test / ken@sakura.test  (password123)"
