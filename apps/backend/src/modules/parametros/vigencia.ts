import { HttpStatus } from '@nestjs/common';
import { restarDias } from '../../common/dinero/conversion-uf.js';
import { ErrorAplicacion } from '../../common/errores/error-aplicacion.js';
import { TipoValorParametro } from './parametros.tipos.js';

/**
 * Vigencia de los parámetros. Cada versión rige desde su `vigenteDesde` hasta
 * el día anterior a la versión siguiente (sin traslapes por construcción).
 */
export interface VersionConVigencia {
  vigenteDesde: string;
}

/** Versión que rige en `fecha`: la de mayor `vigenteDesde` que no la supere. */
export function versionVigente<T extends VersionConVigencia>(
  versiones: readonly T[],
  fecha: string,
): T | null {
  let elegida: T | null = null;
  for (const v of versiones) {
    if (
      v.vigenteDesde <= fecha &&
      (!elegida || v.vigenteDesde > elegida.vigenteDesde)
    ) {
      elegida = v;
    }
  }
  return elegida;
}

/** Primera versión que empieza después de `fecha` (la próxima en entrar en vigencia). */
export function versionProxima<T extends VersionConVigencia>(
  versiones: readonly T[],
  fecha: string,
): T | null {
  let elegida: T | null = null;
  for (const v of versiones) {
    if (
      v.vigenteDesde > fecha &&
      (!elegida || v.vigenteDesde < elegida.vigenteDesde)
    ) {
      elegida = v;
    }
  }
  return elegida;
}

/** Último día de vigencia de `version` (el día antes de la siguiente) o `null` si es la última. */
export function vigenteHasta(
  versiones: readonly VersionConVigencia[],
  version: VersionConVigencia,
): string | null {
  let siguiente: string | null = null;
  for (const v of versiones) {
    if (
      v.vigenteDesde > version.vigenteDesde &&
      (!siguiente || v.vigenteDesde < siguiente)
    ) {
      siguiente = v.vigenteDesde;
    }
  }
  return siguiente ? restarDias(siguiente, 1) : null;
}

/**
 * Reglas de una nueva versión de valor: debe empezar hoy o después (la historia
 * pasada no se reescribe) y estrictamente después de la última versión existente.
 */
export function validarNuevaVersion(params: {
  vigenteDesde: string;
  hoy: string;
  ultimaVigenteDesde: string | null;
}): void {
  if (params.vigenteDesde < params.hoy) {
    throw new ErrorAplicacion(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'VIGENCIA_EN_EL_PASADO',
      'La vigencia no puede empezar antes de hoy: el historial no se reescribe.',
    );
  }
  if (
    params.ultimaVigenteDesde !== null &&
    params.vigenteDesde <= params.ultimaVigenteDesde
  ) {
    throw new ErrorAplicacion(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'VIGENCIA_NO_POSTERIOR',
      `La nueva vigencia debe empezar después de la última versión (${params.ultimaVigenteDesde}).`,
    );
  }
}

export interface ValorParametroParseado {
  numerico: number | null;
  texto: string | null;
}

const ERROR_VALOR = (mensaje: string): ErrorAplicacion =>
  new ErrorAplicacion(
    HttpStatus.BAD_REQUEST,
    'VALIDACION',
    'Los datos enviados no son válidos.',
    [{ campo: 'valor', errores: [mensaje] }],
  );

/** Valida y convierte el valor recibido (texto) según el tipo del parámetro. */
export function interpretarValor(
  tipo: TipoValorParametro,
  entrada: string,
): ValorParametroParseado {
  const texto = entrada.trim();
  if (tipo === TipoValorParametro.Texto) {
    if (texto.length < 1 || texto.length > 200) {
      throw ERROR_VALOR('El valor debe tener entre 1 y 200 caracteres.');
    }
    return { numerico: null, texto };
  }

  const normalizado = texto.replace(',', '.');
  if (tipo === TipoValorParametro.Entero) {
    if (!/^\d{1,9}$/.test(normalizado)) {
      throw ERROR_VALOR('Ingresa un número entero mayor o igual a 0.');
    }
    return { numerico: Number(normalizado), texto: null };
  }

  if (!/^\d{1,12}(\.\d{1,4})?$/.test(normalizado)) {
    throw ERROR_VALOR(
      'Ingresa un número mayor o igual a 0 con hasta 4 decimales.',
    );
  }
  const numero = Number(normalizado);
  if (tipo === TipoValorParametro.Porcentaje && numero > 100) {
    throw ERROR_VALOR('Un porcentaje debe estar entre 0 y 100.');
  }
  return { numerico: numero, texto: null };
}

/** Texto canónico del valor (para mostrar y comparar). */
export function valorComoTexto(valor: ValorParametroParseado): string {
  return valor.texto ?? String(valor.numerico);
}
