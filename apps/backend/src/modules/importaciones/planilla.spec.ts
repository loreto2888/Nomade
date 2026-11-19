import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import {
  MAX_FILAS_IMPORTACION,
  decodificarCsv,
  detectarSeparador,
  leerPlanilla,
  parsearCsv,
  valorDeCelda,
} from './planilla.js';

const ENCABEZADO = [
  'Código',
  'Familia',
  'Descripción',
  'Unidad',
  'Cantidad',
  'Precio unitario',
];

async function xlsx(
  filas: ExcelJS.CellValue[][],
  nombreHoja = 'Partidas',
  antes?: (libro: ExcelJS.Workbook) => void,
): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  antes?.(libro);
  const hoja = libro.addWorksheet(nombreHoja);
  for (const fila of filas) hoja.addRow(fila);
  return Buffer.from(await libro.xlsx.writeBuffer());
}

const codigoError = (promesa: Promise<unknown>) =>
  promesa.then(
    () => 'sin error',
    (e: { getResponse: () => { codigo: string; mensaje: string } }) =>
      e.getResponse(),
  );

describe('CSV', () => {
  it('detecta el separador (; , tabulador)', () => {
    expect(detectarSeparador('a;b;c\n1;2;3')).toBe(';');
    expect(detectarSeparador('a,b,c\n1,2,3')).toBe(',');
    expect(detectarSeparador('a\tb\tc')).toBe('\t');
  });

  it('parsea comillas, comillas escapadas, saltos de línea internos y CRLF', () => {
    const texto = 'a;b;c\r\n"x;y";"di ""hola""";"línea1\nlínea2"\r\n1;2;3';
    expect(parsearCsv(texto)).toEqual([
      ['a', 'b', 'c'],
      ['x;y', 'di "hola"', 'línea1\nlínea2'],
      ['1', '2', '3'],
    ]);
  });

  it('decodifica UTF-8 (con y sin BOM) y cae a Windows-1252', () => {
    expect(decodificarCsv(Buffer.from('Código;Ñandú', 'utf8'))).toBe(
      'Código;Ñandú',
    );
    expect(
      decodificarCsv(
        Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('Código')]),
      ),
    ).toBe('Código');
    // «Código» en Windows-1252: la «ó» es el byte 0xF3 (no es UTF-8 válido).
    expect(
      decodificarCsv(Buffer.from([0x43, 0xf3, 0x64, 0x69, 0x67, 0x6f])),
    ).toBe('Código');
  });

  it('lee una planilla CSV con encabezado, omite filas vacías y numera según el archivo', async () => {
    const csv = [
      ENCABEZADO.join(';'),
      '1.1;Obra gruesa;Radier;m2;120,5;18500',
      '',
      '1.2;Instalaciones;Excavación;m3;80;9.500',
      ';;;;;',
    ].join('\n');
    const filas = await leerPlanilla(Buffer.from(csv), 'csv');
    expect(filas).toEqual([
      {
        numeroFila: 2,
        celdas: {
          codigo: '1.1',
          familia: 'Obra gruesa',
          descripcion: 'Radier',
          unidad: 'm2',
          cantidad: '120,5',
          precioUnitario: '18500',
        },
      },
      {
        numeroFila: 4,
        celdas: {
          codigo: '1.2',
          familia: 'Instalaciones',
          descripcion: 'Excavación',
          unidad: 'm3',
          cantidad: '80',
          precioUnitario: '9.500',
        },
      },
    ]);
  });

  it('un CSV en Windows-1252 conserva las tildes', async () => {
    const texto = `${ENCABEZADO.join(';')}\n1;Obra gruesa;Excavación;m3;1;1`;
    const filas = await leerPlanilla(Buffer.from(texto, 'latin1'), 'csv');
    expect(filas[0].celdas.descripcion).toBe('Excavación');
  });
});

