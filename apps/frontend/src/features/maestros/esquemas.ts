import { z } from 'zod';
import { esRutValido, formatearRut, normalizarRut } from '@/lib/rut';

/** Texto opcional: vacío es válido (se envía como `null`). */
export const textoOpcional = (maximo: number, nombre: string) =>
  z.string().trim().max(maximo, `${nombre} debe tener como máximo ${maximo} caracteres.`);

export const esquemaRut = z
  .string()
  .trim()
  .min(1, 'Ingresa el RUT.')
  .refine((valor) => esRutValido(valor), 'Ingresa un RUT válido.');

const correoOpcional = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'El correo es demasiado largo.')
  .refine(
    (valor) => valor === '' || z.email().safeParse(valor).success,
    'Ingresa un correo válido.',
  );

const telefonoOpcional = z
  .string()
  .trim()
  .refine(
    (valor) => valor === '' || /^[0-9+()\-\s.]{6,30}$/.test(valor),
    'Ingresa un teléfono válido (dígitos, +, espacios, guiones y paréntesis).',
  );

/** Datos comunes de clientes y proveedores. */
export const esquemaContraparte = z.object({
  rut: esquemaRut,
  razonSocial: z
    .string()
    .trim()
    .min(2, 'La razón social debe tener al menos 2 caracteres.')
    .max(150, 'La razón social debe tener como máximo 150 caracteres.'),
  nombreFantasia: textoOpcional(150, 'El nombre de fantasía'),
  giro: textoOpcional(150, 'El giro'),
  contactoNombre: textoOpcional(100, 'El contacto'),
  correo: correoOpcional,
  telefono: telefonoOpcional,
  direccion: textoOpcional(200, 'La dirección'),
});

export type DatosContraparte = z.infer<typeof esquemaContraparte>;

export const CONTRAPARTE_VACIA: DatosContraparte = {
  rut: '',
  razonSocial: '',
  nombreFantasia: '',
  giro: '',
  contactoNombre: '',
  correo: '',
  telefono: '',
  direccion: '',
};

type Opcionales =
  'nombreFantasia' | 'giro' | 'contactoNombre' | 'correo' | 'telefono' | 'direccion';

const nuloSiVacio = (v: string): string | null => (v.trim() === '' ? null : v.trim());

/** Cuerpo para la API: RUT normalizado y opcionales vacíos como `null` (en edición, los borra). */
export function aCuerpoContraparte(datos: DatosContraparte) {
  const opcionales = Object.fromEntries(
    (
      [
        'nombreFantasia',
        'giro',
        'contactoNombre',
        'correo',
        'telefono',
        'direccion',
      ] as Opcionales[]
    ).map((campo) => [campo, nuloSiVacio(datos[campo])]),
  ) as Record<Opcionales, string | null>;
  return {
    rut: normalizarRut(datos.rut) ?? datos.rut.trim(),
    razonSocial: datos.razonSocial.trim(),
    ...opcionales,
  };
}

/** Valores del formulario a partir de un registro del servidor. */
export function deContraparte(r: {
  rut: string;
  razonSocial: string;
  nombreFantasia: string | null;
  giro: string | null;
  contactoNombre: string | null;
  correo: string | null;
  telefono: string | null;
  direccion: string | null;
}): DatosContraparte {
  return {
    rut: formatearRut(r.rut),
    razonSocial: r.razonSocial,
    nombreFantasia: r.nombreFantasia ?? '',
    giro: r.giro ?? '',
    contactoNombre: r.contactoNombre ?? '',
    correo: r.correo ?? '',
    telefono: r.telefono ?? '',
    direccion: r.direccion ?? '',
  };
}
