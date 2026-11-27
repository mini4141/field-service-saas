# Proof index

Everything here is captured by scripts from the running system (`scripts/capture-proof.sh`, `scripts/test-all.sh`), not by hand.

## Phase 1: local (compose + moto + kind, no AWS)

| Artifact | What it proves |
|---|---|
| `phase1-local/screenshots/01-signup.png` | F1 company signup form |
| `02-quote-builder.png` | F3 quote editor, total ¥45,000 computed from line items |
| `03-public-quote-accept.png` | F3 customer-facing `/q/<token>` page (server component + server action) |
| `04-calendar.png` | F4 job dragged onto the week calendar, assigned to Ken |
| `05-mobile-today.png` | F5 Expo web "Today" list showing the scheduled job |
| `06-mobile-complete-photos.png` | F5 two photos uploaded via presigned PUT, ready to complete |
| `07-job-thumbnails.png` | F6 320px thumbnails made by the thumbnailer handler and shown on the web job page |
| `08-invoice-pdf.png` | F7 invoice PDF rendered by the worker (pdfkit), downloaded through a presigned URL |
| `09-dashboard-kpis.png` | F8 KPI tiles (revenue ¥45,000, jobs completed) |
| `10-swagger.png` | OpenAPI docs at `/api/docs` |
| `phase1-local/logs/request-id-trace.log` | one `x-request-id` followed API -> `invoice-pdf` worker -> `notifications` worker |
| `phase1-local/logs/worker-invoice.log` | worker uploading invoice PDFs and logging the simulated email |
| `phase1-local/logs/thumbnailer.log` | thumbnail handler runs |
| `phase1-local/logs/kind-get-all.txt` | api/worker/web (+ in-cluster postgres/redis/moto) running on kind via the Helm chart, reached through Traefik |
| `phase1-local/tests/` | JUnit XML for Jest (unit, e2e), Vitest (Lambda, web, mobile), Playwright HTML reports (web + Expo web) |

Native Android was not run (no emulator available); the field app is verified as an Expo **web** build, which is also what gets deployed.

## Phase 2: AWS and Phase 3: destroy

See `phase2-cloud/` and `phase3-destroy/verify-destroyed.txt` (added when those phases run).
