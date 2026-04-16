# syntax=docker/dockerfile:1.7
# Multi-arch image (arm64 primary — Oracle Ampere A1; amd64 for CI/local).
# Arabic fonts pre-installed as OS packages for deterministic Chromium shaping.

FROM node:20-bookworm-slim AS base
ENV DEBIAN_FRONTEND=noninteractive \
    PUPPETEER_SKIP_DOWNLOAD=true \
    CHROME_BIN=/usr/bin/chromium \
    LANG=ar_SA.UTF-8 \
    LC_ALL=C.UTF-8
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      fonts-noto-sans-arabic \
      fonts-noto-color-emoji \
      fonts-kacst \
      fontconfig \
      ca-certificates \
      tini \
    && fc-cache -f \
    && rm -rf /var/lib/apt/lists/*

# ---- deps stage (install workspace deps) ----
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* tsconfig.base.json tsconfig.json ./
COPY schemas/package.json ./schemas/
COPY src/package.json ./src/
COPY web/package.json ./web/
RUN npm ci --workspaces --include-workspace-root --omit=optional

# ---- build stage ----
FROM deps AS build
COPY schemas ./schemas
COPY src ./src
RUN npm -w @nusuk/schemas run build \
 && npm -w @nusuk/api run build

# ---- runtime stage ----
FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3001 \
    LOG_LEVEL=info
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/schemas/node_modules ./schemas/node_modules
COPY --from=deps /app/src/node_modules ./src/node_modules
COPY --from=build /app/schemas/dist ./schemas/dist
COPY --from=build /app/src/dist ./src/dist
COPY --from=build /app/schemas/package.json ./schemas/
COPY --from=build /app/src/package.json ./src/
COPY package.json ./

# Verify Arabic fonts are present at build time (fails build if not).
RUN fc-list | grep -iE 'noto sans arabic|kacst' | head -5 \
 && fc-list | grep -iE 'noto sans arabic|kacst' > /dev/null

EXPOSE 3001
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "src/dist/index.js"]
