import { z } from 'zod';
import {
  MAX_LARGO_CLAVE,
  MIN_LARGO_CLAVE,
} from '../common/seguridad/politica-clave.js';

const booleano = (nombre: string) =>
  z
    .enum(['true', 'false'], {
      error: `${nombre} debe ser "true" o "false"`,
    })
    .default('false')
    .transform((valor) => valor === 'true');

const opcionalSiVacio = <T extends z.ZodType>(esquema: T) =>
  z.preprocess(
    (valor) => (valor === '' ? undefined : valor),
    esquema.optional(),
  );

/**
 * Variables de entorno del backend. Se validan al arrancar: si falta o es
 * inválida alguna, el proceso termina con un mensaje en español.
 */
export const esquemaEntorno = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'], {
        error: 'NODE_ENV debe ser "development", "production" o "test"',
      })
      .default('development'),
    PORT: z.coerce
      .number({ error: 'PORT debe ser un número' })
      .int('PORT debe ser un número entero')
      .min(1, 'PORT debe estar entre 1 y 65535')
      .max(65535, 'PORT debe estar entre 1 y 65535')
      .default(3007),
    DATABASE_URL: z
      .string({ error: 'DATABASE_URL es obligatoria' })
      .min(1, 'DATABASE_URL es obligatoria')
      .refine(
        (valor) => /^postgres(ql)?:\/\/[^/]+\/[^/?]+/.test(valor),
        'DATABASE_URL debe tener la forma postgres://usuario:clave@host:puerto/base',
      ),
    APP_ORIGIN: z
      .string({ error: 'APP_ORIGIN es obligatoria' })
      .min(1, 'APP_ORIGIN es obligatoria')
      .refine(esOrigenValido, {
        error:
          'APP_ORIGIN debe ser un origen sin ruta ni barra final, por ejemplo http://localhost:5177',
      }),
    COOKIE_SECURE: booleano('COOKIE_SECURE'),
    SWAGGER_ENABLED: booleano('SWAGGER_ENABLED'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'], {
        error:
          'LOG_LEVEL debe ser uno de: fatal, error, warn, info, debug, trace, silent',
      })
      .default('info'),
    ADJUNTOS_DIR: z
      .string({ error: 'ADJUNTOS_DIR debe ser una ruta' })
      .trim()
      .min(1, 'ADJUNTOS_DIR no puede estar vacía')
      .default('./data/adjuntos'),
    // Primer administrador (D-11): se crea al arrancar si no existen usuarios.
    // Una variable definida pero vacía (docker compose `${VAR:-}`) cuenta como no definida.
    ADMIN_EMAIL: opcionalSiVacio(
      z
        .email('ADMIN_EMAIL debe ser un correo válido')
        .max(254, 'ADMIN_EMAIL es demasiado largo'),
    ),
    ADMIN_PASSWORD: opcionalSiVacio(
      z
        .string()
        .min(
          MIN_LARGO_CLAVE,
          `ADMIN_PASSWORD debe tener al menos ${MIN_LARGO_CLAVE} caracteres`,
        )
        .max(
          MAX_LARGO_CLAVE,
          `ADMIN_PASSWORD debe tener como máximo ${MAX_LARGO_CLAVE} caracteres`,
        ),
    ),
    ADMIN_NAME: z.preprocess(
      (valor) => (valor === '' ? undefined : valor),
      z
        .string()
        .trim()
        .min(2, 'ADMIN_NAME debe tener al menos 2 caracteres')
        .max(100, 'ADMIN_NAME debe tener como máximo 100 caracteres')
        .default('Administrador'),
    ),
  })
  .refine(
    (e) => (e.ADMIN_EMAIL === undefined) === (e.ADMIN_PASSWORD === undefined),
    {
      path: ['ADMIN_PASSWORD'],
      error: 'ADMIN_EMAIL y ADMIN_PASSWORD deben definirse juntas',
    },
  );

export type Entorno = z.infer<typeof esquemaEntorno>;

function esOrigenValido(valor: string): boolean {
  try {
    const url = new URL(valor);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.origin === valor
    );
  } catch {
    return false;
  }
}

/** Función `validate` para `ConfigModule`. Lanza un error legible si algo falla. */
export function validarEntorno(config: Record<string, unknown>): Entorno {
  const resultado = esquemaEntorno.safeParse(config);
  if (!resultado.success) {
    const lineas = resultado.error.issues.map(
      (issue) => `  - ${issue.path.join('.') || '(raíz)'}: ${issue.message}`,
    );
    throw new Error(
      `Configuración inválida. Revisa las variables de entorno (ver .env.example):\n${lineas.join('\n')}`,
    );
  }
  return resultado.data;
}