describe('Excel', () => {
  it('lee la hoja «Partidas»: valores numéricos como número y celdas vacías como null', async () => {
    const buffer = await xlsx([
      ENCABEZADO,
      ['1.1', 'Obra gruesa', 'Radier', 'm2', 120.5, 18500],
      ['1.2', 'Obra gruesa', 'Muros', null, 3, 100],
    ]);
    const filas = await leerPlanilla(buffer, 'xlsx');
    expect(filas).toEqual([
      {
        numeroFila: 2,
        celdas: {
          codigo: '1.1',
          familia: 'Obra gruesa',
          descripcion: 'Radier',
          unidad: 'm2',
          cantidad: 120.5,
          precioUnitario: 18500,
        },
      },
      {
        numeroFila: 3,
        celdas: {
          codigo: '1.2',
          familia: 'Obra gruesa',
          descripcion: 'Muros',
          unidad: null,
          cantidad: 3,
          precioUnitario: 100,
        },
      },
    ]);
  });

  it('prefiere la hoja «Partidas» aunque no sea la primera', async () => {
    const buffer = await xlsx(
      [ENCABEZADO, ['1', 'F', 'Algo', 'u', 1, 1]],
      'Partidas',
      (libro) => libro.addWorksheet('Instrucciones').addRow(['Léeme']),
    );
    const filas = await leerPlanilla(buffer, 'xlsx');
    expect(filas).toHaveLength(1);
  });

  it('acepta las columnas en otro orden, sinónimos del encabezado y columnas extra', async () => {
    const buffer = await xlsx([
      ['Cant.', 'PU', 'Total', 'Item', 'Rubro', 'Detalle', 'UM'],
      [2, 500, 1000, 'A1', 'Obra gruesa', 'Pilar', 'un'],
    ]);
    const [fila] = await leerPlanilla(buffer, 'xlsx');
    expect(fila.celdas).toEqual({
      codigo: 'A1',
      familia: 'Obra gruesa',
      descripcion: 'Pilar',
      unidad: 'un',
      cantidad: 2,
      precioUnitario: 500,
    });
  });

  it('el encabezado puede venir después de filas vacías', async () => {
    const buffer = await xlsx([
      [],
      [],
      ENCABEZADO,
      ['1', 'F', 'Algo', 'u', 1, 1],
    ]);
    const [fila] = await leerPlanilla(buffer, 'xlsx');
    expect(fila.numeroFila).toBe(4);
  });

  it('lee fórmulas (su resultado), texto enriquecido y enlaces', async () => {
    const buffer = await xlsx([
      ENCABEZADO,
      [
        { richText: [{ text: '1.' }, { text: '1' }] },
        { text: 'Obra gruesa', hyperlink: 'https://ejemplo.cl' },
        'Descripción',
        'm2',
        { formula: '2+3', result: 5 },
        { formula: 'A1', result: undefined },
      ],
    ]);
    const [fila] = await leerPlanilla(buffer, 'xlsx');
    expect(fila.celdas).toMatchObject({
      codigo: '1.1',
      familia: 'Obra gruesa',
      cantidad: 5,
      precioUnitario: null,
    });
  });

  it('valorDeCelda normaliza los tipos de ExcelJS', () => {
    expect(valorDeCelda(null)).toBeNull();
    expect(valorDeCelda(undefined)).toBeNull();
    expect(valorDeCelda('  ')).toBeNull();
    expect(valorDeCelda(12.5)).toBe(12.5);
    expect(valorDeCelda(new Date('2026-11-19T12:00:00Z'))).toBe('2026-11-19');
    expect(valorDeCelda({ error: '#DIV/0!' })).toBe('#DIV/0!');
    expect(valorDeCelda(true)).toBe('VERDADERO');
  });
});

describe('errores de estructura (422)', () => {
  it('un archivo que no es un Excel válido', async () => {
    expect(
      await codigoError(
        leerPlanilla(Buffer.from('PK\u0003\u0004basura'), 'xlsx'),
      ),
    ).toMatchObject({
      codigo: 'ARCHIVO_ILEGIBLE',
    });
  });

  it('una planilla vacía', async () => {
    expect(
      await codigoError(leerPlanilla(Buffer.from('\n\n'), 'csv')),
    ).toMatchObject({
      codigo: 'PLANTILLA_INVALIDA',
      mensaje: 'La planilla está vacía.',
    });
  });

  it('faltan columnas: las nombra y remite a la plantilla', async () => {
    const r = await codigoError(
      leerPlanilla(Buffer.from('Código;Descripción\n1;Algo'), 'csv'),
    );
    expect(r).toMatchObject({ codigo: 'PLANTILLA_INVALIDA' });
    expect((r as { mensaje: string }).mensaje).toContain(
      '«Familia», «Unidad», «Cantidad», «Precio unitario»',
    );
    expect((r as { mensaje: string }).mensaje).toContain('plantilla');
  });

  it('una columna repetida', async () => {
    const csv = `${ENCABEZADO.join(';')};Cantidad\n1;F;Algo;u;1;1;1`;
    expect(
      await codigoError(leerPlanilla(Buffer.from(csv), 'csv')),
    ).toMatchObject({
      codigo: 'PLANTILLA_INVALIDA',
      mensaje: 'La columna «Cantidad» aparece repetida en el encabezado.',
    });
  });

  it('solo encabezado, sin filas de datos', async () => {
    expect(
      await codigoError(leerPlanilla(Buffer.from(ENCABEZADO.join(';')), 'csv')),
    ).toMatchObject({
      codigo: 'PLANTILLA_INVALIDA',
    });
  });

  it('demasiadas filas', async () => {
    const filas = Array.from(
      { length: MAX_FILAS_IMPORTACION + 1 },
      (_, i) => `${i + 1};F;D;u;1;1`,
    );
    const csv = [ENCABEZADO.join(';'), ...filas].join('\n');
    expect(
      await codigoError(leerPlanilla(Buffer.from(csv), 'csv')),
    ).toMatchObject({
      codigo: 'PLANILLA_DEMASIADO_GRANDE',
    });
  });
});
