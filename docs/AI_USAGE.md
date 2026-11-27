# AI usage

This repository was built with an AI coding assistant (Claude Code) working from `CLAUDE.md` (engineering rules) and `SPECS.md` (scope).

**What the assistant did:** scaffolded the monorepo, wrote the NestJS API/worker, the Next.js and Expo apps, the Lambda handler, Helm chart, Terraform and scripts, and ran the commands to build, test and deploy.

**How the output was reviewed and tested:**

- Every feature has an automated test at its natural layer (Jest, Supertest e2e against real Postgres/Redis, Vitest, Playwright). Nothing was accepted on "it compiles".
- Proof is captured by scripts from the running system (real queue, real S3-compatible storage, real PDF), not by hand.
- Bugs the assistant introduced were found by those tests and by reading logs; three are written up in [`support-playbook.md`](support-playbook.md).
- Tenant isolation is enforced centrally (Prisma extension) and checked by a cross-tenant e2e test, rather than trusting each query to remember a filter.
- Version choices and swaps are recorded in [`DECISIONS.md`](DECISIONS.md).
