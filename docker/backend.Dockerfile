# DevAssist API — multi-stage Dockerfile
# Copyright (c) 2024 Hemang Parmar

# ---- Stage 1: build ---------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

# Install OS deps that node-gyp may need for bcrypt on alpine.
RUN apk add --no-cache python3 make g++

COPY backend/package.json backend/package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

# Prune dev deps for the runtime layer.
RUN npm prune --omit=dev

# ---- Stage 2: runtime -------------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    NODE_OPTIONS=--enable-source-maps

# Run as non-root.
RUN addgroup -S devassist && adduser -S devassist -G devassist

COPY --from=build --chown=devassist:devassist /app/node_modules ./node_modules
COPY --from=build --chown=devassist:devassist /app/dist ./dist
COPY --from=build --chown=devassist:devassist /app/package.json ./package.json

USER devassist
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/api/health || exit 1

CMD ["node", "dist/server.js"]
