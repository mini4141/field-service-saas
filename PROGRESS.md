# PROGRESS

Resume from the first unticked item. Current phase: **0 → 1**

## Coverage matrix (SPECS §2)
- [ ] Features end to end (web, API, worker, mobile) — e2e tests
- [ ] Technically challenging work (tenant extension, quote→job→invoice model, S3/Lambda, refactor ADR) — ADR + code
- [ ] Reliability/performance/maintainability (queues + retries, KPI cache, request-ID tracing, typed client) — logs
- [ ] Mentoring/code quality (CONTRIBUTING.md, lint rules, PR template, architecture docs)
- [ ] Support rotations (docs/support-playbook.md + correlation IDs)
- [ ] TypeScript, React, backend frameworks, SQL/Prisma modelling, async architecture — CI
- [ ] Git, PR reviews, CI/CD, automated tests — GitHub Actions
- [ ] NestJS, Prisma, PostgreSQL, AWS (EKS, S3, Lambda), Redis, Next.js, Expo — proof
- [ ] Docker, cloud infra, AI-assisted dev (docs/AI_USAGE.md), multi-tenant B2B

## Phase 0: scaffold
- [ ] Repo layout, README, PROGRESS, DECISIONS, .gitignore, .gitattributes, .env.example, CI workflow

## Phase 1: local (SPECS §9)
- [ ] F1 signup/auth/roles  - [ ] F2 customers  - [ ] F3 quotes + public accept  - [ ] F4 scheduling
- [ ] F5 Expo field app  - [ ] F6 Lambda thumbnails  - [ ] F7 async invoices + notifications  - [ ] F8 dashboard KPIs
- [ ] tests/: Jest, Vitest, Playwright reports
- [ ] screenshots 01-signup, 02-quote-builder, 03-public-quote-accept, 04-calendar, 05-mobile-today, 06-mobile-complete-photos, 07-job-thumbnails, 08-invoice-pdf, 09-dashboard-kpis, 10-swagger
- [ ] logs/worker-invoice.log, logs/request-id-trace.log, logs/kind-get-all.txt
- [ ] scripts/test-all.sh green, CI green on main, proof index complete

## Phase 2: AWS (SPECS §10)
- [ ] aws sts get-caller-identity OK
- [ ] screenshots 01-eks-dashboard, 02-cf-mobile-complete, 03-eks-thumbnails, 04-eks-invoice
- [ ] logs/lambda-thumbnailer.log, logs/kubectl-eks.txt, resources.txt
- [ ] tests/playwright-cloud/

## Phase 3: destroy (SPECS §11)
- [ ] destroy.sh run  - [ ] verify-destroyed.sh clean (proof/phase3-destroy/verify-destroyed.txt)

## Phase 4: write-up
- [ ] docs/PORTFOLIO.md  - [ ] README final  - [ ] pushed
