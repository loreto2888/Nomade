import ExcelJS from 'exceljs';
import { COLUMNAS_PLANILLA } from '../presupuestos/columnas-planilla.js';
import type { FamiliaDisponible } from './validacion-presupuesto.js';

export const NOMBRE_PLANTILLA_PRESUPUESTO = 'plantilla-presupuesto.xlsx';

/** Filas de la hoja «Partidas» con lista desplegable de familias. */
const FILAS_CON_LISTA = 1000;

/**
 * Plantilla genérica PROVISORIA de presupuesto (la plantilla real del cliente no existe aún, H9):
 * hoja «Partidas» con el encabezado, hoja «Instrucciones» con las reglas y un ejemplo, y hoja
 * «Familias» con el catálogo activo (la columna Familia ofrece esa lista).
 */
export async function generarPlantillaPresupuesto(
  familias: readonly FamiliaDisponible[],
): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Plataforma Nómade';
  libro.created = new Date();

  const partidas = libro.addWorksheet('Partidas', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  partidas.columns = COLUMNAS_PLANILLA.map((c) => ({
    header: c.titulo,
    key: c.clave,
    width: c.ancho,
  }));
  partidas.getRow(1).font = { bold: true };
  partidas.getColumn('codigo').numFmt = '@';
  partidas.getColumn('cantidad').numFmt = '#,##0.####';
  partidas.getColumn('precioUnitario').numFmt = '#,##0.####';

  const hojaFamilias = libro.addWorksheet('Familias');
  hojaFamilias.columns = [
    { header: 'Código', key: 'codigo', width: 26 },
    { header: 'Nombre', key: 'nombre', width: 36 },
  ];
  hojaFamilias.getRow(1).font = { bold: true };
  for (const f of familias)
    hojaFamilias.addRow({ codigo: f.codigo, nombre: f.nombre });

  if (familias.length > 0) {
    const columnaFamilia =
      COLUMNAS_PLANILLA.findIndex((c) => c.clave === 'familia') + 1;
    for (let fila = 2; fila <= FILAS_CON_LISTA + 1; fila++) {
      partidas.getCell(fila, columnaFamilia).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Familias!$B$2:$B$${familias.length + 1}`],
        showErrorMessage: true,
        errorStyle: 'warning',
        errorTitle: 'Familia no reconocida',
        error: 'Elige una familia de la lista (hoja «Familias»).',
      };
    }
  }

  const instrucciones = libro.addWorksheet('Instrucciones');
  instrucciones.columns = [
    { key: 'a', width: 22 },
    { key: 'b', width: 90 },
  ];
  const titulo = instrucciones.addRow({
    a: 'Plantilla de presupuesto (provisoria)',
  });
  titulo.font = { bold: true, size: 14 };
  instrucciones.addRow({
    a: 'Cómo usarla',
    b: 'Completa la hoja «Partidas» (una fila por partida) y súbela en Herramientas → Importación masiva. La primera fila de «Partidas» es el encabezado; las columnas pueden ir en otro orden. Se importan archivos .xlsx y .csv.',
  });
  instrucciones.addRow({
    a: 'Moneda',
    b: 'Los precios van en la moneda de la obra: CLP (números enteros) o UF (hasta 4 decimales). El total de cada partida es cantidad × precio unitario y lo calcula la plataforma.',
  });
  instrucciones.addRow({
    a: 'Resultado',
    b: 'Si todas las filas son válidas, al confirmar se crea una nueva versión del presupuesto de la obra en estado borrador. Si hay errores, se muestran fila por fila y no se importa nada hasta corregirlos.',
  });
  instrucciones.addRow({});
  const cabecera = instrucciones.addRow({ a: 'Columna', b: 'Regla' });
  cabecera.font = { bold: true };
  for (const c of COLUMNAS_PLANILLA) {
    instrucciones.addRow({ a: c.titulo, b: c.ayuda });
  }
  instrucciones.addRow({});
  const ejemplo = instrucciones.addRow({ a: 'Ejemplo', b: '' });
  ejemplo.font = { bold: true };
  const f1 = familias[0]?.nombre ?? 'Obra gruesa';
  const f2 = familias[1]?.nombre ?? f1;
  instrucciones.addRow({
    a: 'Código',
    b: 'Familia | Descripción | Unidad | Cantidad | Precio unitario',
  });
  instrucciones.addRow({
    a: '1.1',
    b: `${f1} | Radier de hormigón e=10 cm | m2 | 120,5 | 18500`,
  });
  instrucciones.addRow({
    a: '1.2',
    b: `${f2} | Excavación masiva | m3 | 80 | 9500`,
  });
  instrucciones.eachRow((fila) => {
    fila.alignment = { vertical: 'top', wrapText: true };
  });

  return Buffer.from(await libro.xlsx.writeBuffer());
}
