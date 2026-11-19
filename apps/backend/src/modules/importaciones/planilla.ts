import { HttpStatus } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { ErrorAplicacion } from '../../common/errores/error-aplicacion.js';
import {
  CLAVES_COLUMNA,
  COLUMNAS_PLANILLA,
  claveDeEncabezado,
  type ClaveColumna,
} from '../presupuestos/columnas-planilla.js';
import { MAX_PARTIDAS_POR_VERSION } from '../presupuestos/presupuestos.tipos.js';

/** Valor leído de una celda: texto, número o vacío. */
export type CeldaCruda = string | number | null;

export interface FilaCruda {
  /** Número de fila en la planilla original (la primera de datos suele ser la 2). */
  numeroFila: number;
  celdas: Record<ClaveColumna, CeldaCruda>;
}

/** Tope de filas de datos de una planilla de presupuesto. */
export const MAX_FILAS_IMPORTACION = MAX_PARTIDAS_POR_VERSION;

const HOJA_PARTIDAS = 'Partidas';

const planillaInvalida = (mensaje: string): ErrorAplicacion =>
  new ErrorAplicacion(
    HttpStatus.UNPROCESSABLE_ENTITY,
    'PLANTILLA_INVALIDA',
    mensaje,
  );

const archivoIlegible = (): ErrorAplicacion =>
  new ErrorAplicacion(
    HttpStatus.UNPROCESSABLE_ENTITY,
    'ARCHIVO_ILEGIBLE',
    'No se pudo leer el archivo. Verifica que sea un .xlsx o un .csv válido y vuelve a intentarlo.',
  );

// ---------------------------------------------------------------------------
// Celdas de Excel
// ---------------------------------------------------------------------------

/** Texto o número de una celda de ExcelJS (fórmulas, texto enriquecido, enlaces y fechas incluidos). */
export function valorDeCelda(valor: ExcelJS.CellValue | undefined): CeldaCruda {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string') return valor.trim() === '' ? null : valor;
  if (typeof valor === 'boolean') return valor ? 'VERDADERO' : 'FALSO';
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  if ('richText' in valor) {
    const texto = valor.richText.map((t) => t.text).join('');
    return texto.trim() === '' ? null : texto;
  }
  if ('formula' in valor || 'sharedFormula' in valor) {
    return valorDeCelda(valor.result);
  }
  if ('error' in valor) return String(valor.error);
  if ('text' in valor) return valorDeCelda(valor.text);
  return null;
}

type FilaMatriz = { numeroFila: number; valores: CeldaCruda[] };

async function filasDeExcel(contenido: Buffer): Promise<FilaMatriz[]> {
  const libro = new ExcelJS.Workbook();
  try {
    await libro.xlsx.load(contenido as unknown as ExcelJS.Buffer);
  } catch {
    throw archivoIlegible();
  }
  const hoja =
    libro.getWorksheet(HOJA_PARTIDAS) ??
    libro.worksheets.find((h) => h.state === 'visible') ??
    libro.worksheets[0];
  if (!hoja) throw archivoIlegible();

  const filas: FilaMatriz[] = [];
  hoja.eachRow({ includeEmpty: false }, (fila, numeroFila) => {
    const valores: CeldaCruda[] = [];
    fila.eachCell({ includeEmpty: true }, (celda, columna) => {
      valores[columna - 1] = valorDeCelda(celda.value);
    });
    filas.push({ numeroFila, valores });
  });
  return filas;
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

/** UTF-8 (con o sin BOM); si no lo es, Windows-1252 (lo que guarda Excel en español como «CSV»). */
export function decodificarCsv(contenido: Buffer): string {
  let texto: string;
  try {
    texto = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(
      contenido,
    );
  } catch {
    texto = new TextDecoder('windows-1252').decode(contenido);
  }
  return texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto;
}

/** Separador de la primera línea no vacía: `;` (Excel en español), `,` o tabulador. */
export function detectarSeparador(texto: string): string {
  const primera = texto.split(/\r\n|\n|\r/).find((l) => l.trim() !== '') ?? '';
  const cuentas = [';', ',', '\t'].map(
    (s) => [s, primera.split(s).length - 1] as const,
  );
  return cuentas.sort((a, b) => b[1] - a[1])[0][0];
}

/** Parser CSV con comillas (`""` escapa una comilla; admite saltos de línea dentro de comillas). */
export function parsearCsv(texto: string): string[][] {
  const separador = detectarSeparador(texto);
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = '';
  let entreComillas = false;
  const cerrarFila = () => {
    fila.push(campo);
    campo = '';
    filas.push(fila);
    fila = [];
  };
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (entreComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          entreComillas = false;
        }
      } else {
        campo += c;
      }
    } else if (c === '"') {
      entreComillas = true;
    } else if (c === separador) {
      fila.push(campo);
      campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      cerrarFila();
    } else {
      campo += c;
    }
  }
  if (campo !== '' || fila.length > 0) cerrarFila();
  return filas;
}

