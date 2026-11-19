import { z } from 'zod';
import type { ObraDto } from '@/api/obras';
import { formatearFecha, formatearMonto } from '@/lib/formato';

export const REGEX_CENTRO_COSTO = /^[A-Z0-9][A-Z0-9._-]{1,19}$/;

const clienteOpcion = z.object({ id: z.number(), rut: z.string(), razonSocial: z.string() });
export type OpcionCliente = z.infer<typeof clienteOpcion>;

const fechaOpcional = z
  .string()
  .refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Ingresa una fecha válida.');

const textoOpcional = (maximo: number, nombre: string) =>
  z.string().trim().max(maximo, `${nombre} debe tener como máximo ${maximo} caracteres.`);

export const esquemaObra = z
  .object({
    codigoCentroCosto: z
      .string()
      .trim()
      .toUpperCase()
      .regex(
        REGEX_CENTRO_COSTO,
        'El centro de costo debe tener 2 a 20 caracteres: letras, dígitos, punto, guion o guion bajo.',
      ),
    nombre: z
      .string()
      .trim()
      .min(2, 'El nombre debe tener al menos 2 caracteres.')
      .max(150, 'El nombre debe tener como máximo 150 caracteres.'),
    cliente: clienteOpcion.nullable(),
    estadoId: z.number().int().positive().nullable(),
    responsable: textoOpcional(100, 'El responsable'),
    direccion: textoOpcional(200, 'La dirección'),
    fechaInicio: fechaOpcional,
    fechaTermino: fechaOpcional,
    monedaContrato: z.enum(['CLP', 'UF']),
    montoContrato: z
      .number({ error: 'Ingresa un monto válido.' })
      .min(0, 'El monto no puede ser negativo.')
      .max(1_000_000_000_000, 'El monto es demasiado alto.')
      .nullable(),
    observaciones: textoOpcional(1000, 'Las observaciones'),
  })
  .superRefine((datos, ctx) => {
    if (datos.cliente === null) {
      ctx.addIssue({ code: 'custom', path: ['cliente'], message: 'Selecciona un cliente.' });
    }
    if (datos.fechaInicio && datos.fechaTermino && datos.fechaTermino < datos.fechaInicio) {
      ctx.addIssue({
        code: 'custom',
        path: ['fechaTermino'],
        message: 'La fecha de término no puede ser anterior a la de inicio.',
      });
    }
    if (
      datos.monedaContrato === 'CLP' &&
      datos.montoContrato !== null &&
      !Number.isInteger(datos.montoContrato)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['montoContrato'],
        message: 'Un monto en CLP debe ser un número entero de pesos.',
      });
    }
    if (
      datos.monedaContrato === 'UF' &&
      datos.montoContrato !== null &&
      Math.round(datos.montoContrato * 10_000) !== datos.montoContrato * 10_000
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['montoContrato'],
        message: 'Un monto en UF admite hasta 4 decimales.',
      });
    }
  });

export type DatosObra = z.infer<typeof esquemaObra>;

export const OBRA_VACIA: DatosObra = {
  codigoCentroCosto: '',
  nombre: '',
  cliente: null,
  estadoId: null,
  responsable: '',
  direccion: '',
  fechaInicio: '',
  fechaTermino: '',
  monedaContrato: 'CLP',
  montoContrato: null,
  observaciones: '',
};

/** Valores del formulario a partir de una obra del servidor. */
export function deObra(obra: ObraDto): DatosObra {
  return {
    codigoCentroCosto: obra.codigoCentroCosto,
    nombre: obra.nombre,
    cliente: { id: obra.cliente.id, rut: obra.cliente.rut, razonSocial: obra.cliente.razonSocial },
    estadoId: obra.estado.id,
    responsable: obra.responsable ?? '',
    direccion: obra.direccion ?? '',
    fechaInicio: obra.fechaInicio ?? '',
    fechaTermino: obra.fechaTermino ?? '',
    monedaContrato: obra.monedaContrato,
    montoContrato: obra.montoContrato,
    observaciones: obra.observaciones ?? '',
  };
}

const nulo = (v: string): string | null => (v.trim() === '' ? null : v.trim());

