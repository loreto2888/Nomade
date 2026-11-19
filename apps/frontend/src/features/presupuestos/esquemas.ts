import { z } from 'zod';
import type { PartidaDto } from '@/api/generated';
import { parsearCantidad } from '@/lib/presupuesto';

export const REGEX_CODIGO_PARTIDA = /^[A-Za-z0-9][A-Za-z0-9._-]{0,29}$/;

export const esquemaPartida = z
  .object({
    codigo: z
      .string()
      .trim()
      .regex(
        REGEX_CODIGO_PARTIDA,
        'El código debe tener 1 a 30 caracteres: letras, dígitos, punto, guion o guion bajo.',
      ),
    familiaId: z.number().int().positive().nullable(),
    descripcion: z
      .string()
      .trim()
      .min(2, 'La descripción debe tener al menos 2 caracteres.')
      .max(300, 'La descripción debe tener como máximo 300 caracteres.'),
    unidad: z
      .string()
      .trim()
      .min(1, 'Indica la unidad.')
      .max(20, 'La unidad debe tener como máximo 20 caracteres.'),
    /** Texto: se escribe a la chilena (`120,5`). */
    cantidad: z.string(),
    precioUnitario: z.number().min(0, 'El precio unitario no puede ser negativo.').nullable(),
  })
  .superRefine((datos, ctx) => {
    if (datos.familiaId === null) {
      ctx.addIssue({ code: 'custom', path: ['familiaId'], message: 'Selecciona una familia.' });
    }
    const cantidad = parsearCantidad(datos.cantidad);
    if (cantidad === null || cantidad <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['cantidad'],
        message: 'La cantidad debe ser un número mayor que cero.',
      });
    } else if (Math.round(cantidad * 1e4) / 1e4 !== cantidad) {
      ctx.addIssue({
        code: 'custom',
        path: ['cantidad'],
        message: 'La cantidad admite hasta 4 decimales.',
      });
    } else if (cantidad > 1_000_000_000_000) {
      ctx.addIssue({
        code: 'custom',
        path: ['cantidad'],
        message: 'La cantidad es demasiado alta.',
      });
    }
    if (datos.precioUnitario === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['precioUnitario'],
        message: 'Ingresa el precio unitario.',
      });
    }
  });

export type DatosPartidaFormulario = z.input<typeof esquemaPartida>;

export const PARTIDA_VACIA: DatosPartidaFormulario = {
  codigo: '',
  familiaId: null,
  descripcion: '',
  unidad: '',
  cantidad: '',
  precioUnitario: null,
};

export function dePartida(partida: PartidaDto): DatosPartidaFormulario {
  return {
    codigo: partida.codigo,
    familiaId: partida.familia.id,
    descripcion: partida.descripcion,
    unidad: partida.unidad,
    cantidad: String(partida.cantidad).replace('.', ','),
    precioUnitario: partida.precioUnitario,
  };
}

/** Cuerpo para la API; asume que el formulario ya pasó la validación. */
export function aCuerpoPartida(datos: DatosPartidaFormulario) {
  return {
    codigo: datos.codigo.trim(),
    familiaId: datos.familiaId!,
    descripcion: datos.descripcion.trim(),
    unidad: datos.unidad.trim(),
    cantidad: parsearCantidad(datos.cantidad)!,
    precioUnitario: datos.precioUnitario!,
  };
}
