# syntax=docker/dockerfile:1.7
# Cache breaker: removed packages/ui and packages/shared
# Node 24 Active LTS (until April 2027, maintenance until April 2028).
# Node 26 is Current (not LTS until October 2026) — avoided per production policy.
# Pinned to 24.10 minor; digest pinned for immunity against tag re-pushes.
# Digest captured from Railway Metal Builder build log on 2026-05-12.
FROM node:26.5-alpine@sha256:e88a35be04478413b7c71c455cd9865de9b9360e1f43456be5951032d7ac1a66 AS builder

RUN apk add --no-cache --virtual .build-deps \
    python3 make g++ ca-certificates

# Direct global install of pnpm: corepack is deprecated in Node 22+ and removed in 25+.
# Pinning pnpm@10.33.3 matches the lockfile's packageManager field.
# NOTE: --mount=type=cache is NOT used here because Railway Metal Builder requires
# a cacheKey-prefixed id (e.g. id=s/${SERVICE_ID}-npm) and rejects bare ids.
# Local/CI builders accept cache mounts but to keep the Dockerfile portable across
# Railway and other build environments we run the install without a cache mount.
RUN npm install -g pnpm@10.33.3

WORKDIR /app

# Railway forwards every Service Variable as a build ARG when declared here.
# Using ARG (not ENV) keeps the value out of build-log display lines:
# Docker resolves ENV at display time but expands $VAR inside RUN at runtime,
# so passing the secret inline below avoids printing it in the build log.
# Ref: https://docs.railway.com/builds/dockerfiles
ARG TIPTAP_PRO_TOKEN

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Copy manifests for every workspace package the lockfile references.
# tsconfig is copied in full (not just package.json) because
# inject-workspace-packages=true makes pnpm copy the package directory into
# node_modules at install time — so base.json/nextjs.json/node.json must
# already be on disk before `pnpm install` runs.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY packages/tsconfig/ ./packages/tsconfig/
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
COPY packages/validation/package.json ./packages/validation/

# Install dependencies. The token is sourced from ARG TIPTAP_PRO_TOKEN, which
# both Railway (forwards Service Variables as build args automatically) and CI
# (must pass `--build-arg TIPTAP_PRO_TOKEN=...`) populate. We do NOT use
# `--mount=type=secret` here because Railway's Metal builder rejects every
# mount type other than `cache`, so a secret mount breaks production builds.
#
# IMPORTANT — log-leak prevention:
# BuildKit prints the full RUN command line in build logs, expanding any
# ${VAR} references against ARG values BEFORE display. Writing the token on
# the RUN line (e.g. `RUN TIPTAP_PRO_TOKEN="$TIPTAP_PRO_TOKEN" sh -c ...`)
# causes the resolved value to appear in production logs. The here-doc form
# below sidesteps this because BuildKit logs only the `RUN <<EOF` opener and
# treats the doc body as data, never substituting ARGs into the displayed
# command. The shell that executes the heredoc inherits the ARG as an env
# variable via Docker's normal ARG-to-shell wiring, so `$TIPTAP_PRO_TOKEN`
# inside the heredoc still resolves correctly at runtime.
#
# pnpm reads the exported value via ${TIPTAP_PRO_TOKEN} expansion in .npmrc
# to fetch @tiptap-pro/* from the private registry.
# NOTE: --mount=type=cache for /root/.local/share/pnpm/store is NOT used here
# because Railway Metal Builder requires a cacheKey-prefixed id and rejects
# bare ones. Removing the cache mount keeps the build portable; Railway will
# re-download the pnpm store on each cold build, which is acceptable cost.
RUN <<EOF
set -e
if [ -z "$TIPTAP_PRO_TOKEN" ]; then
  echo "ERROR: TIPTAP_PRO_TOKEN is not set. Provide it via --build-arg (CI) or Railway service Variables."
  exit 1
fi
pnpm config set auto-install-peers false
pnpm install --frozen-lockfile --filter @the-copy/backend...
EOF

COPY apps/backend/ ./apps/backend/
COPY packages/core-memory/ ./packages/core-memory/

