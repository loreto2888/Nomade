import ExcelJS from 'exceljs';
import { MonedaContrato } from '../obras/obras.tipos.js';
import { COLUMNAS_PLANILLA } from './columnas-planilla.js';
import { ETIQUETA_ESTADO } from './estados.js';
import type { PresupuestoDetalleDto } from './presupuestos.dto.js';
import { EstadoPresupuesto } from './presupuestos.tipos.js';

export const TIPO_MIME_XLSX =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const FORMATO_CLP = '#,##0';
const FORMATO_UF = '#,##0.0000';
const FORMATO_CANTIDAD = '#,##0.####';

/** Nombre de archivo seguro: `presupuesto-CC-001-v2.xlsx`. */
export function nombreArchivoPresupuesto(
  centroCosto: string,
  numeroVersion: number,
): string {
  const seguro = centroCosto.replace(/[^A-Za-z0-9._-]/g, '_');
  return `presupuesto-${seguro}-v${numeroVersion}.xlsx`;
}

export interface DatosExportacion {
  obra: { codigoCentroCosto: string; nombre: string; cliente: string };
  detalle: PresupuestoDetalleDto;
}

const fecha = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleString('es-CL', { timeZone: 'America/Santiago' })
    : '';

/**
 * Excel de una versión. La hoja «Partidas» usa las mismas columnas que la plantilla de
 * importación (más «Total»), de modo que un presupuesto exportado se puede volver a importar.
 */
export async function generarExcelPresupuesto(
  datos: DatosExportacion,
): Promise<Buffer> {
  const { version, partidas, totalesPorFamilia } = datos.detalle;
  const enUf = version.moneda === MonedaContrato.Uf;
  const formatoMonto = enUf ? FORMATO_UF : FORMATO_CLP;

  const libro = new ExcelJS.Workbook();
  libro.creator = 'Plataforma Nómade';
  libro.created = new Date();

  const hoja = libro.addWorksheet('Partidas', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  hoja.columns = [
    ...COLUMNAS_PLANILLA.map((c) => ({
      header: c.titulo,
      key: c.clave,
      width: c.ancho,
    })),
    { header: `Total (${version.moneda})`, key: 'total', width: 20 },
    // En CLP el total ya está en pesos: la columna extra solo aparece en versiones en UF.
    ...(enUf ? [{ header: 'Total (CLP)', key: 'totalClp', width: 18 }] : []),
  ];
  hoja.getRow(1).font = { bold: true };
  for (const p of partidas) {
    hoja.addRow({
      codigo: p.codigo,
      familia: p.familia.nombre,
      descripcion: p.descripcion,
      unidad: p.unidad,
      cantidad: p.cantidad,
      precioUnitario: p.precioUnitario,
      total: p.total,
      totalClp: p.totalClp,
    });
  }
  // El código es texto: así Excel no convierte «1.10» en 1,1.
  hoja.getColumn('codigo').numFmt = '@';
  hoja.getColumn('cantidad').numFmt = FORMATO_CANTIDAD;
  hoja.getColumn('precioUnitario').numFmt = formatoMonto;
  hoja.getColumn('total').numFmt = formatoMonto;
  if (enUf) hoja.getColumn('totalClp').numFmt = FORMATO_CLP;

  const resumen = libro.addWorksheet('Resumen');
  resumen.columns = [
    { key: 'a', width: 28 },
    { key: 'b', width: 34 },
    { key: 'c', width: 22 },
    { key: 'd', width: 20 },
  ];
  const dato = (etiqueta: string, valor: string | number): void => {
    const fila = resumen.addRow({ a: etiqueta, b: valor });
    fila.getCell('a').font = { bold: true };
    fila.getCell('b').alignment = { horizontal: 'left' };
  };
  dato('Obra', `${datos.obra.codigoCentroCosto} · ${datos.obra.nombre}`);
  dato('Cliente', datos.obra.cliente);
  dato(
    'Versión',
    `${version.numero}${version.descripcion ? ` · ${version.descripcion}` : ''}`,
  );
  dato(
    'Estado',
    ETIQUETA_ESTADO[version.estado] + (version.vigente ? ' (vigente)' : ''),
  );
  dato('Moneda', version.moneda);
  if (enUf && version.valorUf !== null) {
    dato(
      'Valor de la UF',
      `${version.valorUf} (${version.fechaValorUf ?? ''})`,
    );
  }
  dato('Creada por', version.creadoPor?.nombre ?? '');
  dato('Creada el', fecha(version.creadoEn));
  if (version.resueltoEn) {
    dato(
      version.estado === EstadoPresupuesto.Aprobado
        ? 'Aprobada por'
        : 'Rechazada por',
      `${version.resueltoPor?.nombre ?? ''} · ${fecha(version.resueltoEn)}`,
    );
  }
  resumen.addRow({});
  const cabecera = resumen.addRow({
    a: 'Familia',
    b: 'Partidas',
    c: `Total (${version.moneda})`,
    d: 'Total (CLP)',
  });
  cabecera.font = { bold: true };
  for (const t of totalesPorFamilia) {
    const fila = resumen.addRow({
      a: t.familia.nombre,
      b: t.cantidadPartidas,
      c: t.total,
      d: t.totalClp,
    });
    fila.getCell('b').alignment = { horizontal: 'left' };
    fila.getCell('c').numFmt = formatoMonto;
    fila.getCell('d').numFmt = FORMATO_CLP;
  }
  const total = resumen.addRow({
    a: 'Total',
    b: version.cantidadPartidas,
    c: version.total,
    d: version.totalClp,
  });
  total.font = { bold: true };
  total.getCell('b').alignment = { horizontal: 'left' };
  total.getCell('c').numFmt = formatoMonto;
  total.getCell('d').numFmt = FORMATO_CLP;

  return Buffer.from(await libro.xlsx.writeBuffer());
}
