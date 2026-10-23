# Build from the repository root: docker build -f apps/careerpilot/Dockerfile .
FROM node:22-bookworm-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /repo
COPY package.json package-lock.json ./
RUN npm ci
COPY apps/careerpilot/package*.json ./apps/careerpilot/
# Release builds must be reproducible; dependency resolution is a separate reviewed step.
RUN test -f apps/careerpilot/package-lock.json || (echo 'Missing CareerPilot lockfile: install dependencies and commit package-lock.json before release.' >&2; exit 1)
RUN npm --prefix apps/careerpilot ci
COPY server ./server
COPY src ./src
COPY index.html ./index.html
COPY public ./public
COPY scripts ./scripts
COPY apps/careerpilot ./apps/careerpilot
RUN npm --prefix apps/careerpilot run build
FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production PORT=3100 HOSTNAME=0.0.0.0 TZ=UTC
WORKDIR /repo
RUN groupadd --system --gid 1001 careerpilot && useradd --system --uid 1001 --gid careerpilot careerpilot
COPY --from=builder --chown=careerpilot:careerpilot /repo/apps/careerpilot/.next/standalone ./
COPY --from=builder --chown=careerpilot:careerpilot /repo/apps/careerpilot/.next/static ./apps/careerpilot/.next/static
COPY --from=builder --chown=careerpilot:careerpilot /repo/apps/careerpilot/public ./apps/careerpilot/public
USER careerpilot
EXPOSE 3100
CMD ["node","apps/careerpilot/server.js"]
