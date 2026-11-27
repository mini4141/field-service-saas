# Contributing

- **Setup:** `pnpm install`, then `scripts/dev-up.sh` (Docker required). `scripts/test-all.sh` runs every local test layer.
- **Branches / commits:** small PRs, Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `infra:`, `chore:`).
- **Quality bar:** `pnpm lint`, `pnpm typecheck` and the tests must be green; CI runs the same. TypeScript is `strict`.
- **Tenancy:** every table has `companyId`. Use `PrismaService.db` (tenant-scoped); `PrismaService.raw` is only for auth/public flows. Always `await` Prisma calls *inside* `runWithContext` callbacks.
- **API contract:** change controllers/DTOs, then `pnpm gen:api-client` and commit `apps/api/openapi.json` + `packages/api-client/src/schema.d.ts`. CI fails on drift. Web and mobile use only the generated client.
- **Slow work** never happens in a controller: emit a domain event, enqueue a BullMQ job, process it in `apps/worker`.
- **Reviews:** check tenant scoping, role guards, that async work is retried safely, and that a test covers the happy path.
- **Secrets:** never commit them; use `.env` (gitignored) and `.env.example`.
