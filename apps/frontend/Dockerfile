# syntax=docker/dockerfile:1
# =============================================================================
# Imagen del frontend (SPA React + Vite servida por nginx). Etapas: deps → build → runtime.
#
# Contexto de build: RAÍZ del repo (monorepo npm, un único package-lock.json).
#   docker build -f apps/frontend/Dockerfile -t nomade-frontend .
#   docker run --rm -p 58080:80 nomade-frontend        # http://localhost:58080
#
# Exclusiones del contexto: /.dockerignore (raíz). El cliente OpenAPI ya está
# generado y versionado en src/api/generated: el build NO necesita Java ni el
# backend. La imagen final contiene solo nginx, nginx.conf y dist/.
# =============================================================================

ARG NODE_IMAGE=node:24-alpine

# ---- deps: dependencias del workspace frontend (incluye dev, para compilar) --
FROM ${NODE_IMAGE} AS deps
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
# --ignore-scripts: evita, entre otros, el postinstall de openapi-generator-cli
# (descarga del .jar), que el build no usa.
RUN --mount=type=cache,target=/root/.npm \
    npm ci -w apps/frontend --ignore-scripts

# ---- build: tsc -b + vite build → apps/frontend/dist ------------------------
FROM deps AS build
ENV CI=true
COPY apps/frontend/index.html apps/frontend/vite.config.ts apps/frontend/vitest.config.ts \
     apps/frontend/eslint.config.js apps/frontend/tsconfig.json apps/frontend/tsconfig.app.json \
     apps/frontend/tsconfig.node.json apps/frontend/
COPY apps/frontend/public apps/frontend/public
COPY apps/frontend/src    apps/frontend/src
RUN npm run build -w apps/frontend

# ---- runtime: nginx sirve los estáticos y hace proxy de /api al backend -----
FROM nginx:alpine AS runtime
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/healthz || exit 1
