import { HttpStatus } from '@nestjs/common';
import { ErrorAplicacion } from '../errores/error-aplicacion.js';
import type { ContraparteDto } from './contraparte.dto.js';
import type { EntidadContraparte } from './contraparte.entity.js';

/** Proyección pública común (los DTO concretos agregan sus propios campos). */
export function aContraparteDto(e: EntidadContraparte): ContraparteDto {
  return {
    id: e.id,
    rut: e.rut,
    razonSocial: e.razonSocial,
    nombreFantasia: e.nombreFantasia,
    giro: e.giro,
    contactoNombre: e.contactoNombre,
    correo: e.correo,
    telefono: e.telefono,
    direccion: e.direccion,
    creadoEn: e.createdAt.toISOString(),
    actualizadoEn: e.updatedAt.toISOString(),
    version: e.version,
  };
}

/** Campos editables presentes en el cuerpo (los ausentes no se tocan). */
export const CAMPOS_CONTRAPARTE = [
  'rut',
  'razonSocial',
  'nombreFantasia',
  'giro',
  'contactoNombre',
  'correo',
  'telefono',
  'direccion',
] as const;

type CampoContraparte = (typeof CAMPOS_CONTRAPARTE)[number];

const OBLIGATORIOS: readonly CampoContraparte[] = ['rut', 'razonSocial'];

/**
 * Aplica sobre la entidad solo los campos que vienen definidos en el cuerpo.
 * `null` borra los campos opcionales; el RUT y la razón social no se pueden vaciar (400).
 */
export function aplicarCamposContraparte(
  entidad: EntidadContraparte,
  cuerpo: Partial<Record<CampoContraparte, string | null | undefined>>,
): void {
  for (const campo of CAMPOS_CONTRAPARTE) {
    const valor = cuerpo[campo];
    if (valor === null && OBLIGATORIOS.includes(campo)) {
      throw new ErrorAplicacion(
        HttpStatus.BAD_REQUEST,
        'VALIDACION',
        'Los datos enviados no son válidos.',
        [{ campo, errores: ['Este campo es obligatorio.'] }],
      );
    }
    if (valor !== undefined) {
      (entidad as unknown as Record<string, unknown>)[campo] = valor;
    }
  }
}
