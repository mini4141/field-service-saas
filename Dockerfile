# One Dockerfile, three targets: docker build --target api|worker|web .
FROM node:24.12-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates curl \
 && rm -rf /var/lib/apt/lists/* && npm install -g pnpm@12.3.4
WORKDIR /repo

FROM base AS build
ARG APP
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY apps ./apps
COPY packages ./packages
COPY prisma ./prisma
# Install only this app's dependency closure (plus the root, which owns the Prisma schema).
RUN pnpm install --frozen-lockfile --filter "@fss/${APP}..." --filter .
RUN pnpm --filter "@fss/${APP}..." build

FROM base AS api
ENV NODE_ENV=production
COPY --from=build /repo /repo
EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]

FROM base AS worker
ENV NODE_ENV=production
COPY --from=build /repo /repo
EXPOSE 4100
CMD ["node", "apps/worker/dist/main.js"]

FROM node:24.12-slim AS web
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /repo
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
