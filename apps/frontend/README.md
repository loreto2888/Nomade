# Nómade · Frontend

SPA de la plataforma Nómade: React + TypeScript + Vite + MUI, React Router (modo datos) y
TanStack Query. Plan completo en [`docs/plan-implementacion.md`](../../docs/plan-implementacion.md) (§7, §10).

## Desarrollo

Todo se ejecuta desde la **raíz del repo** (workspaces npm, un único `package-lock.json`):

```bash
npm install                                   # una vez, en la raíz
npm run full                                  # BD + migraciones + backend (3007) + frontend (5177)
npm run dev:frontend                          # solo Vite, http://localhost:5177 (strictPort)
npm install <paquete> -w apps/frontend        # agregar una dependencia
```

Scripts del workspace (también con `npm run <script> -w apps/frontend`):

| Script                          | Qué hace                                                         |
| ------------------------------- | ---------------------------------------------------------------- |
| `dev` / `preview`               | Servidor de Vite / previsualización del build (ambos en 5177)    |
| `build`                         | `tsc -b` + `vite build` → `dist/`                                |
| `typecheck` · `lint` · `format` | TypeScript estricto · ESLint · Prettier (`format:check` para CI) |
| `test`                          | Vitest + Testing Library (jsdom)                                 |
| `api:generate`                  | Regenera el cliente OpenAPI en `src/api/generated`               |

### Proxy `/api`

El navegador siempre llama a `/api/...` en el mismo origen (sin CORS; cookies `httpOnly`).
En desarrollo Vite redirige `/api` a `BACKEND_URL` (por defecto `http://localhost:3007`). Se puede
cambiar con una variable de entorno o con un `.env` en esta carpeta (ver `.env.example`; los `.env`
reales no se versionan). En despliegue, nginx cumple el mismo papel (`/api/` → `http://backend:3007`).

Sin backend, la tarjeta «Estado del sistema» de Inicio muestra un error amigable.

## Cliente API generado

```bash
npm run dev:backend      # terminal 1: backend en 3007 con Swagger habilitado (apps/backend/.env)
npm run api:generate     # terminal 2, desde la raíz
```

- Requiere **el backend corriendo** (lee `http://localhost:3007/api/docs-json`) y **Java** (el
  generador es un `.jar`; la primera vez descarga la versión fijada en `openapitools.json`).
- `scripts/generar-api.mjs` envuelve a `openapi-generator-cli`: fija su directorio de trabajo en
  `apps/frontend` (si no, usaría la raíz por `PWD`/`INIT_CWD` y crearía un `openapitools.json`
  allí) y normaliza los finales de línea a LF. La salida es determinista: regenerar sin cambios en
  el backend no produce diferencias en git.
- Genera `typescript-axios` en `src/api/generated/` (clases `*Api`, modelos y enums, p. ej.
  `SaludApi.obtenerSalud()`, `SaludDto`, `EstadoSalud`). Ese directorio **se versiona en git**:
  commitea `src/api/generated` **en el mismo commit** que el cambio de controlador/DTO del backend.
  ESLint y Prettier lo ignoran; `.gitattributes` lo marca `linguist-generated` con `eol=lf`.
- `src/api/config.ts` crea la `Configuration` única (`basePath ''`, credenciales) y `crearApi(Api)`,
  que instancia cualquier `*Api` con la instancia axios compartida de `src/api/http.ts`:

  ```ts
  const saludApi = crearApi(SaludApi);
  const { data } = await saludApi.obtenerSalud(); // SaludDto
  ```

- axios lanza error ante respuestas no 2xx. Si un endpoint devuelve un cuerpo útil con error (como
  el 503 de `/api/health`, «API OK / BD error»), léelo de `error.response.data` (ver `src/api/salud.ts`).
- `tsconfig.app.json` tiene `erasableSyntaxOnly: false` porque el código generado usa _parameter
  properties_; en el código propio esa regla la aplica ESLint (`no-restricted-syntax`).

## Docker

La imagen se construye con el **contexto en la raíz del repo** (usa el `.dockerignore` raíz):

```bash
docker build -f apps/frontend/Dockerfile -t nomade-frontend .   # desde la raíz
docker run --rm -p 58080:80 nomade-frontend                     # http://localhost:58080
```

Multi-stage: `npm ci -w apps/frontend` + `vite build` en `node:24-alpine` → `nginx:alpine`
(`nginx.conf`): SPA con fallback a `index.html`, proxy `/api/` a `backend:3007`, gzip, cabeceras de
seguridad, caché larga en `/assets` y `/healthz` para el healthcheck. El build usa el cliente ya
versionado en `src/api/generated` (no necesita Java ni backend). Fuera de la red de Compose, `/api`
responde 502. En `docker-compose.deploy.yml` es el servicio `web` (ver [`deploy/README.md`](../../deploy/README.md)).
