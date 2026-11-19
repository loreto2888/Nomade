import { describe, expect, it } from 'vitest';
import { MAX_BYTES_ADJUNTO, TIPOS_ACEPTADOS, validarArchivoCliente } from './adjuntos';

describe('validarArchivoCliente (D-16)', () => {
  it('acepta PDF, JPG, PNG, XLSX y CSV (sin distinguir mayúsculas)', () => {
    for (const nombre of ['a.pdf', 'A.PDF', 'b.jpg', 'b.jpeg', 'c.png', 'd.xlsx', 'e.csv']) {
      expect(validarArchivoCliente({ name: nombre, size: 1000 })).toBeNull();
    }
  });

  it('rechaza otros tipos y nombres sin extensión', () => {
    for (const nombre of ['virus.exe', 'doc.docx', 'sin_extension', '.pdf', 'a.pdf.exe']) {
      expect(validarArchivoCliente({ name: nombre, size: 1000 })).toMatch(/no permitido/);
    }
  });

  it('rechaza archivos vacíos y mayores a 20 MB', () => {
    expect(validarArchivoCliente({ name: 'a.pdf', size: 0 })).toBe('El archivo está vacío.');
    expect(validarArchivoCliente({ name: 'a.pdf', size: MAX_BYTES_ADJUNTO })).toBeNull();
    expect(validarArchivoCliente({ name: 'a.pdf', size: MAX_BYTES_ADJUNTO + 1 })).toMatch(/20 MB/);
  });

  it('el atributo accept lista las extensiones permitidas', () => {
    expect(TIPOS_ACEPTADOS).toBe('.pdf,.jpg,.jpeg,.png,.xlsx,.csv');
  });
});
