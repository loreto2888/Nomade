import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { leerPlanilla } from '../importaciones/planilla.js';
import { validarFilasPresupuesto } from '../importaciones/validacion-presupuesto.js';
import { MonedaContrato } from '../obras/obras.tipos.js';
import {
  generarExcelPresupuesto,
  nombreArchivoPresupuesto,
} from './exportacion-excel.js';
import type { PresupuestoDetalleDto } from './presupuestos.dto.js';

const familiaG = { id: 10, codigo: 'obra_gruesa', nombre: 'Obra gruesa' };
const familiaI = { id: 11, codigo: 'instalaciones', nombre: 'Instalaciones' };

function detalle(
  moneda: MonedaContrato = MonedaContrato.Clp,
): PresupuestoDetalleDto {
  const enUf = moneda === MonedaContrato.Uf;
  return {
    version: {
      id: 1,
      obraId: 1,
      numero: 2,
      estado: 'aprobado',
      vigente: true,
      descripcion: 'Con adicionales',
      moneda,
      valorUf: enUf ? 40_000 : null,
      fechaValorUf: enUf ? '2026-11-19' : null,
      total: enUf ? 3.5 : 35_000,
      totalClp: enUf ? 140_000 : 35_000,
      cantidadPartidas: 2,
      copiadaDeId: 1,
      copiadaDeNumero: 1,
      importacionLoteId: null,
      creadoPor: { id: 2, nombre: 'Camila Rojas' },
      creadoEn: '2026-11-18T12:00:00.000Z',
      actualizadoEn: '2026-11-19T12:00:00.000Z',
      enviadoEn: '2026-11-18T13:00:00.000Z',
      enviadoPor: { id: 2, nombre: 'Camila Rojas' },
      resueltoEn: '2026-11-19T12:00:00.000Z',
      resueltoPor: { id: 3, nombre: 'Tomás Silva' },
      motivoResolucion: null,
      version: 4,
    } as PresupuestoDetalleDto['version'],
    partidas: [
      {
        id: 1,
        versionId: 1,
        orden: 1,
        codigo: '1.10',
        familia: familiaG,
        descripcion: 'Radier',
        unidad: 'm2',
        cantidad: 10.5,
        precioUnitario: enUf ? 0.25 : 2000,
        total: enUf ? 2.625 : 21_000,
        totalClp: enUf ? 105_000 : 21_000,
        version: 1,
      },
      {
        id: 2,
        versionId: 1,
        orden: 2,
        codigo: '2.1',
        familia: familiaI,
        descripcion: 'Cañería',
        unidad: 'ml',
        cantidad: 7,
        precioUnitario: enUf ? 0.125 : 2000,
        total: enUf ? 0.875 : 14_000,
        totalClp: enUf ? 35_000 : 14_000,
        version: 1,
      },
    ],
    totalesPorFamilia: [
      {
        familia: familiaG,
        cantidadPartidas: 1,
        total: enUf ? 2.625 : 21_000,
        totalClp: enUf ? 105_000 : 21_000,
      },
      {
        familia: familiaI,
        cantidadPartidas: 1,
        total: enUf ? 0.875 : 14_000,
        totalClp: enUf ? 35_000 : 14_000,
      },
    ],
  };
}

const obra = {
  codigoCentroCosto: 'CC-001',
  nombre: 'Local Parque Norte',
  cliente: 'Grupo Andino SpA',
};

async function abrir(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  return libro;
}

describe('exportación a Excel', () => {
  it('la hoja «Partidas» lleva las columnas de la plantilla más los totales', async () => {
    const libro = await abrir(
      await generarExcelPresupuesto({ obra, detalle: detalle() }),
    );
    expect(libro.worksheets.map((h) => h.name)).toEqual([
      'Partidas',
      'Resumen',
    ]);
    const hoja = libro.getWorksheet('Partidas')!;
    expect((hoja.getRow(1).values as string[]).slice(1)).toEqual([
      'Código',
      'Familia',
      'Descripción',
      'Unidad',
      'Cantidad',
      'Precio unitario',
      'Total (CLP)',
    ]);
    expect((hoja.getRow(2).values as unknown[]).slice(1)).toEqual([
      '1.10',
      'Obra gruesa',
      'Radier',
      'm2',
      10.5,
      2000,
      21_000,
    ]);
    expect(hoja.getRow(3).getCell(2).value).toBe('Instalaciones');
  });

  it('la hoja «Resumen» trae la obra, el estado y los totales por familia', async () => {
    const libro = await abrir(
      await generarExcelPresupuesto({ obra, detalle: detalle() }),
    );
    const filas = libro
      .getWorksheet('Resumen')!
      .getSheetValues() as unknown[][];
    const texto = filas
      .flat()
      .filter(
        (v): v is string | number =>
          typeof v === 'string' || typeof v === 'number',
      )
      .join(' | ');
    expect(texto).toContain('CC-001 · Local Parque Norte');
    expect(texto).toContain('Grupo Andino SpA');
    expect(texto).toContain('2 · Con adicionales');
    expect(texto).toContain('aprobada (vigente)');
    expect(texto).toContain('Aprobada por | Tomás Silva');
    expect(texto).toContain('Obra gruesa | 1 | 21000 | 21000');
    expect(texto).toContain('Total | 2 | 35000 | 35000');
  });

  it('una versión en UF muestra el valor de la UF y los totales en ambas monedas', async () => {
    const libro = await abrir(
      await generarExcelPresupuesto({
        obra,
        detalle: detalle(MonedaContrato.Uf),
      }),
    );
    const hoja = libro.getWorksheet('Partidas')!;
    expect(hoja.getRow(1).getCell(7).value).toBe('Total (UF)');
    expect(hoja.getRow(2).getCell(7).value).toBe(2.625);
    expect(hoja.getRow(2).getCell(8).value).toBe(105_000);
    const texto = (
      libro.getWorksheet('Resumen')!.getSheetValues() as unknown[][]
    )
      .flat()
      .join(' ');
    expect(texto).toContain('40000 (2026-11-19)');
  });

  it('un presupuesto exportado se puede volver a importar tal cual', async () => {
    const buffer = await generarExcelPresupuesto({ obra, detalle: detalle() });
    const filas = await leerPlanilla(buffer, 'xlsx');
    const resultados = validarFilasPresupuesto(filas, {
      moneda: MonedaContrato.Clp,
      familias: [familiaG, familiaI],
    });
    expect(resultados.flatMap((r) => r.errores)).toEqual([]);
    expect(resultados.map((r) => r.partida)).toEqual([
      {
        codigo: '1.10',
        familiaId: 10,
        descripcion: 'Radier',
        unidad: 'm2',
        cantidad: 10.5,
        precioUnitario: 2000,
      },
      {
        codigo: '2.1',
        familiaId: 11,
        descripcion: 'Cañería',
        unidad: 'ml',
        cantidad: 7,
        precioUnitario: 2000,
      },
    ]);
  });

  it('el nombre del archivo es seguro', () => {
    expect(nombreArchivoPresupuesto('CC-001', 3)).toBe(
      'presupuesto-CC-001-v3.xlsx',
    );
    expect(nombreArchivoPresupuesto('CC 00/1"', 1)).toBe(
      'presupuesto-CC_00_1_-v1.xlsx',
    );
  });
});
