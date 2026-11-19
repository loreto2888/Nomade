import { accessSync, constants, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Asegura que el directorio de adjuntos exista y que el proceso pueda escribir
 * en él. Se llama al arrancar, antes de levantar Nest: si falla, el proceso
 * termina con un mensaje en español. Devuelve la ruta absoluta.
 *
 * Una ruta relativa se resuelve contra el directorio de trabajo: con
 * `npm run dev:backend` es `apps/backend`, así que el valor por defecto queda
 * en `apps/backend/data/adjuntos` (ignorado por git). En la imagen Docker es
 * `/data/adjuntos`, montado como volumen.
 */
export function prepararDirectorioAdjuntos(ruta: string): string {
  const absoluta = resolve(ruta);
  try {
    mkdirSync(absoluta, { recursive: true });
    accessSync(absoluta, constants.R_OK | constants.W_OK);
  } catch (error) {
    const detalle = error instanceof Error ? error.message : String(error);
    throw new Error(
      `No se pudo preparar el directorio de adjuntos (ADJUNTOS_DIR=${ruta}): ${detalle}`,
      { cause: error },
    );
  }
  return absoluta;
}
