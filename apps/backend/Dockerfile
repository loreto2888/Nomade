# syntax=docker/dockerfile:1
# =============================================================================
# Imagen del backend (NestJS). Etapas: deps → build → prod-deps → runtime.
#
# Contexto de build: RAÍZ del repo (monorepo npm, un único package-lock.json).
#   docker build -f apps/backend/Dockerfile -t nomade-backend .
#   docker run --rm -p 3007:3007 \
#     -e DATABASE_URL=postgres://nomade_app:<pwd>@postgres:5432/nomade \
#     -e APP_ORIGIN=http://dell-pc \
#     -v nomade_adjuntos:/data/adjuntos nomade-backend
#
# Exclusiones del contexto: /.dockerignore (raíz). La imagen final contiene
# solo dependencias de producción, apps/backend/package.json y dist/: sin .env,
# sin tests, sin código fuente ni otras apps.
# =============================================================================

ARG NODE_IMAGE=node:24-alpine

# ---- base: manifiestos del monorepo ----------------------------------------
FROM ${NODE_IMAGE} AS base
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

# ---- deps: todas las dependencias del backend (incluye dev, para compilar) --
FROM base AS deps
RUN --mount=type=cache,target=/root/.npm \
    npm ci -w apps/backend --ignore-scripts

# ---- build: compila TypeScript a apps/backend/dist --------------------------
FROM deps AS build
COPY apps/backend/nest-cli.json apps/backend/tsconfig.json apps/backend/tsconfig.build.json apps/backend/
COPY apps/backend/src apps/backend/src
RUN npm run build -w apps/backend \
 && rm -f apps/backend/dist/*.tsbuildinfo

# ---- prod-deps: solo dependencias de producción ----------------------------
FROM base AS prod-deps
# typescript es peer OPCIONAL de @nestjs/swagger (solo lo usa su plugin de
# compilación). Como también es devDependency, npm lo marca "devOptional" y
# --omit=dev lo conserva: se quita a mano (~24 MB).
RUN --mount=type=cache,target=/root/.npm \
    npm ci -w apps/backend --omit=dev --ignore-scripts \
 && rm -rf node_modules/typescript

# ---- runtime ---------------------------------------------------------------
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    PORT=3007 \
    ADJUNTOS_DIR=/data/adjuntos \
    NPM_CONFIG_UPDATE_NOTIFIER=false
WORKDIR /app
# Archivos de root y solo lectura para el proceso (corre como `node`).
COPY --from=prod-deps /app/package.json ./package.json
COPY --from=prod-deps /app/node_modules ./node_modules
COPY apps/backend/package.json apps/backend/package.json
COPY --from=build /app/apps/backend/dist apps/backend/dist

# Directorio de adjuntos con dueño `node` ANTES de `USER node`: un volumen
# nombrado vacío montado aquí hereda estos permisos la primera vez.
RUN mkdir -p /data/adjuntos && chown node:node /data/adjuntos

USER node
EXPOSE 3007
# wget (busybox) viene en la imagen alpine.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://localhost:3007/api/health || exit 1
CMD ["node", "apps/backend/dist/main.js"]
