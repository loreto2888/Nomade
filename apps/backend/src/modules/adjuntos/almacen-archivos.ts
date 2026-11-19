import { randomUUID } from 'node:crypto';
import { createReadStream, type ReadStream } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Entorno } from '../../config/entorno.js';

const CLAVE_VALIDA =
  /^\d{4}\/\d{2}\/[0-9a-f-]{36}\.(pdf|jpg|jpeg|png|xlsx|csv)$/;

/** Almacenamiento de los archivos adjuntos (hoy, volumen local; mañana podría ser otro). */
export abstract class AlmacenArchivos {
  /** Guarda el contenido y devuelve la clave con la que se recupera. */
  abstract guardar(contenido: Buffer, extension: string): Promise<string>;
  abstract abrir(clave: string): ReadStream;
  abstract eliminar(clave: string): Promise<void>;
}

/**
 * Guarda los archivos en `ADJUNTOS_DIR` bajo `AAAA/MM/<uuid>.<ext>`. El nombre real
 * nunca se usa en disco: la clave es generada, por lo que no hay path traversal.
 */
@Injectable()
export class AlmacenLocal extends AlmacenArchivos {
  private readonly base: string;

  constructor(config: ConfigService<Entorno, true>) {
    super();
    this.base = resolve(config.get('ADJUNTOS_DIR', { infer: true }));
  }

  async guardar(
    contenido: Buffer,
    extension: string,
    ahora = new Date(),
  ): Promise<string> {
    const anio = String(ahora.getUTCFullYear());
    const mes = String(ahora.getUTCMonth() + 1).padStart(2, '0');
    const clave = `${anio}/${mes}/${randomUUID()}.${extension}`;
    const ruta = this.rutaDe(clave);
    await mkdir(dirname(ruta), { recursive: true });
    // `wx`: nunca sobrescribe un archivo existente.
    await writeFile(ruta, contenido, { flag: 'wx', mode: 0o640 });
    return clave;
  }

  abrir(clave: string): ReadStream {
    return createReadStream(this.rutaDe(clave));
  }

  async eliminar(clave: string): Promise<void> {
    await unlink(this.rutaDe(clave)).catch(() => undefined);
  }

  /** Ruta absoluta de una clave, verificando que quede dentro del directorio base. */
  private rutaDe(clave: string): string {
    if (!CLAVE_VALIDA.test(clave))
      throw new Error('Clave de almacenamiento inválida');
    const ruta = resolve(this.base, clave);
    if (!ruta.startsWith(this.base + sep))
      throw new Error('Ruta fuera del almacenamiento');
    return ruta;
  }
}
