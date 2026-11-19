import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Versión de la aplicación tomada del package.json. Funciona tanto desde
 * `src/config` (tests) como desde `dist/config` (build), ya que ambos están
 * dos niveles bajo la raíz del paquete.
 */
function leerVersion(): string {
  const ruta = join(import.meta.dirname, '..', '..', 'package.json');
  const contenido = JSON.parse(readFileSync(ruta, 'utf8')) as {
    version?: unknown;
  };
  return typeof contenido.version === 'string' ? contenido.version : '0.0.0';
}

export const VERSION_APP = leerVersion();
