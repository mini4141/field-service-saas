#!/usr/bin/env bash
# Builds the Lambda bundle in apps/thumbnailer/build: esbuild bundle + linux-x64 sharp binaries.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf build && mkdir -p build
../../node_modules/.bin/esbuild src/handler.ts --bundle --platform=node --target=node24 \
  --external:sharp --external:@aws-sdk/* --outfile=build/index.js
SHARP_VERSION=$(node -p "require('../../node_modules/sharp/package.json').version")
(cd build \
  && echo '{"name":"thumbnailer-lambda","private":true}' > package.json \
  && npm install --omit=dev --no-audit --no-fund --os=linux --cpu=x64 --libc=glibc --include=optional "sharp@${SHARP_VERSION}" >/dev/null)
echo "lambda bundle ready: apps/thumbnailer/build (sharp ${SHARP_VERSION}, linux-x64)"
