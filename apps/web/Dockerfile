# syntax=docker/dockerfile:1.7
# Cache breaker: removed packages/ui and packages/shared
FROM node:26-alpine AS builder

RUN apk add --no-cache --virtual .build-deps \
    python3 make g++ ca-certificates

RUN corepack enable && \
    corepack prepare pnpm@10.33.3 --activate

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_OUTPUT_MODE=standalone \
    NEXT_BUILD_CPUS=1 \
    NEXT_STATIC_GENERATION_MAX_CONCURRENCY=1 \
    NEXT_WEBPACK_MEMORY_OPTIMIZATIONS=true \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    NODE_OPTIONS=--max-old-space-size=4096

ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ARG NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
ARG NEXT_PUBLIC_FILE_IMPORT_BACKEND_URL=http://localhost:3001/api/file-extract
ARG NEXT_PUBLIC_FINAL_REVIEW_BACKEND_URL=http://localhost:3001/api/final-review
ARG TIPTAP_PRO_TOKEN

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL \
    NEXT_PUBLIC_FILE_IMPORT_BACKEND_URL=$NEXT_PUBLIC_FILE_IMPORT_BACKEND_URL \
    NEXT_PUBLIC_FINAL_REVIEW_BACKEND_URL=$NEXT_PUBLIC_FINAL_REVIEW_BACKEND_URL

# Copy manifests first for layer caching.
# pnpm install --frozen-lockfile must see every workspace package manifest
# (apps/* + packages/* per pnpm-workspace.yaml) to resolve the workspace graph,
# even when filtering to @the-copy/web...
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/web/package.json ./apps/web/
COPY packages/ai-orchestration/package.json ./packages/ai-orchestration/
COPY packages/api-client/package.json ./packages/api-client/
COPY packages/breakapp/package.json ./packages/breakapp/
COPY packages/copyproj-schema/package.json ./packages/copyproj-schema/
COPY packages/core-memory/package.json ./packages/core-memory/
COPY packages/error-boundary/package.json ./packages/error-boundary/
COPY packages/export/package.json ./packages/export/
COPY packages/persistence/package.json ./packages/persistence/
COPY packages/prompt-engineering/package.json ./packages/prompt-engineering/
COPY packages/security-middleware/package.json ./packages/security-middleware/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/validation/package.json ./packages/validation/

# Install dependencies after manifests so Docker layer caching remains effective on Railway.
RUN TIPTAP_PRO_TOKEN="$TIPTAP_PRO_TOKEN" sh -c '\
    if [ -z "$TIPTAP_PRO_TOKEN" ]; then \
      echo "Missing or empty TIPTAP_PRO_TOKEN secret"; \
      exit 1; \
    fi && \
    pnpm config set auto-install-peers false && \
    pnpm config set fetch-retries 5 && \
    pnpm config set fetch-retry-mintimeout 10000 && \
    pnpm config set fetch-retry-maxtimeout 120000 && \
    pnpm config set fetch-timeout 120000 && \
    pnpm install --frozen-lockfile --filter @the-copy/web... && \
    sed -i "/^\/\/registry\.tiptap\.dev\/_authToken=/d" .npmrc'

# Copy source for every workspace package web depends on (transitively).
# Required because .npmrc has inject-workspace-packages=true: pnpm copies
# workspace packages into node_modules at install time, but at that moment
# only package.json was on disk (not src/), so node_modules/@the-copy/*
# entries are empty shells. We mirror src/ into node_modules so webpack can
# resolve every workspace import (e.g. @the-copy/security-middleware in
# apps/web/src/app/(main)/editor/src/App.tsx).
COPY apps/web/ ./apps/web/
COPY packages/ai-orchestration/ ./packages/ai-orchestration/
COPY packages/api-client/ ./packages/api-client/
COPY packages/breakapp/ ./packages/breakapp/
COPY packages/copyproj-schema/ ./packages/copyproj-schema/
COPY packages/core-memory/ ./packages/core-memory/
COPY packages/error-boundary/ ./packages/error-boundary/
COPY packages/export/ ./packages/export/
COPY packages/persistence/ ./packages/persistence/
COPY packages/prompt-engineering/ ./packages/prompt-engineering/
COPY packages/security-middleware/ ./packages/security-middleware/
COPY packages/tsconfig/ ./packages/tsconfig/
COPY packages/validation/ ./packages/validation/

# Sync each package's src/ into node_modules/@the-copy/<name>/src so the
# injected (copy-mode) entries reflect the real source after install.
RUN for pkg in ai-orchestration api-client breakapp copyproj-schema core-memory error-boundary export persistence prompt-engineering security-middleware validation; do \
      target="node_modules/@the-copy/$pkg"; \
      if [ -d "$target" ] && [ -d "packages/$pkg/src" ]; then \
        rm -rf "$target/src"; \
        cp -r "packages/$pkg/src" "$target/src"; \
      fi; \
    done

RUN NODE_OPTIONS=--max-old-space-size=4096 pnpm --filter @the-copy/web build

# Minimal runtime stage - only production files
FROM node:26-alpine AS runner

RUN apk add --no-cache ca-certificates && \
    corepack enable && \
    corepack prepare pnpm@10.33.3 --activate

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=5000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nextjs

COPY --chown=nextjs:nodejs --from=builder /app/apps/web/.next/standalone ./
COPY --chown=nextjs:nodejs --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --chown=nextjs:nodejs --from=builder /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 5000

CMD ["node", "apps/web/server.js"]
