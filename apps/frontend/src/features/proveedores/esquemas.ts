import { z } from 'zod';
import { esquemaRut } from '@/features/maestros/esquemas';
import type { CuentaBancariaDto } from '@/api/proveedores';
import { formatearRut, normalizarRut } from '@/lib/rut';

export const TIPOS_CUENTA = [
  { valor: 'corriente', etiqueta: 'Cuenta corriente' },
  { valor: 'vista', etiqueta: 'Cuenta vista / RUT' },
  { valor: 'ahorro', etiqueta: 'Cuenta de ahorro' },
] as const;

export const esquemaCuentaBancaria = z.object({
  banco: z
    .string()
    .trim()
    .min(2, 'Ingresa el banco.')
    .max(60, 'El banco debe tener como máximo 60 caracteres.'),
  tipoCuenta: z.enum(['corriente', 'vista', 'ahorro'], { error: 'Selecciona el tipo de cuenta.' }),
  numeroCuenta: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ''))
    .pipe(
      z.string().regex(/^[0-9]{4,20}$/, 'El número de cuenta debe tener entre 4 y 20 dígitos.'),
    ),
  titular: z
    .string()
    .trim()
    .min(2, 'Ingresa el titular de la cuenta.')
    .max(150, 'El titular debe tener como máximo 150 caracteres.'),
  titularRut: esquemaRut,
  correoNotificacion: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, 'El correo es demasiado largo.')
    .refine((v) => v === '' || z.email().safeParse(v).success, 'Ingresa un correo válido.'),
  principal: z.boolean(),
});

export type DatosCuentaBancaria = z.infer<typeof esquemaCuentaBancaria>;

export const CUENTA_VACIA: DatosCuentaBancaria = {
  banco: '',
  tipoCuenta: 'corriente',
  numeroCuenta: '',
  titular: '',
  titularRut: '',
  correoNotificacion: '',
  principal: false,
};

export function aCuerpoCuenta(datos: DatosCuentaBancaria) {
  return {
    banco: datos.banco.trim(),
    tipoCuenta: datos.tipoCuenta,
    numeroCuenta: datos.numeroCuenta,
    titular: datos.titular.trim(),
    titularRut: normalizarRut(datos.titularRut) ?? datos.titularRut.trim(),
    correoNotificacion:
      datos.correoNotificacion.trim() === '' ? null : datos.correoNotificacion.trim(),
    principal: datos.principal,
  };
}

/** Valores del formulario a partir de una cuenta del servidor. */
export function deCuenta(cuenta: CuentaBancariaDto): DatosCuentaBancaria {
  return {
    banco: cuenta.banco,
    tipoCuenta: cuenta.tipoCuenta,
    numeroCuenta: cuenta.numeroCuenta,
    titular: cuenta.titular,
    titularRut: formatearRut(cuenta.titularRut),
    correoNotificacion: cuenta.correoNotificacion ?? '',
    principal: cuenta.principal,
  };
}
