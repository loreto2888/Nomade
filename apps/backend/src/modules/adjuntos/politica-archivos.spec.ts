import { describe, expect, it } from 'vitest';
import {
  MAX_BYTES_ADJUNTO,
  extensionDe,
  limpiarNombreArchivo,
  validarArchivo,
} from './politica-archivos.js';

const pdf = Buffer.from('%PDF-1.7\n1 0 obj\n');
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const xlsx = Buffer.concat([
  Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  Buffer.from('....xl/workbook.xml....'),
]);
const zipSinLibro = Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]);

const rechazo = (archivo: { nombre: string; contenido: Buffer }) => {
  try {
    validarArchivo(archivo);
  } catch (error) {
    return error as { status: number; response: { codigo: string } };
  }
  throw new Error('Se esperaba un rechazo');
};

describe('política de archivos adjuntos (D-16)', () => {
  it('acepta PDF, JPG, PNG, XLSX y CSV con contenido coherente', () => {
    expect(validarArchivo({ nombre: 'a.pdf', contenido: pdf })).toEqual({
      extension: 'pdf',
      tipoMime: 'application/pdf',
    });
    expect(validarArchivo({ nombre: 'a.JPG', contenido: jpg }).tipoMime).toBe(
      'image/jpeg',
    );
    expect(validarArchivo({ nombre: 'a.jpeg', contenido: jpg }).extension).toBe(
      'jpeg',
    );
    expect(validarArchivo({ nombre: 'a.png', contenido: png }).tipoMime).toBe(
      'image/png',
    );
    expect(
      validarArchivo({ nombre: 'a.xlsx', contenido: xlsx }).tipoMime,
    ).toContain('spreadsheetml');
    expect(
      validarArchivo({
        nombre: 'a.csv',
        contenido: Buffer.from('a;b\n1;2\r\n"ñ";3'),
      }).tipoMime,
    ).toBe('text/csv');
  });

  it('rechaza extensiones no permitidas (415)', () => {
    for (const nombre of [
      'virus.exe',
      'doc.docx',
      'script.js',
      'sin_extension',
      'a.pdf.exe',
      '.pdf',
    ]) {
      const error = rechazo({ nombre, contenido: pdf });
      expect(error.status).toBe(415);
      expect(error.response.codigo).toBe('TIPO_ARCHIVO_NO_PERMITIDO');
    }
  });

  it('rechaza contenido que no corresponde a la extensión (415)', () => {
    expect(
      rechazo({ nombre: 'falso.pdf', contenido: Buffer.from('hola') }).response
        .codigo,
    ).toBe('CONTENIDO_NO_COINCIDE');
    expect(rechazo({ nombre: 'foto.png', contenido: jpg }).status).toBe(415);
    expect(
      rechazo({ nombre: 'libro.xlsx', contenido: zipSinLibro }).status,
    ).toBe(415);
    expect(
      rechazo({ nombre: 'datos.csv', contenido: pdf.subarray(0, 0) }).status,
    ).toBe(400);
    expect(
      rechazo({
        nombre: 'datos.csv',
        contenido: Buffer.from([0x25, 0x00, 0x01, 0x02]),
      }).status,
    ).toBe(415);
  });

  it('rechaza archivos vacíos (400) y los que superan 20 MB (413)', () => {
    const vacio = rechazo({ nombre: 'a.pdf', contenido: Buffer.alloc(0) });
    expect(vacio.status).toBe(400);
    expect(vacio.response.codigo).toBe('ARCHIVO_VACIO');

    const justo = Buffer.concat([
      pdf,
      Buffer.alloc(MAX_BYTES_ADJUNTO - pdf.length),
    ]);
    expect(
      validarArchivo({ nombre: 'justo.pdf', contenido: justo }).extension,
    ).toBe('pdf');

    const grande = Buffer.concat([
      pdf,
      Buffer.alloc(MAX_BYTES_ADJUNTO - pdf.length + 1),
    ]);
    const error = rechazo({ nombre: 'grande.pdf', contenido: grande });
    expect(error.status).toBe(413);
    expect(error.response.codigo).toBe('ARCHIVO_DEMASIADO_GRANDE');
  });

  it('extensionDe toma lo posterior al último punto', () => {
    expect(extensionDe('a.b.PDF')).toBe('pdf');
    expect(extensionDe('archivo')).toBeNull();
    expect(extensionDe('termina.')).toBeNull();
    expect(extensionDe('.oculto')).toBeNull();
  });

  it('limpiarNombreArchivo recupera UTF-8 mal decodificado y elimina rutas y controles', () => {
    const mojibake = Buffer.from('Cotización final.pdf', 'utf8').toString(
      'latin1',
    );
    expect(limpiarNombreArchivo(mojibake)).toBe('Cotización final.pdf');
    expect(limpiarNombreArchivo('plano.pdf')).toBe('plano.pdf');
    expect(limpiarNombreArchivo('..\\..\\etc/passwd.pdf')).toBe('passwd.pdf');
    expect(limpiarNombreArchivo('a\u0000b\n.pdf')).toBe('ab.pdf');
    expect(limpiarNombreArchivo('   ')).toBe('archivo');
    expect(limpiarNombreArchivo('x'.repeat(500)).length).toBe(200);
  });
});
