const CLAVES_SENSIBLES = new Set([
  'clave',
  'claveactual',
  'clavenueva',
  'clavetemporal',
  'clavehash',
  'password',
  'contrasena',
  'token',
  'tokenhash',
  'hash',
  'secret',
]);

const MAX_PROFUNDIDAD = 6;

/**
 * Copia el valor omitiendo campos sensibles (contraseñas, hashes, tokens) para
 * que nunca lleguen a la bitácora. Convierte fechas a ISO.
 */
export function sanitizarParaAuditoria(
  valor: unknown,
  profundidad = 0,
): unknown {
  if (valor === null || valor === undefined) return valor ?? null;
  if (valor instanceof Date) return valor.toISOString();
  if (typeof valor !== 'object') return valor;
  if (profundidad >= MAX_PROFUNDIDAD) return '[…]';
  if (Array.isArray(valor)) {
    return valor.map((v) => sanitizarParaAuditoria(v, profundidad + 1));
  }
  const resultado: Record<string, unknown> = {};
  for (const [clave, v] of Object.entries(valor)) {
    if (CLAVES_SENSIBLES.has(clave.toLowerCase())) continue;
    resultado[clave] = sanitizarParaAuditoria(v, profundidad + 1);
  }
  return resultado;
}