function filasDeCsv(contenido: Buffer): FilaMatriz[] {
  return parsearCsv(decodificarCsv(contenido)).map((fila, indice) => ({
    numeroFila: indice + 1,
    valores: fila.map((v) => (v.trim() === '' ? null : v)),
  }));
}

// ---------------------------------------------------------------------------
// Lectura de la planilla
// ---------------------------------------------------------------------------

const vacia = (fila: FilaMatriz): boolean =>
  fila.valores.every((v) => v === null || v === undefined);

/**
 * Lee una planilla `.xlsx` o `.csv`: la primera fila con contenido es el encabezado (las columnas
 * pueden venir en cualquier orden y se ignoran las desconocidas); las filas vacías se omiten.
 * Lanza `422` si el archivo no se puede leer, falta una columna, hay una repetida, no hay datos o
 * supera el máximo de filas.
 */
export async function leerPlanilla(
  contenido: Buffer,
  extension: 'xlsx' | 'csv',
): Promise<FilaCruda[]> {
  const matriz =
    extension === 'xlsx'
      ? await filasDeExcel(contenido)
      : filasDeCsv(contenido);
  const [encabezado, ...datos] = matriz.filter((f) => !vacia(f));
  if (!encabezado) {
    throw planillaInvalida('La planilla está vacía.');
  }

  const columnaDe = new Map<ClaveColumna, number>();
  encabezado.valores.forEach((valor, indice) => {
    if (valor === null || valor === undefined) return;
    const clave = claveDeEncabezado(String(valor));
    if (!clave) return;
    if (columnaDe.has(clave)) {
      throw planillaInvalida(
        `La columna «${COLUMNAS_PLANILLA.find((c) => c.clave === clave)!.titulo}» aparece repetida en el encabezado.`,
      );
    }
    columnaDe.set(clave, indice);
  });
  const faltantes = COLUMNAS_PLANILLA.filter((c) => !columnaDe.has(c.clave));
  if (faltantes.length > 0) {
    throw planillaInvalida(
      `Faltan columnas en el encabezado: ${faltantes.map((c) => `«${c.titulo}»`).join(', ')}. Descarga la plantilla para ver el formato esperado.`,
    );
  }
  if (datos.length === 0) {
    throw planillaInvalida(
      'La planilla no tiene filas de datos bajo el encabezado.',
    );
  }
  if (datos.length > MAX_FILAS_IMPORTACION) {
    throw new ErrorAplicacion(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'PLANILLA_DEMASIADO_GRANDE',
      `La planilla tiene ${datos.length} filas de datos; el máximo es ${MAX_FILAS_IMPORTACION}.`,
    );
  }

  return datos.map((fila) => {
    const celdas = {} as Record<ClaveColumna, CeldaCruda>;
    for (const clave of CLAVES_COLUMNA) {
      celdas[clave] = fila.valores[columnaDe.get(clave)!] ?? null;
    }
    return { numeroFila: fila.numeroFila, celdas };
  });
}
