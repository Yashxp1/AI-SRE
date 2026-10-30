# Production Multi-Stage Dockerfile for AI-SRE Target Demo Service
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build

# Static files copy
RUN cp -r src/static dist/static

# Production Runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8000 \
    SERVICE_NAME=order-service \
    SERVICE_VERSION=v2.4.1 \
    ADMIN_API_KEY=sre-demo-secret-key-2026 \
    ALLOW_LOCAL_ADMIN=true \
    CGROUP_MEMORY_LIMIT_MB=512.0

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 8000

# Container healthcheck querying GET /health
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8000/health || exit 1

CMD ["node", "dist/index.js"]
