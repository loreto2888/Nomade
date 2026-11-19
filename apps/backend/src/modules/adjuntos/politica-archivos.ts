import { HttpStatus } from '@nestjs/common';
import { ErrorAplicacion } from '../../common/errores/error-aplicacion.js';

/** Tamaño máximo de un adjunto: 20 MB (D-16). */
export const MAX_BYTES_ADJUNTO = 20 * 1024 * 1024;

export type ExtensionPermitida =
  'pdf' | 'jpg' | 'jpeg' | 'png' | 'xlsx' | 'csv';

interface TipoPermitido {
  mime: string;
  /** Comprueba el contenido real (no solo la extensión ni el tipo declarado por el navegador). */
  contenidoValido: (contenido: Buffer) => boolean;
}

const empiezaCon = (contenido: Buffer, bytes: number[]): boolean =>
  contenido.length >= bytes.length && bytes.every((b, i) => contenido[i] === b);

/** Texto plano: sin caracteres de control (salvo tab, salto de línea y retorno) en los primeros 8 KB. */
function esTextoPlano(contenido: Buffer): boolean {
  const muestra = contenido.subarray(0, 8192);
  for (const byte of muestra) {
    if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) return false;
  }
  return true;
}

const JPEG: TipoPermitido = {
  mime: 'image/jpeg',
  contenidoValido: (c) => empiezaCon(c, [0xff, 0xd8, 0xff]),
};

/** Tipos permitidos en la primera etapa: PDF, JPG, PNG, XLSX y CSV (D-16). */
export const TIPOS_PERMITIDOS: Record<ExtensionPermitida, TipoPermitido> = {
  pdf: {
    mime: 'application/pdf',
    contenidoValido: (c) => empiezaCon(c, [0x25, 0x50, 0x44, 0x46, 0x2d]),
  },
  jpg: JPEG,
  jpeg: JPEG,
  png: {
    mime: 'image/png',
    contenidoValido: (c) =>
      empiezaCon(c, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  xlsx: {
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // Un .xlsx es un ZIP (firma PK) que contiene el libro `xl/workbook.xml`.
    contenidoValido: (c) =>
      empiezaCon(c, [0x50, 0x4b, 0x03, 0x04]) &&
      c.includes(Buffer.from('xl/workbook.xml')),
  },
  csv: { mime: 'text/csv', contenidoValido: esTextoPlano },
};

export const EXTENSIONES_PERMITIDAS = Object.keys(
  TIPOS_PERMITIDOS,
) as ExtensionPermitida[];

export interface ArchivoValidado {
  extension: ExtensionPermitida;
  /** Tipo MIME canónico según la extensión (se guarda y se sirve este, no el declarado). */
  tipoMime: string;
}

/** Extensión en minúsculas (sin punto) o `null` si el nombre no tiene. */
export function extensionDe(nombre: string): string | null {
  const indice = nombre.lastIndexOf('.');
  if (indice <= 0 || indice === nombre.length - 1) return null;
  return nombre.slice(indice + 1).toLowerCase();
}

/**
 * Valida un archivo subido: no vacío, ≤ 20 MB, extensión permitida y contenido
 * coherente con ella. Lanza 400/413/415 con mensajes en español.
 */
export function validarArchivo(archivo: {
  nombre: string;
  contenido: Buffer;
}): ArchivoValidado {
  const { nombre, contenido } = archivo;
  if (contenido.length === 0) {
    throw new ErrorAplicacion(
      HttpStatus.BAD_REQUEST,
      'ARCHIVO_VACIO',
      'El archivo está vacío.',
    );
  }
  if (contenido.length > MAX_BYTES_ADJUNTO) {
    throw new ErrorAplicacion(
      HttpStatus.PAYLOAD_TOO_LARGE,
      'ARCHIVO_DEMASIADO_GRANDE',
      'El archivo supera el máximo de 20 MB.',
    );
  }
  const extension = extensionDe(nombre);
  if (!extension || !(extension in TIPOS_PERMITIDOS)) {
    throw new ErrorAplicacion(
      HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      'TIPO_ARCHIVO_NO_PERMITIDO',
      'Tipo de archivo no permitido. Se aceptan PDF, JPG, PNG, XLSX y CSV.',
    );
  }
  const tipo = TIPOS_PERMITIDOS[extension as ExtensionPermitida];
  if (!tipo.contenidoValido(contenido)) {
    throw new ErrorAplicacion(
      HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      'CONTENIDO_NO_COINCIDE',
      `El contenido del archivo no corresponde a un .${extension} válido.`,
    );
  }
  return { extension: extension as ExtensionPermitida, tipoMime: tipo.mime };
}

/**
 * Multer entrega el nombre decodificado como latin1: un nombre UTF-8 ("Cotización.pdf")
 * llega como mojibake. Se recupera el original y se limpia de separadores de ruta.
 */
export function limpiarNombreArchivo(nombreCrudo: string): string {
  const recuperado = Buffer.from(nombreCrudo, 'latin1').toString('utf8');
  const nombre = recuperado.includes('�') ? nombreCrudo : recuperado;
  const sinRuta = nombre.split(/[\\/]/).pop() ?? nombre;
  // eslint-disable-next-line no-control-regex
  const limpio = sinRuta.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return limpio.slice(0, 200) || 'archivo';
}
