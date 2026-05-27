# ── Base: install dependencies ────────────────────────────────────────────────
FROM oven/bun:1.3-alpine AS deps
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install

# ── Development ───────────────────────────────────────────────────────────────
# Source code is provided at runtime via a volume mount in docker-compose.yml.
FROM deps AS dev
EXPOSE 3000
CMD ["bun", "run", "dev"]

# ── Builder (production) ──────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app
COPY . .
# NEXT_PUBLIC_* variables are baked in at build time in Next.js
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN bun run build

# ── Production runner ─────────────────────────────────────────────────────────
FROM oven/bun:1.3-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["bun", "run", "start"]
