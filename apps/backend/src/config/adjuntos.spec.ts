import { mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { prepararDirectorioAdjuntos } from './adjuntos.js';

describe('prepararDirectorioAdjuntos', () => {
  const temporales: string[] = [];
  const crearTemporal = () => {
    const dir = mkdtempSync(join(tmpdir(), 'nomade-adjuntos-'));
    temporales.push(dir);
    return dir;
  };

  afterEach(() => {
    for (const dir of temporales.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('crea el directorio (y sus padres) si no existe', () => {
    const ruta = join(crearTemporal(), 'a', 'b', 'adjuntos');
    expect(prepararDirectorioAdjuntos(ruta)).toBe(ruta);
    expect(statSync(ruta).isDirectory()).toBe(true);
  });

  it('acepta un directorio existente', () => {
    const ruta = crearTemporal();
    expect(prepararDirectorioAdjuntos(ruta)).toBe(ruta);
  });

  it('falla con mensaje en español si la ruta es un archivo', () => {
    const archivo = join(crearTemporal(), 'archivo');
    writeFileSync(archivo, '');
    expect(() => prepararDirectorioAdjuntos(archivo)).toThrow(
      /No se pudo preparar el directorio de adjuntos/,
    );
  });
});
