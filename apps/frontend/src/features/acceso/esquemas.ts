import { z } from 'zod';

export const LARGO_MINIMO_CLAVE = 12;

export const esquemaCambioClave = z
  .object({
    claveActual: z.string().min(1, 'Ingresa tu contraseña actual.'),
    claveNueva: z
      .string()
      .min(
        LARGO_MINIMO_CLAVE,
        `La contraseña debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres.`,
      )
      .max(128, 'La contraseña debe tener como máximo 128 caracteres.'),
    confirmacion: z.string().min(1, 'Repite la nueva contraseña.'),
  })
  .refine((d) => d.claveNueva === d.confirmacion, {
    path: ['confirmacion'],
    message: 'Las contraseñas no coinciden.',
  })
  .refine((d) => d.claveNueva !== d.claveActual, {
    path: ['claveNueva'],
    message: 'La nueva contraseña debe ser distinta de la actual.',
  });

export type DatosCambioClave = z.infer<typeof esquemaCambioClave>;
