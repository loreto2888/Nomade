/** Normalizadores de `class-transformer` para campos de texto de los DTOs. */

/** Recorta espacios en los extremos. */
export const recortar = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Recorta y convierte la cadena vacía en `null` (campo opcional de texto). */
export const recortarONulo = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  const texto = value.trim();
  return texto === '' ? null : texto;
};

/** Recorta y pasa a minúsculas (correos). */
export const correoNormalizado = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  const texto = value.trim().toLowerCase();
  return texto === '' ? null : texto;
};

/** `"true"`/`"false"` de la query string a booleano. */
export const aBooleano = ({ value }: { value: unknown }): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;
