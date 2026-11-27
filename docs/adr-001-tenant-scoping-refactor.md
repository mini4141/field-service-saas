# ADR 001: Central tenant scoping instead of per-query `where: { companyId }`

**Status:** accepted · **Date:** 2026-11-27

## Context
The first draft of the services passed `companyId` into every Prisma query by hand. A forgotten filter leaks another tenant's data, and reviewers have to check every call.

## Decision
Refactor to a Prisma client extension (`packages/shared/src/prisma.ts`) that reads `companyId` from an `AsyncLocalStorage` request context and injects it into `where` (reads/updates/deletes) and `data` (creates). A global NestJS guard fills the context from the JWT and enforces `owner | office | field`. If no tenant is in context the query throws, so a missing scope fails loudly instead of leaking.

Auth, signup and public-quote flows run before a tenant is known; they use `PrismaService.raw` explicitly and then enter `runWithContext({ companyId })`.

## Consequences
- Isolation is one reviewed place plus one e2e test (cross-tenant reads return 404).
- Pitfall: Prisma queries are lazy, so they must be awaited *inside* `runWithContext` (see support playbook, bug 1).
- Nested creates bypass the extension, so nested rows must carry `companyId` explicitly (done for quote items).
- Raw SQL (KPIs) is parameterised with `companyId` by hand.
