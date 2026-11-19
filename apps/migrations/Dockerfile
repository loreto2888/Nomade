# syntax=docker/dockerfile:1
# =============================================================================
# Imagen one-shot de migraciones: aplica las pendientes y termina (exit 0;
# exit 1 si algo falla).
#
# Contexto de build: RAÍZ del repo (monorepo npm, un único package-lock.json).
#   docker build -f apps/migrations/Dockerfile -t nomade-migrations .
#   docker run --rm --network <red> \
#     -e DATABASE_URL=postgres://nomade_owner:<pwd>@postgres:5432/nomade nomade-migrations
#
# Exclusiones del contexto: /.dockerignore (raíz). La imagen NO incluye
# seeds-dev/, ningún .env ni código de otras apps.
# =============================================================================

# ---- deps: solo las dependencias de producción del workspace migrations ----
FROM node:24-alpine AS deps
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false
# npm ci valida el lock contra TODOS los workspaces declarados en el
# package.json raíz, así que se copian los package.json de cada uno (solo
# esos archivos, no su código).
COPY package.json package-lock.json .npmrc ./
COPY apps/backend/package.json    apps/backend/package.json
COPY apps/frontend/package.json   apps/frontend/package.json
COPY apps/migrations/package.json apps/migrations/package.json
RUN --mount=type=cache,target=/root/.npm \
    npm ci -w apps/migrations --omit=dev --ignore-scripts

# ---- runtime ----
FROM node:24-alpine AS runtime
ENV NODE_ENV=production \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false
WORKDIR /app
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules
COPY apps/migrations/package.json apps/migrations/package.json
COPY apps/migrations/config/migrate.json apps/migrations/config/migrate.json
COPY apps/migrations/migrations   apps/migrations/migrations

# Archivos de root (solo lectura para el proceso); se ejecuta como `node`.
USER node
WORKDIR /app/apps/migrations
CMD ["npm", "run", "migrate:up"]