/** Cuerpo de creación. `estadoId` ausente → el servidor usa «en preparación». */
export function aCuerpoCrear(datos: DatosObra) {
  return {
    codigoCentroCosto: datos.codigoCentroCosto.trim().toUpperCase(),
    nombre: datos.nombre.trim(),
    clienteId: datos.cliente!.id,
    ...(datos.estadoId !== null ? { estadoId: datos.estadoId } : {}),
    responsable: nulo(datos.responsable),
    direccion: nulo(datos.direccion),
    fechaInicio: nulo(datos.fechaInicio),
    fechaTermino: nulo(datos.fechaTermino),
    monedaContrato: datos.monedaContrato,
    montoContrato: datos.montoContrato,
    observaciones: nulo(datos.observaciones),
  };
}

/**
 * Cuerpo de modificación: solo los campos que cambiaron respecto de `original`. Así, editar el
 * nombre no recalcula la fotografía de UF del contrato ni pisa cambios ajenos en otros campos.
 */
export function aCambios(datos: DatosObra, original: DatosObra) {
  const nuevo = aCuerpoCrear(datos);
  const previo = aCuerpoCrear(original);
  const cambios: Record<string, unknown> = {};
  for (const clave of Object.keys(nuevo) as (keyof typeof nuevo)[]) {
    if (nuevo[clave] !== previo[clave]) cambios[clave] = nuevo[clave];
  }
  return cambios;
}

/**
 * Datos del servidor con encima solo los campos que la persona editó respecto de `original`
 * (lo que no tocó queda como lo dejó la otra persona). Es la base de «Conservar mis cambios».
 */
export function fusionarEdiciones(
  mios: DatosObra,
  original: DatosObra,
  servidor: DatosObra,
): DatosObra {
  const resultado: DatosObra = { ...servidor };
  for (const campo of Object.keys(mios) as (keyof DatosObra)[]) {
    if (JSON.stringify(mios[campo]) !== JSON.stringify(original[campo])) {
      (resultado as Record<keyof DatosObra, unknown>)[campo] = mios[campo];
    }
  }
  return resultado;
}

export interface DiferenciaCampo {
  campo: string;
  tuValor: string;
  valorActual: string;
}

const ETIQUETAS: Record<keyof DatosObra, string> = {
  codigoCentroCosto: 'Centro de costo',
  nombre: 'Nombre',
  cliente: 'Cliente',
  estadoId: 'Estado',
  responsable: 'Responsable',
  direccion: 'Dirección',
  fechaInicio: 'Fecha de inicio',
  fechaTermino: 'Fecha de término',
  monedaContrato: 'Moneda del contrato',
  montoContrato: 'Monto del contrato',
  observaciones: 'Observaciones',
};

/** Campos que la persona editó y que hoy tienen otro valor en el servidor (para el aviso de conflicto). */
export function diferenciasConServidor(
  mios: DatosObra,
  original: DatosObra,
  servidor: ObraDto,
): DiferenciaCampo[] {
  const actual = deObra(servidor);
  const texto = (campo: keyof DatosObra, d: DatosObra, estadoNombre?: string): string => {
    switch (campo) {
      case 'cliente':
        return d.cliente?.razonSocial ?? '—';
      case 'estadoId':
        return estadoNombre ?? (d.estadoId === null ? '—' : String(d.estadoId));
      case 'fechaInicio':
      case 'fechaTermino':
        return formatearFecha(d[campo] || null);
      case 'montoContrato':
        return formatearMonto(d.montoContrato, d.monedaContrato);
      default:
        return String(d[campo] ?? '') || '—';
    }
  };
  const diferencias: DiferenciaCampo[] = [];
  for (const campo of Object.keys(ETIQUETAS) as (keyof DatosObra)[]) {
    const editado = JSON.stringify(mios[campo]) !== JSON.stringify(original[campo]);
    const distinto = JSON.stringify(mios[campo]) !== JSON.stringify(actual[campo]);
    if (editado && distinto) {
      diferencias.push({
        campo: ETIQUETAS[campo],
        tuValor: texto(campo, mios),
        valorActual: texto(
          campo,
          actual,
          campo === 'estadoId' ? servidor.estado.nombre : undefined,
        ),
      });
    }
  }
  return diferencias;
}
