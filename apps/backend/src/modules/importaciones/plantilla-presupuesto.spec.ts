import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { COLUMNAS_PLANILLA } from '../presupuestos/columnas-planilla.js';
import { MonedaContrato } from '../obras/obras.tipos.js';
import { leerPlanilla } from './planilla.js';
import { generarPlantillaPresupuesto } from './plantilla-presupuesto.js';
import { validarFilasPresupuesto } from './validacion-presupuesto.js';

const familias = [
  { id: 10, codigo: 'obra_gruesa', nombre: 'Obra gruesa' },
  { id: 11, codigo: 'instalaciones', nombre: 'Instalaciones' },
];

async function abrir(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  return libro;
}

describe('plantilla provisoria de presupuesto', () => {
  it('trae las hojas Partidas, Familias e Instrucciones, con el encabezado esperado', async () => {
    const libro = await abrir(await generarPlantillaPresupuesto(familias));
    expect(libro.worksheets.map((h) => h.name)).toEqual([
      'Partidas',
      'Familias',
      'Instrucciones',
    ]);
    const encabezado = libro.getWorksheet('Partidas')!.getRow(1)
      .values as string[];
    expect(encabezado.slice(1)).toEqual([
      'Código',
      'Familia',
      'Descripción',
      'Unidad',
      'Cantidad',
      'Precio unitario',
    ]);
    expect(COLUMNAS_PLANILLA.map((c) => c.titulo)).toEqual(encabezado.slice(1));
  });

  it('lista las familias activas y las ofrece como lista desplegable', async () => {
    const libro = await abrir(await generarPlantillaPresupuesto(familias));
    const hoja = libro.getWorksheet('Familias')!;
    expect((hoja.getRow(2).values as unknown[]).slice(1)).toEqual([
      'obra_gruesa',
      'Obra gruesa',
    ]);
    expect((hoja.getRow(3).values as unknown[]).slice(1)).toEqual([
      'instalaciones',
      'Instalaciones',
    ]);
    const validacion = libro
      .getWorksheet('Partidas')!
      .getCell('B2').dataValidation;
    expect(validacion).toMatchObject({
      type: 'list',
      formulae: ['Familias!$B$2:$B$3'],
    });
  });

  it('la hoja Instrucciones describe cada columna', async () => {
    const libro = await abrir(await generarPlantillaPresupuesto(familias));
    const texto = libro
      .getWorksheet('Instrucciones')!
      .getSheetValues()
      .flat()
      .filter((v): v is string => typeof v === 'string')
      .join('\n');
    expect(texto).toContain('provisoria');
    for (const c of COLUMNAS_PLANILLA) expect(texto).toContain(c.ayuda);
  });

  it('sin familias en el catálogo igual se genera (sin lista desplegable)', async () => {
    const libro = await abrir(await generarPlantillaPresupuesto([]));
    expect(
      libro.getWorksheet('Partidas')!.getCell('B2').dataValidation,
    ).toBeUndefined();
  });

  it('la plantilla completada se importa sin errores (ida y vuelta)', async () => {
    const libro = await abrir(await generarPlantillaPresupuesto(familias));
    const hoja = libro.getWorksheet('Partidas')!;
    hoja.addRow(['1.10', 'Obra gruesa', 'Radier', 'm2', 120.5, 18500]);
    hoja.addRow(['1.20', 'instalaciones', 'Cañería', 'ml', 40, 7500]);
    const buffer = Buffer.from(await libro.xlsx.writeBuffer());

    const filas = await leerPlanilla(buffer, 'xlsx');
    const resultados = validarFilasPresupuesto(filas, {
      moneda: MonedaContrato.Clp,
      familias,
    });
    expect(resultados.every((r) => r.errores.length === 0)).toBe(true);
    expect(resultados.map((r) => r.partida?.codigo)).toEqual(['1.10', '1.20']);
  });

  it('la plantilla sin completar no tiene filas de datos (no se importa por error)', async () => {
    const buffer = await generarPlantillaPresupuesto(familias);
    await expect(leerPlanilla(buffer, 'xlsx')).rejects.toMatchObject({
      response: { codigo: 'PLANTILLA_INVALIDA' },
    });
  });
});
