# Decisions (date · decision · reason)

- 2026-11-27 · Pinned NestJS 11, Prisma 6, Next 15.5, Expo SDK 54, TypeScript 5.9, Jest 29, Vitest 3 · CLAUDE.md names NestJS 11 / Next 15+; newer majors on npm (Prisma 7, TS 7, Nest 12) are riskier for a breadth-first build.
- 2026-11-27 · `.npmrc` uses `node-linker=hoisted` · Expo/Metro and React Native resolve poorly through pnpm's symlinked store.
- 2026-11-27 · Added `packages/shared` (tenant context, Prisma extension, queue names, S3 helper, logger) · API and worker both need the same code; SPECS layout lists only three packages.
- 2026-11-27 · Local tool versions: node 24.12.0, pnpm 12.3.4, docker 29.7.2, kind 0.33.0, kubectl 1.36.1, helm 4.3.2, terraform 1.17.2, aws-cli 2.42.1 · all preinstalled.
