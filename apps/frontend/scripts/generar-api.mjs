// Regenera el cliente OpenAPI (src/api/generated) con openapi-generator-cli.
//
// 1. openapi-generator-cli toma su directorio de trabajo de PWD o INIT_CWD antes que de
//    process.cwd(). Al ejecutarlo desde la raíz del monorepo (`npm run api:generate`), ambos apuntan
//    a la raíz, así que buscaría (y crearía) un openapitools.json allí. Este script fija las tres
//    rutas en apps/frontend para que lea su openapitools.json y escriba en src/api/generated.
// 2. En Windows el generador escribe algunos archivos con CRLF (p. ej. .openapi-generator/FILES).
//    Se normalizan a LF para que la salida sea idéntica en cualquier sistema operativo.
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const raizFrontend = fileURLToPath(new URL('..', import.meta.url));
const salida = join(raizFrontend, 'src', 'api', 'generated');
const cli = require.resolve('@openapitools/openapi-generator-cli/main.js');

const resultado = spawnSync(
  process.execPath,
  [cli, 'generate', '--generator-key', 'nomade', ...process.argv.slice(2)],
  {
    cwd: raizFrontend,
    env: { ...process.env, PWD: raizFrontend, INIT_CWD: raizFrontend },
    stdio: 'inherit',
  },
);

if (resultado.status !== 0) {
  process.exit(resultado.status ?? 1);
}

for (const entrada of readdirSync(salida, { recursive: true, withFileTypes: true })) {
  if (!entrada.isFile()) continue;
  const ruta = join(entrada.parentPath, entrada.name);
  const contenido = readFileSync(ruta, 'utf8');
  if (contenido.includes('\r\n')) {
    writeFileSync(ruta, contenido.replaceAll('\r\n', '\n'));
  }
}
