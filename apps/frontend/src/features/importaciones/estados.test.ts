import { describe, expect, it } from 'vitest';
import { validarArchivoImportacion } from './estados';

const archivo = (nombre: string, bytes = 10) => new File([new Uint8Array(bytes)], nombre);

describe('validarArchivoImportacion', () => {
  it('acepta .xlsx y .csv (sin importar mayúsculas)', () => {
    expect(validarArchivoImportacion(archivo('presupuesto.xlsx'))).toBeNull();
    expect(validarArchivoImportacion(archivo('PRESUPUESTO.CSV'))).toBeNull();
  });

  it('rechaza otros tipos, archivos vacíos y los de más de 20 MB', () => {
    expect(validarArchivoImportacion(archivo('a.pdf'))).toMatch(/Excel \(\.xlsx\) o CSV/);
    expect(validarArchivoImportacion(archivo('a.xls'))).toMatch(/Excel \(\.xlsx\) o CSV/);
    expect(validarArchivoImportacion(archivo('a.xlsx', 0))).toBe('El archivo está vacío.');
    const grande = archivo('a.xlsx');
    Object.defineProperty(grande, 'size', { value: 21 * 1024 * 1024 });
    expect(validarArchivoImportacion(grande)).toMatch(/20 MB/);
  });
});