# Build core-memory (tsc emits packages/core-memory/dist), then sync the fresh
# dist/ into node_modules/@the-copy/core-memory/dist. This is required because
# .npmrc has inject-workspace-packages=true, which makes pnpm COPY workspace
# packages into node_modules instead of symlinking. The first install copied
# core-memory before dist/ existed; a second `pnpm install --frozen-lockfile`
# does NOT re-inject — frozen-lockfile assumes nothing changed and skips
# re-copying workspace contents. So we copy dist/ explicitly.
# Finally build the backend bundle and scrub the auth line from every .npmrc.
# Here-doc form used for the same log-leak-prevention reason described above.
RUN <<EOF
set -e
if [ -f apps/backend/.npmrc ]; then
  sed -i "/^\/\/registry\.tiptap\.dev\/:_authToken=/d" apps/backend/.npmrc
fi
pnpm --filter @the-copy/core-memory build
rm -rf node_modules/@the-copy/core-memory/dist
cp -r packages/core-memory/dist node_modules/@the-copy/core-memory/dist
pnpm --filter @the-copy/backend build
if [ -f .npmrc ]; then
  sed -i "/^\/\/registry\.tiptap\.dev\/:_authToken=/d" .npmrc
fi
EOF

FROM node:26.5-alpine@sha256:e88a35be04478413b7c71c455cd9865de9b9360e1f43456be5951032d7ac1a66 AS runner

# Install runtime dependencies only (no build tools)
RUN apk add --no-cache \
    antiword \
    poppler-utils \
    chromium \
    chromium-swiftshader \
    fontconfig \
    font-noto \
    font-noto-arabic \
    font-noto-cjk \
    font-dejavu \
    python3 \
    py3-pip \
    ca-certificates && \
    fc-cache -f && \
    ln -sf /usr/bin/python3 /usr/bin/python && \
    pip3 install --no-cache-dir --break-system-packages defusedxml>=0.7.1

WORKDIR /app/apps/backend

RUN addgroup -S -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs -h /home/backenduser backenduser && \
    mkdir -p /app/apps/backend/tmp/mismatch-reports /app/apps/backend/editor-runtime/proofread-output && \
    chown -R backenduser:nodejs /app /home/backenduser

ENV HOME=/home/backenduser

# Direct global install of pnpm (corepack-free runtime).
# Matches the builder stage and the repository's packageManager pin.
# Cache mount intentionally omitted for Railway compatibility (see builder stage).
RUN npm install -g pnpm@10.33.3

# Copy workspace root files so pnpm --filter can resolve the workspace
# (required by the pre-deploy migration command: pnpm --filter @the-copy/backend run db:migrate)
COPY --chown=backenduser:nodejs --from=builder /app/package.json /app/package.json
COPY --chown=backenduser:nodejs --from=builder /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --chown=backenduser:nodejs --from=builder /app/pnpm-lock.yaml /app/pnpm-lock.yaml

# Copy built artifacts from builder (single efficient layer)
COPY --chown=backenduser:nodejs --from=builder /app/node_modules /app/node_modules
COPY --chown=backenduser:nodejs --from=builder /app/apps/backend/ /app/apps/backend/
COPY --chown=backenduser:nodejs --from=builder /app/packages/core-memory/ /app/packages/core-memory/

RUN sed -i 's/\r$//' /app/apps/backend/docker-entrypoint.sh && \
    chmod +x /app/apps/backend/docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3001
ENV FILE_IMPORT_HOST=0.0.0.0
ENV FILE_IMPORT_PORT=3001
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROME_DEVEL_SANDBOX=/usr/lib/chromium/chrome-sandbox
ENV PUPPETEER_DISABLE_SANDBOX=false
ENV PUPPETEER_ALLOW_SANDBOX_FALLBACK=true
ENV ANTIWORD_PATH=/usr/bin/antiword
ENV ANTIWORDHOME=/usr/share/antiword
ENV PYTHONUTF8=1

USER backenduser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD ["node", "scripts/verify-runtime-health.mjs"]

ENTRYPOINT ["/app/apps/backend/docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
