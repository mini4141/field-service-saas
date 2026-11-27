# Support playbook

How to investigate a report on this system, plus three bugs that were actually found and fixed while building it.

## Triage routine

1. **Get a request ID.** Every response carries `x-request-id`. The web and mobile clients (`@fss/api-client`) generate one per request; the API echoes it, stamps it on every log line and puts it in each BullMQ job payload, so the worker logs the same value.
2. **Follow it.** `grep <request-id>` over the api and worker logs (`kubectl logs deploy/api` / `deploy/worker` on EKS, `.local/logs/*.log` locally). `proof/phase1-local/logs/request-id-trace.log` shows a complete example: one `POST /jobs/:id/complete` followed through the API into the `invoice-pdf` and `notifications` processors.
3. **Scope by tenant.** Logs are JSON and include `companyId`, so "customer X says…" becomes `jq 'select(.companyId=="…")'`.
4. **Check the queues** when something is "stuck": failed jobs are kept (`removeOnFail: 500`) and retried 3x with exponential backoff.

## Investigated bug 1: thumbnails never appear (webhook returns 500)

- **Reproduce:** upload two photos from the mobile app, complete the job. The web job page shows "thumbnail pending…" forever. The thumbnailer log repeats `webhook failed: 500`.
- **Root cause:** the API log (after teaching `JsonLogger` to print `Error.message`/`stack`, which previously logged `{}`) said `No tenant in context for JobPhoto.updateMany`. The webhook handler wrapped a Prisma call in `runWithContext(..., () => prisma.db.jobPhoto.updateMany(...))` without awaiting it inside the callback. Prisma queries are lazy: the query only runs when the promise is awaited, which happened after the AsyncLocalStorage scope had ended, so the tenant extension (correctly) refused the query.
- **Fix:** `await` inside an `async` callback (`apps/api/src/internal/internal.module.ts`) and a comment explaining why.
- **Test:** `apps/api/test/flow.e2e-spec.ts` posts a signed thumbnail webhook and asserts the job then exposes a thumbnail URL.

## Investigated bug 2: request log said `200` for a `404`

- **Reproduce:** cross-tenant read of a customer (`GET /customers/:id` with another company's token) returned 404 to the client, but the structured log line said `status: 200`.
- **Root cause:** `LoggingInterceptor` read `res.statusCode` in the `error` branch of the RxJS pipe, which runs before Nest's exception filter has set the response status.
- **Fix:** in the error branch use `err.getStatus()` (fallback 500).
- **Test:** the cross-tenant e2e (`returns 404 for another tenant's records`) covers the 404 itself; the log status was verified against the API log during the run.

## Investigated bug 3: `prisma generate` fails with EPERM while the API is running (Windows)

- **Reproduce:** with the API running locally, `pnpm build` fails in `@fss/shared` at `prisma generate`.
- **Root cause:** Windows keeps the Prisma query-engine DLL locked while a process has it loaded; `generate` cannot replace it.
- **Fix:** `scripts/dev-down.sh --apps-only` before rebuilding, and `scripts/dev-up.sh` always stops app processes first.
- **Test:** `scripts/dev-up.sh` run twice in a row succeeds.
