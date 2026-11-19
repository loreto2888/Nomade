# Plan de implementación — Plataforma Nómade

> Estado: **borrador v0.3 (19-11-2026)** · Autor: Coworlabs · Decisiones tomadas en [§0](#0-registro-de-decisiones) · Pendientes en [§16](#16-preguntas-abiertas).
>
> Fuentes:
> - Prototipo navegable actual (se moverá a `apps/prototipo`: `index.html`, `app.js`, `screens/`, `server.js`, `styles.css`, `draft-schemas.js`, `prototype-actions.js`).
> - `docs/Coworlabs_Propuesta_Integral_Levantamiento_Arquitectura_Aprobacion_18112026Respuestas.docx` (propuesta v2.0 con respuestas del cliente Q01–Q11).
> - `puertos.md` (inventario de puertos de la máquina de desarrollo).
>
> El prototipo es **referencia visual y funcional**; la aplicación se construye desde cero. Ante una discrepancia funcional, prevalece la propuesta (secciones 0–15 y anexos) por sobre el prototipo, salvo las decisiones de §0.

---

## 0. Registro de decisiones

| # | Fecha | Decisión |
|---|---|---|
| D-01 | 18-11-2026 | Puertos de desarrollo: backend **3007**, frontend **5177**, PostgreSQL **5437**. (5437 también lo declara `Coworlabs/integracion-wom`; se acepta: no se ejecutarán a la vez. Parametrizado con `POSTGRES_PORT`.) |
| D-02 | 18-11-2026 | Solo **2 roles**: `admin` y `usuario`. El administrador tiene **todos** los permisos. |
| D-03 | 18-11-2026 | El rol `usuario` puede hacer **todo menos administración**: no gestiona usuarios (P25), auditoría (P26), parámetros (P27) ni migración/integraciones (P23). Sí puede aprobar. Todos ven todas las obras (sin acceso por obra por ahora). |
| D-04 | 18-11-2026 | UI con **MUI** (Material UI + MUI X Community: DataGrid, Date Pickers, Charts). Sin Material React Table. |
| D-05 | 18-11-2026 | Migraciones con **node-pg-migrate** en `apps/migrations` (workspace npm, Node). |
| D-06 | 18-11-2026 | Prototipo actual se mueve a **`apps/prototipo`** (referencia ejecutable, fuera de los workspaces). |
| D-07 | 18-11-2026 | Despliegue en **servidor Linux local**, accesible solo en la red local como **`http://dell-pc`** (HTTP, puerto 80). HTTPS queda como mejora posterior. **Reemplazada por D-16** (Cloudflare Tunnel, HTTPS, puerto 5178). |
| D-08 | 18-11-2026 | **Fase 0 completada**: monorepo conectado, `npm run full`, cliente OpenAPI generado y versionado, imágenes con contexto raíz y compose de despliegue verificado. Quedan confirmados por la implementación: TypeORM (C1), migraciones SQL (C3), versiones de §2 fijadas en el lockfile (C4) y generador `typescript-axios` (C5). |
| D-09 | 19-11-2026 | **Alcance (A1–A7)**: sistema productivo por fases (las fases 0–3 sirven de demostración); se respeta el orden de §11; navegación según Anexo D; cada documento tiene su propio estado `borrador` (sin entidad genérica de borradores); las pantallas sin reglas (P23, P27, P29) se **muestran como «pendientes»**; una sola empresa (Constructora Nómade); sin fecha objetivo para la primera versión en el servidor. |
| D-10 | 19-11-2026 | **Autoaprobación (B1)**: el `usuario` **no** puede aprobar lo que él mismo creó (OC, lote de pago, EEPP); el `admin` **sí** puede. |
| D-11 | 19-11-2026 | **Usuarios y sesión (B2–B8)**: los administradores se definen al crear usuarios; la importación masiva (P24) es **solo admin**; inicio de sesión con **correo**; recuperación de contraseña por restablecimiento del admin con contraseña temporal (correo cuando haya SMTP); sesión de 8 h máximo y 30 min de inactividad; los usuarios solo se desactivan (no se eliminan); un admin no puede quitarse el rol ni desactivarse y siempre queda al menos un admin activo. |
| D-12 | 19-11-2026 | **Idioma y UI (C2, C6–C9)**: código **todo en español** (dominio y nombres técnicos propios; se conservan en inglés solo los identificadores impuestos por librerías y frameworks); UI en español de Chile; actualización compartida con refetch + aviso de conflicto 409 (SSE posterior); exportación Excel (`exceljs`) y PDF (`pdfmake`); los códigos P01–P31 solo aparecen en documentación; **con modo oscuro** (tema claro y oscuro). |
| D-13 | 19-11-2026 | **Base de datos (D1–D4)**: PK **`bigint generated always as identity`**; montos en **CLP y UF** (UF con su valor diario para convertir a CLP); borrado lógico en maestros y nunca en documentos financieros (anulación/reversa); no se migran datos del SQLite del prototipo. |
| D-14 | 19-11-2026 | **OpenAPI (E1–E4)**: el único consumidor del cliente generado es el frontend; Swagger deshabilitado en el servidor (`SWAGGER_ENABLED=false`); **no** se verifica en CI que el cliente commiteado coincida con el backend; la regeneración es manual (`npm run api:generate`). |
| D-15 | 19-11-2026 | **Entorno local (F1–F2)**: `npm run full` no baja PostgreSQL al detenerse; el desarrollo es **solo en Windows** (no se exige compatibilidad con macOS/Linux en los scripts de desarrollo). |
| D-16 | 19-11-2026 | **Servidor (G1–G10)** — reemplaza parcialmente D-07: `dell-pc` ya tiene Docker y Docker Compose; el acceso es **solo mediante Cloudflare Tunnel** (ya configurado), sin acceso directo desde equipos de la red; el servicio web se publica en el puerto **5178** (no 80; el 5177 queda para Vite en desarrollo, que corre en la misma máquina); el servidor tiene salida a internet y se despliega con `git pull` + `--build`; respaldos diarios con retención de 30 días (destino externo por definir); encendido 24/7 **sin UPS**; un solo ambiente; **HTTPS desde el inicio** (terminado por Cloudflare); adjuntos PDF/JPG/PNG/XLSX/CSV hasta 20 MB, sin antivirus en la primera etapa. |
| D-17 | 19-11-2026 | **Reglas de negocio (H13, H14, H16, H17)**: solo el admin modifica datos bancarios de proveedores (auditado); los jefes de obra usan la plataforma desde terreno vía el túnel, por lo que la UI debe ser **responsive para celular**; los catálogos existen en Laudus/Excel y se pedirán al cliente; folios con **correlativo global por tipo de documento**. |
| D-18 | 19-11-2026 | **Repositorio y proceso (I1–I5)**: commits directos a `main`, sin ramas ni PR salvo pedido explícito (`AGENTS.md`); CI con GitHub Actions; pruebas de reglas financieras, autorización y concurrencia obligatorias, más E2E de los flujos UAT; **mensajes de commit en español**; el `.docx` de la propuesta **se versiona** en git. |
| D-19 | 19-11-2026 | **Prototipo (J1–J4)**: se conserva solo «Continuar en» (se eliminan la franja «Prototipo» y las notas «Sobre esta pantalla»); se mantienen sus validaciones (contraseña ≥ 12, textos 180/1000); el dashboard P02 parte con los indicadores de su ficha; `apps/prototipo` se elimina tras la fase 9. |
| D-20 | 19-11-2026 | **Fase 1 completada — Identidad y acceso** (P01, P25, P26 consulta): migración `identidad` (`usuario`, `sesion`, `auditoria_evento` append-only; `idempotencia` y `token_recuperacion` no se crean, la recuperación es por restablecimiento del admin); módulos `auth`, `usuarios`, `auditoria`, `sesiones`; `SessionGuard` + `AutorizacionGuard` globales, mapa de permisos (`oc.aprobar`, `lote.aprobar`, `eepp.aprobar` ya declarados) y política de autoaprobación D-10 como helper reutilizable; hash argon2id con `node:crypto` (Node ≥ 24.7); contraseñas temporales generadas por el servidor (se muestran una vez); frontend con login, cambio obligatorio de contraseña, rutas protegidas, `RoleGate`, P25 y P26 con DataGrid, tema claro/oscuro con preferencia por usuario y menú con P23/P27/P29 «pendientes». D-16 aplicado a `.env.deploy.example` y `docker-compose.deploy.yml` (`WEB_PORT=5178`, `APP_ORIGIN=https://nomade.coworlabs.cl`, `COOKIE_SECURE=true`). |

## 1. Objetivo y alcance

Construir la plataforma web multiusuario de administración y control financiero de obras de Constructora Nómade, que **reemplaza a Laudus** en los procesos que la empresa usa (OC, facturas, libros contables — Q01) y cubre el ciclo:

- Obra/centro de costo → presupuesto aprobado (versiones, partidas).
- Cotización → OT → OC parciales por porcentaje → factura(s) → lote de pago → pago confirmado.
- OC de materiales → aprobación → recepción → factura → pago.
- EEPP → factura de venta → cobranza.
- Mano de obra quincenal, rendiciones (Rindegastos se mantiene), prorrateos.
- Movimientos, conciliación/excepciones, resultado por obra, cierres de obra y anual, reportes.
- Usuarios con rol **administrador** y **usuario** (D-02, D-03); auditoría transversal; control de concurrencia.

Fuera de alcance de la primera versión (salvo que §16 diga lo contrario): emisión de DTE ante el SII, integración bancaria por API, IA documental (P29), MFA, perfiles finos y acceso por obra, multi-empresa.

## 2. Decisiones técnicas

| Tema | Decisión | Nota |
|---|---|---|
| Runtime | Node.js 24 LTS | Igual que el prototipo. Fijar con `engines` y `.nvmrc`. |
| Gestor de paquetes | npm con **workspaces** (`apps/backend`, `apps/frontend`, `apps/migrations`) | Un solo `package-lock.json` en la raíz. `apps/prototipo` queda fuera (tiene su propio lockfile). |
| Backend | NestJS (última estable) + TypeScript estricto | `apps/backend`. |
| Acceso a datos | TypeORM con `synchronize: false` | El esquema **solo** lo cambian las migraciones (§6). Soporta `@VersionColumn` y bloqueos `FOR UPDATE`. |
| Base de datos | PostgreSQL 18 | Esquema `nomade`, nombres `snake_case`. |
| Migraciones | **node-pg-migrate** en `apps/migrations` | Migraciones SQL (o TS cuando haga falta lógica), bloqueo con *advisory lock*, se ejecuta con Node en local y en un contenedor one-shot en el servidor. |
| Frontend | React + TypeScript + Vite | `apps/frontend`. |
| UI | **MUI**: Material UI + MUI X Community (DataGrid, Date Pickers, Charts) | Solo componentes gratuitos. |
| Estado servidor | TanStack Query sobre el cliente generado | Caché, reintentos, invalidación tras mutaciones. |
| Ruteo | React Router (modo datos) | Rutas en español por módulo (§10.3). |
| Formularios | react-hook-form + zod | El backend sigue siendo la autoridad de validación. |
| Contrato API | `@nestjs/swagger` → **openapi-generator-cli** (`typescript-axios`) leyendo **la URL del backend** | Fuentes generadas versionadas en git (§7). |
| Autenticación | Sesión opaca en BD + cookie `httpOnly` | Permite revocar sesiones e inactividad (P01, P25). Sin JWT en el navegador. |
| Autorización | 2 roles (`admin`, `usuario`) con guard `@Roles` + mapa de permisos por acción en código | El mapa permite pasar a perfiles finos más adelante sin reescribir controladores. |
| Tareas programadas / colas | `@nestjs/schedule` + **pg-boss** (cola sobre PostgreSQL) | Alertas diarias, importaciones, reportes. Sin Redis. |
| Archivos adjuntos | Volumen local en el servidor + metadatos en BD | Descarga solo por API autenticada. |
| Logs | `nestjs-pino` (JSON a stdout) con id de correlación | Rotación por Docker. |
| Pruebas | Backend: **Vitest** + Supertest contra PostgreSQL real (Nest 12 es solo ESM; su CLI ya usa Vitest) · Frontend: Vitest + Testing Library · E2E: Playwright | §12. |
| Versiones base (fase 0) | NestJS 12.5, TypeORM 1.1, React 19.3, Vite 8.3, MUI 9.5, react-router 8.5, TanStack Query 5, node-pg-migrate 9.0, openapi-generator 7.27, **TypeScript 6.0** | TS 7 queda pendiente hasta que typescript-eslint y el plugin de Swagger lo soporten. |
| Orquestación local | `concurrently` desde el `package.json` raíz (`npm run full`) | §5. |
| Contenedores | Docker Compose: uno para la BD local y uno para el despliegue completo | §8. |

## 3. Estructura del repositorio

```
/
├─ package.json                 # workspaces + scripts raíz (npm run full, etc.)
├─ package-lock.json
├─ .nvmrc  .gitattributes  .editorconfig  .gitignore
├─ .env.example                 # variables para desarrollo local
├─ docker-compose.yml           # LOCAL: solo PostgreSQL
├─ docker-compose.deploy.yml    # SERVIDOR dell-pc: postgres + migrations + backend + web (+ backup)
├─ .env.deploy.example          # variables del servidor (sin secretos reales)
├─ apps/
│  ├─ backend/                  # NestJS
│  │  ├─ src/
│  │  │  ├─ main.ts  app.module.ts
│  │  │  ├─ config/             # @nestjs/config + validación de env
│  │  │  ├─ common/             # guards, roles/permisos, interceptores, filtros, paginación, errores
│  │  │  ├─ database/           # DataSource TypeORM, helpers de transacción
│  │  │  └─ modules/            # un módulo por dominio (§9.1)
│  │  ├─ test/                  # integración / e2e de API
│  │  └─ Dockerfile
│  ├─ frontend/                 # React + Vite + MUI
│  │  ├─ src/
│  │  │  ├─ api/generated/      # ⚠ generado por openapi-generator-cli (en git)
│  │  │  ├─ api/                # instancia axios, configuración, hooks de TanStack Query
│  │  │  ├─ app/                # router, providers, tema MUI, layout
│  │  │  ├─ components/         # DataTable, MoneyField, RutField, StatusChip, ConflictDialog…
│  │  │  ├─ features/<modulo>/  # páginas y componentes por dominio
│  │  │  └─ lib/                # formato CLP, fechas, RUT, permisos
│  │  ├─ openapitools.json      # configuración y versión fija del generador
│  │  ├─ nginx.conf             # usado por la imagen de despliegue
│  │  └─ Dockerfile
│  ├─ migrations/               # node-pg-migrate
│  │  ├─ migrations/            # 1731900000000_base.sql, …  (-- Up Migration / -- Down Migration)
│  │  ├─ seeds-dev/             # datos ficticios solo para desarrollo
│  │  ├─ docker/init-roles.sh   # crea roles nomade_owner / nomade_app al inicializar postgres
│  │  ├─ package.json           # scripts migrate, create, seed
│  │  └─ Dockerfile             # node:24-alpine, ejecuta "migrate up" y termina
│  └─ prototipo/                # prototipo actual (git mv), referencia; fuera de workspaces
├─ docs/
│  ├─ plan-implementacion.md    # este documento
│  └─ Coworlabs_Propuesta_…docx
└─ puertos.md
```

## 4. Puertos

| Servicio | Desarrollo local (host) | Despliegue (servidor `dell-pc`) |
|---|---|---|
| Backend NestJS | **3007** | 3007 solo en la red interna de Docker (no se publica) |
| Frontend Vite (dev server) | **5177** | — (se sirve compilado por nginx) |
| PostgreSQL | **5437** → 5432 | 5432 solo red interna; opcional `127.0.0.1:5437` para mantención |
| Web (nginx: estáticos + proxy `/api`) | — | **5178** → publicado mediante Cloudflare Tunnel (HTTPS) (D-16) |
| Prototipo (`apps/prototipo`) | 3000 (por defecto del prototipo) | — |

Todos los puertos se parametrizan por variables (`BACKEND_PORT`, `FRONTEND_PORT`, `POSTGRES_PORT`, `WEB_PORT`) con esos valores por defecto. Nota: `puertos.md` registra 5437 en `Coworlabs/integracion-wom`; no levantar ambos a la vez (D-01).

En desarrollo, Vite hace **proxy** de `/api` → `http://localhost:3007`, de modo que el navegador ve un solo origen (cookies `SameSite=Strict` sin CORS). En el servidor, nginx cumple el mismo papel.

## 5. Scripts raíz (`package.json`)

```jsonc
{
  "name": "nomade",
  "private": true,
  "workspaces": ["apps/backend", "apps/frontend", "apps/migrations"],
  "engines": { "node": ">=24" },
  "scripts": {
    "full": "npm run db:up && npm run db:migrate && concurrently -k -n backend,frontend -c blue,green \"npm:dev:backend\" \"npm:dev:frontend\"",
    "dev:backend": "npm run start:dev -w apps/backend",
    "dev:frontend": "npm run dev -w apps/frontend",

    "db:up": "docker compose up -d --wait postgres",
    "db:migrate": "npm run migrate:up -w apps/migrations",
    "db:migrate:down": "npm run migrate:down -w apps/migrations",
    "db:migration:create": "npm run migrate:create -w apps/migrations --",
    "db:seed": "npm run seed -w apps/migrations",
    "db:down": "docker compose down",
    "db:reset": "docker compose down -v && npm run db:up && npm run db:migrate",

    "api:generate": "npm run api:generate -w apps/frontend",

    "prototipo": "npm --prefix apps/prototipo start",

    "build": "npm run build --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "test:e2e": "npm run test:e2e -w apps/frontend"
  },
  "devDependencies": { "concurrently": "…" }
}
```

- `npm run full`: levanta PostgreSQL (espera el healthcheck), aplica migraciones con node-pg-migrate y luego inicia backend (watch) y frontend (Vite) en paralelo con `concurrently`; `-k` detiene ambos si uno cae. La BD queda corriendo al salir (se baja con `npm run db:down`).
- Los scripts de desarrollo deben funcionar en **Windows** (D-15); los del servidor, en **Linux**. Variables leídas desde `.env` (`dotenv-cli` donde haga falta).

## 6. Base de datos y migraciones (`apps/migrations`)

### 6.1 node-pg-migrate

- Workspace npm con dependencia `node-pg-migrate` y `pg`. Lee `DATABASE_URL` (rol `nomade_owner`).
- Archivos en `apps/migrations/migrations/` con prefijo de timestamp, en **SQL** con secciones `-- Up Migration` / `-- Down Migration`; se permite `.ts` cuando la migración requiera lógica.
- Tabla de control `nomade.pgmigrations`; *advisory lock* evita ejecuciones simultáneas (útil si el contenedor de despliegue se reinicia).
- Scripts del workspace: `migrate:up`, `migrate:down`, `migrate:create` (crea archivo SQL), `seed` (ejecuta `seeds-dev/` con una tabla de control separada `pgseeds`, **solo** local).
- Una migración publicada en `main` no se modifica; se corrige con otra nueva.

### 6.2 Convenciones del esquema

- Esquema `nomade`; tablas y columnas `snake_case`; PK `bigint generated always as identity` (D-13); `created_at/created_by/updated_at/updated_by`; columna `version integer` en todo documento editable (control optimista).
- Montos CLP en `numeric(18,0)`; montos en UF en `numeric(18,4)` con su moneda explícita y conversión a CLP por el valor UF del día (tabla de valores UF); porcentajes en `numeric(7,4)`; IVA parametrizado (no constante en código).
- Dos roles de BD creados por `docker/init-roles.sh` al inicializar PostgreSQL (contraseñas desde variables de entorno): `nomade_owner` (migraciones, DDL) y `nomade_app` (backend, solo DML). La tabla de auditoría solo permite `INSERT`/`SELECT` a `nomade_app` (append-only real).
- Nunca se ponen contraseñas ni datos reales en migraciones. Datos de desarrollo en `seeds-dev/` (las obras ficticias del prototipo: Local Parque Norte, Oficinas Nueva Vista, Tienda Los Robles, Habilitación Providencia).

### 6.3 Migraciones iniciales previstas

| Migración | Contenido |
|---|---|
| base | esquema, extensiones (`pgcrypto`, `citext`), grants, `auditoria_evento`, `idempotencia` |
| identidad | `usuario` (rol `admin`/`usuario`), `sesion`, `token_recuperacion` |
| maestros | `cliente`, `proveedor`, `proveedor_cuenta_bancaria`, `obra` (centro de costo único), `parametro` (versionado con vigencia), catálogos |
| presupuesto | `presupuesto_version`, `partida` |
| compras | `cotizacion`, `orden_trabajo`, `ot_hito` (porcentajes), `orden_compra`, `oc_linea`, `recepcion` |
| documentos de compra | `documento_compra` (único por `rut_emisor + tipo + folio`), `documento_compra_oc`, `documento_compra_imputacion` |
| pagos | `lote_pago`, `lote_pago_item` (índice único parcial: una factura en un solo lote activo), `pago` |
| ingresos | `eepp`, `eepp_linea`, `factura_venta`, `cobro`, `cobro_aplicacion` |
| costos | `quincena`, `quincena_distribucion`, `rendicion`, `gasto_administrativo`, `prorrateo` |
| control | `movimiento` (libro, append-only con reversas), `excepcion_conciliacion`, `alerta`, `tarea`, `actividad` |
| cierres | `cierre_obra`, `cierre_anual` |
| soporte | `adjunto`, `importacion_lote`, `importacion_fila`, esquema `legado` para staging de migración Laudus |

El detalle de columnas se cierra en cada fase (§11), no todo al inicio.

## 7. Contrato OpenAPI y clientes generados

1. **Backend** expone la especificación en `http://localhost:3007/api/docs-json` (Swagger UI en `/api/docs`), configurado con:
   - plugin CLI de `@nestjs/swagger` (anota DTOs automáticamente),
   - `operationIdFactory: (_controller, method) => method` → métodos limpios (`listarObras`, `aprobarOrdenCompra`),
   - `tags` por controlador → clases `ObrasApi`, `OrdenesCompraApi`…,
   - enums con `enumName` para que el generador cree tipos reutilizables,
   - esquema común de error (`ErrorResponse`) y de conflicto de versión (`ConflictResponse`),
   - esquema de seguridad por cookie.
2. **Frontend** (`apps/frontend/openapitools.json`) fija la versión del generador y define:
   - `generatorName: typescript-axios`, `inputSpec: http://localhost:3007/api/docs-json` (**URL, no archivo JSON**),
   - `output: src/api/generated`, `additionalProperties: { supportsES6, withSeparateModelsAndApi, useSingleRequestParameter }`.
   - Script: `"api:generate": "node scripts/generar-api.mjs"`, que invoca `openapi-generator-cli generate --generator-key nomade` con el directorio de trabajo fijado en `apps/frontend` (el CLI usa `PWD`/`INIT_CWD`, que desde la raíz apuntan a la raíz) y normaliza la salida a LF (requiere backend corriendo; usa Java local — ya instalado en la máquina de desarrollo. El modo `useDocker` no sirve con `localhost` porque apunta al contenedor).
3. Las fuentes generadas **se commitean**. `.gitattributes` las marca `linguist-generated` y con `eol=lf` para evitar diffs Windows/Linux; ESLint/Prettier las ignoran.
4. En runtime el cliente usa `basePath` relativo (`''`) + `withCredentials`, por lo que funciona igual en `localhost:5177` y detrás de Cloudflare Tunnel.
5. Regla de equipo: todo cambio de controlador/DTO va en el mismo commit que su cliente regenerado. CI no lo verifica (D-14); es responsabilidad de quien hace el cambio.

## 8. Docker Compose

### 8.1 Local — `docker-compose.yml` (solo base de datos)

- `postgres`: `postgres:18`, puerto `${POSTGRES_PORT:-5437}:5432`, volumen nombrado, healthcheck `pg_isready`, monta `apps/migrations/docker/init-roles.sh` en `/docker-entrypoint-initdb.d/`.
- Nombre de proyecto `nomade` para no chocar con otros stacks de la máquina.
- Las migraciones corren desde Node en el host (`npm run db:migrate`), no en Docker.

### 8.2 Servidor — `docker-compose.deploy.yml` (despliegue completo en `dell-pc`)

| Servicio | Imagen | Detalle |
|---|---|---|
| `postgres` | `postgres:18` | Volumen persistente, no publicado (o solo `127.0.0.1:5437`). Mismo `init-roles.sh`. |
| `migrations` | build `apps/migrations` | One-shot: `migrate up` y termina. `depends_on: postgres (service_healthy)`. |
| `backend` | build `apps/backend` | `depends_on: migrations (service_completed_successfully)`; healthcheck `/api/health`; volumen de adjuntos; usuario no root. |
| `web` | build `apps/frontend` (multi-stage → nginx) | Sirve el build de Vite y hace proxy `/api` → `backend:3007`. Publica `${WEB_PORT}:80` con `WEB_PORT=5178` (D-16). Único servicio publicado; Cloudflare Tunnel apunta a él. |
| `backup` | `postgres:18` + cron | `pg_dump` diario + copia de adjuntos, retención 30 días; destino externo por definir (§16 G). |

- Acceso: solo por **Cloudflare Tunnel** con HTTPS (D-16). `APP_ORIGIN` = URL pública del túnel (`https://…`), cookies con `Secure` (`COOKIE_SECURE=true`). El backend valida `Origin` contra `APP_ORIGIN`.
- Despliegue previsto: en `dell-pc`, `git pull` → `docker compose -f docker-compose.deploy.yml --env-file .env up -d --build`. Secretos solo en `.env` del servidor (nunca en git); se entrega `.env.deploy.example`.
- El despliegue usa 5178 para no chocar con Vite (5177) en la misma máquina.
- El servidor no tiene UPS (D-16): los respaldos y alertas deben tolerar reinicios (tareas idempotentes y recuperables al arrancar).

## 9. Backend (NestJS)

### 9.1 Módulos de dominio

| Módulo | Pantallas | Responsabilidad | Rol |
|---|---|---|---|
| `auth` | P01 | login, logout, sesión, cambio de contraseña, bloqueo por intentos | todos |
| `usuarios` | P25 | CRUD de usuarios, activar/desactivar, restablecer contraseña temporal | **admin** |
| `obras`, `clientes` | P03–P05 | obra/centro de costo, ficha 360° (agregados) | todos |
| `proveedores` | P22 | ficha; cuentas bancarias solo **admin** (D-17) | todos |
| `presupuestos` | P06 | versiones, partidas, aprobación de versión | todos |
| `cotizaciones`, `ordenes-trabajo` | P11 | cotización aprobada → OT, hitos porcentuales, saldo | todos |
| `ordenes-compra` | P10, P30 | OC de materiales y parciales de OT, bandeja de aprobación | todos |
| `documentos-compra` | P12 | facturas, NC, imputación, matching con OC | todos |
| `pagos` | P30 | lotes, planilla bancaria, confirmación/rechazo | todos |
| `eepp`, `cobranza` | P07–P09 | EEPP, factura de venta, abonos | todos |
| `mano-obra` | P14 | quincenas, distribución 100 % | todos |
| `rendiciones` | P13 | importación Rindegastos e imputación | todos |
| `prorrateos` | P15 | gastos administrativos y distribución | todos |
| `movimientos` | P16 | libro de movimientos (fuente de verdad de reportes) | todos |
| `conciliacion` | P17 | excepciones y resolución | todos |
| `alertas`, `tareas`, `actividad` | P28, P31 | vencimientos (factura a 30 días, aviso 5 días antes — Q10), tareas, actividad por obra | todos |
| `reportes` | P02, P18, P21 | dashboard, resultado por obra, exportación Excel/PDF | todos |
| `cierres` | P19, P20 | cierre de obra y anual, reapertura auditada | todos |
| `importaciones` | P24 | carga Excel/CSV con previsualización y confirmación | **admin** (D-11) |
| `parametros` | P27 | reglas versionadas con vigencia | **admin** |
| `migracion` | P23 | staging Laudus, conciliación, conector Rindegastos | **admin** |
| `auditoria` | P26 | consulta de bitácora | **admin** |
| `adjuntos`, `salud` | — | archivos y `/api/health` | todos / público |

### 9.2 Elementos transversales (Fase 0–1, antes de cualquier dominio)

- **Autorización**: `SessionGuard` global + `@Roles('admin')` en los módulos de administración. Cada acción sensible declara además un código de permiso (`oc.aprobar`, `lote.aprobar`…) que hoy se resuelve como «admin → todo; usuario → todo salvo administración»; así, cuando se agreguen perfiles o acceso por obra, solo cambia la resolución, no los controladores.
- **Concurrencia**: todo `PUT/PATCH` exige `version`; si no coincide → `409` con la versión vigente (P31). Transiciones críticas (aprobar OC, reservar factura en lote, confirmar pago, crear OC contra saldo OT) en transacción con `SELECT … FOR UPDATE` + restricciones únicas.
- **Idempotencia**: cabecera `Idempotency-Key` en POST críticos; respuesta almacenada en `idempotencia`.
- **Auditoría**: interceptor que registra actor, acción, entidad, id, antes/después (campos no sensibles), motivo, IP; append-only.
- **Máquinas de estado** por documento (OC, OT, factura, lote, EEPP, quincena, cierre) con transiciones explícitas. Regla de no autoaprobación para el rol `usuario`; el `admin` puede aprobar lo que creó (D-10).
- **Errores** homogéneos en español (`ErrorResponse { codigo, mensaje, detalles[] }`), validación con `class-validator`, `ValidationPipe` con `whitelist` y `forbidNonWhitelisted`.
- **Seguridad**: Helmet, rate limit en login (`@nestjs/throttler`), verificación de `Origin` en métodos no-GET, cookie `Secure` activada en el servidor (HTTPS por Cloudflare Tunnel), límites de tamaño, hash argon2id.
- **Configuración** validada al arrancar (`@nestjs/config` + zod); falla rápido si falta una variable.
- **Primer administrador**: se crea al arrancar si no existen usuarios, desde `ADMIN_EMAIL`/`ADMIN_PASSWORD` (mismo criterio del prototipo).

### 9.3 Modelo financiero (regla central)

El **libro de movimientos** es la fuente de reportes. Cada hecho financiero genera movimientos una sola vez y nunca se edita: se corrige con reversa + nuevo movimiento.

| Hecho | Efecto |
|---|---|
| OC aprobada | Compromiso (no costo). |
| Factura validada/devengada | Costo real por obra/partida según imputación (suma 100 %). |
| Pago confirmado | Salida de caja y baja de cuenta por pagar (no crea costo). |
| EEPP aprobado / factura de venta | Ingreso reconocido según política contable (§16 H). |
| Cobro | Entrada de caja y baja de cuenta por cobrar. |
| Quincena aprobada / rendición aprobada / prorrateo ejecutado | Costo por obra/partida una sola vez. |

## 10. Frontend (React + Vite + MUI)

### 10.1 Tema visual (tomado de `styles.css` del prototipo)

| Token | Valor | Uso |
|---|---|---|
| `primary.main` | `#1e5744` | botones primarios, enlaces |
| `primary.dark` | `#163f32` | hover |
| sidebar | `#183c33` (texto `#c4d6c9`, títulos `#91ac9c`) | Drawer lateral 242 px |
| ítem activo | fondo `#e8f0de`, texto `#204737` | navegación |
| `background.default` | `#f6f7f4`; tarjetas `#fff` | |
| `text.primary` | `#243731`; secundario `#84928a` | |
| `divider` | `#e7ece7` | |
| `secondary` / acento | `#ec9b63`; foco `#efb37f` | alertas, foco visible |
| Tipografía | DM Sans (texto) y Manrope (títulos), auto-alojadas con `@fontsource` | sin CDN externo |

La paleta anterior es el **tema claro**; se define además un **tema oscuro** equivalente con selector en la barra superior y preferencia guardada por usuario (D-12).

Componentes de layout replicados con MUI: `Drawer` con secciones, `AppBar` blanca (75 px) con breadcrumbs, campana de alertas, avatar/nombre/rol, «Clave» y «Salir»; cabecera de página con *eyebrow*, título, descripción y botón primario; `Card` con cabecera; panel lateral «Continuar en» (pantallas relacionadas); `Chip` de estado con la misma semántica de color (pendiente/revisión = warning, excepción/rechazado = error, cerrado = neutral). Drawer temporal en móvil; las pantallas de uso en terreno deben funcionar en celular (D-17).

### 10.2 Componentes compartidos

`DataTable` (MUI X DataGrid Community: búsqueda, filtros, orden, paginación en servidor, exportar CSV), `MoneyField`/`formatCLP`, `PercentField`, `RutField` (validación módulo 11), `DateField` (MUI X Date Pickers, es-CL), `StatusChip`, `ConfirmDialog` (con motivo para rechazos), `ConflictDialog` (409: comparar y recargar), `AttachmentUploader`, `AuditTrail`, `EmptyState`/`ErrorState`/`LoadingState`, `RoleGate` (oculta acciones de admin; el backend igual valida). Gráficos del dashboard con MUI X Charts.

### 10.3 Navegación (Anexo D de la propuesta)

| Menú | Rutas |
|---|---|
| Inicio | `/` dashboard (P02) · `/alertas` (P28) |
| Obras | `/obras` (P03) · `/obras/nueva` (P04) · `/obras/:id` ficha con pestañas (P05): resumen, presupuesto (P06), EEPP, compras, gastos, mano de obra, documentos, resultado (P18), cierre (P19), actividad (P31) |
| Ingresos | `/eepp` (P07) · `/eepp/:id` (P08) · `/cobranza` (P09) |
| Compras y gastos | `/ordenes-compra` (P10) · `/ordenes-trabajo` (P11) · `/facturas` (P12) · `/rendiciones` (P13) · `/mano-obra` (P14) · `/proveedores` (P22) · `/pagos` aprobaciones y lotes (P30) |
| Finanzas | `/movimientos` (P16) · `/conciliacion` (P17) · `/gastos-administrativos` (P15) · `/cierre-anual` (P20) |
| Reportes | `/reportes` (P21) |
| Herramientas | `/importaciones` (P24) |
| Administración (solo admin) | `/admin/usuarios` (P25) · `/admin/auditoria` (P26) · `/admin/parametros` (P27) · `/admin/migracion` (P23) |

El menú «Administración» solo se muestra al administrador. Las rutas protegidas redirigen al login; el cambio de contraseña obligatorio bloquea el resto (igual que el prototipo). Se elimina el selector «Tipo de acceso» del login: el rol sale de la cuenta. P23, P27 y P29 aparecen en el menú marcadas como «pendientes» hasta implementarse (D-09).

## 11. Fases de implementación

Cada fase termina con: migraciones, endpoints, cliente regenerado, pantallas, control de rol, auditoría, pruebas y demo. Las fases 4 en adelante dependen de respuestas del cliente marcadas en §16 H.

| Fase | Contenido | Pantallas | Bloqueado por |
|---|---|---|---|
| **0. Fundaciones** | `git mv` del prototipo a `apps/prototipo`, monorepo, `npm run full`, compose local, `apps/migrations` con migración base, esqueleto Nest (config, logs, health, errores, Swagger), esqueleto Vite + tema MUI + layout + rutas vacías, pipeline OpenAPI, ESLint/Prettier, CI básica | — | §16 C, E |
| **1. Identidad y acceso** | Login por correo, sesiones, cambio de contraseña, usuarios (admin), roles admin/usuario, auditoría base, actividad | P01, P25, P26 (consulta) | §16 B |
| **2. Maestros y obras** | Clientes, proveedores (cuentas bancarias), obras/centros de costo, adjuntos, parámetros mínimos, ficha 360° (esqueleto) | P03, P04, P05, P22, P27 (mín.) | Catálogo de estados de obra |
| **3. Presupuesto** | Versiones, partidas, aprobación, importación Excel con previsualización | P06, P24 (presupuestos) | Q12, plantilla Excel real |
| **4. Compras núcleo** | Cotización → OT con hitos %, OC parciales (tope = saldo OT), OC de materiales, recepción, bandeja de aprobación OC, libro de movimientos (compromisos) | P10, P11, P30 (bandeja OC) | Q04, Q16 |
| **5. Facturas y matching** | Documentos de compra, NC, imputación multi-obra 100 %, match factura–OC, detección de duplicados, excepciones, alertas de vencimiento | P12, P17, P28 | Q14, Q17 |
| **6. Pagos masivos** | Lotes inmutables, reserva única de factura, aprobación, planilla bancaria, confirmación/rechazo | P30 | Q05 (banco y formato) |
| **7. Ingresos** | EEPP, factura de venta, cobranza, abonos, retenciones | P07, P08, P09 | Q13, Q14 |
| **8. Otros costos** | Quincenas (importación planilla de sueldos + distribución), Rindegastos, prorrateos | P13, P14, P15 | Q06, Q09, Q19 |
| **9. Control y reportes** | Resultado por obra, dashboard, centro de reportes con Excel/PDF, ficha 360° completa | P02, P05, P16, P18, P21 | Q20 |
| **10. Cierres** | Checklist y cierre de obra, cierre anual, reapertura auditada | P19, P20 | Q21, Q15 |
| **11. Migración Laudus** | Staging, transformación, conciliación, ensayos, marcha paralela, corte | P23 | Q02, Q26, acceso a Laudus |
| **12. Producción en `dell-pc`** | Despliegue, respaldos y restauración probada, monitoreo básico, UAT-01…UAT-12 | — | §16 G, Q25 |
| Posterior | HTTPS, perfiles finos y acceso por obra, MFA, IA documental, integraciones bancarias/DTE | P29 | Aprobación |

El despliegue en `dell-pc` puede hacerse desde la fase 1 para que el cliente pruebe avances; la fase 12 es el endurecimiento para operar con datos reales.

## 12. Calidad y CI

- TypeScript `strict`, ESLint + Prettier, `npm run typecheck`.
- Backend (Vitest): pruebas unitarias de reglas (saldos OT, suma 100 %, máquinas de estado) e **integración contra PostgreSQL real** (BD de prueba en el mismo compose o Testcontainers), incluyendo **pruebas de concurrencia** (dos aprobaciones simultáneas, misma factura en dos lotes) — UAT-08. Pruebas de autorización: un `usuario` recibe 403 en todos los endpoints de administración.
- Frontend: Vitest + Testing Library para componentes y formularios; Playwright para flujos principales.
- CI (GitHub Actions en `loreto2888/Nomade`): install → lint → typecheck → tests (con BD + migraciones) → build de imágenes Docker. Sin verificación del cliente generado (D-14).
- Definición de listo por pantalla: la del Anexo F de la propuesta.

## 13. Seguridad y operación

- Acceso solo mediante Cloudflare Tunnel con HTTPS desde el inicio (D-16), como exige la propuesta §6.2. Al quedar expuesta a internet, el login debe tener rate limit y bloqueo por intentos desde la fase 1; evaluar Cloudflare Access como capa adicional.
- Contraseñas: mínimo 12 caracteres (como el prototipo), hash argon2id, bloqueo temporal por intentos, expiración por inactividad.
- Datos bancarios de proveedores y nómina siempre auditados al consultarse o modificarse.
- Respaldos diarios de BD y adjuntos, con **prueba de restauración** documentada antes del corte.
- Sin secretos en git; `.env` del servidor con permisos restringidos.

## 14. Riesgos técnicos

| Riesgo | Mitigación |
|---|---|
| Cobertura tributaria/contable de Laudus sin definir (DTE, libros) | No construir fases 10–11 sin la matriz 1:1; decidir módulo propio vs. servicio externo. |
| Formato bancario desconocido | Generador de planilla con adaptador por banco; fase 6 bloqueada hasta tener ejemplo. |
| Cliente generado desincronizado | Regla de commit conjunto (sin verificación en CI, D-14). |
| Pago o aprobación duplicada por concurrencia | Transacciones, `FOR UPDATE`, índices únicos parciales, idempotencia y pruebas paralelas. |
| Solo 2 roles: sin segregación de funciones (la propuesta la pide para pagos); el admin puede autoaprobar (D-10) | No autoaprobación para `usuario` + auditoría de toda aprobación; mapa de permisos preparado para perfiles. |
| Plataforma expuesta a internet vía túnel | HTTPS, rate limit y bloqueo en login, cookies `Secure`, evaluar Cloudflare Access. |
| Servidor sin UPS | Respaldos diarios fuera del servidor; tareas programadas recuperables tras un corte. |
| Generador OpenAPI requiere Java | Documentado; Java ya presente en desarrollo; CI usa `setup-java`. |
| Diferencias de fin de línea Windows (desarrollo) / Linux (servidor) | `.gitattributes` con `eol=lf`. |
| Puerto 5437 compartido con `integracion-wom` | No levantar ambos; `POSTGRES_PORT` configurable. |

## 15. Próximos pasos

1. Fase 1 completada (D-20).
2. Iniciar la fase 1 (identidad y acceso), ya desbloqueada por D-10 y D-11.
3. Pedir al cliente los catálogos (H16) y enviarle las preguntas de §16 H que bloquean las fases 3–11.

---

## 16. Preguntas abiertas

Cada pregunta indica el **supuesto actual** con el que avanza el plan si no hay respuesta. Al responder, se mueve a §0 y se elimina de aquí. Las secciones A–F y J quedaron resueltas el 19-11-2026 (D-08 a D-19).

### G. Servidor `dell-pc`

- **G1.** Distribución Linux, CPU, RAM y disco (Docker y Compose ya están instalados).
- **G6.** Destino de los respaldos fuera del servidor (otro disco, NAS, nube). *Supuesto: diario, 30 días; destino por definir.*

### H. Reglas de negocio pendientes con el cliente (bloquean fases)

Preguntas ya planteadas en la propuesta que siguen abiertas; se listan para trazar qué fase bloquean.

- **H1.** (Q01/Q14 — fases 5, 7, 10) ¿Emiten DTE (facturas, exentas, NC, ND, guías) desde Laudus o desde el portal del SII? ¿La plataforma debe emitirlos o integrarse con un proveedor?
- **H2.** (Q15 — fase 10) ¿Qué libros y reportes contables debe generar la plataforma (compras, ventas, diario, mayor, balance) y en qué formato los necesita el contador?
- **H3.** (Q02 — fase 11) ¿La migración incluye maestros (proveedores, clientes, obras), saldos abiertos y movimientos, además de documentos 2025–2026? ¿Cómo se extrae de Laudus (Excel, API, BD)? ¿Quién valida la cuadratura?
- **H4.** (Q05 — fase 6) Banco, ejemplo de planilla masiva y cómo se registra el resultado (archivo de respuesta, cartola, confirmación manual).
- **H5.** (Q04/Q16/Q17 — fases 4–5) Reglas para modificar porcentajes de hitos de una OT; modificación/anulación de OC aprobadas; anticipos, retenciones y diferencias cuando una OC tiene varias facturas y pagos.
- **H6.** (Q06/Q19 — fase 8) Formato de la planilla de sueldos; ¿se importa desde Excel? ¿Se distribuye por trabajador o por total quincenal? ¿Quién aprueba?
- **H7.** (Q09 — fase 8) Rindegastos: ¿API o exportación de archivos? ¿En qué estado se reconoce el gasto y cómo evitar duplicar con facturas?
- **H8.** (Q10 — fase 5) Alertas: destinatarios y canal (plataforma, correo o ambos). ¿El plazo de 30 días es fijo o por proveedor/documento?
- **H9.** (Q12 — fase 3) Plantilla Excel real del presupuesto; adicionales y nuevas versiones durante la ejecución.
- **H10.** (Q13 — fase 7) Flujo de EEPP con el cliente final: cobros parciales, retenciones, anticipos.
- **H11.** (Q20 — fase 9) Cálculo de utilidad: base neta/bruta, devengado/percibido, inclusión de gastos administrativos e indirectos.
- **H12.** (Q21 — fase 10) Quién autoriza el cierre de obra y condiciones de reapertura.
- **H15.** (Q26) Duración de la marcha paralela con Laudus y quién autoriza su desconexión.

### I. Repositorio y proceso

- **I6.** ¿El README raíz se reescribe para la nueva aplicación? *Supuesto: sí; el README del prototipo se mueve con él.*
