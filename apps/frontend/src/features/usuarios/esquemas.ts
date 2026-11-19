import { z } from 'zod';

export const esquemaUsuario = z.object({
  correo: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Ingresa el correo.')
    .max(254, 'El correo es demasiado largo.')
    .pipe(z.email('Ingresa un correo válido.')),
  nombre: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(100, 'El nombre debe tener como máximo 100 caracteres.'),
  rol: z.enum(['admin', 'usuario'], { error: 'Selecciona un rol.' }),
});

export type DatosUsuario = z.infer<typeof esquemaUsuario>;
