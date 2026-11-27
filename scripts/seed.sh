#!/usr/bin/env bash
# Loads demo data (Sakura Cleaning). Idempotent.
set -euo pipefail
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
load_env
pnpm exec prisma db seed
