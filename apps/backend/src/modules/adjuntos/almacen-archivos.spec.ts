import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Entorno } from '../../config/entorno.js';
import { AlmacenLocal } from './almacen-archivos.js';

describe('AlmacenLocal', () => {
  let directorio: string;
  let almacen: AlmacenLocal;

  beforeEach(async () => {
    directorio = await mkdtemp(join(tmpdir(), 'nomade-adjuntos-'));
    const config = { get: () => directorio } as unknown as ConfigService<
      Entorno,
      true
    >;
    almacen = new AlmacenLocal(config);
  });

  afterEach(async () => {
    await rm(directorio, { recursive: true, force: true });
  });

  async function leer(flujo: NodeJS.ReadableStream): Promise<string> {
    const trozos: Buffer[] = [];
    for await (const trozo of flujo) trozos.push(Buffer.from(trozo as Buffer));
    return Buffer.concat(trozos).toString('utf8');
  }

  it('guarda con una clave generada AAAA/MM/uuid.ext y se puede leer de vuelta', async () => {
    const clave = await almacen.guardar(
      Buffer.from('contenido'),
      'pdf',
      new Date('2026-11-19T12:00:00Z'),
    );
    expect(clave).toMatch(/^2026\/11\/[0-9a-f-]{36}\.pdf$/);
    expect(await readFile(join(directorio, clave), 'utf8')).toBe('contenido');
    expect(await leer(almacen.abrir(clave))).toBe('contenido');
  });

  it('cada archivo recibe una clave distinta (nunca sobrescribe)', async () => {
    const a = await almacen.guardar(Buffer.from('a'), 'csv');
    const b = await almacen.guardar(Buffer.from('b'), 'csv');
    expect(a).not.toBe(b);
  });

  it('elimina el archivo y tolera que ya no exista', async () => {
    const clave = await almacen.guardar(Buffer.from('x'), 'png');
    await almacen.eliminar(clave);
    await expect(stat(join(directorio, clave))).rejects.toThrow();
    await expect(almacen.eliminar(clave)).resolves.toBeUndefined();
  });

  it('rechaza claves con path traversal o formato inválido', () => {
    for (const clave of [
      '../secreto.pdf',
      '2026/11/../../../etc/passwd',
      '/etc/passwd',
      '2026/11/archivo.pdf',
      '2026/11/00000000-0000-0000-0000-000000000000.exe',
    ]) {
      expect(() => almacen.abrir(clave)).toThrow('inválida');
    }
  });
});
