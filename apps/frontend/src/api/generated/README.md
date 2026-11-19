# Cliente API generado

⚠ **No edites estos archivos a mano.** Este directorio lo genera
[openapi-generator-cli](https://openapi-generator.tech/) (`typescript-axios`) a partir de la
especificación OpenAPI del backend (`http://localhost:3007/api/docs-json`).

- Regenerar: `npm run api:generate` desde la raíz del repo (requiere el backend corriendo y Java).
  El script `apps/frontend/scripts/generar-api.mjs` fija el directorio de trabajo del generador y
  normaliza los finales de línea a LF.
- Configuración y versión fija del generador: `apps/frontend/openapitools.json`.
- **Se versiona en git**: todo cambio de controlador/DTO del backend va en el mismo commit que el
  cliente regenerado.
- `.gitattributes` lo marca como `linguist-generated` con `eol=lf`; ESLint y Prettier lo ignoran.
- `.openapi-generator-ignore` evita que el generador cree `git_push.sh`, `.gitignore` y
  `.npmignore`, y que sobrescriba este README.

Uso en la app: crea las clases `*Api` con `crearApi()` de `src/api/config.ts`, que usa la
`Configuration` única (`configuracionApi`) y la instancia axios compartida (`src/api/http.ts`).
